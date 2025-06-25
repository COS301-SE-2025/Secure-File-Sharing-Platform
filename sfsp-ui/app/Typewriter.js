'use client';
import { useEffect, useState } from 'react';

export default function Typewriter({ text, speed = 100, loop = false, cursor = true }) {
    const [displayedText, setDisplayedText] = useState('');
    const [index, setIndex] = useState(0);
    const [isTyping, setIsTyping] = useState(true);

    useEffect(() => {
        if (index < text.length && isTyping) {
        const timeout = setTimeout(() => {
            setDisplayedText((prev) => prev + text[index]);
            setIndex(index + 1);
        }, speed);
        return () => clearTimeout(timeout);
        } else if (index === text.length && loop) {
        const pauseTimeout = setTimeout(() => {
            setIsTyping(false);
            setDisplayedText('');
            setIndex(0);
            setIsTyping(true);
        }, 2000);
        return () => clearTimeout(pauseTimeout);
        }
    }, [index, text, speed, loop,isTyping]);

    return (
        <span className="inline-flex items-center relative">
            <span className="invisible whitespace-nowrap">{text}</span>
            <span className="inline absolute left-0 top-0">{displayedText}</span>
            <style jsx>{`
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                .animate-blink {
                    animation: blink 0.8s infinite;
                }
            `}</style>
        </span>
    );
}