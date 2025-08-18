/**
 * 
 * @param {string} username 
 * @returns {string}

 * 
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
    size = "w-10 h-10", 
    textSize = "", 
    className = "",
    alt = "Avatar"
}) {
    return (
        <div className={`${size} bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold overflow-hidden ${textSize} ${className}`}>
        {avatarUrl ? (
            <img
            src={avatarUrl}
            alt={alt}
            className="w-full h-full object-cover"
            />
        ) : (
            generateUserInitials(username)
        )}
        </div>
    );
}
