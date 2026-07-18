# App Store Review Notes (Eatwaze)

Paste the **Review Notes** section into App Store Connect when submitting the new app listing.  
Run the seed against production **before** submitting so demo logins and nearby content work.

## Prerequisites

1. Create a **new** App Store Connect app (do not resubmit the locked listing).
2. Privacy Policy URL: `https://eatwaze.com/privacy`
3. Terms URL: `https://eatwaze.com/terms`
4. Support URL / website: `https://eatwaze.com`
5. Seed production data (see below).

## Seed production (demo restaurants + shorts + menus)

On a machine that can reach the production Postgres database:

```bash
cd eatix-backend
export DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/DATABASE'
npm run seed:app-review
```

Or put `DATABASE_URL` in `eatix-backend/.env` and run `npm run seed:app-review`.

The script is idempotent: re-running updates the same demo accounts and refreshes their menus, promos, and shorts.

### What gets created

| Role | Email | Password |
|------|-------|----------|
| Customer | `apple.review.customer@eatwaze.com` | `EatwazeReview2026!` |
| Restaurant (primary) | `apple.review.owner@eatwaze.com` | `EatwazeReview2026!` |
| Extra restaurants | `apple.review.soho@eatwaze.com`, `…borough…`, `…shoreditch…`, `…camden…` | same password |

All restaurants are placed in **central London** (within the app’s ~15 km nearby radius). The customer account’s location is **Trafalgar Square / WC2N 5DN**.

Promo codes for testing checkout (optional): `EATWAZE10`, `SOHONAAN`, `BOROUGH15`, `SHOREDITCH10`, `CAMDEN12`.

---

## Review Notes (copy into App Store Connect)

```
Thank you for reviewing Eatwaze.

Eatwaze is a UK food discovery app: nearby restaurants, short-form food videos, menus, and promotions.

DEMO ACCOUNTS (password for both: EatwazeReview2026!)

Customer (browse / shorts / order flow):
Email: apple.review.customer@eatwaze.com
Password: EatwazeReview2026!

Restaurant owner (channel / menu / promos):
Email: apple.review.owner@eatwaze.com
Password: EatwazeReview2026!

HOW TO REVIEW
1. Sign in with the customer account.
2. If asked for a browse area / postcode, use: WC2N 5DN (central London) or allow location near Trafalgar Square.
3. Open Shorts / Home — you should see food videos from nearby London restaurants.
4. Open a restaurant channel (e.g. Covent Garden Kitchen) — profile, menu items, and promotions load from the live API.
5. Settings → Privacy Policy / Terms / Website open https://eatwaze.com (and /privacy, /terms).
6. Help / Contact uses support@eatwaze.com.

Owner path (optional): sign out, sign in as apple.review.owner@eatwaze.com to view the restaurant channel tools.

Legal
• Privacy Policy: https://eatwaze.com/privacy
• Terms of Use: https://eatwaze.com/terms
• Website: https://eatwaze.com

No payment is required to explore core discovery content. Promo codes on demo restaurants are for optional order testing only.
```

---

## App Privacy (nutrition labels) — checklist

In App Store Connect → App Privacy, declare only what the app actually collects (align with `https://eatwaze.com/privacy`):

- Contact info (email, name) — Account
- Location (precise / coarse) — for nearby restaurants (user-provided or device)
- User content (photos, videos, posts) — if users upload
- Identifiers / usage data — analytics / crash if used
- Purchases — only if IAP or order payments are live for this binary

Link Privacy Policy URL to `https://eatwaze.com/privacy` on the new listing.
