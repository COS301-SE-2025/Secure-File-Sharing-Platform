"use client";

import React, { useState, useEffect, useRef } from "react";
import { Grid, List, ChevronDown } from "lucide-react";
import { ShareDialog } from "../myFilesV2/shareDialog";
import { FileDetailsDialog } from "../myFilesV2/fileDetailsDialog";
import { ActivityLogsDialog } from "../myFilesV2/activityLogsDialog";
import { FileGrid } from "./fileGrid2";
import { FileList } from "./fileList2";
import { useDashboardSearch } from "../components/DashboardSearchContext";
import { useEncryptionStore } from "@/app/SecureKeyStorage";
import { getSodium } from "@/app/lib/sodium";
import { PreviewDrawer } from "../myFilesV2/previewDrawer";
import dynamic from "next/dynamic";
import pako from "pako";
import { formatDate } from "../../../lib/dateUtils";
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";

const FullViewModal = dynamic(
  () =>
    import("../myFilesV2/fullViewModal").then((mod) => ({
      default: mod.FullViewModal,
    })),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);

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
      //programming languages
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
      //database files
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
      //Archive files
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
      //system files
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
      //security files
      case "key":
        return "key";
      case "pem":
        return "pem";
      case "crt":
        return "crt";
      case "cert":
        return "cert";
      //email files
      case "eml":
        return "eml";
      case "msg":
        return "msg";
      //calender
      case "ics":
        return "ics";
      //Adobe files
      case "psd":
        return "psd";
      case "ai":
        return "ai";
      case "eps":
        return "eps";
      case "indd":
        return "indd";
      //cad files
      case "dwg":
        return "dwg";
      case "dxf":
        return "dxf";
      //3D Model Files
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

function getCookie(name) {
  if (typeof window === "undefined") return "";
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(name + "="))
    ?.split("=")[1];
}

const csrf = typeof window !== "undefined" ? getCookie("csrf_token") : "";

