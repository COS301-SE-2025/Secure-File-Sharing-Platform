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
  const [currentPath, setCurrentPath] = useState("");
  const [refreshFlag, setRefreshFlag] = useState(false);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  const [previewContent, setPreviewContent] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [viewerFile, setViewerFile] = useState(null);
  const [viewerContent, setViewerContent] = useState(null);

  const normalizePath = (path) =>
    path?.startsWith("files/") ? path.slice(6) : path || "";

  const isDirectChild = (rawPath) => {
    const filePath = normalizePath(rawPath);
    const base = currentPath || "";

    if (base === "") {
      return !filePath.includes("/");
    }

    const expectedPrefix = base.endsWith("/") ? base : base + "/";
    if (!filePath.startsWith(expectedPrefix)) return false;

    const remainder = filePath.slice(expectedPrefix.length);
    return remainder !== "" && !remainder.includes("/");
  };

  const filteredVisibleFiles = files.filter((file) => {
    const name = file?.name?.toLowerCase() || "";
    const path = normalizePath(file?.path);
    const keyword = (search || "").toLowerCase();

    return (
      name.includes(keyword) &&
      path?.startsWith(currentPath || "") &&
      isDirectChild(path)
    );
  });

  const isViewOnly = (file) => {
    console.log("Checking if file is view-only:", file);
    let tags = [];
    if (file.tags) {
      if (Array.isArray(file.tags)) {
        tags = file.tags;
      } else if (typeof file.tags === 'string') {
        tags = file.tags.replace(/[{}]/g, "").split(",");
      }
    }
    
    return tags.includes("view-only") || file.viewOnly;
  };

  const isOwner = (file) => {
    let tags = [];
    if (file.tags) {
      if (Array.isArray(file.tags)) {
        tags = file.tags;
      } else if (typeof file.tags === 'string') {
        tags = file.tags.replace(/[{}]/g, "").split(",");
      }
    }
    
    return !tags.includes("received");
  };

  const fetchFiles = async () => {
    try {
      const userId = useEncryptionStore.getState().userId;
      if (!userId) {
        console.error("Cannot fetch files: Missing userId in store.");
        return;
      }

      console.log("Getting the user's files");
      const res = await fetch("http://localhost:5000/api/files/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        const text = await res.text();
        console.error("Failed to parse JSON:", text);
        return;
      }

      if (!Array.isArray(data)) {
        data = [];
      }

      const formatted = data
        .filter((f) => {
          const tags = f.tags ? f.tags.replace(/[{}]/g, "").split(",") : [];
          return (
            !tags.includes("deleted") &&
            !tags.some((tag) => tag.trim().startsWith("deleted_time:"))
          );
        })
        .map((f) => {
          const tags = f.tags ? f.tags.replace(/[{}]/g, "").split(",") : [];
          const isViewOnlyFile = tags.includes("view-only");
          
          return {
            id: f.fileId || "",
            name: f.fileName || "Unnamed file",
            size: formatFileSize(f.fileSize || 0),
            type: getFileType(f.fileType || ""),
            description: f.description || "",
            path: f.cid || "",
            modified: f.createdAt
              ? new Date(f.createdAt).toLocaleDateString()
              : "",
            shared: false,
            starred: false,
            viewOnly: isViewOnlyFile,
            tags: tags, // Keep tags for easier checking
            allow_view_sharing: f.allow_view_sharing || false,
          };
        });
      
      console.log("Formatted (filtered) files:", formatted);
      setFiles(formatted);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDownload = async (file) => {
    if (isViewOnly(file)) {
      alert("This file is view-only and cannot be downloaded.");
      return;
    }
    
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
          fileId: file.id,
        }),
      });

      if (!res.ok) throw new Error("Download failed");

      // Get binary data directly
      const buffer = await res.arrayBuffer();
      const encryptedFile = new Uint8Array(buffer);

      // Get nonce + fileName from headers
      const nonceBase64 = res.headers.get("X-Nonce");
      const fileName = res.headers.get("X-File-Name");

      if (!nonceBase64 || !fileName) {
        throw new Error("Missing nonce or fileName in response headers");
      }

      const decrypted = sodium.crypto_secretbox_open_easy(
        encryptedFile,
        sodium.from_base64(nonceBase64, sodium.base64_variants.ORIGINAL),
        encryptionKey
      );

      if (!decrypted) {
        throw new Error("Decryption failed");
      }

      // Download file
      const blob = new Blob([decrypted]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);

      // Add access log
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
      // Always use regular download endpoint for previews
      const res = await fetch("http://localhost:5000/api/files/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fileId: file.id,
        }),
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access has been revoked or expired");
        }
        throw new Error("Failed to load file");
      }

      // Get binary data directly
      const buffer = await res.arrayBuffer();
      const encryptedFile = new Uint8Array(buffer);

      // Get nonce + fileName from headers
      const nonceBase64 = res.headers.get("X-Nonce");
      const fileName = res.headers.get("X-File-Name");

      if (!nonceBase64 || !fileName) {
        throw new Error("Missing nonce or fileName in response headers");
      }

      const decrypted = sodium.crypto_secretbox_open_easy(
        encryptedFile,
        sodium.from_base64(nonceBase64, sodium.base64_variants.ORIGINAL),
        encryptionKey
      );

      if (!decrypted) {
        throw new Error("Decryption failed");
      }

      return { fileName, decrypted };
    } catch (err) {
      console.error("Load file error:", err);
      alert("Failed to load file: " + err.message);
      return null;
    }
  };

  const handlePreview = async (file) => {
    console.log("Inside handlePreview");
    if (file.type === "folder") {
      setPreviewContent({
        url: null,
        text: "This is a folder. Double-click to open.",
      });
      setPreviewFile(file);
      return;
    }

    const result = await handleLoadFile(file);
    if (!result) return;
    
    let contentUrl = null;
    let textSnippet = null;

    if (
      file.type === "image" ||
      file.type === "video" ||
      file.type === "audio"
    ) {
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
      textSnippet = new TextDecoder().decode(result.decrypted).slice(0, 1000);
    }

    setPreviewContent({ url: contentUrl, text: textSnippet });
    setPreviewFile(file);
  };

  const handleOpenFullView = async (file) => {
    if (file.type === "folder") {
      setPreviewContent({
        url: null,
        text: "This is a folder. Double-click to open.",
      });
      setPreviewFile(file);
      return;
    }

    const result = await handleLoadFile(file);
    if (!result) return;

    let contentUrl = null;
    let textFull = null;

    if (
      file.type === "image" ||
      file.type === "video" ||
      file.type === "audio"
    ) {
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

  const handleMoveFile = async (file, destinationFolderPath) => {
    const fullPath = destinationFolderPath
      ? `files/${destinationFolderPath}/${file.name}`
      : `files/${file.name}`; // for root-level

    const res = await fetch("http://localhost:5000/api/files/updateFilePath", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: file.id, newPath: fullPath }),
    });

    if (res.ok) {
      fetchFiles();
    } else {
      alert("Failed to move file");
    }
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

  const handleRevokeViewAccess = async (file) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to revoke access");
        return;
      }

      const profileRes = await fetch("http://localhost:5000/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const profileResult = await profileRes.json();
      if (!profileRes.ok) {
        alert("Failed to get user profile");
        return;
      }

      const userId = profileResult.data.id;

      const sharedFilesRes = await fetch("http://localhost:5000/api/files/getViewAccess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!sharedFilesRes.ok) {
        alert("Failed to get shared files");
        return;
      }

      const sharedFiles = await sharedFilesRes.json();
      const fileShares = sharedFiles.filter(share => share.file_id === file.id);

      if (fileShares.length === 0) {
        alert("No view-only shares found for this file");
        return;
      }

      for (const share of fileShares) {
        const revokeRes = await fetch("http://localhost:5000/api/files/revokeViewAccess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: file.id,
            userId: userId,
            recipientId: share.recipient_id
          }),
        });

        if (!revokeRes.ok) {
          console.error(`Failed to revoke access for recipient ${share.recipient_id}`);
        }
      }

      alert("View access revoked successfully");
      fetchFiles();
    } catch (err) {
      console.error("Error revoking view access:", err);
      alert("Failed to revoke view access");
    }
  };

  const renderBreadcrumbs = () => {
    const segments = currentPath ? currentPath.split("/") : [];
    const crumbs = [
      { name: "Root", path: "" },
      ...segments.map((seg, i) => ({
        name: seg,
        path: segments.slice(0, i + 1).join("/"),
      })),
    ];

    return (
      <nav className="mb-4 text-sm text-gray-700 dark:text-gray-200">
        {crumbs.map((crumb, i) => (
          <span key={crumb.path}>
            <button
              onClick={() => setCurrentPath(crumb.path)}
              className="text-blue-600 hover:underline"
            >
              {crumb.name || "Root"}
            </button>
            {i < crumbs.length - 1 && <span className="mx-1">/</span>}
          </span>
        ))}
      </nav>
    );
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
        {/* Back Button */}
        <div className="flex flex-col space-y-2 mb-4">
          {currentPath && (
            <button
              onClick={() =>
                setCurrentPath(currentPath.split("/").slice(0, -1).join("/"))
              }
              className="self-start text-sm text-blue-600 hover:underline"
            >
              ← Go Back to "
              {currentPath.split("/").slice(0, -1).join("/") || "root"}"
            </button>
          )}
        </div>

        {renderBreadcrumbs()}

        {/*File */}
        {filteredVisibleFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center text-gray-700 dark:text-gray-500  rounded-lg p-10">
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
            <p className="text-sm text-gray-400">Upload or create folders to get started</p>
          </div>
        ) : viewMode === "grid" ? (
          <FileGrid
            files={filteredVisibleFiles} // files filtered by currentPath
            onShare={openShareDialog}
            onViewDetails={openDetailsDialog}
            onViewActivity={openActivityDialog}
            onDownload={handleDownload}
            onDelete={fetchFiles}
            onRevokeViewAccess={handleRevokeViewAccess}
            onClick={handlePreview}
            onDoubleClick={handleOpenFullView}
            onMoveFile={handleMoveFile}
            onEnterFolder={(folderName) =>
              setCurrentPath(
                currentPath ? `${currentPath}/${folderName}` : folderName
              )
            }
            currentPath={currentPath}
            onGoBack={() =>
              setCurrentPath(currentPath.split("/").slice(0, -1).join("/"))
            }
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
            onChangeShareMode={handleChangeShareMode}
            onClick={handlePreview}
            onDoubleClick={handleOpenFullView}
            onMoveFile={handleMoveFile}
            onEnterFolder={(folderName) =>
              setCurrentPath(
                currentPath ? `${currentPath}/${folderName}` : folderName
              )
            }
            currentPath={currentPath}
            onGoBack={() =>
              setCurrentPath(currentPath.split("/").slice(0, -1).join("/"))
            }
          />
        )}


        {/* Dialogs */}
        <UploadDialog
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          onUploadSuccess={fetchFiles}
          currentFolderPath={currentPath}
        />
        <CreateFolderDialog
          open={isCreateFolderOpen}
          onOpenChange={setIsCreateFolderOpen}
          currentPath={currentPath}
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
          onSaveDescription={handleUpdateDescription}
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