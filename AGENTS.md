# Pause for Shabbat: Agent Handoff & Status

> Read this first. It records what's done, what's blocked, and what to do next.
> Last updated: 2026-09-28. **Start with Josh's checklist below**, and tick items off as they're done.

## ✅ Josh's checklist: remaining tasks
Work top to bottom and tick items off here as they're done. Each item says **who** can do it:
**Josh** means anyone with a mailbox; **Access** means someone logged into that service (Mike, or Josh after Mike adds him); **Agent** means Claude or Codex working in this repo.

- [ ] **0. Get access (Access).** Everything below marked *Access* runs through Mike's accounts. Mike either adds Josh to GitHub (collaborator), Vercel, Supabase, Azure (Entra ID), Resend, and SendGrid, or does those steps himself.
- [ ] **1. End-to-end test from jcoh.org (Josh).** Follow the *End-to-end test* section below using Josh's JCOH Microsoft 365 account. Write down exactly what happens at each step.
  - Progress so far: on 2026-09-28 Mike reached the Microsoft consent screen with a personal account (`pauseforshabbat@outlook.com`), so the inbound email and OAuth link work. *Result after "Accept": not yet recorded.*
  - If Josh sees **"Need admin approval"**, JCOH's Microsoft 365 organization only lets users approve apps from verified publishers. Fix now: JCOH's IT admin approves Pause for Shabbat once for the whole organization in the **Microsoft Entra admin center → Enterprise applications** (or Admin consent requests). Long-term fix: item 3.
- [ ] **2. Add links and logo to the Microsoft consent screen (Access, ~2 min).** Azure portal → Entra ID → App registrations → *Pause for Shabbat* → **Branding & properties**:
  - Home page: `https://pauseforshabbat.com`
  - Terms of service: `https://pauseforshabbat.com/terms`
  - Privacy statement: `https://pauseforshabbat.com/privacy`
  - Logo: upload `assets/mark-256.png`
  - This removes the "publisher has not provided links to their terms" line from the consent screen.
- [ ] **3. 📌 NOTE: Publisher verification, which removes the "unverified" badge (Access, takes days).** Personal outlook.com users can approve the app today. Many **work/school Microsoft 365 organizations only allow verified publishers**, so this matters for congregations and workplaces. Steps:
  1. Join the free **Microsoft AI Cloud Partner Program** (Partner Center). It requires business verification of a legal entity, which usually takes a few days.
  2. Use an email address on a domain that is either the app's publisher domain (`pauseforshabbat.com`) or a DNS-verified custom domain in the Azure directory that owns the app.
     ⚠️ **Catch:** all mail to `@pauseforshabbat.com` goes to the signup webhook, so Microsoft's verification email would never arrive there. Realistic options: verify as **Yellow Satin Jacket** (add `yellowsatinjacket.com` as a verified domain in the Entra tenant), or set up a real mailbox or forward on pauseforshabbat.com first (for example, route one address to a person instead of SendGrid).
  3. Azure → App registrations → Pause for Shabbat → Branding & properties → **Publisher verification**. Enter the Partner (MPN) ID and verify.
  - Decide who the publisher is (Yellow Satin Jacket or JCOH) before starting. Using JCOH would need JCOH's own partner account linked to the tenant where the app lives.
- [ ] **4. Confirm the Resend domain is verified (Access).** In the Resend dashboard under Domains, `pauseforshabbat.com` should say **Verified**. If the onboarding email in item 1 arrived, it is.
- [ ] **5. Keep Supabase from pausing (decision, then Access or Agent).** The free tier pauses after about a week without traffic, which already happened once, and every signup fails while it's paused. Pick one:
  - Upgrade the Supabase project to Pro (Access), **or**
  - Agent change: set `vercel.json` cron to daily (`0 23 * * *`), have `/api/cron` run a cheap `select` every day but schedule only when `new Date().getUTCDay() === 4`, then push.
- [ ] **6. Optional: contact address (Access).** Set a `CONTACT_EMAIL` env var in Vercel and redeploy to add a Contact link to the site and legal pages. Mail to any address on the domain other than set@ and stop@ is currently dropped.
- [ ] **7. Gmail support (Agent + Access, not started).** Do this only after item 1 passes. Plan:
   - Create a Google Cloud OAuth client. Scope `https://www.googleapis.com/auth/gmail.settings.basic`, a sensitive scope that requires Google's OAuth app verification before public use.
   - Call `PUT gmail/v1/users/me/settings/vacation` with `enableAutoReply: true`, `startTime`/`endTime` (epoch ms), `responseSubject`, `responseBodyPlainText`.
   - Add a `provider` column (`'microsoft' | 'google'`) to `users`, plus `/start/google` and `/auth/google/callback`. Branch `scheduleShabbatForUser` and token refresh by provider.
   - The inbound flow could check the sender's MX records (Google vs `*.mail.protection.outlook.com`) to decide which link to send, or send both.
   - Update the landing and privacy copy, which currently say Outlook-only.
- [ ] **8. Optional: more time zones (Agent).** `getTimezoneConfig` in `index.js` covers about 19 Windows time zones, and unknown zones fall back to NYC sunset. Add any zones real users report.

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
- Vercel env set on 2026-09-28: `SUPABASE_KEY` is the **service_role** key (it must stay that way, because RLS blocks the anon key), and `RESEND_FROM_EMAIL` is `Pause for Shabbat <set@pauseforshabbat.com>`. The Azure client secret was checked and has not expired.
- Inbound email and the OAuth link work in production: a test with a personal outlook.com account reached the Microsoft consent screen on 2026-09-28.

## End-to-end test (Outlook)
1. From an Outlook/M365 mailbox, email `set@pauseforshabbat.com`. The onboarding letter should arrive within seconds.
   - If it doesn't, check SendGrid → Activity / Inbound Parse, the Vercel function logs for `POST /webhook/inbound`, and Resend → Logs.
2. Click the link, sign in, and approve. You should land on the **"You're all set."** page showing start and end times.
   - A 500 with "Something went wrong" usually means the database is paused or the wrong Supabase key is set. Check the Vercel logs for `DB error`.
   - The "organization needs to approve this" page means the tenant requires admin consent.
3. Outlook → Settings → Mail → Automatic replies should show **scheduled** with that window.
4. Supabase → Table Editor → `users` should have one row.
5. Email `stop@pauseforshabbat.com`. You should get an "is off" email, the row should be deleted, and automatic replies should be disabled.

## Run locally
```bash
npm install
node index.js   # http://localhost:3000 (needs a filled-in .env)
```
The local redirect URI `http://localhost:3000/auth/callback` is already registered in Azure. There are no tests. Check changes by loading the pages and running the E2E test above.
