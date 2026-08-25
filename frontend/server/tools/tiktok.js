/**
 * tiktok.js
 * 
 * TikTok video download service using TikWM.com free API.
 * Downloads watermark-free videos and optionally trims first/last frames.
 * Includes rate limiting and retry logic for reliability.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import crypto from 'crypto';

// ============================================================================
// CONSTANTS
// ============================================================================

const TIKWM_API_URL = 'https://tikwm.com/api/';

// Frames to trim (in seconds) - TikTok typically adds watermark in first/last ~0.5s
const TRIM_START_SECONDS = 0.5;
const TRIM_END_SECONDS = 0.5;

// Rate limiting: minimum seconds between API requests
const MIN_REQUEST_INTERVAL_MS = 2000;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// ============================================================================
// RATE LIMITING
// ============================================================================

let lastRequestTime = 0;

/**
 * Ensures minimum delay between API requests to avoid rate limiting
 */
async function enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
        const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
        console.log(`[TikTok] Rate limiting: waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates a TikTok URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid TikTok URL
 */
export function isValidTikTokUrl(url) {
    if (!url || typeof url !== 'string') return false;

    // Match various TikTok URL formats:
    // - https://www.tiktok.com/@username/video/1234567890
    // - https://vm.tiktok.com/XXXXXXXX/
    // - https://vt.tiktok.com/XXXXXXXX/
    // - https://tiktok.com/@username/video/1234567890
    const patterns = [
        /^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/i,
        /^https?:\/\/(vm|vt)\.tiktok\.com\/[\w-]+/i,
        /^https?:\/\/(www\.)?tiktok\.com\/t\/[\w-]+/i
    ];

    return patterns.some(pattern => pattern.test(url));
}

/**
 * Fetches video info from TikWM API with retry logic
 * @param {string} tiktokUrl - TikTok video URL
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<Object>} - Video info with download URLs
 */
export async function fetchVideoInfo(tiktokUrl, retryCount = 0) {
    await enforceRateLimit();

    const apiUrl = `${TIKWM_API_URL}?url=${encodeURIComponent(tiktokUrl)}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        // Handle rate limiting response
        if (response.status === 429) {
            if (retryCount < MAX_RETRIES) {
                const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
                console.log(`[TikTok] Rate limited (429), retrying in ${delay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                await sleep(delay);
                return fetchVideoInfo(tiktokUrl, retryCount + 1);
            }
            throw new Error('Rate limited by TikTok service. Please try again in a few minutes.');
        }

        // Handle other HTTP errors
        if (!response.ok) {
            if (retryCount < MAX_RETRIES && response.status >= 500) {
                const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
                console.log(`[TikTok] Server error (${response.status}), retrying in ${delay}ms...`);
                await sleep(delay);
                return fetchVideoInfo(tiktokUrl, retryCount + 1);
            }
            throw new Error(`TikTok download service error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        // Handle API-level errors
        if (result.code !== 0 || !result.data) {
            const errorMsg = result.msg || 'Unknown error';

            // Check for specific error types
            if (errorMsg.includes('video not found') || errorMsg.includes('not exist')) {
                throw new Error('Video not found. It may have been deleted or is private.');
            }
            if (errorMsg.includes('rate') || errorMsg.includes('limit')) {
                if (retryCount < MAX_RETRIES) {
                    const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
                    console.log(`[TikTok] API rate limit, retrying in ${delay}ms...`);
                    await sleep(delay);
                    return fetchVideoInfo(tiktokUrl, retryCount + 1);
                }
            }

            throw new Error(`Failed to fetch video: ${errorMsg}`);
        }

        // Validate we got a video URL
        if (!result.data.play && !result.data.wmplay) {
            throw new Error('No video URL available. This might be a photo slideshow, not a video.');
        }

        return {
            title: result.data.title || 'TikTok Video',
            author: result.data.author?.nickname || result.data.author?.unique_id || 'Unknown',
            duration: result.data.duration || 0,
            cover: result.data.cover || result.data.origin_cover || null,
            playUrl: result.data.play, // Watermark-free URL
            wmPlayUrl: result.data.wmplay, // With watermark URL (fallback)
            hdPlayUrl: result.data.hdplay || result.data.play // HD if available
        };

    } catch (error) {
        // Network errors - retry
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            if (retryCount < MAX_RETRIES) {
                const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
                console.log(`[TikTok] Network error, retrying in ${delay}ms...`);
                await sleep(delay);
                return fetchVideoInfo(tiktokUrl, retryCount + 1);
            }
            throw new Error('Network error. Please check your internet connection.');
        }

        throw error;
    }
}

/**
 * Downloads a video file from URL with retry logic
 * @param {string} videoUrl - Primary URL to download from
 * @param {string} destPath - Destination file path
 * @param {string} fallbackUrl - Fallback URL if primary fails
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<void>}
 */
async function downloadVideo(videoUrl, destPath, fallbackUrl = null, retryCount = 0) {
    try {
        const response = await fetch(videoUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.tiktok.com/',
                'Accept': 'video/*,*/*'
            }
        });

        if (!response.ok) {
            // Try fallback URL if available
            if (fallbackUrl && fallbackUrl !== videoUrl) {
                console.log(`[TikTok] Primary URL failed (${response.status}), trying fallback...`);
                return downloadVideo(fallbackUrl, destPath, null, 0);
            }

            // Retry on server errors
            if (retryCount < MAX_RETRIES && response.status >= 500) {
                const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
                console.log(`[TikTok] Download error (${response.status}), retrying in ${delay}ms...`);
                await sleep(delay);
                return downloadVideo(videoUrl, destPath, fallbackUrl, retryCount + 1);
            }

            throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();

        // Verify we got actual video data
        if (buffer.byteLength < 1000) {
            throw new Error('Downloaded file is too small, may be invalid');
        }

        fs.writeFileSync(destPath, Buffer.from(buffer));
        console.log(`[TikTok] Downloaded ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
        // Network errors - retry or try fallback
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            if (fallbackUrl && fallbackUrl !== videoUrl) {
                console.log(`[TikTok] Network error on primary URL, trying fallback...`);
                return downloadVideo(fallbackUrl, destPath, null, 0);
            }
            if (retryCount < MAX_RETRIES) {
                const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
                console.log(`[TikTok] Network error, retrying in ${delay}ms...`);
                await sleep(delay);
                return downloadVideo(videoUrl, destPath, fallbackUrl, retryCount + 1);
            }
            throw new Error('Failed to download video: Network error');
        }

        throw error;
    }
}

/**
 * Checks if ffmpeg is available on the system
 * @returns {Promise<boolean>}
 */
async function isFFmpegAvailable() {
    return new Promise((resolve) => {
        const proc = spawn('ffmpeg', ['-version'], { shell: true });
        proc.on('close', (code) => resolve(code === 0));
        proc.on('error', () => resolve(false));
    });
}

/**
 * Trims first and last frames from video using ffmpeg
 * @param {string} inputPath - Input video path
 * @param {string} outputPath - Output video path
 * @param {number} duration - Video duration in seconds
 * @returns {Promise<void>}
 */
async function trimVideoFrames(inputPath, outputPath, duration) {
    return new Promise((resolve, reject) => {
        // Calculate trim points
        const startTime = TRIM_START_SECONDS;
        const endTime = Math.max(0, duration - TRIM_END_SECONDS);
        const newDuration = endTime - startTime;

        if (newDuration <= 0) {
            // Video too short to trim, just copy it
            fs.copyFileSync(inputPath, outputPath);
            resolve();
            return;
        }

        const args = [
            '-y',                           // Overwrite output
            '-i', inputPath,                // Input file
            '-ss', startTime.toString(),    // Start time
            '-t', newDuration.toString(),   // Duration
            '-c:v', 'libx264',              // Video codec
            '-c:a', 'aac',                  // Audio codec
            '-preset', 'fast',              // Encoding speed
            '-crf', '23',                   // Quality (lower = better)
            outputPath                       // Output file
        ];

        const proc = spawn('ffmpeg', args, { shell: true });

        let stderr = '';
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`FFmpeg failed with code ${code}: ${stderr.slice(-500)}`));
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`FFmpeg error: ${err.message}`));
        });
    });
}

/**
 * Main function to process a TikTok video
 * Downloads, optionally trims, and saves to library
 * 
 * @param {string} tiktokUrl - TikTok video URL
 * @param {string} videosDir - Directory to save videos
 * @param {boolean} enableTrim - Whether to trim first/last frames
 * @returns {Promise<Object>} - Result with video info and file path
 */
export async function processTikTokVideo(tiktokUrl, videosDir, enableTrim = true) {
    // 1. Validate URL
    if (!isValidTikTokUrl(tiktokUrl)) {
        throw new Error('Invalid TikTok URL format');
    }

    // 2. Fetch video info from TikWM
    console.log('[TikTok] Fetching video info...');
    const videoInfo = await fetchVideoInfo(tiktokUrl);

    if (!videoInfo.playUrl) {
        throw new Error('Could not get video download URL');
    }

    // 3. Generate unique filename
    const timestamp = Date.now();
    const hash = crypto.randomBytes(4).toString('hex');
    const baseFilename = `tiktok_${timestamp}_${hash}`;
    const tempPath = path.join(videosDir, `${baseFilename}_temp.mp4`);
    const finalPath = path.join(videosDir, `${baseFilename}.mp4`);

    // 4. Download video (try HD first, fallback to standard, then watermarked)
    console.log('[TikTok] Downloading video...');
    const primaryUrl = videoInfo.hdPlayUrl || videoInfo.playUrl;
    const fallbackUrl = videoInfo.playUrl !== primaryUrl ? videoInfo.playUrl : videoInfo.wmPlayUrl;
    await downloadVideo(primaryUrl, tempPath, fallbackUrl);

    // 5. Trim frames if enabled and ffmpeg is available
    let trimmed = false;
    if (enableTrim && videoInfo.duration > 1) {
        const ffmpegAvailable = await isFFmpegAvailable();

        if (ffmpegAvailable) {
            console.log('[TikTok] Trimming first/last frames...');
            try {
                await trimVideoFrames(tempPath, finalPath, videoInfo.duration);
                // Remove temp file after successful trim
                fs.unlinkSync(tempPath);
                trimmed = true;
            } catch (err) {
                console.warn('[TikTok] Trim failed, using original:', err.message);
                // If trim fails, just rename temp to final
                fs.renameSync(tempPath, finalPath);
            }
        } else {
            console.log('[TikTok] FFmpeg not available, skipping trim');
            fs.renameSync(tempPath, finalPath);
        }
    } else {
        fs.renameSync(tempPath, finalPath);
    }

    // 6. Save metadata for history panel
    const id = `${timestamp}_${hash}`;
    const metaFilename = `${id}.json`;
    const metadata = {
        id,
        filename: path.basename(finalPath),
        prompt: `TikTok: ${videoInfo.title}`,
        model: 'tiktok-import',
        author: videoInfo.author,
        sourceUrl: tiktokUrl,
        createdAt: new Date().toISOString(),
        type: 'videos'
    };
    fs.writeFileSync(path.join(videosDir, metaFilename), JSON.stringify(metadata, null, 2));

    // 7. Return result
    const filename = path.basename(finalPath);
    const videoUrl = `/library/videos/${filename}`;

    console.log(`[TikTok] Video saved: ${videoUrl}`);

    return {
        success: true,
        videoUrl,
        filename,
        title: videoInfo.title,
        author: videoInfo.author,
        duration: videoInfo.duration,
        cover: videoInfo.cover,
        trimmed
    };
}
