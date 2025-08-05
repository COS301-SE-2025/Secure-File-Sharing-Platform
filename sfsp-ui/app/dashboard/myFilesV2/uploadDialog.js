//app/dashboard/myFilesV2/uploadDialog.js

"use client";

import React, { useState, useRef } from "react";
import { Upload, X, File } from "lucide-react";
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

  const handleGoogleDriveUpload = () => {};

  const handleDropboxUpload = () => {};

  const removeFile = (index) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const chunkSize = 5 * 1024 * 1024; // 5 MB per chunk

  const uploadFilesHandler = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    const { encryptionKey, userId } = useEncryptionStore.getState();
    if (!encryptionKey || !userId) {
      alert("Missing user ID or encryption key.");
      setUploading(false);
      return;
    }

    const sodium = await getSodium();

    // Upload in parallel for each file
    await Promise.all(
      uploadFiles.map(async (file) => {
        const totalChunks = Math.ceil(file.size / chunkSize);

        const compressedFile = await compressFile(file);

        // Compute file hash (use file as a buffer)
        const fileBuffer = new Uint8Array(await compressedFile.arrayBuffer());
        const fileHash = sodium.crypto_generichash(32, fileBuffer);

        try {
          // Process each chunk
          for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const chunkStart = chunkIndex * chunkSize;
            const chunkEnd = Math.min(
              chunkStart + chunkSize,
              fileBuffer.length
            );
            const chunk = fileBuffer.slice(chunkStart, chunkEnd);

            // Encrypt chunk
            const nonce = sodium.randombytes_buf(
              sodium.crypto_secretbox_NONCEBYTES
            );
            const ciphertext = sodium.crypto_secretbox_easy(
              chunk,
              nonce,
              encryptionKey
            );

            // Prepare form data for each chunk
            const formData = new FormData();
            formData.append("userId", userId);
            formData.append("fileName", file.name);
            formData.append("fileType", file.type);
            formData.append("fileDescription", ""); // a user can add description later
            formData.append("fileTags", JSON.stringify(["personal"]));
            formData.append("path", currentFolderPath || "");
            formData.append(
              "fileHash",
              sodium.to_base64(fileHash, sodium.base64_variants.ORIGINAL)
            );
            formData.append(
              "nonce",
              sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL)
            );
            formData.append("chunkIndex", chunkIndex);
            formData.append("totalChunks", totalChunks);

            // ⬇️ Encrypted chunk as binary Blob
            formData.append("encryptedFile", new Blob([ciphertext]), file.name);

            // Send each chunk to the server
            const res = await fetch(
              "http://localhost:5000/api/files/uploadChunk",
              {
                method: "POST",
                body: formData,
              }
            );

            if (!res.ok)
              throw new Error(`Upload failed for chunk ${chunkIndex + 1}`);

            const uploadResult = await res.json();
            console.log(uploadResult);

            // Update the progress bar as chunks are uploaded
            setUploadProgress((prev) =>
              Math.round(((chunkIndex + 1) / totalChunks) * 100)
            );
          }
        } catch (err) {
          console.error(`Upload failed for ${file.name}:`, err);
          alert(`Upload failed for ${file.name}`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg space-y-4 dark:bg-gray-200 dark:text-gray-900">
        <h2 className="text-lg font-semibold dark:text-gray-900">
          Upload Files
        </h2>

        <div
          className={`border-2 border-dashed p-8 text-center rounded-lg cursor-pointer ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
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
              className="flex items-center gap-2 border px-3 py-2 rounded text-sm hover:bg-gray-100"
            >
              <Image
                src="/img/dropbox.png"
                alt="Dropbox"
                width={20}
                height={20}
                className="h-5 w-5"
              />
              Dropbox
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
                  <File className="h-4 w-4" />
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
  );
}
