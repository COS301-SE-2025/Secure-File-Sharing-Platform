//app/dashboard/myFilesV2/activityLogDialog.js

'use client';

import React from 'react';
import { Clock, Download, Share, Edit, Eye } from 'lucide-react';

export function ActivityLogsDialog({ open, onOpenChange, file }) {
  if (!file || !open) return null;

  const Dialog = ({ children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-lg">
        {children}
      </div>
    </div>
  );

  const DialogContent = ({ children }) => <div className="p-6">{children}</div>;

  const DialogHeader = ({ children }) => (
    <div className="mb-4 flex justify-between items-start">{children}</div>
  );

  const DialogTitle = ({ children }) => (
    <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
      {children}
    </h2>
  );

  const ScrollArea = ({ children }) => (
    <div className="h-96 overflow-y-auto pr-2">{children}</div>
  );

  const mockActivities = [
    {
      id: '1',
      action: 'shared',
      user: 'You',
      timestamp: '2024-01-15 10:30 AM',
      details: 'Shared with john@example.com',
      icon: Share,
    },
    {
      id: '2',
      action: 'downloaded',
      user: 'john@example.com',
      timestamp: '2024-01-15 09:45 AM',
      details: 'Downloaded file',
      icon: Download,
    },
    {
      id: '3',
      action: 'viewed',
      user: 'sarah@example.com',
      timestamp: '2024-01-14 4:20 PM',
      details: 'Viewed file',
      icon: Eye,
    },
    {
      id: '4',
      action: 'edited',
      user: 'You',
      timestamp: '2024-01-14 2:15 PM',
      details: 'Modified file content',
      icon: Edit,
    },
    {
      id: '5',
      action: 'created',
      user: 'You',
      timestamp: '2024-01-13 11:00 AM',
      details: 'File created',
      icon: Clock,
    },
  ];

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
          <div className="space-y-4">
            {mockActivities.map((activity) => {
              const Icon = activity.icon;
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
                      <span className="font-medium text-sm">{activity.user}</span>
                      <span className="text-sm text-gray-500">{activity.action}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{activity.details}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}