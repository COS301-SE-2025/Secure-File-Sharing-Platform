'use client';
import { useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";

export default function Dashboard() {
  const [selectedView, setSelectedView] = useState("Home");
  const [showContent, setShowContent] = useState(true);

  const renderContent = () => {
    switch (selectedView) {
      case "Home":
        return (
          <>
            <h2 className="text-2xl font-bold mb-4">Home</h2>
            <ul className="space-y-2">
              <li>All Files</li>
              <li>Favourited</li>
              <li>Deleted Items</li>
              <li>Signatures</li>
            </ul>
          </>
        );
      case "Shared with Me":
        return <h2 className="text-2xl font-bold mb-4">Shared with Me</h2>;
      case "Recent":
        return <h2 className="text-2xl font-bold mb-4">Recent Files</h2>;
      case "Trash":
        return <h2 className="text-2xl font-bold mb-4">Trash</h2>;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 p-6 shadow-md">
        <h1 className="text-2xl font-bold mb-8">SecureShare</h1>
        <nav className="space-y-4">
          {["Home", "Shared with Me", "Recent", "Trash"].map((item) => (
            <button
              key={item}
              onClick={() => setSelectedView(item)}
              className={`block w-full text-left hover:text-blue-600 dark:hover:text-blue-400 ${
                selectedView === item ? "font-semibold text-blue-600 dark:text-blue-400" : ""
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      {/* Toggle Button */}
      <div className="flex flex-col justify-center bg-gray-200 dark:bg-gray-700 px-1">
        <button
          onClick={() => setShowContent((prev) => !prev)}
          className="p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          {showContent ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Right Content */}
      {showContent && (
        <main className="flex-1 p-8 transition-all duration-300 ease-in-out">
          {renderContent()}
        </main>
      )}
    </div>
  );
}



// 'use client';

// import { useState } from 'react';
// import { Folder, FileText, Upload, Search, MoreVertical } from 'lucide-react';
// import Image from 'next/image';

// // mock files
// const files = [
//   { name: 'Project Plan.pdf', type: 'file' },
//   { name: 'Invoices', type: 'folder' },
//   { name: 'Meeting Notes.txt', type: 'file' },
//   { name: 'Capstone.txt', type: 'file' },
//   { name: 'Designs', type: 'folder' },
// ];

// export default function DashboardPage() {
//   const [search, setSearch] = useState('');

//   return (
//     <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white">
//       {/* Sidebar */}
//       <aside className="w-64 bg-white text-gray-900 dark:bg-gray-800 dark:text-white p-6 shadow-md hidden md:block">
//         <div className="flex items-center gap-3">
//           <Image src="/img/shield-emp-black.png" alt="SecureShare Logo Light" width={28} height={28} className="block dark:hidden" />
//           <Image src="/img/shield-emp-white.png" alt="SecureShare Logo Dark" width={28} height={28} className="hidden dark:block" />
//           <span className="text-xl font-bold tracking-tight">SecureShare</span>
//         </div>

//         <button className="mt-10 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md flex items-center justify-center gap-2">
//           <Upload size={18} />
//           Upload
//         </button>

//         <nav className="space-y-4">
//           <a href="#" className="block hover:text-blue-600 dark:hover:text-blue-400">
//             My Drive
//           </a>
//           <a href="#" className="block hover:text-blue-600 dark:hover:text-blue-400">
//             Shared with Me
//           </a>
//           <a href="#" className="block hover:text-blue-600 dark:hover:text-blue-400">
//             Recent
//           </a>
//           <a href="#" className="block hover:text-blue-600 dark:hover:text-blue-400">
//             Trash
//           </a>
//         </nav>
        
//       </aside>

//       {/* Main */}
//       <main className="flex-1 flex flex-col">
//         {/* Top Bar */}
//         <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
//           <div className="flex items-center gap-2 w-full max-w-md bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-md">
//             <Search size={18} className="text-gray-500" />
//             <input
//               type="text"
//               placeholder="Search your files..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="w-full bg-transparent focus:outline-none text-sm"
//             />
//           </div>
//           <div className="flex items-center gap-3">
//             <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">S</div>
//             <MoreVertical className="text-gray-500 dark:text-gray-300 cursor-pointer" />
//           </div>
//         </div>

//       </main>
//     </div>
//   );
// }
