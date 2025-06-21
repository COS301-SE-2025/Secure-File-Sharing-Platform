//app/dashboard/myFilesV2/uploadDialog.js

'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, File } from 'lucide-react';

export function UploadDialog({ open, onOpenChange, onUploadSuccess }) {
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
        e.target.value = null; // Reset file input so reselect works
    };

    const removeFile = (index) => {
        setUploadFiles(uploadFiles.filter((_, i) => i !== index));
    };

    const toBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
        });

    const uploadFilesHandler = async () => {
        if (uploadFiles.length === 0) return;
        setUploading(true);
        setUploadProgress(0);

        for (let i = 0; i < uploadFiles.length; i++) {
            const file = uploadFiles[i];

            try {
                const base64 = await toBase64(file);
                const payload = {
                    fileName: file.name,
                    fileType: file.type,
                    userId: "123", // TODO: Replace dynamically
                    encryptionKey: "mysecretkey",
                    fileDescription: "Uploaded from UI",
                    fileTags: ["ui", "test"],
                    path: "files/demo",
                    fileContent: base64,
                };

                const res = await fetch("http://localhost:5000/api/files/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!res.ok) throw new Error("Upload failed");
            } catch (err) {
                console.error(`Failed to upload ${file.name}:`, err);
                alert(`Upload failed for ${file.name}`);
            }

            setUploadProgress(Math.round(((i + 1) / uploadFiles.length) * 100));
        }

        setUploading(false);
        setUploadFiles([]);
        setUploadProgress(0);
        onOpenChange(false);

        onUploadSuccess?.();
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-lg w-full max-w-lg space-y-4 dark:bg-gray-200 dark:text-gray-900">
                <h2 className="text-lg font-semibold dark:text-gray-900">Upload Files</h2>

                <div
                    className={`border-2 border-dashed p-8 text-center rounded-lg cursor-pointer ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm mb-1 dark:text-gray-900">Drop files here or click to browse</p>
                    <p className="text-xs text-gray-500 mb-4">Supports bulk upload</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>

                {uploadFiles.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {uploadFiles.map((file, i) => (
                            <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <div className="flex items-center gap-2">
                                    <File className="h-4 w-4" />
                                    <div>
                                        <p className="text-sm">{file.name}</p>
                                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
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
