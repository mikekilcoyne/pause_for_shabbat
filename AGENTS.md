# Pause for Shabbat: Agent Handoff & Status

> Read this first. It records what's done, what's blocked, and what to do next.
> Last updated: 2026-09-28 (blockers 1–2 cleared). Update the **Status** and **Next up** sections when you make progress.

## What this is
A small Node/Express app on Vercel that schedules an **Outlook out-of-office reply every Shabbat**, from Friday sunset to Saturday nightfall (sunset + 42 min). A user emails `set@pauseforshabbat.com`, gets back a letter from Rabbi Josh Franklin with a Microsoft sign-in link, clicks once, and they're done. A Vercel cron reschedules everyone every Thursday.

- Live site: https://pauseforshabbat.com
- Repo: https://github.com/mikekilcoyne/pause_for_shabbat. **The repo is public. Never commit secrets.** `.env` and `.env.*` are gitignored.
- Original product spec: `shabbat_mode_spec.md`. The spec says "shabbatmode.com", but the product is now named Pause for Shabbat.

## Code map
| File | What's in it |
|---|---|
| `index.js` | All routes and logic: OAuth, Graph calls, sunset math, inbound email webhook, cron |
| `pages.js` | Server-rendered HTML for the landing, privacy, terms, confirmation, and error pages. The style is chunky and cartoon-y, like old-school Android: Fredoka + Nunito fonts, thick outlines, hard offset shadows. **The owner approved this look. Keep it.** |
| `schema.sql` | Supabase table definition. Already applied to production. |
| `vercel.json` | Single Node function + cron `0 23 * * 4` (Thu 23:00 UTC) → `/api/cron` |
| `assets/` | Logo (`#pause_for_shabbat.png`) plus the cropped mark, favicon, and apple-touch icon |

### Routes
| Route | Purpose |
|---|---|
| `GET /` `/privacy` `/terms` | Public pages |
| `GET /start` | Redirects to Microsoft OAuth (`?hint=email` pre-fills the login) |
| `GET /auth/callback` | Exchanges the code, upserts the user in Supabase, schedules the next Shabbat, renders the confirmation page |
| `POST /webhook/inbound` | SendGrid Inbound Parse (multipart). Routes by recipient: `set@` sends the onboarding letter and link, `stop@` cancels the scheduled reply and **deletes** the user row. Auto-replies and other addresses are ignored. |
| `GET /api/cron` | Needs `Authorization: Bearer $CRON_SECRET`, which Vercel sends automatically. Reschedules all active users and **keeps whatever reply text they've set in Outlook**. |
| `GET /trigger?email=…&key=$CRON_SECRET` | Admin: reschedule one user |
| `/.well-known/microsoft-identity-association.json` | Azure publisher domain verification |

### Stack / accounts
All accounts currently belong to Mike Kilcoyne (mk@yellowsatinjacket.com). Whoever finishes this needs access to each one or needs Mike to act.

| Service | Role | Notes |
|---|---|---|
| Vercel | Hosting, cron, env vars | Deploys automatically from `main` via GitHub |
| Supabase | Postgres (`users` table) | Project `ppabadelllrkhbhbaith`. **Free tier. It paused once already.** |
| Microsoft Entra ID (Azure AD) | OAuth app | App ID `7fff6806-12e8-480d-9e7c-8543aae77642`, multi-tenant (`common`). Scopes: `User.Read MailboxSettings.ReadWrite offline_access` |
| Resend | Outbound email | Domain DNS (DKIM, SPF on `send.`) is in place |
| SendGrid | Inbound Parse | MX `@ → mx.sendgrid.net` is in place |
| Namecheap | DNS for pauseforshabbat.com | |
| sunrise-sunset.org | Sunset times | Free, no key |

### Env vars (Vercel + local `.env`)
`CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`, `SUPABASE_URL`, `SUPABASE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL`, `CRON_SECRET`, and `CONTACT_EMAIL` (optional; when set it adds a Contact link to the footer and legal pages).

## Status

