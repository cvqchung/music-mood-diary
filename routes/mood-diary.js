const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/token-manager');
const { ensureDbUserId } = require('../middleware/db-user-id');
const {
    getAllDailyMoodAnalyses,
    getDailyMoodAnalysis
} = require('../db/database');
const spotifyApi = require('../api/spotify-api');
const {
    getTodayDate,
    filterToDate,
    filterToToday,
    formatDateForResponse
} = require('../utils/date-utils');
const {
    shouldReturnCachedAnalysis,
    analyzeAndSaveMood,
    handleNoSongsToday
} = require('../utils/mood-analysis-helpers');
const { SPOTIFY_TRACKS_LIMIT } = require('../config/constants');


// POST /api/analyze-mood - Analyze user's mood based on recent listening
router.post('/analyze-mood', requireAuth, ensureDbUserId, async function(req, res) {
    const userId = req.db_user_id;

    // Get recently played tracks
    spotifyApi.getRecentlyPlayed(req.session.spotify_user_id, SPOTIFY_TRACKS_LIMIT, async function(err, data) {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch listening history' });
        }
        if (!data.items || data.items.length === 0) {
            return res.status(400).json({ error: 'No recent listening history found' });
        }

        // FILTER TO TODAY'S SONGS ONLY
        const todaysSongs = filterToToday(data.items);
        const today = getTodayDate();

        // CHECK IF TODAY HAS ALREADY BEEN ANALYZED
        getDailyMoodAnalysis(userId, today, async function(err, existingAnalysis) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            // Handle no songs played today
            if (todaysSongs.length === 0) {
                return handleNoSongsToday(data.items, userId, existingAnalysis, today, res);
            }

            // Extract current track IDs
            const currentTrackIds = new Set(todaysSongs.map(t => t.track.id));

            // Check if we can return cached analysis
            const cacheResult = shouldReturnCachedAnalysis(existingAnalysis, todaysSongs, currentTrackIds, today);
            if (cacheResult && !cacheResult.shouldUpdate) {
                return res.json(cacheResult);
            }

            // Analyze and save (handles both first-time and updates)
            await analyzeAndSaveMood(userId, today, todaysSongs, existingAnalysis, false, res);
        });
    });
});

// POST /api/analyze-mood-date - Analyze a specific date's listening
router.post('/analyze-mood-date', requireAuth, ensureDbUserId, async function(req, res) {
    const targetDate = req.body.date;
    const userId = req.db_user_id;

    // Validate date format
    if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Validate date is not in the future
    const requestedDate = new Date(targetDate + 'T00:00:00');
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (requestedDate > today) {
        return res.status(400).json({ error: 'Cannot analyze future dates' });
    }

    // Get recently played tracks
    spotifyApi.getRecentlyPlayed(req.session.spotify_user_id, SPOTIFY_TRACKS_LIMIT, async function(err, data) {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch listening history' });
        }
        if (!data.items || data.items.length === 0) {
            return res.status(400).json({ error: 'No recent listening history found' });
        }

        // FILTER TO TARGET DATE ONLY
        const dateSongs = filterToDate(data.items, targetDate);
        if (dateSongs.length === 0) {
            return res.status(400).json({ error: `No songs found for ${targetDate}` });
        }

        // Check if this date already has an analysis
        getDailyMoodAnalysis(userId, targetDate, async function(err, existingAnalysis) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            // Extract current track IDs
            const currentTrackIds = new Set(dateSongs.map(t => t.track.id));

            // Check if we can return cached analysis
            const cacheResult = shouldReturnCachedAnalysis(existingAnalysis, dateSongs, currentTrackIds, targetDate);
            if (cacheResult && !cacheResult.shouldUpdate) {
                cacheResult.message = `Analysis already exists for ${targetDate}`;
                return res.json(cacheResult);
            }

            // Analyze and save (handles both first-time and updates)
            // Mark as complete since it's a past date
            await analyzeAndSaveMood(userId, targetDate, dateSongs, existingAnalysis, true, res);
        });
    });
});

// GET /api/mood-history - Get user's mood analysis history
router.get('/mood-history', requireAuth, ensureDbUserId, function(req, res) {
    const limit = req.query.limit ? parseInt(req.query.limit) : 30;
    const userId = req.db_user_id;

    console.log('Fetching mood history for user ID:', userId, 'limit:', limit);

    getAllDailyMoodAnalyses(userId, limit, function(err, analyses) {
        if (err) {
            console.error('Error fetching mood history:', err);
            return res.status(500).json({ error: 'Failed to fetch mood history' });
        }

        console.log('Found', analyses.length, 'mood analyses for user', userId);

        // Add track_count to each analysis and format dates
        const analysesWithCount = analyses.map(analysis => {
            const trackIds = analysis.analyzed_track_ids || [];
            return {
                ...analysis,
                date: formatDateForResponse(analysis.date),
                track_count: trackIds.length
            };
        });

        res.json({ analyses: analysesWithCount });
    });
});

// GET /api/mood-today - Get today's mood analysis
router.get('/mood-today', requireAuth, ensureDbUserId, function(req, res) {
    const today = getTodayDate();
    const userId = req.db_user_id;

    getDailyMoodAnalysis(userId, today, function(err, analysis) {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch today\'s mood' });
        }
        if (!analysis) {
            return res.json({ exists: false });
        }

        // Calculate track count from analyzed_track_ids
        const trackIds = analysis.analyzed_track_ids || [];
        const trackCount = trackIds.length;

        res.json({
            exists: true,
            ...analysis,
            date: formatDateForResponse(analysis.date),
            track_count: trackCount
        });
    });
});

module.exports = router;