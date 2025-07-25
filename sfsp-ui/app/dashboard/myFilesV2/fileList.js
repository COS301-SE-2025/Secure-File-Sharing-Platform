//app/dashboard/myFilesV2/fileList.js

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileIcon, Download, Share, Folder, FileText, Image, Video, Star, MoreVertical, } from 'lucide-react';

export function FileList({
  files,
  onShare,
  onViewDetails,
  onViewActivity,
  onDownload,
  onDelete,
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

  const getIcon = (type) =>
    iconMap[type] || <FileIcon className="h-5 w-5 text-gray-500" />;

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
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
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
        const profileRes = await fetch("http://localhost:5000/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const profileResult = await profileRes.json();
        if (!profileRes.ok) throw new Error(profileResult.message || "Failed to fetch profile");

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

  return (
    <>
      <table className="w-full bg-white rounded-lg ">
        <thead>
          <tr className="bg-gray-300 dark:bg-gray-700">
            <th className="text-left p-2">Name</th>
            <th className="text-left p-2">Size</th>
            <th className="text-left p-2">Modified</th>
            <th className="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300 dark:divide-gray-300 dark:bg-gray-200 dark:text-gray-900">
          {files.map((file) => (
            <tr
              key={file.id}
              onContextMenu={(e) => handleContextMenu(e, file)}
              className="hover:bg-gray-200 cursor-pointer dark:hover:bg-blue-100"
            >
              <td className="p-2 flex items-center gap-2">
                {getIcon(file.type)}
                <span className="font-medium">{file.name}</span>
                {file.starred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
              </td>
              <td className="p-2">{file.size}</td>
              <td className="p-2">{file.modified}</td>
              <td className="p-2 flex gap-2">
                <button onClick={() => onShare(file)} title="Share">
                  <Share className="h-4 w-4" />
                </button>
                <button onClick={() => onDownload(file)} title="Download">
                  <Download className="h-4 w-4" />
                </button>
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
              onShare(menuFile);
              setMenuFile(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 dark:hover:bg-blue-200"
          >
            <Share className="h-4 w-4" /> Share
          </button>

          <button
            onClick={() => {
              onDownload(menuFile);
              setMenuFile(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 dark:hover:bg-blue-200"
          >
            <Download className="h-4 w-4" /> Download
          </button>

          <hr />

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

          <hr />

          <button
            onClick={() => handleDelete(menuFile)}
            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 dark:hover:bg-red-200 dark:text-red-600"
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
}
