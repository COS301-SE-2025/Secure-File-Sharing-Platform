'use client';

import { useRef, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { UserAvatar } from '@/app/lib/avatarUtils';
import { getApiUrl } from "@/lib/api-config";
import { logout } from '@/app/lib/auth';
import {
  FileText,
  Grid3X3,
  Users,
  Clock,
  Trash2,
  Settings,
  ChevronDown,
  LogOut,
} from 'lucide-react';

export default function Sidebar({ expanded, setExpanded, isHovered, setIsHovered }) {
  const pathname = usePathname();
  const router = useRouter();
  const settingsDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const showExpanded = expanded || isHovered;
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  const handleLogout = (e) => {
    e?.stopPropagation();
    e?.preventDefault();
    logout();
    router.push('/auth');
  };

  const toggleSidebar = () => {
    setExpanded(!expanded);
    if (expanded) {
      setDropdownOpen(false);
      setSettingsOpen(false);
    }
  };

  // Load user profile
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(getApiUrl('/users/profile'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed to fetch profile');
        setUser(result.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err.message);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target)) &&
        (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target))
      ) {
        setSettingsOpen(false);
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
    setSettingsOpen(false);
    if (!expanded) setIsHovered(false);
  }, [pathname, expanded, setIsHovered]);

  const navigationItems = [
    { href: '/dashboard', icon: Grid3X3, label: 'Dashboard' },
    { href: '/dashboard/myFilesV2', icon: FileText, label: 'My Files' },
    { href: '/dashboard/sharedWithMe', icon: Users, label: 'Shared with Me' },
    { href: '/dashboard/accessLogs', icon: Clock, label: 'Access Logs' },
    { href: '/dashboard/trash', icon: Trash2, label: 'Trash' },
  ];

  const linkClasses = (path) => {
    const safePathname = pathname || '';
    const isActive =
      path === '/dashboard'
        ? safePathname === '/dashboard'
        : safePathname.startsWith(path);

    return `flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive
      ? 'text-black dark:text-white font-bold bg-blue-300 dark:bg-gray-700'
      : 'hover:bg-blue-300 dark:hover:bg-gray-700'
      } ${!showExpanded ? 'justify-center' : ''}`;
  };

  return (
    <aside
      data-testid="sidebar"
      className={`fixed top-0 left-0 h-screen
        ${showExpanded ? 'w-64' : 'w-16'}
        bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white
        p-4 shadow-md hidden md:flex flex-col
        transition-all duration-300 ease-in-out z-40`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo + Toggle */}
      <div
        className={`flex items-center mb-8 cursor-pointer ${showExpanded ? 'justify-between gap-3' : 'justify-center'
          }`}
        onClick={toggleSidebar}
      >
        <div className="flex items-center gap-3">
          <Image src="/img/shield-emp-black.png" alt="Logo Light" width={28} height={28} className="block dark:hidden" />
          <Image src="/img/shield-emp-white.png" alt="Logo Dark" width={28} height={28} className="hidden dark:block" />
          {showExpanded && <span className="text-xl font-bold tracking-tight">SecureShare</span>}
        </div>

        {/* Arrows */}
        {!expanded && isHovered && <span className="text-gray-600 dark:text-gray-300 font-bold text-lg select-none">&raquo;</span>}
        {expanded && <span className="text-gray-600 dark:text-gray-300 font-bold text-lg select-none">&laquo;</span>}
      </div>

      {/* Navigation */}
      <nav className="space-y-2 flex-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.href} className="relative group">
              <a href={item.href} className={linkClasses(item.href)}>
                <Icon size={22} className="flex-shrink-0" />
                {showExpanded && <span className="flex-shrink-0">{item.label}</span>}
              </a>
              {!showExpanded && (
                <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2
            bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded
            opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10"
                >
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className={`border-t border-gray-300 dark:border-gray-600 my-2 ${!showExpanded ? 'mx-auto w-8' : ''}`} />

      {/* Bottom Section */}
      <div className={`flex flex-col gap-3 mt-auto ${showExpanded ? '' : 'items-center'}`}>
        {/* Settings */}
        <div className="relative" onMouseEnter={() => setSettingsOpen(true)} onMouseLeave={() => setSettingsOpen(false)}>
          <button
            className={`flex items-center gap-3 p-3 rounded-lg hover:bg-blue-300 dark:hover:bg-gray-700 transition-colors ${!showExpanded ? 'justify-center' : 'w-full justify-start'}`}  >
            <Settings size={20} />
            {showExpanded && <span>Settings</span>}
            {showExpanded && <ChevronDown size={16} className="ml-auto" />}
          </button>

          {settingsOpen && showExpanded && (
            <div className="absolute bottom-12 w-48 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10">
              <a href="../../Settings/accountSettings/" className="block px-4 py-2 text-sm hover:bg-blue-300 dark:hover:bg-gray-600">
                Account Settings
              </a>
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-blue-300 dark:hover:bg-gray-600"
                >
                  {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* User */}
        <div className="relative" onMouseEnter={() => setDropdownOpen(true)} onMouseLeave={() => setDropdownOpen(false)} >
          <button className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors  ${!showExpanded ? 'justify-center' : 'w-full justify-start'}`}  >
            <UserAvatar avatarUrl={user?.avatar_url} username={user?.username} size="w-10 h-10 flex-shrink-0" />
            {showExpanded && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.username || 'Loading...'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || ''}</p>
              </div>
            )}
            {showExpanded && <ChevronDown size={18} className="flex-shrink-0" />}
          </button>

          {dropdownOpen && showExpanded && (
            <div className="absolute bottom-14 w-48 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-20">
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-100 dark:hover:bg-gray-900 dark:text-red-400 w-full text-left">
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
