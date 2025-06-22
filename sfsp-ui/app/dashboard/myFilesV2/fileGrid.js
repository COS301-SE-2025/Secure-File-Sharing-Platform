//app/dashboard/myFilesV2/fileGrid.js

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {FileIcon,Download,Share,Star,Folder,FileText,Image,Video,MoreVertical,} from 'lucide-react';

export function FileGrid({
  files,
  onShare,
  onViewDetails,
  onViewActivity,
  onDownload,
  onDelete,
}) {
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [menuFile, setMenuFile] = useState(null);
  const menuRef = useRef(null);

  const iconMap = {
    folder: <Folder className="h-8 w-8 text-blue-500" />,
    pdf: <FileText className="h-8 w-8 text-red-500" />,
    document: <FileText className="h-8 w-8 text-red-500" />,
    image: <Image className="h-8 w-8 text-green-500" alt=""/>,
    video: <Video className="h-8 w-8 text-purple-500" />,
  };

  const getIcon = (type) => iconMap[type] || <FileIcon className="h-8 w-8 text-gray-500" />;

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    setMenuPosition({ x: e.pageX, y: e.pageY });
    setMenuFile(file);
  };

  const handleClickOutside = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setMenuFile(null);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            onContextMenu={(e) => handleContextMenu(e, file)}
            className="relative group bg-white rounded-lg border border-gray-300 p-4 hover:shadow-lg transition-shadow cursor-pointer dark:bg-gray-200 dark:hover:bg-blue-100"
          >
            <div className="flex items-center justify-between mb-3">
              {getIcon(file.type)}
              <div className="flex items-center gap-1">
                {file.starred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                {file.shared && (
                  <span className="px-1 py-0.5 text-xs bg-gray-200 rounded">Shared</span>
                )}
              </div>
            </div>
            <h3
              className="font-medium text-gray-900 text-sm mb-1 truncate"
              title={file.name}
            >
              {file.name}
            </h3>
            <div className="text-xs text-gray-500 space-y-1">
              <p>{file.size}</p>
              <p>Modified {file.modified}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Menu */}
      {menuFile && (
        <div
          ref={menuRef}
          className="absolute z-50 bg-white border rounded-md shadow-lg w-48 text-sm dark:bg-gray-200 dark:text-gray-900"
          style={{ top: menuPosition.y, left: menuPosition.x }}
        >
          <button
            onClick={() => {
              onShare(menuFile);
              setMenuFile(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 dark:hover:bg-blue-200"
          >
            <Share className="h-4 w-4" /> Share
          </button>

          <button
            onClick={() => {
              onDownload(menuFile);
              setMenuFile(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 dark:hover:bg-blue-200"
          >
            <Download className="h-4 w-4" /> Download
          </button>

          <hr />

          <button
            onClick={() => {
              onViewDetails(menuFile);
              setMenuFile(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 dark:hover:bg-blue-200"
          >
            <FileIcon className="h-4 w-4" /> View Details
          </button>

          <button
            onClick={() => {
              onViewActivity(menuFile);
              setMenuFile(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 dark:hover:bg-blue-200"
          >
            <MoreVertical className="h-4 w-4" /> Activity Logs
          </button>

          <hr />

          <button
            onClick={() => {
              onDelete(menuFile);
              setMenuFile(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 dark:hover:bg-red-200 dark:text-red-600"
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
}
