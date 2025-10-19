//app/dashboard/myFilesV2/changeShareMethodDialog.js

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, User, Download, Eye, Loader, Check } from "lucide-react";
import { ChangeShareMethod } from "@/app/Transfer";
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";

export function ChangeShareMethodDialog({ open, onOpenChange, file }) {
  const [users, setUsers] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [userShareMethods, setUserShareMethods] = useState({});

  useEffect(() => {
    if (open) {
      fetchUsersWithAccess();
    }
  }, [open, fetchUsersWithAccess]);

  const fetchUsersWithAccess = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    try {
      const accessRes = await fetch(getFileApiUrl("/usersWithFileAccess"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id }),
      });

      if (!accessRes.ok) throw new Error("Failed to fetch users with access");

      const accessData = await accessRes.json();
      const { owner: ownerId, users: userIds } = accessData;

      if (ownerId) {
        const ownerRes = await fetch(getApiUrl(`/users/getUserById/${ownerId}`));
        if (ownerRes.ok) {
          const ownerData = await ownerRes.json();
          setOwner(ownerData.data);
        }
      }

      const userDetails = await Promise.all(
        userIds
          .filter(userId => userId !== ownerId)
          .map(async (userId) => {
            try {
              const userRes = await fetch(getApiUrl(`/users/getUserById/${userId}`));
              if (userRes.ok) {
                const userData = await userRes.json();
                return userData.data;
              }
              return null;
            } catch (error) {
              console.error(`Failed to fetch user ${userId}:`, error);
              return null;
            }
          })
      );

      const validUsers = userDetails.filter(user => user !== null);
      setUsers(validUsers);

      const initialMethods = {};
      validUsers.forEach(user => {
        initialMethods[user.id] = 'view-only';
      });
      setUserShareMethods(initialMethods);
      
    } catch (error) {
      console.error("Error fetching users with access:", error);
      alert("Failed to fetch users with access");
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleChangeShareMethod = async (userId, newMethod) => {
    setUpdating(userId);
    try {
      const isViewOnly = newMethod === 'view-only';
      
      const result = await ChangeShareMethod(userId, file.id, isViewOnly);
      
      if (result) {
        setUserShareMethods(prev => ({
          ...prev,
          [userId]: newMethod
        }));
        
        alert(`Share method changed to ${newMethod} successfully`);
      }
    } catch (error) {
      console.error("Error changing share method:", error);
      alert("Failed to change share method: " + error.message);
    } finally {
      setUpdating(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Change Share Methods - {file?.name}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading users...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Owner Section */}
            {owner && (
              <div className="border-b pb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Owner
                </h3>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                  <User className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {owner.username}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {owner.email}
                    </p>
                  </div>
                  <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full dark:bg-blue-800 dark:text-blue-100">
                    Full Access
                  </span>
                </div>
              </div>
            )}

            {/* Shared Users Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Shared Users ({users.length})
              </h3>
              
              {users.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No other users have access to this file
                </p>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 bg-gray-50 rounded-lg dark:bg-gray-700"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <User className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.username}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Current access:
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleChangeShareMethod(user.id, 'view-only')}
                            disabled={updating === user.id}
                            className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full transition-colors ${
                              userShareMethods[user.id] === 'view-only'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300'
                            }`}
                          >
                            <Eye className="h-3 w-3" />
                            View Only
                            {userShareMethods[user.id] === 'view-only' && <Check className="h-3 w-3" />}
                            {updating === user.id && <Loader className="h-3 w-3 animate-spin" />}
                          </button>
                          
                          <button
                            onClick={() => handleChangeShareMethod(user.id, 'download')}
                            disabled={updating === user.id}
                            className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full transition-colors ${
                              userShareMethods[user.id] === 'download'
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300'
                            }`}
                          >
                            <Download className="h-3 w-3" />
                            Download
                            {userShareMethods[user.id] === 'download' && <Check className="h-3 w-3" />}
                            {updating === user.id && <Loader className="h-3 w-3 animate-spin" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}