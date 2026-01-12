/**
 * Spotify OAuth2 Authentication Routes
 * Based on: https://github.com/spotify/web-api-examples/blob/master/authorization/authorization_code/app.js
 */

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');
const { saveUserTokens } = require('../db/database');
const { requireAuth } = require('./token-manager');
const spotifyApi = require('../api/spotify-api');
const config = require('../config/env');
const { getSpotifyAuthHeader } = require('../utils/spotify-helpers');

const router = express.Router();

const stateKey = 'spotify_auth_state';

/**
 * Generates a random string for CSRF protection
 */
const generateRandomString = (length) => {
    return crypto
        .randomBytes(60)
        .toString('hex')
        .slice(0, length);
};

/**
 * ROUTE: /login
 * Initiates Spotify OAuth flow
 */
router.get('/login', function(req, res) {
    const state = generateRandomString(16);
    res.cookie(stateKey, state);

    const scope = 'user-read-private user-read-email user-read-currently-playing user-read-recently-played user-top-read';

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: config.spotify.clientId,
            scope: scope,
            redirect_uri: config.spotify.redirectUri,
            state: state,
            show_dialog: true  // Force Spotify to show account selection
        }));
});

/**
 * ROUTE: /callback
 * Spotify redirects here after user authorization
 */
router.get('/callback', function(req, res) {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;

    // Verify state to prevent CSRF attacks
    if (state === null || state !== storedState) {
        res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }));
        return;
    }

    res.clearCookie(stateKey);

    // Exchange authorization code for access token
    axios.post('https://accounts.spotify.com/api/token',
        querystring.stringify({
            code: code,
            redirect_uri: config.spotify.redirectUri,
            grant_type: 'authorization_code'
        }),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + getSpotifyAuthHeader()
            }
        }
    )
    .then(tokenResponse => {
        const access_token = tokenResponse.data.access_token;
        const refresh_token = tokenResponse.data.refresh_token;
        const expires_in = tokenResponse.data.expires_in;

        // Get user profile to retrieve Spotify user ID
        return axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': 'Bearer ' + access_token }
        })
        .then(profileResponse => {
            const spotify_user_id = profileResponse.data.id;

            // Save tokens to database
            saveUserTokens(spotify_user_id, access_token, refresh_token, expires_in, function(err, userId) {
                if (err) {
                    console.error('Error saving tokens:', err);
                    res.redirect('/#error=database_error');
                } else {
                    // Store both Spotify user ID and database user ID in session
                    req.session.spotify_user_id = spotify_user_id;
                    req.session.db_user_id = userId;
                    req.session.save(function(saveErr) {
                        if (saveErr) {
                            console.error('Session save error:', saveErr);
                        }
                        res.redirect('/#success=true');
                    });
                }
            });
        });
    })
    .catch(error => {
        console.error('OAuth flow error:', error.response?.data || error.message);
        res.redirect('/#error=token_exchange_failed');
    });
});

/**
 * ROUTE: /api/auth-status
 * Check if user is authenticated
 */
router.get('/api/auth-status', function(req, res) {
    const isLoggedIn = req.session.spotify_user_id ? true : false;
    res.json({
        isLoggedIn: isLoggedIn,
        userId: req.session.spotify_user_id || null
    });
});

/**
 * Test routes for Spotify API
 */
router.get('/api/me', requireAuth, function(req, res) {
    spotifyApi.getCurrentUser(req.session.spotify_user_id, function(err, profile) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(profile);
    });
});

router.get('/api/recently-played', requireAuth, function(req, res) {
    spotifyApi.getRecentlyPlayed(req.session.spotify_user_id, 10, function(err, data) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(data);
    });
});

router.get('/api/currently-playing', requireAuth, function(req, res) {
    spotifyApi.getCurrentlyPlaying(req.session.spotify_user_id, function(err, data) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(data);
    });
});

// Logout endpoint
router.get('/logout', function(req, res) {
    // Destroy session
    req.session.destroy(function(err) {
        if (err) {
            console.error('Error destroying session:', err);
        }

        res.clearCookie('connect.sid');     // Clear session cookie
        res.redirect('/');                  // Redirect to home
    });
});

module.exports = router;