### ✅ Done
- Backend flow: OAuth → save → schedule. Weekly cron. Token refresh.
- Landing, privacy, terms, and confirmation pages. Friendly error pages, including one explaining when an org admin has to approve the app.
- `stop@` flow: cancels the scheduled reply, deletes the record, and sends a confirmation email.
- Weekly reschedule keeps the user's own Outlook reply text; it no longer overwrites it with the default.
- A Friday or Saturday signup covers the current Shabbat.
- Auto-reply loop guard on the inbound webhook.
- `/trigger` requires the secret. OAuth error output is escaped.
- DNS for SendGrid inbound and Resend outbound.
- Supabase project restored (2026-09-27). `users` table created with **RLS on and no policies**, which was verified: the anon key can't read or write.

### ⛔ Stalled / blocked (needs a human with account access)
1. ~~Vercel `SUPABASE_KEY` must be the `service_role` key~~. ✅ Done 2026-09-28 and redeployed. The key must stay service_role, because RLS blocks the anon key.
2. ~~`RESEND_FROM_EMAIL` in Vercel~~. ✅ Set to `Pause for Shabbat <set@pauseforshabbat.com>`. The Azure client secret was checked on 2026-09-28 and has not expired. *Still unchecked: whether the domain shows as "Verified" in the Resend dashboard. The local Resend key is send-only, so an agent can't check it.*
3. **No end-to-end test has ever passed in production. ← This is where things are stalled now.** It needs someone with an Outlook/M365 mailbox, most likely Josh's jcoh.org account. See the test script below. This is also where Outlook troubleshooting starts.
4. **Supabase free tier pauses after about a week of inactivity**, and a weekly cron may not be enough to keep it active. Pick one fix: upgrade to Pro, or change `vercel.json` to run the cron daily and have `/api/cron` run a cheap query every day but schedule only on Thursday. *Status: undecided.*

### 🟡 Recommended, not blocking
- Azure → App registrations → **Branding & properties**: set the Home page to `https://pauseforshabbat.com`, Terms to `/terms`, Privacy to `/privacy`, and upload `assets/mark-256.png`. Consider **publisher verification**, because unverified multi-tenant apps show an "unverified" warning and many M365 orgs block them.
- Set `CONTACT_EMAIL`. Mail to any address on the domain other than set@ and stop@ is dropped.
- Timezone → location mapping (`getTimezoneConfig` in `index.js`) covers about 19 Windows time zones. Unknown zones fall back to NYC.

## End-to-end test (Outlook)
1. From an Outlook/M365 mailbox, email `set@pauseforshabbat.com`. The onboarding letter should arrive within seconds.
   - If it doesn't, check SendGrid → Activity / Inbound Parse, the Vercel function logs for `POST /webhook/inbound`, and Resend → Logs.
2. Click the link, sign in, and approve. You should land on the **"You're all set."** page showing start and end times.
   - A 500 with "Something went wrong" usually means blocker 1 (wrong Supabase key). Check the Vercel logs for `DB error`.
   - The "organization needs to approve this" page means the tenant requires admin consent.
3. Outlook → Settings → Mail → Automatic replies should show **scheduled** with that window.
4. Supabase → Table Editor → `users` should have one row.
5. Email `stop@pauseforshabbat.com`. You should get an "is off" email, the row should be deleted, and automatic replies should be disabled.

## Next up (in order)
1. Run the E2E test above and fix whatever breaks. **(Outlook troubleshooting)**
2. Decide on the Supabase keep-awake fix (blocker 4).
3. **Gmail support (not started).** Rough plan:
   - Create a Google Cloud OAuth client. Scope `https://www.googleapis.com/auth/gmail.settings.basic`, a sensitive scope that requires Google's OAuth app verification before public use.
   - Call `PUT gmail/v1/users/me/settings/vacation` with `enableAutoReply: true`, `startTime`/`endTime` (epoch ms), `responseSubject`, `responseBodyPlainText`.
   - Add a `provider` column (`'microsoft' | 'google'`) to `users`, plus `/start/google` and `/auth/google/callback`. Branch `scheduleShabbatForUser` and token refresh by provider.
   - The inbound flow could check the sender's MX records (Google vs `*.mail.protection.outlook.com`) to decide which link to send, or send both.
   - Update the landing and privacy copy, which currently say Outlook-only.

## Run locally
```bash
npm install
node index.js   # http://localhost:3000 (needs a filled-in .env)
```
The local redirect URI `http://localhost:3000/auth/callback` is already registered in Azure. There are no tests. Check changes by loading the pages and running the E2E test above.
