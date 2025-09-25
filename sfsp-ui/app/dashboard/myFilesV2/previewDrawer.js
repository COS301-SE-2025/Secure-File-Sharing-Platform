"use client";

import React, { useEffect, useState, useRef } from "react";
import { useEncryptionStore } from "@/app/SecureKeyStorage";
import { getSodium } from "@/app/lib/sodium";
import pako from "pako";
import { UserAvatar } from "@/app/lib/avatarUtils";
import { Document, Page, pdfjs } from "react-pdf";

//import "react-pdf/dist/esm/Page/AnnotationLayer.css";
//import "react-pdf/dist/esm/Page/TextLayer.css";

// Use pdfjs-dist's worker build
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export function PreviewDrawer({
  file,
  content,
  onClose,
  onOpenFullView,
  onSaveDescription,
}) {
  const [description, setDescription] = useState(file?.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sharedWith, setSharedWith] = useState([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [openMenuUserId, setOpenMenuUserId] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        onClose(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    setDescription(file?.description || "");
    setIsEditing(false);
    if (file) fetchAccessList(file);
  }, [file]);

  const fetchAccessList = async (file) => {
    setLoadingAccess(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const profileRes = await fetch("http://localhost:5000/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileResult = await profileRes.json();
      const userId = profileResult?.data?.id;
      if (!userId) return;

      const sharedFilesRes = await fetch(
        "http://localhost:5000/api/files/getViewAccess",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        }
      );
      const sharedFiles = await sharedFilesRes.json();
      if (sharedFiles != null) {
        const fileShares = sharedFiles.filter(
          (share) => share.file_id === file.id
        );

        const enrichedShares = await Promise.all(
          fileShares.map(async (share) => {
            let userName = "Unknown User";
            let email = "";
            let avatar = "";
            try {
              const res = await fetch(
                `http://localhost:5000/api/users/getUserInfo/${share.recipient_id}`
              );
              if (res.ok) {
                const data = await res.json();
                if (data?.data) {
                  userName = data.data.username || userName;
                  email = data.data.email || "";
                  avatar = data.data.avatar_url || "";
                }
              }
            } catch (err) {
              console.error(
                `Failed to fetch user info for ${share.recipient_id}:`,
                err
              );
            }

            return {
              ...share,
              recipient_name: userName,
              recipient_email: email,
              recipient_avatar: avatar,
            };
          })
        );

        setSharedWith(enrichedShares || []);
      }
    } catch (err) {
      console.error("Failed to fetch access list:", err);
    } finally {
      setLoadingAccess(false);
    }
  };

  const handleSave = async () => {
    if (!file) return;
    try {
      if (description === file.description) {
        setIsEditing(false);
        return;
      }
      setIsSaving(true);
      await onSaveDescription(file.id, description);
      file.description = description;
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDescription(file?.description || "");
    setIsEditing(false);
  };

  return (
    <div
      ref={drawerRef}
      className={`fixed top-0 right-0 w-96 h-full bg-white dark:bg-gray-200 shadow-lg z-50 transform transition-transform duration-300 ${
        file ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 dark:text-gray-900">
          <h2
            className="text-xl font-semibold truncate max-w-[70%]"
            title={file?.name}
          >
            {file?.name}
          </h2>
          <button
            onClick={() => onClose(null)}
            className="p-1 rounded hover:bg-gray-200"
            title="Close"
          >
            ✖
          </button>
        </div>

        <hr className="my-4 border-gray-400" />

        <div className="flex-1 overflow-y-auto p-4">
          {/* Preview Section */}
          <div className="mb-4">
            {(() => {
              switch (file?.type) {
                case "image":
                  return content?.url ? (
                    <div className="relative w-full max-h-64">
                      <img
                        src={content.url}
                        alt="Preview"
                        className="w-full max-h-64 object-cover rounded"
                      />
                      <canvas
                        className="absolute inset-0 w-full h-full rounded"
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  ) : null;
                case "video":
                  return content?.url ? (
                    <div className="relative w-full max-h-64">
                      <video
                        src={content.url}
                        controls
                        className="w-full max-h-64 rounded"
                      />
                      <canvas
                        className="absolute inset-0 w-full h-full rounded"
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    </div>
                  ) : null;
                case "audio":
                  return content?.url ? (
                    <audio controls src={content.url} className="w-full mt-2" />
                  ) : null;
                case "pdf":
                  return content?.url ? (
                    <div className="w-full max-h-64 overflow-y-auto border rounded bg-gray-100 p-2">
                      <Document
                        file={content.url}
                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                        onLoadError={(err) =>
                          console.error("PDF load error:", err)
                        }
                        loading={
                          <div className="p-4 text-sm text-gray-500">
                            Loading PDF…
                          </div>
                        }
                      >
                        {Array.from(new Array(numPages), (el, index) => (
                          <Page
			  key={`page_${index + 1}`}
			  pageNumber={index + 1}
			  width={320}
			  renderAnnotationLayer={false}
			  renderTextLayer={false}
			/>
                        ))}
                      </Document>
                    </div>
                  ) : null;
                case "md":
                case "markdown":
                case "txt":
                case "json":
                case "csv":
                case "html":
                  return content?.text ? (
                    <pre className="p-2 bg-gray-100 rounded max-h-48 overflow-y-auto">
                      {content.text}
                    </pre>
                  ) : null;
                case "folder":
                  return (
                    <div className="p-4 bg-blue-50 border border-blue-300 rounded text-center text-blue-700 text-sm">
                      📁 {content?.text || "This is a folder."}
                    </div>
                  );
                default:
                  return (
                    <div className="p-4 bg-gray-50 border rounded text-center text-sm text-gray-500">
                      ❌ This file type cannot be previewed.
                    </div>
                  );
              }
            })()}
          </div>

          {/* Full View Button */}
          <button
            onClick={() => onOpenFullView(file)}
            className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Open Full View
          </button>

          <hr className="my-4 border-gray-400" />

          {/* File Details */}
          <div className="mb-4">
            <h3 className="text-m font-bold text-gray-900 mb-2">File Details</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Type: {file?.type}</div>
              <div>Size: {file?.size}</div>
              <div>Modified: {file?.modified}</div>
            </div>
          </div>

          <hr className="my-4 border-gray-400" />

          {/* Access / Sharing Section */}
          <div className="mb-4">
            <h3 className="text-m font-bold text-gray-900 mb-2">Access</h3>
            {loadingAccess ? (
              <p className="text-sm text-gray-600">Loading...</p>
            ) : sharedWith.length === 0 ? (
              <p className="text-sm text-gray-600">No shared users</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {sharedWith.map((user) => (
                  <li
                    key={user.recipient_id}
                    className="relative flex items-center gap-2 bg-gray-100 dark:bg-gray-200 px-2 py-1 rounded-md cursor-pointer"
                    onClick={() =>
                      setOpenMenuUserId(
                        openMenuUserId === user.recipient_id
                          ? null
                          : user.recipient_id
                      )
                    }
                  >
                    <UserAvatar
                      avatarUrl={user.recipient_avatar}
                      username={user.recipient_name}
                      size="w-6 h-6"
                      alt={user.recipient_name}
                    />
                    <div className="text-xs text-gray-700">
                      <div className="font-bold">{user.recipient_name}</div>
                      <div className="text-gray-500">
                        {user.recipient_email}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <hr className="my-4 border-gray-400" />

          {/* Description Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-m font-bold text-gray-900">Description</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="p-2 border border-gray-300 rounded-md min-h-[60px] text-gray-600 whitespace-pre-wrap">
                {file?.description || "Add description"}
              </div>
            ) : (
              <>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Add description"
                  className="w-full p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving || description === file?.description}
                    className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-1 rounded border text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
