//app/dashboard/myfilesV2/shareDialog.js

"use client";

import React, { useState } from "react";
import { X, Copy, Mail, Link, Plus, UserPlus, Globe, Lock, Eye } from "lucide-react";
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

  //toasts
  const [toast, setToast] = useState({ message: "", visible: false });
  const [statusToast, setStatusToast] = useState({ message: "", type: "", visible: false });

  const showToast = (message) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 3000);
  };

  const showStatusToast = (message, type = "success") => {
    setStatusToast({ message, type, visible: true });
    setTimeout(() => setStatusToast({ message: "", type: "", visible: false }), 3000);
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

    console.log("File is", file);
    console.log("Recipient email is: ", newEmail);
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

    onOpenChange(false); //close dialogue first

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Get sender profile once
      const profileRes = await fetch("http://localhost:5000/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const profileResult = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileResult.message || "Failed to fetch profile");

      const senderEmail = profileResult.data.email;
      const senderId = profileResult.data.id;

      for (const recipient of shareWith) {
        const email = recipient.email;

        // Fetch recipient user ID by email
        const response = await fetch(
          `http://localhost:5000/api/users/getUserId/${email}`
        );
        if (!response.ok) {
          console.warn(`User ID not found for email: ${email}`);
          continue;
        }

        const json = await response.json();
        const recipientId = json.data.id;

        console.log("Recipient Id is:", recipientId);
        console.log("FileId", file.id);

        // Determine if this is a view-only share
        const isViewOnly = recipient.permission === "view";

        // Send the file with appropriate permissions
        // send file returns a receivedFileID
        const receivedFileID = await SendFile(file, recipientId, file.id, isViewOnly);
        console.log("Received File ID in shared Dialog:", receivedFileID);
        // Log file access
        await fetch("http://localhost:5000/api/files/addAccesslog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_id: file.id,
            user_id: senderId,
            action: isViewOnly ? "shared_view" : "shared",
            message: `User ${senderEmail} has shared the file with ${email} (${isViewOnly ? 'view-only' : 'download'})`,
          }),
        });

        // Send the notification
        await fetch("http://localhost:5000/api/notifications/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "file_share_request",
            fromEmail: senderEmail,
            toEmail: email,
            file_name: file.name,
            file_id: file.id,
            receivedFileID: receivedFileID,
            message: `${senderEmail} wants to share ${file.name} with you (${isViewOnly ? 'view-only' : 'download'})`,
          }),
        });
        showStatusToast(`File: ${file.name} successfully shared to ${email}!`, "success");
      }


    } catch (err) {
      console.error("Failed to send file to recipients:", err);
      showStatusToast(`Failed to share file: ${file.name}.`, "error");
    }
  };

  return (
    <>
      {open && file && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:text-gray-900">
          <div className="bg-white p-6 rounded-lg w-full max-w-md space-y-6">
            <h2 className="text-lg font-semibold">{`Share "${file.name}"`}</h2>

            <div>
              <label className="text-sm font-medium">Add people</label>
              <div className="flex gap-2 mt-2">
                <input
                  className="border px-3 py-2 rounded w-full text-sm"
                  placeholder="Enter email addresses"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addRecipient()}
                />
                <button onClick={addRecipient} className="bg-gray-400 p-2 rounded">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {shareWith.length > 0 && (
              <div className="space-y-2">
                {shareWith.map((r) => (
                  <div
                    key={r.email}
                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm">{r.email}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={r.permission}
                        onChange={(e) => updatePermission(r.email, e.target.value)}
                        className="text-sm px-2 py-1 border rounded"
                      >
                        <option value="download">Download</option>
                        <option value="view">View Only</option>
                      </select>
                      <button
                        onClick={() => removeRecipient(r.email)}
                        className="p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <hr />

            {/* <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Share with link</label>
                <div className="flex items-center gap-2">
                  {linkAccess === "restricted" ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  <select
                    value={linkAccess}
                    onChange={(e) => setLinkAccess(e.target.value)}
                    className="text-sm px-2 py-1 border rounded"
                  >
                    <option value="restricted">Restricted</option>
                    <option value="anyone">Anyone</option>
                  </select>
                </div>
              </div>
              <button
                onClick={copyLink}
                className="w-full text-left text-sm border px-3 py-2 rounded flex items-center gap-2"
              >
                <Link className="h-4 w-4" />
                Copy link
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Permissions</label>
              <div className="flex justify-between">
                <label htmlFor="comments" className="text-sm">
                  Allow comments
                </label>
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                />
              </div>
              <div className="flex justify-between">
                <label htmlFor="download" className="text-sm">
                  Allow download
                </label>
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                />
              </div>
            </div> */}

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => onOpenChange(false)}
                className="border px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={sendInvite}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm flex items-center gap-1"
              >
                <Mail className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                  bg-red-100 text-red-700 px-4 py-2 rounded shadow-lg z-50">
          {toast.message}
        </div>
      )}

      {statusToast.visible && (
        <div className={`fixed bottom-6 right-6 px-4 py-2 rounded shadow-lg z-50 text-sm
        ${statusToast.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
          {statusToast.message}
        </div>
      )}
    </>
  );
}