'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  FileText,
  Grid3X3,
  Users,
  Clock,
  Trash2,
  Settings,
  ChevronDown,
  LogOut
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch('http://localhost:5000/api/users/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const linkClasses = (path) => {
    const isActive =
      path === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(path);

    return `flex items-center gap-3 p-3 rounded-lg transition-colors ${
      isActive
        ? 'bg-gray-100 dark:bg-gray-700'
        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;
  };

  return (
    <aside className="w-64 bg-white text-gray-900 dark:bg-gray-800 dark:text-white p-6 shadow-md hidden md:block relative">
      {/* Logo and Title */}
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

      {/* Navigation */}
      <nav className="space-y-2">
        <a href="/dashboard" className={linkClasses('/dashboard')}>
          <Grid3X3 size={20} />
          <span>Dashboard</span>
        </a>
        <a href="/dashboard/myFiles" className={linkClasses('/dashboard/myFiles')}>
          <FileText size={20} />
          <span>My Files</span>
        </a>
        <a href="/dashboard/sharedWithMe" className={linkClasses('/dashboard/sharedWithMe')}>
          <Users size={20} />
          <span>Shared with Me</span>
        </a>
        <a href="/dashboard/accessLogs" className={linkClasses('/dashboard/accessLogs')}>
          <Clock size={20} />
          <span>Access Logs</span>
        </a>
        <a href="/dashboard/trash" className={linkClasses('/dashboard/trash')}>
          <Trash2 size={20} />
          <span>Trash</span>
        </a>
      </nav>

      {/* User Profile and Dropdown */}
      <div className="absolute bottom-6 left-6 right-6">
        <button
          className="flex items-center gap-3 p-3 w-full text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={() => setDropdownOpen((prev) => !prev)}
        >
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
            {user?.username?.slice(0, 2).toUpperCase() || '??'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.username || 'Loading...'}</div>
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
              className="flex items-center gap-2 px-4 py-2 w-full text-left text-sm text-red-600 hover:bg-red-100 dark:hover:bg-red-800 dark:text-red-400"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}

        <a href="/dashboard/settings" className={linkClasses('/dashboard/settings')}>
          <Settings size={20} />
          <span>Settings</span>
        </a>
      </div>
    </aside>
  );
}


// 'use client';

// import { useEffect, useState } from 'react';
// import { usePathname } from 'next/navigation';
// import Image from 'next/image';
// import {
//   FileText,
//   Grid3X3,
//   Users,
//   Clock,
//   Trash2,
//   Settings,
// } from 'lucide-react';

// export default function Sidebar() {
//   const pathname = usePathname();
//   const [user, setUser] = useState(null);

//   useEffect(() => {
//     const fetchProfile = async () => {
//       const token = localStorage.getItem('token');
//       // console.log('Token from localStorage:', token);

//       if (!token) return;

//       try {
//         const res = await fetch('http://localhost:5000/api/users/profile', {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         const result = await res.json();

//         if (!res.ok) throw new Error(result.message || 'Failed to fetch profile');
//         setUser(result.data);
//       } catch (err) {
//         console.error('Failed to fetch profile:', err.message);
//       }
//     };

//     fetchProfile();
//   }, []);

//   const linkClasses = (path) => {
//     const isActive =
//       path === '/dashboard'
//         ? pathname === '/dashboard'
//         : pathname.startsWith(path);

//     return `flex items-center gap-3 p-3 rounded-lg transition-colors ${
//       isActive
//         ? 'bg-gray-100 dark:bg-gray-700'
//         : 'hover:bg-gray-100 dark:hover:bg-gray-700'
//     }`;
//   };

//   return (
//     <aside className="w-64 bg-white text-gray-900 dark:bg-gray-800 dark:text-white p-6 shadow-md hidden md:block relative">
//       {/* Logo and Title */}
//       <div className="flex items-center gap-3 mb-8">
//         <Image
//           src="/img/shield-emp-black.png"
//           alt="SecureShare Logo Light"
//           width={28}
//           height={28}
//           className="block dark:hidden"
//         />
//         <Image
//           src="/img/shield-emp-white.png"
//           alt="SecureShare Logo Dark"
//           width={28}
//           height={28}
//           className="hidden dark:block"
//         />
//         <span className="text-xl font-bold tracking-tight">SecureShare</span>
//       </div>

//       {/* Navigation */}
//       <nav className="space-y-2">
//         <a href="/dashboard" className={linkClasses('/dashboard')}>
//           <Grid3X3 size={20} />
//           <span>Dashboard</span>
//         </a>
//         <a href="/dashboard/myFiles" className={linkClasses('/dashboard/myFiles')}>
//           <FileText size={20} />
//           <span>My Files</span>
//         </a>
//         <a href="/dashboard/sharedWithMe" className={linkClasses('/dashboard/sharedWithMe')}>
//           <Users size={20} />
//           <span>Shared with Me</span>
//         </a>
//         <a href="/dashboard/accessLogs" className={linkClasses('/dashboard/accessLogs')}>
//           <Clock size={20} />
//           <span>Access Logs</span>
//         </a>
//         <a href="/dashboard/trash" className={linkClasses('/dashboard/trash')}>
//           <Trash2 size={20} />
//           <span>Trash</span>
//         </a>
//       </nav>

//       {/* User Profile */}
//       <div className="absolute bottom-6 left-6 right-6">
//         <div className="flex items-center gap-3 p-3">
//           <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
//             {user?.username?.slice(0, 2).toUpperCase() || '??'}
//           </div>
//           <div className="flex-1 min-w-0">
//             <div className="text-sm font-medium truncate">{user?.username || 'Loading...'}</div>
//             <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
//               {user?.email || ''}
//             </div>
//           </div>
//         </div>
//         <a href="/dashboard/settings" className={linkClasses('/dashboard/settings')}>
//           <Settings size={20} />
//           <span>Settings</span>
//         </a>
//       </div>
//     </aside>
//   );
// }