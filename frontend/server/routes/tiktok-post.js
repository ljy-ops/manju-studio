/**
 * tiktok-post.js (routes)
 * 
 * API routes for TikTok Content Posting integration.
 * Handles OAuth flow and video posting to TikTok.
 */

import { Router } from 'express';
import path from 'path';
import {
    generateAuthUrl,
    handleCallback,
    getSessionUser,
    postVideoFromUrl,
    clearSession
} from '../services/tiktok-post.js';

const router = Router();

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /auth
 * Initiate OAuth 2.0 flow - returns auth URL for popup
 */
router.get('/auth', (req, res) => {
    try {
        // Read env vars at request time (after dotenv has loaded)
        const clientKey = process.env.TIKTOK_CLIENT_KEY;
        const callbackUrl = process.env.TIKTOK_CALLBACK_URL || 'http://localhost:3001/api/tiktok-post/callback';

        if (!clientKey) {
            return res.status(500).json({
                error: 'TikTok API not configured. Please set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in .env'
            });
        }

        const { url, state } = generateAuthUrl(clientKey, callbackUrl);

        res.json({
            authUrl: url,
            state
        });
    } catch (error) {
        console.error('[TikTok] Auth error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /callback
 * OAuth callback handler - exchanges code for tokens
 * This is loaded in the popup window, should close and notify parent
 */
router.get('/callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        if (error) {
            console.error('[TikTok] OAuth error:', error, error_description);
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head><title>TikTok Auth Error</title></head>
                <body>
                    <script>
                        window.opener.postMessage({ 
                            type: 'tiktok-auth-error', 
                            error: '${error_description || error}' 
                        }, '*');
                        window.close();
                    </script>
                    <p>Authentication failed. This window should close automatically.</p>
                </body>
                </html>
            `);
        }

        if (!code || !state) {
            return res.status(400).send('Missing code or state parameter');
        }

        // Read env vars at request time
        const clientKey = process.env.TIKTOK_CLIENT_KEY;
        const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
        const callbackUrl = process.env.TIKTOK_CALLBACK_URL || 'http://localhost:3001/api/tiktok-post/callback';

        const { sessionId, user } = await handleCallback(
            clientKey,
            clientSecret,
            code,
            state,
            callbackUrl
        );

        console.log(`[TikTok] User authenticated: ${user.displayName || user.username}`);

        // Send message to parent window and close popup
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>TikTok Auth Success</title></head>
            <body>
                <script>
                    window.opener.postMessage({ 
                        type: 'tiktok-auth-success', 
                        sessionId: '${sessionId}',
                        user: ${JSON.stringify(user)}
                    }, '*');
                    window.close();
                </script>
                <p>Authentication successful! This window should close automatically.</p>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('[TikTok] Callback error:', error);
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>TikTok Auth Error</title></head>
            <body>
                <script>
                    window.opener.postMessage({ 
                        type: 'tiktok-auth-error', 
                        error: '${error.message.replace(/'/g, "\\'")}' 
                    }, '*');
                    window.close();
                </script>
                <p>Authentication failed. This window should close automatically.</p>
            </body>
            </html>
        `);
    }
});

/**
 * GET /status
 * Check if user is authenticated
 */
router.get('/status', (req, res) => {
    try {
        const sessionId = req.headers['x-tiktok-session'] || req.query.sessionId;

        if (!sessionId) {
            return res.json({ authenticated: false });
        }

        const user = getSessionUser(sessionId);

        if (user) {
            res.json({
                authenticated: true,
                user: {
                    openId: user.openId,
                    displayName: user.displayName,
                    username: user.username,
                    avatarUrl: user.avatarUrl
                }
            });
        } else {
            res.json({ authenticated: false });
        }
    } catch (error) {
        console.error('[TikTok] Status check error:', error);
        res.json({ authenticated: false, error: error.message });
    }
});

/**
 * POST /post
 * Upload video and post to TikTok
 */
router.post('/post', async (req, res) => {
    try {
        const sessionId = req.headers['x-tiktok-session'];
        const { mediaUrl, title, privacyLevel } = req.body;

        if (!sessionId) {
            return res.status(401).json({ error: 'Not authenticated. Please login first.' });
        }

        if (!mediaUrl) {
            return res.status(400).json({ error: 'Video URL is required' });
        }

        // Get library directory from app locals
        const libraryDir = req.app.locals.LIBRARY_DIR || path.join(process.cwd(), 'library');

        console.log(`[TikTok] Posting video: ${mediaUrl}`);

        const result = await postVideoFromUrl(sessionId, mediaUrl, {
            title: title || '',
            privacyLevel: privacyLevel || 'SELF_ONLY'
        }, libraryDir);

        res.json({
            success: true,
            publishId: result.publishId,
            status: result.status,
            message: result.message
        });
    } catch (error) {
        console.error('[TikTok] Post error:', error);

        // Handle specific TikTok API errors
        if (error.message?.includes('Not authenticated')) {
            return res.status(401).json({ error: 'Session expired. Please login again.' });
        }

        res.status(500).json({ error: error.message || 'Failed to post to TikTok' });
    }
});

/**
 * POST /logout
 * Clear the session
 */
router.post('/logout', (req, res) => {
    try {
        const sessionId = req.headers['x-tiktok-session'];

        if (sessionId) {
            clearSession(sessionId);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[TikTok] Logout error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
