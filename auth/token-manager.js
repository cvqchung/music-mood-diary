const axios = require('axios');
const querystring = require('querystring');
const { getUserTokens, updateAccessToken } = require('../db/database');
const config = require('../config/env');
const { getSpotifyAuthHeader } = require('../utils/spotify-helpers');


/**
 * Check if access token is expired
 */
function isTokenExpired(tokenExpiry) {
    // Add 5 minute buffer to refresh before actual expiry
    const bufferTime = 5 * 60 * 1000;                 // 5 minutes in milliseconds
    return Date.now() >= (tokenExpiry - bufferTime);
}

/**
 * Refresh the access token using refresh token
 */
function refreshAccessToken(refreshToken, callback) {
    axios.post('https://accounts.spotify.com/api/token',
        querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        }),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + getSpotifyAuthHeader()
            }
        }
    )
    .then(response => {
        callback(null, {
            access_token: response.data.access_token,
            expires_in: response.data.expires_in
        });
    })
    .catch(error => {
        callback(error.response?.data || error);
    });
}

/**
 * Get valid access token for user (refresh if needed)
 */
function getValidAccessToken(spotifyUserId, callback) {
    getUserTokens(spotifyUserId, function(err, user) {
        if (err || !user) {
        return callback(new Error('User not found'));
        }

        // Check if token is expired
        if (isTokenExpired(user.token_expiry)) {
        // Refresh the token
        refreshAccessToken(user.refresh_token, function(err, tokens) {
            if (err) {
                return callback(err);
            }

            // Update database with new access token
            updateAccessToken(spotifyUserId, tokens.access_token, tokens.expires_in, function(err) {
            if (err) {
                return callback(err);
            }

            callback(null, tokens.access_token);
            });
        });
    } else {
      // Token still valid, return it
      callback(null, user.access_token);
    }
  });
}


/**
 * Express middleware to ensure user is authenticated
 */
function requireAuth(req, res, next) {
    if (!req.session.spotify_user_id) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
}

/**
 * Express middleware to attach valid access token to request
 */
function attachAccessToken(req, res, next) {
    if (!req.session.spotify_user_id) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    getValidAccessToken(req.session.spotify_user_id, function(err, accessToken) {
        if (err) {
            return res.status(500).json({ error: 'Failed to get access token' });
        }
        
        req.spotifyAccessToken = accessToken;
        next();
    });
}

module.exports = {
    getValidAccessToken,
    refreshAccessToken,
    isTokenExpired,
    requireAuth,
    attachAccessToken
};