const axios = require('axios');
const { getValidAccessToken } = require('../auth/token-manager');

/**
 * Make authenticated request to Spotify API
 */
function makeSpotifyRequest(spotifyUserId, url, callback) {
    getValidAccessToken(spotifyUserId, function(err, accessToken) {
        if (err) {
            return callback(err);
        }

        axios.get(url, {
            headers: { 'Authorization': 'Bearer ' + accessToken }
        })
        .then(response => {
            callback(null, response.data);
        })
        .catch(error => {
            // 204 means no content (e.g., nothing currently playing)
            if (error.response?.status === 204) {
                return callback(null, { message: 'No content available' });
            }

            if (error.response) {
                return callback(new Error('Spotify API error: ' + error.response.status));
            }

            callback(error);
        });
    });
}

/**
 * Get current user's profile
 */
function getCurrentUser(spotifyUserId, callback) {
    makeSpotifyRequest(spotifyUserId, 'https://api.spotify.com/v1/me', callback);
}

/**
 * Get user's currently playing track
 */
function getCurrentlyPlaying(spotifyUserId, callback) {
    makeSpotifyRequest(spotifyUserId, 'https://api.spotify.com/v1/me/player/currently-playing', callback);
}

/**
 * Get user's recently played tracks
 */
function getRecentlyPlayed(spotifyUserId, limit, callback) {
    const url = `https://api.spotify.com/v1/me/player/recently-played?limit=${limit || 20}`;
    makeSpotifyRequest(spotifyUserId, url, callback);
}

/**
 * Get user's top tracks
 */
function getTopTracks(spotifyUserId, timeRange, limit, callback) {
    const url = `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange || 'medium_term'}&limit=${limit || 20}`;
    makeSpotifyRequest(spotifyUserId, url, callback);
}

module.exports = {
    makeSpotifyRequest,
    getCurrentUser,
    getCurrentlyPlaying,
    getRecentlyPlayed,
    getTopTracks
};