/**
 * tiktok-post.js
 * 
 * TikTok Content Posting API service.
 * Handles OAuth 2.0 authentication and video uploads to TikTok.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPES & STATE
// ============================================================================

/**
 * In-memory storage for OAuth sessions and authenticated clients
 * In production, use Redis or a database
 */
const oauthSessions = new Map(); // state -> { createdAt }
const authenticatedClients = new Map(); // sessionId -> { accessToken, openId, expiresAt, user }

// TikTok API base URLs
const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';
const TIKTOK_VIDEO_INIT_URL = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
const TIKTOK_POST_STATUS_URL = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/';

// ============================================================================
// OAUTH FLOW
// ============================================================================

/**
 * Generate OAuth 2.0 authorization URL for TikTok
 * 
 * @param {string} clientKey - TikTok OAuth client key
 * @param {string} callbackUrl - Callback URL registered in TikTok app
 * @returns {Object} - { url, state }
 */
export function generateAuthUrl(clientKey, callbackUrl) {
    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Build authorization URL
    const params = new URLSearchParams({
        client_key: clientKey,
        scope: 'user.info.basic,video.publish',
        response_type: 'code',
        redirect_uri: callbackUrl,
        state: state
    });

    const url = `${TIKTOK_AUTH_URL}?${params.toString()}`;

    // Store session data
    oauthSessions.set(state, {
        createdAt: Date.now()
    });

    // Clean up old sessions (older than 10 minutes)
    cleanupOldSessions();

    console.log(`[TikTok] Generated auth URL with state: ${state.substring(0, 8)}...`);

    return { url, state };
}

/**
 * Handle OAuth callback and exchange authorization code for tokens
 * 
 * @param {string} clientKey - TikTok OAuth client key
 * @param {string} clientSecret - TikTok OAuth client secret
 * @param {string} code - Authorization code from callback
 * @param {string} state - State parameter for CSRF verification
 * @param {string} callbackUrl - Callback URL (must match original)
 * @returns {Promise<Object>} - { sessionId, user }
 */
export async function handleCallback(clientKey, clientSecret, code, state, callbackUrl) {
    // Verify state
    const session = oauthSessions.get(state);
    if (!session) {
        throw new Error('Invalid or expired OAuth session');
    }
    oauthSessions.delete(state);

    console.log(`[TikTok] Exchanging code for tokens...`);

    // Exchange code for tokens
    const tokenResponse = await fetch(TIKTOK_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: callbackUrl
        })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
        console.error('[TikTok] Token error:', tokenData);
        throw new Error(tokenData.error_description || tokenData.error || 'Failed to get access token');
    }

    const { access_token, open_id, expires_in, refresh_token } = tokenData;

    console.log(`[TikTok] Got access token, fetching user info...`);

    // Get user info (non-fatal - use fallback if it fails, since Sandbox mode may restrict this)
    let user = {
        open_id: open_id,
        display_name: 'TikTok User',
        username: '',
        avatar_url: ''
    };

    try {
        const userResponse = await fetch(`${TIKTOK_USER_INFO_URL}?fields=open_id,display_name,avatar_url,username`, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        const userData = await userResponse.json();

        if (userData.data?.user) {
            user = userData.data.user;
            console.log(`[TikTok] Got user info: ${user.display_name || user.username}`);
        } else if (userData.error) {
            console.warn('[TikTok] User info not available (this is OK in Sandbox):', userData.error.message);
        }
    } catch (userInfoError) {
        console.warn('[TikTok] Could not fetch user info (continuing anyway):', userInfoError.message);
    }

    // Generate session ID and store authenticated client
    const sessionId = crypto.randomBytes(32).toString('hex');
    authenticatedClients.set(sessionId, {
        accessToken: access_token,
        openId: open_id,
        refreshToken: refresh_token,
        expiresAt: Date.now() + (expires_in * 1000),
        user: {
            openId: open_id,
            displayName: user.display_name || 'TikTok User',
            username: user.username || '',
            avatarUrl: user.avatar_url || ''
        },
        clientKey,
        clientSecret
    });

    console.log(`[TikTok] User authenticated: ${user.display_name || user.username || open_id}`);

    return {
        sessionId,
        user: {
            openId: open_id,
            displayName: user.display_name || 'TikTok User',
            username: user.username || '',
            avatarUrl: user.avatar_url || ''
        }
    };
}

/**
 * Check if session is authenticated
 * 
 * @param {string} sessionId - Session ID
 * @returns {Object|null} - User info or null
 */
export function getSessionUser(sessionId) {
    const session = authenticatedClients.get(sessionId);
    if (!session || Date.now() > session.expiresAt) {
        if (session) authenticatedClients.delete(sessionId);
        return null;
    }
    return session.user;
}

/**
 * Get session data
 * 
 * @param {string} sessionId - Session ID
 * @returns {Object|null} - Session data or null
 */
function getSession(sessionId) {
    const session = authenticatedClients.get(sessionId);
    if (!session || Date.now() > session.expiresAt) {
        if (session) authenticatedClients.delete(sessionId);
        return null;
    }
    return session;
}

// ============================================================================
// VIDEO POSTING
// ============================================================================

/**
 * Post a video to TikTok
 * 
 * @param {string} sessionId - Session ID
 * @param {string} videoPath - Absolute path to video file
 * @param {Object} postInfo - Post settings
 * @param {string} postInfo.title - Video title/caption (supports hashtags)
 * @param {string} postInfo.privacyLevel - Privacy level
 * @returns {Promise<Object>} - { publishId, status }
 */
