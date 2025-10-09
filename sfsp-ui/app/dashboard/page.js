"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";
import {
  FileText,
  Users,
  TrashIcon,
  Upload,
  X,
  File as FileIcon,
  ListCheckIcon,
  AlertCircleIcon,
} from "lucide-react";
import Image from "next/image";
import { gzip } from "pako";
import { getSodium } from "@/app/lib/sodium";
import { useEncryptionStore } from "@/app/SecureKeyStorage";
import { UserAvatar } from "@/app/lib/avatarUtils";
import useDrivePicker from "react-google-drive-picker";
import dynamic from "next/dynamic";
import { PreviewDrawer } from "./myFilesV2/previewDrawer";

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
  const [dragActive, setDragActive] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dropboxLoading, setDropboxLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [openPicker, authResponse] = useDrivePicker();
  const fileInputRef = useRef(null);
  const userId = useEncryptionStore.getState().userId;
  // const { search } = useDashboardSearch();
  const [notifications, setNotifications] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [viewerFile, setViewerFile] = useState(null);
  const [viewerContent, setViewerContent] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [recentAccessLogs, setRecentAccessLogs] = useState([]);
  const [actionFilter, setActionFilter] = useState("All actions");
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("notifications");

  // Dropbox Script Loading
  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
    if (appKey && !window.Dropbox) {
      setDropboxLoading(true);
      const scriptEl = document.createElement("script");
      scriptEl.onload = () => {
        setDropboxLoading(false);
        console.log("Dropbox script loaded successfully");
      };
      scriptEl.onerror = () => {
        setDropboxLoading(false);
        console.error("Failed to load Dropbox script");
      };
      scriptEl.id = "dropboxjs";
      scriptEl.setAttribute("data-app-key", appKey);
      scriptEl.src = "https://www.dropbox.com/static/api/2/dropins.js";
      document.head.appendChild(scriptEl);
    }
  }, []);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const closeToast = () => setToast(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files || []);
    setUploadFiles((prev) => [...prev, ...files]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setUploadFiles((prev) => [...prev, ...files]);
    e.target.value = null;
  };

  const handleGoogleDriveUpload = async () => {
    openPicker({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      developerKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
      viewId: "DOCS",
      showUploadView: true,
      showUploadFolders: true,
      supportDrives: true,
      multiselect: true,
      callbackFunction: (data) => {
        if (data.action === "cancel") {
          console.log("User clicked cancel/close button");
        } else if (data.docs) {
          console.log("Google Drive selected:", data.docs);
          const googleFiles = data.docs.map((doc) => ({
            name: doc.name,
            size: doc.sizeBytes ? parseInt(doc.sizeBytes, 10) : 0,
            type: doc.mimeType || "application/octet-stream",
            googleId: doc.id,
          }));
          setUploadFiles((prev) => [...prev, ...googleFiles]);
          showToast("Google Drive files selected. Ready to upload.", "success");
        }
      },
    });
  };

  const handleDropboxUpload = () => {
    const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
    if (!appKey) {
      showToast(
        "Dropbox app key not configured. Please check your environment variables.",
        "error"
      );
      return;
    }
    if (dropboxLoading) {
      showToast(
        "Dropbox is still loading. Please wait a moment and try again.",
        "info"
      );
      return;
    }
    if (!window.Dropbox) {
      showToast(
        "Dropbox Chooser is not available. Please refresh the page and try again.",
        "error"
      );
      return;
    }
    try {
      window.Dropbox.choose({
        success: (files) => {
          const dropboxFiles = files.map((file) => ({
            name: file.name,
            size: file.bytes,
            type: file.link.split(".").pop() || "application/octet-stream",
            dropboxLink: file.link,
          }));
          setUploadFiles((prev) => [...prev, ...dropboxFiles]);
          showToast("Dropbox files selected. Ready to upload.", "success");
        },
        cancel: () => showToast("Dropbox upload cancelled.", "info"),
        linkType: "direct",
        multiselect: true,
        extensions: [],
      });
    } catch (error) {
      console.error("Dropbox Chooser error:", error);
      showToast(
        "Dropbox integration error. Please check your Dropbox app configuration.",
        "error"
      );
    }
  };

  const removeFile = (index) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const chunkSize = 10 * 1024 * 1024; // 10MB per chunk

  const uploadFilesHandler = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    const { encryptionKey, userId } = useEncryptionStore.getState();
    if (!encryptionKey || !userId) {
      showToast("Missing user ID or encryption key.", "error");
      setUploading(false);
      return;
    }
    const sodium = await getSodium();
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

    await Promise.all(
      uploadFiles.map(async (file) => {
        try {
          if (file.dropboxLink) {
            const response = await fetch(file.dropboxLink);
            if (!response.ok)
              throw new Error("Failed to download from Dropbox");
            const blob = await response.blob();
            file = new File([blob], file.name, { type: file.type });
          }
          if (file.googleId) {
            const token = authResponse?.access_token;
            if (!token)
              throw new Error(
                "Google API token missing. User may need to re-authenticate."
              );
            const response = await fetch(
              `https://www.googleapis.com/drive/v3/files/${file.googleId}?alt=media`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (!response.ok)
              throw new Error("Failed to fetch file from Google Drive");
            const blob = await response.blob();
            file = new File([blob], file.name, { type: file.type });
          }
          const startRes = await fetch(getFileApiUrl("/startUpload"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              userId,
              nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
              fileDescription: "",
              fileTags: ["personal"],
              path: "files",
            }),
          });
          if (!startRes.ok) throw new Error("Failed to start upload");
          const { fileId } = await startRes.json();
          const fileBuffer = new Uint8Array(await file.arrayBuffer());
          const ciphertext = sodium.crypto_secretbox_easy(
            fileBuffer,
            nonce,
            encryptionKey
          );
          const hashBuffer = await crypto.subtle.digest(
            "SHA-256",
            ciphertext.buffer
          );
          const fileHash = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          const totalChunks = Math.ceil(ciphertext.length / chunkSize);
          let uploadedChunks = 0;
          const chunkUploadPromises = Array.from(
            { length: totalChunks },
            (_, chunkIndex) => {
              const start = chunkIndex * chunkSize;
              const end = Math.min(start + chunkSize, ciphertext.length);
              const chunk = ciphertext.slice(start, end);
              const formData = new FormData();
              formData.append("fileId", fileId);
              formData.append("userId", userId);
              formData.append("fileName", file.name);
              formData.append(
                "fileType",
                file.type || "application/octet-stream"
              );
              formData.append("fileDescription", "");
              formData.append("fileTags", JSON.stringify(["personal use"]));
              formData.append("path", "files");
              formData.append("fileHash", fileHash);
              formData.append(
                "nonce",
                sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL)
              );
              formData.append("chunkIndex", chunkIndex.toString());
              formData.append("totalChunks", totalChunks.toString());
              formData.append("encryptedFile", new Blob([chunk]), file.name);
              return fetch(getFileApiUrl("/upload"), {
                method: "POST",
                body: formData,
              })
                .then((res) => {
                  if (!res.ok) throw new Error(`Chunk ${chunkIndex} failed`);
                  return res.json();
                })
                .then(() => {
                  uploadedChunks++;
                  setUploadProgress(
                    Math.round((uploadedChunks / totalChunks) * 100)
                  );
                });
            }
          );
          await Promise.all(chunkUploadPromises);
          console.log(`${file.name} uploaded successfully`);
          const token = localStorage.getItem("token");
          const res = await fetch(getApiUrl("/users/profile"), {
            headers: { Authorization: `Bearer ${token}` },
          });
          const result = await res.json();
          if (!res.ok)
            throw new Error(result.message || "Failed to fetch profile");
          await fetch(getFileApiUrl("/addAccesslog"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file_id: fileId,
              user_id: userId,
              action: "created",
              message: `User ${result.data.email} uploaded the file.`,
            }),
          });
        } catch (err) {
          console.error(`Upload failed for ${file.name}:`, err);
          showToast(`Upload failed for ${file.name}`, "error");
        }
      })
    );
    setUploading(false);
    setUploadFiles([]);
    setUploadProgress(0);
    fetchFiles();
  };

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
      if (data != null) {
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
            } catch { }
            allLogs.push({
              user: userName,
              avatar,
              action: log.action || "",
              file: file.fileName || "Unnamed File",
              timestamp: log.timestamp,
              dateFormatted: new Date(log.timestamp).toLocaleString(),
            });
          }
        } catch { }
      }
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setRecentAccessLogs(allLogs.slice(0, 5));
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
      if (data != null) {
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
        const sharedFiles = data.filter(file => {
          const tags = file.tags ? file.tags.replace(/[{}]/g, "").split(",").map(t => t.trim()) : [];
          return tags.includes("shared");
        });
        setFileCount(activeFiles.length);
        setTrashedFilesCount(deletedFiles.length);
        setReceivedFilesCount(receivedFiles.length);
        setSharedFileCount(sharedFiles.length);
      }
    } catch (error) {
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
      icon: <Users className="text-blue-600 dark:text-blue-400" size={28} />,
      label: "Shared with Me",
      value: receivedFilesCount,
    },
    {
      icon: (
        <TrashIcon className="text-blue-600 dark:text-blue-400" size={28} />
      ),
      label: "Trash",
      value: trashedFilesCount,
    }
  ];

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]">
          <div
            className={`flex items-center justify-between px-4 py-3 rounded shadow-lg w-80 text-sm ${
              toast.type === "error"
                ? "bg-red-500 text-white"
                : toast.type === "success"
                ? "bg-green-500 text-white"
                : "bg-gray-800 text-white"
            }`}
          >
            <span>{toast.message}</span>
            <button onClick={closeToast} className="ml-3">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <h1 className="text-2xl font-semibold mb-2 text-blue-500">
        Welcome, {user?.username}!
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-7">
        Here&apos;s an overview of your activity.
      </p>
      <input id="file-upload-input" type="file" hidden />

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* LEFT COLUMN — Notifications / Activity Logs */}
        <div className="flex flex-col gap-6 h-full">
          <div className="flex-1 p-4 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-md flex flex-col">
            <div className="flex gap-4 mb-3 border-b border-gray-300 dark:border-gray-700">
              <button
                onClick={() => setActiveTab("notifications")}
                className={`flex items-center gap-2 pb-2 text-sm font-semibold ${
                  activeTab === "notifications"
                    ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <ListCheckIcon className="w-5 h-5" />
                Notifications
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`flex items-center gap-2 pb-2 text-sm font-semibold ${
                  activeTab === "activity"
                    ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <AlertCircleIcon className="w-5 h-5" />
                Activity Logs
              </button>
            </div>
            <div
              className="p-4 space-y-4 text-sm text-gray-700 dark:text-gray-200"
              style={{ height: "500px" }}
            >
              {activeTab === "notifications" ? (
                notifications.length === 0 ? (
                  <p className="text-gray-500">No new notifications</p>
                ) : (
                  notifications
                    .slice(0, 5)
                    .map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm"
                      >
                        <ListCheckIcon className="w-6 h-6 mt-1 text-blue-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="leading-snug text-base">{n.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatTimestamp(n.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                )
              ) : recentAccessLogs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No recent activity.
                </p>
              ) : (
                recentAccessLogs
                  .slice(0, 5)
                  .map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm"
                    >
                      <UserAvatar
                        avatarUrl={user?.avatar_url}
                        username={user?.username}
                        size="w-8 h-8 flex-shrink-0"
                        alt="User Avatar"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-base">{log.user}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {log.action} <strong>{log.file}</strong> at{" "}
                          {log.dateFormatted}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — Upload & Recent Files */}
        <div className="flex flex-col gap-6 h-full">
          {/* Upload Section */}
          <div className="flex-1 p-6 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-md flex flex-col">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Upload Files
            </h2>
            <div
              className={`border-2 border-dashed p-6 text-center rounded-lg cursor-pointer ${
                dragActive
                  ? "border-blue-500 bg-blue-50 dark:bg-gray-700"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-gray-400 dark:text-gray-300 mx-auto mb-4" />
              <p className="text-sm mb-1 text-gray-700 dark:text-gray-200">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Supports bulk upload
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex justify-center gap-4 mt-4">
                <button
                  type="button"
                  onClick={handleGoogleDriveUpload}
                  className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 px-3 py-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                >
                  <Image
                    src="/img/google.png"
                    alt="Google Drive"
                    width={20}
                    height={20}
                    className="h-5 w-5"
                  />
                  Google Drive
                </button>
                <button
                  type="button"
                  onClick={handleDropboxUpload}
                  disabled={dropboxLoading}
                  className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 px-3 py-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Image
                    src="/img/dropbox.png"
                    alt="Dropbox"
                    width={20}
                    height={20}
                    className="h-5 w-5"
                  />
                  {dropboxLoading ? "Loading..." : "Dropbox"}
                </button>
              </div>
            </div>
            {uploadFiles.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto mt-4">
                {uploadFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-200">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {uploading && (
              <div className="space-y-1 mt-4">
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  Uploading... {uploadProgress}%
                </p>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded">
                  <div
                    className="h-2 bg-blue-500 rounded"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            {uploadFiles.length > 0 && (
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setUploadFiles([])}
                  className="border border-gray-300 dark:border-gray-600 px-4 py-2 rounded text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={uploading}
                >
                  Clear
                </button>
                <button
                  onClick={uploadFilesHandler}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-blue-400"
                  disabled={uploadFiles.length === 0 || uploading}
                >
                  {uploading ? "Uploading..." : `Upload (${uploadFiles.length})`}
                </button>
              </div>
            )}
          </div>

          {/* Recent Files */}
          <div className="flex-1 p-4 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              Recent Files
            </h2>
            <ul className="flex-1 bg-white dark:bg-gray-800 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto text-sm">
              {recentFiles.length === 0 ? (
                <li className="p-2 text-gray-500 dark:text-gray-400">
                  No recent files
                </li>
              ) : (
                recentFiles.map((file, index) => (
                  <li
                    key={index}
                    className="p-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-base text-gray-700 dark:text-gray-200 font-medium">
                        {file.fileName || file.name || "Unnamed File"}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
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
      {viewerFile && (
        <FullViewModal
          file={viewerFile}
          content={viewerContent}
          onClose={() => setViewerFile(null)}
        />
      )}
      {previewFile && (
        <PreviewDrawer
          file={previewFile}
          content={previewContent}
          onClose={() => setPreviewFile(null)}
          onOpenFullView={(file) => {
            setPreviewFile(null);
            handleOpenFullView(file);
          }}
          onSaveDescription={async (id, description) => {}}
        />
      )}
    </div>
  );
}