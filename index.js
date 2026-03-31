require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const multer = require('multer');

const app = express();
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true }));

const {
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  SUPABASE_URL,
  SUPABASE_KEY,
  RESEND_API_KEY,
  RESEND_WEBHOOK_SECRET,
  APP_URL,
  RESEND_FROM_EMAIL,
} = process.env;
const TENANT = 'common';
const SCOPES = 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/MailboxSettings.ReadWrite offline_access';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const resend = new Resend(RESEND_API_KEY);
const DEFAULT_REPLY_INTRO = `Hi,

I observe Shabbat from Friday evening through Saturday evening.

During this time I step away from email and digital communication.

If this is important, please resend your message on Sunday and I'll respond then.

Wishing you a peaceful weekend.`;

function getErrorMessage(err) {
  const detail = err.response?.data || err.message || String(err);
  if (typeof detail === 'string') return detail;
  return JSON.stringify(detail);
}

function formatDbError(err) {
  const message = getErrorMessage(err);
  if (message.includes('getaddrinfo ENOTFOUND') || message.includes('fetch failed')) {
    const host = SUPABASE_URL ? new URL(SUPABASE_URL).host : 'missing-supabase-url';
    return `Supabase connection failed. Check SUPABASE_URL/SUPABASE_KEY in Vercel and confirm the project host resolves: ${host}`;
  }
  return message;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getTimezoneConfig(timezone) {
  const map = {
    'Eastern Standard Time': { lat: 40.7128, lng: -74.0060, iana: 'America/New_York' },
    'Central Standard Time': { lat: 41.8781, lng: -87.6298, iana: 'America/Chicago' },
    'Mountain Standard Time': { lat: 39.7392, lng: -104.9903, iana: 'America/Denver' },
    'Pacific Standard Time': { lat: 34.0522, lng: -118.2437, iana: 'America/Los_Angeles' },
    'GMT Standard Time': { lat: 51.5074, lng: -0.1278, iana: 'Europe/London' },
    'Israel Standard Time': { lat: 31.7683, lng: 35.2137, iana: 'Asia/Jerusalem' },
  };
  return map[timezone] || { lat: 40.7128, lng: -74.0060, iana: 'America/New_York' };
}

function formatDateTime(dateISO, timezone) {
  const { iana } = getTimezoneConfig(timezone);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: iana,
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateISO));
}

function buildDefaultReplyMessage(name) {
  return `${DEFAULT_REPLY_INTRO}

-- ${name}`;
}

