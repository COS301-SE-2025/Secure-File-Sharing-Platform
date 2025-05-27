'use client';
import Sidebar from '@/app/dashboard/components/Sidebar';
import Topbar from '@/app/dashboard/components/Topbar';
import { DashboardSearchProvider } from '@/app/dashboard/components/DashboardSearchContext';

export default function DashboardLayout({ children }) {
  return (
    <DashboardSearchProvider>
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <Topbar />
          {children}
        </main>
      </div>
    </DashboardSearchProvider>
  );
}