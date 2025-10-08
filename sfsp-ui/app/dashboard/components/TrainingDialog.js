'use client';
import { X } from 'lucide-react';
import { useState } from 'react';

export default function TrainingDialog({ open, onClose }) {
  const [activeSection, setActiveSection] = useState('Dashboard');

  if (!open) return null;

  const sections = {
    'Dashboard': {
      title: 'Dashboard Overview',
      content: (
        <p>
          The dashboard provides a quick overview statistics of your shared, received, and recent files.
        </p>
      ),
    },
    'My Files': {
      title: 'My Files',
      subtopics: [
        {
          heading: 'Overview',
          text: 'The My Files section lists all files you own or uploaded. You can sort, filter, and search them easily using the toolbar.',
        },
        {
          heading: 'Uploading Files',
          text: 'Click the Upload button to add new files. Files are encrypted before leaving your device for security.',
        },
        {
          heading: 'Sharing Files',
          text: 'Select a file and right click to see menu context. Click Share : enter the user`s email and press the add symbol to add the user to the share list. You can share with view-only or download.',
        },
        {
          heading: 'File Details',
          text: 'Click on a file to view details like size, type, and modification date.',
        },
        {
          heading: 'Deleting Files',
          text: 'Use the Delete option in the context menu to move files to Trash. You can restore them later if needed.',
        },
        {
          heading: 'Drag and Drop and Short-Cuts',
          text: (
            <>
                You can drag and drop files to move them between folders or upload them directly from your device.
                <br /><br />
                Ctrl+C (Cut) • Ctrl+V (Paste) • Del (Delete) •
                Enter (Open) • Backspace (Back) • Ctrl+D (New Folder) • Ctrl+U (Upload) • Ctrl+1/2 (Switch View) • Esc (Clear
            </>
          ),
        },
      ],
    },
    'Shared Files': {
      title: 'Shared Files',
      subtopics: [
        {
          heading: 'Overview',
          text: 'View files that were shared to you.',
        },
        {
          heading: 'Context Menu',
          text: 'Right click on the file to get the context menu to view files and so forth.',
        },
      ],
    },
    'Access Logs': {
      title: 'Access Logs',
      subtopics: [
        {
          heading: 'Overview',
          text: 'View your file activity.',
        },
        {
          heading: 'Filtering',
          text: 'You can filter or sort using the appropriate drop-down and search area.',
        },
        {
          heading: 'Download Access Logs',
          text: 'Export your logs either in pdf or csv format.',
        },
      ],
    },
    'Trash': {
      title: 'Trash',
      subtopics: [
        {
          heading: 'Overview',
          text: 'View your deleted files.',
        },
        {
          heading: 'Restore your files',
          text: 'Restore your files by clicking on `restore`',
        },
        {
          heading: 'Permanent deletion',
          text: 'Permanent delete your files by clearing you trash or deleting a singular one with the `delete` button.',
        },
      ],
    },
  };

  const active = sections[activeSection];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-[90%] max-w-4xl relative flex overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
        >
          <X size={20} />
        </button>

        {/* Left menu */}
        <div className="w-1/3 bg-gray-100 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 p-4 overflow-y-auto max-h-[80vh]">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Training Topics</h3>
          <ul className="space-y-2">
            {Object.keys(sections).map((key) => (
              <li key={key}>
                <button
                  onClick={() => setActiveSection(key)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${activeSection === key
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  {key}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Right content */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[80vh]">
          <h2 className="text-lg font-semibold mb-3 dark:text-white">{active.title}</h2>

          {/* If section has subtopics */}
          {active.subtopics ? (
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              {active.subtopics.map((item, i) => (
                <div key={i} className="mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{item.heading}</h4>
                  <p className="text-gray-700 dark:text-gray-300">{item.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-700 dark:text-gray-300">{active.content}</div>
          )}
        </div>
      </div>
    </div>
  );
}