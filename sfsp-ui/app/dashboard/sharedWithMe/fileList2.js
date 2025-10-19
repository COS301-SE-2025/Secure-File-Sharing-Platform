"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Settings,
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

function getCookie(name) {
  if (typeof window === "undefined") return "";
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(name + "="))
    ?.split("=")[1];
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
  onRevokeViewAccess,
}) {
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [menuFile, setMenuFile] = useState(null);
  const menuRef = useRef(null);

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

  const getIcon = (file) =>
    iconMap[file.type] || <FileIcon className="h-5 w-5 text-gray-500" />;

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    const menuWidth = 192; // Approximate width of the menu (w-48 = 192px)
    const menuHeight = file.type === "folder" ? 60 : 300; // Approximate height based on menu items
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

    x = Math.max(10, x); // Prevent menu from going too far left
    y = Math.max(10, y); // Prevent menu from going too far up

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
      const res = await fetch(getFileApiUrl("/addTags"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, tags }),
      });

      if (!res.ok) throw new Error("Failed to tag file as deleted");

      try {
        const profileRes = await fetch(getApiUrl("/profile"));
        const profileResult = await profileRes.json();
        if (!profileRes.ok)
          throw new Error(profileResult.message || "Failed to fetch profile");

        await fetch(getFileApiUrl("/addAccesslogs"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_id: file.id,
            user_id: profileResult.data.id,
            action: "deleted",
            message: `User ${profileResult.data.email} deleted the file.`,
          }),
        });
      } catch (err) {
        console.error("Failed to fetch user profile:", err.message);
      }

      onDelete?.(file);
    } catch (err) {
      console.error("Delete failed:", err);
      showToast("Failed to delete file");
    } finally {
      setMenuFile(null);
    }
  };

  const isViewOnly = (file) =>
    file.viewOnly || (file.tags && file.tags.includes("view-only"));

  return (
    <div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <table className="w-full bg-white rounded-lg">
        <thead>
          <tr className="bg-gray-300 dark:bg-gray-700">
            <th className="text-left p-2">Name</th>
            <th className="text-left p-2">Size</th>
            <th className="text-left p-2">Modified</th>
            <th className="text-left p-2">Access</th>
            <th className="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300 dark:divide-gray-300 dark:bg-gray-200 dark:text-gray-900">
          {files.map((file) => (
            <tr
              key={file.id}
              onClick={() => onClick?.(file)}
              onDoubleClick={() => onDoubleClick?.(file)}
              onContextMenu={(e) => handleContextMenu(e, file)}
              className="hover:bg-gray-200 cursor-pointer dark:hover:bg-blue-100"
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
              <td className="p-2">{formatFileSize(file.size)}</td>
              <td className="p-2">{file.modified}</td>
              <td className="p-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${isViewOnly(file)
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-200"
                      : "bg-green-100 text-green-800 dark:bg-green-200"
                    }`}
                >
                  {isViewOnly(file) ? "View Only" : "Full Access"}
                </span>
              </td>
              <td className="p-2 flex gap-2">
                {!isViewOnly(file) ? (
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
                    title="Share disabled for view-only files"
                  >
                    <Share className="h-3 w-3" />
                  </button>
                )}
                {!isViewOnly(file) ? (
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
                    title="Download disabled for view-only files"
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