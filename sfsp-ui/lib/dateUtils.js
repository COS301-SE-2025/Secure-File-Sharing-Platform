// lib/dateUtils.js

/**
 * Formats a date according to the user's selected date format from localStorage
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date) {
    if (!date) return '';

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';

    const dateFormat = localStorage.getItem('dateFormat') || 'MM/DD/YYYY';

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();

    switch (dateFormat) {
        case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
        case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
        case 'MM/DD/YYYY':
        default:
        return `${month}/${day}/${year}`;
    }
}

/**
 * Formats a date and time according to the user's selected date format from localStorage
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDateTime(date) {
    if (!date) return '';

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';

    const formattedDate = formatDate(date);
    const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `${formattedDate} ${timeString}`;
}
