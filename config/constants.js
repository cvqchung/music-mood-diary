/**
 * Application constants
 * Centralized configuration for magic numbers and thresholds
 */

module.exports = {
    // Spotify API
    SPOTIFY_TRACKS_LIMIT: 50,

    // Mood analysis update triggers
    UPDATE_TRIGGERS: {
        NEW_SONGS_THRESHOLD: 8,           // Trigger update if 8+ new songs
        CHANGE_PERCENT_THRESHOLD: 0.4,    // Trigger update if 40%+ change in playlist
        HOURS_SINCE_UPDATE: 6             // Trigger update if 6+ hours since last update
    },

    // Track analysis
    HEAVY_ROTATION_PLAYS: 3,              // Songs played 3+ times are considered "heavy rotation"
    SAMPLE_TRACKS_COUNT: 5                // Number of sample tracks to include in response
};
