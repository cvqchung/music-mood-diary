const Anthropic = require('@anthropic-ai/sdk');
const { createMoodGradient } = require('../utils/mood-colors');
const { formatTimeSince } = require('../utils/date-utils');
const config = require('../config/env');
const { HEAVY_ROTATION_PLAYS, SAMPLE_TRACKS_COUNT } = require('../config/constants');

const anthropic = new Anthropic({
    apiKey: config.anthropic.apiKey
});

/**
 * Count song plays from tracks
 * @param {Array} tracks - Array of track objects
 * @returns {Object} Object mapping "song|||artist" to play count
 */
function countSongPlays(tracks) {
    const songCounts = {};
    tracks.forEach(t => {
        const key = `${t.track.name}|||${t.track.artists[0].name}`;
        songCounts[key] = (songCounts[key] || 0) + 1;
    });
    return songCounts;
}

/**
 * Format tracks as numbered list with play counts
 * @param {Array} tracks - Array of track objects
 * @param {Object} songCounts - Object mapping "song|||artist" to play count
 * @returns {string} Formatted track list
 */
function formatTrackList(tracks, songCounts) {
    return tracks
        .filter((t, index, self) =>
            self.findIndex(track => track.track.id === t.track.id) === index
        )
        .map((t, i) => {
            const key = `${t.track.name}|||${t.track.artists[0].name}`;
            const count = songCounts[key];
            const countStr = count > 1 ? ` [played ${count}x]` : '';
            return `${i + 1}. "${t.track.name}" by ${t.track.artists[0].name}${countStr}`;
        })
        .join('\n');
}

/**
 * Analyze mood based on listening history
 * @param {Array} tracks - Today's tracks from Spotify
 * @param {Object|null} previousAnalysis - Last analysis (if updating), contains: { ai_analysis, updated_at, analyzed_track_ids }
 * @param {Array} newTracks - Only the NEW tracks since last analysis (if updating)
 */
async function analyzeMoodWithAI(tracks, previousAnalysis = null, newTracks = []) {
    const songCounts = countSongPlays(tracks);

    // Find songs in heavy rotation
    const heavyRotation = Object.entries(songCounts)
        .filter(([_, count]) => count >= HEAVY_ROTATION_PLAYS)
        .map(([key, count]) => {
            const [name, artist] = key.split('|||');
            return { name, artist, count };
        })
        .sort((a, b) => b.count - a.count);

    // Build prompt based on whether this is first analysis or update
    const prompt = buildPrompt(tracks, previousAnalysis, newTracks);

    try {
        const message = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 300,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        // Parse the response
        const responseText = message.content[0].text;
        const moodMatch = responseText.match(/MOOD:\s*(.+)/i);
        const analysisMatch = responseText.match(/ANALYSIS:\s*(.+)/is);

        // Build sample tracks: prioritize heavy rotation, then fill with recent
        let sampleTracks = [];

        // Add heavy rotation tracks first
        if (heavyRotation.length > 0) {
        sampleTracks = heavyRotation.slice(0, SAMPLE_TRACKS_COUNT).map(s => {
            const trackData = tracks.find(t => t.track.name === s.name && t.track.artists[0].name === s.artist);
            return {
            track_name: s.name,
            artist: s.artist,
            play_count: s.count,
            album_art_url: trackData?.track.album.images[0]?.url
            };
        });
        }

        // If we have less than max, fill with recent unique tracks
        if (sampleTracks.length < SAMPLE_TRACKS_COUNT) {
            const uniqueTracks = tracks.filter((t, index, self) => 
                self.findIndex(track => track.track.id === t.track.id) === index
            );
        
            for (let i = 0; i < uniqueTracks.length && sampleTracks.length < SAMPLE_TRACKS_COUNT; i++) {
                const track = uniqueTracks[i];
                // Don't add if already in heavy rotation
                if (!sampleTracks.find(st => st.track_name === track.track.name)) {
                    sampleTracks.push({
                        track_name: track.track.name,
                        artist: track.track.artists[0].name,
                        album_art_url: track.track.album.images[0]?.url,
                        play_count: songCounts[`${track.track.name}|||${track.track.artists[0].name}`] || 1
                    });
                }
            }
        }

        const moodSummary = moodMatch ? moodMatch[1].toLowerCase() : 'neutral';
        const gradient = createMoodGradient(moodMatch ? moodMatch[1] : 'neutral, neutral, neutral');

        return {
            mood_summary: moodSummary,
            ai_analysis: analysisMatch ? analysisMatch[1].trim() : responseText,
            sample_tracks: sampleTracks,
            mood_gradient: gradient
        };

    } catch (error) {
        console.error('AI analysis error:', error);
        throw new Error('AI analysis failed: ' + error.message);
    }
}

