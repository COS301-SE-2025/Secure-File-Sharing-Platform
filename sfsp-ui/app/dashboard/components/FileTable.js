'use client';
import { FileText, Image as ImageIcon, MoreVertical } from 'lucide-react';

export default function FileTable({ files }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['Name', 'Size', 'Shared by', 'Shared', 'Actions'].map((header, i) => (
                <th key={i} className={`px-6 py-3 text-${i === 4 ? 'right' : 'left'} text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {files.map((file, idx) => (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <td className="px-6 py-4 whitespace-nowrap flex items-center">
                  <div className={`w-8 h-8 rounded flex items-center justify-center mr-3 ${file.type === 'image' ? 'bg-orange-100 dark:bg-orange-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                    {file.type === 'image' ? <ImageIcon size={16} className="text-orange-600" /> : <FileText size={16} className="text-blue-600" />}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{file.size}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{file.sharedBy}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{file.sharedTime}</td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600">
                    <MoreVertical size={16} className="text-gray-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
