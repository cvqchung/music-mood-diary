# 🎵 Music Mood Diary

Track your mood through music. A web app that analyzes your Spotify listening history and generates daily mood insights using AI.

Built with Node.js · Express · PostgreSQL · Claude API

**Built by [Cynthia Chung](https://linkedin.com/in/cvqchung)** · cynthiacgq@gmail.com

## Live Demo

🚀 **[View Live Application](https://music-mood-diary.onrender.com)**

> **Note:** Due to Spotify's Development Mode restrictions, the app requires manual user authorization. Request demo access in the form on the website.

### Demo Screenshots

<img width="400" alt="Screenshot 2026-01-20 at 4 48 26 PM" src="https://github.com/user-attachments/assets/6810773c-81da-4fb6-933a-c4954b9a6940" />
<img width="400" alt="Screenshot 2026-01-09 at 2 22 08 PM" src="https://github.com/user-attachments/assets/6d0410bd-1b24-4646-9346-094be4c2c0d1" />

## Features

- **AI Mood Analysis**: Claude AI analyzes your listening patterns to generate personalized mood insights
- **Daily Mood Tracking**: Stores daily mood analyses with sample tracks and gradients
- **History View**: Browse past analyses with mood-based gradient backgrounds
- **Smart Updates**: Refreshes analysis only when you've listened to enough new music
- **Spotify OAuth Integration**: Secure authentication with automatic token refresh

## Tech Stack

**Backend:**
- Node.js & Express 5
- PostgreSQL (with connection pooling)
- Anthropic Claude AI API
- Spotify Web API

**Frontend:**
- JavaScript
- CSS3 with gradient backgrounds
- Responsive design

**Authentication:**
- OAuth 2.0 (Spotify)
- Express sessions with secure cookies

**License:** MIT


## Technical Highlights

### Architecture
- **Session-based auth** with PostgreSQL session store for production
- **PostgreSQL** with JSONB for storing flexible track data alongside relational data
- **Modular structure**: Separated auth, API integrations, routes, and utilities
- **Claude Haiku 4.5** for cost-effective AI analysis

### Security
- Helmet.js for security headers (CSP, XSS protection)
- Session cookies with httpOnly, secure, and sameSite flags
- OAuth state parameter for CSRF protection
- Parameterized queries to prevent SQL injection

### Smart Update Logic
- Only re-analyzes when you've added 8+ new tracks OR 40%+ of tracks changed OR 6+ hours elapsed
- Tracks which songs were analyzed to detect new listening activity
- Updates show evolution from previous analysis (e.g., "shifted from upbeat to mellow")

## Development Journey

### Key Challenges Solved
1. **Timezone Handling**: Filtering Spotify tracks by local date to accurately group listening by user's day
2. **Smart Update Logic**: Detecting meaningful changes in listening activity to avoid redundant AI calls
3. **AI Prompt Engineering**: Writing prompts that generate consistent, conversational (not clinical) mood insights
4. **Token Refresh Flow**: Handling expired Spotify tokens with automatic refresh before API calls
5. **Mood Gradient Generation**: Parsing AI mood keywords to create matching color gradients

### What I Learned
- OAuth 2.0 authorization code flow with refresh tokens
- AI prompt engineering for consistent, natural-sounding outputs
- PostgreSQL JSONB for semi-structured data (tracks, gradients)
- Session security (httpOnly cookies, CSRF protection)
- Production deployment on Render (proxy headers, session store)

## Known Limitations

- **Spotify Development Mode**: Max 25 authorized users (API restriction)
- **Recently Played API**: Limited to last 50 tracks (~24 hours of listening)
- **AI Analysis**: Daily limits depend on Anthropic API tier
- **Date Range**: Can only analyze recent listening history


## Future Enhancements

**Phase 1 - Essential Infrastructure**
- [ ] Background song storage beyond 50 tracks - enables all other features by storing complete listening history
- [ ] Expand "sample tracks" into scrollable list of all 50+ tracks - better data visibility

**Phase 2 - Core Analytics**
- [ ] Mood trend graphs - visualize patterns over time
- [ ] User listening profile table - baseline for comparisons (artists/genres, energy/mood, volume)
- [ ] Pattern detection (compare today vs typical) - requires profile table first
- [ ] Data export (CSV/JSON) - requires analytics above

**Phase 3 - Nice to Have**
- [ ] Shareable mood cards - Wrapped-style sharing for social
- [ ] Time-segmented analysis (morning/afternoon/evening in one entry) - requires more complex data structure
- [ ] Apple Music support - expand beyond Spotify users, new auth flow/API integration needed

---

## Technical Reference

### Project Structure

```
music-mood-diary/
├── api/              # API integrations
│   ├── ai-analysis.js      # Claude AI mood analysis
│   └── spotify-api.js      # Spotify API wrapper
├── auth/             # Authentication logic
│   ├── spotify-auth.js     # OAuth flow
│   └── token-manager.js    # Token refresh & validation
├── config/           # Configuration
│   ├── constants.js        # App constants
│   └── env.js              # Environment config
├── db/               # Database
│   └── database.js         # PostgreSQL connection & queries
├── middleware/       # Express middleware
│   └── db-user-id.js       # User ID middleware
├── public/           # Static files
│   ├── css/                # Stylesheets
│   ├── js/                 # Client-side JavaScript
│   └── index.html          # Main HTML page
├── routes/           # Route handlers
│   ├── mood-diary.js       # Mood analysis endpoints
│   └── onboarding.js       # User onboarding
├── scripts/          # Utility scripts
│   ├── fix-mood-gradients.js
│   └── test-colors.js
├── utils/            # Utility functions
│   ├── date-utils.js       # Date formatting & filtering
│   ├── mood-analysis-helpers.js
│   ├── mood-colors.js      # Gradient generation
│   ├── spotify-helpers.js
│   └── update-logic.js
└── server.js         # Express app entry point
```
<details>
<summary><h3>API Documentation</h3></summary>

#### Authentication Endpoints
- `GET /login` - Initiate Spotify OAuth flow
- `GET /callback` - OAuth callback handler
- `GET /logout` - Destroy user session
- `GET /api/auth-status` - Check authentication status

#### Mood Analysis Endpoints
- `POST /api/analyze-mood` - Analyze today's listening
- `POST /api/analyze-mood-date` - Analyze specific date
- `GET /api/mood-today` - Get today's mood analysis
- `GET /api/mood-history?limit=30` - Get mood history

#### Spotify API Endpoints
- `GET /api/me` - Get current user profile
- `GET /api/recently-played` - Get recently played tracks
- `GET /api/currently-playing` - Get currently playing track

#### System Endpoints
- `GET /health` - Health check endpoint
- `POST /api/request-access` - Submit demo access request

</details>

<details>
<summary><h3>Database Schema</h3></summary>

#### `users` : Stores user authentication tokens
- `id` - Primary key
- `spotify_user_id` - Spotify user ID (unique)
- `access_token` - Current access token
- `refresh_token` - Refresh token
- `token_expiry` - Token expiration timestamp

#### `daily_mood_analysis` : Stores daily mood analyses
- `id` - Primary key
- `user_id` - Foreign key to users
- `date` - Analysis date
- `mood_summary` - AI-generated mood keywords
- `ai_analysis` - AI-generated analysis text
- `sample_tracks` - JSON array of sample tracks
- `mood_gradient` - CSS gradient string
- `analyzed_track_ids` - JSON array of analyzed track IDs
- `is_complete` - Whether day is complete

#### `onboarding_requests` : Stores user access requests
- `id` - Primary key
- `name` - User name
- `email` - Email address (unique)
- `status` - Request status (pending/approved/rejected)
</details>
