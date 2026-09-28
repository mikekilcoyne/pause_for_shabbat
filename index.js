require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const multer = require('multer');
const {
  SET_ADDRESS,
  STOP_ADDRESS,
  renderLandingPage,
  renderPrivacyPage,
  renderTermsPage,
  renderConfirmationPage,
  renderStatusPage,
} = require('./pages');

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
  CONTACT_EMAIL,
  CRON_SECRET,
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

function getTimezoneConfig(timezone) {
  const map = {
    'Eastern Standard Time': { lat: 40.7128, lng: -74.0060, iana: 'America/New_York' },
    'Central Standard Time': { lat: 41.8781, lng: -87.6298, iana: 'America/Chicago' },
    'Mountain Standard Time': { lat: 39.7392, lng: -104.9903, iana: 'America/Denver' },
    'Pacific Standard Time': { lat: 34.0522, lng: -118.2437, iana: 'America/Los_Angeles' },
    'US Mountain Standard Time': { lat: 33.4484, lng: -112.0740, iana: 'America/Phoenix' },
    'Alaskan Standard Time': { lat: 61.2181, lng: -149.9003, iana: 'America/Anchorage' },
    'Hawaiian Standard Time': { lat: 21.3069, lng: -157.8583, iana: 'Pacific/Honolulu' },
    'Atlantic Standard Time': { lat: 44.6488, lng: -63.5752, iana: 'America/Halifax' },
    'GMT Standard Time': { lat: 51.5074, lng: -0.1278, iana: 'Europe/London' },
    'W. Europe Standard Time': { lat: 52.5200, lng: 13.4050, iana: 'Europe/Berlin' },
    'Romance Standard Time': { lat: 48.8566, lng: 2.3522, iana: 'Europe/Paris' },
    'Israel Standard Time': { lat: 31.7683, lng: 35.2137, iana: 'Asia/Jerusalem' },
    'South Africa Standard Time': { lat: -26.2041, lng: 28.0473, iana: 'Africa/Johannesburg' },
    'AUS Eastern Standard Time': { lat: -33.8688, lng: 151.2093, iana: 'Australia/Sydney' },
    'E. South America Standard Time': { lat: -23.5505, lng: -46.6333, iana: 'America/Sao_Paulo' },
    'Argentina Standard Time': { lat: -34.6037, lng: -58.3816, iana: 'America/Argentina/Buenos_Aires' },
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

// --- Microsoft publisher domain verification ---
app.get('/.well-known/microsoft-identity-association.json', (req, res) => {
  res.json({
    associatedApplications: [
      { applicationId: '7fff6806-12e8-480d-9e7c-8543aae77642' },
    ],
  });
});

// --- Brand assets ---
const sendAsset = (file) => (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'assets', file));
};
app.get('/brand/icon.png', sendAsset('#pause_for_shabbat.png'));
app.get('/brand/mark.png', sendAsset('mark-256.png'));
app.get(['/favicon.png', '/favicon.ico'], sendAsset('favicon-64.png'));
app.get('/apple-touch-icon.png', sendAsset('apple-touch-icon.png'));

// --- Public pages ---
app.get('/', (req, res) => res.send(renderLandingPage({ contactEmail: CONTACT_EMAIL })));
app.get('/privacy', (req, res) => res.send(renderPrivacyPage({ contactEmail: CONTACT_EMAIL })));
app.get('/terms', (req, res) => res.send(renderTermsPage({ contactEmail: CONTACT_EMAIL })));

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

  if (error) {
    console.error('OAuth error:', error, req.query.error_description);
    const needsAdmin = /consent|admin/i.test(`${error} ${req.query.error_description || ''}`);
    return res.status(400).send(renderStatusPage({
      title: needsAdmin ? 'Your organization needs to approve this' : 'Setup was cancelled',
      message: needsAdmin
        ? 'Your Microsoft 365 organization requires an administrator to approve new apps. Ask your IT team to approve Pause for Shabbat, then try again.'
        : 'We didn\'t get permission from Microsoft, so nothing was changed. You can try again whenever you like.',
      primary: { href: '/start', label: 'Try again' },
    }));
  }
  if (!code) return res.redirect('/');

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
    const displayName = meRes.data.displayName || email;
    const timezone = mailboxRes.data.timeZone;

    const userRecord = { email, timezone, access_token, refresh_token, active: true };
    const { error: dbError } = await supabase.from('users').upsert(
      userRecord,
      { onConflict: 'email' }
    );
    if (dbError) throw new Error(`DB error: ${formatDbError(dbError)}`);
    console.log(`Saved to DB: ${email} | Timezone: ${timezone}`);

    const { start, end } = await getNextShabbatWindow(timezone);
    const message = buildDefaultReplyMessage(displayName);
    await setAutoResponder(access_token, start, end, email, message);
    console.log(`Initial Shabbat window scheduled for ${email}: ${start} → ${end}`);

    res.send(renderConfirmationPage({
      email, timezone, start, end, message,
      formatTime: (iso) => formatDateTime(iso, timezone),
    }));
  } catch (err) {
    const detail = formatDbError(err);
    console.error('FULL ERROR:', JSON.stringify(detail, null, 2));
    console.error('STATUS:', err.response?.status);
    res.status(500).send(renderStatusPage({
      title: 'Something went wrong',
      message: 'We couldn\'t finish setting up your Shabbat reply. Please try again in a minute.',
      primary: { href: '/start', label: 'Try again' },
    }));
  }
});

