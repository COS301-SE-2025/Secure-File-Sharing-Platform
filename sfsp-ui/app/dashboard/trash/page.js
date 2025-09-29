// app/dashboard/trash

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, Undo2 } from 'lucide-react';
import { useEncryptionStore } from '@/app/SecureKeyStorage';
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";

function parseTagString(tagString = '') {
  return tagString.replace(/[{}]/g, '').split(',').map(t => t.trim());
}

export default function TrashPage() {
  const [trashedFiles, setTrashedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = useEncryptionStore.getState().userId;
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const [toast, setToast] = useState({ message: "", visible: false });

  const showToast = (message) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 3000);
  };

  const fetchTrashedFiles = useCallback(async () => {
    try {
      const res = await fetch(getFileApiUrl('/metadata'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      console.log(data);

      // const deletedFiles = data.filter(file => {
      //   const tags = parseTagString(file.tags);
      //   return tags.includes('deleted') && tags.some(tag => tag.startsWith('deleted_time:'));
      // });

      const deletedFiles = Array.isArray(data)
        ? data.filter(file => {
          const tags = parseTagString(file.tags);
          return tags.includes('deleted') && tags.some(tag => tag.startsWith('deleted_time:'));
        })
        : [];

      console.log(deletedFiles);

      const formatted = deletedFiles.map(file => {
        const tags = parseTagString(file.tags);
        const deletedTag = tags.find(tag => tag.startsWith('deleted_time:'));
        const deletedAt = deletedTag
          ? new Date(deletedTag.split(':').slice(1).join(':')).toLocaleString()
          : 'Unknown';

        return {
          id: file.fileId,
          name: file.fileName,
          size: `${(file.fileSize / 1024 / 1024).toFixed(2)} MB`,
          deletedAt,
        };
      });

      setTrashedFiles(formatted);
    } catch (err) {
      console.error('Failed to fetch trashed files:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleRestore = async (fileId) => {
    try {

      const res = await fetch(getFileApiUrl("/metadata"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      const file = data.find(f => f.fileId === fileId);

      if (!file || !file.tags) {
        throw new Error("File not found or missing tags");
      }

      const rawTags = file.tags;
      const tags = rawTags.replace(/[{}]/g, "").split(",").map(t => t.trim());

      const tagsToRemove = tags.filter(
        tag => tag === "deleted" || tag.startsWith("deleted_time:")
      );

      if (tagsToRemove.length === 0) {
        console.warn("No deletable tags found for file:", fileId);
        return;
      }

      await fetch(getFileApiUrl("/removeTags"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, tags: tagsToRemove }),
      });

      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const profileRes = await fetch(getApiUrl("/users/profile"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        const profileResult = await profileRes.json();
        if (!profileRes.ok) throw new Error(profileResult.message || "Failed to fetch profile");

        await fetch(getFileApiUrl("/addAccesslog"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_id: fileId,
            user_id: profileResult.data.id,
            action: "restored",
            message: `User ${profileResult.data.email} restored the file.`,
          }),
        });

      } catch (err) {
        console.error("Failed to fetch user profile:", err.message);
      }

      fetchTrashedFiles();
    } catch (err) {
      console.error("Restore failed:", err);
      showToast("Failed to restore file.");
    }
  };

  const handleDelete = async (fileId) => {
    const confirm = window.confirm("Are you sure you want to permanently delete this file?");
    if (!confirm) return;

    try {
      const res = await fetch(getFileApiUrl("/deleteFile"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: fileId, userId: userId }),
      });

      if (!res.ok) {
        throw new Error("Permanent deletion failed");
      }

      fetchTrashedFiles();
    } catch (err) {
      console.error("Delete failed:", err);
      showToast("Failed to permanently delete the file.");
    }
  };

  const handleClearTrash = async () => {
    // const confirm = window.confirm("Are you sure you want to permanently delete all files in the trash?");
    // if (!confirm) return;

    try {
      for (const file of trashedFiles) {
        const res = await fetch(getFileApiUrl("/deleteFile"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: file.id, userId }),
        });

        if (!res.ok) {
          console.warn(`Failed to delete file: ${file.name}`);
        }
      }

      location.reload();

    } catch (err) {
      console.error("Failed to clear trash:", err);
      showToast("An error occurred while clearing the trash.");
    }
  };


  useEffect(() => {
    fetchTrashedFiles();
  }, [fetchTrashedFiles]);

  return (
    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-blue-500">Trash</h1>
        <p className="text-gray-600 dark:text-gray-400">Recently deleted files</p>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : trashedFiles.length === 0 ? (
        <div className="text-center py-12">
          <Trash2 size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Trash is empty</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Deleted files will appear here temporarily before permanent removal.
          </p>
        </div>
      ) : (
        <div className="">
          <table className="w-full bg-white rounded-lg ">
            <thead className="bg-gray-300 dark:bg-gray-700">
              <tr>
                <th className="text-left p-2">File Name</th>
                <th className="text-left p-2">Size</th>
                <th className="text-left p-2"> Deleted</th>
                <th className="text-left p-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 dark:divide-gray-300 dark:bg-gray-200 dark:text-gray-900 ">
              {trashedFiles.map(file => (
                <tr key={file.id} className="hover:bg-gray-200 cursor-pointer dark:hover:bg-blue-100">
                  <td className="p-2">{file.name}</td>
                  <td className="p-2">{file.size}</td>
                  <td className="p-2">{file.deletedAt}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
                      onClick={() => handleRestore(file.id)}
                    >
                      <Undo2 size={16} />
                      Restore
                    </button>
                    <button
                      className="inline-flex items-center gap-1 text-sm text-red-600 hover:underline dark:text-red-400 pl-4"
                      onClick={() => handleDelete(file.id)}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <br />
      <button
        type="button"
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        onClick={() => setConfirmClearOpen(true)}
      >
        Clear Trash
      </button>
      {confirmClearOpen && (
        <div className="fixed inset-0 bg-black/50  flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Delete
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to permanently delete all files in the trash?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleClearTrash}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Yes, Delete All
              </button>
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 dark:bg-gray-700 dark:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
