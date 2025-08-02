//app/dashboard/myFilesV2/fileList.js

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileIcon,
  Download,
  Share,
  Folder,
  FileText,
  Image,
  Video,
  Star,
  MoreVertical,
  X,
  Eye,
  EyeOff
} from "lucide-react";

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
  onRevokeViewAccess,
}) {
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [menuFile, setMenuFile] = useState(null);
  const menuRef = useRef(null);

  const iconMap = {
    folder: <Folder className="h-5 w-5 text-blue-500" />,
    pdf: <FileText className="h-5 w-5 text-red-500" />,
    document: <FileText className="h-5 w-5 text-red-500" />,
    image: <Image className="h-5 w-5 text-green-500" alt="" />,
    video: <Video className="h-5 w-5 text-purple-500" />,
  };

  const getIcon = (file) => {
    if (file.type === "folder") {
      console.log("Folder icon selected");
      return <Folder className="h-5 w-5 text-blue-500" />;
    }
    return iconMap[file.type] || <FileIcon className="h-5 w-5 text-gray-500" />;
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
      const res = await fetch("http://localhost:5000/api/files/addTags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, tags }),
      });

      if (!res.ok) {
        throw new Error("Failed to tag file as deleted");
      }

      console.log(`File ${file.name} marked as deleted`);

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
            action: "deleted",
            message: `User ${profileResult.data.email} deleted the file.`,
          }),
        });
      } catch (err) {
        console.error("Failed to fetch user profile:", err.message);
      }

      if (onDelete) {
        onDelete(file);
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete file");
    } finally {
      setMenuFile(null);
    }
  };

  const handleDragStart = (e, file) => {
    setDraggedFile(file);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, folder) => {
    if (
      draggedFile &&
      folder.type === "folder" &&
      draggedFile.id !== folder.id
    ) {
      e.preventDefault(); // allows drop
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

  // Check if file is view-only (either from tags or viewOnly property)
  const isViewOnly = (file) => {
    return file.viewOnly || (file.tags && file.tags.includes("view-only"));
  };

  // Check if current user is the owner (assuming owner files don't have "received" tag)
  const isOwner = (file) => {
    return !file.tags || !file.tags.includes("received");
  };

  return (
    <>
      <table className="w-full bg-white rounded-lg ">
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
              onClick={() => {
                if (file.type !== "folder") {
                  onClick?.(file);
                }
              }}
              onDoubleClick={() => {
                if (file.type === "folder") {
                  onEnterFolder?.(file.name);
                } else {
                  onDoubleClick?.(file);
                }
              }}
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
              <td className="p-2">
                {file.type === "folder" ? "" : file.size}
              </td>
              <td className="p-2">{file.modified}</td>
              <td className="p-2">
                <span className={`px-2 py-1 rounded-full text-xs ${isViewOnly(file)
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-200'
                  : 'bg-green-100 text-green-800 dark:bg-green-200'
                  }`}>
                  {isViewOnly(file) ? 'View Only' : 'Full Access'}
                </span>
              </td>
              <td className="p-2 flex gap-2">
                <button onClick={() => onShare(file)} title="Share">
                  <Share className="h-4 w-4" />
                </button>
                {!isViewOnly(file) && (
                  <button
                    onClick={() => onDownload(file)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
                {isViewOnly(file) && (
                  <button
                    onClick={() => alert("This file is view-only and cannot be downloaded")}
                    title="Download disabled for view-only files"
                    className="opacity-50 cursor-not-allowed"
                  >
                    <Download className="h-4 w-4" />
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
          {/* Shared Buttons */}
          <button
            onClick={() => {
              onShare(menuFile);
              setMenuFile(null);
            }}
            className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 dark:hover:bg-blue-200 ${menuFile?.type === "folder" ? "hidden" : ""
              }`}
          >
            <Share className="h-4 w-4" /> Share
          </button>

          <button
            onClick={() => {
              if (!isViewOnly(menuFile)) {
                onDownload(menuFile);
              } else {
                alert("This file is view-only and cannot be downloaded");
              }
              setMenuFile(null);
            }}
            className={`w-full text-left px-4 py-2 flex items-center gap-2 ${menuFile?.type === "folder"
              ? "hidden"
              : isViewOnly(menuFile)
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-100 dark:hover:bg-blue-200"
              }`}
            disabled={menuFile?.type !== "folder" && isViewOnly(menuFile)}
          >
            <Download className="h-4 w-4" /> Download
          </button>

          {menuFile?.type !== "folder" && <hr className="my-1" />}

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
            className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 dark:hover:bg-blue-200 ${menuFile?.type === "folder" ? "hidden" : ""
              }`}
          >
            <MoreVertical className="h-4 w-4" /> Activity Logs
          </button>

          {menuFile?.type !== "folder" && <hr className="my-1" />}

          {(isViewOnly(menuFile) || menuFile.allow_view_sharing) && onRevokeViewAccess && (
            <button
              onClick={() => {
                onRevokeViewAccess(menuFile);
                setMenuFile(null);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-orange-50 text-orange-600 flex items-center gap-2 dark:hover:bg-orange-200 dark:text-orange-600 ${menuFile?.type === "folder" ? "hidden" : ""
                }`}
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
    </>
  );
}