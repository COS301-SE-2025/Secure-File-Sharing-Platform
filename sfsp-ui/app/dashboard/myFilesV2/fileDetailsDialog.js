// app/dashboard/myFilesV2/fileDetailsDialog.js

import React from 'react';
import { Calendar, HardDrive, Share, User, Star } from 'lucide-react';

export function FileDetailsDialog({ open, onOpenChange, file }) {
  if (!file || !open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">File Details</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-xl hover:text-gray-700"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        {/* File Summary */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg truncate">{file.name}</h3>
          <p className="text-sm text-gray-500">
            {file.type.charAt(0).toUpperCase() + file.type.slice(1)} file
          </p>
          <div className="flex items-center gap-2 mt-2">
            {file.starred && (
              <span className="px-2 py-1 text-xs border rounded flex items-center gap-1">
                <Star className="h-3 w-3" /> Starred
              </span>
            )}
            {file.shared && (
              <span className="px-2 py-1 text-xs bg-gray-200 rounded flex items-center gap-1">
                <Share className="h-3 w-3" /> Shared
              </span>
            )}
          </div>
        </div>

        <hr />

        {/* File Metadata */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <HardDrive className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium">Size</p>
              <p className="text-sm text-gray-600">{file.size}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium">Last Modified</p>
              <p className="text-sm text-gray-600">{file.modified}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm font-medium">Owner</p>
              <p className="text-sm text-gray-600">You</p>
            </div>
          </div>
        </div>

        <hr />

        {/* Location */}
        <div>
          <p className="text-sm font-medium mb-1">Location</p>
          <p className="text-sm text-gray-600">
            My Files / {file.category ?? "Unknown"}
          </p>
        </div>
      </div>
    </div>
  );
}
