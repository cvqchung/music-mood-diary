/**
 * Shared update decision logic
 */

const { UPDATE_TRIGGERS } = require('../config/constants');

/**
 * Determine if mood analysis should be updated based on new songs and time elapsed
 * @param {Array} newSongs - Array of new songs not in previous analysis
 * @param {number} totalSongs - Total number of songs for the date
 * @param {string|Date} lastUpdatedAt - ISO timestamp of last update
 * @returns {boolean} True if analysis should be updated
 */
function shouldUpdateAnalysis(newSongs, totalSongs, lastUpdatedAt) {
    const newSongCount = Array.isArray(newSongs) ? newSongs.length : newSongs;
    const hoursSinceUpdate = (Date.now() - new Date(lastUpdatedAt).getTime()) / (1000 * 60 * 60);
    const changePercent = totalSongs > 0 ? newSongCount / totalSongs : 0;

    return newSongCount >= UPDATE_TRIGGERS.NEW_SONGS_THRESHOLD ||
           (changePercent >= UPDATE_TRIGGERS.CHANGE_PERCENT_THRESHOLD && newSongCount > 0) ||
           hoursSinceUpdate >= UPDATE_TRIGGERS.HOURS_SINCE_UPDATE;
}

module.exports = {
    shouldUpdateAnalysis
};
