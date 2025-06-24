// app/dashboard/trash

'use client';

import { useState, useEffect } from 'react';
import { Trash2, Undo2 } from 'lucide-react';
import { useEncryptionStore } from '@/app/SecureKeyStorage';

function parseTagString(tagString = '') {
  return tagString.replace(/[{}]/g, '').split(',').map(t => t.trim());
}

export default function TrashPage() {
  const [trashedFiles, setTrashedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = useEncryptionStore.getState().userId;

  const fetchTrashedFiles = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/files/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      console.log(data);

      const deletedFiles = data.filter(file => {
        const tags = parseTagString(file.tags);
        return tags.includes('deleted') && tags.some(tag => tag.startsWith('deleted_time:'));
      });

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
  };

  const handleRestore = async (fileId) => {
    try {

      const res = await fetch("http://localhost:5000/api/files/metadata", {
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

      await fetch("http://localhost:5000/api/files/removeTags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, tags: tagsToRemove }),
      });

      fetchTrashedFiles();
    } catch (err) {
      console.error("Restore failed:", err);
      alert("Failed to restore file.");
    }
  };


  useEffect(() => {
    fetchTrashedFiles();
  },[]);

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
        onClick={() => alert('Trash Files Cleared (not implemented yet)')}
      >
        Clear Trash
      </button>
    </div>
  );
}
