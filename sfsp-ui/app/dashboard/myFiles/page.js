"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  UploadCloud,
  FolderPlus,
  FilePlus,
  MoreVertical,
  Share2,
} from "lucide-react";

export function getFileType(mimeType) {
  if (!mimeType) return "unknown";

  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("image")) return "image";
  if (mimeType.includes("video")) return "video";
  if (mimeType.includes("audio")) return "audio";
  if (mimeType.includes("zip") || mimeType.includes("rar")) return "archive";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("sheet")
  )
    return "excel";
  if (mimeType.includes("presentation")) return "ppt";
  if (mimeType.includes("word") || mimeType.includes("document")) return "word";
  if (mimeType.includes("text")) return "txt";
  if (mimeType.includes("json")) return "json";
  if (mimeType.includes("csv")) return "csv";
  if (mimeType.includes("html")) return "html";

  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "csv") return "csv";
  if (ext === "xlsx") return "excel";
  if (ext === "txt") return "txt";

  return "file";
}

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  else if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  else if (size < 1024 * 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  else return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function MyFilesPage() {
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState(null);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/files/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "123" }), //Make this dynamic based on our auth system
    })
      .then((res) => res.json())
      .then((data) => {
        const formatted = data.map((f) => ({
          name: f.FileName,
          size: formatFileSize(f.FileSize),
          type: getFileType(f.FileType),
        }));
        setFiles(formatted);
      })
      .catch((err) => {
        console.error("Failed to fetch files:", err);
      });
  }, []);

  const toBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(reader.result?.toString().split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = {
      fileName: file.name,
      fileType: file.type,
      userId: "123", //Replace with dynamic user ID from auth system
      encryptionKey: "mysecretkey",
      fileDescription: "Uploaded from UI",
      fileTags: ["ui", "test"],
      path: "files/demo",
      fileContent: await toBase64(file),
    };

    console.log("Uploading file:", formData);

    try {
      const res = await fetch("http://localhost:5000/api/files/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Upload failed");
      alert("Upload successful");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    }
  };

  const handleDownload = async (file) => {
    try {
      const response = await fetch("http://localhost:5000/api/files/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: "files/demo", // Replace with actual path after demo 1
          filename: file.name,
        }),
      });

      console.log("path:", file.path, "filename:", file.name);
      console.log("Download response:", response);

      if (!response.ok) throw new Error("Download failed");

      const { fileName, fileContent } = await response.json();
      const blob = new Blob([
        Uint8Array.from(atob(fileContent), (c) => c.charCodeAt(0)),
      ]);
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download file.");
    }
  };

  return (
    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">My Files</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your personal files and folders
          </p>
        </div>
        <div className="relative flex gap-2">
          <div className="relative">
            <button
              onClick={() => {
                setShowUploadOptions(!showUploadOptions);
                setShowCreateOptions(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              <UploadCloud size={18} />
              Upload
            </button>
            {showUploadOptions && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md z-10">
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <label className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    Upload File
                    <input type="file" hidden onChange={handleFileUpload} />
                  </label>
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                  Upload Folder
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => {
                setShowCreateOptions(!showCreateOptions);
                setShowUploadOptions(false);
              }}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-blue-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-md flex items-center gap-2 border "
            >
              <Plus size={18} />
              Create
            </button>
            {showCreateOptions && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md z-10">
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                  Create File
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                  Create Folder
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {files.map((file, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow relative group"
          >
            <div className="font-medium text-lg">{file.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {file.size}
            </div>
            <div className="text-xs mt-1 text-gray-400">{file.type}</div>
            <button
              onClick={() =>
                setActiveMenuIndex(activeMenuIndex === idx ? null : idx)
              }
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <MoreVertical size={20} />
            </button>

            {activeMenuIndex === idx && (
              <div className="absolute top-10 right-3 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md z-10">
                <button className="w-full text-left px-4 py-2 hover:bg-blue-300 dark:hover:bg-gray-700 flex items-center gap-2">
                  <Share2 size={16} />
                  Share file
                </button>
                <button
                  onClick={() => handleDownload(file)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FilePlus size={16} />
                  Download file
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
