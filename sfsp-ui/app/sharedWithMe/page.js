'use client';

import { useState } from 'react';
import { FileText, Image as ImageIcon, Search, MoreVertical, Grid3X3, List, Clock, Users, Settings, Trash2, Bell, Plus } from 'lucide-react';
import Image from 'next/image';

const sharedFiles = [
    {
        name: 'Strategy.docx',
        size: '2.3 MB',
        sharedBy: 'John Cooper',
        sharedTime: '2 days ago',
        type: 'document'
    },
    {
        name: 'Roadmap.xlsx',
        size: '1.8 MB', 
        sharedBy: 'Robert Fox',
        sharedTime: '5 days ago',
        type: 'document'
    },
    {
        name: 'Banner.png',
        size: '850 KB',
        sharedBy: 'Emily Wilson',
        sharedTime: '1 week ago',
        type: 'image'
    },
    {
        name: 'Presentation.pptx',
        size: '5.7 MB',
        sharedBy: 'Michael Brown',
        sharedTime: '2 weeks ago',
        type: 'document'
    }
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

    export default function SharedWithMePage() {
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('grid');

    const filteredFiles = sharedFiles.filter(file => 
        file.name.toLowerCase().includes(search.toLowerCase()) ||
        file.sharedBy.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
            <aside className="w-64 bg-white text-gray-900 dark:bg-gray-800 dark:text-white p-6 shadow-md hidden md:block relative">
            {/* Logo and Title */}
            <div className="flex items-center gap-3 mb-8">
                <Image src="/img/shield-emp-black.png" alt="SecureShare Logo Light" width={28} height={28} className="block dark:hidden" />
                <Image src="/img/shield-emp-white.png" alt="SecureShare Logo Dark" width={28} height={28} className="hidden dark:block" />
                <span className="text-xl font-bold tracking-tight">SecureShare</span>
            </div>

            {/* Navigation */}
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
                <a href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
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

            {/* Content Header */}
            <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between">
                <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Shared with me</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Files and folders that have been shared with you</p>
                </div>
                <div className="flex items-center gap-2">
                <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' 
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' 
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                    <Grid3X3 size={20} />
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' 
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' 
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                    <List size={20} />
                </button>
                </div>
            </div>
            </div>

            {/* Files Content */}
            <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredFiles.map((file, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group">
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                        <MoreVertical size={16} className="text-gray-500" />
                        </button>
                    </div>
                    
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-3">
                        {file.type === 'image' ? (
                            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                            <ImageIcon size={32} className="text-orange-600" />
                            </div>
                        ) : (
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                            <FileText size={32} className="text-blue-600" />
                            </div>
                        )}
                        </div>
                        
                        <h3 className="font-medium text-gray-900 dark:text-white mb-1 text-sm">{file.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{file.size}</p>
                        
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                        <p>Shared by {file.sharedBy}</p>
                        <p>{file.sharedTime}</p>
                        </div>
                    </div>
                    </div>
                ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Size</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Shared by</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Shared</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredFiles.map((file, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                            <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                                {file.type === 'image' ? (
                                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded flex items-center justify-center mr-3">
                                    <ImageIcon size={16} className="text-orange-600" />
                                </div>
                                ) : (
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center mr-3">
                                    <FileText size={16} className="text-blue-600" />
                                </div>
                                )}
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</span>
                            </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {file.size}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {file.sharedBy}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {file.sharedTime}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
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
            )}
            
            {filteredFiles.length === 0 && (
                <div className="text-center py-12">
                <Users size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No shared files found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                    {search ? 'Try adjusting your search terms.' : 'Files shared with you will appear here.'}
                </p>
                </div>
            )}
            </div>
        </main>
        </div>
    );
}