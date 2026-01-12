const { getUserIdFromSpotify } = require('../db/database');

/**
 * Middleware to ensure req.db_user_id exists
 * Uses session cache for fast lookups, falls back to database
 * Must be used after requireAuth middleware
 */
function ensureDbUserId(req, res, next) {
    // Fast path: already cached in session
    if (req.session.db_user_id) {
        req.db_user_id = req.session.db_user_id;
        return next();
    }

    // Slow path: lookup from database and cache in session
    getUserIdFromSpotify(req.session.spotify_user_id, (err, user) => {
        if (err || !user) {
            return res.status(500).json({ error: 'User not found' });
        }

        // Cache in session for future requests
        req.session.db_user_id = user.id;
        req.db_user_id = user.id;

        next();
    });
}

module.exports = { ensureDbUserId };
