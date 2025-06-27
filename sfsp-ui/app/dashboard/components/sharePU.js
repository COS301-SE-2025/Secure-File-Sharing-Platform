'use client';

import { X } from 'lucide-react';

export default function Share({ isOpen, onClose, file }) {
  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-lg relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-4 text-blue-500">Share File</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Share <strong>{file.name}</strong> with others by entering their email below.
        </p>

        <input
          type="email"
          placeholder="Enter recipient's email"
          className="w-full px-4 py-2 mb-4 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-700 dark:text-white"
        />

        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
          Send Invite
        </button>
      </div>
    </div>
  );
}
