'use client';
import { useState } from 'react';
import { Grid3X3, List, Users } from 'lucide-react';
import FileCard from '@/app/dashboard/components/FileCard';
import FileTable from '@/app/dashboard/components/FileTable';
import { useDashboardSearch } from '@/app/dashboard/components/DashboardSearchContext';

const sharedFiles = [
    {
        name: 'Strategy.docx',
        size: '2.3 MB',
        sharedBy: 'John Cooper',
        sharedTime: '2 days ago',
        type: 'document'
    },
    {
        name: 'Roadmap.xlsx',
        size: '1.8 MB', 
        sharedBy: 'Robert Fox',
        sharedTime: '5 days ago',
        type: 'document'
    },
    {
        name: 'Banner.png',
        size: '850 KB',
        sharedBy: 'Emily Wilson',
        sharedTime: '1 week ago',
        type: 'image'
    },
    {
        name: 'Presentation.pptx',
        size: '5.7 MB',
        sharedBy: 'Michael Brown',
        sharedTime: '2 weeks ago',
        type: 'document'
    }
];

export default function SharedWithMePage() {
  const [viewMode, setViewMode] = useState('grid');
  const { search } = useDashboardSearch();

  const filteredFiles = sharedFiles.filter(file =>
    file.name.toLowerCase().includes(search.toLowerCase()) ||
    file.sharedBy.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-blue-500 ">Shared with me</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Files and folders that have been shared with you</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-500 hover:bg-blue-300 dark:hover:bg-gray-700'}`}>
            <Grid3X3 size={20} />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-gray-200 dark:bg-gray-700' : 'text-gray-500 hover:bg-blue-300 dark:hover:bg-gray-700'}`}>
            <List size={20} />
          </button>
        </div>
      </div>

      {filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No shared files found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {search ? 'Try adjusting your search terms.' : 'Files shared with you will appear here.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFiles.map((file, idx) => <FileCard key={idx} file={file} />)}
        </div>
      ) : (
        <FileTable files={filteredFiles} />
      )}
    </div>
  );
}
