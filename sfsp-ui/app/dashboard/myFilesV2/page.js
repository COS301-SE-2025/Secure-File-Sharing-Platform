//app/dashboard/myFilesV2/page.js

"use client";

import React, { useState, useEffect } from "react";
import { Upload, FolderPlus, Grid, List, Route } from "lucide-react";
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
import { RevokeAccessDialog } from "./revokeAccessDialog";
import { ChangeShareMethodDialog } from "./changeShareMethodDialog";
import { PDFDocument, rgb } from "pdf-lib";
//import fetchProfile from "../components/Sidebar"
import { formatDate } from "../../../lib/dateUtils";
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";

function Toast({ message, type = "info", onClose }) {
  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 pointer-events-none`}>
      <div className={`bg-green-500 border border-green-600 text-white rounded shadow-lg px-6 py-3 pointer-events-auto`}>
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 font-bold hover:bg-green-600 rounded px-1">×</button>
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
  const [currentPath, setCurrentPath] = useState("");
  const [refreshFlag, setRefreshFlag] = useState(false);

  // Clipboard state for cut operations
  const [clipboard, setClipboard] = useState(null); // { file: file, operation: 'cut' }

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isRevokeAccessOpen, setIsRevokeAccessOpen] = useState(false);
  const [isChangeMethodOpen, setIsChangeMethodOpen] = useState(false);

  const [previewContent, setPreviewContent] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [viewerFile, setViewerFile] = useState(null);
  const [viewerContent, setViewerContent] = useState(null);

  const [toast, setToast] = useState(null);

  const [user, setUser] = useState(null); 

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

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
      } else if (typeof file.tags === "string") {
        tags = file.tags.replace(/[{}]/g, "").split(",");
      }
    }

    return tags.includes("view-only") || file.viewOnly;
  };

  const fetchFiles = async () => {
    try {
      const userId = useEncryptionStore.getState().userId;
      if (!userId) {
        console.error("Cannot fetch files: Missing userId in store.");
        return;
      }

      console.log("Getting the user's files");
      const res = await fetch(getFileApiUrl("/metadata"), {
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
          const isFolder =
            !f.fileType || f.fileType.toLowerCase() === "folder"; // ✅ detect folder

          return {
            id: f.fileId || "",
            name: f.fileName || "Unnamed file",
            size: formatFileSize(f.fileSize || 0),
            type: getFileType(f.fileType || ""),
            description: f.description || "",
            path: f.cid || "",
            modified: f.createdAt
              ? formatDate(f.createdAt)
              : "",
            shared: false,
            starred: false,
            viewOnly: isViewOnlyFile,
            tags,
            allow_view_sharing: f.allow_view_sharing || false,
            isFolder,
          };
        });

      const sorted = formatted.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });

      console.log("Sorted files:", sorted);
      setFiles(sorted);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };


  useEffect(() => {
    fetchFiles();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
        return;
      }

      const ctrlPressed = e.ctrlKey || e.metaKey;

      if (ctrlPressed) {
        switch (e.key.toLowerCase()) {
          case 'c':
            e.preventDefault();
            if (selectedFile) {
              setClipboard({ file: selectedFile, operation: 'cut' });
            }
            break;
          case 'v':
            e.preventDefault();
            if (clipboard) {
              handlePaste();
            }
            break;
          case 'd':
            e.preventDefault();
            setIsCreateFolderOpen(true);
            break;
          case 'u':
            e.preventDefault();
            setIsUploadOpen(true);
            break;
          case '1':
            e.preventDefault();
            setViewMode('grid');
            break;
          case '2':
            e.preventDefault();
            setViewMode('list');
            break;
        }
      } else {
        switch (e.key) {
          case 'Delete':
            if (selectedFile) {
              e.preventDefault();
              handleDelete(selectedFile);
            }
            break;
          case 'Enter':
            if (selectedFile) {
              e.preventDefault();
              if (selectedFile.type === 'folder') {
                setCurrentPath(currentPath ? `${currentPath}/${selectedFile.name}` : selectedFile.name);
              } else {
                handlePreview(selectedFile);
              }
            }
            break;
          case 'Backspace':
            if (!currentPath) return;
            e.preventDefault();
            setCurrentPath(currentPath.split('/').slice(0, -1).join('/'));
            break;
          case 'F2':
            if (selectedFile) {
              e.preventDefault();
              // Might brring rename functionality here
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, clipboard, currentPath]);

  const handlePaste = async () => {
    if (!clipboard) return;

    const { file } = clipboard;
    const destinationPath = currentPath;

    try {
      await handleMoveFile(file, destinationPath);
      setClipboard(null);
    } catch (error) {
      // Error handling without toast
    }
  };

  const handleDelete = async (file) => {
    const timestamp = new Date().toISOString();
    const tags = ["deleted", `deleted_time:${timestamp}`];

    try {
      const res = await fetch(getFileApiUrl('/addTags'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, tags }),
      });

      if (!res.ok) {
        throw new Error("Failed to tag file as deleted");
      }

      console.log(`File ${file.name} marked as deleted`);
      fetchFiles();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

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
      const res = await fetch(getFileApiUrl("/download"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, fileId: file.id }),
      });

      if (!res.ok) throw new Error("Download failed");

      const nonceBase64 = res.headers.get("X-Nonce");
      const fileName = res.headers.get("X-File-Name");
      if (!nonceBase64 || !fileName) throw new Error("Missing nonce or filename");

      const nonce = sodium.from_base64(nonceBase64, sodium.base64_variants.ORIGINAL);

      // Convert to stream reader
      const reader = res.body.getReader();
      const chunks = [];
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        totalLength += value.length;
      }

      // Merge chunks into single Uint8Array
      const encryptedFile = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        encryptedFile.set(chunk, offset);
        offset += chunk.length;
      }

      // Decrypt the file
      const decrypted = sodium.crypto_secretbox_open_easy(encryptedFile, nonce, encryptionKey);
      if (!decrypted) throw new Error("Decryption failed");

      // Download file
      //const decompressed = pako.ungzip(decrypted);
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


  const handleLoadFile = async (file) => {
    const { encryptionKey, userId } = useEncryptionStore.getState();
    if (!encryptionKey) {
      showToast("Missing encryption key","error");
      return null;
    }

    const sodium = await getSodium();

    try {
      const res = await fetch(getFileApiUrl("/download"), {
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

      const nonceBase64 = res.headers.get("X-Nonce");
      const fileName = res.headers.get("X-File-Name");
      if (!nonceBase64 || !fileName) {
        throw new Error("Missing nonce or fileName in response headers");
      }

      const nonce = sodium.from_base64(nonceBase64, sodium.base64_variants.ORIGINAL);

      // Use streaming reader to reduce memory spikes
      const reader = res.body.getReader();
      const chunks = [];
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.length;
      }

      // Merge all chunks into single Uint8Array
      const encryptedFile = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        encryptedFile.set(chunk, offset);
        offset += chunk.length;
      }

      // Decrypt file
      const decrypted = sodium.crypto_secretbox_open_easy(encryptedFile, nonce, encryptionKey);
      if (!decrypted) throw new Error("Decryption failed");

      //const decompressed = pako.ungzip(decrypted);
      return { fileName, decrypted };
    } catch (err) {
      console.error("Load file error:", err);
      return null;
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(getApiUrl('/users/profile'), {
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed to fetch profile');

        setUser(result.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err.message);
      }
    };

    fetchProfile();
  }, []); 
  
const handlePreview = async (rawFile) => {
  // Ensure this only runs on the client side
  if (typeof window === 'undefined') return;

  const username = user?.username;
  const file = {
    ...rawFile,
    type: getFileType(rawFile.fileType || rawFile.type || ""),
    name: rawFile.fileName || rawFile.name,
    size: formatFileSize(rawFile.fileSize || rawFile.size || 0),
  };

  const result = await handleLoadFile(file);
  if (!result) return;

  let contentUrl = null;
  let textFull = null;

  if (file.type === "image") {
    const imgBlob = new Blob([result.decrypted], { type: file.type });
    const imgBitmap = await createImageBitmap(imgBlob);

    const canvas = document.createElement("canvas");
    canvas.width = imgBitmap.width;
    canvas.height = imgBitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgBitmap, 0, 0);

    const fontSize = Math.floor(imgBitmap.width / 20);
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "rgba(255, 0, 0, 1)";
    ctx.textAlign = "center";
    ctx.fillText(username, imgBitmap.width / 2, imgBitmap.height / 2);

    contentUrl = canvas.toDataURL(file.type);
  } 
  
 
  else if (file.type === "pdf") {
    const pdfDoc = await PDFDocument.load(result.decrypted);
    const pages = pdfDoc.getPages();

    pages.forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText(username, {
        x: width / 2 - 50,
        y: height / 2,
        size: 36,
        color: rgb(1, 0, 0), //keep ths rgb or errors
        opacity: 0.4,
        rotate: { type: "degrees", angle: 45 },
      });
    });

    const modifiedPdfBytes = await pdfDoc.save();
    contentUrl = URL.createObjectURL(new Blob([modifiedPdfBytes], { type: "application/pdf" }));
  } 
   else if (file.type === "video" || file.type === "audio") {
    contentUrl = URL.createObjectURL(new Blob([result.decrypted]));
  } 
  
  else if (["txt", "json", "csv"].includes(file.type)) {
    textFull = new TextDecoder().decode(result.decrypted);
  }


  setPreviewContent({ url: contentUrl, text: textFull });
  setPreviewFile(file);
};


  const handleOpenFullView = async (file) => {
    // Ensure this only runs on the client side
    if (typeof window === 'undefined') return;

    const username = user?.username;

    if (file.type === "folder") {
      setPreviewContent({ url: null, text: "This is a folder. Double-click to open." });
      setPreviewFile(file);
      return;
    }

  const result = await handleLoadFile(file);
  if (!result) return;

  let contentUrl = null;
  let textFull = null;

  if (file.type === "image") {
    const imgBlob = new Blob([result.decrypted], { type: file.type });
    const imgBitmap = await createImageBitmap(imgBlob);

    const canvas = document.createElement("canvas");
    canvas.width = imgBitmap.width;
    canvas.height = imgBitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgBitmap, 0, 0);

    const fontSize = Math.floor(imgBitmap.width / 20);
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "rgba(255, 0, 0, 1)";
    ctx.textAlign = "center";
    ctx.fillText(username, imgBitmap.width / 2, imgBitmap.height / 2);

    contentUrl = canvas.toDataURL(file.type);
  } 
  
 
  else if (file.type === "pdf") {
    const pdfDoc = await PDFDocument.load(result.decrypted);
    const pages = pdfDoc.getPages();

    pages.forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText(username, {
        x: width / 2 - 50,
        y: height / 2,
        size: 36,
        color: rgb(1, 0, 0), //keep ths rgb or errors
        opacity: 0.4,
        rotate: { type: "degrees", angle: 45 },
      });
    });
    

    const modifiedPdfBytes = await pdfDoc.save();
    contentUrl = URL.createObjectURL(new Blob([modifiedPdfBytes], { type: "application/pdf" }));
  } 
   else if (file.type === "video" || file.type === "audio") {
    contentUrl = URL.createObjectURL(new Blob([result.decrypted]));
  } 
  
  else if (["txt", "json", "csv"].includes(file.type)) {
    textFull = new TextDecoder().decode(result.decrypted);
  }

    setViewerContent({ url: contentUrl, text: textFull });
    setViewerFile(file);
  };

  const handleUpdateDescription = async (fileId, description) => {
    try {
      const res = await fetch(
        getFileApiUrl("/addDescription"),
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

    const res = await fetch(getFileApiUrl("/updateFilePath"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: file.id, newPath: fullPath }),
    });

    if (res.ok) {
      fetchFiles();
    } else {
      showToast("Failed to move file","error");
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

  const handleChangeShareMode = (file) => {
    setSelectedFile(file);
    setIsChangeMethodOpen(true);
  };

  const openRevokeAccessDialog = (file) => {
    setSelectedFile(file);
    setIsRevokeAccessOpen(true);
  };

  const renderBreadcrumbs = () => {
    const segments = currentPath ? currentPath.split("/") : [];
    const crumbs = [
      { name: "All files", path: "" },
      ...segments.map((seg, i) => ({
        name: seg,
        path: segments.slice(0, i + 1).join("/"),
      })),
    ];

    const currentDirName = segments[segments.length - 1] || "All files";

    const handleDrop = async (e, targetPath) => {
      e.preventDefault();
      const draggedFileId = e.dataTransfer.getData("text/plain");
      if (!draggedFileId) return;

      const allFiles = files;
      const draggedFile = allFiles.find(f => f.id === draggedFileId);
      if (!draggedFile) return;

      await handleMoveFile(draggedFile, targetPath);
    };

    const handleDragOver = (e) => {
      e.preventDefault();
    };

    return (
      <div className="mb-6">
        {/* Breadcrumbs */}
        <nav className="mb-2 text-s text-gray-500 dark:text-gray-400">
          {crumbs.map((crumb, i) => (
            <span key={crumb.path}>
              <button
                onClick={() => setCurrentPath(crumb.path)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, crumb.path)}
                className="hover:underline"
              >
                {crumb.name || "All files"}
              </button>
              {i < crumbs.length - 1 && <span className="mx-1">/</span>}
            </span>
          ))}
        </nav>

        {/* Curr Folder */}
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentDirName}
          </h1>
          <button className="p-1">
            <svg
              className="w-5 h-5 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            ></svg>
          </button>
        </div>
      </div>
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
            <div className="text-xs text-gray-500 mt-1">
              <span className="font-medium">Shortcuts:</span> Ctrl+C/V • Del • Enter • Backspace • Ctrl+D/U • Ctrl+1/2
            </div>
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
            <p className="text-sm text-gray-400">
              Upload or create folders to get started
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <FileGrid
            files={filteredVisibleFiles} // files filtered by currentPath
            onShare={openShareDialog}
            onViewDetails={openDetailsDialog}
            onViewActivity={openActivityDialog}
            onDownload={handleDownload}
            onDelete={fetchFiles}
            onRevokeAccess={() => setIsRevokeAccessOpen(true)}
            onChangeShareMode={() => setIsChangeMethodOpen(true)}
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
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        ) : (
          <FileList
            files={filteredVisibleFiles}
            onShare={openShareDialog}
            onViewDetails={openDetailsDialog}
            onViewActivity={openActivityDialog}
            onDownload={handleDownload}
            onDelete={fetchFiles}
            onRevokeAccess={openRevokeAccessDialog}
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
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        )}

        {/* Dialogs */}
        <RevokeAccessDialog
          open={isRevokeAccessOpen}
          onOpenChange={setIsRevokeAccessOpen}
          file={selectedFile}
        />
        <ChangeShareMethodDialog
          open={isChangeMethodOpen}
          onOpenChange={setIsChangeMethodOpen}
          file={selectedFile}
        />
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
          onFolderCreated={fetchFiles}
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
