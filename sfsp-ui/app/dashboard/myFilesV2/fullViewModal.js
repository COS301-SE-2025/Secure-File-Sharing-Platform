"use client";

import React from "react";

export function FullViewModal({ file, content, onClose }) {
  return (
    <>
      {file && (
        <>
          {/* overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => onClose(null)}
          ></div>

          {/* modal */}
          <div className="fixed left-1/2 top-1/2 z-50 max-w-5xl w-full transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h2
                className="text-lg font-semibold truncate max-w-[80%] text-gray-700"
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

            {file?.type === "image" && content?.url && (
              <div className="flex justify-center">
                <img
                  src={content.url}
                  alt="Full view"
                  className="max-w-full rounded"
                />
              </div>
            )}
            {file?.type === "pdf" && content?.url && (
              <iframe
                src={content.url}
                className="w-full h-[80vh] rounded"
              ></iframe>
            )}
            {content?.text && (
              <pre className="p-4 bg-gray-100 rounded whitespace-pre-wrap">
                {content.text}
              </pre>
            )}
          </div>
        </>
      )}
    </>
  );
}
