/**
 * Date/Time utility functions
 * Utilities for handling dates and track filtering 
 */

/**
 * Convert a Date object to YYYY-MM-DD string in a specific timezone
 * @param {Date} date - Date object to convert
 * @param {number} timezoneOffset - Timezone offset in minutes (e.g., -480 for PST)
 * @returns {string} Date string in YYYY-MM-DD format
 */
function toLocalDateString(date, timezoneOffset = 0) {
    // Apply timezone offset
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const localDate = new Date(utc + (timezoneOffset * 60000));

    const year = localDate.getUTCFullYear();
    const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(localDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get today's date in YYYY-MM-DD format in a specific timezone
 * @param {number} timezoneOffset - Timezone offset in minutes (e.g., -480 for PST)
 * @returns {string} Today's date string
 */
function getTodayDate(timezoneOffset = 0) {
    return toLocalDateString(new Date(), timezoneOffset);
}

/**
 * Filter tracks to a specific date in a specific timezone
 * @param {Array} tracks - Array of track objects with played_at field
 * @param {string} targetDate - Target date in YYYY-MM-DD format
 * @param {number} timezoneOffset - Timezone offset in minutes (e.g., -480 for PST)
 * @returns {Array} Filtered tracks
 */
function filterToDate(tracks, targetDate, timezoneOffset = 0) {
    return tracks.filter(item => {
        const playedAt = new Date(item.played_at);
        return toLocalDateString(playedAt, timezoneOffset) === targetDate;
    });
}

/**
 * Filter tracks to today only in a specific timezone
 * @param {Array} tracks - Array of track objects with played_at field
 * @param {number} timezoneOffset - Timezone offset in minutes (e.g., -480 for PST)
 * @returns {Array} Filtered tracks for today
 */
function filterToToday(tracks, timezoneOffset = 0) {
    return filterToDate(tracks, getTodayDate(timezoneOffset), timezoneOffset);
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
