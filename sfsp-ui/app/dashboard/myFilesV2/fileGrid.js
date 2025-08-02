//app/dashboard/myFilesV2/fileGrid.js

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
  FileCode,
  Music,
  Volume2,
  Headphones,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

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
  onMoveFile,
  onEnterFolder,
  onGoBack,
  currentPath,
}) {
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [menuFile, setMenuFile] = useState(null);
  const menuRef = useRef(null);
  const [draggedFile, setDraggedFile] = useState(null);

  const iconMap = {
    folder: <Folder className="h-8 w-8 text-blue-500" />,
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
    unknown: <FileText className="h-8 w-8 text-gray-300" />,
    md: <FileCode className="h-8 w-8 text-cyan-600" />,
    markdown: <FileCode className="h-8 w-8 text-cyan-600" />,
  };

  const getIcon = (file) => {
    if (file.type === "folder") {
      console.log("Folder icon selected");
      return <Folder className="h-8 w-8 text-blue-500" />;
    }
    return iconMap[file.type] || <FileIcon className="h-8 w-8 text-gray-500" />;
  };

  // Check if file is view-only (either from tags or viewOnly property)
  const isViewOnly = (file) => {
    return file.viewOnly || (file.fileTags && file.fileTags.includes("view-only")) || (file.tags && file.tags.includes("view-only"));
  };

  // Check if current user is the owner (assuming owner files don't have "received" tag)
  const isOwner = (file) => {
    return !file.tags || !file.tags.includes("received");
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
      onMoveFile?.(draggedFile, newPath); // <-- You will define this in your parent component
      setDraggedFile(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {files.map((file) => (
          <div
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
            className="relative group bg-white rounded-lg border border-gray-300 p-4 hover:shadow-lg transition-shadow cursor-pointer dark:bg-gray-200 dark:hover:bg-blue-100"
          >
            {/* FOLDER DESIGN */}
            {file.type === "folder" ? (
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="relative">
                  <Folder className="h-20 w-20 text-blue-500" />
                </div>
                <h3 className="text-base font-bold text-gray-900 truncate" title={file.name}>
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
                      <span className="px-1 py-0.5 text-xs bg-gray-200 rounded">Shared</span>
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
                  <p>{file.size}</p>
                  <p>Modified {file.modified}</p>
                </div>

                {/* Quick Actions on Hover */}
                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
              onClick?.(menuFile); // Or onPreview?.(menuFile) if you have a dedicated preview handler
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
