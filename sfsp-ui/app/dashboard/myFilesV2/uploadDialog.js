//app/dashboard/myFilesV2/uploadDialog.js

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, X, File as FileIcon } from "lucide-react";
import { useEncryptionStore } from "@/app/SecureKeyStorage";
import { getSodium } from "@/app/lib/sodium";
import Image from "next/image";
import { gzip } from "pako";

export function UploadDialog({
  open,
  onOpenChange,
  onUploadSuccess,
  currentFolderPath,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [dropboxLoading, setDropboxLoading] = useState(false);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (open && !window.Dropbox) {
      const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
      if (appKey) {
        setDropboxLoading(true);
        const script = document.createElement('script');
        script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
        script.id = 'dropboxjs';
        script.setAttribute('data-app-key', appKey);
        script.onload = () => {
          setDropboxLoading(false);
        };
        script.onerror = () => {
          setDropboxLoading(false);
          console.error('Failed to load Dropbox script');
        };
        document.head.appendChild(script);
      }
    }
  }, [open]);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000); // auto-hide after 4s
  };

  const closeToast = () => setToast(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    setUploadFiles((prev) => [...prev, ...files]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setUploadFiles((prev) => [...prev, ...files]);
    e.target.value = null;
  };

  const handleGoogleDriveUpload = () => { };

  const handleDropboxUpload = () => {
    const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
    if (!appKey) {
      showToast('Dropbox app key not configured. Please check your environment variables.', 'error');
      return;
    }

    if (dropboxLoading) {
      showToast('Dropbox is still loading. Please wait a moment and try again.', 'info');
      return;
    }

    if (!window.Dropbox) {
      showToast('Dropbox Chooser is not available. Please refresh the page and try again.', 'error');
      return;
    }

    try {
      window.Dropbox.choose({
        success: (files) => {
          const dropboxFiles = files.map(file => ({
            name: file.name,
            size: file.bytes,
            type: file.link.split('.').pop() || 'application/octet-stream',
            dropboxLink: file.link,
          }));
          setUploadFiles(prev => [...prev, ...dropboxFiles]);
          showToast('Dropbox files selected. Ready to upload.', 'success');
        },
        cancel: () => showToast('Dropbox upload cancelled.', 'info'),
        linkType: 'direct',
        multiselect: true,
        extensions: [],
      });
    } catch (error) {
      console.error('Dropbox Chooser error:', error);
      showToast('Dropbox integration error. Please check your Dropbox app configuration.', 'error');
    }
  };

  const removeFile = (index) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const chunkSize = 10 * 1024 * 1024; // 5MB per chunk

  const uploadFilesHandler = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    const { encryptionKey, userId } = useEncryptionStore.getState();
    if (!encryptionKey || !userId) {
      showToast("Missing user ID or encryption key.", "error");
      setUploading(false);
      return;
    }
    console.log("Starting to upload a file");
    const sodium = await getSodium();
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

    await Promise.all(
      uploadFiles.map(async (file) => {
        try {
          if (file.dropboxLink) {
            const response = await fetch(file.dropboxLink);
            if (!response.ok) throw new Error('Failed to download from Dropbox');
            const blob = await response.blob();
            file = new File([blob], file.name, { type: file.type });
          }

          // 1️⃣ Call startUpload to get fileId
          const startRes = await fetch("http://localhost:5000/api/files/startUpload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              userId,
              nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
              fileDescription: "",
              fileTags: ["personal"],
              path: currentFolderPath || "files",
            }),
          });

          if (!startRes.ok) throw new Error("Failed to start upload");
          const { fileId } = await startRes.json();

          //Skip compression as it doesn't actually help much, with videos at least
          const fileBuffer = new Uint8Array(await file.arrayBuffer());
          //const compressed = gzip(fileBuffer, { level: 9 });

          // 3️⃣ Encrypt entire compressed file
          //nonce is up there
          const ciphertext = sodium.crypto_secretbox_easy(fileBuffer, nonce, encryptionKey);

          // 4️⃣ Compute SHA-256 hash of encrypted file
          const hashBuffer = await crypto.subtle.digest("SHA-256", ciphertext.buffer);
          const fileHash = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          // 5️⃣ Chunk encrypted file
          const totalChunks = Math.ceil(ciphertext.length / chunkSize);
          let uploadedChunks = 0;

          // 6️⃣ Upload all chunks in parallel
          const chunkUploadPromises = Array.from({ length: totalChunks }, (_, chunkIndex) => {
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, ciphertext.length);
            const chunk = ciphertext.slice(start, end);

            const formData = new FormData();
            formData.append("fileId", fileId);
            formData.append("userId", userId);
            formData.append("fileName", file.name);
            formData.append("fileType", file.type || "application/octet-stream");
            formData.append("fileDescription", "");
            formData.append("fileTags", JSON.stringify(["personal use"]));
            formData.append("path", currentFolderPath || "files");
            formData.append("fileHash", fileHash);
            formData.append(
              "nonce",
              sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL)
            );
            formData.append("chunkIndex", chunkIndex.toString());
            formData.append("totalChunks", totalChunks.toString());
            formData.append("encryptedFile", new Blob([chunk]), file.name);

            return fetch("http://localhost:5000/api/files/upload", {
              method: "POST",
              body: formData,
            })
              .then((res) => {
                if (!res.ok) throw new Error(`Chunk ${chunkIndex} failed`);
                return res.json();
              })
              .then(() => {
                uploadedChunks++;
                setUploadProgress(Math.round((uploadedChunks / totalChunks) * 100));
              });
          });

          await Promise.all(chunkUploadPromises);
          console.log(`${file.name} uploaded successfully`);

          //add access log
          const token = localStorage.getItem('token');

          const res = await fetch('http://localhost:5000/api/users/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });

          const result = await res.json();
          if (!res.ok) throw new Error(result.message || 'Failed to fetch profile');

          await fetch("http://localhost:5000/api/files/addAccesslog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file_id: fileId,
              user_id: userId,
              action: "created",
              message: `User ${result.data.email} uploaded the file.`,
            }),
          });

        } catch (err) {
          console.error(`Upload failed for ${file.name}:`, err);
          showToast(`Upload failed for ${file.name}`, "error");
        }
      })
    );

    setUploading(false);
    setUploadFiles([]);
    setUploadProgress(0);
    onOpenChange(false);
    onUploadSuccess?.();
  };

  const compressFile = async (file) => {
    const fileBuffer = new Uint8Array(await file.arrayBuffer());
    const compressedBuffer = gzip(fileBuffer, { level: 9 });
    return new Blob([compressedBuffer], { type: file.type });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!open) return null;

  return (
    <>
      {toast && (
        <div className="fixed top-1/4 left-1/2 -translate-x-1/2 z-[100]">
          <div
            className={`flex items-center justify-between px-4 py-3 rounded shadow-lg w-80 text-sm ${toast.type === "error"
                ? "bg-red-500 text-white"
                : toast.type === "success"
                  ? "bg-green-500 text-white"
                  : "bg-gray-800 text-white"
              }`}
          >
            <span>{toast.message}</span>
            <button onClick={closeToast} className="ml-3">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white p-6 rounded-lg w-full max-w-lg space-y-4 dark:bg-gray-200 dark:text-gray-900">
          <h2 className="text-lg font-semibold dark:text-gray-900">
            Upload Files
          </h2>

          <div
            className={`border-2 border-dashed p-8 text-center rounded-lg cursor-pointer ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
              }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
            <p className="text-sm mb-1 dark:text-gray-900">
              Drop files here or click to browse
            </p>
            <p className="text-xs text-gray-500 mb-4">Supports bulk upload</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex justify-center gap-4 mt-4">
              <button
                type="button"
                onClick={handleGoogleDriveUpload}
                className="flex items-center gap-2 border px-3 py-2 rounded text-sm hover:bg-gray-100"
              >
                <Image
                  src="/img/google.png"
                  alt="Google Drive"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
                Google Drive
              </button>

              <button
                type="button"
                onClick={handleDropboxUpload}
                disabled={dropboxLoading}
                className="flex items-center gap-2 border px-3 py-2 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Image
                  src="/img/dropbox.png"
                  alt="Dropbox"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                />
                {dropboxLoading ? 'Loading...' : 'Dropbox'}
              </button>
            </div>
          </div>

          {uploadFiles.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {uploadFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <FileIcon className="h-4 w-4" />
                    <div>
                      <p className="text-sm">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => removeFile(i)} className="p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="space-y-1">
              <p className="text-sm">Uploading... {uploadProgress}%</p>
              <div className="w-full h-2 bg-gray-200 rounded">
                <div
                  className="h-2 bg-blue-500 rounded"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="border px-4 py-2 rounded text-sm dark:border-gray-900 dark:text-gray-900"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={uploadFilesHandler}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
              disabled={uploadFiles.length === 0 || uploading}
            >
              {uploading ? "Uploading..." : `Upload (${uploadFiles.length})`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
