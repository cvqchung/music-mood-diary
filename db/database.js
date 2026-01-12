const { Pool } = require('pg');
const config = require('../config/env');

// Create PostgreSQL connection pool
// Uses DATABASE_URL for both local and cloud deployment
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: config.database.max,
    idleTimeoutMillis: config.database.idleTimeoutMillis,
    connectionTimeoutMillis: config.database.connectionTimeoutMillis
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    process.exit(-1);
});

// Test connection and log
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ PostgreSQL connection error:', err.message);
    } else {
        console.log('✓ PostgreSQL connected successfully');
    }
});

// Initialize database tables
async function initializeTables() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                spotify_user_id TEXT UNIQUE NOT NULL,
                access_token TEXT NOT NULL,
                refresh_token TEXT NOT NULL,
                token_expiry BIGINT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Daily mood analysis table
        await client.query(`
            CREATE TABLE IF NOT EXISTS daily_mood_analysis (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                date DATE NOT NULL,
                mood_summary TEXT NOT NULL,
                ai_analysis TEXT NOT NULL,
                sample_tracks JSONB,
                mood_gradient TEXT,
                analyzed_track_ids JSONB,
                is_complete BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, date)
            )
        `);

        // Create index on date for faster queries
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_daily_mood_date
            ON daily_mood_analysis(user_id, date DESC)
        `);

        // Onboarding requests table
        await client.query(`
            CREATE TABLE IF NOT EXISTS onboarding_requests (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query('COMMIT');
        console.log('✓ Database tables initialized');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error initializing tables:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Initialize tables on startup
initializeTables().catch(err => {
    console.error('Failed to initialize database:', err);
});


/*
*
* Helper functions for token management (Users table)
*
*/

// Save or update user tokens
function saveUserTokens(spotifyUserId, accessToken, refreshToken, expiresIn, callback) {
    const expiryTime = Date.now() + (expiresIn * 1000);

    pool.query(
        `INSERT INTO users (spotify_user_id, access_token, refresh_token, token_expiry)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (spotify_user_id)
         DO UPDATE SET
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            token_expiry = EXCLUDED.token_expiry,
            updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [spotifyUserId, accessToken, refreshToken, expiryTime],
        (err, result) => {
            if (err) return callback(err);
            callback(null, result.rows[0].id);
        }
    );
}

// Get user tokens by Spotify user ID
function getUserTokens(spotifyUserId, callback) {
    pool.query(
        'SELECT * FROM users WHERE spotify_user_id = $1',
        [spotifyUserId],
        (err, result) => {
            if (err) return callback(err);
            callback(null, result.rows[0]);
        }
    );
}

// Update access token (used during refresh)
function updateAccessToken(spotifyUserId, accessToken, expiresIn, callback) {
    const expiryTime = Date.now() + (expiresIn * 1000);

    pool.query(
        `UPDATE users
         SET access_token = $1, token_expiry = $2, updated_at = CURRENT_TIMESTAMP
         WHERE spotify_user_id = $3`,
        [accessToken, expiryTime, spotifyUserId],
        callback
    );
}


/*
*
* Helper functions for daily mood analysis
*
*/

// Create or update daily mood analysis
function saveDailyMoodAnalysis(userId, date, moodSummary, aiAnalysis, sampleTracks, moodGradient, analyzedTrackIds, isComplete, callback) {
    pool.query(
        `INSERT INTO daily_mood_analysis
            (user_id, date, mood_summary, ai_analysis, sample_tracks, mood_gradient, analyzed_track_ids, is_complete)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id, date)
         DO UPDATE SET
            mood_summary = EXCLUDED.mood_summary,
            ai_analysis = EXCLUDED.ai_analysis,
            sample_tracks = EXCLUDED.sample_tracks,
            mood_gradient = EXCLUDED.mood_gradient,
            analyzed_track_ids = EXCLUDED.analyzed_track_ids,
            is_complete = EXCLUDED.is_complete,
            updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [userId, date, moodSummary, aiAnalysis, JSON.stringify(sampleTracks), moodGradient, JSON.stringify(analyzedTrackIds), isComplete],
        (err, result) => {
            if (callback) {
                if (err) return callback(err);
                callback(null, result.rows[0]?.id);
            }
        }
    );
}

// Get daily mood analysis for a specific date
function getDailyMoodAnalysis(userId, date, callback) {
    pool.query(
        `SELECT *,
         COALESCE(sample_tracks, '[]'::jsonb) as sample_tracks
         FROM daily_mood_analysis
         WHERE user_id = $1 AND date = $2`,
        [userId, date],
        (err, result) => {
            if (err) return callback(err);

            const row = result.rows[0];
            callback(null, row);
        }
    );
}

// Get all daily mood analyses for a user (with optional limit)
function getAllDailyMoodAnalyses(userId, limit, callback) {
    const sql = limit
        ? 'SELECT * FROM daily_mood_analysis WHERE user_id = $1 ORDER BY date DESC LIMIT $2'
        : 'SELECT * FROM daily_mood_analysis WHERE user_id = $1 ORDER BY date DESC';

    const params = limit ? [userId, limit] : [userId];

    pool.query(sql, params, (err, result) => {
        if (err) return callback(err);
        callback(null, result.rows);
    });
}

// Get user ID from spotify_user_id (helper for routes)
function getUserIdFromSpotify(spotifyUserId, callback) {
    pool.query(
        'SELECT id FROM users WHERE spotify_user_id = $1',
        [spotifyUserId],
        (err, result) => {
            if (err) return callback(err);
            callback(null, result.rows[0]);
        }
    );
}


/*
*
* Helper functions for onboarding requests
*
*/

// Save onboarding request
function saveOnboardingRequest(name, email, callback) {
    pool.query(
        'INSERT INTO onboarding_requests (name, email) VALUES ($1, $2)',
        [name, email],
        callback
    );
}


// Graceful shutdown
process.on('SIGTERM', () => {
    pool.end(() => {
        console.log('PostgreSQL pool has ended');
    });
});


module.exports = {
    pool,
    // User/token functions
    saveUserTokens,
    getUserTokens,
    updateAccessToken,
    getUserIdFromSpotify,
    // Daily mood analysis functions
    saveDailyMoodAnalysis,
    getDailyMoodAnalysis,
    getAllDailyMoodAnalyses,
    // Onboarding functions
    saveOnboardingRequest
};
