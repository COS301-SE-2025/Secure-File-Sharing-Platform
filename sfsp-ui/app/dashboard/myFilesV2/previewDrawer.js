"use client";

import React, { useEffect, useState, useRef } from "react";
import { UserAvatar } from "@/app/lib/avatarUtils";
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";
import { Document, Page, pdfjs } from "react-pdf";

//import "react-pdf/dist/esm/Page/AnnotationLayer.css";
//import "react-pdf/dist/esm/Page/TextLayer.css";

// Use pdfjs-dist's worker build
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
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
  const [user, setUser] = useState(null);
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

      // Get current user profile
      const profileRes = await fetch(getApiUrl("/users/profile"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileResult = await profileRes.json();
      const userId = profileResult?.data?.id;
      if (!userId) return;

      // Get files shared for view-only access
      const sharedFilesRes = await fetch(getFileApiUrl("/getViewAccess"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const sharedFiles = await sharedFilesRes.json();
      const fileShares = sharedFiles.filter(
        (share) => share.file_id === file.id
      );

      // Enrich each share with recipient info
      const enrichedShares = await Promise.all(
        fileShares.map(async (share) => {
          let userName = "Unknown User";
          let email = "";
          let avatar = "";
          try {
            const res = await fetch(
              getApiUrl(`/users/getUserInfo/${share.recipient_id}`)
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

      console.log(enrichedShares);
      setSharedWith(enrichedShares || []);
    } catch (err) {
      console.error("Failed to fetch access list:", err);
    } finally {
      setLoadingAccess(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(getApiUrl("/users/profile"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = await res.json();
        if (!res.ok)
          throw new Error(result.message || "Failed to fetch profile");

        setUser(result.data);
      } catch (err) {
        console.error("Failed to fetch profile:", err.message);
      }
    };

    fetchProfile();
  }, []);

  const handleRevokeAccess = async (recipientId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const profileRes = await fetch(getApiUrl("/users/profile"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileResult = await profileRes.json();
      const userId = profileResult?.data?.id;
      if (!userId) return;

      const revokeRes = await fetch(getFileApiUrl("/revokeViewAccess"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.id,
          userId,
          recipientId,
        }),
      });

      if (!revokeRes.ok) throw new Error("Failed to revoke access");

      // Refresh access list
      fetchAccessList(file);
    } catch (err) {
      console.error("Error revoking access:", err);
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
                    <div
                      className="relative w-full max-h-64"
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {" "}
                      // Disable right-click
                      <Image
                        src={content.url}
                        alt="Preview"
                        className="w-full max-h-64 rounded"
                      />
                      {/* Watermark overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Image
                          src="/img/secureshare-logo.png"
                          className="opacity-70 w-1/5"
                          alt="Watermark"
                        />
                        <span className="absolute text-red-500 text-2xl opacity-50">
                          {user?.username}
                        </span>
                      </div>
                    </div>
                  ) : null;

                case "video":
                  return content?.url ? (
                    <div
                      className="relative w-full max-h-64"
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <video
                        src={content.url}
                        controlsList="nodownload"
                        controls
                        className="w-full max-h-64 rounded"
                      />
                      {/* Watermark overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <img
                          src="/img/secureshare-logo.png"
                          className="opacity-70 w-1/5"
                          alt="Watermark"
                        />
                        <span className="absolute text-red-500 text-2xl opacity-50">
                          {user?.username}
                        </span>
                      </div>
                    </div>
                  ) : null;

                case "audio":
                  return content?.url ? (
                    <audio
                      id="audio-element"
                      controlsList="nodownload"
                      controls
                      className="w-full rounded-lg p-2 bg-gray-200 border border-gray-400"
                    >
                      <source src={content.url} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  ) : null;

                case "pdf":
                  return content?.url ? (
                    <div
                      className="relative w-full max-h-64 overflow-y-auto border rounded bg-gray-100 p-2"
                      onContextMenu={(e) => e.preventDefault()}
                    >
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
                        {Array.from(new Array(numPages), (_, index) => (
                          <div key={`page_${index + 1}`} className="relative">
                            <Page
                              pageNumber={index + 1}
                              width={320}
                              renderAnnotationLayer={false}
                              renderTextLayer={false}
                            />
                            {/* Overlay watermark */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              {/* Logo */}
                              <img
                                src="/img/secureshare-logo.png"
                                className="opacity-70 w-1/5 mb-2"
                                alt="Watermark"
                              />

                              {/* Username */}
                              {user?.username && (
                                <span className="text-red-500 opacity-40 text-2xl rotate-45">
                                  {user.username}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </Document>
                    </div>
                  ) : null;

                case "md":
                case "markdown":
                  return content?.text ? (
                    <div className="border rounded">
                      <div className="bg-gray-100 px-2 py-1 text-xs text-gray-600 border-b">
                        Markdown Preview
                      </div>
                      <pre className="p-2 bg-white rounded-b max-h-48 overflow-y-auto text-sm text-gray-800">
                        {content.text}
                      </pre>
                    </div>
                  ) : null;

                //Code files
                case "js":
                case "jsx":
                case "ts":
                case "tsx":
                case "py":
                case "java":
                case "cpp":
                case "c":
                case "php":
                case "rb":
                case "go":
                case "rs":
                case "swift":
                case "kt":
                  return content?.text ? (
                    <div className="border rounded">
                      <div className="bg-blue-100 px-2 py-1 text-xs text-blue-700 border-b flex justify-between">
                        <span>{file.type.toUpperCase()} Code</span>
                        <span className="text-gray-500">Read-only preview</span>
                      </div>
                      <pre className="p-2 bg-gray-50 rounded-b max-h-48 overflow-y-auto text-sm font-mono text-gray-800">
                        {content.text}
                      </pre>
                    </div>
                  ) : null;

                //Web files
                case "html":
                  return content?.text ? (
                    <div className="border rounded">
                      <div className="bg-orange-100 px-2 py-1 text-xs text-orange-700 border-b">
                        HTML Source (Not Rendered)
                      </div>
                      <pre className="p-2 bg-gray-50 rounded-b max-h-48 overflow-y-auto text-sm text-gray-800">
                        {content.text}
                      </pre>
                    </div>
                  ) : null;

                case "css":
                  return content?.text ? (
                    <div className="border rounded">
                      <div className="bg-purple-100 px-2 py-1 text-xs text-purple-700 border-b">
                        CSS Stylesheet
                      </div>
                      <pre className="p-2 bg-gray-50 rounded-b max-h-48 overflow-y-auto text-sm font-mono text-gray-800">
                        {content.text}
                      </pre>
                    </div>
                  ) : null;

                //Data files
                case "json":
                  return content?.text ? (
                    <div className="border rounded">
                      <div className="bg-green-100 px-2 py-1 text-xs text-green-700 border-b">
                        JSON Data
                      </div>
                      <pre className="p-2 bg-gray-50 rounded-b max-h-48 overflow-y-auto text-sm text-gray-800">
                        {content.text}
                      </pre>
                    </div>
                  ) : null;

                case "xml":
                  return content?.text ? (
                    <div className="border rounded">
                      <div className="bg-yellow-100 px-2 py-1 text-xs text-yellow-700 border-b">
                        XML Document
                      </div>
                      <pre className="p-2 bg-gray-50 rounded-b max-h-48 overflow-y-auto text-sm text-gray-800">
                        {content.text}
                      </pre>
                    </div>
                  ) : null;

                case "yaml":
                case "yml":
                  return content?.text ? (
                    <div className="border rounded">
                      <div className="bg-red-100 px-2 py-1 text-xs text-red-700 border-b">
                        YAML Configuration
                      </div>
                      <pre className="p-2 bg-gray-50 rounded-b max-h-48 overflow-y-auto text-sm text-gray-800">
                        {content.text}
                      </pre>
                    </div>
                  ) : null;

                case "csv":
                  return content?.text ? (
                    <div className="border rounded">
                      <div className="bg-green-100 px-2 py-1 text-xs text-green-700 border-b">
                        CSV Data
                      </div>
                      <div className="p-2 bg-gray-50 rounded-b max-h-48 overflow-y-auto">
                        <pre className="text-sm text-gray-800">
                          {content.text}
                        </pre>
                        {/* Future: Could parse CSV and show as table */}
                      </div>
                    </div>
                  ) : null;

                //Configuration files
                case "sql":
                  return content?.text ? (
                    <div className="border rounded">
                      <div className="bg-blue-100 px-2 py-1 text-xs text-blue-700 border-b">
                        SQL Query
                      </div>
                      <pre className="p-2 bg-gray-50 rounded-b max-h-48 overflow-y-auto text-sm font-mono text-gray-800">
                        {content.text}
                      </pre>
                    </div>
                  ) : null;

                case "log":
                  return content?.text ? (
                    <div className="border rounded">
                      <div className="bg-gray-100 px-2 py-1 text-xs text-gray-700 border-b">
                        Log File
                      </div>
                      <pre className="p-2 bg-gray-900 text-green-400 rounded-b max-h-48 overflow-y-auto text-xs font-mono">
                        {content.text}
                      </pre>
                    </div>
                  ) : null;

                case "ini":
                case "cfg":
                case "conf":
                  return content?.text ? (
                    <div className="border rounded">
                      <div className="bg-gray-100 px-2 py-1 text-xs text-gray-700 border-b">
                        Configuration File
                      </div>
                      <pre className="p-2 bg-gray-50 rounded-b max-h-48 overflow-y-auto text-sm text-gray-800">
                        {content.text}
                      </pre>
                    </div>
                  ) : null;

                //Plain text
                case "txt":
                  return content?.text ? (
                    <div className="border rounded">
                      <div className="bg-gray-100 px-2 py-1 text-xs text-gray-600 border-b">
                        Text Document
                      </div>
                      <pre className="p-2 bg-white rounded-b max-h-48 overflow-y-auto text-sm whitespace-pre-wrap text-gray-800">
                        {content.text}
                      </pre>
                    </div>
                  ) : null;

                case "folder":
                  return (
                    <div className="p-4 bg-blue-50 border border-blue-300 rounded text-center text-blue-700 text-sm">
                      📁 {content?.text || "This is a folder."}
                    </div>
                  );

                //Unsupported files
                default:
                  return (
                    <div className="p-4 bg-gray-50 border rounded text-center text-sm text-gray-500">
                      <div className="mb-2">❌</div>
                      <div>This file type cannot be previewed.</div>
                      <div className="text-xs mt-1 text-gray-400">
                        Supported: Images, Videos, Audio, PDF, Text, Code, and
                        Data files
                      </div>
                    </div>
                  );
              }
            })()}
          </div>

          {/* Full View Button - Only show for previewable files */}
          {[
            "image",
            "video",
            "audio",
            "pdf",
            "txt",
            "json",
            "csv",
            "html",
            "css",
            "js",
            "jsx",
            "ts",
            "tsx",
            "py",
            "java",
            "cpp",
            "c",
            "php",
            "rb",
            "go",
            "rs",
            "md",
            "markdown",
            "xml",
            "yaml",
            "yml",
            "sql",
            "log",
            "ini",
            "cfg",
            "conf",
          ].includes(file?.type) && (
            <button
              onClick={() => onOpenFullView(file)}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Open Full View
            </button>
          )}

          <hr className="my-4 border-gray-400" />

          {/* File Details */}
          <div className="mb-4">
            <h3 className="text-m font-bold text-gray-900 mb-2">
              File Details
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                Type:{" "}
                <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                  {file?.type}
                </span>
              </div>
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