/**
 * Build appropriate prompt based on context
 */
function buildPrompt(allTracks, previousAnalysis, newTracks) {
    const songCounts = countSongPlays(allTracks);
    const formatTracks = (tracks) => formatTrackList(tracks, songCounts);

    // CASE 1: First analysis of the day
    if (!previousAnalysis) {
        return `You are a music mood analyst. Analyze the user's listening patterns and emotional state today.

Recently played tracks (${allTracks.length} songs):
${formatTracks(allTracks)}

Describe their emotional vibe based on the music. Focus on:
- Real emotions: confident, vulnerable, energetic, melancholic, restless, content, conflicted, nostalgic
- Energy patterns: high/low energy, steady vs shifting vibes
- Emotional themes: romantic, introspective, celebratory, bittersweet
- Contrasts: bouncing between opposite moods vs staying consistent
- You may gently point out something interesting or unexpected in the listening pattern, if it stands out

STRICT RULES:
- Write EXACTLY 2 sentences, no more
- Use CASUAL, conversational language - you're a music-savvy friend, not a therapist
- Do NOT use clinical/dramatic terms: "transcendence", "chemical", "seeking", "needing", "confrontation", "elevation", "dopamine-chasing"
- Do NOT assume WHY they picked songs - just describe WHAT the music shows
- If specifics aren’t clear from the music, keep it high-level rather than guessing
- Do NOT list artist names or genres in parentheses
- Do NOT mention song repetition - replaying songs is totally normal
- Be specific about musical characteristics when possible: "shifted from rap to R&B", "heavy on pop", "lots of Sabrina Carpenter"
- GOOD examples: "mellowed out", "ramped up energy", "switched genres", "still vibing with indie"
- BAD examples: "seeking elevation", "craving stimulation", "moving toward transcendence"

Write directly TO the user in a friendly, natural tone:
- Sentence 1: Overall emotional vibe and energy level
- Sentence 2: What this shows (contrast, consistency, direction, or musical pattern)

Be grounded and observational. Talk like a friend who knows music, not a psychology textbook.

For the MOOD line:
- Use at least one mood word that feels musical or vibe-based, not purely emotional (e.g., "chill", "hyped", "dreamy", "late-night")

Format your response as:
MOOD: [emotion], [emotion], [emotion]
ANALYSIS: [exactly 2 sentences, max 50 words total]`;
    }

    // CASE 2: Updating existing analysis - focus on EVOLUTION
    const timeSince = formatTimeSince(previousAnalysis.updated_at);
    
    return `You are a music mood analyst. The user previously had their mood analyzed ${timeSince}.

PREVIOUS ANALYSIS:
"${previousAnalysis.ai_analysis}"

SONGS LISTENED TO SINCE THEN (${newTracks.length} new tracks):
${formatTracks(newTracks)}

Analyze how their vibe has EVOLVED since the last check. Focus on:
- What CHANGED: Did energy shift? Mood brighten/darken? Genre switch?
- What STAYED: Any consistent thread or similar vibe?
- Musical shifts: tempo changes, genre switches, artist patterns
- You may gently point out something interesting or unexpected in the listening pattern, if it stands out

STRICT RULES:
- Write EXACTLY 2 sentences
- Use CASUAL, conversational language - talk like a music friend, not a therapist
- Focus on PROGRESSION and CHANGE, not just restating current mood
- Use comparative language about the MUSIC: "shifted from hype to chill", "mellowed out", "ramped up", "switched genres"
- Reference the PREVIOUS analysis to show evolution: "from earlier's X to now Y"
- Do NOT use clinical/dramatic terms: "transcendence", "chemical", "seeking", "needing", "elevation", "dopamine-chasing"
- Do NOT assume motivations - describe what changed in the music, not why they chose it
- Be specific: "from aggressive rap to soft R&B" beats "energy shifted"
- If specifics aren’t clear from the music, keep it high-level rather than guessing
- If minimal change, acknowledge consistency: "Still in that upbeat zone" rather than forcing drama
- Use intra-day time references: "from earlier", "since this morning", "from your last check"
- Do NOT use cross-day references: "from yesterday", "compared to last week" (not available in MVP)

Write directly TO the user in a friendly tone:
- Sentence 1: How the mood/energy evolved since last check (compare musical characteristics)
- Sentence 2: What this progression suggests about their vibe trajectory

For the MOOD line:
- Use at least one mood word that feels musical or vibe-based, not purely emotional (e.g., "chill", "hyped", "dreamy", "late-night")


Format your response as:
MOOD: [emotion], [emotion], [emotion]
ANALYSIS: [exactly 2 sentences describing evolution, max 50 words total]`;
}

module.exports = {
    analyzeMoodWithAI
};