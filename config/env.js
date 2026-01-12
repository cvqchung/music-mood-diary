/**
 * Environment configuration
 * Centralizes all environment variables
 */

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Validate required environment variables
const requiredEnvVars = [
    'SPOTIFY_CLIENT_ID',
    'SPOTIFY_CLIENT_SECRET',
    'ANTHROPIC_API_KEY',
    'SESSION_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease check your .env file or environment configuration.');
    process.exit(1);
}

module.exports = {
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:8888/callback'
    },
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY
    },
    database: {
        // Connection pool settings (uses DATABASE_URL for connection string)
        max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
        idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '2000')
    },
    server: {
        port: process.env.PORT || 8888,
        sessionSecret: process.env.SESSION_SECRET
    },
    webhook: {
        url: process.env.WEBHOOK_URL || null,       // Discord webhook URL
        dbUrl: process.env.WEBHOOK_DB_URL || null   // Database dashboard link
    },
    env: process.env.NODE_ENV || 'development'
};
