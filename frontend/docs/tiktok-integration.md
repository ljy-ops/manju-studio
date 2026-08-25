# Post to TikTok Integration

Share your generated videos directly to TikTok with one click.

## Setup

### 1. Create TikTok Developer App

1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create a new app
3. Add products:
   - **Login Kit**
   - **Content Posting API** (enable "Direct Post")
4. Add scopes: `user.info.basic`, `video.publish`

### 2. Configure Redirect URI

Add your callback URL in Login Kit → Redirect URI:

```
# For local development (requires ngrok)
https://YOUR-NGROK-URL.ngrok-free.app/api/tiktok-post/callback

# For production
https://yourdomain.com/api/tiktok-post/callback
```

### 3. Environment Variables

Add to your `.env` file:

```env
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_CALLBACK_URL=https://your-callback-url/api/tiktok-post/callback
```

### 4. Local Development Setup

TikTok requires HTTPS callback URLs. Use ngrok for local testing:

```bash
# Install ngrok
npm install -g ngrok

# Start your dev server
npm run dev

# In another terminal, expose port 3001
ngrok http 3001
```

Add the ngrok URL to your TikTok app's redirect URIs.

## Usage

1. Generate a video using any Video node
2. Hover over the video to reveal the toolbar
3. Click the **TikTok icon** (🎵)
4. Sign in with TikTok (first time only)
5. Enter a caption with hashtags
6. Select privacy level
7. Click **Post to TikTok**

## Privacy Levels

| Level | Description |
|-------|-------------|
| Public | Everyone can view |
| Friends | Mutual followers only |
| Followers | Your followers only |
| Only Me | Private (recommended for testing) |

## Sandbox Limitations

⚠️ **Unaudited apps have restrictions:**

- Videos are **private-only** until TikTok approves your app
- Target TikTok accounts must be set to **private** for testing
- Add test accounts in Sandbox → Target Users

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tiktok-post/auth` | GET | Get OAuth authorization URL |
| `/api/tiktok-post/callback` | GET | OAuth callback handler |
| `/api/tiktok-post/status` | GET | Check authentication status |
| `/api/tiktok-post/post` | POST | Upload and post video |
| `/api/tiktok-post/logout` | POST | Clear session |

## Troubleshooting

### "scope_not_authorized" Error
- User info fetch failed (OK in Sandbox mode)
- Authentication still proceeds with fallback

### "unaudited_client_can_only_post_to_private_accounts"
- Set your TikTok account to **private** temporarily
- Or submit your app for TikTok review

### OAuth Popup Blocked
- Allow popups for the site in your browser

## Video Requirements

- **Format**: MP4
- **Max size**: 4GB
- **Duration**: 3 seconds to 10 minutes
- **Codecs**: H.264 video, AAC audio
