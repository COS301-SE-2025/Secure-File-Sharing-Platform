//app/dashboard/trash

'use client';

import { useState, useEffect } from 'react';
import { Trash2, Undo2 } from 'lucide-react';
import { useEncryptionStore } from '@/app/SecureKeyStorage';

const fetchTrashedFiles = async () => {
  try {
    const res = await fetch("http://localhost:5000/api/files/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();

    const deletedFiles = data.filter(file =>
      Array.isArray(file.tags) &&
      file.tags.includes("deleted") &&
      file.tags.some(tag => tag.startsWith("deleted_time:"))
    );

    const formatted = deletedFiles.map(file => ({
      id: file.fileId,
      name: file.fileName,
      size: `${(file.fileSize / 1024 / 1024).toFixed(2)} MB`,
      deletedAt: file.tags.find(t => t.startsWith("deleted_time:"))?.split(":")[1] || "Unknown",
    }));

    setTrashedFiles(formatted);
  } catch (err) {
    console.error("Failed to fetch trashed files:", err);
  } finally {
    setLoading(false);
  }
};

export default function TrashPage() {
  const [trashedFiles, setTrashedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = useEncryptionStore.getState().userId;

  const handleRestore = async (fileId) => {
    try {
      await fetch("http://localhost:5000/api/files/removeTags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId,
          tags: ["deleted", `deleted_time:${new Date().toISOString()}`],
        }),
      });

      fetchTrashedFiles();
    } catch (err) {
      console.error("Restore failed:", err);
      alert("Failed to restore file.");
    }
  };

  useEffect(() => {
    fetchTrashedFiles();
  }, []);

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
        <div className="bg-gray-200 dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-blue-300 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">File Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Size</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Deleted</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {trashedFiles.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{file.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{file.size}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{file.deletedAt}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
                      onClick={() => handleRestore(file.id)}
                    >
                      <Undo2 size={16} />
                      Restore
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
        onClick={() => alert("Trash Files Cleared (not implemented yet)")}
      >
        Clear Trash
      </button>
    </div>
  );
}
