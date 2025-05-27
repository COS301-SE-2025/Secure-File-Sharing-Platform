'use client';
import { FileText, Image as ImageIcon, MoreVertical } from 'lucide-react';

export default function FileCard({ file }) {
  const isImage = file.type === 'image';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative group">
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
          <MoreVertical size={16} className="text-gray-500" />
        </button>
      </div>
      <div className="flex flex-col items-center text-center">
        <div className="mb-3">
          <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${isImage ? 'bg-orange-100 dark:bg-orange-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
            {isImage ? <ImageIcon size={32} className="text-orange-600" /> : <FileText size={32} className="text-blue-600" />}
          </div>
        </div>
        <h3 className="font-medium text-gray-900 dark:text-white mb-1 text-sm">{file.name}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{file.size}</p>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>Shared by {file.sharedBy}</p>
          <p>{file.sharedTime}</p>
        </div>
      </div>
    </div>
  );
}
