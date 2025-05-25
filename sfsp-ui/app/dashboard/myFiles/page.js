'use client';

import { useState } from 'react';
import { Plus, UploadCloud, FolderPlus, FilePlus, MoreVertical, Share2 } from 'lucide-react';

const myFiles = [
  { name: 'Resume.pdf', size: '400 KB', type: 'pdf' },
  { name: 'Photos', size: '-', type: 'folder' },
  { name: 'Budget.xlsx', size: '1.2 MB', type: 'excel' },
];

export default function MyFilesPage() {
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState(null);

  return (
    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">My Files</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your personal files and folders</p>
        </div>
        <div className="relative flex gap-2">
          <div className="relative">
            <button
              onClick={() => {
                setShowUploadOptions(!showUploadOptions);
                setShowCreateOptions(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              <UploadCloud size={18} />
              Upload
            </button>
            {showUploadOptions && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md z-10">
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Upload File</button>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Upload Folder</button>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => {
                setShowCreateOptions(!showCreateOptions);
                setShowUploadOptions(false);
              }}
              className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              <Plus size={18} />
              Create
            </button>
            {showCreateOptions && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md z-10">
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Create File</button>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">Create Folder</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {myFiles.map((file, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow relative group">
            <div className="font-medium text-lg">{file.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{file.size}</div>

            <button
              onClick={() => setActiveMenuIndex(activeMenuIndex === idx ? null : idx)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <MoreVertical size={20} />
            </button>

            {activeMenuIndex === idx && (
              <div className="absolute top-10 right-3 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md z-10">
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                  <Share2 size={16} />
                  Share file
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
