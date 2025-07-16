//app/dashboard/myFilesV2/page.js

"use client";

import React, { useState, useEffect } from "react";
import { Upload, FolderPlus, Grid, List } from "lucide-react";
import { ShareDialog } from "./shareDialog";
import { UploadDialog } from "./uploadDialog";
import { FileDetailsDialog } from "./fileDetailsDialog";
import { ActivityLogsDialog } from "./activityLogsDialog";
import { CreateFolderDialog } from "./createFolderDialog";
import { FileGrid } from "./fileGrid";
import { FileList } from "./fileList";
import { useDashboardSearch } from "../components/DashboardSearchContext";
import { useEncryptionStore } from "@/app/SecureKeyStorage";
import { getSodium } from "@/app/lib/sodium";
import { PreviewDrawer } from "./previewDrawer";
import { FullViewModal } from "./fullViewModal";

function getFileType(mimeType) {
  if (!mimeType) return "unknown";
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("image")) return "image";
  if (mimeType.includes("video")) return "video";
  if (mimeType.includes("audio")) return "audio";
  if (mimeType.includes("application")) return "application";
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
  const { search } = useDashboardSearch();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  const [previewContent, setPreviewContent] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [viewerFile, setViewerFile] = useState(null);
  const [viewerContent, setViewerContent] = useState(null);

  const filteredFiles = files.filter(
    (file) =>
      file &&
      typeof file.name === "string" &&
      file.name.toLowerCase().includes((search || "").toLowerCase())
  );

  const fetchFiles = async () => {
    try {
      const userId = useEncryptionStore.getState().userId;
      if (!userId) {
        console.error("Cannot fetch files: Missing userId in store.");
        return;
      }

      const res = await fetch("http://localhost:5000/api/files/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      console.log("Fetched files from API:", data);

      const formatted = data
        .filter((f) => {
          const tags = f.tags ? f.tags.replace(/[{}]/g, "").split(",") : [];

          return (
            !tags.includes("deleted") &&
            !tags.some((tag) => tag.trim().startsWith("deleted_time:"))
          );
        })
        .map((f) => ({
          id: f.fileId || "",
          name: f.fileName || "Unnamed file",
          size: formatFileSize(f.fileSize || 0),
          type: getFileType(f.fileType || ""),
          modified: f.createdAt
            ? new Date(f.createdAt).toLocaleDateString()
            : "",
          shared: false,
          starred: false,
        }));

      setFiles(formatted);
      console.log("Formatted (filtered) files:", formatted);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDownload = async (file) => {
    const { encryptionKey, userId } = useEncryptionStore.getState();
    if (!encryptionKey) {
      alert("Missing encryption key");
      return;
    }

    const sodium = await getSodium();

    try {
      const res = await fetch("http://localhost:5000/api/files/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          filename: file.name,
        }),
      });

      if (!res.ok) throw new Error("Download failed");

      const { fileName, fileContent, nonce } = await res.json();

      const decrypted = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(fileContent, sodium.base64_variants.ORIGINAL),
        sodium.from_base64(nonce, sodium.base64_variants.ORIGINAL),
        encryptionKey
      );

      const blob = new Blob([decrypted]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);

      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const profileRes = await fetch(
          "http://localhost:5000/api/users/profile",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const profileResult = await profileRes.json();
        if (!profileRes.ok)
          throw new Error(profileResult.message || "Failed to fetch profile");

        console.log(file);
        await fetch("http://localhost:5000/api/files/addAccesslog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_id: file.id,
            user_id: profileResult.data.id,
            action: "downloaded",
            message: `User ${profileResult.data.email} has downloaded the file.`,
          }),
        });
      } catch (err) {
        console.error("Failed to fetch user profile:", err.message);
      }
    } catch (err) {
      console.error("Download error:", err);
      alert("Download failed");
    }
  };

  const handleLoadFile = async (file) => {
    const { encryptionKey, userId } = useEncryptionStore.getState();
    if (!encryptionKey) {
      alert("Missing encryption key");
      return null;
    }
    const sodium = await getSodium();

    try {
      const res = await fetch("http://localhost:5000/api/files/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          filename: file.name,
        }),
      });

      if (!res.ok) throw new Error("Download failed");

      const { fileName, fileContent, nonce } = await res.json();
      const decrypted = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(fileContent, sodium.base64_variants.ORIGINAL),
        sodium.from_base64(nonce, sodium.base64_variants.ORIGINAL),
        encryptionKey
      );

      return { fileName, decrypted };
    } catch (err) {
      console.error("Load file error:", err);
      alert("Failed to load file");
      return null;
    }
  };

  const handlePreview = async (file) => {
    console.log("Inside handlePreview");
    const result = await handleLoadFile(file);
    if (!result) return;

    let contentUrl = null;
    let textSnippet = null;

    if (file.type === "image" || file.type === "video" || file.type === "audio") {
      contentUrl = URL.createObjectURL(new Blob([result.decrypted]));
    } else if (file.type === "pdf") {
      contentUrl = URL.createObjectURL(
        new Blob([result.decrypted], { type: "application/pdf" })
      );
    } else if (
      file.type === "txt" ||
      file.type === "json" ||
      file.type === "csv"
    ) {
      textSnippet = new TextDecoder().decode(result.decrypted).slice(0, 1000); // show 1000 chars
    }

    setPreviewContent({ url: contentUrl, text: textSnippet });
    setPreviewFile(file);
  };

  const handleOpenFullView = async (file) => {
    const result = await handleLoadFile(file);
    if (!result) return;

    let contentUrl = null;
    let textFull = null;

    if (file.type === "image" || file.type === "video" || file.type === "audio") {
      contentUrl = URL.createObjectURL(new Blob([result.decrypted]));
    } else if (file.type === "pdf") {
      contentUrl = URL.createObjectURL(
        new Blob([result.decrypted], { type: "application/pdf" })
      );
    } else if (
      file.type === "txt" ||
      file.type === "json" ||
      file.type === "csv"
    ) {
      textFull = new TextDecoder().decode(result.decrypted);
    }

    setViewerContent({ url: contentUrl, text: textFull });
    setViewerFile(file);
  };

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
    <div className=" bg-gray-50 p-6 dark:bg-gray-900">
      <div className=" ">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-blue-500 ">My Files</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and organize your files
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center bg-white rounded-lg border p-1 dark:bg-gray-200">
              <button
                className={`px-3 py-1 rounded ${
                  viewMode === "grid"
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-300"
                }`}
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                className={`px-3 py-1 rounded ${
                  viewMode === "list"
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-300"
                }`}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Create Folder & Upload buttons */}
            <button
              onClick={() => setIsCreateFolderOpen(true)}
              className="flex items-center gap-2 px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 dark:bg-gray-200 dark:text-gray-900"
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

        {/*File */}
        {viewMode === "grid" ? (
          <FileGrid
            files={filteredFiles}
            onShare={openShareDialog}
            onViewDetails={openDetailsDialog}
            onViewActivity={openActivityDialog}
            onDownload={handleDownload}
            onDelete={fetchFiles}
            onClick={handlePreview}
            onDoubleClick={handleOpenFullView}
          />
        ) : (
          <FileList
            files={filteredFiles}
            onShare={openShareDialog}
            onViewDetails={openDetailsDialog}
            onViewActivity={openActivityDialog}
            onDownload={handleDownload}
            onDelete={fetchFiles}
            onClick={handlePreview}
            onDoubleClick={handleOpenFullView}
          />
        )}

        {/* Dialogs */}
        <UploadDialog
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          onUploadSuccess={fetchFiles}
        />
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
        <PreviewDrawer
          file={previewFile}
          content={previewContent}
          onClose={setPreviewFile}
          onOpenFullView={handleOpenFullView}
        />

        <FullViewModal
          file={viewerFile}
          content={viewerContent}
          onClose={setViewerFile}
        />
      </div>
    </div>
  );
}
