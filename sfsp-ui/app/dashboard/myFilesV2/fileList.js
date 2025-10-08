"use client";

import React, { useState, useEffect, useRef } from "react";
import { Settings, UserMinus } from "lucide-react";
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";
import {
  Folder,
  FileText,
  Video,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio,
  Archive,
  Database,
  Globe,
  Code,
  Palette,
  Book,
  FileX,
  HardDrive,
  Key,
  Shield,
  Zap,
  Monitor,
  Printer,
  Calendar,
  Mail,
  Download,
  FileIcon,
  Share,
  Image,
  Star,
  MoreVertical,
  FileCode,
  Music,
  Volume2,
  Headphones,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

function Toast({ message, type = "info", onClose }) {
  return (
    <div className="fixed top-4 right-4 max-w-xs px-4 py-3 rounded-lg shadow-lg z-50 animate-slide-in text-white pointer-events-auto">
      <div
        className={`flex items-center gap-2 ${
          type === "error" ? "bg-red-500" : "bg-blue-500"
        }`}
      >
        <span>{message}</span>
        <button onClick={onClose} className="font-bold">
          ×
        </button>
      </div>
    </div>
  );
}

export function FileList({
  files,
  onShare,
  onViewDetails,
  onViewActivity,
  onDownload,
  onDelete,
  onClick,
  onDoubleClick,
  onMoveFile,
  onEnterFolder,
  onGoBack,
  currentPath,
  onRevokeAccess,
  onChangeShareMode,
  selectedFile,
  onSelectFile,
}) {
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [menuFile, setMenuFile] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState(null);
  const menuRef = useRef(null);
  const [draggedFile, setDraggedFile] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  function formatFileSize(size) {
    if (size < 1024) return `${size} B`;
    else if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    else if (size < 1024 * 1024 * 1024)
      return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    else return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  const iconMap = {
    folder: <Folder className="h-5 w-5 text-blue-500" />,
    audio: <Music className="h-5 w-5 text-pink-500" />,
    podcast: <Headphones className="h-5 w-5 text-pink-500" />,
    mp3: <Music className="h-5 w-5 text-pink-500" />,
    wav: <Volume2 className="h-5 w-5 text-pink-500" />,
    flac: <Volume2 className="h-5 w-5 text-pink-500" />,
    aac: <Music className="h-5 w-5 text-pink-500" />,
    ogg: <Music className="h-5 w-5 text-pink-500" />,
    wma: <Music className="h-5 w-5 text-pink-500" />,
    m4a: <Music className="h-5 w-5 text-pink-500" />,
    video: <Video className="h-5 w-5 text-purple-500" />,
    mp4: <Video className="h-5 w-5 text-purple-500" />,
    mov: <Video className="h-5 w-5 text-purple-500" />,
    avi: <Video className="h-5 w-5 text-purple-500" />,
    mkv: <Video className="h-5 w-5 text-purple-500" />,
    webm: <Video className="h-5 w-5 text-purple-500" />,
    flv: <Video className="h-5 w-5 text-purple-500" />,
    wmv: <Video className="h-5 w-5 text-purple-500" />,
    m4v: <Video className="h-5 w-5 text-purple-500" />,
    "3gp": <Video className="h-5 w-5 text-purple-500" />,
    image: <Image className="h-5 w-5 text-green-500" />,
    png: <Image className="h-5 w-5 text-green-500" />,
    jpg: <Image className="h-5 w-5 text-green-500" />,
    jpeg: <Image className="h-5 w-5 text-green-500" />,
    gif: <Image className="h-5 w-5 text-green-500" />,
    svg: <Image className="h-5 w-5 text-green-500" />,
    webp: <Image className="h-5 w-5 text-green-500" />,
    bmp: <Image className="h-5 w-5 text-green-500" />,
    tiff: <Image className="h-5 w-5 text-green-500" />,
    tif: <Image className="h-5 w-5 text-green-500" />,
    ico: <Image className="h-5 w-5 text-green-500" />,
    heic: <Image className="h-5 w-5 text-green-500" />,
    raw: <Image className="h-5 w-5 text-green-500" />,
    pdf: <FileText className="h-5 w-5 text-red-500" />,
    doc: <FileText className="h-5 w-5 text-blue-600" />,
    docx: <FileText className="h-5 w-5 text-blue-600" />,
    word: <FileText className="h-5 w-5 text-blue-600" />,
    document: <FileText className="h-5 w-5 text-blue-600" />,
    rtf: <FileText className="h-5 w-5 text-blue-600" />,
    odt: <FileText className="h-5 w-5 text-blue-600" />,
    csv: <FileSpreadsheet className="h-5 w-5 text-green-600" />,
    xls: <FileSpreadsheet className="h-5 w-5 text-green-600" />,
    xlsx: <FileSpreadsheet className="h-5 w-5 text-green-600" />,
    excel: <FileSpreadsheet className="h-5 w-5 text-green-600" />,
    ods: <FileSpreadsheet className="h-5 w-5 text-green-600" />,
    ppt: <Monitor className="h-5 w-5 text-orange-500" />,
    pptx: <Monitor className="h-5 w-5 text-orange-500" />,
    odp: <Monitor className="h-5 w-5 text-orange-500" />,
    key: <Monitor className="h-5 w-5 text-orange-500" />,
    txt: <FileText className="h-5 w-5 text-gray-400" />,
    log: <FileText className="h-5 w-5 text-gray-400" />,
    readme: <Book className="h-5 w-5 text-blue-400" />,
    md: <FileCode className="h-5 w-5 text-cyan-600" />,
    markdown: <FileCode className="h-5 w-5 text-cyan-600" />,
    html: <Globe className="h-5 w-5 text-orange-400" />,
    htm: <Globe className="h-5 w-5 text-orange-400" />,
    css: <Palette className="h-5 w-5 text-blue-500" />,
    scss: <Palette className="h-5 w-5 text-pink-400" />,
    sass: <Palette className="h-5 w-5 text-pink-400" />,
    less: <Palette className="h-5 w-5 text-blue-400" />,
    js: <FileCode className="h-5 w-5 text-yellow-400" />,
    jsx: <FileCode className="h-5 w-5 text-yellow-400" />,
    ts: <FileCode className="h-5 w-5 text-blue-400" />,
    tsx: <FileCode className="h-5 w-5 text-blue-400" />,
    mjs: <FileCode className="h-5 w-5 text-yellow-400" />,
    code: <Code className="h-5 w-5 text-gray-600" />,
    py: <FileCode className="h-5 w-5 text-green-400" />,
    java: <FileCode className="h-5 w-5 text-red-400" />,
    cpp: <FileCode className="h-5 w-5 text-blue-500" />,
    c: <FileCode className="h-5 w-5 text-blue-500" />,
    h: <FileCode className="h-5 w-5 text-blue-500" />,
    cs: <FileCode className="h-5 w-5 text-purple-500" />,
    php: <FileCode className="h-5 w-5 text-purple-400" />,
    rb: <FileCode className="h-5 w-5 text-red-500" />,
    go: <FileCode className="h-5 w-5 text-cyan-500" />,
    rs: <FileCode className="h-5 w-5 text-orange-600" />,
    swift: <FileCode className="h-5 w-5 text-orange-500" />,
    kt: <FileCode className="h-5 w-5 text-purple-600" />,
    scala: <FileCode className="h-5 w-5 text-red-600" />,
    r: <FileCode className="h-5 w-5 text-blue-600" />,
    matlab: <FileCode className="h-5 w-5 text-orange-500" />,
    pl: <FileCode className="h-5 w-5 text-blue-500" />,
    lua: <FileCode className="h-5 w-5 text-blue-400" />,
    json: <FileCode className="h-5 w-5 text-lime-500" />,
    xml: <FileCode className="h-5 w-5 text-orange-500" />,
    yaml: <FileCode className="h-5 w-5 text-red-400" />,
    yml: <FileCode className="h-5 w-5 text-red-400" />,
    toml: <FileCode className="h-5 w-5 text-gray-500" />,
    ini: <Settings className="h-5 w-5 text-gray-500" />,
    cfg: <Settings className="h-5 w-5 text-gray-500" />,
    conf: <Settings className="h-5 w-5 text-gray-500" />,
    sql: <Database className="h-5 w-5 text-blue-500" />,
    db: <Database className="h-5 w-5 text-gray-600" />,
    sqlite: <Database className="h-5 w-5 text-blue-400" />,
    mdb: <Database className="h-5 w-5 text-blue-600" />,
    archive: <Archive className="h-5 w-5 text-yellow-500" />,
    zip: <Archive className="h-5 w-5 text-yellow-500" />,
    rar: <Archive className="h-5 w-5 text-yellow-500" />,
    "7z": <Archive className="h-5 w-5 text-yellow-500" />,
    tar: <Archive className="h-5 w-5 text-yellow-600" />,
    gz: <Archive className="h-5 w-5 text-yellow-600" />,
    bz2: <Archive className="h-5 w-5 text-yellow-600" />,
    xz: <Archive className="h-5 w-5 text-yellow-600" />,
    exe: <Zap className="h-5 w-5 text-red-500" />,
    msi: <Download className="h-5 w-5 text-blue-500" />,
    deb: <Download className="h-5 w-5 text-orange-500" />,
    rpm: <Download className="h-5 w-5 text-red-500" />,
    dmg: <HardDrive className="h-5 w-5 text-gray-500" />,
    iso: <HardDrive className="h-5 w-5 text-orange-500" />,
    img: <HardDrive className="h-5 w-5 text-gray-500" />,
    ttf: <FileText className="h-5 w-5 text-gray-600" />,
    otf: <FileText className="h-5 w-5 text-gray-600" />,
    woff: <FileText className="h-5 w-5 text-gray-600" />,
    woff2: <FileText className="h-5 w-5 text-gray-600" />,
    key: <Key className="h-5 w-5 text-yellow-600" />,
    pem: <Shield className="h-5 w-5 text-green-600" />,
    crt: <Shield className="h-5 w-5 text-green-600" />,
    cert: <Shield className="h-5 w-5 text-green-600" />,
    eml: <Mail className="h-5 w-5 text-blue-500" />,
    msg: <Mail className="h-5 w-5 text-blue-500" />,
    ics: <Calendar className="h-5 w-5 text-blue-500" />,
    psd: <Palette className="h-5 w-5 text-blue-600" />,
    ai: <Palette className="h-5 w-5 text-orange-600" />,
    eps: <Palette className="h-5 w-5 text-red-600" />,
    indd: <FileText className="h-5 w-5 text-purple-600" />,
    dwg: <FileText className="h-5 w-5 text-red-600" />,
    dxf: <FileText className="h-5 w-5 text-blue-600" />,
    obj: <FileText className="h-5 w-5 text-gray-600" />,
    fbx: <FileText className="h-5 w-5 text-gray-600" />,
    blend: <FileText className="h-5 w-5 text-orange-500" />,
    application: <FileText className="h-5 w-5 text-gray-500" />,
    unknown: <FileX className="h-5 w-5 text-gray-300" />,
    file: <FileText className="h-5 w-5 text-gray-400" />,
  };

  const getIcon = (file) => {
    if (file.type === "folder") {
      return <Folder className="h-5 w-5 text-blue-500" />;
    }
    return iconMap[file.type] || <FileIcon className="h-5 w-5 text-gray-500" />;
  };

  const isViewOnly = (file) => {
    if (file.viewOnly) return true;
    if (file.fileTags) {
      if (Array.isArray(file.fileTags)) {
        return file.fileTags.includes("view-only");
      } else if (typeof file.fileTags === "string") {
        return file.fileTags.includes("view-only");
      }
    }
    if (file.tags) {
      if (Array.isArray(file.tags)) {
        return file.tags.includes("view-only");
      } else if (typeof file.tags === "string") {
        return file.tags.includes("view-only");
      }
    }
    return false;
  };

  const isOwner = (file) => {
    if (!file.tags) return true;
    if (Array.isArray(file.tags)) {
      return !file.tags.includes("received");
    } else if (typeof file.tags === "string") {
      return !file.tags.includes("received");
    }
    return true;
  };

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    setMenuPosition({ x: e.pageX, y: e.pageY });
    setMenuFile(file);
  };

  const handleClickOutside = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setMenuFile(null);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleDelete = async (file, moveFiles = false) => {
    const timestamp = new Date().toISOString();
    const tags = ["deleted", `deleted_time:${timestamp}`];
    const token = localStorage.getItem("token");
    if (!token) {
      showToast("No authentication token found", "error");
      return;
    }

    try {
      // Get user profile
      const profileRes = await fetch(getApiUrl("/users/profile"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileResult = await profileRes.json();
      if (!profileRes.ok) {
        throw new Error(profileResult.message || "Failed to fetch profile");
      }
      const userEmail = profileResult.data.email;
      const userId = profileResult.data.id;

      if (file.type === "folder") {
        // Build the correct folder path
        const folderPath = currentPath
          ? `${currentPath}/${file.name}`
          : file.name;

        // Fetch files in the folder
        const res = await fetch(getFileApiUrl("/metadata"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            path: folderPath,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to fetch folder contents");
        }

        const folderFiles = await res.json();

        if (moveFiles) {
          // OPTION 1: Move files to parent folder and delete only the folder
          let movedCount = 0;

          for (const folderFile of folderFiles) {
            // Skip the folder itself and any subfolders (only move files)
            if (folderFile.type === "folder" || folderFile.fileId === file.id) {
              continue;
            }

            // Calculate the new path - remove the folder name from the path
            let newPath = currentPath || "";

            // If the file has a path that includes our folder, reconstruct it
            if (folderFile.path && folderFile.path.startsWith(folderPath)) {
              // This handles files in subdirectories of the folder being deleted
              const remainingPath = folderFile.path.slice(
                folderPath.length + 1
              );
              newPath = currentPath
                ? `${currentPath}/${remainingPath}`
                : remainingPath;
            }

            console.log(
              `Moving file ${folderFile.name} from ${folderFile.path} to ${newPath}`
            );

            const updateRes = await fetch(getFileApiUrl("/updatePath"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileId: folderFile.fileId,
                newPath: newPath,
              }),
            });

            if (updateRes.ok) {
              movedCount++;
              await fetch(getFileApiUrl("/addAccesslog"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  file_id: folderFile.fileId,
                  user_id: userId,
                  action: "moved",
                  message: `User ${userEmail} moved the file from folder ${file.name} to parent folder.`,
                }),
              });
            } else {
              console.warn(`Failed to move file ${folderFile.fileName}`);
            }
          }

          showToast(
            `${movedCount} files moved to parent folder and folder "${file.name}" deleted`,
            "info"
          );
        } else {
          // OPTION 2: Delete folder and all contents
          let deletedCount = 0;

          // Delete all files in the folder first
          for (const folderFile of folderFiles) {
            // Skip the folder itself (we'll handle it separately)
            if (folderFile.fileId === file.id) continue;

            const deleteRes = await fetch(getFileApiUrl("/addTags"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileId: folderFile.fileId,
                tags: ["deleted", `deleted_time:${timestamp}`],
              }),
            });

            if (deleteRes.ok) {
              deletedCount++;
              await fetch(getFileApiUrl("/addAccesslog"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  file_id: folderFile.fileId,
                  user_id: userId,
                  action: "deleted",
                  message: `User ${userEmail} deleted the ${folderFile.type} as part of folder ${file.name} deletion.`,
                }),
              });
            }
          }

          showToast(
            `Folder "${file.name}" and ${deletedCount} items deleted`,
            "info"
          );
        }
      } else {
        // Regular file deletion
        const res = await fetch(getFileApiUrl("/addTags"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: file.id, tags }),
        });

        if (!res.ok) {
          throw new Error("Failed to tag file as deleted");
        }

        await fetch(getFileApiUrl("/addAccesslog"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_id: file.id,
            user_id: userId,
            action: "deleted",
            message: `User ${userEmail} deleted the file.`,
          }),
        });

        showToast(`File "${file.name}" deleted successfully`, "info");
      }

      // Delete the folder/file itself
      const deleteRes = await fetch(getFileApiUrl("/addTags"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, tags }),
      });

      if (!deleteRes.ok) {
        throw new Error("Failed to tag file as deleted");
      }

      // Final access log for the folder/file itself
      await fetch(getFileApiUrl("/addAccesslog"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: file.id,
          user_id: userId,
          action: "deleted",
          message: `User ${userEmail} deleted the ${
            file.type === "folder" ? "folder" : "file"
          }.`,
        }),
      });

      if (onDelete) {
        onDelete(file);
      }
    } catch (err) {
      console.error("Delete failed:", err);
      showToast(
        `Failed to delete ${file.type === "folder" ? "folder" : "file"}: ${
          err.message
        }`,
        "error"
      );
    } finally {
      setMenuFile(null);
      setShowConfirmDelete(false);
      setConfirmDeleteFile(null);
    }
  };

  // Helper function to recursively delete folder contents
  const deleteFolderContents = async (userId, folderPath, userEmail) => {
    try {
      // Fetch all files in the folder (including subfolders)
      const res = await fetch(getFileApiUrl("/metadata"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          path: folderPath,
          includeSubfolders: true,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch folder contents");
      }

      const folderContents = await res.json();
      const timestamp = new Date().toISOString();
      const tags = ["deleted", `deleted_time:${timestamp}`];

      // Delete all files and subfolders
      for (const item of folderContents) {
        // Skip the folder itself (we'll handle that separately)
        if (
          item.path === folderPath &&
          item.name === folderPath.split("/").pop()
        ) {
          continue;
        }

        // If it's a subfolder, recursively delete its contents
        if (item.type === "folder") {
          const subFolderPath = item.path
            ? `${item.path}/${item.name}`
            : item.name;
          await deleteFolderContents(userId, subFolderPath, userEmail);
        }

        // Mark the item as deleted
        const deleteRes = await fetch(getFileApiUrl("/addTags"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: item.fileId, tags }),
        });

        if (deleteRes.ok) {
          await fetch(getFileApiUrl("/addAccesslog"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file_id: item.fileId,
              user_id: userId,
              action: "deleted",
              message: `User ${userEmail} deleted the ${item.type} as part of folder deletion.`,
            }),
          });
        }
      }
    } catch (error) {
      console.error(`Error deleting contents of ${folderPath}:`, error);
      throw error;
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleDragStart = (e, file) => {
    setDraggedFile(file);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(file));
  };

  const handleDragOver = (e, folder) => {
    if (
      draggedFile &&
      folder.type === "folder" &&
      draggedFile.id !== folder.id
    ) {
      e.preventDefault();
    }
  };

  const handleDrop = (e, folder) => {
    e.preventDefault();
    if (
      draggedFile &&
      folder.type === "folder" &&
      draggedFile.id !== folder.id
    ) {
      const newPath = folder.cid || folder.path || folder.name;
      onMoveFile?.(draggedFile, newPath);
      setDraggedFile(null);
    }
  };

  const handleRowClick = (e, file) => {
    if (e.target.closest("button")) {
      return;
    }
    e.stopPropagation();
    if (file.type !== "folder") {
      onClick?.(file);
    }
    onSelectFile(file);
    if (onClick) {
      onClick(file);
    }
  };

  const handleRowDoubleClick = (e, file) => {
    if (e.target.closest("button")) {
      return;
    }
    e.stopPropagation();
    if (file.type === "folder" || file.isFolder) {
      onEnterFolder(file.name);
    } else if (onDoubleClick) {
      onDoubleClick(file);
    }
  };

  return (
    <div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {showConfirmDelete && confirmDeleteFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Delete Folder "{confirmDeleteFile.name}"
              </h2>
              <button
                onClick={() => {
                  setShowConfirmDelete(false);
                  setConfirmDeleteFile(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-200 mb-6">
              How would you like to delete this folder?
            </p>
            <div className="space-y-3 mb-6">
              <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Move Files & Delete Folder Only
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  All files inside will be moved to the current folder, then the
                  empty folder will be deleted.
                </p>
              </div>
              <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Delete Folder & All Contents
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  The folder and all files and subfolders inside will be
                  permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmDelete(false);
                  setConfirmDeleteFile(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteFile, true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Move Files & Delete Folder
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteFile, false)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                Delete Folder & Files
              </button>
            </div>
          </div>
        </div>
      )}
      <table className="w-full bg-white rounded-lg">
        <thead>
          <tr className="bg-gray-300 dark:bg-gray-700">
            <th className="text-left p-2">Name</th>
            <th className="text-left p-2">Size</th>
            <th className="text-left p-2">Modified</th>
            <th className="text-left p-2">Type</th>
            <th className="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300 dark:divide-gray-300 dark:bg-gray-200 dark:text-gray-900">
          {files.map((file) => (
            <tr
              key={file.id}
              draggable={file.type !== "folder"}
              onDragStart={(e) => handleDragStart(e, file)}
              onDragOver={(e) => handleDragOver(e, file)}
              onDrop={(e) => handleDrop(e, file)}
              onClick={(e) => handleRowClick(e, file)}
              onDoubleClick={(e) => handleRowDoubleClick(e, file)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuPosition({ x: e.pageX, y: e.pageY });
                if (file.type === "folder") {
                  setConfirmDeleteFile(file);
                  setShowConfirmDelete(true);
                } else {
                  setMenuFile(file);
                }
              }}
              className={`
                hover:bg-gray-200 cursor-pointer dark:hover:bg-blue-100
                ${
                  selectedFile?.id === file.id
                    ? "bg-blue-100 dark:bg-blue-200 ring-2 ring-blue-500"
                    : ""
                }`}
            >
              <td className="p-2 flex items-center gap-2">
                {getIcon(file)}
                <span className="font-medium">{file.name}</span>
                {file.starred && (
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                )}
                {isViewOnly(file) && (
                  <Eye className="h-4 w-4 text-blue-500" title="View Only" />
                )}
              </td>
              <td className="p-2">
                {file.type === "folder" ? "" : formatFileSize(file.size)}
              </td>
              <td className="p-2">{file.modified}</td>
              <td className="p-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    isViewOnly(file)
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-200"
                      : "bg-green-100 text-green-800 dark:bg-green-200"
                  }`}
                >
                  {isViewOnly(file) ? "View Only" : "Full Access"}
                </span>
              </td>
              <td className="p-2 flex gap-2">
                {file.type !== "folder" && !isViewOnly(file) ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare(file);
                    }}
                    className="p-1 hover:bg-gray-100 rounded dark:text-black"
                    title="Share"
                  >
                    <Share className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 opacity-50 cursor-not-allowed rounded dark:text-black"
                    title="Share disabled for folders or view-only files"
                  >
                    <Share className="h-3 w-3" />
                  </button>
                )}
                {file.type !== "folder" && !isViewOnly(file) ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(file);
                    }}
                    className="p-1 hover:bg-gray-100 rounded dark:text-black"
                    title="Download"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 opacity-50 cursor-not-allowed rounded dark:text-black"
                    title="Download disabled for folders or view-only files"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Context Menu */}
      {menuFile && (
        <div
          ref={menuRef}
          className="absolute z-50 bg-white border rounded-md shadow-lg w-48 text-sm dark:bg-gray-200 dark:text-gray-900"
          style={{ top: menuPosition.y, left: menuPosition.x }}
        >
          {menuFile?.type !== "folder" && (
            <>
              <button
                onClick={() => {
                  if (!isViewOnly(menuFile)) onShare(menuFile);
                  setMenuFile(null);
                }}
                className={`w-full text-left px-4 py-2 flex items-center gap-2 ${
                  isViewOnly(menuFile)
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-100 dark:hover:bg-blue-200"
                }`}
                disabled={isViewOnly(menuFile)}
              >
                <Share className="h-4 w-4" /> Share
              </button>

              <button
                onClick={() => {
                  if (!isViewOnly(menuFile)) {
                    onDownload(menuFile);
                  }
                  setMenuFile(null);
                }}
                className={`w-full text-left px-4 py-2 flex items-center gap-2 ${
                  isViewOnly(menuFile)
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-100 dark:hover:bg-blue-200"
                }`}
                disabled={isViewOnly(menuFile)}
              >
                <Download className="h-4 w-4" /> Download
              </button>

              <hr className="my-1" />

              <button
                onClick={() => {
                  onClick?.(menuFile);
                  setMenuFile(null);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 dark:hover:bg-blue-200"
              >
                <Eye className="h-4 w-4" /> Preview
              </button>

              <button
                onClick={() => {
                  onViewDetails(menuFile);
                  setMenuFile(null);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 dark:hover:bg-blue-200"
              >
                <FileIcon className="h-4 w-4" /> View Details
              </button>

              <button
                onClick={() => {
                  onViewActivity(menuFile);
                  setMenuFile(null);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 dark:hover:bg-blue-200"
              >
                <MoreVertical className="h-4 w-4" /> Activity Logs
              </button>

              <hr className="my-1" />

              {isOwner(menuFile) && (
                <button
                  onClick={() => {
                    onRevokeAccess(menuFile);
                    setMenuFile(null);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 dark:hover:bg-blue-200"
                >
                  <UserMinus className="h-4 w-4" /> Manage Access
                </button>
              )}
            </>
          )}

          <button
            onClick={() => {
              if (menuFile?.type === "folder") {
                setConfirmDeleteFile(menuFile);
                setShowConfirmDelete(true);
              } else {
                handleDelete(menuFile);
              }
            }}
            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 dark:hover:bg-red-200 dark:text-red-600"
          >
            <X className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
