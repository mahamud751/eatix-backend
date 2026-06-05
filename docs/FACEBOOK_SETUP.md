# Facebook Login & Verify setup (Meta Developer Console)

If users see:

> **Feature unavailable: Facebook Login is currently unavailable for this app as we are updating additional details for this app.**

that is a **Meta app configuration** issue — not an Eatix code bug. Fix it in [developers.facebook.com](https://developers.facebook.com/).

App ID in this project: **`1714809253015158`**

## 1. Open the app & clear alerts

1. [Meta for Developers](https://developers.facebook.com/) → **My Apps** → **eatix-update** (or your Eatix app)
2. Check the top **Alerts** / **Required actions** banner — complete every item (privacy policy, data use, business verification, etc.)

## 2. App settings (basic details)

**App settings → Basic**

| Field | Required |
|-------|----------|
| App display name | Eatix |
| App domains | `pino7.com`, `eatixapi.pino7.com` |
| Privacy Policy URL | Public https URL (required for Live mode) |
| Terms of Service URL | Recommended |
| User data deletion | Callback or instructions URL |
| Category | e.g. Food & drink |
| App icon | Uploaded |

Save changes.

## 3. Facebook Login product

**Use cases** or **Products** → **Facebook Login** (or **Facebook Login for Business**)

### Settings → Valid OAuth Redirect URIs

Add **exactly**:

```
https://eatixapi.pino7.com/v1/social-auth/facebook/callback
```

### Settings toggles (must be ON)

- **Client OAuth Login** — Yes
- **Web OAuth Login** — Yes
- **Embedded browser OAuth Login** — Yes (mobile in-app browser)

Save.

## 4. Android platform (native login in APK)

**App settings → Basic → Add platform → Android**

| Field | Value |
|-------|--------|
| Package name | `com.eatix.app` |
| Class name | `com.eatix.app.MainActivity` |
| Key hashes | Debug + release SHA-1 from your keystore |

Get key hash from device log / `keytool` and paste into Meta.

## 5. Test users (Development mode)

While **App mode** = **Development**, only **Roles → Test users** (and admins/developers) can log in.

Add each tester Facebook account under **App roles → Test users**.

## 6. Go Live (all real users)

1. Complete all **Required actions** and **App Review** for permissions you request:
   - `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `business_management`
   - Instagram scopes only if you use **Verify Instagram** (`instagram=1` flow)
2. Toggle **App mode** to **Live** (top of dashboard)

## 7. Backend env (eatixapi server)

| Variable | Example |
|----------|---------|
| `FACEBOOK_APP_ID` | `1714809253015158` |
| `FACEBOOK_APP_SECRET` | from Meta → Basic → App secret |
| `APP_URL` | `https://eatixapi.pino7.com/v1` |
| `FACEBOOK_ENABLE_INSTAGRAM_LOGIN` | `true` — Instagram scopes only when connect URL uses `?instagram=1` |

Restart API after changes.

## 8. App config (`Ethics-app/config.js`)

| Field | Purpose |
|-------|---------|
| `facebookAppId` | Same as `FACEBOOK_APP_ID` |
| `facebookClientToken` | Meta → Settings → Advanced → Client token |
| `facebookLoginConfigId` | Facebook Login for Business → Configurations ID |

## 9. Troubleshooting

| Error | Fix |
|-------|-----|
| **Feature unavailable … updating additional details** | Complete Meta **Alerts / Required actions**; add Privacy Policy; finish Data Use Checkup; wait up to 24h |
| **redirect_uri mismatch** | Redirect URI must match `APP_URL` + `/social-auth/facebook/callback` exactly |
| **Invalid Scopes** | Remove scopes not approved in App Review; use Verify Facebook (core scopes) before Instagram |
| **Can't load URL** | Enable Client OAuth + Web OAuth Login in Meta |
| Login works for devs only | Add user as **Test user** or switch app to **Live** |

## 10. Scope behaviour (after backend update)

- **Verify Facebook** → core Page scopes only
- **Verify Instagram** → core + Instagram scopes (`/facebook/connect?instagram=1`)

This avoids blocking Facebook verify when Instagram permissions are not yet approved in Meta.
