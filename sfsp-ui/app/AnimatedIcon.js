'use client';
import Image from 'next/image';

export default function AnimatedIcon({ icon: IconComponent, faviconSrc, alt, width = 24, height = 24,
    className = '',
    animationType = 'bounce',
    colorClass = 'text-blue-600 dark:text-blue-400',
}) {
    return (
        <span className={`inline-block relative ${className}`}>
        {IconComponent ? (
            <IconComponent
            className={`w-${width / 4} h-${height / 4} ${colorClass} transition-transform duration-300 ${
                animationType === 'bounce'
                ? 'animate-icon-bounce hover:scale-120 hover:rotate-6'
                : animationType === 'rotate'
                ? 'animate-icon-rotate hover:scale-120 hover:rotate-12'
                : 'animate-icon-pulse hover:scale-120 hover:rotate-6'
            }`}
            aria-hidden="true"
            />
        ) : (
            <Image
            src={faviconSrc || '/favicon.ico'}
            alt={alt}
            width={width}
            height={height}
            className={`transition-transform duration-300 ${
                animationType === 'bounce'
                ? 'animate-icon-bounce hover:scale-120 hover:rotate-6'
                : animationType === 'rotate'
                ? 'animate-icon-rotate hover:scale-120 hover:rotate-12'
                : 'animate-icon-pulse hover:scale-120 hover:rotate-6'
            }`}
            aria-hidden="true"
            />
        )}
        <style jsx>{`
            @keyframes iconBounce {
            0%, 100% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(-6px);
            }
            }
            @keyframes iconRotate {
            0%, 100% {
                transform: rotate(0deg);
            }
            50% {
                transform: rotate(15deg);
            }
            }
            @keyframes iconPulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.2);
            }
            }
            .animate-icon-bounce {
            animation: iconBounce 1.5s ease-in-out infinite;
            }
            .animate-icon-rotate {
            animation: iconRotate 2s ease-in-out infinite;
            }
            .animate-icon-pulse {
            animation: iconPulse 1.8s ease-in-out infinite;
            }
            .animate-icon-bounce:hover::after,
            .animate-icon-rotate:hover::after,
            .animate-icon-pulse:hover::after {
            content: '';
            position: absolute;
            top: -6px;
            right: -6px;
            width: 10px;
            height: 10px;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.8), transparent);
            border-radius: 50%;
            animation: sparkle 0.4s ease-out;
            }
            @keyframes sparkle {
            0% {
                opacity: 1;
                transform: scale(1);
            }
            100% {
                opacity: 0;
                transform: scale(1.8);
            }
            }
        `}</style>
        </span>
    );
}