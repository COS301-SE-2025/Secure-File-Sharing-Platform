'use client';

import { FileText, Users, Clock, ShieldCheck } from 'lucide-react';

export default function DashboardHomePage() {
  const stats = [
    {
      icon: <FileText className="text-blue-600 dark:text-blue-400" size={24} />,
      label: 'My Files',
      value: 124,
    },
    {
      icon: <Users className="text-green-600 dark:text-green-400" size={24} />,
      label: 'Shared with Me',
      value: 68,
    },
    {
      icon: <Clock className="text-purple-600 dark:text-purple-400" size={24} />,
      label: 'Recent Access',
      value: 37,
    },
    {
      icon: <ShieldCheck className="text-yellow-600 dark:text-yellow-400" size={24} />,
      label: 'Secure Links',
      value: 12,
    },
  ];

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
      <h1 className="text-2xl font-semibold mb-2 text-blue-500">Welcome!</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-7">
        Here's a quick look at your file sharing activity.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 p-4 bg-gray-200 dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{item.label}</p>
              <p className="text-xl font-bold">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}