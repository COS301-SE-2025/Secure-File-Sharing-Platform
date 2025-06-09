'use client';
import { Bell } from 'lucide-react';
import { useState, useRef,useEffect  } from 'react';

export function ActionButtons() {
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
    <div className="flex items-center space-x-2">
      <button  className="relative w-10 h-10 rounded-full bg-gray-200 hover:bg-blue-300 flex items-center justify-center mr-10">
        <Bell className="h-5 w-5 text-gray-600" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
    
        
      </button>
      <div className="relative inline-block text-left mr-10" ref={dropdownRef}>
        <button onClick={() => setOpen((prev) => !prev)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full text-left">
          + New
        </button>

        <div
          className={`transition-all duration-200 origin-top transform ${
            open ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
          } absolute mt-2 w-48 right-5 bg-blue-100 border border-blue-300 rounded shadow-lg z-10`}
        >
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md z-8">
                <button className="w-full text-left px-4 py-2 hover:bg-blue-300 dark:hover:bg-gray-700">Upload File</button>
                <button className="w-full text-left px-4 py-2 hover:bg-blue-300 dark:hover:bg-gray-700">Upload Folder</button>
                <button className="w-full text-left px-4 py-2 hover:bg-blue-300 dark:hover:bg-gray-700">New Document</button>
                <button className="w-full text-left px-4 py-2 hover:bg-blue-300 dark:hover:bg-gray-700">New Folder</button>
        </div>


        </div>
      </div>
    </div>
  );
}
