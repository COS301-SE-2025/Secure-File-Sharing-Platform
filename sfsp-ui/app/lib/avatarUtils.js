/**
 * Generate user initials from username
 * @param {string} username 
 * @returns {string}
 */
export function generateUserInitials(username) {
    if (!username) return '??';
    const parts = username.split(/[_\-\s\.]+/).filter(part => 
        part.length > 0 && !/^\d+$/.test(part)
    );
    
    if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    } else if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    } else {
        return username.slice(0, 2).toUpperCase();
    }
}

/**
 * UserAvatar component for displaying user avatars with fallback to initials
 * @param {Object} props
 * @param {string} props.avatarUrl
 * @param {string} props.username
 * @param {string} props.size
 * @param {string} props.textSize
 * @param {string} props.className
 * @returns {JSX.Element}
 */
export function UserAvatar({ 
    avatarUrl, 
    username, 
    size = "w-8 h-8", 
    textSize = "", 
    className = "",
    alt = "Avatar"
}) {
    return (
        <div className={`${size} bg-gray-300 rounded-full overflow-hidden ${textSize} ${className}`}>
        {avatarUrl ? (
            <div className={`relative ${size} rounded-full overflow-hidden`}>
                <Image
                    src={avatarUrl}
                    alt={alt || username}
                    fill
                    className="object-cover"
                    unoptimized
                />
            </div>
        ) : (
            generateUserInitials(username)
        )}
        </div>
    );
}

import Image from "next/image";
