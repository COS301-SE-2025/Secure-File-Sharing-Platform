'use client';

import { useEffect,  useState } from 'react';
import { FileText, Users, Clock, Download, Share, Edit, Eye, Trash2, Undo2, TrashIcon, UploadCloud, ListCheckIcon, AlertCircleIcon} from 'lucide-react';
import axios from 'axios';
import {
  useEncryptionStore,
  getUserId,
} from "@/app/SecureKeyStorage";
//import { getSodium } from "@/app/lib/sodium";

export default function DashboardHomePage() {
  const [fileCount, setFileCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const userId = useEncryptionStore.getState().userId;//again use the actual user ID from the auth system
  // console.log("UserId is:", userId);
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

  useEffect(() => {
  const fetchFileCount = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/files/getNumberOFFiles', {
        userId,
      });

      const allFiles = response.data.files; // big number 
      const activeFiles = allFiles.filter(
         !file.tags.includes('deleted') || !file.tags.some(tag => tag.startsWith('deleted_time:'))); // deleted files filter 
      setFileCount(activeFiles.length);
    } catch (error) {
      console.error("Failed to fetch file count:", error.message);
    }
  };

  fetchFileCount();
}, [userId]);


useEffect(() => {
  const fetchRecentNotifications = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const profileRes = await fetch("http://localhost:5000/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const profileResult = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileResult.message || "Failed to fetch profile");

      const res = await axios.post('http://localhost:5000/api/notifications/get', {
        userId: profileResult.data.id,
      });

      if (res.data.success) {
        setNotifications(res.data.notifications.slice(0, 5)); // Just 5 most recent
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  fetchRecentNotifications();
}, []);


  useEffect(() => {
  const fetchTrashCount = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/files/getNumberOFFiles', {
        userId,
      });

      const allFiles = response.data.files; // big number 
      const activeFiles = allFiles.filter(
         file.tags.includes('deleted') || file.tags.some(tag => tag.startsWith('deleted_time:'))); // deleted files filter 
      setTrashCount(activeFiles.length);
    } catch (error) {
      console.error("Failed to fetch trash file count:", error.message);
    }
  };

  fetchTrashCount();
}, [userId]);

    const handleFileUpload = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const { encryptionKey, userId } = useEncryptionStore.getState();
      if (!encryptionKey || !userId) {
        alert("Missing user ID or encryption key.");
        return;
      }

      const sodium = await getSodium();
      const fileBuffer = new Uint8Array(await file.arrayBuffer());
      const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
      const ciphertext = sodium.crypto_secretbox(fileBuffer, nonce, encryptionKey);

      const formData = {
        userId,
        fileName: file.name,
        fileType: file.type,
        fileDescription: "User personal upload",
        fileTags: ["personal"],
        path: `files/${userId}`,
        fileContent: sodium.to_base64(ciphertext),
        nonce: sodium.to_base64(nonce),
      };

      try {
        const res = await fetch("http://localhost:5000/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok) throw new Error("Upload failed");
        alert("Upload successful");
      } catch (err) {
        console.error("Upload error:", err);
        alert("Upload failed");
      }
    };



  const iconMap = {
    downloaded: Download,
    shared: Share,
    edited: Edit,
    viewed: Eye,
    deleted: Trash2,
    created: Clock,
    restored: Undo2,
  };

