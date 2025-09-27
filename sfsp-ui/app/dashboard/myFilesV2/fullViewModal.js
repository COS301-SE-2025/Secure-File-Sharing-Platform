"use client";

import React from "react";

export function FullViewModal({ file, content, onClose }) {
  return (
    <>
      {file && (
        <>
          {/* overlay */}
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => onClose(null)}
          ></div>

          {/* modal */}
          <div className="fixed left-1/2 top-1/2 z-50 max-w-6xl w-full transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-200 rounded-lg shadow-lg p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h2
                  className="text-lg font-semibold truncate max-w-[80%] text-gray-700"
                  title={file?.name}
                >
                  {file?.name}
                </h2>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded uppercase font-mono">
                  {file?.type}
                </span>
              </div>
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
                      <div className="relative flex justify-center">
                        <img
                          src={content.url}
                          alt="Full view"
                          className="max-w-full max-h-[75vh] rounded select-none pointer-events-none object-contain"
                        />
                        <canvas
                          className="absolute inset-0 w-full h-full rounded"
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      </div>
                    ) : null;

                  case "video":
                    return content?.url ? (
                      <div className="relative flex justify-center">
                        <video
                          controls
                          src={content.url}
                          className="w-full max-h-[75vh] rounded select-none"
                        />
                        <canvas
                          className="absolute inset-0 w-full h-full rounded opacity-0 pointer-events-none"
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      </div>
                    ) : null;

                  case "pdf":
                    return content?.url ? (
                      <div className="relative flex justify-center">
                        <iframe
                          src={content.url}
                          className="w-full h-[80vh] rounded border"
                        ></iframe>
                      </div>
                    ) : null;

                  case "audio":
                    return content?.url ? (
                      <div className="flex flex-col items-center space-y-4 p-8">
                        <div className="text-6xl">🎵</div>
                        <h3 className="text-lg font-medium">{file?.name}</h3>
                        <audio controls className="w-full max-w-md">
                          <source src={content.url} />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    ) : null;

                  // Code files with syntax highlighting container
                  case "js":
                  case "jsx":
                  case "ts":
                  case "tsx":
                  case "py":
                  case "java":
                  case "cpp":
                  case "c":
                  case "php":
                  case "rb":
                  case "go":
                  case "rs":
                  case "swift":
                  case "kt":
                    return content?.text ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center">
                          <span className="text-sm font-mono">{file?.name}</span>
                          <span className="text-xs text-gray-300 bg-gray-700 px-2 py-1 rounded">
                            {file?.type?.toUpperCase()} • Read-only
                          </span>
                        </div>
                        <pre className="p-4 bg-gray-900 text-gray-100 max-h-[70vh] overflow-auto font-mono text-sm leading-relaxed">
                          {content.text}
                        </pre>
                      </div>
                    ) : null;

                  // Web files
                  case "html":
                    return content?.text ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-orange-100 px-4 py-2 flex justify-between items-center border-b">
                          <span className="text-sm font-semibold text-orange-800">HTML Source Code</span>
                          <span className="text-xs text-orange-600 bg-orange-200 px-2 py-1 rounded">
                            Source View Only (Not Rendered)
                          </span>
                        </div>
                        <pre className="p-4 bg-gray-50 max-h-[70vh] overflow-auto font-mono text-sm leading-relaxed text-gray-800">
                          {content.text}
                        </pre>
                      </div>
                    ) : null;

                  case "css":
                    return content?.text ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-purple-100 px-4 py-2 border-b">
                          <span className="text-sm font-semibold text-purple-800">CSS Stylesheet</span>
                        </div>
                        <pre className="p-4 bg-gray-50 max-h-[70vh] overflow-auto font-mono text-sm leading-relaxed text-gray-800">
                          {content.text}
                        </pre>
                      </div>
                    ) : null;

                  // Markdown
                  case "md":
                  case "markdown":
                    return content?.text ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-blue-100 px-4 py-2 border-b">
                          <span className="text-sm font-semibold text-blue-800">Markdown Document</span>
                        </div>
                        <div className="p-4 bg-white max-h-[70vh] overflow-auto">
                          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-gray-800">
                            {content.text}
                          </pre>
                        </div>
                      </div>
                    ) : null;

                  // Data files
                  case "json":
                    return content?.text ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-green-100 px-4 py-2 border-b">
                          <span className="text-sm font-semibold text-green-800">JSON Data</span>
                        </div>
                        <pre className="p-4 bg-gray-50 max-h-[70vh] overflow-auto font-mono text-sm leading-relaxed text-gray-800">
                          {content.text}
                        </pre>
                      </div>
                    ) : null;

                  case "xml":
                    return content?.text ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-yellow-100 px-4 py-2 border-b">
                          <span className="text-sm font-semibold text-yellow-800">XML Document</span>
                        </div>
                        <pre className="p-4 bg-gray-50 max-h-[70vh] overflow-auto font-mono text-sm leading-relaxed text-gray-800">
                          {content.text}
                        </pre>
                      </div>
                    ) : null;

                  case "yaml":
                  case "yml":
                    return content?.text ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-red-100 px-4 py-2 border-b">
                          <span className="text-sm font-semibold text-red-800">YAML Configuration</span>
                        </div>
                        <pre className="p-4 bg-gray-50 max-h-[70vh] overflow-auto font-mono text-sm leading-relaxed">
                          {content.text}
                        </pre>
                      </div>
                    ) : null;

                  case "csv":
                    return content?.text ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-green-100 px-4 py-2 border-b flex justify-between items-center">
                          <span className="text-sm font-semibold text-green-800">CSV Data</span>
                          <span className="text-xs text-green-600">
                            {content.text.split('\n').length - 1} rows
                          </span>
                        </div>
                        <div className="p-4 bg-gray-50 max-h-[70vh] overflow-auto">
                          <pre className="font-mono text-sm leading-relaxed whitespace-pre text-gray-800">
                            {content.text}
                          </pre>
                          {/* Future: Could render as actual table */}
                        </div>
                      </div>
                    ) : null;

                  // System/Config files
                  case "sql":
                    return content?.text ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-blue-100 px-4 py-2 border-b">
                          <span className="text-sm font-semibold text-blue-800">SQL Query</span>
                        </div>
                        <pre className="p-4 bg-gray-50 max-h-[70vh] overflow-auto font-mono text-sm leading-relaxed">
                          {content.text}
                        </pre>
                      </div>
                    ) : null;

                  case "log":
                    return content?.text ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-800 text-white px-4 py-2 flex justify-between items-center">
                          <span className="text-sm font-mono">System Log</span>
                          <span className="text-xs text-gray-300">
                            {content.text.split('\n').length} lines
                          </span>
                        </div>
                        <pre className="p-4 bg-gray-900 text-green-400 max-h-[70vh] overflow-auto font-mono text-xs leading-relaxed">
                          {content.text}
                        </pre>
                      </div>
                    ) : null;

                  case "ini":
                  case "cfg":
                  case "conf":
                    return content?.text ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-4 py-2 border-b">
                          <span className="text-sm font-semibold text-gray-800">Configuration File</span>
                        </div>
                        <pre className="p-4 bg-gray-50 max-h-[70vh] overflow-auto font-mono text-sm leading-relaxed">
                          {content.text}
                        </pre>
                      </div>
                    ) : null;

                  // Plain text
                  case "txt":
                    return content?.text ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-4 py-2 border-b">
                          <span className="text-sm font-semibold text-gray-700">Text Document</span>
                        </div>
                        <div className="p-4 bg-white max-h-[70vh] overflow-auto">
                          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                            {content.text}
                          </pre>
                        </div>
                      </div>
                    ) : null;

                  default:
                    return (
                      <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                        <div className="text-4xl mb-4">📄</div>
                        <div className="text-lg font-medium text-gray-700 mb-2">
                          Cannot Preview This File Type
                        </div>
                        <div className="text-sm text-gray-500 mb-4">
                          File type "{file?.type}" is not supported for preview
                        </div>
                        <div className="text-xs text-gray-400">
                          Supported: Images, Videos, Audio, PDF, Text, Code, and Data files
                        </div>
                      </div>
                    );
                }
              })()}
            </div>

            {/* Footer with file info */}
            <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
              <span>Size: {file?.size}</span>
              <span>Modified: {file?.modified}</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}