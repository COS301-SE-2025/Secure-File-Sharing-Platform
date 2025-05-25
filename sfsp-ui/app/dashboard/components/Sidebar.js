'use client';

import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  FileText,
  Grid3X3,
  Users,
  Clock,
  Trash2,
  Settings,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const linkClasses = (path) => {
    const isActive =
      path === '/dashboard'
        ? pathname === '/dashboard' 
        : pathname.startsWith(path); 

    return `flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
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

      {/* User Profile at Bottom */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="flex items-center gap-3 p-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">John Doe</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              johndoe@gmail.com
            </div>
          </div>
        </div>
        <a href="/dashboard/settings" className={linkClasses('/dashboard/settings')}>
          <Settings size={20} />
          <span>Settings</span>
        </a>
      </div>
    </aside>
  );
}


// 'use client';
// import { FileText, Grid3X3, Users, Clock, Trash2, Settings } from 'lucide-react';
// import Image from 'next/image';
// import Link from 'next/link';
// import { usePathname } from 'next/navigation';

// const pathname = usePathname();

// export default function Sidebar() {
//   return (
//     <aside className="w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-6 shadow-md hidden md:block relative">
//       <div className="flex items-center gap-3 mb-8">
//         <Image src="/img/shield-emp-black.png" alt="Light Logo" width={28} height={28} className="block dark:hidden" />
//         <Image src="/img/shield-emp-white.png" alt="Dark Logo" width={28} height={28} className="hidden dark:block" />
//         <span className="text-xl font-bold tracking-tight">SecureShare</span>
//       </div>

//       <nav className="space-y-2">
//         <Link href="/dashboard" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
//           <Grid3X3 size={20} />
//           <span>Dashboard</span>
//         </Link>
//         <Link href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
//           <FileText size={20} />
//           <span>My Files</span>
//         </Link>
//         <Link href="/dashboard/sharedWithMe" className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 transition-colors">
//           <Users size={20} />
//           <span>Shared with Me</span>
//         </Link>
//         <Link href="/dashboard/accessLogs" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
//           <Clock size={20} />
//           <span>Access Logs</span>
//         </Link>
//         <Link href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
//           <Trash2 size={20} />
//           <span>Trash</span>
//         </Link>
//       </nav>

//       <div className="absolute bottom-6 left-6 right-6">
//         <div className="flex items-center gap-3 p-3">
//           <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
//             JD
//           </div>
//           <div className="flex-1 min-w-0">
//             <div className="text-sm font-medium truncate">John Doe</div>
//             <div className="text-xs text-gray-500 dark:text-gray-400 truncate">johndoe@gmail.com</div>
//           </div>
//         </div>
//         <Link href="#" className="flex items-center gap-3 p-3 mt-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
//           <Settings size={20} />
//           <span>Settings</span>
//         </Link>
//       </div>
//     </aside>
//   );
// }