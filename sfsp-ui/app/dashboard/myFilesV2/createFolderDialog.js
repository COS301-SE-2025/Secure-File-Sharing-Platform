//app/dashboard/myFilesV2/createFolderDialogue.js

import React, { useState } from 'react';
import { Folder } from 'lucide-react';

export function CreateFolderDialog({ open, onOpenChange }) {
  const [folderName, setFolderName] = useState('');

  const createFolder = () => {
    if (folderName.trim()) {
      console.log('Creating folder:', folderName);
      setFolderName('');
      onOpenChange(false);
    }
  };

  const Dialog = ({ open, onOpenChange, children }) => {
    return open ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
          {children}
        </div>
      </div>
    ) : null;
  };

  const DialogContent = ({ children }) => <div className="p-6">{children}</div>;

  const DialogHeader = ({ children }) => <div className="mb-4">{children}</div>;

  const DialogTitle = ({ children }) => (
    <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">{children}</h2>
  );

  const Button = ({ children, onClick, variant = 'primary', disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-md ${
        variant === 'outline'
          ? 'border border-gray-300 text-gray-700'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  const Input = ({ id, value, onChange, placeholder, onKeyPress }) => (
    <input
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onKeyPress={onKeyPress}
      className="w-full border border-gray-300 rounded-md px-4 py-2"
    />
  );

  const Label = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
      {children}
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Folder className="h-5 w-5" />
            Create New Folder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              onKeyPress={(e) => e.key === 'Enter' && createFolder()}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={createFolder} disabled={!folderName.trim()}>
              Create Folder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
