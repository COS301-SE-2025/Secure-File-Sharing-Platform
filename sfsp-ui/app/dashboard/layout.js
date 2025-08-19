'use client';
import { useState, useEffect } from 'react';
import Sidebar from '@/app/dashboard/components/Sidebar';
import Topbar from '@/app/dashboard/components/Topbar';
import { DashboardSearchProvider } from '@/app/dashboard/components/DashboardSearchContext';

export default function DashboardLayout({ children }) {
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const savedExpanded = localStorage.getItem('sidebarExpanded');
    if (savedExpanded !== null) {
      setExpanded(savedExpanded === 'true');
    }
  }, []);

  const handleSetExpanded = (newExpanded) => {
    setExpanded(newExpanded);
    localStorage.setItem('sidebarExpanded', newExpanded.toString());
  };

  return (
    <DashboardSearchProvider>
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
        <Sidebar
          expanded={expanded}
          setExpanded={handleSetExpanded}
          isHovered={isHovered}
          setIsHovered={setIsHovered}
        />
        <main
          className={`flex-1 flex flex-col pt-16 transition-all duration-300 ${
            expanded ? 'ml-64' : isHovered ? 'ml-64' : 'ml-16'
          }`}
        >
          <Topbar />
          {children}
        </main>
      </div>
    </DashboardSearchProvider>
  );
}
