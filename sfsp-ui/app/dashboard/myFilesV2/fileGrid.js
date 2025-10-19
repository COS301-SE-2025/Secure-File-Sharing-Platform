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
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 pointer-events-none`}
    >
      <div
        className={`bg-red-300 border ${type === "error" ? "border-red-300" : "border-blue-500"
          } text-gray-900 rounded shadow-lg px-6 py-3 pointer-events-auto`}
      >
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 font-bold">
          ×
        </button>
      </div>
    </div>
  );
}

export function FileGrid({
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
    // Folders
    folder: <Folder className="h-8 w-8 text-blue-500" />,

    // Audio Files
    audio: <Music className="h-8 w-8 text-pink-500" />,
    podcast: <Headphones className="h-8 w-8 text-pink-500" />,
    mp3: <Music className="h-8 w-8 text-pink-500" />,
    wav: <Volume2 className="h-8 w-8 text-pink-500" />,
    flac: <Volume2 className="h-8 w-8 text-pink-500" />,
    aac: <Music className="h-8 w-8 text-pink-500" />,
    ogg: <Music className="h-8 w-8 text-pink-500" />,
    wma: <Music className="h-8 w-8 text-pink-500" />,
    m4a: <Music className="h-8 w-8 text-pink-500" />,

    // Video Files
    video: <Video className="h-8 w-8 text-purple-500" />,
    mp4: <Video className="h-8 w-8 text-purple-500" />,
    mov: <Video className="h-8 w-8 text-purple-500" />,
    avi: <Video className="h-8 w-8 text-purple-500" />,
    mkv: <Video className="h-8 w-8 text-purple-500" />,
    webm: <Video className="h-8 w-8 text-purple-500" />,
    flv: <Video className="h-8 w-8 text-purple-500" />,
    wmv: <Video className="h-8 w-8 text-purple-500" />,
    m4v: <Video className="h-8 w-8 text-purple-500" />,
    "3gp": <Video className="h-8 w-8 text-purple-500" />,

    // Image Files
    image: <Image className="h-8 w-8 text-green-500" />,
    png: <Image className="h-8 w-8 text-green-500" />,
    jpg: <Image className="h-8 w-8 text-green-500" />,
    jpeg: <Image className="h-8 w-8 text-green-500" />,
    gif: <Image className="h-8 w-8 text-green-500" />,
    svg: <Image className="h-8 w-8 text-green-500" />,
    webp: <Image className="h-8 w-8 text-green-500" />,
    bmp: <Image className="h-8 w-8 text-green-500" />,
    tiff: <Image className="h-8 w-8 text-green-500" />,
    tif: <Image className="h-8 w-8 text-green-500" />,
    ico: <Image className="h-8 w-8 text-green-500" />,
    heic: <Image className="h-8 w-8 text-green-500" />,
    raw: <Image className="h-8 w-8 text-green-500" />,

    // Document Files
    pdf: <FileText className="h-8 w-8 text-red-500" />,
    doc: <FileText className="h-8 w-8 text-blue-600" />,
    docx: <FileText className="h-8 w-8 text-blue-600" />,
    word: <FileText className="h-8 w-8 text-blue-600" />,
    document: <FileText className="h-8 w-8 text-blue-600" />,
    rtf: <FileText className="h-8 w-8 text-blue-600" />,
    odt: <FileText className="h-8 w-8 text-blue-600" />,

    // Spreadsheet Files
    csv: <FileSpreadsheet className="h-8 w-8 text-green-600" />,
    xls: <FileSpreadsheet className="h-8 w-8 text-green-600" />,
    xlsx: <FileSpreadsheet className="h-8 w-8 text-green-600" />,
    excel: <FileSpreadsheet className="h-8 w-8 text-green-600" />,
    ods: <FileSpreadsheet className="h-8 w-8 text-green-600" />,

    // Presentation Files
    ppt: <Monitor className="h-8 w-8 text-orange-500" />,
    pptx: <Monitor className="h-8 w-8 text-orange-500" />,
    odp: <Monitor className="h-8 w-8 text-orange-500" />,
    key: <Monitor className="h-8 w-8 text-orange-500" />,

    // Text Files
    txt: <FileText className="h-8 w-8 text-gray-400" />,
    log: <FileText className="h-8 w-8 text-gray-400" />,
    readme: <Book className="h-8 w-8 text-blue-400" />,

    // Markdown Files
    md: <FileCode className="h-8 w-8 text-cyan-600" />,
    markdown: <FileCode className="h-8 w-8 text-cyan-600" />,

    // Web Files
    html: <Globe className="h-8 w-8 text-orange-400" />,
    htm: <Globe className="h-8 w-8 text-orange-400" />,
    css: <Palette className="h-8 w-8 text-blue-500" />,
    scss: <Palette className="h-8 w-8 text-pink-400" />,
    sass: <Palette className="h-8 w-8 text-pink-400" />,
    less: <Palette className="h-8 w-8 text-blue-400" />,

    // JavaScript Files
    js: <FileCode className="h-8 w-8 text-yellow-400" />,
    jsx: <FileCode className="h-8 w-8 text-yellow-400" />,
    ts: <FileCode className="h-8 w-8 text-blue-400" />,
    tsx: <FileCode className="h-8 w-8 text-blue-400" />,
    mjs: <FileCode className="h-8 w-8 text-yellow-400" />,

    // Programming Languages
    code: <Code className="h-8 w-8 text-gray-600" />,
    py: <FileCode className="h-8 w-8 text-green-400" />,
    java: <FileCode className="h-8 w-8 text-red-400" />,
    cpp: <FileCode className="h-8 w-8 text-blue-500" />,
    c: <FileCode className="h-8 w-8 text-blue-500" />,
    h: <FileCode className="h-8 w-8 text-blue-500" />,
    cs: <FileCode className="h-8 w-8 text-purple-500" />,
    php: <FileCode className="h-8 w-8 text-purple-400" />,
    rb: <FileCode className="h-8 w-8 text-red-500" />,
    go: <FileCode className="h-8 w-8 text-cyan-500" />,
    rs: <FileCode className="h-8 w-8 text-orange-600" />,
    swift: <FileCode className="h-8 w-8 text-orange-500" />,
    kt: <FileCode className="h-8 w-8 text-purple-600" />,
    scala: <FileCode className="h-8 w-8 text-red-600" />,
    r: <FileCode className="h-8 w-8 text-blue-600" />,
    matlab: <FileCode className="h-8 w-8 text-orange-500" />,
    pl: <FileCode className="h-8 w-8 text-blue-500" />,
    lua: <FileCode className="h-8 w-8 text-blue-400" />,

    // Data Files
    json: <FileCode className="h-8 w-8 text-lime-500" />,
    xml: <FileCode className="h-8 w-8 text-orange-500" />,
    yaml: <FileCode className="h-8 w-8 text-red-400" />,
    yml: <FileCode className="h-8 w-8 text-red-400" />,
    toml: <FileCode className="h-8 w-8 text-gray-500" />,
    ini: <Settings className="h-8 w-8 text-gray-500" />,
    cfg: <Settings className="h-8 w-8 text-gray-500" />,
    conf: <Settings className="h-8 w-8 text-gray-500" />,

    // Database Files
    sql: <Database className="h-8 w-8 text-blue-500" />,
    db: <Database className="h-8 w-8 text-gray-600" />,
    sqlite: <Database className="h-8 w-8 text-blue-400" />,
    mdb: <Database className="h-8 w-8 text-blue-600" />,

    // Archive Files
    archive: <Archive className="h-8 w-8 text-yellow-500" />,
    zip: <Archive className="h-8 w-8 text-yellow-500" />,
    rar: <Archive className="h-8 w-8 text-yellow-500" />,
    "7z": <Archive className="h-8 w-8 text-yellow-500" />,
    tar: <Archive className="h-8 w-8 text-yellow-600" />,
    gz: <Archive className="h-8 w-8 text-yellow-600" />,
    bz2: <Archive className="h-8 w-8 text-yellow-600" />,
    xz: <Archive className="h-8 w-8 text-yellow-600" />,

    // System Files
    exe: <Zap className="h-8 w-8 text-red-500" />,
    msi: <Download className="h-8 w-8 text-blue-500" />,
    deb: <Download className="h-8 w-8 text-orange-500" />,
    rpm: <Download className="h-8 w-8 text-red-500" />,
    dmg: <HardDrive className="h-8 w-8 text-gray-500" />,
    iso: <HardDrive className="h-8 w-8 text-orange-500" />,
    img: <HardDrive className="h-8 w-8 text-gray-500" />,

    // Font Files
    ttf: <FileText className="h-8 w-8 text-gray-600" />,
    otf: <FileText className="h-8 w-8 text-gray-600" />,
    woff: <FileText className="h-8 w-8 text-gray-600" />,
    woff2: <FileText className="h-8 w-8 text-gray-600" />,

    // Security/Certificate Files
    key: <Key className="h-8 w-8 text-yellow-600" />,
    pem: <Shield className="h-8 w-8 text-green-600" />,
    crt: <Shield className="h-8 w-8 text-green-600" />,
    cert: <Shield className="h-8 w-8 text-green-600" />,

    // Email Files
    eml: <Mail className="h-8 w-8 text-blue-500" />,
    msg: <Mail className="h-8 w-8 text-blue-500" />,

    // Calendar Files
    ics: <Calendar className="h-8 w-8 text-blue-500" />,

    // Adobe Files
    psd: <Palette className="h-8 w-8 text-blue-600" />,
    ai: <Palette className="h-8 w-8 text-orange-600" />,
    eps: <Palette className="h-8 w-8 text-red-600" />,
    indd: <FileText className="h-8 w-8 text-purple-600" />,

    // CAD Files
    dwg: <FileText className="h-8 w-8 text-red-600" />,
    dxf: <FileText className="h-8 w-8 text-blue-600" />,

    // 3D Model Files
    obj: <FileText className="h-8 w-8 text-gray-600" />,
    fbx: <FileText className="h-8 w-8 text-gray-600" />,
    blend: <FileText className="h-8 w-8 text-orange-500" />,

    // Generic Fallbacks
    application: <FileText className="h-8 w-8 text-gray-500" />,
    unknown: <FileX className="h-8 w-8 text-gray-300" />,
    file: <FileText className="h-8 w-8 text-gray-400" />,
  };

  const getIcon = (file) => {
    if (file.type === "folder") {
      return <Folder className="h-8 w-8 text-blue-500" />;
    }
    return iconMap[file.type] || <FileIcon className="h-8 w-8 text-gray-500" />;
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

    const menuWidth = 192;
    const menuHeight = file.type === "folder" ? 60 : 300;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = e.pageX;
    let y = e.pageY;

    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }

    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }

    x = Math.max(10, x);
    y = Math.max(10, y);

    setMenuPosition({ x, y });
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

  const handleDelete = async (file) => {
    const timestamp = new Date().toISOString();
    const tags = ["deleted", `deleted_time:${timestamp}`];

    try {

      if (file.type === "folder") {
        const res = await fetch(getFileApiUrl("/deleteFolder"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folderId: file.id,
            parentPath: file.path || "" || file.cid,
            recursive: true,
            tags,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to delete folder and its contents");
        }

        console.log(`Folder ${file.name} and its contents deleted`);
        onEnterFolder?.("");
      } else {
        const res = await fetch(getFileApiUrl("/addTags"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: file.id, tags }),
        });

        if (!res.ok) {
          throw new Error("Failed to tag file as deleted");
        }

        console.log(`File ${file.name} marked as deleted`);
      }

      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const profileRes = await fetch(getApiUrl("/users/profile"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        const profileResult = await profileRes.json();
        if (!profileRes.ok)
          throw new Error(profileResult.message || "Failed to fetch profile");

        await fetch(getFileApiUrl("/addAccesslog"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_id: file.id,
            user_id: profileResult.data.id,
            action: "deleted",
            message: `User ${profileResult.data.email} deleted the ${file.type === "folder" ? "folder and its contents" : "file"
              }.`,
          }),
        });
      } catch (err) {
        console.error(
          "Failed to fetch user profile or log action:",
          err.message
        );
      }

      if (onDelete) {
        onDelete(file);
      }
    } catch (err) {
      console.error("Delete failed:", err);
      showToast(
        `Failed to delete ${file.type === "folder" ? "folder" : "file"}`
      );
    } finally {
      setMenuFile(null);
    }
  };

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

  const handleFileClick = (e, file) => {
    e.stopPropagation();

    onSelectFile(file);

    if (file.type !== "folder") {
      onClick?.(file);
    }
  };

  const handleFileDoubleClick = (e, file) => {
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, file)}
            onDragOver={(e) => handleDragOver(e, file)}
            onDrop={(e) => handleDrop(e, file)}
            onClick={(e) => handleFileClick(e, file)}
            onDoubleClick={(e) => handleFileDoubleClick(e, file)}
            onContextMenu={(e) => handleContextMenu(e, file)}
            className={`
              relative group bg-white rounded-lg border border-gray-300 p-4 
              hover:shadow-lg transition-all cursor-pointer 
              dark:bg-gray-200 dark:hover:bg-blue-100
              ${selectedFile?.id === file.id
                ? "shadow-[0_0_15px_rgba(59,130,246,0.5)] dark:shadow-[0_0_15px_rgba(96,165,250,0.6)]"
                : ""
              }
            `}
          >
            {/* FOLDER DESIGN */}
            {file.type === "folder" ? (
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="relative">
                  <Folder className="h-20 w-20 text-blue-500" />
                </div>
                <h3
                  className="text-base font-bold text-gray-900 truncate"
                  title={file.name}
                >
                  {file.name}
                </h3>
              </div>
            ) : (
              // FILE DESIGN
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="relative">
                    {getIcon(file)}
                    {/* View-only indicator */}
                    {isViewOnly(file) && (
                      <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1">
                        <Eye className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {file.starred && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                    {file.shared && (
                      <span className="px-1 py-0.5 text-xs bg-gray-200 rounded">
                        Shared
                      </span>
                    )}
                  </div>
                </div>
                <h3
                  className="font-medium text-gray-900 text-sm mb-1 truncate"
                  title={file.name}
                >
                  {file.name}
                </h3>

                <div className="mb-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${isViewOnly(file)
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-200"
                        : "bg-green-100 text-green-800 dark:bg-green-200"
                      }`}
                  >
                    {isViewOnly(file) ? "View Only" : "Full Access"}
                  </span>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>{formatFileSize(file.size)}</p>
                  <p>Modified {file.modified}</p>
                </div>

                {/* Quick Actions on Hover */}
                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isViewOnly(file) && (
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
                  )}
                  
                  {!isViewOnly(file) && (
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
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

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
                className={`w-full text-left px-4 py-2 flex items-center gap-2 ${isViewOnly(menuFile)
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
                className={`w-full text-left px-4 py-2 flex items-center gap-2 ${isViewOnly(menuFile)
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
            onClick={() => handleDelete(menuFile)}
            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 dark:hover:bg-red-200 dark:text-red-600"
          >
            <X className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}