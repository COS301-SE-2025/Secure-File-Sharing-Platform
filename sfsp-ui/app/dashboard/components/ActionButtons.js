'use client';
import { Bell, Sun, Moon, HelpCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import NotificationDropdown from './NotificationDropdown';
import TrainingDialog from './TrainingDialog';  

export function ActionButtons() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [showTraining, setShowTraining] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSupportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        {/* Bell Notification */}
        <div className="relative mr-2">
          <NotificationDropdown />
        </div>

        {/* Support Dropdown (click toggle) */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setSupportOpen((prev) => !prev)}
            className="w-10 h-10 flex items-center justify-center bg-gray-300 dark:bg-gray-800 
                       text-gray-800 dark:text-white rounded-full hover:bg-gray-400 dark:hover:bg-gray-700"
            title="Support"
          >
            <HelpCircle size={20} />
          </button>

          {supportOpen && (
            <div
              className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-700 border 
                         border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-20"
            >
              <button
                onClick={() => window.open('/Support/helpCenter', '_blank')}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-300 dark:hover:bg-gray-600"
              >
                Support
              </button>

              <button
                onClick={() =>
                  window.open(
                    'https://drive.google.com/uc?export=download&id=1-yaWriWhgCm1dGvmXHkv3gnCKsnmIjuj',
                    '_blank'
                  )
                }
                className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-300 dark:hover:bg-gray-600"
              >
                User Manual
              </button>

              <button
                onClick={() => {
                  setShowTraining(true);
                  setSupportOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-300 dark:hover:bg-gray-600"
              >
                Training
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center bg-gray-300 dark:bg-gray-800 
                       text-gray-800 dark:text-white rounded-full hover:bg-gray-400 dark:hover:bg-gray-700"
            title="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}
      </div>

      {/* Training Dialog */}
      <TrainingDialog open={showTraining} onClose={() => setShowTraining(false)} />
    </>
  );
}