// --- Step 3: Manually trigger scheduling (admin only: /trigger?email=...&key=CRON_SECRET) ---
app.get('/trigger', async (req, res) => {
  if (!CRON_SECRET || req.query.key !== CRON_SECRET) return res.status(401).send('Unauthorized');
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
function isAutoGenerated({ subject = '', headers = '' }) {
  if (/^auto-submitted:\s*(?!no\b)/im.test(headers)) return true;
  if (/^(x-autoreply|x-autorespond|x-auto-response-suppress):/im.test(headers)) return true;
  if (/^precedence:\s*(bulk|junk|auto_reply)/im.test(headers)) return true;
  return /^(automatic reply|auto(matic)?[- ]?reply|auto:|out of office)/i.test(subject.trim());
}

app.post('/webhook/inbound', multer().none(), async (req, res) => {
  try {
    const rawSender = req.body.from || '';
    const match = rawSender.match(/<(.+?)>/) || [null, rawSender];
    const senderEmail = (match[1] || rawSender).trim();

    if (!senderEmail) {
      console.error('Inbound webhook missing sender email');
      return res.status(400).send('Missing sender email');
    }

    // Don't answer out-of-office replies (including our own users' Shabbat replies).
    if (isAutoGenerated(req.body)) {
      console.log(`Ignoring auto-generated inbound from: ${senderEmail}`);
      return res.sendStatus(200);
    }

    const recipients = `${req.body.to || ''} ${req.body.envelope || ''}`.toLowerCase();
    if (recipients.includes(STOP_ADDRESS)) {
      await handleStopRequest(senderEmail);
      return res.sendStatus(200);
    }
    if (!recipients.includes(SET_ADDRESS)) {
      console.log(`Ignoring inbound to unrouted address from ${senderEmail}: ${req.body.to}`);
      return res.sendStatus(200);
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

// --- Stop: cancel the upcoming reply and delete the user's record ---
async function handleStopRequest(senderEmail) {
  console.log(`Stop request from: ${senderEmail}`);
  const { data: user } = await supabase.from('users').select('*').ilike('email', senderEmail.replace(/[\\%_]/g, '\\$&')).maybeSingle();

  if (user) {
    try {
      const accessToken = await refreshAccessToken(user);
      await cancelScheduledAutoResponder(accessToken);
    } catch (err) {
      // Token may already be revoked; deleting the record is what matters.
      console.error(`Could not cancel reply for ${user.email}:`, getErrorMessage(err));
    }
    const { error } = await supabase.from('users').delete().eq('email', user.email);
    if (error) throw new Error(`DB error: ${formatDbError(error)}`);
    console.log(`Deleted user: ${user.email}`);
  }

  await resend.emails.send({
    from: RESEND_FROM_EMAIL || 'Pause for Shabbat <onboarding@resend.dev>',
    to: senderEmail,
    subject: 'Pause for Shabbat is off',
    text: user
      ? `Pause for Shabbat is now off for ${user.email}. We've cancelled your upcoming Shabbat automatic reply and deleted your information.

If you'd like to come back, just email ${SET_ADDRESS}.

Shabbat shalom.`
      : `We couldn't find a Pause for Shabbat account for ${senderEmail}, so there was nothing to turn off.

If you connected a different address, send this email from that address instead.`,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getShabbatWindowForFriday(friday, coords) {
  const saturday = new Date(friday);
  saturday.setUTCDate(friday.getUTCDate() + 1);

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

// The current Shabbat if it hasn't ended yet (so a Friday or Saturday signup
// takes effect right away), otherwise the coming one.
async function getNextShabbatWindow(timezone) {
  const coords = getTimezoneConfig(timezone);

  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun ... 5=Fri ... 6=Sat
  const daysUntilFriday = dayOfWeek === 6 ? -1 : (5 - dayOfWeek + 7) % 7;

  const friday = new Date(now);
  friday.setUTCDate(now.getUTCDate() + daysUntilFriday);

  const window = await getShabbatWindowForFriday(friday, coords);
  if (new Date(window.end) > now) return window;

  friday.setUTCDate(friday.getUTCDate() + 7);
  return getShabbatWindowForFriday(friday, coords);
}

async function getSunsetUTC(lat, lng, date) {
  const res = await axios.get('https://api.sunrise-sunset.org/json', {
    params: { lat, lng, date, formatted: 0 },
  });
  return res.data.results.sunset; // already in UTC ISO format
}

async function getAutoReplySettings(accessToken) {
  const res = await axios.get('https://graph.microsoft.com/v1.0/me/mailboxSettings/automaticRepliesSetting', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data;
}

async function cancelScheduledAutoResponder(accessToken) {
  const current = await getAutoReplySettings(accessToken);
  // Only touch a scheduled reply; leave a manually enabled out-of-office alone.
  if (current.status !== 'scheduled') return;
  await axios.patch(
    'https://graph.microsoft.com/v1.0/me/mailboxSettings',
    { automaticRepliesSetting: { status: 'disabled' } },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
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
  // Keep whatever wording the user has in Outlook; only move the window.
  const current = await getAutoReplySettings(accessToken);
  const message = current.externalReplyMessage || buildDefaultReplyMessage(user.email);
  await setAutoResponder(accessToken, start, end, user.email, message);
  console.log(`Scheduled Shabbat for ${user.email}: ${start} → ${end}`);
}

// ---------------------------------------------------------------------------
// Cron endpoint — called by Vercel Cron every Thursday at 11pm
// Protected by a shared secret so only Vercel can trigger it
// ---------------------------------------------------------------------------

app.get('/api/cron', async (req, res) => {
  if (!CRON_SECRET || req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) {
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
