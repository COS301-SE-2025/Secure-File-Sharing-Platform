'use client';
import { Search } from 'lucide-react';
import { ActionButtons } from './ActionButtons';
import { useState, useRef,useEffect  } from 'react';
import { useDashboardSearch } from '@/app/dashboard/components/DashboardSearchContext';

export default function Topbar() {
  const { search, setSearch } = useDashboardSearch();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

   return (
    <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-800">
      <div className="flex items-center gap-2 w-full max-w-md bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md ml-120 border">
        <Search size={18} className="text-gray-500" />
        <input
          type="text"
          placeholder="Search files and folders"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent focus:outline-none text-sm placeholder-gray-500"
        />
      </div>



      <ActionButtons />
    </div>
  );
}