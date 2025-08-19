'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Eye, Download, Share2, Edit, Clock, Trash2, Undo2 } from 'lucide-react';
import { useDashboardSearch } from '@/app/dashboard/components/DashboardSearchContext';
import { useEncryptionStore } from '@/app/SecureKeyStorage';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function Toast({ message, type = "info", onClose }) {
  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 pointer-events-none`}>
      <div className={`bg-red-300 border ${type === "error" ? "border-red-300" : "border-blue-500"} text-gray-900 rounded shadow-lg px-6 py-3 pointer-events-auto`}>
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 font-bold">×</button>
      </div>
    </div>
  );
}

// function Toast({ message, type = "info", onClose }) {
//   const colors = {
//     success: "bg-green-100 border-green-500 text-green-900",
//     error: "bg-red-100 border-red-500 text-red-900",
//     info: "bg-blue-100 border-blue-500 text-blue-900",
//     warning: "bg-yellow-100 border-yellow-500 text-yellow-900",
//   };

//   return (
//     <div className="fixed bottom-5 right-5 z-50 pointer-events-none">
//       <div
//         className={`flex items-center border rounded shadow-lg px-4 py-3 pointer-events-auto ${colors[type]}`}
//       >
//         <span>{message}</span>
//         <button onClick={onClose} className="ml-4 font-bold">×</button>
//       </div>
//     </div>
//   );
// }


export default function AccessLogsPage() {
  const { search } = useDashboardSearch();
  const [logs, setLogs] = useState([]);
  const [dateFilter, setDateFilter] = useState('Last 7 days');
  const [actionFilter, setActionFilter] = useState('All actions');
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  };

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
            console.log("these re the logs");
            console.log(fileLogs);

            // Build logs
            for (const log of fileLogs) {
              if (log.file_id !== file.fileId) continue;

              //get email as 2nd word
              const Id = log.user_id;

              // Fetch user info from email
              let userName = 'Unknown User';
              let avatar = '';
              let email = '';
              try {
                const response = await fetch(`http://localhost:5000/api/users/getUserInfo/${Id}`);
                if (response.ok) {
                  const userInfo = await response.json();
                  // console.log('userInfo:', userInfo);
                  if (userInfo?.data.username) {
                    userName = userInfo.data.username;
                    avatar = userInfo.data.avatar_url;
                    email = userInfo.data.email;
                  }
                }
              } catch (err) {
                console.log(`Could not fetch user info for ${Id}:`, err);
              }

              allLogs.push({
                user: userName,
                email, avatar,
                action: log.action?.toLowerCase() || '',
                file: file.fileName || 'Unnamed file',
                // date: new Date(log.timestamp).toLocaleString(),
                timestamp: log.timestamp,
                dateFormatted: new Date(log.timestamp).toLocaleString(),
              });
            }
          } catch (err) {
            console.error(`Error fetching logs for file ${file.fileId}:`, err);
          }
        }
        console.log(allLogs);
        allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLogs(allLogs);
      } catch (err) {
        console.error('Failed to fetch all logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllLogs();
  }, []);

  const exportToCSV = () => {
    if (!filteredLogs.length) {
      showToast("No logs to export", "error");
      return;
    }

    // header
    const headers = ["User", "Email", "Action", "File", "Date"];

    const rows = filteredLogs.map(log => [
      `"${log.user}"`,
      `"${log.email}"`,
      `"${log.action}"`,
      `"${log.file}"`,
      `"${log.dateFormatted}"`,
    ]);

    // CSV string
    const csvContent =
      headers.join(",") + "\n" + rows.map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "SecureShare_access_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (!filteredLogs.length) {
      showToast("No logs to export", "error");
      return;
    }

    const doc = new jsPDF();
    const img = new window.Image();
    img.src = "/img/shield-full-black.png";
    img.onload = () => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const imgWidth = 20;
      const imgHeight = (img.height / img.width) * imgWidth;
      const x = (pageWidth - imgWidth) / 2;
      const y = 10;

      doc.addImage(img, "PNG", x, y, imgWidth, imgHeight);

      // Title
      doc.setFontSize(16);
      doc.text("Secure Share: Access Logs", pageWidth / 2, y + imgHeight + 10, { align: "center" });

      // headers
      const headers = [["User", "Email", "Action", "File", "Date"]];
      const rows = filteredLogs.map(log => [
        log.user,
        log.email,
        log.action,
        log.file,
        log.dateFormatted
      ]);

      autoTable(doc, {
        startY: y + imgHeight + 20,
        head: headers,
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], halign: "center" },
        styles: {
          fontSize: 10,
          cellPadding: 3,
          overflow: 'linebreak',
          valign: 'middle',
        },
        columnStyles: {
          0: { minCellWidth: 30 }, // User
          1: { minCellWidth: 50 }, // Email
          2: { minCellWidth: 30 }, // Action
          3: { minCellWidth: 40 }, // File
          4: { minCellWidth: 25 }, // Date
        },
        tableWidth: 'auto',
      });

      doc.save("SecureShare_access_logs.pdf");
    };
  };

  const now = new Date();
  const filteredLogs = logs
    .filter((log) => {
      if (actionFilter === "All actions") return true;
      return log.action === actionFilter.toLowerCase();
    })
    .filter((log) => {
      const logDate = new Date(log.timestamp);

      if (dateFilter === "Last 7 days") {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        return logDate >= sevenDaysAgo;
      }

      if (dateFilter === "Last 30 days") {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return logDate >= thirtyDaysAgo;
      }

      return true; // "All time"
    })
    .filter((log) => {
      const query = search.toLowerCase();
      return (
        log.user.toLowerCase().includes(query) ||
        log.email.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.file.toLowerCase().includes(query) ||
        log.dateFormatted.toLowerCase().includes(query)
      );
    });


  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
                <option>Shared_View</option>
                <option>Downloaded</option>
                <option>Shared</option>
                <option>Created</option>
                <option>Trash</option>
              </select>
            </div>

            {/* Export logs */}
            <div className="relative inline-block group">
              <button className="border border-gray-500 dark:border-gray-600 text-sm px-4 py-2 rounded-md hover:bg-blue-200 dark:hover:bg-gray-700">
                Export logs
              </button>

              <div className="absolute mt-2 right-0 w-40 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded shadow-lg opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all duration-200 z-50">
                <button
                  onClick={exportToCSV}
                  className="block w-full text-left px-4 py-2 hover:bg-blue-200 dark:hover:bg-gray-700"
                >
                  CSV
                </button>
                <button
                  onClick={exportToPDF}
                  className="block w-full text-left px-4 py-2 hover:bg-blue-200 dark:hover:bg-gray-700"
                >
                  PDF
                </button>
              </div>
            </div>
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
                        {log.avatar ? (
                          <Image
                            src={log.avatar}
                            alt={log.user}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
                            {(() => {
                              if (!log.user) return '??';
                              const parts = log.user.split(/[_\-\s\.]+/).filter(part => 
                                part.length > 0 && !/^\d+$/.test(part)
                              );
                              if (parts.length >= 2) {
                                return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
                              } else if (parts.length === 1) {
                                return parts[0].slice(0, 2).toUpperCase();
                              } else {
                                return log.user.slice(0, 2).toUpperCase();
                              }
                            })()}
                          </div>
                        )}
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
                          {log.action === 'restored' && <><Undo2 size={16} className="text-green-500" /> Restored</>}
                          {log.action === 'shared_view' && <><Share2 size={16} className="text-green-500" /> Shared_View</>}
                          {log.action === 'viewed' && <><Eye size={16} className="text-green-500" /> Viewed</>}
                        </div>
                      </td>
                      <td className="py-4">{log.file}</td>
                      <td className="py-4 text-gray-500 dark:text-gray-400">{log.dateFormatted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
