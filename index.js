require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SUPABASE_URL, SUPABASE_KEY, RESEND_API_KEY, APP_URL } = process.env;
const TENANT = 'common';
const SCOPES = 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/MailboxSettings.ReadWrite offline_access';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const resend = new Resend(RESEND_API_KEY);

// --- Step 1: Start OAuth flow ---
app.get('/start', (req, res) => {
  const authUrl =
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&response_mode=query`;

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

    const { error: dbError } = await supabase.from('users').upsert(
      { email, timezone, access_token, refresh_token, active: true },
      { onConflict: 'email' }
    );
    if (dbError) throw new Error(`DB error: ${dbError.message}`);
    console.log(`Saved to DB: ${email} | Timezone: ${timezone}`);

    res.send(`
      <h2>Shabbat Mode Authorized</h2>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Timezone:</strong> ${timezone}</p>
      <br>
      <a href="/trigger?email=${encodeURIComponent(email)}">
        <button>Test: Schedule Shabbat autoresponder now</button>
      </a>
    `);
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('FULL ERROR:', JSON.stringify(detail, null, 2));
    console.error('STATUS:', err.response?.status);
    res.status(500).send(`Error: ${JSON.stringify(detail)}`);
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

// --- POST /webhook/inbound: receives inbound email from SendGrid ---
app.post('/webhook/inbound', async (req, res) => {
  // SendGrid sends multipart form — 'from' field contains sender address
  const raw = req.body.from || req.body.sender || '';
  // Strip display name if present: "Josh Franklin <josh@jcoh.org>" → josh@jcoh.org
  const match = raw.match(/<(.+?)>/) || [null, raw];
  const senderEmail = match[1].trim();

  console.log(`Inbound setup request from: ${senderEmail}`);

  const oauthUrl =
    `${APP_URL}/start?hint=${encodeURIComponent(senderEmail)}`;

  await resend.emails.send({
    from: 'Pause for Shabbat <onboarding@resend.dev>',
    to: senderEmail,
    subject: 'One click to enable Shabbat Mode',
    text: `Hi,\n\nThanks for reaching out.\n\nClick the link below to connect your Outlook account and enable automatic Shabbat replies:\n\n${oauthUrl}\n\nOnce you authorize, Pause for Shabbat will automatically enable your out-of-office every Friday at sunset and disable it Saturday night — every week, forever.\n\nShabbat Shalom,\nPause for Shabbat`,
  });

  console.log(`OAuth link sent to ${senderEmail}`);
  res.sendStatus(200); // SendGrid expects a 200 or it will retry
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getNextShabbatWindow(timezone) {
  const coords = getCoordsForTimezone(timezone);

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

async function setAutoResponder(accessToken, startISO, endISO, name) {
  const message = `Hi,

I observe Shabbat from Friday evening through Saturday evening.

During this time I step away from email and digital communication.

If this is important, please resend your message on Sunday and I'll respond then.

Wishing you a peaceful weekend.

— ${name}`;

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

// Windows timezone names (what Microsoft Graph returns) → lat/lng
function getCoordsForTimezone(timezone) {
  const map = {
    'Eastern Standard Time':  { lat: 40.7128, lng: -74.0060 },  // NYC
    'Central Standard Time':  { lat: 41.8781, lng: -87.6298 },  // Chicago
    'Mountain Standard Time': { lat: 39.7392, lng: -104.9903 }, // Denver
    'Pacific Standard Time':  { lat: 34.0522, lng: -118.2437 }, // LA
    'GMT Standard Time':      { lat: 51.5074, lng: -0.1278 },   // London
    'Israel Standard Time':   { lat: 31.7683, lng: 35.2137 },   // Jerusalem
  };
  return map[timezone] || { lat: 40.7128, lng: -74.0060 }; // default NYC
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
