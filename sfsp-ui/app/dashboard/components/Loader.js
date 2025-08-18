import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Loader({ message = "Loading..." }) {
    const { theme: resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-blue-600/75 dark:bg-gray-900/75"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        data-testid="loader"
        >
        <div className="flex flex-col items-center space-y-4">
            <Image
            src="/img/shield-emp-white.png"
            alt="SecureShare Logo"
            width={50}
            height={50}
            className="animate-pulse"
            />
            <div
            className={`animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 ${
                mounted && resolvedTheme === 'dark' ? 'border-blue-400' : 'border-white'
            }`}
            ></div>
            <p className="text-lg font-semibold text-white" data-testid="loader-message">
            {message}
            </p>
        </div>
        </motion.div>
    );
}