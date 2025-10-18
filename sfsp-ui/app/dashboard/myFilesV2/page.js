//app/dashboard/myFilesV2/page.js

"use client";

import React, { useState, useEffect } from "react";
import { Upload, FolderPlus, Grid, List, Route, ChevronDown} from "lucide-react";
import { ShareDialog } from "./shareDialog";
import { UploadDialog } from "./uploadDialog";
import { FileDetailsDialog } from "./fileDetailsDialog";
import { ActivityLogsDialog } from "./activityLogsDialog";
import { CreateFolderDialog } from "./createFolderDialog";
import { FileGrid } from "./fileGrid";
import { FileList } from "./fileList";
import { useDashboardSearch } from "../components/DashboardSearchContext";
import { useEncryptionStore } from "@/app/SecureKeyStorage";
import { getSodium } from "@/app/lib/sodium";
import { PreviewDrawer } from "./previewDrawer";
import dynamic from "next/dynamic";
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";


const FullViewModal = dynamic(
  () =>
    import("./fullViewModal").then((mod) => ({ default: mod.FullViewModal })),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  }
);
import { RevokeAccessDialog } from "./revokeAccessDialog";
import { ChangeShareMethodDialog } from "./changeShareMethodDialog";
//import Prism from 'prismjs';

//import fetchProfile from "../components/Sidebar"
import { formatDate } from "../../../lib/dateUtils";

