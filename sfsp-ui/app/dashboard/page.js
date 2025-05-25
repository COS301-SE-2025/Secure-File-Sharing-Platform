'use client';

import { useState } from 'react';
import { Folder, FileText, Upload, Search, MoreVertical, Grid3X3, Clock, Users, Settings, Trash2 } from 'lucide-react';
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
      <aside className="w-64 bg-white text-gray-900 dark:bg-gray-800 dark:text-white p-6 shadow-md hidden md:block relative">
            {/* Logo and Title */}
            <div className="flex items-center gap-3 mb-8">
                <Image src="/img/shield-emp-black.png" alt="SecureShare Logo Light" width={28} height={28} className="block dark:hidden" />
                <Image src="/img/shield-emp-white.png" alt="SecureShare Logo Dark" width={28} height={28} className="hidden dark:block" />
                <span className="text-xl font-bold tracking-tight">SecureShare</span>
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
                <a href="/dashboard" className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 transition-colors">
                <Grid3X3 size={20} />
                <span>Dashboard</span>
                </a>
                <a href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <FileText size={20} />
                <span>My Files</span>
                </a>
                <a href="/sharedWithMe" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Users size={20} />
                <span>Shared with Me</span>
                </a>
                <a href="/accessLogs" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Clock size={20} />
                <span>Access Logs</span>
                </a>
                <a href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Trash2 size={20} />
                <span>Trash</span>
                </a>
            </nav>

            {/* User Profile at Bottom */}
            <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
                    JD
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">John Doe</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">johndoe@gmail.com</div>
                </div>
                </div>
                <a href="#" className="flex items-center gap-3 p-3 mt-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Settings size={20} />
                <span>Settings</span>
                </a>
            </div>
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