function renderConfirmationPage({ email, timezone, start, end, message }) {
  const subject = encodeURIComponent(`Update my Pause for Shabbat message for ${email}`);
  const body = encodeURIComponent(`Hi,

I want to update my Pause for Shabbat automatic reply message for ${email}.

Here is the message I want to use:

${message}
`);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pause for Shabbat</title>
    <style>
      :root {
        --paper: #f6f1e8;
        --ink: #22201c;
        --muted: #756d63;
        --line: rgba(34, 32, 28, 0.12);
        --card: rgba(255, 255, 255, 0.82);
        --accent: #b7652b;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 0.85), transparent 36%),
          linear-gradient(180deg, #fbf7f1 0%, var(--paper) 100%);
        color: var(--ink);
        font-family: Georgia, "Times New Roman", serif;
      }

      .shell {
        width: min(100%, 760px);
      }

      .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 28px;
        box-shadow: 0 20px 60px rgba(70, 58, 44, 0.08);
        padding: 28px;
        text-align: center;
        backdrop-filter: blur(10px);
      }

      .eyebrow,
      .label,
      .timezone,
      .fineprint,
      .button {
        font-family: "Courier New", Courier, monospace;
      }

      .eyebrow {
        color: var(--muted);
        font-size: 0.95rem;
        letter-spacing: 0.08em;
        margin-bottom: 14px;
      }

      .icon-box {
        width: 88px;
        height: 88px;
        margin: 0 auto 18px;
        display: grid;
        place-items: center;
        border-radius: 24px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.95);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
      }

      .icon-box img {
        width: 56px;
        height: 56px;
        object-fit: contain;
      }

      h1 {
        margin: 0;
        font-size: clamp(2.4rem, 7vw, 4.2rem);
        line-height: 0.94;
      }

      .lede {
        margin: 16px auto 0;
        max-width: 35rem;
        color: var(--muted);
        font-size: 1.05rem;
        line-height: 1.6;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 28px;
      }

      .panel,
      .message {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid var(--line);
        border-radius: 24px;
      }

      .panel {
        padding: 18px 20px;
      }

      .label {
        color: var(--accent);
        font-size: 0.82rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .value {
        margin-top: 10px;
        font-size: clamp(1.2rem, 3vw, 1.6rem);
        line-height: 1.25;
      }

      .timezone {
        margin-top: 22px;
        color: var(--muted);
        font-size: 0.95rem;
      }

      .message {
        margin-top: 16px;
        padding: 22px;
        text-align: left;
      }

      .message-text {
        margin: 14px 0 0;
        white-space: pre-wrap;
        font-size: 1.08rem;
        line-height: 1.7;
      }

      .actions {
        margin-top: 22px;
        display: flex;
        justify-content: center;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 13px 22px;
        border-radius: 999px;
        border: 1px solid rgba(34, 32, 28, 0.2);
        color: var(--ink);
        text-decoration: none;
        background: rgba(255, 255, 255, 0.92);
        font-size: 0.98rem;
      }

      .fineprint {
        margin-top: 14px;
        color: var(--muted);
        font-size: 0.84rem;
      }

      @media (max-width: 640px) {
        body { padding: 16px; }
        .card { padding: 22px 18px; border-radius: 24px; }
        .grid { grid-template-columns: 1fr; }
        .message { padding: 18px; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="card">
        <div class="icon-box">
          <img src="/brand/icon.png" alt="Pause for Shabbat logo" />
        </div>
        <div class="eyebrow">PAUSE FOR SHABBAT</div>
        <h1>Shabbat Mode is Active</h1>
        <p class="lede">Automatic replies are scheduled for your next Shabbat window. We&apos;ll handle the timing quietly in the background.</p>

        <div class="grid">
          <div class="panel">
            <div class="label">Start</div>
            <div class="value">${escapeHtml(formatDateTime(start, timezone))}</div>
          </div>
          <div class="panel">
            <div class="label">End</div>
            <div class="value">${escapeHtml(formatDateTime(end, timezone))}</div>
          </div>
        </div>

        <div class="timezone">${escapeHtml(email)} · ${escapeHtml(timezone)}</div>

        <section class="message">
          <div class="label">Default Message</div>
          <p class="message-text">${escapeHtml(message)}</p>
        </section>

        <div class="actions">
          <a class="button" href="mailto:set@pauseforshabbat.com?subject=${subject}&body=${body}">Change Message</a>
        </div>

        <div class="fineprint">Want a more personal note? Tap the button and send us the wording you want to use. You can always update your auto-responder in your Outlook email settings.</div>
      </section>
    </main>
  </body>
</html>`;
}

// --- Microsoft publisher domain verification ---
app.get('/.well-known/microsoft-identity-association.json', (req, res) => {
  res.json({
    associatedApplications: [
      { applicationId: '7fff6806-12e8-480d-9e7c-8543aae77642' },
    ],
  });
});

app.get('/brand/icon.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets', '#pause_for_shabbat.png'));
});

// --- Step 1: Start OAuth flow ---
app.get('/start', (req, res) => {
  const hint = req.query.hint ? `&login_hint=${encodeURIComponent(req.query.hint)}` : '';
  const authUrl =
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&response_mode=query` +
    hint;

  res.redirect(authUrl);
});

// --- Step 2: OAuth callback ---
app.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) return res.send(`OAuth error: ${error}`);

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post(
      `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token } = tokenRes.data;
    console.log('Token exchange OK');

    // Get user email
    const meRes = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    console.log('Got /me:', meRes.data.mail || meRes.data.userPrincipalName);

    // Get timezone from mailbox settings
    const mailboxRes = await axios.get('https://graph.microsoft.com/v1.0/me/mailboxSettings', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    console.log('Got mailboxSettings:', JSON.stringify(mailboxRes.data, null, 2));

    const email = meRes.data.mail || meRes.data.userPrincipalName;
    const timezone = mailboxRes.data.timeZone;

    const userRecord = { email, timezone, access_token, refresh_token, active: true };
    const { error: dbError } = await supabase.from('users').upsert(
      userRecord,
      { onConflict: 'email' }
    );
    if (dbError) throw new Error(`DB error: ${formatDbError(dbError)}`);
    console.log(`Saved to DB: ${email} | Timezone: ${timezone}`);

    const { start, end } = await getNextShabbatWindow(timezone);
    const message = buildDefaultReplyMessage(email);
    await setAutoResponder(access_token, start, end, email, message);
    console.log(`Initial Shabbat window scheduled for ${email}: ${start} → ${end}`);

    res.send(renderConfirmationPage({ email, timezone, start, end, message }));
  } catch (err) {
    const detail = formatDbError(err);
    console.error('FULL ERROR:', JSON.stringify(detail, null, 2));
    console.error('STATUS:', err.response?.status);
    res.status(500).send(`Error: ${detail}`);
  }
});

// --- Step 3: Manually trigger scheduling ---
app.get('/trigger', async (req, res) => {
  const { email } = req.query;
  const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();

  if (error || !user) return res.status(404).send('User not found — complete OAuth at /start first.');

  try {
    await scheduleShabbatForUser(user);
    const { start, end } = await getNextShabbatWindow(user.timezone);
    res.send(`
      <h2>Shabbat Mode Scheduled</h2>
      <p><strong>Starts:</strong> ${new Date(start).toLocaleString()}</p>
      <p><strong>Ends:</strong> ${new Date(end).toLocaleString()}</p>
      <p><strong>Timezone:</strong> ${user.timezone}</p>
      <p>Check your Outlook automatic replies settings to confirm.</p>
    `);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send(`Error: ${JSON.stringify(err.response?.data || err.message)}`);
  }
});

// --- POST /webhook/inbound: receives inbound email from SendGrid Inbound Parse ---
app.post('/webhook/inbound', multer().none(), async (req, res) => {
  try {
    const rawSender = req.body.from || '';
    const match = rawSender.match(/<(.+?)>/) || [null, rawSender];
    const senderEmail = (match[1] || rawSender).trim();

    if (!senderEmail) {
      console.error('Inbound webhook missing sender email');
      return res.status(400).send('Missing sender email');
    }

    console.log(`Inbound setup request from: ${senderEmail}`);

    const oauthUrl = `${APP_URL}/start?hint=${encodeURIComponent(senderEmail)}`;

    await resend.emails.send({
      from: RESEND_FROM_EMAIL || 'Pause for Shabbat <onboarding@resend.dev>',
      to: senderEmail,
      subject: "Why we built 'Pause for Shabbat'",
      text: `You know how in driver's ed they teach you that when you come to a stop sign you're supposed to stop completely, then roll up, stop again, look both ways, and then go?

But most of us don't actually do that.

Most of us do what's called the rolling stop. You slow down almost all the way, and then you keep going.

In Genesis 2 from the Torah, they first mention Shabbat:

"Vaishbot bayom hashvi'i."

Vaishbot means to stop. To cease. Not the rolling stop.

To cease from doing all the melacha, all the work you do during your normal work week, all the things that cause you stress and anxiety and keep you moving in turbocharged mode.

To come to a complete stop.

That's why we created Pause for Shabbat.

Activate it here, and take some time to pause this weekend.

${oauthUrl}

Clicking the link will take you to Microsoft to authorize Pause for Shabbat to update your Outlook out-of-office settings. That's the only permission we request — we never read your email or contacts.

Best,
Rabbi Josh Franklin`,
    });

    console.log(`OAuth link sent to ${senderEmail}`);
    return res.sendStatus(200);
  } catch (err) {
    console.error('Inbound webhook error:', err.message);
    return res.status(400).send('Invalid webhook');
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getNextShabbatWindow(timezone) {
  const coords = getTimezoneConfig(timezone);

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun ... 5=Fri ... 6=Sat
  const daysUntilFriday = ((5 - dayOfWeek + 7) % 7) || 7;

  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);

  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);

  const fridayDate = friday.toISOString().split('T')[0];
  const saturdayDate = saturday.toISOString().split('T')[0];

  const [fridaySunset, saturdaySunset] = await Promise.all([
    getSunsetUTC(coords.lat, coords.lng, fridayDate),
    getSunsetUTC(coords.lat, coords.lng, saturdayDate),
  ]);

  // Halachic nightfall = ~42 min after Saturday sunset
  const nightfall = new Date(new Date(saturdaySunset).getTime() + 42 * 60 * 1000);

  return { start: fridaySunset, end: nightfall.toISOString() };
}

async function getSunsetUTC(lat, lng, date) {
  const res = await axios.get('https://api.sunrise-sunset.org/json', {
    params: { lat, lng, date, formatted: 0 },
  });
  return res.data.results.sunset; // already in UTC ISO format
}

async function setAutoResponder(accessToken, startISO, endISO, name, message = buildDefaultReplyMessage(name)) {
  await axios.patch(
    'https://graph.microsoft.com/v1.0/me/mailboxSettings',
    {
      automaticRepliesSetting: {
        status: 'scheduled',
        scheduledStartDateTime: {
          dateTime: new Date(startISO).toISOString().replace('Z', ''),
          timeZone: 'UTC',
        },
        scheduledEndDateTime: {
          dateTime: new Date(endISO).toISOString().replace('Z', ''),
          timeZone: 'UTC',
        },
        externalReplyMessage: message,
        internalReplyMessage: message,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

async function refreshAccessToken(user) {
  const tokenRes = await axios.post(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: user.refresh_token,
      grant_type: 'refresh_token',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token, refresh_token } = tokenRes.data;

  // Persist updated tokens
  const update = { access_token };
  if (refresh_token) update.refresh_token = refresh_token;
  await supabase.from('users').update(update).eq('email', user.email);

  console.log(`Token refreshed for ${user.email}`);
  return access_token;
}

// ---------------------------------------------------------------------------
// Schedule Shabbat for a single user (refresh token → calc window → set reply)
// ---------------------------------------------------------------------------

async function scheduleShabbatForUser(user) {
  const accessToken = await refreshAccessToken(user);
  const { start, end } = await getNextShabbatWindow(user.timezone);
  await setAutoResponder(accessToken, start, end, user.email);
  console.log(`Scheduled Shabbat for ${user.email}: ${start} → ${end}`);
}

// ---------------------------------------------------------------------------
// Cron endpoint — called by Vercel Cron every Thursday at 11pm
// Protected by a shared secret so only Vercel can trigger it
// ---------------------------------------------------------------------------

app.get('/api/cron', async (req, res) => {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).send('Unauthorized');
  }

  console.log('Cron: scheduling Shabbat for all users...');
  const { data: allUsers } = await supabase.from('users').select('*').eq('active', true);
  for (const user of (allUsers || [])) {
    try {
      await scheduleShabbatForUser(user);
    } catch (err) {
      console.error(`Failed for ${user.email}:`, err.response?.data || err.message);
    }
  }
  res.send('Done');
});

// ---------------------------------------------------------------------------

if (require.main === module) {
  app.listen(3000, () => {
    console.log('Running at http://localhost:3000');
    console.log('Start here: http://localhost:3000/start');
  });
}

module.exports = app;
