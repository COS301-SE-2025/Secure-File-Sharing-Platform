'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';

const features = [
  {
    title: "End-to-End Encryption",
    description: "Your files are encrypted before upload and only decrypted by the intended recipient.",
    img: "/img/end-to-end.png",
    link: "/encryption",
  },
  {
    title: "Secure File Sharing",
    description: "Control who can access your files with secure links and permissions.",
    img: "/img/sharing.png",
    link: "/sharing",
  },
  {
    title: "Access Control Logs",
    description: "Monitor who accessed your files and when, for full transparency and accountability.",
    img: "/img/access-control-logs.png",
    link: "/logs",
  },
  {
    title: "One-Time Download Links",
    description: "Generate links that expire after a single use for added security.",
    img: "/img/one-time.png",
    link: "/one-time-links",
  },
];

export default function FeatureRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % features.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto mt-12 text-center px-4">
      <div className="flex justify-center gap-6 flex-wrap sm:flex-nowrap">
        {features.map((feature, i) => {
          const isActive = i === index;

          return (
            <div
              key={i}
              className={`flex flex-col items-center text-center p-6 rounded-lg transition-all duration-500 transform bg-white dark:bg-gray-700 ${
                isActive
                  ? 'scale-105 z-10 shadow-xl border-2 border-blue-500'
                  : 'scale-95 opacity-80 z-0 shadow-md'
              }`}
              style={{
                width: '250px',
              }}
            >
              <Image
                src={feature.img}
                alt={feature.title}
                width={200}
                height={200}
                className="mb-4 object-contain"
              />
              <h3 className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>

      {/*Scroller */}
      <div className="flex justify-center gap-2 mt-6 pb-5">
        {features.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-6 h-3 rounded-sm transition-all ${
              i === index ? 'bg-blue-600 dark:bg-blue-400' : 'bg-white dark:bg-gray-600'
            }`}
            aria-label={`Highlight ${features[i].title}`}
          />
        ))}
      </div>
    </div>
  );
}
