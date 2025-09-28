'use client';

import { useRef, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { UserAvatar } from '@/app/lib/avatarUtils';
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";
import {
  FileText,
  Grid3X3,
  Users,
  Clock,
  Trash2,
  Settings,
  ChevronDown,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const toggleSidebar = () => {
    setExpanded(!expanded);
    if (expanded) {
      setDropdownOpen(false);
      setSettingsOpen(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/proxy/auth/profile');
        console.log("Res", res);
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed to fetch profile');
        console.log("Result data is: ",result.data);
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
        (settingsDropdownRef.current &&
          !settingsDropdownRef.current.contains(event.target)) &&
        (profileDropdownRef.current &&
          !profileDropdownRef.current.contains(event.target))
      ) {
        setSettingsOpen(false);
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('encryption-store');
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    document.cookie = "csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    router.push('/');
  };

  const linkClasses = (path) => {
    const safePathname = pathname || '';
    const isActive =
      path === '/dashboard'
        ? safePathname === '/dashboard'
        : safePathname.startsWith(path);

    return `flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive
        ? 'text-black dark:text-white font-bold bg-blue-300 dark:bg-gray-700'
        : 'hover:bg-blue-300 dark:hover:bg-gray-700'
      } ${!showExpanded ? 'justify-center tooltip-container' : ''}`;
  };

  const navigationItems = [
    { href: '/dashboard', icon: Grid3X3, label: 'Dashboard' },
    { href: '/dashboard/myFilesV2', icon: FileText, label: 'My Files' },
    { href: '/dashboard/sharedWithMe', icon: Users, label: 'Shared with Me' },
    { href: '/dashboard/accessLogs', icon: Clock, label: 'Access Logs' },
    { href: '/dashboard/trash', icon: Trash2, label: 'Trash' },
  ];

  return (
    <aside
      data-testid="sidebar"
      className={`fixed top-0 left-0 h-screen ${showExpanded ? 'w-64' : 'w-16'
        } bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-white 
        p-6 shadow-md hidden md:flex flex-col transition-all duration-300 ease-in-out z-40`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (!expanded) {
          setDropdownOpen(false);
          setSettingsOpen(false);
        }
      }}
    >
      {/* Logo and Title */}
      {showExpanded ? (
        <div className="flex items-center gap-3 mb-8">
          <Image
            src="/img/shield-emp-black.png"
            alt="SecureShare Logo Light"
            width={28}
            height={28}
            className="block dark:hidden"
          />
          <Image
            src="/img/shield-emp-white.png"
            alt="SecureShare Logo Dark"
            width={28}
            height={28}
            className="hidden dark:block"
          />
          <span className="text-xl font-bold tracking-tight">SecureShare</span>
        </div>
      ) : (
        <div className="flex justify-center mb-8">
          <Image
            src="/img/shield-emp-black.png"
            alt="SecureShare Logo Light"
            width={28}
            height={28}
            className="block dark:hidden"
          />
          <Image
            src="/img/shield-emp-white.png"
            alt="SecureShare Logo Dark"
            width={28}
            height={28}
            className="hidden dark:block"
          />
        </div>
      )}

      {/* Navigation */}
      <nav className="space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.href} className="relative group">
              <a href={item.href} className={linkClasses(item.href)}>
                <Icon size={20} />
                {showExpanded && <span>{item.label}</span>}
              </a>
              {!showExpanded && (
                <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div
        className={`absolute bottom-6 ${showExpanded ? 'left-6 right-6' : 'left-2 right-2'
          } flex flex-col gap-3`}
      >
        {/* Pin/Unpin Button */}
        <button
          data-testid="sidebar-toggle"
          onClick={toggleSidebar}
          className="flex items-center justify-center p-3 rounded-lg hover:bg-blue-300 dark:hover:bg-gray-700 transition-colors border-t border-gray-300 dark:border-gray-600 pt-3"
          title={expanded ? 'Auto-Hide Sidebar' : 'Pin Sidebar Open'}
        >
          {expanded ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          {showExpanded && (
            <span className="ml-2 text-sm">
              {expanded ? 'Auto-Hide' : 'Pin Open'}
            </span>
          )}
        </button>

        {/* Profile + Settings */}
        {showExpanded ? (
          <>
            {/* User Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                data-testid="profile-button"
                className="flex items-center gap-3 p-3 w-full text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setDropdownOpen((prev) => !prev)}
              >
                <UserAvatar
                  avatarUrl={user?.avatar_url}
                  username={user?.username}
                  size="w-10 h-10"
                  alt="Avatar"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {user?.username || 'Loading...'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email || ''}
                  </div>
                </div>
                <ChevronDown size={18} />
              </button>

              {dropdownOpen && (
                <div className="mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 w-full text-left text-sm text-red-600 hover:bg-red-100 dark:hover:bg-gray-900 dark:text-red-400"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Settings Dropdown */}
            <div className="relative" ref={settingsDropdownRef}>
              <button
                data-testid="settings-dropdown"
                onClick={() => setSettingsOpen((prev) => !prev)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-300 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings size={20} />
                <span>Settings</span>
                <ChevronDown size={16} className="ml-auto" />
              </button>

              {settingsOpen && (
                <div
                  data-testid="settings-dropdown"
                  className="absolute right-0 bottom-12 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-10"
                >
                  <a
                    href="../../Settings/accountSettings/"
                    className="block px-4 py-2 text-sm hover:bg-blue-300 dark:hover:bg-gray-600"
                  >
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
          </>
        ) : (
          // Collapsed Profile
          <div className="relative" ref={profileDropdownRef}>
            <button
              data-testid="profile-button"
              className="flex items-center justify-center p-3 w-full rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              <UserAvatar
                avatarUrl={user?.avatar_url}
                username={user?.username}
                size="w-10 h-10"
                alt="Avatar"
              />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 bottom-16 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-20">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                  <div className="text-sm font-medium truncate">
                    {user?.username || 'Loading...'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email || ''}
                  </div>
                </div>
                <a
                  href="../../Settings/accountSettings/"
                  className="block px-4 py-2 text-sm hover:bg-blue-300 dark:hover:bg-gray-600"
                >
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
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 w-full text-left text-sm text-red-600 hover:bg-red-100 dark:hover:bg-gray-900 dark:text-red-400"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
