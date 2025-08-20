//app/dashboard/sharedWithMe/page.js

"use client";

import React, { useState, useEffect } from "react";
import { Grid, List } from "lucide-react";
import { ShareDialog } from "../myFilesV2/shareDialog";
import { FileDetailsDialog } from "../myFilesV2/fileDetailsDialog";
import { ActivityLogsDialog } from "../myFilesV2/activityLogsDialog";
import { FileGrid } from "./fileGrid2";
import { FileList } from "./fileList2";
import { useDashboardSearch } from "../components/DashboardSearchContext";
import { useEncryptionStore } from "@/app/SecureKeyStorage";
import { getSodium } from "@/app/lib/sodium";
import { PreviewDrawer } from "../myFilesV2/previewDrawer";
import { FullViewModal } from "../myFilesV2/fullViewModal";
import pako from "pako";

function Toast({ message, type = "info", onClose }) {
  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 pointer-events-none`}>
      <div className={`bg-red-300 border ${type === "error" ? "border-red-300" : "border-blue-500"} text-gray-900 rounded shadow-lg px-6 py-3 pointer-events-auto`}>
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 font-bold">×</button>
      </div>
    </div>
  );
}

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
  if (mimeType.includes("folder")) return "folder"; // Custom type for folders
  if (mimeType.includes("podcast")) return "podcast"; // Custom type for podcasts
  if (mimeType.includes("markdown")) return "markdown"; // Custom type for markdown files
  if (mimeType.includes("x-markdown")) return "markdown"; // Another common type for markdown
  if (mimeType.includes("md")) return "markdown";
  if (mimeType.includes("code") || mimeType.includes("script")) return "code"; // Custom type for code files
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
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  const [previewContent, setPreviewContent] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [viewerFile, setViewerFile] = useState(null);
  const [viewerContent, setViewerContent] = useState(null);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  // Filtered files based on search keyword
  const filteredVisibleFiles = files.filter((file) => {
    const name = file?.name?.toLowerCase() || "";
    const keyword = (search || "").toLowerCase();
    return name.includes(keyword);
  });

  // Check if file is view-only
  const isViewOnly = (file) => {
    let tags = [];
    if (file.tags) {
      if (Array.isArray(file.tags)) tags = file.tags;
      else if (typeof file.tags === "string") tags = file.tags.replace(/[{}]/g, "").split(",");
    }
    return tags.includes("view-only") || file.viewOnly;
  };

  // Fetch shared/view-only files
  const fetchFiles = async () => {
    try {
      const userId = useEncryptionStore.getState().userId;
      if (!userId) return;

      const res = await fetch("http://localhost:5000/api/files/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      let data = await res.json();
      if (!Array.isArray(data)) data = [];

      const formatted = data
        .filter((f) => {
          const tags = f.tags ? f.tags.replace(/[{}]/g, "").split(",") : [];
          return !tags.includes("deleted") &&
            !tags.some((tag) => tag.trim().startsWith("deleted_time:")) &&
            (tags.includes("view-only") || tags.includes("shared") || tags.includes("received"));
        })
        .map((f) => {
          const tags = f.tags ? f.tags.replace(/[{}]/g, "").split(",") : [];
          return {
            id: f.fileId || "",
            name: f.fileName || "Unnamed file",
            size: formatFileSize(f.fileSize || 0),
            type: getFileType(f.fileType || ""),
            description: f.description || "",
            path: f.cid || "",
            modified: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "",
            starred: false,
            viewOnly: tags.includes("view-only"),
            tags,
            allow_view_sharing: f.allow_view_sharing || false,
          };
        });

      setFiles(formatted);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpdateDescription = async (fileId, description) => {
    try {
      const res = await fetch(
        "http://localhost:5000/api/files/addDescription",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileId, description }),
        }
      );
      fetchFiles(); // Refresh files after update
      if (res.status === 200) {
        console.log("Description updated successfully");
      }
      if (!res.ok) {
        throw new Error("Failed to update description");
      }
    } catch (err) {
      console.error("Error updating description:", err);
    }
  };

  // Download file
  const handleDownload = async (file) => {
    if (isViewOnly(file)) {
      showToast("This file is view-only and cannot be downloaded.","error");
      return;
    }

    const { encryptionKey, userId } = useEncryptionStore.getState();
    if (!encryptionKey) {
      showToast("Missing encryption key","error");
      return;
    }

    const sodium = await getSodium();

    try {
      const res = await fetch("http://localhost:5000/api/files/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fileId: file.id }),
      });

      if (!res.ok) throw new Error("Download failed");

      const nonceBase64 = res.headers.get("X-Nonce");
      const fileName = res.headers.get("X-File-Name");
      if (!nonceBase64 || !fileName) throw new Error("Missing nonce or filename");

      const nonce = sodium.from_base64(nonceBase64, sodium.base64_variants.ORIGINAL);

      const reader = res.body.getReader();
      const chunks = [];
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.length;
      }

      const encryptedFile = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        encryptedFile.set(chunk, offset);
        offset += chunk.length;
      }

      const decrypted = sodium.crypto_secretbox_open_easy(encryptedFile, nonce, encryptionKey);
      if (!decrypted) throw new Error("Decryption failed");

      const blob = new Blob([decrypted]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);

      console.log(`✅ Downloaded and decrypted ${fileName}`);
    } catch (err) {
      console.error("Download error:", err);
      showToast("Download failed","error");
    }
  };

  // Load file (for preview/full view)
  const handleLoadFile = async (file) => {
    const { encryptionKey, userId } = useEncryptionStore.getState();
    if (!encryptionKey) {
      showToast("Missing encryption key","error");
      return null;
    }

    const sodium = await getSodium();

    try {
      const res = await fetch("http://localhost:5000/api/files/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fileId: file.id }),
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error("Access has been revoked or expired");
        throw new Error("Failed to load file");
      }

      const nonceBase64 = res.headers.get("X-Nonce");
      const fileName = res.headers.get("X-File-Name");
      if (!nonceBase64 || !fileName) throw new Error("Missing nonce or fileName in response headers");

      const nonce = sodium.from_base64(nonceBase64, sodium.base64_variants.ORIGINAL);

      const reader = res.body.getReader();
      const chunks = [];
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.length;
      }

      const encryptedFile = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        encryptedFile.set(chunk, offset);
        offset += chunk.length;
      }

      const decrypted = sodium.crypto_secretbox_open_easy(encryptedFile, nonce, encryptionKey);
      if (!decrypted) throw new Error("Decryption failed");

      return { fileName, decrypted };
    } catch (err) {
      console.error("Load file error:", err);
      showToast("Failed to load file: " + err.message,"error");
      return null;
    }
  };

  // Preview
  const handlePreview = async (file) => {
    const result = await handleLoadFile(file);
    if (!result) return;

    let contentUrl = null;
    let textSnippet = null;

    if (file.type.startsWith("image") || file.type.startsWith("video") || file.type.startsWith("audio")) {
      contentUrl = URL.createObjectURL(new Blob([result.decrypted]));
    } else if (file.type === "pdf") {
      contentUrl = URL.createObjectURL(new Blob([result.decrypted], { type: "application/pdf" }));
    } else if (["txt", "json", "csv"].some((ext) => file.type.includes(ext))) {
      textSnippet = new TextDecoder().decode(result.decrypted).slice(0, 1000);
    }

    setPreviewContent({ url: contentUrl, text: textSnippet });
    setPreviewFile(file);
  };

  // Full view
  const handleOpenFullView = async (file) => {
    const result = await handleLoadFile(file);
    if (!result) return;

    let contentUrl = null;
    let textFull = null;

    if (file.type.startsWith("image") || file.type.startsWith("video") || file.type.startsWith("audio")) {
      contentUrl = URL.createObjectURL(new Blob([result.decrypted]));
    } else if (file.type === "pdf") {
      contentUrl = URL.createObjectURL(new Blob([result.decrypted], { type: "application/pdf" }));
    } else if (["txt", "json", "csv"].some((ext) => file.type.includes(ext))) {
      textFull = new TextDecoder().decode(result.decrypted);
    }

    setViewerContent({ url: contentUrl, text: textFull });
    setViewerFile(file);
  };

  // Dialogs
  const openShareDialog = (file) => { setSelectedFile(file); setIsShareOpen(true); };
  const openDetailsDialog = (file) => { setSelectedFile(file); setIsDetailsOpen(true); };
  const openActivityDialog = (file) => { setSelectedFile(file); setIsActivityOpen(true); };

  // Revoke view access
  const handleRevokeViewAccess = async (file) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return showToast("Please log in to revoke access","info");

      const profileRes = await fetch("http://localhost:5000/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const profileResult = await profileRes.json();
      if (!profileRes.ok) return showToast("Failed to get user profile","error");

      const userId = profileResult.data.id;

      const sharedFilesRes = await fetch("http://localhost:5000/api/files/getViewAccess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!sharedFilesRes.ok) return showToast("Failed to get shared files","error");

      const sharedFiles = await sharedFilesRes.json();
      const fileShares = sharedFiles.filter(share => share.file_id === file.id);

      if (fileShares.length === 0) return showToast("No view-only shares found for this file","error");

      for (const share of fileShares) {
        const revokeRes = await fetch("http://localhost:5000/api/files/revokeViewAccess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: file.id, userId, recipientId: share.recipient_id }),
        });

        if (!revokeRes.ok) console.error(`Failed to revoke access for recipient ${share.recipient_id}`);
      }

      showToast("View access revoked successfully","success");
      fetchFiles();
    } catch (err) {
      console.error("Error revoking view access:", err);
      showToast("Failed to revoke view access","error");
    }
  };

  return (
    <div className="bg-gray-50 p-6 dark:bg-gray-900">
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-blue-500">Shared with me</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Files that have been shared with you
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex items-center bg-white rounded-lg border p-1 dark:bg-gray-200">
              <button
                className={`px-3 py-1 rounded ${viewMode === "grid"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-300"
                  }`}
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                className={`px-3 py-1 rounded ${viewMode === "list"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-300"
                  }`}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* File List */}
        {filteredVisibleFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center text-gray-700 dark:text-gray-400 rounded-lg p-10">
            <svg
              className="w-16 h-16 mb-4 text-gray-500 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7l1.664-1.664A2 2 0 016.586 5H17.41a2 2 0 011.414.586L21 7m-18 0v10a2 2 0 002 2h14a2 2 0 002-2V7m-18 0h18"
              />
            </svg>
            <h2 className="text-lg font-semibold">No files found</h2>
            <p className="text-sm text-gray-400">Get sharing ...</p>
          </div>
        ) : viewMode === "grid" ? (
          <FileGrid
            files={filteredVisibleFiles}
            onShare={openShareDialog}
            onViewDetails={openDetailsDialog}
            onViewActivity={openActivityDialog}
            onDownload={handleDownload}
            onDelete={fetchFiles}
            onRevokeViewAccess={handleRevokeViewAccess}
            onClick={handlePreview}
            onDoubleClick={handleOpenFullView}
          />
        ) : (
          <FileList
            files={filteredVisibleFiles}
            onShare={openShareDialog}
            onViewDetails={openDetailsDialog}
            onViewActivity={openActivityDialog}
            onDownload={handleDownload}
            onDelete={fetchFiles}
            onRevokeViewAccess={handleRevokeViewAccess}
            onClick={handlePreview}
            onDoubleClick={handleOpenFullView}
          />
        )}

        {/* Dialogs */}
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
          onSaveDescription={handleUpdateDescription}
        />
        <FullViewModal
          file={viewerFile}
          content={viewerContent}
          onClose={setViewerFile}
        />

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );

}
