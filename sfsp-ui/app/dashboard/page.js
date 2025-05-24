'use client';

import { useState } from 'react';
import { Folder, FileText, Upload, Search, MoreVertical } from 'lucide-react';
import Image from 'next/image';

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
      <aside className="w-64 bg-white text-gray-900 dark:bg-gray-800 dark:text-white p-6 shadow-md hidden md:block">
        <div className="flex items-center gap-3">
          <Image src="/img/shield-emp-black.png" alt="SecureShare Logo Light" width={28} height={28} className="block dark:hidden" />
          <Image src="/img/shield-emp-white.png" alt="SecureShare Logo Dark" width={28} height={28} className="hidden dark:block" />
          <span className="text-xl font-bold tracking-tight">SecureShare</span>
        </div>


        <nav className="space-y-4">
          <a href="#" className="block hover:text-blue-600 dark:hover:text-blue-400">
            My Drive
          </a>
          <a href="#" className="block hover:text-blue-600 dark:hover:text-blue-400">
            Shared with Me
          </a>
          <a href="#" className="block hover:text-blue-600 dark:hover:text-blue-400">
            Recent
          </a>
          <a href="#" className="block hover:text-blue-600 dark:hover:text-blue-400">
            Trash
          </a>
        </nav>

        
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

        {/* File Grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {files
            .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
            .map((file, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow hover:shadow-lg transition">
                <div className="flex items-center gap-3 mb-3">
                  {file.type === 'folder' ? (
                    <Folder size={32} className="text-yellow-500" />
                  ) : (
                    <FileText size={32} className="text-blue-500" />
                  )}
                  <div className="text-sm font-medium">{file.name}</div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {file.type === 'folder' ? 'Folder' : 'File'}
                </div>
              </div>
            ))}
        </div>

      </main>
    </div>
  );
}
