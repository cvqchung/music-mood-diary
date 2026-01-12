/**
 * Date/Time utility functions
 * Utilities for handling dates and track filtering 
 */

/**
 * Convert a Date object to YYYY-MM-DD string (local timezone)
 * @param {Date} date - Date object to convert
 * @returns {string} Date string in YYYY-MM-DD format
 */
function toLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 * @returns {string} Today's date string
 */
function getTodayDate() {
    return toLocalDateString(new Date());
}

/**
 * Filter tracks to a specific date (local timezone)
 * @param {Array} tracks - Array of track objects with played_at field
 * @param {string} targetDate - Target date in YYYY-MM-DD format
 * @returns {Array} Filtered tracks
 */
function filterToDate(tracks, targetDate) {
    return tracks.filter(item => {
        const playedAt = new Date(item.played_at);
        return toLocalDateString(playedAt) === targetDate;
    });
}

/**
 * Filter tracks to today only (local timezone)
 * @param {Array} tracks - Array of track objects with played_at field
 * @returns {Array} Filtered tracks for today
 */
function filterToToday(tracks) {
    return filterToDate(tracks, getTodayDate());
}

/**
 * Format time since a given timestamp
 * @param {string|Date} updatedAt - ISO timestamp or Date object
 * @returns {string} Human-readable time difference (e.g., "2 hours ago")
 */
function formatTimeSince(updatedAt) {
    const now = new Date();
    const then = new Date(updatedAt);
    const hours = Math.floor((now - then) / (1000 * 60 * 60));
    const minutes = Math.floor((now - then) / (1000 * 60));

    if (hours >= 1) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes >= 1) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
}

/**
 * Format a date value to YYYY-MM-DD string
 * Handles both Date objects (from PostgreSQL) and strings (already formatted)
 * @param {Date|string} date - Date to format
 * @returns {string} Date string in YYYY-MM-DD format
 */
function formatDateForResponse(date) {
    if (!date) return null;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        // Already in YYYY-MM-DD format
        return date;
    }
    // Convert Date object to YYYY-MM-DD
    return toLocalDateString(new Date(date));
}

module.exports = {
    toLocalDateString,
    getTodayDate,
    filterToDate,
    filterToToday,
    formatTimeSince,
    formatDateForResponse
};
