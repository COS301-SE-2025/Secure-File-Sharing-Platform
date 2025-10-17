//app/dashboard/myFilesV2/createFolderDialogue.js

"use client";

import React, { useState } from "react";
import { Folder } from "lucide-react";
import { useEncryptionStore } from "@/app/SecureKeyStorage";
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";

const Dialog = ({ open, children }) => {
  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
        {children}
      </div>
    </div>
  ) : null;
};

const DialogContent = ({ children }) => <div className="p-6">{children}</div>;

const DialogHeader = ({ children }) => <div className="mb-4">{children}</div>;

const DialogTitle = ({ children }) => (
  <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
    {children}
  </h2>
);

const Button = ({ children, onClick, variant = "primary", disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-md ${
      variant === "outline"
        ? "border border-gray-300 text-gray-700 dark:bg-gray-300 dark:font-bold "
        : "bg-blue-600 text-white hover:bg-blue-700 "
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
  >
    {children}
  </button>
);

const Input = ({ id, value, onChange, placeholder, onKeyPress }) => (
  <input
    id={id}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    onKeyPress={onKeyPress}
    className="w-full border border-gray-300 rounded-md px-4 py-2 text-gray-900 dark:bg-gray-700 dark:text-white dark:border-gray-600"
  />
);

const Label = ({ htmlFor, children }) => (
  <label
    htmlFor={htmlFor}
    className="block text-sm font-medium text-gray-700 dark:text-gray-50"
  >
    {children}
  </label>
);

export function CreateFolderDialog({
  open,
  onOpenChange,
  currentPath,
  onFolderCreated,
}) {
  const [newName, setFolderName] = useState("");

  const createFolder = async () => {
    if (!folderName.trim()) return;

    try {
      const userId = useEncryptionStore.getState().userId;
      if (!userId) {
        console.error("Missing user ID");
        return;
      }

      //sanitize the folder

      function isSafePath(name) {
        return (
          !name.includes("..") && !name.includes("/") && !name.includes("\\")
        );
      }

      const reserved = ["CON", "PRN", "AUX", "NUL", "COM1", "LPT1", "LPT9"];
      function isReserved(name) {
        return reserved.includes(name.toUpperCase());
      }

      function truncate(name, maxLength = 100) {
        return name.length > maxLength ? name.slice(0, maxLength) : name;
      }

      function cleanFolderName(input) {
        const name = input
          .normalize("NFC")
          .replace(/[^a-zA-Z0-9-_ ]/g, "")
          .trim()
          .replace(/\s+/g, "_");

        if (!isSafePath(name) || isReserved(name)) {
          throw new Error("Unsafe or reserved folder name");
        }

        return truncate(name);
      }

      const newName = cleanFolderName(folderName);

      const fullPath = currentPath
        ? `${currentPath}/${newName}`
        : newName;

      const res = await fetch(getFileApiUrl("/createFolder"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          folderName: newName,
          parentPath: currentPath || "",
          description: "",
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        console.error("Failed to create folder:", error);
        return;
      }

      onFolderCreated?.();
      setFolderName("");
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating folder:", err);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Folder className="h-5 w-5" />
            Create New Folder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 dark:text-blue-400">
          <div>
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={newName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              onKeyPress={(e) => e.key === "Enter" && createFolder()}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={createFolder} disabled={!newName.trim()}>
              Create Folder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
