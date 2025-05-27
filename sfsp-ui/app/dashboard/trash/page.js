'use client';

import { Trash2, Undo2 } from 'lucide-react';

const trashedFiles = [
  {
    name: 'Old_Report.pdf',
    size: '1.2 MB',
    deletedAt: '3 days ago',
  },
  {
    name: 'Draft_Plan.docx',
    size: '870 KB',
    deletedAt: '1 week ago',
  },
];

export default function TrashPage() {
  return (
    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-blue-500 ">Trash</h1>
        <p className="text-gray-600 dark:text-gray-400">Recently deleted files</p>
      </div>

      {trashedFiles.length === 0 ? (
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
            <thead className="bg-blue-300 dark:bg-gray-700 ">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">File Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Size</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Deleted</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {trashedFiles.map((file, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{file.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{file.size}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{file.deletedAt}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400">
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
      <br></br>
        <button
      type="button"
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      onClick={() => {
        //make reference to delete endpoint here 
        alert("Trash Files Cleared");
      }}
    > Clear Trash </button>
    </div>
  );
}
