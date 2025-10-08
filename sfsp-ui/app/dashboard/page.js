"use client";

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";

import {
  FileText,
  Users,
  TrashIcon,
  UploadCloud,
  ListCheckIcon,
  AlertCircleIcon 
} from 'lucide-react';

import { UploadDialog } from "./myFilesV2/uploadDialog";
import dynamic from "next/dynamic";

const FullViewModal = dynamic(() => import("./myFilesV2/fullViewModal").then(mod => ({ default: mod.FullViewModal })), {
  ssr: false,
  loading: () => <div>Loading...</div>
});
import { PreviewDrawer } from "./myFilesV2/previewDrawer";
import { useDashboardSearch } from "./components/DashboardSearchContext";

import { getSodium } from "@/app/lib/sodium";
import { useEncryptionStore } from "@/app/SecureKeyStorage";
import { UserAvatar } from '@/app/lib/avatarUtils';


function getFileType(mimeType, fileName = '') {
  if (mimeType.includes("folder")) return "folder";
  const normalizedMimeType = mimeType ? mimeType.toLowerCase() : '';
  const normalizedFileName = fileName ? fileName.toLowerCase() : '';

  const fileExtension = normalizedFileName.includes('.') 
    ? normalizedFileName.split('.').pop() 
    : '';

  if (normalizedMimeType) {
    if (normalizedMimeType.includes("pdf")) return "pdf";

    if (normalizedMimeType.includes("markdown") || normalizedMimeType.includes("x-markdown")) {
      return "markdown";
    }

    if (normalizedMimeType.includes("json")) return "json";
    if (normalizedMimeType.includes("csv")) return "csv";
    if (normalizedMimeType.includes("html")) return "html";

    if (normalizedMimeType.includes("image")) return "image";
    if (normalizedMimeType.includes("video")) return "video";
    if (normalizedMimeType.includes("audio")) return "audio";
    if (normalizedMimeType.includes("podcast")) return "podcast";

    if (normalizedMimeType.includes("zip") || normalizedMimeType.includes("rar")) return "archive";

    if (normalizedMimeType.includes("spreadsheet") || 
        normalizedMimeType.includes("excel") || 
        normalizedMimeType.includes("sheet")) return "excel";
    if (normalizedMimeType.includes("presentation")) return "ppt";
    if (normalizedMimeType.includes("word") || normalizedMimeType.includes("document")) return "word";

    if (normalizedMimeType.includes("code") || normalizedMimeType.includes("script")) return "code";

    if (normalizedMimeType.includes("text")) {
      if (fileExtension === 'md' || fileExtension === 'markdown') return "markdown";
      return "txt";
    }
    if (normalizedMimeType.includes("application")) return "application";
  }
  
  if (fileExtension) {
    switch (fileExtension) {
      case 'md':
      case 'markdown':
        return "markdown";
      case 'pdf':
        return "pdf";
      case 'json':
        return "json";
      case 'csv':
        return "csv";
      case 'html':
      case 'htm':
        return "html";
      case 'txt':
        return "txt";
        //programming languages
      case 'py':
        return "py";
      case 'java':
        return "java";
      case 'cpp':
        return "cpp";
      case 'c':
        return "c";
      case 'h':
        return "h";
      case 'cs':
        return "cs";
      case 'php':
        return "php";
      case 'rb':
        return "rb";
      case 'go':
        return "go";
      case 'rs':
        return "rs";
      case 'swift':
        return "swift";
      case 'kt':
        return "kt";
      case 'scala':
        return "scala";
      case 'r':
        return "r";
      case 'matlab':
        return "matlab";
      case 'pl':
        return "pl";
      case 'lua':
        return "lua";
      case 'css':
        return "css";
      case 'scss':
        return "scss";
      case 'sass':
        return "sass";
      case 'less':
        return "less"
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
      case 'image':
      case 'bmp':
      case 'tiff':
      case 'tif':
      case 'ico':
      case 'heic':
      case 'raw':
        return "image";
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'webm':
        return "video";
      case 'mp3':
      case 'wav':
      case 'flac':
        return "audio";
      case 'zip':
      case 'rar':
      case '7z':
        return "archive";
      case 'xlsx':
      case 'xls':
        return "excel";
      case 'pptx':
      case 'ppt':
        return "ppt";
      case 'docx':
      case 'doc':
        return "word";
        //database files
      case 'sql':
        return "sql";
      case 'db':
        return "db";
      case 'sqlite':
        return "sqlite";
      case 'mdb':
        return "mdb"
      case 'ods':
        return "ods";
      case 'odp':
        return "odp";
      case 'log':
        return "log";
      case 'readme':
        return "readme";
      case 'yaml':
        return "yaml";
      case 'yml':
        return "yml";
      case 'toml':
        return "toml";
      case 'ini':
        return "ini";
      case 'cfg':
        return "cfg";
      case 'conf':
        return "conf";
        //Archive files
        case 'archive':
          return "archive";
        case 'zip':
          return "zip";
        case 'rar':
          return "rar";
        case '7z':
          return "7z";
        case 'tar':
          return "tar";
        case 'gz':
          return "gz";
        case 'bz2':
          return "bz2";
        case 'xz':
          return "xz";
          //system files
        case 'exe':
          return "exe";
        case 'msi':
          return "msi";
        case 'deb':
          return 'deb';
        case 'rpm':
          return "rpm";
        case 'dmg':
          return "dmg";
        case 'iso':
          return "iso";
        case 'img':
          return "img";
          //security files
        case 'key':
          return "key";
        case 'pem':
          return "pem";
        case 'crt':
          return 'crt';
        case 'cert':
          return "cert";
          //email files
        case 'eml':
          return "eml";
        case 'msg':
          return "msg";
        //calender
        case 'ics':
          return "ics";
        //Adobe files
        case 'psd':
          return "psd";
        case 'ai':
          return "ai";
        case 'eps':
          return "eps";
        case 'indd':
          return "indd";
        //cad files
        case 'dwg':
          return "dwg";
        case 'dxf':
          return "dxf";
        //3D Model Files
        case 'obj':
          return "obj";
        case 'fbx':
          return "fbx";
        case 'blend':
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
    if (minutes < 1) return 'Just now';
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
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
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
  const [user, setUser] = useState(null); //watermark 



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
      const sortedFiles = data.sort(
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
          modified: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "",
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
  fetchFiles(); // Fetch when component mounts or userId changes
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
  fileId: file.fileId || file.id, // ✅ Ensure correct field
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
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(getApiUrl('/users/profile'), {
            headers: { Authorization: `Bearer ${token}` },
          });
  
          const result = await res.json();
          if (!res.ok) throw new Error(result.message || 'Failed to fetch profile');
  
          setUser(result.data);
        } catch (err) {
          console.error('Failed to fetch profile:', err.message);
        }
      };
  
      fetchProfile();
  }, []); 

  const handleOpenPreview = async (rawFile) => {
    const username = user?.username;
    const file = {
      ...rawFile,
      type: getFileType(rawFile.fileType || rawFile.type || "", rawFile.fileName),
      name: rawFile.fileName || rawFile.name,
      size: formatFileSize(rawFile.fileSize || rawFile.size || 0),
    };

    const result = await handleLoadFile(file);
    if (!result) return;

    let contentUrl = null;
    let textFull = null;

    if (file.type === "image") {
      if (typeof window === 'undefined') return;

      const imgBlob = new Blob([result.decrypted], { type: file.type });
      const imgBitmap = await createImageBitmap(imgBlob);

      const canvas = document.createElement("canvas");
      canvas.width = imgBitmap.width;
      canvas.height = imgBitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(imgBitmap, 0, 0);

      const fontSize = Math.floor(imgBitmap.width / 20);
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = "rgb(255, 0, 0, 0.4)"; // semi-transparent
      ctx.textAlign = "center";
      ctx.fillText(username, imgBitmap.width / 2, imgBitmap.height / 2);

      contentUrl = canvas.toDataURL(file.type);
    }

    else if (file.type === "pdf") {
      // PDF watermarking temporarily disabled - pdf-lib removed for SSR compatibility
      // Consider using server-side PDF processing or alternative approach
      contentUrl = URL.createObjectURL(new Blob([result.decrypted], { type: "application/pdf" }));
    } 
    
      
    else if (file.type === "video" || file.type === "audio") {
      contentUrl = URL.createObjectURL(new Blob([result.decrypted]));
    } 
    else if (["txt", "json", "csv"].includes(file.type)) {
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
       if (typeof window === 'undefined') return;

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
     }


     else if (file.type === "pdf") {
       contentUrl = URL.createObjectURL(new Blob([result.decrypted], { type: "application/pdf" }));
     } 
      else if (file.type === "video" || file.type === "audio") {
       contentUrl = URL.createObjectURL(new Blob([result.decrypted]));
     } 
     
     else if (["txt", "json", "csv"].includes(file.type)) {
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
      if (!profileRes.ok) throw new Error(profileResult.message || "Failed to fetch profile");

      try {
        const res = await axios.post(getApiUrl('/notifications/get'), {
          userId: profileResult.data.id,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setNotifications(res.data.notifications);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }

    } catch (err) {
      console.error("Failed to fetch user profile:", err.message);
    }
  };

  const markAsRead = async (id) => {
    try {
      const res = await axios.post(getApiUrl('/notifications/markAsRead'), { id });
      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const respondToShareRequest = async (id, status) => {
    try {
      const res = await axios.post(getApiUrl('/notifications/respond'), {
        id,
        status,
      });

      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, status, read: true } : n))
        );

        if (status === 'accepted' && res.data.fileData) {
          const fileData = res.data.fileData;
          await ReceiveFile(fileData);
        }
      }
    } catch (error) {
      console.error('Failed to respond to notification:', error);
    }
  };

  const clearNotification = async (id) => {
    try {
      const res = await axios.post(getApiUrl('/notifications/clear'), { id });
      if (res.data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (error) {
      console.error('Failed to clear notification:', error);
    }
  };

  const fetchRecentAccessLogs = async () => {
    try {
      const userId = useEncryptionStore.getState().userId;
      if (!userId) return [];

      // Fetch files
      const res = await fetch(getFileApiUrl("/metadata"), {
        method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      let files = await res.json();
      if (!Array.isArray(files)) files = [];

      // Filter out deleted files
    files = files.filter(f => {
        const tags = f.tags ? f.tags.replace(/[{}]/g, "").split(",") : [];
      return !tags.includes("deleted") && !tags.some(tag => tag.trim().startsWith("deleted_time:"));
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

          // Get user info
          let userName = "Unknown User";
          let avatar = "/default-avatar.png";
          try {
            const userRes = await fetch(getApiUrl(`/users/getUserInfo/${log.user_id}`));
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

      // Sort by timestamp and take top 3
      allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setRecentAccessLogs(allLogs.slice(0, 3));
    } catch (err) {
      console.error("Failed to fetch recent access logs:", err);
      setRecentAccessLogs([]);
    }
  };


  const fetchFilesMetadata = useCallback(async () => {
    try {
      const res = await fetch(getFileApiUrl('/metadata'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

     
      const data = await res.json();
       if (data != null){
        // Separate active and deleted files
        const activeFiles = data.filter(file => {
        const tags = parseTagString(file.tags);
        return !tags.includes('deleted');
        });

        const deletedFiles = data.filter(file => {
        const tags = parseTagString(file.tags);
        return tags.includes('deleted');
        });

        const receivedFiles = data.filter(file => {
        const tags = parseTagString(file.tags);
        return tags.includes("received");
        });

      
  
        setFileCount(activeFiles.length);
        setTrashedFilesCount(deletedFiles.length);
        setReceivedFilesCount(receivedFiles.length);
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
      fetchRecentAccessLogs()
    }
  }, [userId, fetchFilesMetadata, actionFilter]);

  const stats = [
    {
      icon: <FileText className="text-blue-600 dark:text-blue-400" size={28} />,
      label: 'My Files',
      value: fileCount,
    },
    {
      icon: <Users className="text-green-600 dark:text-green-400" size={28} />,
      label: 'Shared with Me',
      value: receivedFilesCount,
    },
    {
      icon: <TrashIcon className="text-purple-600 dark:text-purple-400" size={28} />,
      label: 'Trash',
      value: trashedFilesCount,
    },
    {
      icon: <UploadCloud className="text-blue-600 dark:text-blue-400" size={28} />,
      label: 'Upload',
      isUpload: true,
    }
  ];

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <h1 className="text-2xl font-semibold mb-2 text-blue-500">Welcome!</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-7">
        Here&apos;s an overview of your activity.
      </p>

      {/* Hidden File Upload Input */}
      <input id="file-upload-input" type="file" hidden />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((item, idx) => {
          const CardContent = (
            <>
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                {item.icon}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-500 dark:text-gray-400">
                  {item.label}
                </p>
                <p className="text-xl font-bold">{item.value}</p>
              </div>
            </>
          );

          return item.isUpload ? (
            <button
              key={idx}
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-4 p-7 w-full text-left
                         bg-blue-600 hover:bg-blue-700
                         text-white rounded-lg shadow transition-shadow"
            >
              {CardContent}
            </button>
          ) : (
            <div
              key={idx}
              className="flex items-center gap-4 p-7
                         bg-gray-200 dark:bg-gray-800
                         rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              {CardContent}
            </div>
          );
        })}
      </div>

      <UploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onUploadSuccess={fetchFiles}
      />

      {/* Notifications */}
      <div className="flex justify-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 w-full max-w-10xl">
          <div
            className="h-60 w-full lg:col-span-2 p-6 flex flex-col justify-start
                          bg-gray-200 dark:bg-gray-800 rounded-lg shadow hover:shadow-lg
                          transition-shadow overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                <ListCheckIcon
                  className="text-blue-600 dark:text-blue-400"
                  size={28}
                />
              </div>
              <p className="text-xl font-bold text-gray-500 dark:text-gray-400">
                Notifications
              </p>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 text-sm text-gray-700 dark:text-gray-200">
              {notifications.length === 0 ? (
                <p className="text-gray-500">No new notifications</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded"
                  >
                    <FileText className="w-4 h-4 mt-1 text-blue-500" />
                    <div className="flex-1">
                      <p className="leading-tight">{n.message}</p>
                      <p className="text-xs text-gray-500">
                        {formatTimestamp(n.timestamp)}
                      </p>

                      <div className="flex gap-2 mt-1">
                        {!n.read && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="text-xs text-blue-500 hover:underline"
                          >
                            Mark as Read
                          </button>
                        )}

                        {n.type === "share-request" && (
                          <>
                            <button
                              onClick={() =>
                                respondToShareRequest(n.id, "accepted")
                              }
                              className="text-xs text-green-500 hover:underline"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                respondToShareRequest(n.id, "declined")
                              }
                              className="text-xs text-red-500 hover:underline"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => clearNotification(n.id)}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Logs (Dynamic Data) */}
          <div
            className="h-60 w-full lg:col-span-2 p-6 flex flex-col justify-start
                        bg-gray-200 dark:bg-gray-800 rounded-lg shadow hover:shadow-lg
                        transition-shadow overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                <AlertCircleIcon
                  className="text-green-600 dark:text-green-400"
                  size={28}
                />
              </div>
              <p className="text-xl font-bold text-gray-500 dark:text-gray-400">
                Activity Logs
              </p>
            </div>

          <div className="overflow-y-auto space-y-2 pr-2 text-sm text-gray-700 dark:text-gray-200">
            {recentAccessLogs.length > 0 ? (
              recentAccessLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <img
                    src={log.avatar || "/default-avatar.png"}
                    alt={log.user}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold">{log.user}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {log.action} <strong>{log.file}</strong> at {log.date}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No recent activity.</p>
            )}
          </div>
        </div>

      </div>
    </div>



      {/* Recent Files */}
      <div className="mt-12 max-w-5xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
          Recent Files
        </h2>

        <ul className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
          {recentFiles.length === 0 ? (
            <li className="p-4 text-gray-500">No recent files</li>
          ) : (
            recentFiles.map((file, index) => (
              <li key={index} className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                    {file.fileName || file.name || "Unnamed File"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatTimestamp(file.date || file.createdAt)}
                  </p>
                </div>
              <button
                onClick={() => handleOpenPreview(file)}
                className="text-blue-500 hover:underline"
              >
                Open
              </button>

              </li>
            ))
          )}
        </ul>
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
          onSaveDescription={async (id, description) => {
            // console.log("Save description for:", id, description);
          }}
        />
      )}

    </div>
  )
};
