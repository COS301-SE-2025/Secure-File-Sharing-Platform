'use client';

import { useEffect, useState } from 'react';
import { FileText, Users, Clock, ShieldCheck } from 'lucide-react';
import axios from 'axios';

export default function DashboardHomePage() {
  const [fileCount, setFileCount] = useState(0);

  const userId = '123'; // Replace with actual user ID from auth system

  useEffect(() => {
    const fetchFileCount = async () => {
      try {
        const response = await axios.post('http://localhost:5000/api/files/getNumberOFFiles', {
          userId,
        });
        setFileCount(response.data.fileCount.numberOfFiles);
      } catch (error) {
        console.error('Failed to fetch file count:', error.message);
      }
    };

    fetchFileCount();
  }, []);

  const stats = [
    {
      label: 'Storage Used',
      value: '7.5 GB',
      subtext: 'of 10 GB',
      percent: '75%',
    },
    {
      label: 'Total Files',
      value: fileCount,
      percent: '+12%',
    },
    {
      label: 'Shared Files',
      value: 36,
      percent: '+15%',
    },
    {
      label: 'Team Members',
      value: 12,
      badge: 'New',
    },
  ];

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back, John!</p>
        </div>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search files..."
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring"
          />
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
            + Upload File
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow hover:shadow-lg transition-shadow"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            {stat.subtext && <p className="text-xs text-gray-400">{stat.subtext}</p>}
            {stat.percent && <p className="text-xs text-green-500 mt-1">↑ {stat.percent}</p>}
            {stat.badge && (
              <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded ml-2">
                {stat.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Analytics */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-md font-semibold">Storage Analytics</h2>
            <div className="space-x-2">
              <button className="text-sm text-blue-600">Week</button>
              <button className="text-sm text-blue-600 font-bold underline">Month</button>
              <button className="text-sm text-blue-600">Year</button>
            </div>
          </div>
          <div className="h-48 bg-gray-200 rounded flex items-center justify-center text-gray-500">
            [Chart Placeholder]
          </div>
        </div>

        {/* Storage Breakdown */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
          <h2 className="text-md font-semibold mb-4">Storage Breakdown</h2>
          <div className="h-48 bg-gray-200 rounded flex items-center justify-center text-gray-500">
            [Pie Chart Placeholder]
          </div>
          <ul className="mt-4 space-y-1 text-sm text-gray-600 dark:text-gray-300">
            <li>
              <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span> Documents
            </li>
            <li>
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span> Videos
            </li>
            <li>
              <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span> Images
            </li>
            <li>
              <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span> Other
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
