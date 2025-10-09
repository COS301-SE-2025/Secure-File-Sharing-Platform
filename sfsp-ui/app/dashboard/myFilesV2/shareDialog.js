"use client";

import React, { useState } from "react";
import { X, Copy, Mail, Link, Plus, UserPlus, Globe, Lock, Eye } from "lucide-react";
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";
import {
  SendFile,
  ReceiveFile,
} from "@/app/Transfer";

export function ShareDialog({ open, onOpenChange, file }) {
  const [shareWith, setShareWith] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [linkAccess, setLinkAccess] = useState("restricted");
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);

  // Toast states
  const [toast, setToast] = useState({ message: "", visible: false });
  const [statusToasts, setStatusToasts] = useState([]);

  const showToast = (message) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 3000);
  };

  const showStatusToast = (message, type = "success") => {
    const id = Date.now();
    setStatusToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setStatusToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const addRecipient = () => {
    const isValidEmail = /\S+@\S+\.\S+/.test(newEmail);
    const alreadyAdded = shareWith.some((r) => r.email === newEmail);

    if (!newEmail.trim()) {
      showToast("Please enter an email address.");
      return;
    }

    if (!isValidEmail) {
      showToast("Please enter a valid email address.");
      return;
    }

    if (alreadyAdded) {
      showToast("This email is already added.");
      return;
    }

    setShareWith([...shareWith, { email: newEmail, permission: "view" }]);
    setNewEmail("");
  };

  const updatePermission = (email, permission) => {
    setShareWith(
      shareWith.map((r) => (r.email === email ? { ...r, permission } : r))
    );
  };

  const removeRecipient = (email) => {
    setShareWith(shareWith.filter((r) => r.email !== email));
  };

  const sendInvite = async () => {
    if (shareWith.length === 0) {
      showToast("Please add at least one email before sending.");
      return;
    }

    onOpenChange(false);

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const profileRes = await fetch(getApiUrl("/users/profile"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const profileResult = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileResult.message || "Failed to fetch profile");

      const senderEmail = profileResult.data.email;
      const senderId = profileResult.data.id;

      for (const recipient of shareWith) {
        const email = recipient.email;

        const response = await fetch(
          getApiUrl(`/users/getUserId/${email}`)
        );
        if (!response.ok) {
          console.warn(`User ID not found for email: ${email}`);
          showStatusToast(`User:${email} account does not exist.`, "error");
          continue;
        }

        const json = await response.json();
        const recipientId = json.data.userId;
        const isViewOnly = recipient.permission === "view";

        const receivedFileID = await SendFile(recipientId, file.id, isViewOnly);

        await fetch(getFileApiUrl("/addAccesslog"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_id: file.id,
            user_id: senderId,
            action: isViewOnly ? "shared_view" : "shared",
            message: `User ${senderEmail} has shared the file with ${email} (${isViewOnly ? 'view-only' : 'download'})`,
          }),
        });

        await fetch(getApiUrl("/notifications/add"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "file_share_request",
            fromEmail: senderEmail,
            toEmail: email,
            file_name: file.name,
            file_id: file.id,
            receivedFileID: receivedFileID,
            viewOnly: isViewOnly,
            message: `${senderEmail} wants to share ${file.name} with you (${isViewOnly ? 'view-only' : 'download'})`,
          }),
        });
        showStatusToast(`File: ${file.name} successfully shared to ${email}!`, "success");
      }
    } catch (err) {
      console.error("Failed to send file to recipients:", err);
      showStatusToast(`Failed to share file: ${file.name}.`, "error");
    } finally {
      setShareWith([]);
    }
  };

  return (
    <>
      {open && file && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-lg shadow-2xl transform transition-all duration-300 scale-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Share &quot;{file.name}&quot;
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Add people
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                    placeholder="Enter email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addRecipient()}
                  />
                  <button
                    onClick={addRecipient}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {shareWith.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {shareWith.map((r) => (
                    <div
                      key={r.email}
                      className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                    >
                      <span className="text-sm text-gray-900 dark:text-gray-200 truncate max-w-[60%]">
                        {r.email}
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={r.permission}
                          onChange={(e) => updatePermission(r.email, e.target.value)}
                          className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="download">Can Download</option>
                          <option value="view">View Only</option>
                        </select>
                        <button
                          onClick={() => removeRecipient(r.email)}
                          className="text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendInvite}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Mail className="h-5 w-5" />
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div className="fixed top-4 right-4 max-w-xs bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-slide-in">
          {toast.message}
        </div>
      )}

      <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2 z-50">
        {statusToasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-white animate-slide-in
        ${toast.type === "success" ? "bg-green-500" : "bg-red-500"}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}