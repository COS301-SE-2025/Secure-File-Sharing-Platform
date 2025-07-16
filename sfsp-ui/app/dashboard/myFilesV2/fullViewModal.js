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

            <div className="space-y-4">
              {(() => {
                switch (file?.type) {
                  case "image":
                    return content?.url ? (
                      <div className="flex justify-center">
                        <img
                          src={content.url}
                          alt="Full view"
                          className="max-w-full rounded"
                        />
                      </div>
                    ) : null;

                  case "video":
                    return content?.url ? (
                      <video
                        controls
                        src={content.url}
                        className="w-full max-h-[80vh] rounded"
                      ></video>
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
                      <iframe
                        src={content.url}
                        className="w-full h-[80vh] rounded"
                      ></iframe>
                    ) : null;

                  case "txt":
                  case "json":
                  case "csv":
                  case "html":
                    return content?.text ? (
                      <pre className="p-4 bg-gray-100 rounded whitespace-pre-wrap max-h-[80vh] overflow-y-auto">
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
          </div>
        </>
      )}
    </>
  );
}
