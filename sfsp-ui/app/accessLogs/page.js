'use client';

import { useState } from 'react';
import { Grid3X3, FileText, Users, Clock, Trash2, Settings, Search, Eye, Download, Share2, Edit, Bell, Plus } from 'lucide-react';
import Image from 'next/image';


const logs = [
    { user: 'John Smith', email: 'john@example.com', action: 'viewed', file: 'Project Proposal.docx', date: 'Today at 10:15 AM' },
    { user: 'Jane Cooper', email: 'jane@example.com', action: 'downloaded', file: 'Q4 Financial Report.pdf', date: 'Today at 9:22 AM' },
    { user: 'Robert Fox', email: 'robert@example.com', action: 'shared', file: 'Logo Design.png', date: 'Yesterday at 4:30 PM' },
    { user: 'John Smith', email: 'john@example.com', action: 'modified', file: 'Meeting Notes.txt', date: 'Yesterday at 2:15 PM' },
];

export function ActionButtons() {
        return (
            <div className="flex items-center gap-3">
            {/* Notification Button */}
            <button className="relative w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Add Button */}
            <button className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center">
                <Plus className="h-5 w-5" />
            </button>
            </div>
        );
    }

export default function AccessLogsPage() {
    const [dateFilter, setDateFilter] = useState('Last 7 days');
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('All actions');

    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
        {/* Sidebar */}
        <aside className="w-64 bg-white text-gray-900 dark:bg-gray-800 dark:text-white p-6 shadow-md hidden md:block relative">
            <div className="flex items-center gap-3 mb-8">
            <Image src="/img/shield-emp-black.png" alt="SecureShare Logo Light" width={28} height={28} className="block dark:hidden" />
            <Image src="/img/shield-emp-white.png" alt="SecureShare Logo Dark" width={28} height={28} className="hidden dark:block" />
            <span className="text-xl font-bold tracking-tight">SecureShare</span>
            </div>

            <nav className="space-y-2">
            <a href="/dashboard" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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
            <a href="/accessLogs" className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 transition-colors">
                <Clock size={20} />
                <span>Access Logs</span>
            </a>
            <a href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Trash2 size={20} />
                <span>Trash</span>
            </a>
            </nav>

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

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
            {/* Top Bar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-2 w-full max-w-md bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md">
                <Search size={18} className="text-gray-500" />
                <input
                type="text"
                placeholder="Search files and folders"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-sm placeholder-gray-500"
                />
            </div>
            <div className="flex items-center gap-3">
                <ActionButtons />
            </div>
            </div>

            {/* Access Logs Section */}
            <div className="p-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h1 className="text-2xl font-bold mb-2">Access Logs</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Monitor who accessed, modified, or shared your files
                </p>

                {/* Filters */}
                <div className="flex items-center justify-between mb-4">
                <div className="flex gap-3">
                    <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="bg-gray-100 dark:bg-gray-700 text-sm px-3 py-2 rounded-md focus:outline-none"
                    >
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>All time</option>
                    </select>
                    <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="bg-gray-100 dark:bg-gray-700 text-sm px-3 py-2 rounded-md focus:outline-none"
                    >
                    <option>All actions</option>
                    <option>Viewed</option>
                    <option>Downloaded</option>
                    <option>Shared</option>
                    <option>Modified</option>
                    </select>
                </div>
                <button className="border border-gray-300 dark:border-gray-600 text-sm px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                    Export logs
                </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-300 dark:border-gray-700">
                        <th className="py-3">User</th>
                        <th className="py-3">Action</th>
                        <th className="py-3">File</th>
                        <th className="py-3">Date</th>
                    </tr>
                    </thead>
                    <tbody>
                    {logs
                        .filter(log => actionFilter === 'All actions' || log.action === actionFilter.toLowerCase())
                        .filter(log => {
                            const searchLower = search.toLowerCase();
                            return (
                            log.user.toLowerCase().includes(searchLower) ||
                            log.email.toLowerCase().includes(searchLower) ||
                            log.action.toLowerCase().includes(searchLower) ||
                            log.file.toLowerCase().includes(searchLower) ||
                            log.date.toLowerCase().includes(searchLower)
                            );
                        })
                        .map((log, idx) => (
                        <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-4 flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
                                {log.user[0]}
                            </div>
                            <div>
                                <div className="font-medium">{log.user}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{log.email}</div>
                            </div>
                            </td>
                            <td className="py-4">
                                <div className="flex items-center gap-2">
                                    {log.action === 'viewed' && (
                                    <>
                                        <Eye size={16} className="text-gray-500" />
                                        <span>Viewed</span>
                                    </>
                                    )}
                                    {log.action === 'downloaded' && (
                                    <>
                                        <Download size={16} className="text-blue-500" />
                                        <span>Downloaded</span>
                                    </>
                                    )}
                                    {log.action === 'shared' && (
                                    <>
                                        <Share2 size={16} className="text-green-500" />
                                        <span>Shared</span>
                                    </>
                                    )}
                                    {log.action === 'modified' && (
                                    <>
                                        <Edit size={16} className="text-yellow-500" />
                                        <span>Modified</span>
                                    </>
                                    )}
                                </div>
                            </td>
                            <td className="py-4">{log.file}</td>
                            <td className="py-4 text-gray-500 dark:text-gray-400">{log.date}</td>
                        </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
            </div>
        </main>
        </div>
    );
}