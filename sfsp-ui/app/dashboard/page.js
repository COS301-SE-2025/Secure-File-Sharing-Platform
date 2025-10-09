"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";
import {
  FileText,
  Users,
  TrashIcon,
  UploadCloud,
  ListCheckIcon,
  AlertCircleIcon,
} from "lucide-react";
import { UploadDialog } from "./myFilesV2/uploadDialog";
import dynamic from "next/dynamic";
import { PreviewDrawer } from "./myFilesV2/previewDrawer";
import { useDashboardSearch } from "./components/DashboardSearchContext";
import { getSodium } from "@/app/lib/sodium";
import { useEncryptionStore } from "@/app/SecureKeyStorage";
import { UserAvatar } from "@/app/lib/avatarUtils";

const FullViewModal = dynamic(
  () =>
    import("./myFilesV2/fullViewModal").then((mod) => ({
      default: mod.FullViewModal,
    })),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);

function getFileType(mimeType, fileName = "") {
  if (mimeType.includes("folder")) return "folder";
  const normalizedMimeType = mimeType ? mimeType.toLowerCase() : "";
  const normalizedFileName = fileName ? fileName.toLowerCase() : "";
  const fileExtension = normalizedFileName.includes(".")
    ? normalizedFileName.split(".").pop()
    : "";

  if (normalizedMimeType) {
    if (normalizedMimeType.includes("pdf")) return "pdf";
    if (
      normalizedMimeType.includes("markdown") ||
      normalizedMimeType.includes("x-markdown")
    ) {
      return "markdown";
    }
    if (normalizedMimeType.includes("json")) return "json";
    if (normalizedMimeType.includes("csv")) return "csv";
    if (normalizedMimeType.includes("html")) return "html";
    if (normalizedMimeType.includes("image")) return "image";
    if (normalizedMimeType.includes("video")) return "video";
    if (normalizedMimeType.includes("audio")) return "audio";
    if (normalizedMimeType.includes("podcast")) return "podcast";
    if (
      normalizedMimeType.includes("zip") ||
      normalizedMimeType.includes("rar")
    )
      return "archive";
    if (
      normalizedMimeType.includes("spreadsheet") ||
      normalizedMimeType.includes("excel") ||
      normalizedMimeType.includes("sheet")
    )
      return "excel";
    if (normalizedMimeType.includes("presentation")) return "ppt";
    if (
      normalizedMimeType.includes("word") ||
      normalizedMimeType.includes("document")
    )
      return "word";
    if (
      normalizedMimeType.includes("code") ||
      normalizedMimeType.includes("script")
    )
      return "code";
    if (normalizedMimeType.includes("text")) {
      if (fileExtension === "md" || fileExtension === "markdown")
        return "markdown";
      return "txt";
    }
    if (normalizedMimeType.includes("application")) return "application";
  }

  if (fileExtension) {
    switch (fileExtension) {
      case "md":
      case "markdown":
        return "markdown";
      case "pdf":
        return "pdf";
      case "json":
        return "json";
      case "csv":
        return "csv";
      case "html":
      case "htm":
        return "html";
      case "txt":
        return "txt";
      case "py":
        return "py";
      case "java":
        return "java";
      case "cpp":
        return "cpp";
      case "c":
        return "c";
      case "h":
        return "h";
      case "cs":
        return "cs";
      case "php":
        return "php";
      case "rb":
        return "rb";
      case "go":
        return "go";
      case "rs":
        return "rs";
      case "swift":
        return "swift";
      case "kt":
        return "kt";
      case "scala":
        return "scala";
      case "r":
        return "r";
      case "matlab":
        return "matlab";
      case "pl":
        return "pl";
      case "lua":
        return "lua";
      case "css":
        return "css";
      case "scss":
        return "scss";
      case "sass":
        return "sass";
      case "less":
        return "less";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "svg":
      case "webp":
      case "image":
      case "bmp":
      case "tiff":
      case "tif":
      case "ico":
      case "heic":
      case "raw":
        return "image";
      case "mp4":
      case "avi":
      case "mov":
      case "webm":
        return "video";
      case "mp3":
      case "wav":
      case "flac":
        return "audio";
      case "zip":
      case "rar":
      case "7z":
        return "archive";
      case "xlsx":
      case "xls":
        return "excel";
      case "pptx":
      case "ppt":
        return "ppt";
      case "docx":
      case "doc":
        return "word";
      case "sql":
        return "sql";
      case "db":
        return "db";
      case "sqlite":
        return "sqlite";
      case "mdb":
        return "mdb";
      case "ods":
        return "ods";
      case "odp":
        return "odp";
      case "log":
        return "log";
      case "readme":
        return "readme";
      case "yaml":
        return "yaml";
      case "yml":
        return "yml";
      case "toml":
        return "toml";
      case "ini":
        return "ini";
      case "cfg":
        return "cfg";
      case "conf":
        return "conf";
      case "archive":
        return "archive";
      case "zip":
        return "zip";
      case "rar":
        return "rar";
      case "7z":
        return "7z";
      case "tar":
        return "tar";
      case "gz":
        return "gz";
      case "bz2":
        return "bz2";
      case "xz":
        return "xz";
      case "exe":
        return "exe";
      case "msi":
        return "msi";
      case "deb":
        return "deb";
      case "rpm":
        return "rpm";
      case "dmg":
        return "dmg";
      case "iso":
        return "iso";
      case "img":
        return "img";
      case "key":
        return "key";
      case "pem":
        return "pem";
      case "crt":
        return "crt";
      case "cert":
        return "cert";
      case "eml":
        return "eml";
      case "msg":
        return "msg";
      case "ics":
        return "ics";
      case "psd":
        return "psd";
      case "ai":
        return "ai";
      case "eps":
        return "eps";
      case "indd":
        return "indd";
      case "dwg":
        return "dwg";
      case "dxf":
        return "dxf";
      case "obj":
        return "obj";
      case "fbx":
        return "fbx";
      case "blend":
        return "blend";
    }
  }
  return normalizedMimeType ? "file" : "unknown";
}

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  else if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  else if (size < 1024 * 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  else return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function parseTagString(tagString = "") {
  return tagString
    .replace(/[{}]/g, "")
    .split(",")
    .map((t) => t.trim());
}

const formatTimestamp = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = now - time;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function DashboardHomePage() {
  const [files, setFiles] = useState([]);
  const [fileCount, setFileCount] = useState(0);
  const [trashedFilesCount, setTrashedFilesCount] = useState(0);
  const [receivedFilesCount, setReceivedFilesCount] = useState(0);
  const [sharedFilesCount, setSharedFileCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [showExpanded, setShowExpanded] = useState(true); // New state for expanded view
  const userId = useEncryptionStore.getState().userId;
  const { search } = useDashboardSearch();
  const [notifications, setNotifications] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [viewerFile, setViewerFile] = useState(null);
  const [viewerContent, setViewerContent] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [recentAccessLogs, setRecentAccessLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState("All actions");
  const [user, setUser] = useState(null);

  const fetchFiles = async () => {
    try {
      if (!userId) {
        console.error("Cannot fetch files: Missing userId in store.");
        return [];
      }
      const res = await fetch(getFileApiUrl("/metadata"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      let data;
      try {
        data = await res.json();
      } catch (e) {
        const text = await res.text();
        console.error("Failed to parse JSON:", text);
        return [];
      }
      if (data != null){
      
      const filesOnly = data.filter(
        (file) => getFileType(file.fileType || "", file.fileName) !== "folder"
      );
     
      const sortedFiles = filesOnly.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setRecentFiles(sortedFiles.slice(0, 3));
      const formatted = data
        .filter((f) => {
          const tags = f.tags ? f.tags.replace(/[{}]/g, "").split(",") : [];
          return (
            !tags.includes("deleted") &&
            !tags.some((tag) => tag.trim().startsWith("deleted_time:"))
          );
        })
        .map((f) => ({
          id: f.fileId || "",
          name: f.fileName || "Unnamed file",
          size: formatFileSize(f.fileSize || 0),
          type: getFileType(f.fileType || ""),
          modified: f.createdAt
            ? new Date(f.createdAt).toLocaleDateString()
            : "",
          shared: false,
          starred: false,
        }));
      setFiles(formatted);
      return formatted;
     }
    } catch (err) {
      console.error("Failed to fetch files:", err);
      return [];
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [userId]);

  const handleLoadFile = async (file) => {
    if (!file?.fileName) {
      alert("File name missing!");
      return null;
    }
    const { encryptionKey, userId } = useEncryptionStore.getState();
    if (!encryptionKey) {
      alert("Missing encryption key");
      return null;
    }
    const sodium = await getSodium();
    try {
      const res = await fetch(getFileApiUrl("/download"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fileId: file.fileId || file.id,
        }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Download failed: ${res.status} - ${errorText}`);
      }
      const buffer = await res.arrayBuffer();
      const encryptedFile = new Uint8Array(buffer);
      const nonceBase64 = res.headers.get("X-Nonce");
      const fileName = res.headers.get("X-File-Name");
      if (!nonceBase64 || !fileName) {
        throw new Error("Missing nonce or fileName in response headers");
      }
      const decrypted = sodium.crypto_secretbox_open_easy(
        encryptedFile,
        sodium.from_base64(nonceBase64, sodium.base64_variants.ORIGINAL),
        encryptionKey
      );
      if (!decrypted) {
        throw new Error("Decryption failed");
      }
      return { fileName, decrypted };
    } catch (err) {
      console.error("Load file error:", err);
      alert("Failed to load file");
      return null;
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

  const handleOpenPreview = async (rawFile) => {
    const username = user?.username;
    const file = {
      ...rawFile,
      type: getFileType(
        rawFile.fileType || rawFile.type || "",
        rawFile.fileName
      ),
      name: rawFile.fileName || rawFile.name,
      size: formatFileSize(rawFile.fileSize || rawFile.size || 0),
    };
    const result = await handleLoadFile(file);
    if (!result) return;
    let contentUrl = null;
    let textFull = null;
    if (file.type === "image") {
      if (typeof window === "undefined") return;
      const imgBlob = new Blob([result.decrypted], { type: file.type });
      const imgBitmap = await createImageBitmap(imgBlob);
      const canvas = document.createElement("canvas");
      canvas.width = imgBitmap.width;
      canvas.height = imgBitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imgBitmap, 0, 0);
      const fontSize = Math.floor(imgBitmap.width / 20);
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = "rgb(255, 0, 0, 0.4)";
      ctx.textAlign = "center";
      ctx.fillText(username, imgBitmap.width / 2, imgBitmap.height / 2);
      contentUrl = canvas.toDataURL(file.type);
    } else if (file.type === "pdf") {
      contentUrl = URL.createObjectURL(
        new Blob([result.decrypted], { type: "application/pdf" })
      );
    } else if (file.type === "video" || file.type === "audio") {
      contentUrl = URL.createObjectURL(new Blob([result.decrypted]));
    } else if (["txt", "json", "csv"].includes(file.type)) {
      textFull = new TextDecoder().decode(result.decrypted);
    }
    setPreviewContent({ url: contentUrl, text: textFull });
    setPreviewFile(file);
  };

  const handleOpenFullView = async (file) => {
    const username = user?.username;
    const result = await handleLoadFile(file);
    if (!result) return;
    let contentUrl = null;
    let textFull = null;
    if (file.type === "image") {
      if (typeof window === "undefined") return;
      const imgBlob = new Blob([result.decrypted], { type: file.type });
      const imgBitmap = await createImageBitmap(imgBlob);
      const canvas = document.createElement("canvas");
      canvas.width = imgBitmap.width;
      canvas.height = imgBitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imgBitmap, 0, 0);
      const fontSize = Math.floor(imgBitmap.width / 20);
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = "rgb(255, 0, 0, 1)";
      ctx.textAlign = "center";
      ctx.fillText(username, imgBitmap.width / 2, imgBitmap.height / 2);
      contentUrl = canvas.toDataURL(file.type);
    } else if (file.type === "pdf") {
      contentUrl = URL.createObjectURL(
        new Blob([result.decrypted], { type: "application/pdf" })
      );
    } else if (file.type === "video" || file.type === "audio") {
      contentUrl = URL.createObjectURL(new Blob([result.decrypted]));
    } else if (["txt", "json", "csv"].includes(file.type)) {
      textFull = new TextDecoder().decode(result.decrypted);
    }
    setViewerContent({ url: contentUrl, text: textFull });
    setViewerFile(file);
  };

  const fetchNotifications = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const profileRes = await fetch(getApiUrl("/users/profile"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileResult = await profileRes.json();
      if (!profileRes.ok)
        throw new Error(profileResult.message || "Failed to fetch profile");
      try {
        const res = await axios.post(getApiUrl("/notifications/get"), {
          userId: profileResult.data.id,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setNotifications(res.data.notifications);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err.message);
    }
  };

  const markAsRead = async (id) => {
    try {
      const res = await axios.post(getApiUrl("/notifications/markAsRead"), {
        id,
      });
      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const respondToShareRequest = async (id, status) => {
    try {
      const res = await axios.post(getApiUrl("/notifications/respond"), {
        id,
        status,
      });
      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, status, read: true } : n))
        );
        if (status === "accepted" && res.data.fileData) {
          const fileData = res.data.fileData;
          await ReceiveFile(fileData);
        }
      }
    } catch (error) {
      console.error("Failed to respond to notification:", error);
    }
  };

  const clearNotification = async (id) => {
    try {
      const res = await axios.post(getApiUrl("/notifications/clear"), { id });
      if (res.data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (error) {
      console.error("Failed to clear notification:", error);
    }
  };

  const fetchRecentAccessLogs = async () => {
    try {
      const userId = useEncryptionStore.getState().userId;
      if (!userId) return [];
      const res = await fetch(getFileApiUrl("/metadata"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      let files = await res.json();
      if (!Array.isArray(files)) files = [];
      files = files.filter((f) => {
        const tags = f.tags ? f.tags.replace(/[{}]/g, "").split(",") : [];
        return (
          !tags.includes("deleted") &&
          !tags.some((tag) => tag.trim().startsWith("deleted_time:"))
        );
      });
      const allLogs = [];
      for (const file of files) {
        try {
          const logRes = await fetch(getFileApiUrl("/getAccesslog"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_id: file.fileId }),
          });
          if (!logRes.ok) continue;
          const fileLogs = await logRes.json();
          for (const log of fileLogs) {
            if (log.file_id !== file.fileId) continue;
            let userName = "Unknown User";
            let avatar = "/default-avatar.png";
            try {
              const userRes = await fetch(
                getApiUrl(`/users/getUserInfo/${log.user_id}`)
              );
              if (userRes.ok) {
                const userInfo = await userRes.json();
                if (userInfo?.data?.username) {
                  userName = userInfo.data.username;
                  avatar = userInfo.data.avatar_url || avatar;
                }
              }
            } catch {}
            allLogs.push({
              user: userName,
              avatar,
              action: log.action || "",
              file: file.fileName || "Unnamed File",
              timestamp: log.timestamp,
              dateFormatted: new Date(log.timestamp).toLocaleString(),
            });
          }
        } catch {}
      }
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setRecentAccessLogs(allLogs.slice(0, 3));
    } catch (err) {
      console.error("Failed to fetch recent access logs:", err);
      setRecentAccessLogs([]);
    }
  };

  const fetchFilesMetadata = useCallback(async () => {
    try {
      const res = await fetch(getFileApiUrl("/metadata"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
     if (data != null){
      const activeFiles = data.filter((file) => {
        const tags = parseTagString(file.tags);
        const type = getFileType(file.fileType || "", file.fileName);
        return !tags.includes("deleted") && type !== "folder";
      });
      const deletedFiles = data.filter((file) => {
        const tags = parseTagString(file.tags);
        return tags.includes("deleted");
      });
      const receivedFiles = data.filter((file) => {
        const tags = parseTagString(file.tags);
        return tags.includes("received");
      });
        const sharedFiles = data.filter((file) => {
        const tags = parseTagString(file.tags);
        return tags.includes("shared");
      });


      setFileCount(activeFiles.length);
      setTrashedFilesCount(deletedFiles.length);
      setReceivedFilesCount(receivedFiles.length);
      setSharedFileCount(sharedFiles.length);     //new

     } 
    }catch (error) {
      console.error("Failed to fetch files metadata:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchFilesMetadata();
      fetchFiles();
      fetchNotifications();
      fetchRecentAccessLogs();
    }
  }, [userId, fetchFilesMetadata, actionFilter]);

  const stats = [
    {
      icon: <FileText className="text-blue-600 dark:text-blue-400" size={28} />,
      label: "My Files",
      value: fileCount,
    },
    {
      icon: <Users className="text-green-600 dark:text-green-400" size={28} />,
      label: "Shared with Me",
      value: receivedFilesCount,
    },
    {
      icon: (
        <TrashIcon className="text-purple-600 dark:text-purple-400" size={28} />
      ),
      label: "Trash",
      value: trashedFilesCount,
    },
    {
      icon: (
        <UploadCloud className="text-blue-600 dark:text-blue-400" size={28} />
      ),
      label: "Shared Files",
      value: sharedFilesCount,
    },
  ];
return (
  <div className="p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
    <h1 className="text-2xl font-semibold mb-2 text-blue-500">
      Welcome, {user?.username}!
    </h1>
    <p className="text-gray-600 dark:text-gray-400 mb-7">
      Here&apos;s an overview of your activity.
    </p>
    <input id="file-upload-input" type="file" hidden />

    {/* Stats Section */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      {stats.map((item, idx) => (
        <div
          key={idx}
          className="flex items-center gap-4 p-7 bg-gray-200 dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
            {item.icon}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-500 dark:text-gray-400">
              {item.label}
            </p>
            <p className="text-xl font-bold">{item.value}</p>
          </div>
        </div>
      ))}
    </div>

    {/* Two-column layout */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      {/* LEFT COLUMN — Notifications + Activity Logs */}
      <div className="flex flex-col gap-6">
        {/* Notifications */}
        <div className="h-60 p-4 flex flex-col justify-start bg-gray-200 dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
              <ListCheckIcon className="text-blue-600 dark:text-blue-400" size={22} />
            </div>
            <p className="text-lg font-bold text-gray-500 dark:text-gray-400">Notifications</p>
          </div>
          <div className="p-6 overflow-y-auto space-y-1 pr-1 text-xs text-gray-700 dark:text-gray-200">
            {notifications.length === 0 ? (
              <p className="text-gray-500">No new notifications</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <FileText className="w-3 h-3 mt-1 text-blue-500" />
                  <div className="flex-1">
                    <p className="leading-tight">{n.message}</p>
                    <p className="text-[10px] text-gray-500">{formatTimestamp(n.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Logs */}
        <div className="h-60 p-4 flex flex-col justify-start bg-gray-200 dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
              <AlertCircleIcon className="text-green-600 dark:text-green-400" size={22} />
            </div>
            <p className="text-lg font-bold text-gray-500 dark:text-gray-400">Activity Logs</p>
          </div>
          <div className="p-6 overflow-y-auto space-y-1 pr-1 text-xs text-gray-700 dark:text-gray-200">
            {recentAccessLogs.length > 0 ? (
              recentAccessLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <UserAvatar
                    avatarUrl={user?.avatar_url}
                    username={user?.username}
                    size="w-6 h-6 flex-shrink-0"
                    alt="User Avatar"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{log.user}</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {log.action} <strong>{log.file}</strong> at {log.dateFormatted}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-xs">No recent activity.</p>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN — Upload + Recent Files */}
      <div className="flex flex-col gap-6">
        {/* Upload Section */}
        <div className=" h-60 p-4 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-md flex flex-col items-center justify-center h-40">
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Upload Files</p>
          <div
            onClick={() => setIsUploadOpen(true)}
            className="w-full h-24 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg flex items-center justify-center cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 transition"
          >
            <p className="text-blue-500 dark:text-blue-400 text-sm">Drag & Drop or click to upload</p>
          </div>
          <UploadDialog
            open={isUploadOpen}
            onOpenChange={setIsUploadOpen}
            onUploadSuccess={fetchFiles}
          />
        </div>

        {/* Recent Files */}
        <div className=" h-60 p-4 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-md h-40 overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Recent Files</h2>
          <ul className="bg-white dark:bg-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto text-sm">
            {recentFiles.length === 0 ? (
              <li className="p-2 text-gray-500">No recent files</li>
            ) : (
              recentFiles.map((file, index) => (
                <li key={index} className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-200 text-sm">
                      {file.fileName || file.name || "Unnamed File"}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {formatTimestamp(file.date || file.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenPreview(file)}
                    className="text-blue-500 hover:underline text-xs"
                  >
                    Open
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  </div>
);
}