"use client";


import React, { useEffect, useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";

//import "react-pdf/dist/esm/Page/AnnotationLayer.css";
//import "react-pdf/dist/esm/Page/TextLayer.css";

// Use pdfjs-dist's worker build
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();


export function FullViewModal({ file, content, onClose }) {
	const [numPages, setNumPages] = useState(null);


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
          <div className="fixed left-1/2 top-1/2 z-50 max-w-5xl w-full transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-200 rounded-lg shadow-lg p-6 overflow-y-auto max-h-[90vh]">
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
                      <div className="relative flex justify-center">
                        <img
                          src={content.url}
                          alt="Full view"
                          className="max-w-full rounded select-none pointer-events-none"
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
                          className="w-full max-h-[80vh] rounded select-none pointer-events-none"
                        />
                        <canvas
                          className="absolute inset-0 w-full h-full rounded"
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      </div>
                    ) : null;

                 case "pdf":
  return content?.url ? (
    <div className="flex justify-center">
      <div className="max-w-[500px] h-[600px] overflow-y-auto border rounded bg-gray-100 p-2">
        <Document
          file={content.url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={(err) => console.error("PDF load error:", err)}
          loading={
            <div className="p-4 text-sm text-gray-500">Loading PDF…</div>
          }
        >
          {Array.from(new Array(numPages), (el, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              width={460}   // matches ~max-w size
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          ))}
        </Document>
      </div>
    </div>
  ) : null;



                  case "audio":
                    return content?.url ? (
                      <audio controls className="w-full mt-2">
                        <source src={content.url} />
                        Your browser does not support the audio element.
                      </audio>
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
