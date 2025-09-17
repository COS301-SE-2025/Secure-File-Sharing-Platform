// app/dashboard/sharedWithMe/fileList.js

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileIcon,
  Download,
  Share,
  FileText,
  Image,
  Video,
  Star,
  MoreVertical,
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

function getCookie(name) {
  return document.cookie.split("; ").find(c => c.startsWith(name + "="))?.split("=")[1];
}

const csrf = getCookie("csrf_token");

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

  const iconMap = {
    pdf: <FileText className="h-5 w-5 text-red-500" />,
    document: <FileText className="h-5 w-5 text-red-500" />,
    image: <Image className="h-5 w-5 text-green-500" alt="" />,
    video: <Video className="h-5 w-5 text-purple-500" />,
  };

  const getIcon = (file) => iconMap[file.type] || <FileIcon className="h-5 w-5 text-gray-500" />;

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
      const res = await fetch("/api/files/addTags", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf":csrf||"" },
        body: JSON.stringify({ fileId: file.id, tags }),
      });

      if (!res.ok) throw new Error("Failed to tag file as deleted");

        try {
          const profileRes = await fetch("/api/auth/profile");
          const profileResult = await profileRes.json();
          if (!profileRes.ok) throw new Error(profileResult.message || "Failed to fetch profile");

          await fetch("/api/files/addAccesslogs", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-csrf":csrf||"" },
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
                {file.starred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                {isViewOnly(file) && <Eye className="h-4 w-4 text-blue-500" title="View Only" />}
              </td>
              <td className="p-2">{file.size}</td>
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
