const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const config = require('./config/env');
const { pool } = require('./db/database');

// Import routes
const authRoutes = require('./auth/spotify-auth');
const moodDiaryRoutes = require('./routes/mood-diary');
const onboardingRoutes = require('./routes/onboarding');

const app = express();

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "i.scdn.co"],
            connectSrc: ["'self'", "https://api.spotify.com", "https://accounts.spotify.com"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: config.env === 'production'
        ? process.env.ALLOWED_ORIGIN  // Set in production
        : true,         // Allow all in development
    credentials: true
};

// Middleware setup
app.use(express.static(path.join(__dirname, 'public')))
   .use(cors(corsOptions))
   .use(cookieParser())
   .use(express.json());

// Session configuration
app.use(session({
    store: new pgSession({
        pool: pool,                            // Use existing PostgreSQL pool
        tableName: 'session',                  // Table name for sessions
        createTableIfMissing: true             // Auto-create session table
    }),
    secret: config.server.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config.env === 'production',  // HTTPS only in prod
        httpOnly: true,                        // Prevent XSS attacks
        sameSite: 'lax',                       // CSRF protection
        maxAge: 24 * 60 * 60 * 1000,          // 24 hours
        path: '/'                              // Ensure cookie is available on all paths
    },
    name: 'sessionId',                         // Custom session cookie name
    proxy: config.env === 'production'         // Trust first proxy (required for Render)
}));

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/', authRoutes);           // Auth routes (/login, /callback, /refresh_token)
app.use('/api', moodDiaryRoutes);   // Mood diary API routes
app.use('/', onboardingRoutes);     // Onboarding routes (/api/request-access)

// Global error handler
app.use((err, _req, res, _next) => {
    if (config.env !== 'production') {
        console.error('Error:', err.stack);
    }
    res.status(err.status || 500).json({
        error: config.env === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// Start server
app.listen(config.server.port, () => {
    if (config.env !== 'production') {
        console.log(`🎵 Music Mood Diary running on http://127.0.0.1:${config.server.port}`);
        console.log(`Environment: ${config.env}`);
    }
});

module.exports = app;