function Toast({ message, type = "info", onClose }) {
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 pointer-events-none`}
    >
      <div
        className={`bg-green-500 border border-green-600 text-white rounded shadow-lg px-6 py-3 pointer-events-auto`}
      >
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-4 font-bold hover:bg-green-600 rounded px-1"
        >
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
  const [currentPath, setCurrentPath] = useState("");
  const [refreshFlag, setRefreshFlag] = useState(false);

  // Clipboard state for cut operations
  const [clipboard, setClipboard] = useState(null); // { file: file, operation: 'cut' }

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isRevokeAccessOpen, setIsRevokeAccessOpen] = useState(false);
  const [isChangeMethodOpen, setIsChangeMethodOpen] = useState(false);

  const [previewContent, setPreviewContent] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [viewerFile, setViewerFile] = useState(null);
  const [viewerContent, setViewerContent] = useState(null);

  const [toast, setToast] = useState(null);

  const [user, setUser] = useState(null);

  const [dragOverCrumb, setDragOverCrumb] = useState(null);

  const [showSortOptions, setShowSortOptions] = useState(false);

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

  const normalizePath = (path) =>
    path?.startsWith("files/") ? path.slice(6) : path || "";

  const isDirectChild = (rawPath) => {
    const filePath = normalizePath(rawPath);
    const base = currentPath || "";

    if (base === "") {
      return !filePath.includes("/");
    }

    const expectedPrefix = base.endsWith("/") ? base : base + "/";
    if (!filePath.startsWith(expectedPrefix)) return false;

    const remainder = filePath.slice(expectedPrefix.length);
    return remainder !== "" && !remainder.includes("/");
  };

  const filteredVisibleFiles = files.filter((file) => {
    const name = file?.name?.toLowerCase() || "";
    const path = normalizePath(file?.path);
    const keyword = (search || "").toLowerCase();

    return (
      name.includes(keyword) &&
      path?.startsWith(currentPath || "") &&
      isDirectChild(path)
    );
  });

  const isViewOnly = (file) => {
    console.log("Checking if file is view-only:", file);
    let tags = [];
    if (file.tags) {
      if (Array.isArray(file.tags)) {
        tags = file.tags;
      } else if (typeof file.tags === "string") {
        tags = file.tags.replace(/[{}]/g, "").split(",");
      }
    }

    return tags.includes("view-only") || file.viewOnly;
  };

  const fetchFiles = async () => {
    try {
      const userId = useEncryptionStore.getState().userId;
      if (!userId) {
        console.error("Cannot fetch files: Missing userId in store.");
        return;
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
        return;
      }

      if (!Array.isArray(data)) {
        data = [];
      }

      const formatted = data
        .filter((f) => {
          const tags = f.tags ? f.tags.replace(/[{}]/g, "").split(",") : [];
          return (
            !tags.includes("deleted") &&
            !tags.some((tag) => tag.trim().startsWith("deleted_time:"))
          );
        })
        .map((f) => {
          const tags = f.tags ? f.tags.replace(/[{}]/g, "").split(",") : [];
          const isViewOnlyFile = tags.includes("view-only");
          const isFolder = !f.fileType || f.fileType.toLowerCase() === "folder";

          return {
            id: f.fileId || "",
            name: f.fileName || "Unnamed file",
            sizeBytes: f.fileSize || 0,
            size: f.fileSize || 0,
            type: getFileType(f.fileType || "", f.fileName),
            description: f.description || "",
            path: f.cid || "",
            modified: f.createdAt ? formatDate(f.createdAt) : "",
            modifiedRaw: f.createdAt || "",  
            shared: false,
            starred: false,
            viewOnly: isViewOnlyFile,
            tags,
            allow_view_sharing: f.allow_view_sharing || false,
            isFolder,
          };
        });

      const sorted = formatted.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });

      console.log("Sorted files:", sorted);
      setFiles(sorted);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

    const sortFilesBasedOnDate = () => {
      setFiles([...files].sort((a, b) => new Date(b.modifiedRaw) - new Date(a.modifiedRaw)));
    };
  
    const sortFilesBasedOnName = () => {
      setFiles([...files].sort((a, b) => a.name.localeCompare(b.name)));
    };
  
    const sortFilesBasedOnSize = () => {
      setFiles([...files].sort((a, b) => a.size - b.size));
    }
  
    const handleAscendingSort = () => {
      setFiles([...files].reverse());
    };
  
    const handleDescendingSort = () => {
      setFiles([...files].reverse());
    };
    

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleKeyDown = (e) => {
      console.log(
        "Key pressed:",
        e.key,
        "Ctrl:",
        e.ctrlKey || e.metaKey,
        "Target:",
        e.target.tagName
      );

      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.contentEditable === "true" ||
        e.target.isContentEditable
      ) {
        console.log("Ignoring - user is in input field");
        return;
      }

      const ctrlPressed = e.ctrlKey || e.metaKey;

      if (ctrlPressed) {
        console.log("Ctrl+Key detected:", e.key);

        switch (e.key.toLowerCase()) {
          case "c": 
            e.preventDefault();
            if (selectedFile) {
              setClipboard({ file: selectedFile, operation: "cut" });
            } else {
              console.log("No file selected to cut");
            }
            break;

          case "v":
            e.preventDefault();
            if (clipboard?.file) {
              const fileToMove = clipboard.file;
              const destinationPath = currentPath;

              handleMoveFile(fileToMove, destinationPath)
                .then(() => {
                  setClipboard(null);
                  fetchFiles();
                })
                .catch((error) => {
                  console.error("Paste error:", error);
                  showToast("Failed to move file", "error", 2000);
                });
            } else {
              console.log("Nothing in clipboard to paste");
              showToast("Nothing to paste", "info", 1500);
            }
            break;

          case "d":
            e.preventDefault();
            setIsCreateFolderOpen(true);
            break;

          case "u":
            e.preventDefault();
            setIsUploadOpen(true);
            break;

          case "1":
            e.preventDefault();
            setViewMode("grid");
            break;

          case "2":
            e.preventDefault();
            setViewMode("list");
            break;

          default:
            break;
        }
      } else {
        switch (e.key) {
          case "Delete":
            e.preventDefault();
            if (selectedFile) {
              const fileToDelete = selectedFile;
              const timestamp = new Date().toISOString();
              const tags = ["deleted", `deleted_time:${timestamp}`];

              fetch(getFileApiUrl("/addTags"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId: fileToDelete.id, tags }),
              })
                .then((res) => {
                  if (!res.ok) throw new Error("Failed to tag file as deleted");
                  console.log("File deleted successfully");
                  setSelectedFile(null);
                  fetchFiles();
                })
                .catch((err) => {
                  console.error("Delete failed:", err);
                  showToast("Failed to delete file", "error", 2000);
                });
            } else {
              console.log("No file selected to delete");
            }
            break;

          case "Enter":
            e.preventDefault();
            console.log("Enter pressed, selected file:", selectedFile);
            if (selectedFile) {
              if (selectedFile.type === "folder" || selectedFile.isFolder) {
                const newPath = currentPath
                  ? `${currentPath}/${selectedFile.name}`
                  : selectedFile.name;
                setCurrentPath(newPath);
                setSelectedFile(null);
              } else {
                handlePreview(selectedFile);
              }
            } else {
              console.log("No file selected to open");
            }
            break;

          case "Backspace":
            if (currentPath) {
              e.preventDefault();
              const parentPath = currentPath.split("/").slice(0, -1).join("/");
              setCurrentPath(parentPath);
              setSelectedFile(null);
            }
            break;

          case "Escape":
            e.preventDefault();
            setSelectedFile(null);
            setPreviewFile(null);
            setViewerFile(null);
            break;

          default:
            break;
        }
      }
    };

    console.log("Keyboard shortcuts mounted");
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      console.log("Keyboard shortcuts unmounted");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedFile, clipboard, currentPath]);

  const handleDelete = async (file) => {
    const timestamp = new Date().toISOString();
    const tags = ["deleted", `deleted_time:${timestamp}`];

    try {
      const res = await fetch(getFileApiUrl("/addTags"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, tags }),
      });

      if (!res.ok) {
        throw new Error("Failed to tag file as deleted");
      }

      console.log(`File ${file.name} marked as deleted`);
      fetchFiles();
    } catch (err) {
      console.error("Delete failed:", err);
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
        headers: { "Content-Type": "application/json" },
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

      // Convert to stream reader
      const reader = res.body.getReader();
      const chunks = [];
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        totalLength += value.length;
      }

      // Merge chunks into single Uint8Array
      const encryptedFile = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        encryptedFile.set(chunk, offset);
        offset += chunk.length;
      }

      // Decrypt the file
      const decrypted = sodium.crypto_secretbox_open_easy(
        encryptedFile,
        nonce,
        encryptionKey
      );
      if (!decrypted) throw new Error("Decryption failed");

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fileId: file.id,
        }),
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access has been revoked or expired");
        }
        throw new Error("Failed to load file");
      }

      const nonceBase64 = res.headers.get("X-Nonce");
      const fileName = res.headers.get("X-File-Name");
      if (!nonceBase64 || !fileName) {
        throw new Error("Missing nonce or fileName in response headers");
      }

      const nonce = sodium.from_base64(
        nonceBase64,
        sodium.base64_variants.ORIGINAL
      );

      // Use streaming reader to reduce memory spikes
      const reader = res.body.getReader();
      const chunks = [];
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.length;
      }

      // Merge all chunks into single Uint8Array
      const encryptedFile = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        encryptedFile.set(chunk, offset);
        offset += chunk.length;
      }

      // Decrypt file
      const decrypted = sodium.crypto_secretbox_open_easy(
        encryptedFile,
        nonce,
        encryptionKey
      );
      if (!decrypted) throw new Error("Decryption failed");

      //const decompressed = pako.ungzip(decrypted);
      return { fileName, decrypted };
    } catch (err) {
      console.error("Load file error:", err);
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
    // Ensure this only runs on the client side
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
    } else if (file.type === "pdf") {
      // PDF watermarking temporarily disabled - pdf-lib removed for SSR compatibility
      // Consider using server-side PDF processing or alternative approach
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

      //Add watermark comment for code files
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
    }

    //Markdown files, render this bitch as an html
    else if (file.type === "markdown" || file.type === "md") {
      const markdownText = new TextDecoder().decode(result.decrypted);

      //Add watermark to markdown
      const watermarkMarkdown = `> **Viewed by: ${username}**\n\n`;
      textFull = watermarkMarkdown + markdownText;
    }

    setPreviewContent({ url: contentUrl, text: textFull });
    setPreviewFile(file);
  };

  //Helper function to get appropriate comment syntax for watermarking code files
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

      // watermark text
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
    } else if (file.type === "pdf") {
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

  const handleUpdateDescription = async (fileId, description) => {
    try {
      const res = await fetch(getFileApiUrl("/addDescription"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId, description }),
      });
      fetchFiles(); // Refresh files after update
      if (res.status === 200) {
        console.log("Description updated successfully");
      }
      if (!res.ok) {
        throw new Error("Failed to update description");
      }
    } catch (err) {
      console.error("Error updating description:", err);
    }
  };

  const handleMoveFile = async (file, destinationFolderPath) => {
    const fullPath = destinationFolderPath
      ? `files/${destinationFolderPath}/${file.name}`
      : `files/${file.name}`;

    const res = await fetch(getFileApiUrl("/updateFilePath"), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileId: file.id, newPath: fullPath }),
    });

    if (res.ok) {
      fetchFiles();
    } else {
      showToast("Failed to move file", "error");
    }
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

  const handleChangeShareMode = (file) => {
    setSelectedFile(file);
    setIsChangeMethodOpen(true);
  };

  const openRevokeAccessDialog = (file) => {
    setSelectedFile(file);
    setIsRevokeAccessOpen(true);
  };

  const renderBreadcrumbs = () => {
    const segments = currentPath ? currentPath.split("/") : [];
    const crumbs = [
      { name: "All files", path: "" },
      ...segments.map((seg, i) => ({
        name: seg,
        path: segments.slice(0, i + 1).join("/"),
      })),
    ];

    const currentDirName = segments[segments.length - 1] || "All files";

    const handleDrop = async (e, targetPath) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverCrumb(null);

      try {
        const draggedData = e.dataTransfer.getData("application/json");

        if (!draggedData) {
          console.warn("No drag data found in dataTransfer");
          return;
        }

        const draggedFile = JSON.parse(draggedData);
        console.log("Parsed dragged file:", draggedFile);

        if (!draggedFile || !draggedFile.id) {
          console.warn("Invalid dragged file data");
          return;
        }

        const currentFilePath = normalizePath(draggedFile.path);
        const currentFileDir = currentFilePath.includes("/")
          ? currentFilePath.substring(0, currentFilePath.lastIndexOf("/"))
          : "";

        if (currentFileDir === targetPath) {
          showToast("File is already in this location", "info");
          return;
        }

        await handleMoveFile(draggedFile, targetPath);
        await fetchFiles();
      } catch (error) {
        console.error("Move failed:", error);
        showToast("Failed to move file", "error");
      }
    };

    const handleDragOver = (e, crumbPath) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setDragOverCrumb(crumbPath);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverCrumb(null);
    };

    return (
      <div className="mb-6">
        {/* Breadcrumbs */}
        <nav className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          {crumbs.map((crumb, i) => (
            <span key={crumb.path || "root"}>
              <button
                onClick={() => setCurrentPath(crumb.path)}
                onDragOver={(e) => handleDragOver(e, crumb.path)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, crumb.path)}
                className={`hover:underline hover:text-blue-600 transition-colors px-2 py-1 rounded ${
                  dragOverCrumb === crumb.path
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold"
                    : ""
                }`}
              >
                {crumb.name || "All files"}
              </button>
              {i < crumbs.length - 1 && <span className="mx-1">/</span>}
            </span>
          ))}
        </nav>

        {/* Current Folder */}
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentDirName}
          </h1>
        </div>
      </div>
    );
  };

  return (
    <div className=" bg-gray-50 p-6 dark:bg-gray-900">
      <div className=" ">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-blue-500 ">My Files</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and organize your files
            </p>
            <div className="text-xs text-gray-500 mt-1">
              <span className="font-medium">Shortcuts:</span> Ctrl+C/V • Del • Enter • Backspace • Ctrl+D/U • Ctrl+1/2
            </div>
          </div>

          {/* View + Sort Toggle */}
        <div className="flex items-center gap-4 relative">
          <div className="flex items-center bg-white rounded-lg border p-1 dark:bg-gray-200 relative z-50">
            {/* Grid Button */}
            <button
              className={`px-3 py-1 rounded ${
                viewMode === "grid"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-300"
              }`}
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </button>

            {/* List Button */}
            <button
              className={`px-3 py-1 rounded ${
                viewMode === "list"
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-300"
              }`}
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </button>

            {/* Sort Button with Dropdown */}
            <div className="relative">
              <button
                className="px-3 py-1 rounded flex items-center gap-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-300"
                onClick={() => setShowSortOptions((prev) => !prev)}
              >
                Sort
                <ChevronDown className="h-3 w-3" />
              </button>

              {showSortOptions && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border rounded-lg shadow-lg z-50 dark:bg-gray-100">
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 dark:text-black"
                    onClick={() => { sortFilesBasedOnDate(); setShowSortOptions(false); }}
                  >
                    Sort by Date
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 dark:text-black"
                    onClick={() => { sortFilesBasedOnName(); setShowSortOptions(false); }}
                  >
                    Sort by Name
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 dark:text-black"
                    onClick={() => { sortFilesBasedOnSize(); setShowSortOptions(false); }}
                  >
                    Sort by Size
                  </button>
                  <hr className="border-gray-200 dark:border-gray-400" />
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 dark:text-black"
                    onClick={() => { handleAscendingSort(); setShowSortOptions(false); }}
                  >
                    Ascending
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 dark:text-black"
                    onClick={() => { handleDescendingSort(); setShowSortOptions(false); }}
                  >
                    Descending
                  </button>
                </div>
              )}
            </div>
          </div>
            {/* Create Folder & Upload buttons */}
            <button
              onClick={() => setIsCreateFolderOpen(true)}
              className="flex items-center gap-2 px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 dark:bg-gray-200 dark:text-gray-900"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Create Folder</span>
            </button>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Files</span>
            </button>
          </div>
        </div>

        {renderBreadcrumbs()}

        {/*File */}
        {filteredVisibleFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center text-gray-700 dark:text-gray-500  rounded-lg p-10">
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
            <p className="text-sm text-gray-400">
              Upload or create folders to get started
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <FileGrid
            files={filteredVisibleFiles}
            onShare={openShareDialog}
            onViewDetails={openDetailsDialog}
            onViewActivity={openActivityDialog}
            onDownload={handleDownload}
            onDelete={fetchFiles}
            onRevokeAccess={openRevokeAccessDialog}
            onChangeShareMode={() => setIsChangeMethodOpen(true)}
            onClick={handlePreview}
            onDoubleClick={handleOpenFullView}
            onMoveFile={handleMoveFile}
            onEnterFolder={(folderName) =>
              setCurrentPath(
                currentPath ? `${currentPath}/${folderName}` : folderName
              )
            }
            currentPath={currentPath}
            onGoBack={() =>
              setCurrentPath(currentPath.split("/").slice(0, -1).join("/"))
            }
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        ) : (
          <FileList
            files={filteredVisibleFiles}
            onShare={openShareDialog}
            onViewDetails={openDetailsDialog}
            onViewActivity={openActivityDialog}
            onDownload={handleDownload}
            onDelete={fetchFiles}
            onRevokeAccess={openRevokeAccessDialog}
            onChangeShareMode={handleChangeShareMode}
            onClick={handlePreview}
            onDoubleClick={handleOpenFullView}
            onMoveFile={handleMoveFile}
            onEnterFolder={(folderName) =>
              setCurrentPath(
                currentPath ? `${currentPath}/${folderName}` : folderName
              )
            }
            currentPath={currentPath}
            onGoBack={() =>
              setCurrentPath(currentPath.split("/").slice(0, -1).join("/"))
            }
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        )}

        {/* Dialogs */}
        <RevokeAccessDialog
          open={isRevokeAccessOpen}
          onOpenChange={setIsRevokeAccessOpen}
          file={selectedFile}
        />
        <ChangeShareMethodDialog
          open={isChangeMethodOpen}
          onOpenChange={setIsChangeMethodOpen}
          file={selectedFile}
        />
        <UploadDialog
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          onUploadSuccess={fetchFiles}
          currentFolderPath={currentPath}
        />
        <CreateFolderDialog
          open={isCreateFolderOpen}
          onOpenChange={setIsCreateFolderOpen}
          currentPath={currentPath}
          onFolderCreated={fetchFiles}
        />
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
