/**
 * One-time script to regenerate mood_gradient for existing analyses
 * based on their mood_summary using the updated color mappings
 *
 */

const { pool } = require('../db/database');
const { createMoodGradient } = require('../utils/mood-colors');

async function fixMoodGradients() {
    console.log('Starting mood gradient migration...\n');

    try {
        // Fetch all analyses
        const result = await pool.query(
            'SELECT id, date, mood_summary, mood_gradient FROM daily_mood_analysis ORDER BY date DESC'
        );

        const rows = result.rows;
        console.log(`Found ${rows.length} analyses to update\n`);

        if (rows.length === 0) {
            console.log('No analyses found.');
            process.exit(0);
        }

        let updated = 0;
        let skipped = 0;

        // Process each row
        for (const row of rows) {
            const newGradient = createMoodGradient(row.mood_summary);

            // Check if gradient changed
            if (row.mood_gradient !== newGradient) {
                await pool.query(
                    'UPDATE daily_mood_analysis SET mood_gradient = $1 WHERE id = $2',
                    [newGradient, row.id]
                );
                updated++;
                console.log(`✓ Updated ${row.date}: "${row.mood_summary}"`);
                console.log(`  Old: ${row.mood_gradient.substring(0, 80)}...`);
                console.log(`  New: ${newGradient.substring(0, 80)}...`);
            } else {
                skipped++;
                console.log(`- Skipped ${row.date}: Already has correct gradient`);
            }
        }

        console.log(`\n✓ Migration complete!`);
        console.log(`  Updated: ${updated}`);
        console.log(`  Skipped: ${skipped}`);

        process.exit(0);
    } catch (error) {
        console.error('Error during migration:', error);
        process.exit(1);
    }
}

fixMoodGradients();
