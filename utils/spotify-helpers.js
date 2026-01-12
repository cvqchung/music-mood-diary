/**
 * Spotify API helper utilities
 */

const config = require('../config/env');

/**
 * Generate Spotify Basic Authorization header value
 * @returns {string} Base64-encoded client credentials
 */
function getSpotifyAuthHeader() {
    return Buffer.from(config.spotify.clientId + ':' + config.spotify.clientSecret).toString('base64');
}

module.exports = {
    getSpotifyAuthHeader
};
