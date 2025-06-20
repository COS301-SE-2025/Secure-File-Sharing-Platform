'use client';

import React, { useState, useEffect } from "react";
import { Upload, FolderPlus, Grid, List } from 'lucide-react';
import { ShareDialog } from './shareDialog';
import { UploadDialog } from './uploadDialog';
import { FileDetailsDialog } from './fileDetailsDialog';
import { ActivityLogsDialog } from './activityLogsDialog';
import { CreateFolderDialog } from './createFolderDialog';
import { FileGrid } from './fileGrid';
import { FileList } from './fileList';

function getFileType(mimeType) {
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
  return "file";
}

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  else if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  else if (size < 1024 * 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  else return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function MyFiles() {
  const [files, setFiles] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedFile, setSelectedFile] = useState(null);

  // Dialog states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  useEffect(() => {
    async function fetchFiles() {
      try {
        const res = await fetch("http://localhost:5000/api/files/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "123" }), // Replace with dynamic userId
        });
        const data = await res.json();

        const formatted = data.map((f) => ({
          id: f.FileName + Math.random(),
          name: f.FileName,
          size: formatFileSize(f.FileSize),
          type: getFileType(f.FileType),
          modified: f.UploadTimestamp
            ? new Date(f.UploadTimestamp).toLocaleDateString()
            : "",
          shared: false,
          starred: false,
          path: f.Path,
        }));

        setFiles(formatted);
      } catch (err) {
        console.error("Failed to fetch files:", err);
      }
    }

    fetchFiles();
  }, []);

  // Download handler
  const handleDownload = async (file) => {
    try {
      const response = await fetch("http://localhost:5000/api/files/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: file.path || "files/demo",
          filename: file.name,
        }),
      });

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

  // Open dialogs handlers
  const openShareDialog = (file) => {
    setSelectedFile(file);
    setIsShareOpen(true);
  };
  const openDetailsDialog = (file) => {
    setSelectedFile(file);
    setIsDetailsOpen(true);
  };
  const openActivityDialog = (file) => {
    setSelectedFile(file);
    setIsActivityOpen(true);
  };

  return (
    <div className=" bg-gray-50 p-6">
      <div className=" ">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-blue-500 ">My FIles</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage and organize your files</p>
          </div>

          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center bg-white rounded-lg border p-1">
              <button
                className={`px-3 py-1 rounded ${
                  viewMode === "grid"
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                className={`px-3 py-1 rounded ${
                  viewMode === "list"
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Create Folder & Upload buttons */}
            <button
              onClick={() => setIsCreateFolderOpen(true)}
              className="flex items-center gap-2 px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Create Folder</span>
            </button>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Files</span>
            </button>
          </div>
        </div>

        {/* File Content */}
        {viewMode === "grid" ? (
          <FileGrid
            files={files}
            onShare={openShareDialog}
            onViewDetails={openDetailsDialog}
            onViewActivity={openActivityDialog}
            onDownload={handleDownload}
          />
        ) : (
          <FileList
            files={files}
            onShare={openShareDialog}
            onViewDetails={openDetailsDialog}
            onViewActivity={openActivityDialog}
            onDownload={handleDownload}
          />
        )}

        {/* Dialogs */}
        <UploadDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} />
        <CreateFolderDialog
          open={isCreateFolderOpen}
          onOpenChange={setIsCreateFolderOpen}
        />
        <ShareDialog
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
          file={selectedFile}
        />
        <FileDetailsDialog
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          file={selectedFile}
        />
        <ActivityLogsDialog
          open={isActivityOpen}
          onOpenChange={setIsActivityOpen}
          file={selectedFile}
        />
      </div>
    </div>
  );
}
