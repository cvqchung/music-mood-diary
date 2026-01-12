const express = require('express');
const { saveOnboardingRequest } = require('../db/database');
const config = require('../config/env');

const router = express.Router();

// Helper to send Discord webhook notification
function sendWebhookNotification(name, email) {
    if (!config.webhook.url) return; // Skip if no webhook configured

    const dbLink = config.webhook.dbUrl || 'Check your database';

    const payload = {
        content: `🎵 **New access request**\n**Name:** ${name}\n**Email:** ${email}\n\n[View in Database](${dbLink})`
    };

    fetch(config.webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(err => console.error('Webhook error:', err));
}

// POST /api/request-access - Save new access request
router.post('/api/request-access', function(req, res) {
    const { name, email } = req.body;

    // Validate presence
    if (!name || !email) {
        return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    // Validate name
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
        return res.status(400).json({ success: false, error: 'Name must be between 2 and 100 characters' });
    }

    // Basic sanitization - reject names with suspicious characters
    if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
        return res.status(400).json({ success: false, error: 'Name contains invalid characters' });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
        return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    saveOnboardingRequest(trimmedName, email.toLowerCase().trim(), function(err) {
        if (err) {
            if (err.message.includes('unique')) {
                return res.status(400).json({ success: false, error: 'Email already registered' });
            }
            return res.status(500).json({ success: false, error: 'Database error' });
        }

        // Send webhook notification
        sendWebhookNotification(trimmedName, email);

        res.json({ success: true });
    });
});

module.exports = router;
