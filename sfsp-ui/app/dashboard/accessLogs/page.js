'use client';

import { useState } from 'react';
import { Eye, Download, Share2, Edit } from 'lucide-react';
import { useDashboardSearch } from '@/app/dashboard/components/DashboardSearchContext';

export default function AccessLogsPage() {
  const {search} = useDashboardSearch();
  const [dateFilter, setDateFilter] = useState('Last 7 days');
  const [actionFilter, setActionFilter] = useState('All actions');

  const filteredLogs = logs
    .filter((log) => actionFilter === 'All actions' || log.action === actionFilter.toLowerCase())
    .filter((log) => {
      const query = search.toLowerCase();
      return (
        log.user.toLowerCase().includes(query) ||
        log.email.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.file.toLowerCase().includes(query) ||
        log.date.toLowerCase().includes(query)
      );
    });

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h1 className="text-2xl font-bold mb-2 text-blue-500">Access Logs</h1>
        <p className="text-gray-600 dark:text-gray-400 pb-8"> Monitor who accessed, modified, or shared your files
        </p>

        {/* Filters */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-gray-200 dark:bg-gray-700 text-sm px-3 py-2 rounded-md focus:outline-none"
            >
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>All time</option>
            </select>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-gray-200 dark:bg-gray-700 text-sm px-3 py-2 rounded-md focus:outline-none"
            >
              <option>All actions</option>
              <option>Viewed</option>
              <option>Downloaded</option>
              <option>Shared</option>
              <option>Modified</option>
            </select>
          </div>
          <button className="border border-gray-500 dark:border-gray-600 text-sm px-4 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
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
              {filteredLogs.map((log, idx) => (
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
                      {log.action === 'viewed' && <><Eye size={16} className="text-gray-500" /> Viewed</>}
                      {log.action === 'downloaded' && <><Download size={16} className="text-blue-500" /> Downloaded</>}
                      {log.action === 'shared' && <><Share2 size={16} className="text-green-500" /> Shared</>}
                      {log.action === 'modified' && <><Edit size={16} className="text-yellow-500" /> Modified</>}
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
  );
}
