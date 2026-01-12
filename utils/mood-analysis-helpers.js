const { saveDailyMoodAnalysis, getDailyMoodAnalysis } = require('../db/database');
const { analyzeMoodWithAI } = require('../api/ai-analysis');
const { filterToDate, toLocalDateString, formatTimeSince } = require('./date-utils');
const { shouldUpdateAnalysis } = require('./update-logic');

/**
 * Check if cached analysis can be returned or if update is needed
 * Returns either a cached response object or metadata for updating
 */
function shouldReturnCachedAnalysis(existingAnalysis, currentSongs, currentTrackIds, targetDate) {
    if (!existingAnalysis) {
        return null;    // No cached analysis exists
    }

    const lastAnalyzedIds = new Set(existingAnalysis.analyzed_track_ids || []);
    const newTrackIds = [...currentTrackIds].filter(id => !lastAnalyzedIds.has(id));
    const newSongs = currentSongs.filter(t => newTrackIds.includes(t.track.id));
    const newSongCount = newTrackIds.length;

    // Check if update is needed based on update logic
    if (!shouldUpdateAnalysis(newSongs, currentTrackIds.size, existingAnalysis.updated_at)) {
        // Return cached response
        return {
            success: true,
            cached: true,
            message: `Analysis is up to date (${formatTimeSince(existingAnalysis.updated_at)}, only ${newSongCount} new song${newSongCount !== 1 ? 's' : ''})`,
            date: targetDate,
            mood_summary: existingAnalysis.mood_summary,
            ai_analysis: existingAnalysis.ai_analysis,
            sample_tracks: existingAnalysis.sample_tracks,
            mood_gradient: existingAnalysis.mood_gradient,
            track_count: lastAnalyzedIds.size,
            last_updated: existingAnalysis.updated_at
        };
    }

    // Return metadata for update
    return {
        shouldUpdate: true,
        newSongs,
        newTrackIds,
        newSongCount
    };
}

/**
 * Perform AI analysis and save to database
 * Handles both first-time analysis and updates
 */
async function analyzeAndSaveMood(userId, date, songs, existingAnalysis, isComplete, res) {
    const currentTrackIds = new Set(songs.map(t => t.track.id));

    // Determine what's new
    let newSongs = [];
    let isUpdate = false;
    let newSongCount = 0;

    if (existingAnalysis) {
        const lastAnalyzedIds = existingAnalysis.analyzed_track_ids || [];
        newSongs = songs.filter(item => !lastAnalyzedIds.includes(item.track.id));
        newSongCount = newSongs.length;
        isUpdate = true;
    }

    try {
        // Perform AI analysis
        const analysis = await analyzeMoodWithAI(
            songs,
            existingAnalysis || null,
            newSongs
        );

        // Save to database
        saveDailyMoodAnalysis(
            userId,
            date,
            analysis.mood_summary,
            analysis.ai_analysis,
            analysis.sample_tracks,
            analysis.mood_gradient,
            Array.from(currentTrackIds),
            isComplete,
            function(err) {
                if (err) {
                    return res.status(500).json({
                        error: 'Failed to save analysis'
                    });
                }

                // Build response
                const response = {
                    success: true,
                    date: date,
                    mood_summary: analysis.mood_summary,
                    ai_analysis: analysis.ai_analysis,
                    sample_tracks: analysis.sample_tracks,
                    mood_gradient: analysis.mood_gradient,
                    track_count: songs.length
                };

                // Add update metadata if this is an update
                if (isUpdate) {
                    response.updated = true;
                    response.message = `Analysis updated (${newSongCount} new song${newSongCount !== 1 ? 's' : ''} since last check)`;
                }

                res.json(response);
            }
        );
    } catch (aiError) {
        return res.status(500).json({
            error: 'AI analysis failed: ' + aiError.message
        });
    }
}

/**
 * Handle the case when no songs were played today
 * Suggests the most recent day with listening if available
 */
function handleNoSongsToday(allRecentTracks, userId, existingAnalysis, today, res) {
    // If we have existing analysis for today, return it
    if (existingAnalysis) {
        const lastAnalyzedIds = new Set(existingAnalysis.analyzed_track_ids || []);
        return res.json({
            success: true,
            cached: true,
            message: `Analysis is up to date (${formatTimeSince(existingAnalysis.updated_at)}, no new songs detected)`,
            date: today,
            mood_summary: existingAnalysis.mood_summary,
            ai_analysis: existingAnalysis.ai_analysis,
            sample_tracks: existingAnalysis.sample_tracks,
            mood_gradient: existingAnalysis.mood_gradient,
            track_count: lastAnalyzedIds.size,
            last_updated: existingAnalysis.updated_at
        });
    }

    // Find the most recent date with songs
    if (allRecentTracks.length > 0) {
        const mostRecentTrack = new Date(allRecentTracks[0].played_at);
        const mostRecentDate = toLocalDateString(mostRecentTrack);
        const recentDaySongs = filterToDate(allRecentTracks, mostRecentDate);

        // Check if this date already has an analysis
        getDailyMoodAnalysis(userId, mostRecentDate, function(err, recentAnalysis) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            // If no analysis exists, suggest analyzing it
            if (!recentAnalysis) {
                return res.json({
                    success: false,
                    suggest_recent_day: true,
                    recent_date: mostRecentDate,
                    recent_count: recentDaySongs.length,
                    error: 'No songs played today yet!'
                });
            }

            // If analysis exists, check if it should be updated
            const lastAnalyzedIds = recentAnalysis.analyzed_track_ids || [];
            const newSongs = recentDaySongs.filter(item => !lastAnalyzedIds.includes(item.track.id));

            if (shouldUpdateAnalysis(newSongs, recentDaySongs.length, recentAnalysis.updated_at)) {
                // Suggest updating the recent day
                return res.json({
                    success: false,
                    suggest_recent_day: true,
                    recent_date: mostRecentDate,
                    recent_count: recentDaySongs.length,
                    error: 'No songs played today yet!'
                });
            } else {
                // Don't suggest - analysis is up to date
                return res.status(400).json({ error: 'No songs played today yet!' });
            }
        });
        return; // Early return to prevent fall-through
    }

    return res.status(400).json({ error: 'No songs played today yet!' });
}

module.exports = {
    shouldReturnCachedAnalysis,
    analyzeAndSaveMood,
    handleNoSongsToday
};