export async function postVideo(sessionId, videoPath, postInfo) {
    const session = getSession(sessionId);
    if (!session) {
        throw new Error('Not authenticated');
    }

    // Get video file stats
    const stats = fs.statSync(videoPath);
    const videoSize = stats.size;

    // TikTok allows single-chunk upload for files up to 64MB
    // For simplicity, use single chunk (most generated videos are under 64MB)
    const MAX_SINGLE_CHUNK = 64 * 1024 * 1024; // 64MB

    if (videoSize > MAX_SINGLE_CHUNK) {
        throw new Error(`Video too large (${(videoSize / 1024 / 1024).toFixed(2)}MB). Maximum is 64MB for direct upload.`);
    }

    // Use single chunk upload - chunk_size = video_size, total_chunk_count = 1
    const chunkSize = videoSize;
    const totalChunks = 1;

    console.log(`[TikTok] Posting video: ${videoPath} (${(videoSize / 1024 / 1024).toFixed(2)}MB, single chunk)`);

    // Step 1: Initialize upload
    const initResponse = await fetch(TIKTOK_VIDEO_INIT_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({
            post_info: {
                title: postInfo.title || '',
                privacy_level: postInfo.privacyLevel || 'SELF_ONLY',
                disable_duet: false,
                disable_comment: false,
                disable_stitch: false
            },
            source_info: {
                source: 'FILE_UPLOAD',
                video_size: videoSize,
                chunk_size: chunkSize,
                total_chunk_count: totalChunks
            }
        })
    });

    const initData = await initResponse.json();

    if (initData.error?.code !== 'ok') {
        console.error('[TikTok] Init error:', initData);
        throw new Error(initData.error?.message || 'Failed to initialize upload');
    }

    const { publish_id, upload_url } = initData.data;

    console.log(`[TikTok] Upload initialized: ${publish_id}`);

    // Step 2: Upload video file
    const videoBuffer = fs.readFileSync(videoPath);

    // Upload the video
    const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: {
            'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
            'Content-Type': 'video/mp4'
        },
        body: videoBuffer
    });

    if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.text();
        console.error('[TikTok] Upload error:', uploadError);
        throw new Error(`Failed to upload video: ${uploadResponse.status}`);
    }

    console.log(`[TikTok] Video uploaded, checking status...`);

    // Step 3: Check publish status (poll a few times)
    let status = 'PROCESSING';
    let attempts = 0;
    const maxAttempts = 10;

    while (status === 'PROCESSING' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

        const statusResponse = await fetch(TIKTOK_POST_STATUS_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify({
                publish_id: publish_id
            })
        });

        const statusData = await statusResponse.json();

        if (statusData.error?.code !== 'ok') {
            console.error('[TikTok] Status check error:', statusData);
            break;
        }

        status = statusData.data?.status || 'UNKNOWN';
        console.log(`[TikTok] Status: ${status} (attempt ${attempts + 1}/${maxAttempts})`);

        if (status === 'PUBLISH_COMPLETE') {
            console.log(`[TikTok] Video published successfully!`);
            return {
                publishId: publish_id,
                status: 'success',
                message: 'Video posted to TikTok successfully!'
            };
        }

        if (status === 'FAILED') {
            const failReason = statusData.data?.fail_reason || 'Unknown error';
            throw new Error(`TikTok publishing failed: ${failReason}`);
        }

        attempts++;
    }

    // If still processing after max attempts, return pending status
    return {
        publishId: publish_id,
        status: 'pending',
        message: 'Video is being processed by TikTok. It may take a few minutes to appear.'
    };
}

/**
 * Post video from URL (downloads first, then uploads)
 * 
 * @param {string} sessionId - Session ID
 * @param {string} mediaUrl - URL of video (local server URL like /library/videos/xxx.mp4)
 * @param {Object} postInfo - Post settings
 * @param {string} libraryDir - Base library directory path
 * @returns {Promise<Object>} - { publishId, status }
 */
export async function postVideoFromUrl(sessionId, mediaUrl, postInfo, libraryDir) {
    let videoPath;

    // Strip query parameters (e.g., ?t=123456 cache busting)
    const cleanUrl = mediaUrl.split('?')[0];

    if (cleanUrl.startsWith('/library/')) {
        // Local library URL
        const relativePath = cleanUrl.replace('/library/', '');
        videoPath = path.join(libraryDir, relativePath);
    } else if (mediaUrl.startsWith('data:')) {
        // Base64 data URL - save to temp file first
        const matches = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) throw new Error('Invalid data URL');

        const buffer = Buffer.from(matches[2], 'base64');

        const tempDir = path.join(libraryDir, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        videoPath = path.join(tempDir, `tiktok_upload_${Date.now()}.mp4`);
        fs.writeFileSync(videoPath, buffer);
    } else {
        throw new Error('Unsupported media URL format');
    }

    if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found: ${videoPath}`);
    }

    return postVideo(sessionId, videoPath, postInfo);
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Clean up expired OAuth sessions
 */
function cleanupOldSessions() {
    const TEN_MINUTES = 10 * 60 * 1000;
    const now = Date.now();

    for (const [state, session] of oauthSessions.entries()) {
        if (now - session.createdAt > TEN_MINUTES) {
            oauthSessions.delete(state);
        }
    }
}

/**
 * Logout / clear session
 * 
 * @param {string} sessionId - Session ID to clear
 */
export function clearSession(sessionId) {
    authenticatedClients.delete(sessionId);
}
