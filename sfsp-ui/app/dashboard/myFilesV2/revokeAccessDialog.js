//app/dashboard/myFilesV2/revokeAccessDialog.js

"use client";

import React, { useState, useEffect } from "react";
import { X, User, Trash2, Loader } from "lucide-react";

export function RevokeAccessDialog({ open, onOpenChange, file }) {
  const [users, setUsers] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    if (open && file) {
      fetchUsersWithAccess();
    }
  }, [open, file]);

  const fetchUsersWithAccess = async () => {
    setLoading(true);
    try {
      const accessRes = await fetch("http://localhost:5000/api/files/usersWithFileAccess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id }),
      });

      if (!accessRes.ok) throw new Error("Failed to fetch users with access");

      const accessData = await accessRes.json();
      const { owner: ownerId, users: userIds } = accessData;

      if (ownerId) {
        const ownerRes = await fetch(`http://localhost:5000/api/users/getUserById/${ownerId}`);
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
              const userRes = await fetch(`http://localhost:5000/api/users/getUserById/${userId}`);
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

      setUsers(userDetails.filter(user => user !== null));
    } catch (error) {
      console.error("Error fetching users with access:", error);
      alert("Failed to fetch users with access");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (userId) => {
    setRevoking(userId);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to revoke access");
        return;
      }

      const profileRes = await fetch("http://localhost:5000/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const profileResult = await profileRes.json();
      if (!profileRes.ok) {
        alert("Failed to get user profile");
        return;
      }

      const currentUserId = profileResult.data.id;

      const revokeRes = await fetch("http://localhost:5000/api/files/revokeViewAccess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.id,
          userId: currentUserId,
          recipientId: userId
        }),
      });

      if (!revokeRes.ok) {
        throw new Error("Failed to revoke access");
      }

      alert("Access revoked successfully");
      fetchUsersWithAccess(); // Refresh the list
    } catch (error) {
      console.error("Error revoking access:", error);
      alert("Failed to revoke access: " + error.message);
    } finally {
      setRevoking(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Manage Access - {file?.name}
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
                    Owner
                  </span>
                </div>
              </div>
            )}

            {/* Shared Users Section */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Users with Access ({users.length})
              </h3>
              
              {users.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No other users have access to this file
                </p>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-gray-700"
                    >
                      <div className="flex items-center gap-3">
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
                      <button
                        onClick={() => handleRevokeAccess(user.id)}
                        disabled={revoking === user.id}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {revoking === user.id ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Revoke
                      </button>
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