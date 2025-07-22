//app/dashboard/myfilesV2/shareDialog.js

"use client";

import React, { useState } from "react";
import { X, Copy, Mail, Link, Plus, UserPlus, Globe, Lock } from "lucide-react";
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

  const addRecipient = () => {
    if (newEmail && shareWith.every((r) => r.email !== newEmail)) {
      setShareWith([...shareWith, { email: newEmail, permission: "view" }]);
      setNewEmail("");

      //get file, recipientUserId, filePath, fileid
      console.log("File is", file);
      console.log("Recipient email is: ", newEmail);
      //we have file id
      //we have file path
      //we have the file
      //just need the id
    }
  };

  const updatePermission = (email, permission) => {
    setShareWith(
      shareWith.map((r) => (r.email === email ? { ...r, permission } : r))
    );
  };

  const removeRecipient = (email) => {
    setShareWith(shareWith.filter((r) => r.email !== email));
  };

  const copyLink = () => {
    navigator.clipboard.writeText("https://example.com/shared/" + file?.id);
  };

  const sendInvite = async () => {
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

        // Send the file
        // send file returns a receivedFileID
        const receivedFileID = await SendFile(file, recipientId, file.id);
        console.log("Received File ID in shared Dialog:", receivedFileID);
        // Log file access
        await fetch("http://localhost:5000/api/files/addAccesslog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_id: file.id,
            user_id: senderId,
            action: "shared",
            message: `User ${senderEmail} has shared the file with ${email}`,
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
            receivedFileID : receivedFileID,
            message: `${senderEmail} wants to share ${file.name} with you`,
          }),
        });

      }

      onOpenChange(false);
    } catch (err) {
      console.error("Failed to send file to recipients:", err);
    }
  };

  // const sendInvite = async () => {
  //   try {
  //     for (const recipient of shareWith) {
  //       const email = recipient.email;

  //       // Fetch recipient user ID by email
  //       const response = await fetch(
  //         `http://localhost:5000/api/users/getUserId/${email}`
  //       );
  //       if (!response.ok) {
  //         console.warn(`User ID not found for email: ${email}`);
  //         continue;
  //       }

  //       const json = await response.json(); // You must parse the JSON to access recipientId
  //       const recipientId = json.data.id;
  //       console.log("Recipient Id is: ", recipientId);

  //       console.log("FileId", file.id);
  //       await SendFile(file, recipientId, file.id);

  //       const token = localStorage.getItem("token");
  //       if (!token) return;

  //       try {
  //         const profileRes = await fetch("http://localhost:5000/api/users/profile", {
  //           headers: { Authorization: `Bearer ${token}` },
  //         });

  //         const profileResult = await profileRes.json();
  //         if (!profileRes.ok) throw new Error(profileResult.message || "Failed to fetch profile");

  //         await fetch("http://localhost:5000/api/files/addAccesslog", {
  //           method: "POST",
  //           headers: { "Content-Type": "application/json" },
  //           body: JSON.stringify({
  //             file_id: file.id,
  //             user_id: profileResult.data.id,
  //             action: "shared",
  //             message: `User ${profileResult.data.email} has shared the file with ${email}`,
  //           }),
  //         });


  //       } catch (err) {
  //         console.error("Failed to fetch user profile:", err.message);
  //       }
  //     }

  //     onOpenChange(false);
  //   } catch (err) {
  //     console.error("Failed to send file to recipients:", err);
  //   }
  // };

  if (!open || !file) return null;

  return (
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
            <button onClick={addRecipient} className="bg-gray-100 p-2 rounded">
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
                    <option value="view">Download</option>
                    {/* <option value="comment">Comment</option>
                    <option value="edit">Edit</option> */}
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
  );
}