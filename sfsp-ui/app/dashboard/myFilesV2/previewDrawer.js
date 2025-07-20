"use client";

import React from "react";

export function PreviewDrawer({ file, content, onClose, onOpenFullView, onSaveDescription }) {
  const [description, setDescription] = React.useState(file?.description || "");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    setDescription(file?.description || "");
    setIsEditing(false);
  }, [file]);

  const handleSaveDescription = async () => {
    if (!file) return;
    try {
      if (description === file.description) {
        setIsEditing(false);
        return;
      }
      setIsSaving(true);
      await onSaveDescription(file.id, description);
      file.description = description;
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDescription(file?.description || "");
    setIsEditing(false);
  };

  return (
    <div
      className={`fixed top-0 right-0 w-96 h-full bg-white shadow-lg z-50 transform transition-transform duration-300 ${
        file ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2
            className="text-xl font-semibold truncate max-w-[70%] text-gray-700"
            title={file?.name}
          >
            {file?.name}
          </h2>
          <button
            onClick={() => onClose(null)}
            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition"
            title="Close"
          >
            ✖
          </button>
        </div>

        {/* File Info */}
        <div className="space-y-2">
          <div className="text-sm text-gray-600">Type: {file?.type}</div>
          <div className="text-sm text-gray-600">Size: {file?.size}</div>
          <div className="text-sm text-gray-600">Modified: {file?.modified}</div>

          {/* Preview */}
          {(() => {
            switch (file?.type) {
              case "image":
                return content?.url ? (
                  <div className="max-h-64 overflow-hidden rounded">
                    <img src={content.url} alt="Preview" className="w-full object-cover" />
                  </div>
                ) : null;
              case "video":
                return content?.url ? (
                  <video controls src={content.url} className="w-full max-h-64 rounded" />
                ) : null;
              case "audio":
                return content?.url ? (
                  <audio controls className="w-full mt-2">
                    <source src={content.url} />
                    Your browser does not support the audio element.
                  </audio>
                ) : null;
              case "pdf":
                return content?.url ? (
                  <iframe src={content.url} className="w-full h-64 rounded" />
                ) : null;
              case "txt":
              case "json":
              case "csv":
              case "html":
                return content?.text ? (
                  <pre className="p-2 bg-gray-100 rounded max-h-48 overflow-y-auto">
                    {content.text}
                  </pre>
                ) : null;
              default:
                return (
                  <div className="p-4 bg-gray-50 border rounded text-center text-sm text-gray-500">
                    ❌ This file type cannot be previewed.
                  </div>
                );
            }
          })()}
        </div>

        {/* Description Section */}
        <div className="mt-4 text-sm text-gray-700">
          <label className="block font-medium mb-1">Description:</label>

          {!isEditing ? (
            <div className="flex justify-between items-start">
              <p className="text-gray-600 whitespace-pre-wrap">{file?.description || "—"}</p>
              <button
                onClick={() => setIsEditing(true)}
                className="ml-2 text-sm text-blue-600 hover:underline"
              >
                Edit
              </button>
            </div>
          ) : (
            <>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleSaveDescription}
                  disabled={isSaving || description === file?.description}
                  className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-1 rounded border text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        {/* Full View Button */}
        <button
          onClick={() => onOpenFullView(file)}
          className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Open Full View
        </button>
      </div>
    </div>
  );
}