export default function MyFiles() {
  const [files, setFiles] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedFile, setSelectedFile] = useState(null);
  const { search } = useDashboardSearch();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [viewerFile, setViewerFile] = useState(null);
  const [viewerContent, setViewerContent] = useState(null);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);
  const [sortOptions, setSortOptions] = useState({
    byDate: false,
    byName: true, // Default sort
    bySize: false,
    ascending: true,
  });
  const sortDropdownRef = useRef(null);

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  const filteredVisibleFiles = files.filter((file) => {
    const name = file?.name?.toLowerCase() || "";
    const keyword = (search || "").toLowerCase();
    return name.includes(keyword);
  });

  const isViewOnly = (file) => {
    let tags = [];
    if (file.tags) {
      if (Array.isArray(file.tags)) tags = file.tags;
      else if (typeof file.tags === "string")
        tags = file.tags.replace(/[{}]/g, "").split(",");
    }
    return tags.includes("view-only") || file.viewOnly;
  };

  const fetchFiles = async () => {
    try {
      const userId = useEncryptionStore.getState().userId;
      if (!userId) return;

      const res = await fetch(getFileApiUrl("/metadata"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf": csrf || "" },
        body: JSON.stringify({ userId }),
      });

      let data = await res.json();
      if (!Array.isArray(data)) data = [];

      const formatted = data
        .filter((f) => {
          const tags = f.tags ? f.tags.replace(/[{}]/g, "").split(",") : [];
          return (
            !tags.includes("deleted") &&
            !tags.some((tag) => tag.trim().startsWith("deleted_time:")) &&
            (tags.includes("view-only") ||
              tags.includes("shared") ||
              tags.includes("received"))
          );
        })
        .map((f) => {
          const tags = f.tags ? f.tags.replace(/[{}]/g, "").split(",") : [];
          return {
            id: f.fileId || "",
            name: f.fileName || "Unnamed file",
            size: f.fileSize || 0,
            type: getFileType(f.fileType || "", f.fileName),
            description: f.description || "",
            path: f.cid || "",
            modified: f.createdAt ? formatDate(f.createdAt) : "",
            modifiedRaw: f.createdAt || "",
            starred: false,
            viewOnly: tags.includes("view-only"),
            tags,
            allow_view_sharing: f.allow_view_sharing || false,
          };
        });

      const sorted = applySort(formatted);
      setFiles(sorted);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };

  const applySort = (filesToSort) => {
    let sortedFiles = [...filesToSort];

    // Apply sort by type
    if (sortOptions.byDate) {
      sortedFiles.sort((a, b) => new Date(b.modifiedRaw) - new Date(a.modifiedRaw));
    } else if (sortOptions.byName) {
      sortedFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    } else if (sortOptions.bySize) {
      sortedFiles.sort((a, b) => a.size - b.size);
    }

    // Apply ascending/descending
    if (!sortOptions.ascending) {
      sortedFiles.reverse();
    }

    return sortedFiles;
  };

  const handleSortChange = (option) => {
    setSortOptions((prev) => {
      const newOptions = { ...prev };
      if (option === "reset") {
        return {
          byDate: false,
          byName: true,
          bySize: false,
          ascending: true,
        };
      }
      if (option === "ascending") {
        newOptions.ascending = !newOptions.ascending;
      } else {
        newOptions.byDate = option === "byDate" ? !newOptions.byDate : false;
        newOptions.byName = option === "byName" ? !newOptions.byName : false;
        newOptions.bySize = option === "bySize" ? !newOptions.bySize : false;
        // Ensure at least one sort option is selected
        if (!newOptions.byDate && !newOptions.byName && !newOptions.bySize) {
          newOptions.byName = true;
        }
      }
      return newOptions;
    });
    setFiles(applySort(files));
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setShowSortOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleUpdateDescription = async (fileId, description) => {
    try {
      const res = await fetch(getFileApiUrl("/addDescription"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf": csrf || "",
        },
        body: JSON.stringify({ fileId, description }),
      });
      fetchFiles();
      if (!res.ok) {
        throw new Error("Failed to update description");
      }
    } catch (err) {
      console.error("Error updating description:", err);
    }
  };

  const handleDownload = async (file) => {
    if (isViewOnly(file)) {
      showToast("This file is view-only and cannot be downloaded.", "error");
      return;
    }

    const { encryptionKey, userId } = useEncryptionStore.getState();
    if (!encryptionKey) {
      showToast("Missing encryption key", "error");
      return;
    }

    const sodium = await getSodium();

    try {
      const res = await fetch(getFileApiUrl("/download"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf": csrf || "" },
        body: JSON.stringify({ userId, fileId: file.id }),
      });

      if (!res.ok) throw new Error("Download failed");

      const nonceBase64 = res.headers.get("X-Nonce");
      const fileName = res.headers.get("X-File-Name");
      if (!nonceBase64 || !fileName)
        throw new Error("Missing nonce or filename");

      const nonce = sodium.from_base64(
        nonceBase64,
        sodium.base64_variants.ORIGINAL
      );

      const reader = res.body.getReader();
      const chunks = [];
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.length;
      }

      const encryptedFile = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        encryptedFile.set(chunk, offset);
        offset += chunk.length;
      }

      const decrypted = sodium.crypto_secretbox_open_easy(
        encryptedFile,
        nonce,
        encryptionKey
      );
      if (!decrypted) throw new Error("Decryption failed");

      if (typeof window === "undefined") return;

      const blob = new Blob([decrypted]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      showToast("Download failed", "error");
    }
  };

  const handleLoadFile = async (file) => {
    const { encryptionKey, userId } = useEncryptionStore.getState();
    if (!encryptionKey) {
      showToast("Missing encryption key", "error");
      return null;
    }

    const sodium = await getSodium();

    try {
      const res = await fetch(getFileApiUrl("/download"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf": csrf || "" },
        body: JSON.stringify({ userId, fileId: file.id }),
      });

      if (!res.ok) {
        if (res.status === 403)
          throw new Error("Access has been revoked or expired");
        throw new Error("Failed to load file");
      }

      const nonceBase64 = res.headers.get("X-Nonce");
      const fileName = res.headers.get("X-File-Name");
      if (!nonceBase64 || !fileName)
        throw new Error("Missing nonce or fileName in response headers");

      const nonce = sodium.from_base64(
        nonceBase64,
        sodium.base64_variants.ORIGINAL
      );

      const reader = res.body.getReader();
      const chunks = [];
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.length;
      }

      const encryptedFile = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        encryptedFile.set(chunk, offset);
        offset += chunk.length;
      }

      const decrypted = sodium.crypto_secretbox_open_easy(
        encryptedFile,
        nonce,
        encryptionKey
      );
      if (!decrypted) throw new Error("Decryption failed");

      return { fileName, decrypted };
    } catch (err) {
      console.error("Load file error:", err);
      showToast("Failed to load file: " + err.message, "error");
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
  

  const handlePreview = async (rawFile) => {
    if (typeof window === "undefined") return;

    const username = user?.username;
    const file = {
      ...rawFile,
      type: getFileType(
        rawFile.fileType || rawFile.type || "",
        rawFile.fileName || rawFile.name
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

      //watermark text
      const fontSize = Math.floor(imgBitmap.width / 20);
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
      ctx.textAlign = "center";
      ctx.fillText(username, imgBitmap.width / 2, imgBitmap.height / 2);
      
      //watermark logo 
      const logo = new window.Image();
      logo.src = "/img/secureshare-logo.png"; 

      await new Promise((resolve) => {
        logo.onload = () => {
          const logoWidth = imgBitmap.width / 5;
          const logoHeight = (logo.height / logo.width) * logoWidth;
          const x = (imgBitmap.width - logoWidth)/2
          const y = (imgBitmap.height - logoHeight)/2

          ctx.globalAlpha = 0.7;
          ctx.drawImage(logo, x, y, logoWidth, logoHeight);
          ctx.globalAlpha = 1.0;

          resolve();
        };

        logo.onerror = () => {
          console.warn("Failed to load logo");
          resolve();
        };
      });
      contentUrl = canvas.toDataURL(file.type);
    }else if (file.type === "pdf") {
      contentUrl = URL.createObjectURL(
        new Blob([result.decrypted], { type: "application/pdf" })
      );
    } else if (file.type === "video" || file.type === "audio") {
      contentUrl = URL.createObjectURL(new Blob([result.decrypted]));
    } else if (
      [
        "txt",
        "json",
        "csv",
        "xml",
        "yaml",
        "yml",
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
        "sql",
        "log",
        "ini",
        "cfg",
        "conf",
      ].includes(file.type)
    ) {
      textFull = new TextDecoder().decode(result.decrypted);

      if (
        [
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
        ].includes(file.type)
      ) {
        const watermarkComment = getWatermarkComment(file.type, username);
        textFull = watermarkComment + "\n" + textFull;
      }
    } else if (file.type === "markdown" || file.type === "md") {
      const markdownText = new TextDecoder().decode(result.decrypted);
      const watermarkMarkdown = `> **Viewed by: ${username}**\n\n`;
      textFull = watermarkMarkdown + markdownText;
    }

    setPreviewContent({ url: contentUrl, text: textFull });
    setPreviewFile(file);
  };

  const getWatermarkComment = (fileType, username) => {
    const timestamp = new Date().toLocaleString();

    const commentStyles = {
      js: `/* Viewed by: ${username} on ${timestamp} */`,
      jsx: `/* Viewed by: ${username} on ${timestamp} */`,
      ts: `/* Viewed by: ${username} on ${timestamp} */`,
      tsx: `/* Viewed by: ${username} on ${timestamp} */`,
      java: `/* Viewed by: ${username} on ${timestamp} */`,
      cpp: `/* Viewed by: ${username} on ${timestamp} */`,
      c: `/* Viewed by: ${username} on ${timestamp} */`,
      css: `/* Viewed by: ${username} on ${timestamp} */`,
      py: `# Viewed by: ${username} on ${timestamp}`,
      rb: `# Viewed by: ${username} on ${timestamp}`,
      sql: `-- Viewed by: ${username} on ${timestamp}`,
      php: `<?php /* Viewed by: ${username} on ${timestamp} */ ?>`,
      html: `<!-- Viewed by: ${username} on ${timestamp} -->`,
      go: `// Viewed by: ${username} on ${timestamp}`,
      rs: `// Viewed by: ${username} on ${timestamp}`,
    };

    return (
      commentStyles[fileType] || `// Viewed by: ${username} on ${timestamp}`
    );
  };

  const handleOpenFullView = async (file) => {
    const username = user?.username;

    if (file.type === "folder") {
      setPreviewContent({
        url: null,
        text: "This is a folder. Double-click to open.",
      });
      setPreviewFile(file);
      return;
    }

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

      //watermark text
      const fontSize = Math.floor(imgBitmap.width / 20);
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
      ctx.textAlign = "center";
      ctx.fillText(username, imgBitmap.width / 2, imgBitmap.height / 2);
      
      //watermark logo 
      const logo = new window.Image();
      logo.src = "/img/secureshare-logo.png"; 

      await new Promise((resolve) => {
        logo.onload = () => {
          const logoWidth = imgBitmap.width / 5;
          const logoHeight = (logo.height / logo.width) * logoWidth;
          const x = (imgBitmap.width - logoWidth)/2
          const y = (imgBitmap.height - logoHeight)/2

          ctx.globalAlpha = 0.7;
          ctx.drawImage(logo, x, y, logoWidth, logoHeight);
          ctx.globalAlpha = 1.0;

          resolve();
        };

        logo.onerror = () => {
          console.warn("Failed to load logo");
          resolve();
        };
      });
      contentUrl = canvas.toDataURL(file.type);
    }else if (file.type === "pdf") {
      contentUrl = URL.createObjectURL(
        new Blob([result.decrypted], { type: "application/pdf" })
      );
    } else if (file.type === "video" || file.type === "audio") {
      contentUrl = URL.createObjectURL(new Blob([result.decrypted]));
    } else if (
      [
        "txt",
        "json",
        "csv",
        "xml",
        "yaml",
        "yml",
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
        "sql",
        "log",
        "ini",
        "cfg",
        "conf",
      ].includes(file.type)
    ) {
      textFull = new TextDecoder().decode(result.decrypted);

      if (
        [
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
        ].includes(file.type)
      ) {
        const watermarkComment = getWatermarkComment(file.type, username);
        textFull = watermarkComment + "\n" + textFull;
      }
    } else if (file.type === "markdown" || file.type === "md") {
      const markdownText = new TextDecoder().decode(result.decrypted);
      const watermarkMarkdown = `> **Viewed by: ${username}**\n\n`;
      textFull = watermarkMarkdown + markdownText;
    }

    setViewerContent({ url: contentUrl, text: textFull });
    setViewerFile(file);
  };

  const openShareDialog = (file) => {
    setSelectedFile(file);
    setIsShareOpen(true);
  };
  const openDetailsDialog = (file) => {
    setSelectedFile(file);
    setIsDetailsOpen(true);
  };
  const openActivityDialog = (file) => {
    setSelectedFile(file);
    setIsActivityOpen(true);
  };

  const handleRevokeViewAccess = async (file) => {
    try {
      const profileRes = await fetch(getApiUrl("/users/profile"));

      const profileResult = await profileRes.json();
      if (!profileRes.ok)
        return showToast("Failed to get user profile", "error");

      const userId = profileResult.data.id;

      const sharedFilesRes = await fetch(getFileApiUrl("/getViewAccess"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!sharedFilesRes.ok)
        return showToast("Failed to get shared files", "error");

      const sharedFiles = await sharedFilesRes.json();
      const fileShares = sharedFiles.filter(
        (share) => share.file_id === file.id
      );

      if (fileShares.length === 0)
        return showToast("No view-only shares found for this file", "error");

      for (const share of fileShares) {
        const revokeRes = await fetch(getFileApiUrl("/revokeViewAccess"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: file.id,
            userId,
            recipientId: share.recipient_id,
          }),
        });

        if (!revokeRes.ok)
          console.error(
            `Failed to revoke access for recipient ${share.recipient_id}`
          );
      }

      showToast("View access revoked successfully", "success");
      fetchFiles();
    } catch (err) {
      console.error("Error revoking view access:", err);
      showToast("Failed to revoke view access", "error");
    }
  };

  return (
    <div className="bg-gray-50/0 p-6 dark:bg-gray-900">
      <div>
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-blue-500">Shared with me</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Files that have been shared with you
            </p>
          </div>

          {/* View + Sort Toggle */}
          <div className="flex items-center gap-4 relative">
            <div className="flex items-center bg-white rounded-lg border p-1 dark:bg-gray-200 relative z-10">
              {/* Grid Button */}
              <button
                className={`px-3 py-1 rounded ${viewMode === "grid"
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-300"
                  }`}
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </button>

              {/* List Button */}
              <button
                className={`px-3 py-1 rounded ${viewMode === "list"
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-300"
                  }`}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </button>

              {/* Sort Button with Dropdown */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  className="px-3 py-1 rounded flex items-center gap-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-300"
                  onClick={() => setShowSortOptions((prev) => !prev)}
                >
                  Sort
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showSortOptions && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border rounded-lg shadow-lg z-50 dark:bg-gray-100 p-2">
                    <label className="flex items-center px-4 py-2 hover:bg-gray-100 text-gray-700 dark:text-black">
                      <input
                        type="checkbox"
                        checked={sortOptions.byDate}
                        onChange={() => handleSortChange("byDate")}
                        className="mr-2 appearance-none h-4 w-4 border border-gray-400 rounded-sm checked:bg-blue-500 checked:border-blue-600 checked:ring-1 checked:ring-gray-600"
                      />
                      Sort by Date
                    </label>
                    <label className="flex items-center px-4 py-2 hover:bg-gray-100 text-gray-700 dark:text-black">
                      <input
                        type="checkbox"
                        checked={sortOptions.byName}
                        onChange={() => handleSortChange("byName")}
                        className="mr-2 appearance-none h-4 w-4 border border-gray-400 rounded-sm checked:bg-blue-500 checked:border-blue-600 checked:ring-1 checked:ring-gray-600"
                      />
                      Sort by Name
                    </label>
                    <label className="flex items-center px-4 py-2 hover:bg-gray-100 text-gray-700 dark:text-black">
                      <input
                        type="checkbox"
                        checked={sortOptions.bySize}
                        onChange={() => handleSortChange("bySize")}
                        className="mr-2 appearance-none h-4 w-4 border border-gray-400 rounded-sm checked:bg-blue-500 checked:border-blue-600 checked:ring-1 checked:ring-gray-600"
                      />
                      Sort by Size
                    </label>
                    <hr className="border-gray-200 dark:border-gray-400 my-1" />
                    <label className="flex items-center px-4 py-2 hover:bg-gray-100 text-gray-700 dark:text-black">
                      <input
                        type="checkbox"
                        checked={sortOptions.ascending}
                        onChange={() => handleSortChange("ascending")}
                        className="mr-2 appearance-none h-4 w-4 border border-gray-400 rounded-sm checked:bg-blue-500 checked:border-blue-600 checked:ring-1 checked:ring-gray-600"
                      />
                      Ascending
                    </label>
                    <button
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 dark:text-black"
                      onClick={() => handleSortChange("reset")}
                    >
                      Reset to Default
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* File List */}
        {filteredVisibleFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center text-gray-700 dark:text-gray-400 rounded-lg p-10">
            <svg
              className="w-16 h-16 mb-4 text-gray-500 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7l1.664-1.664A2 2 0 016.586 5H17.41a2 2 0 011.414.586L21 7m-18 0v10a2 2 0 002 2h14a2 2 0 002-2V7m-18 0h18"
              />
            </svg>
            <h2 className="text-lg font-semibold">No files found</h2>
            <p className="text-sm text-gray-400">Get sharing ...</p>
          </div>
        ) : viewMode === "grid" ? (
          <FileGrid
            files={filteredVisibleFiles}
            onShare={openShareDialog}
            onViewDetails={openDetailsDialog}
            onViewActivity={openActivityDialog}
            onDownload={handleDownload}
            onDelete={fetchFiles}
            onRevokeViewAccess={handleRevokeViewAccess}
            onClick={handlePreview}
            onDoubleClick={handleOpenFullView}
          />
        ) : (
          <FileList
            files={filteredVisibleFiles}
            onShare={openShareDialog}
            onViewDetails={openDetailsDialog}
            onViewActivity={openActivityDialog}
            onDownload={handleDownload}
            onDelete={fetchFiles}
            onRevokeViewAccess={handleRevokeViewAccess}
            onClick={handlePreview}
            onDoubleClick={handleOpenFullView}
          />
        )}

        {/* Dialogs */}
        <ShareDialog
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
          file={selectedFile}
        />
        <FileDetailsDialog
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          file={selectedFile}
        />
        <ActivityLogsDialog
          open={isActivityOpen}
          onOpenChange={setIsActivityOpen}
          file={selectedFile}
        />
        <PreviewDrawer
          file={previewFile}
          content={previewContent}
          onClose={setPreviewFile}
          onOpenFullView={handleOpenFullView}
          onSaveDescription={handleUpdateDescription}
        />
        <FullViewModal
          file={viewerFile}
          content={viewerContent}
          onClose={setViewerFile}
        />

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
}
