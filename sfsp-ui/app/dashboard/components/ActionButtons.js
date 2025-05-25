'use client';
import { Bell, Plus } from 'lucide-react';

export function ActionButtons() {
  return (
    <div className="flex items-center gap-3">
      <button className="relative w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
        <Bell className="h-5 w-5 text-gray-600" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
      </button>
      <button className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center">
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}