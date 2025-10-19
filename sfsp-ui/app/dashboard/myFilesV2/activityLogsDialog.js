// app/dashboard/myFilesV2/activityLogDialog.js

'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Download, Share, Edit, Eye, Trash2,Undo2 } from 'lucide-react';
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";

export function ActivityLogsDialog({ open, onOpenChange, file }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const iconMap = {
    downloaded: Download,
    shared: Share,
    edited: Edit,
    viewed: Eye,
    deleted: Trash2,
    created: Clock,
    restored:Undo2,
  };

  useEffect(() => {
    if (!file || !open) return;

    const fetchLogs = async () => {
      try {

        const res = await fetch(getFileApiUrl('/getAccesslog'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_id: file.id }),
        });

        if (!res.ok) throw new Error('Failed to fetch logs');

        const logs = await res.json();

        const filteredLogs = logs.filter(log => log.file_id === file.id);
        setActivities(filteredLogs);
      } catch (err) {
        console.error('Error fetching activity logs:', err);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [file, open]);

  if (!file || !open) return null;

  const Dialog = ({ children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-300 rounded-lg shadow-lg w-full max-w-lg dark:text-gray-900">
        {children}
      </div>
    </div>
  );

  const DialogContent = ({ children }) => <div className="p-6">{children}</div>;

  const DialogHeader = ({ children }) => (
    <div className="mb-4 flex justify-between items-start">{children}</div>
  );

  const DialogTitle = ({ children }) => (
    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-900 flex items-center gap-2">
      {children}
    </h2>
  );

  const ScrollArea = ({ children }) => (
    <div className="h-96 overflow-y-auto pr-2 custom-scroll">{children}</div>
  );

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Clock className="h-5 w-5" />
            {`Activity for "${file.name}"`}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700 text-lg leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </DialogHeader>

        <ScrollArea>
          {loading ? (
            <p className="text-gray-500">Loading activity logs...</p>
          ) : activities.length === 0 ? (
            <p className="text-gray-500">No activity found for this file.</p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = iconMap[activity.action] || Clock;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="p-2 bg-white rounded-full">
                      <Icon className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {activity.message?.split(' ')[1] || activity.user_id || 'Unknown User'}
                        </span>
                        <span className="text-sm text-gray-500">{activity.action}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {activity.message || ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}