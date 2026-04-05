# YouTube auto-post setup (Google OAuth + YouTube Data API v3)

This app can connect a user’s YouTube channel and, when they create a **scheduled post with video**, upload that video to YouTube at the scheduled time (same cron as Facebook / Instagram / TikTok).

## 1. Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick an existing one).
3. Note the project name; you will enable APIs on it.

## 2. Enable YouTube Data API v3

1. In the console, go to **APIs & Services → Library**.
2. Search for **YouTube Data API v3**.
3. Click **Enable**.

## 3. OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External** (unless you use Google Workspace and want Internal).
3. Fill **App name**, **User support email**, **Developer contact email**.
4. Under **Scopes**, add (or they will be requested by the app):
   - `https://www.googleapis.com/auth/youtube.readonly`
   - `https://www.googleapis.com/auth/youtube.upload`
5. If the app is in **Testing**, add every Google account that will connect YouTube under **Test users**.
6. When ready for production, submit for verification if Google requires it for these scopes.

## 4. OAuth 2.0 Client ID (Web application)

1. Go to **APIs & Services → Credentials**.
2. **Create credentials → OAuth client ID**.
3. Application type: **Web application**.
4. **Authorized redirect URIs** — add **exactly** (replace with your API public base, same as backend `APP_URL`):

   `{APP_URL}/social-auth/youtube/callback`

   Examples:

   - Local: `http://localhost:3000/v1/social-auth/youtube/callback`
   - Production: `https://your-api.example.com/v1/social-auth/youtube/callback`

5. Save and copy **Client ID** and **Client secret**.

## 5. Backend environment variables

Set on the Eatix / Ethics API server (same style as Facebook/TikTok):

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID from step 4 |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret from step 4 |
| `APP_URL` | Public API base **including** `/v1` if that is how your routes are mounted (must match redirect URI you registered) |

Optional:

| Variable | Description |
|----------|-------------|
| `GOOGLE_YOUTUBE_SCOPES` | Space-separated scopes; overrides default if set |

Restart the API after changing env vars.

## 6. Mobile app configuration

1. In `Ethics-app/config.js`, `apiBaseUrl` must point at the same API host used in Google’s redirect URI (without path mismatch).
2. Optional fallback (if `/social-auth/youtube/connect` fails): set `googleClientId` to the same **Web** client ID so the app can build the authorize URL locally (mirrors Facebook/TikTok pattern).

## 7. User flow in the app

1. Sign in, open **Edit Profile** (Promotion screen).
2. **Verify YouTube** → complete Google sign-in; allow channel access.
3. When **creating a post**, enable the **youtube** platform and attach a **video** (thumbnail + video). Image-only posts cannot be uploaded to YouTube via this flow.
4. If the post is **scheduled**, the worker uploads the public video URL to the selected channel when `publishAt` is due.

## 8. Troubleshooting

- **redirect_uri_mismatch**: The URI in Google Cloud must match `APP_URL` + `/social-auth/youtube/callback` character-for-character (http vs https, port, `/v1`).
- **No refresh token**: First connection uses `prompt=consent` and `access_type=offline`. If you already granted access, revoke the app in [Google Account permissions](https://myaccount.google.com/permissions) and connect again.
- **Upload fails / quota**: Check [YouTube API quotas](https://developers.google.com/youtube/v3/getting-started#quota) and API errors in server logs.
- **Video URL not public**: The cron job downloads the file from your CDN/R2 URL; the URL must be reachable from the server (no auth-only URLs).
