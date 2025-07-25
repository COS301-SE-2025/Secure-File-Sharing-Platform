//app/dashboard/components/NotificationDropdown

'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Check, X, FileText } from 'lucide-react';
import axios from 'axios';
import {
  SendFile,
  ReceiveFile,
} from "@/app/Transfer";

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (dropdownOpen) {
      fetchNotifications();
    }
  }, [dropdownOpen]);

  const fetchNotifications = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const profileRes = await fetch("http://localhost:5000/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const profileResult = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileResult.message || "Failed to fetch profile");

      try {
        const res = await axios.post('http://localhost:5000/api/notifications/get', {
          userId: profileResult.data.id, // optionally use state/context for userId
        });
        if (res.data.success) {
          setNotifications(res.data.notifications);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }

    } catch (err) {
      console.error("Failed to fetch user profile:", err.message);
    }
  };

  const markAsRead = async (id) => {
    try {
      const res = await axios.post('http://localhost:5000/api/notifications/markAsRead', { id });
      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const respondToShareRequest = async (id, status) => {
  try {
    const res = await axios.post('http://localhost:5000/api/notifications/respond', {
      id,
      status,
    });

    if (res.data.success) {
      // ✅ Update UI state
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status, read: true } : n))
      );

  
      if (status === 'accepted' && res.data.fileData) {
        const fileData = res.data.fileData;

        await ReceiveFile(fileData);
        // setActiveFile(fileData); 
        // setShowPreviewModal(true);
      }
    }
  } catch (error) {
    console.error('Failed to respond to notification:', error);
  }
};

  const clearNotification = async (id) => {
    try {
      const res = await axios.post('http://localhost:5000/api/notifications/clear', { id });
      if (res.data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (error) {
      console.error('Failed to clear notification:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="relative p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs h-5 w-5 rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-200 rounded-lg shadow-lg z-50 overflow-hidden border">
          <div className="p-3 border-b font-semibold text-gray-700 dark:text-gray-900 flex justify-between items-center">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-gray-200 dark:bg-gray-200 text-xs rounded-full px-2 py-0.5">
                {unreadCount} new
              </span>
            )}
          </div>

          {/* Scroll*/}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b last:border-b-0 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''
                    }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-1 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-600">{notification.message?.split(' ')[0]}</p>
                      <p className="text-sm text-gray-600 mb-2">{notification.message?.split(' ').slice(1).join(' ')}</p>
                      <p className="text-xs text-gray-400">{formatTimestamp(notification.timestamp)}</p>

                      {/* accept/decline */}
                      {notification.type === 'file_share_request' && notification.status === 'pending' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              respondToShareRequest(notification.id, 'accepted');
                            }}
                            className="flex items-center px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            <Check className="h-3 w-3 mr-1" /> Accept
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              respondToShareRequest(notification.id, 'declined');
                            }}
                            className="flex items-center px-3 py-1 text-xs border border-gray-300 dark:text-gray-900 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-400"
                          >
                            <X className="h-3 w-3 mr-1" /> Decline
                          </button>
                        </div>
                      )}

                      {/* sender's response */}
                      {notification.type === 'file_share_response' && (
                        <span
                          className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full ${notification.status === 'accepted'
                            ? 'bg-green-200 text-green-800'
                            : 'bg-red-200 text-red-800'
                            }`}
                        >
                          {notification.status === 'accepted' ? 'Accepted' : 'Declined'}
                        </span>
                      )}
                    </div>

                    {/* clear */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notification.id);
                      }}
                      className="h-6 w-6 p-0 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-2 text-center text-sm text-blue-600 hover:underline cursor-pointer">
              View all notifications
            </div>
          )}
        </div>
      )}
    </div>
  );
}
