import React from 'react';
import { FileIcon, Download, Share, Star, Folder, FileText, Image, Video, MoreVertical } from 'lucide-react';

export function FileList({ files, onShare, onViewDetails, onViewActivity }) {
  const iconMap = {
    folder: <Folder className="h-5 w-5 text-blue-500" />,
    pdf: <FileText className="h-5 w-5 text-red-500" />,
    document: <FileText className="h-5 w-5 text-red-500" />,
    image: <Image className="h-5 w-5 text-green-500" />,
    video: <Video className="h-5 w-5 text-purple-500" />,
  };

  const getIcon = (type) => iconMap[type] || <FileIcon className="h-5 w-5 text-gray-500" />;

  const handleDownload = (file) => console.log('Download', file.name);
  const handleDelete = (file) => console.log('Delete', file.name);

  return (
    <table className="w-full bg-white rounded-lg border">
      <thead>
        <tr>
          <th className="text-left p-2">Name</th>
          <th className="text-left p-2">Size</th>
          <th className="text-left p-2">Modified</th>
          <th className="text-left p-2">Status</th>
          <th className="text-left p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <tr key={file.id} className="hover:bg-gray-50 cursor-pointer">
            <td className="p-2 flex items-center gap-2" onClick={() => onViewDetails(file)}>
              {getIcon(file.type)}
              <span className="font-medium">{file.name}</span>
              {file.starred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
            </td>
            <td className="p-2">{file.size}</td>
            <td className="p-2">{file.modified}</td>
            <td className="p-2">
              {file.shared && <span className="px-1 py-0.5 text-xs bg-gray-200 rounded">Shared</span>}
            </td>
            <td className="p-2 flex gap-2">
              <button onClick={() => onShare(file)} title="Share">
                <Share className="h-4 w-4" />
              </button>
              <button onClick={() => handleDownload(file)} title="Download">
                <Download className="h-4 w-4" />
              </button>
              <button onClick={() => onViewActivity(file)} title="Activity">
                <MoreVertical className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(file)} title="Delete">
                <span className="text-red-500">🗑️</span>
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
