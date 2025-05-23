'use client';

import { useState } from 'react';
import { Folder, FileText, Upload, Search, MoreVertical } from 'lucide-react';

const files = [
  { name: 'Project Plan.pdf', type: 'file' },
  { name: 'Invoices', type: 'folder' },
  { name: 'Meeting Notes.txt', type: 'file' },
  { name: 'Capstone.txt', type: 'file' },
  { name: 'Designs', type: 'folder' },
];

export default function DashboardPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 p-6 shadow-md hidden md:block">
        <h1 className="text-2xl font-bold mb-8">SecureShare</h1>
        <nav className="space-y-4">
          <a href="#" className="block hover:text-blue-600">My Drive</a>
          <a href="#" className="block hover:text-blue-600">Shared with Me</a>
          <a href="#" className="block hover:text-blue-600">Recent</a>
          <a href="#" className="block hover:text-blue-600">Trash</a>
        </nav>
        <button className="mt-10 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md flex items-center justify-center gap-2">
          <Upload size={18} />
          Upload
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2 w-full max-w-md bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md">
            <Search size={18} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search your files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent focus:outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">S</div>
            <MoreVertical className="text-gray-500 dark:text-gray-300 cursor-pointer" />
          </div>
        </div>
        
      </main>
    </div>
  );
}
