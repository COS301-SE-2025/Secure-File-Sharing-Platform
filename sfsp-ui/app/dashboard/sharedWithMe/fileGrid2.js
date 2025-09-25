// app/dashboard/sharedWithMe/fileGrid.js

"use client";

import React, { useState, useEffect, useRef } from "react";
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";
import {
  FileIcon,
  Download,
  Share,
  FileText,
  Image,
  Video,
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
    <div className={`fixed inset-0 flex items-center justify-center z-50 pointer-events-none`}>
      <div className={`bg-red-300 border ${type === "error" ? "border-red-300" : "border-blue-500"} text-gray-900 rounded shadow-lg px-6 py-3 pointer-events-auto`}>
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 font-bold">×</button>
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
  onRevokeViewAccess,
  onClick,
  onDoubleClick,
  onMoveFile, // can remove if not needed for files-only
}) {
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [menuFile, setMenuFile] = useState(null);
  const menuRef = useRef(null);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  const iconMap = {
    podcast: <Headphones className="h-8 w-8 text-pink-500" />,
    pdf: <FileText className="h-8 w-8 text-red-500" />,
    document: <FileText className="h-8 w-8 text-gray-500" />,
    docx: <FileText className="h-8 w-8 text-gray-500" />,
    txt: <FileText className="h-8 w-8 text-gray-400" />,
    csv: <FileText className="h-8 w-8 text-green-600" />,
    xls: <FileText className="h-8 w-8 text-green-600" />,
    xlsx: <FileText className="h-8 w-8 text-green-600" />,
    ppt: <FileText className="h-8 w-8 text-orange-500" />,
    pptx: <FileText className="h-8 w-8 text-orange-500" />,
    image: <Image className="h-8 w-8 text-green-500" alt="" />,
    png: <Image className="h-8 w-8 text-green-500" alt="" />,
    jpg: <Image className="h-8 w-8 text-green-500" alt="" />,
    jpeg: <Image className="h-8 w-8 text-green-500" alt="" />,
    gif: <Image className="h-8 w-8 text-green-500" alt="" />,
    svg: <Image className="h-8 w-8 text-green-500" alt="" />,
    video: <Video className="h-8 w-8 text-purple-500" />,
    mp4: <Video className="h-8 w-8 text-purple-500" />,
    mov: <Video className="h-8 w-8 text-purple-500" />,
    avi: <Video className="h-8 w-8 text-purple-500" />,
    mkv: <Video className="h-8 w-8 text-purple-500" />,
    audio: <Music className="h-8 w-8 text-pink-500" />,
    mp3: <Music className="h-8 w-8 text-pink-500" />,
    wav: <Volume2 className="h-8 w-8 text-pink-500" />,
    zip: <FileText className="h-8 w-8 text-yellow-500" />,
    rar: <FileText className="h-8 w-8 text-yellow-500" />,
    html: <FileText className="h-8 w-8 text-orange-400" />,
    js: <FileText className="h-8 w-8 text-yellow-400" />,
    jsx: <FileText className="h-8 w-8 text-yellow-400" />,
    ts: <FileText className="h-8 w-8 text-blue-400" />,
    tsx: <FileText className="h-8 w-8 text-blue-400" />,
    json: <FileText className="h-8 w-8 text-lime-500" />,
    xml: <FileText className="h-8 w-8 text-lime-500" />,
    md: <FileCode className="h-8 w-8 text-cyan-600" />,
    markdown: <FileCode className="h-8 w-8 text-cyan-600" />,
    unknown: <FileText className="h-8 w-8 text-gray-300" />,
  };

  const getIcon = (file) => {
    return iconMap[file.type] || <FileIcon className="h-8 w-8 text-gray-500" />;
  };

  const isViewOnly = (file) => {
    return (
      file.viewOnly ||
      (file.fileTags && file.fileTags.includes("view-only")) ||
      (file.tags && file.tags.includes("view-only"))
    );
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

      const token = localStorage.getItem("token");
      if (token) {
        const profileRes = await fetch(getApiUrl("/users/profile"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        const profileResult = await profileRes.json();
        if (!profileRes.ok) throw new Error(profileResult.message || "Failed to fetch profile");

        await fetch(getFileApiUrl("/addAccesslog"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_id: file.id,
            user_id: profileResult.data.id,
            action: "deleted",
            message: `User ${profileResult.data.email} deleted the file.`,
          }),
        });
      }

      onDelete?.(file);
    } catch (err) {
      console.error("Delete failed:", err);
      showToast("Failed to delete file");
    } finally {
      setMenuFile(null);
    }
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            onClick={() => onClick?.(file)}
            onDoubleClick={() => onDoubleClick?.(file)}
            onContextMenu={(e) => handleContextMenu(e, file)}
            className="relative group bg-white rounded-lg border border-gray-300 p-4 hover:shadow-lg transition-shadow cursor-pointer dark:bg-gray-200 dark:hover:bg-blue-100"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="relative">{getIcon(file)}
                {isViewOnly(file) && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1">
                    <Eye className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {file.starred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                {file.shared && <span className="px-1 py-0.5 text-xs bg-gray-200 rounded">Shared</span>}
              </div>
            </div>

            <h3 className="font-medium text-gray-900 text-sm mb-1 truncate" title={file.name}>
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
              <p>{file.size}</p>
              <p>Modified {file.modified}</p>
            </div>

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
              if (!isViewOnly(menuFile)) onDownload(menuFile);
              setMenuFile(null);
            }}
            className={`w-full text-left px-4 py-2 flex items-center gap-2 ${isViewOnly(menuFile) ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-blue-200"
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

          {(isViewOnly(menuFile) || menuFile.allow_view_sharing) && onRevokeViewAccess && (
            <button
              onClick={() => {
                onRevokeViewAccess(menuFile);
                setMenuFile(null);
              }}
              className="w-full text-left px-4 py-2 hover:bg-orange-50 text-orange-600 flex items-center gap-2 dark:hover:bg-orange-200 dark:text-orange-600"
            >
              <EyeOff className="h-4 w-4" /> Revoke View Access
            </button>
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
