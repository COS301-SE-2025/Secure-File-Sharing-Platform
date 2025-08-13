'use client';

import { useState, useEffect } from 'react';
import { Eye, Download, Share2, Edit, Clock, Trash2 } from 'lucide-react';
import { useDashboardSearch } from '@/app/dashboard/components/DashboardSearchContext';
import { useEncryptionStore } from '@/app/SecureKeyStorage';

export default function AccessLogsPage() {
  const { search } = useDashboardSearch();
  const [logs, setLogs] = useState([]);
  const [dateFilter, setDateFilter] = useState('Last 7 days');
  const [actionFilter, setActionFilter] = useState('All actions');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllLogs = async () => {
      try {
        const userId = useEncryptionStore.getState().userId;
        if (!userId) {
          console.error('Cannot fetch files: Missing userId in store.');
          return;
        }

        // Fetch all files
        const filesRes = await fetch('http://localhost:5000/api/files/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });

        let filesData = await filesRes.json();
        if (!Array.isArray(filesData)) filesData = [];

        // Filter out deleted files
        const files = filesData.filter(f => {
          const tags = f.tags ? f.tags.replace(/[{}]/g, '').split(',') : [];
          return !tags.includes('deleted') && !tags.some(tag => tag.trim().startsWith('deleted_time:'));
        });

        // Fetch logs for each file
        const allLogs = [];

        for (const file of files) {
          try {
            const logsRes = await fetch('http://localhost:5000/api/files/getAccesslog', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ file_id: file.fileId }),
            });

            if (!logsRes.ok) continue;
            const fileLogs = await logsRes.json();

            // Build logs
            for (const log of fileLogs) {
              if (log.file_id !== file.fileId) continue;

              //get email as 2nd word
              const email = log.message?.split(/\s+/)[1] || 'unknown@example.com';

              // Fetch user info from email
              let userName = log.message?.split(/\s+/)[0] || 'Unknown User';
              let avatar='';
              try {
                const response = await fetch(`http://localhost:5000/api/users/getUserInfo/${email}`);
                if (response.ok) {
                  const userInfo = await response.json();
                  console.log('userInfo:', userInfo);
                  if (userInfo?.data.username) {
                    userName = userInfo.data.username;
                    avatar=userInfo.data.avatar_url;
                  }
                }
              } catch (err) {
                console.log(`Could not fetch user info for ${email}:`, err);
              }

              allLogs.push({
                user: userName,
                email,
                action: log.action?.toLowerCase() || '',
                file: file.fileName || 'Unnamed file',
                date: new Date(log.timestamp).toLocaleString(),
              });
            }
          } catch (err) {
            console.error(`Error fetching logs for file ${file.fileId}:`, err);
          }
        }
        console.log(allLogs);
        setLogs(allLogs);
      } catch (err) {
        console.error('Failed to fetch all logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllLogs();
  }, []);


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
        <p className="text-gray-600 dark:text-gray-400 pb-8">
          Monitor who accessed, modified, or shared your files
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
          {loading ? (
            <p className="text-gray-500">Loading logs...</p>
          ) : (
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
                        {/* const iconMap = {
                            downloaded: Download,
                            shared: Share,
                            edited: Edit,
                            viewed: Eye,
                            deleted: Trash2,
                            created: Clock,
                            restored:Undo2,
                          }; */}
                        {log.action === 'downloaded' && <><Download size={16} className="text-blue-500" /> Downloaded</>}
                        {log.action === 'shared' && <><Share2 size={16} className="text-green-500" /> Shared</>}
                        {log.action === 'edited' && <><Edit size={16} className="text-green-500" /> Edit</>}
                        {log.action === 'deleted' && <><Trash2 size={16} className="text-green-500" /> Trash</>}
                        {log.action === 'created' && <><Clock size={16} className="text-yellow-500" /> Created</>}
                        {log.action === 'restored' && <><Share2 size={16} className="text-green-500" /> Restored</>}
                      </div>
                    </td>
                    <td className="py-4">{log.file}</td>
                    <td className="py-4 text-gray-500 dark:text-gray-400">{log.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