useEffect(() => {
  const fetchRecentActivityLogs = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/files/getAccesslog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }), // or file_id depending on backend
      });

      if (!res.ok) throw new Error('Failed to fetch logs');

      const logs = await res.json();
      setActivityLogs(logs.slice(0, 5)); // show only latest 3
    } catch (err) {
      console.error('Error fetching logs:', err);
      setActivityLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  fetchRecentActivityLogs();
}, [userId]);


  const stats = [
    {
      icon: <FileText className="text-blue-600 dark:text-blue-400" size={28} />,
      label: 'My Files',
      value: fileCount,
    },
    {
      icon: <Users className="text-green-600 dark:text-green-400" size={28} />,
      label: 'Shared with Me',
      value: 68,
    },
    {
      icon: <TrashIcon className="text-purple-600 dark:text-purple-400" size={28} />,
      label: 'Trash',
      value: trashCount,
    },
    {
      icon: <UploadCloud className="text-blue-600 dark:text-blue-400" size={28} />,
      label: 'Upload',
      isUpload: true, // custom flag
    }

  ]
  

  const recentFiles = [
  { name: "report_Q3.pdf", date: "July 9, 2025" },
  { name: "design_sketch.fig", date: "July 8, 2025" },
  { name: "project_plan.docx", date: "July 5, 2025" },
];

  ;

 return (
  
  <div className="p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
    <h1 className="text-2xl font-semibold mb-2 text-blue-500">Welcome!</h1>
    <p className="text-gray-600 dark:text-gray-400 mb-7">
      Here&apos;s an overview of your activity.
    </p>

    {/* STATS GRID */}
    <input
  id="file-upload-input"
  type="file"
  hidden
  onChange={handleFileUpload}
/>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
       {stats.map((item, idx) => {
            const CardContent = (
              <>
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                  {item.icon}
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-500 dark:text-gray-400">{item.label}</p>
                  <p className="text-xl font-bold">{item.value}</p>
                </div>
              </>
            );

            return item.isUpload ? (
              <button
                key={idx}
                onClick={() => document.getElementById('file-upload-input')?.click()}
                //change the color of the upload container                  !                  !
                className="flex items-center gap-4 p-7 w-full text-left bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow transition-shadow"
              >
                {CardContent}
              </button>
            ) : (
              <div
                key={idx}
                className="flex items-center gap-4 p-7 bg-gray-200 dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                {CardContent}
              </div>
            );
          })}

    </div>

    <div className="flex justify-center">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 w-full max-w-10xl">

  {/* Notifications Box - Summarized */}
    <div className="h-60 w-full lg:col-span-2 p-6 flex flex-col justify-start bg-gray-200 dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
          <ListCheckIcon className="text-blue-600 dark:text-blue-400" size={28} />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-500 dark:text-gray-400">Notifications</p>
        </div>
      </div>

      <div className="overflow-y-auto space-y-2 pr-1 text-sm text-gray-700 dark:text-gray-200">
        {notifications.length === 0 ? (
          <p>No new notifications</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-2">
              <FileText className="w-4 h-4 mt-1 text-blue-500" />
              <div>
                <p className="leading-tight">{n.message}</p>
                <p className="text-xs text-gray-500">{formatTimestamp(n.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>

    {/* Activity Logs box - consistent styling */}
    <div className="h-60 w-full lg:col-span-2 p-6 flex flex-col justify-start bg-gray-200 dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
          <AlertCircleIcon className="text-green-600 dark:text-green-400" size={28} />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-500 dark:text-gray-400">Activity Logs</p>
        </div>
      </div>

      <div className="overflow-y-auto space-y-2 pr-2 text-sm text-gray-700 dark:text-gray-200">
        {loadingLogs ? (
          <p>Loading...</p>
        ) : activityLogs.length === 0 ? (
          <p>No recent activity.</p>
        ) : (
          activityLogs.slice(0, 3).map((log) => {
            const Icon = iconMap[log.action] || Clock;
            return (
              <div key={log.id} className="flex items-start gap-2">
                <Icon className="w-4 h-4 mt-1 text-gray-600 dark:text-gray-300" />
                <div>
                  <p className="text-sm leading-tight">{log.message}</p>
                  <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>

  </div>
</div>


    {/* RECENT FILES SECTION */}
  <div className="mt-12 max-w-5xl mx-auto">
    <h2 className="text-2xl  font-semibold text-gray-800 dark:text-white mb-4">Recent Files</h2>
    <ul className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
      {recentFiles.map((file, index) => (
        <li key={index} className="p-4 flex justify-between items-center">
          <div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-200">{file.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{file.date}</p>
          </div>
          <button className="text-blue-500 hover:underline text-sm">Open</button>
        </li>
      ))}
  </ul>
</div>
  </div>
  

);


}