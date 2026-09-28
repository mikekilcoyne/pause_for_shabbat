// Server-rendered pages for Pause for Shabbat.
// Everything is inline (no static dir) so Vercel's single-function build serves it as-is.

const SET_ADDRESS = 'set@pauseforshabbat.com';
const STOP_ADDRESS = 'stop@pauseforshabbat.com';
const CREDIT = 'Created by Rabbi Josh Franklin.';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SET_MAILTO = `mailto:${SET_ADDRESS}?subject=${encodeURIComponent('Pause for Shabbat')}&body=${encodeURIComponent('Please set up Pause for Shabbat for me.')}`;

// Chunky, cartoon-y "old-school Android" look: thick outlines, hard offset
// shadows, rounded squares, flat bright colors.
const BASE_STYLES = `
  :root {
    --bg: #fff5e4;
    --ink: #1b2340;
    --muted: #4f5877;
    --card: #ffffff;
    --navy: #25417c;
    --flame: #ff9a2e;
    --sun: #ffd166;
    --mint: #7fe0b8;
    --sky: #93d4ff;
    --lilac: #c3b3ff;
    --pink: #ffb3c7;
    --stroke: 3px solid var(--ink);
    --pop: 6px 6px 0 var(--ink);
    --pop-sm: 4px 4px 0 var(--ink);
    --r-lg: 32px;
    --r-md: 22px;
  }

  * { box-sizing: border-box; }

  html { -webkit-text-size-adjust: 100%; }

  body {
    margin: 0;
    min-height: 100vh;
    background-color: var(--bg);
    background-image: radial-gradient(rgba(27, 35, 64, 0.09) 1.5px, transparent 1.5px);
    background-size: 22px 22px;
    color: var(--ink);
    font-family: "Nunito", system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 17px;
    line-height: 1.6;
  }

  h1, h2, h3, .display, .button, .brand, .chip {
    font-family: "Fredoka", "Nunito", system-ui, sans-serif;
  }

  a { color: inherit; }

  .wrap {
    width: min(100% - 32px, 1080px);
    margin: 0 auto;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border: var(--stroke);
    border-radius: 999px;
    background: var(--sun);
    font-weight: 600;
    font-size: 0.9rem;
    box-shadow: 3px 3px 0 var(--ink);
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 16px 26px;
    border: var(--stroke);
    border-radius: var(--r-md);
    background: var(--card);
    color: var(--ink);
    font-weight: 600;
    font-size: 1.08rem;
    text-decoration: none;
    box-shadow: var(--pop-sm);
    transition: transform 90ms ease, box-shadow 90ms ease;
    text-align: center;
  }

  .button:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--ink); }
  .button:active { transform: translate(3px, 3px); box-shadow: 1px 1px 0 var(--ink); }
  .button.primary { background: var(--flame); }

  .button:focus-visible, a:focus-visible, summary:focus-visible {
    outline: 3px solid var(--navy);
    outline-offset: 4px;
  }

  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 22px 0;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-weight: 600;
    font-size: 1.2rem;
    text-decoration: none;
  }

  .brand img {
    width: 44px;
    height: 44px;
    border: var(--stroke);
    border-radius: 14px;
    background: var(--navy);
    box-shadow: 3px 3px 0 var(--ink);
  }

  .nav-links { display: flex; gap: 10px; }
  .nav-links a {
    text-decoration: none;
    font-weight: 700;
    padding: 6px 12px;
    border-radius: 12px;
  }
  .nav-links a:hover { background: var(--card); box-shadow: inset 0 0 0 2px var(--ink); }

  .footer {
    margin-top: 80px;
    padding: 28px 0 44px;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    font-weight: 700;
  }

  .footer nav { display: flex; gap: 18px; flex-wrap: wrap; }
  .footer a { color: var(--muted); }

  @media (max-width: 640px) {
    body { font-size: 16px; }
    .nav-links .hide-sm { display: none; }
    .brand { font-size: 1.05rem; }
  }
`;

function layout({ title, description, body, styles = '' }) {
  const fullTitle = title ? `${title} · Pause for Shabbat` : 'Pause for Shabbat';
  const desc = description || 'Set your email to auto-pause for Shabbat every week. One email. One click.';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(fullTitle)}</title>
    <meta name="description" content="${escapeHtml(desc)}" />
    <meta name="theme-color" content="#fff5e4" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Pause for Shabbat" />
    <meta property="og:title" content="${escapeHtml(fullTitle)}" />
    <meta property="og:description" content="${escapeHtml(desc)}" />
    <meta property="og:image" content="https://pauseforshabbat.com/brand/icon.png" />
    <meta name="twitter:card" content="summary" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@500;700;800&display=swap" rel="stylesheet" />
    <style>${BASE_STYLES}${styles}</style>
  </head>
  <body>
${body}
  </body>
</html>`;
}

function navBar() {
  return `
    <header class="wrap nav">
      <a class="brand" href="/"><img src="/brand/mark.png" alt="" width="44" height="44" />Pause for Shabbat</a>
      <nav class="nav-links" aria-label="Main">
        <a class="hide-sm" href="/#how">How it works</a>
        <a class="hide-sm" href="/#faq">FAQ</a>
        <a href="/privacy">Privacy</a>
      </nav>
    </header>`;
}

function footer({ contactEmail } = {}) {
  const contact = contactEmail
    ? `<a href="mailto:${escapeHtml(contactEmail)}">Contact</a>`
    : '';
  return `
    <footer class="wrap footer">
      <div>${CREDIT}</div>
      <nav aria-label="Footer">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        ${contact}
      </nav>
    </footer>`;
}

// Two candles, drawn in the same chunky style (used inside the hero tile).
const CANDLES_SVG = `
  <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
    <g stroke="#1b2340" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <path d="M22 10c4 5 4 9 0 12-4-3-4-7 0-12z" fill="#ff9a2e"/>
      <path d="M42 10c4 5 4 9 0 12-4-3-4-7 0-12z" fill="#ff9a2e"/>
      <rect x="16" y="26" width="12" height="30" rx="4" fill="#fff5e4"/>
      <rect x="36" y="26" width="12" height="30" rx="4" fill="#fff5e4"/>
      <path d="M22 22v4M42 22v4"/>
    </g>
  </svg>`;

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------

const LANDING_STYLES = `
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    gap: 56px;
    align-items: center;
    padding: 36px 0 12px;
  }

  h1 {
    margin: 20px 0 0;
    font-size: clamp(2.4rem, 5.6vw, 4.1rem);
    line-height: 1.02;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .hl {
    display: inline-block;
    margin-top: 14px;
    padding: 2px 16px 6px;
    font-size: 0.78em;
    white-space: nowrap;
    background: var(--mint);
    border: var(--stroke);
    border-radius: 18px;
    box-shadow: var(--pop-sm);
    transform: rotate(-1.5deg);
  }

  .ctas {
    margin-top: 34px;
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    align-items: center;
  }

  .alt-link {
    font-weight: 800;
    color: var(--navy);
  }

  .credit {
    margin-top: 22px;
    font-weight: 800;
    color: var(--muted);
  }

  /* Phone with an Android-style quick settings panel */
  .phone {
    position: relative;
    width: min(100%, 360px);
    margin: 0 auto;
    background: var(--navy);
    border: var(--stroke);
    border-radius: 44px;
    padding: 18px 16px 22px;
    box-shadow: 10px 10px 0 var(--ink);
  }

  .phone::before {
    content: "";
    display: block;
    width: 76px;
    height: 10px;
    margin: 0 auto 14px;
    border-radius: 999px;
    background: var(--ink);
  }

  .statusbar {
    display: flex;
    justify-content: space-between;
    color: #fff5e4;
    font-family: "Fredoka", sans-serif;
    font-weight: 600;
    font-size: 0.95rem;
    padding: 0 8px 12px;
  }

  .tiles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .tile {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px;
    border: var(--stroke);
    border-radius: var(--r-md);
    background: #3a5694;
    color: #fff5e4;
    font-family: "Fredoka", sans-serif;
    font-weight: 600;
    font-size: 0.95rem;
    line-height: 1.15;
  }

  .tile .dot {
    flex: none;
    width: 28px;
    height: 28px;
    border-radius: 10px;
    border: 2.5px solid var(--ink);
    background: #fff5e4;
  }

  .tile.big {
    grid-column: 1 / -1;
    background: var(--sun);
    color: var(--ink);
    padding: 16px;
    gap: 14px;
    box-shadow: 0 0 0 4px rgba(255, 209, 102, 0.35);
    animation: glow 3.2s ease-in-out infinite;
  }

  .tile.big .icon {
    flex: none;
    width: 58px;
    height: 58px;
    border: var(--stroke);
    border-radius: 18px;
    background: var(--navy);
    padding: 6px;
  }

  .tile.big .name { font-size: 1.15rem; }
  .tile.big .sub { font-family: "Nunito", sans-serif; font-weight: 800; font-size: 0.85rem; color: var(--muted); }

  .toggle {
    margin-left: auto;
    flex: none;
    width: 54px;
    height: 32px;
    border: var(--stroke);
    border-radius: 999px;
    background: var(--mint);
    position: relative;
  }

  .toggle::after {
    content: "";
    position: absolute;
    top: 3px;
    right: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2.5px solid var(--ink);
    background: #fff;
  }

  .notif {
    margin-top: 14px;
    background: #fff;
    border: var(--stroke);
    border-radius: var(--r-md);
    padding: 12px 14px;
    color: var(--ink);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .notif b { font-family: "Fredoka", sans-serif; font-weight: 600; font-size: 1rem; }

  @keyframes glow {
    0%, 100% { box-shadow: 0 0 0 4px rgba(255, 209, 102, 0.35); }
    50% { box-shadow: 0 0 0 10px rgba(255, 209, 102, 0.18); }
  }

  @media (prefers-reduced-motion: reduce) {
    .tile.big { animation: none; }
    .button { transition: none; }
  }

  /* Sections */
  section.block { padding-top: 96px; }

  .kicker { font-weight: 800; color: var(--navy); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.85rem; }

  h2 {
    margin: 8px 0 0;
    font-size: clamp(1.9rem, 4vw, 2.8rem);
    line-height: 1.08;
    font-weight: 700;
  }

  .steps {
    list-style: none;
    padding: 0;
    margin: 34px 0 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 22px;
  }

  .steps li {
    background: var(--card);
    border: var(--stroke);
    border-radius: var(--r-lg);
    padding: 24px;
    box-shadow: var(--pop);
  }

  .steps li:nth-child(1) .num { background: var(--sky); }
  .steps li:nth-child(2) .num { background: var(--lilac); }
  .steps li:nth-child(3) .num { background: var(--mint); }

  .num {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border: var(--stroke);
    border-radius: 16px;
    font-family: "Fredoka", sans-serif;
    font-weight: 700;
    font-size: 1.5rem;
  }

  .steps h3 { margin: 16px 0 6px; font-size: 1.45rem; font-weight: 600; }
  .steps p { margin: 0; color: var(--muted); font-weight: 500; }
  .steps .addr { font-weight: 800; color: var(--ink); }

  .why {
    margin-top: 96px;
    background: var(--navy);
    color: #fff5e4;
    border: var(--stroke);
    border-radius: 40px;
    box-shadow: 10px 10px 0 var(--ink);
    padding: clamp(28px, 6vw, 60px);
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
    gap: 40px;
  }

  .why h2 { color: #fff5e4; }
  .why .kicker { color: var(--sun); }
  .why .hebrew {
    display: inline-block;
    margin-top: 20px;
    padding: 6px 16px;
    background: var(--flame);
    color: var(--ink);
    border: var(--stroke);
    border-radius: 16px;
    font-family: "Fredoka", sans-serif;
    font-weight: 600;
    font-size: 1.25rem;
    transform: rotate(-2deg);
  }
  .why p { margin: 0 0 16px; font-size: 1.1rem; line-height: 1.7; color: rgba(255, 245, 228, 0.92); }
  .why .sig { margin-top: 20px; font-family: "Fredoka", sans-serif; font-weight: 600; font-size: 1.1rem; color: var(--sun); }

  .faq { margin-top: 30px; display: grid; gap: 14px; }
  .faq details {
    background: var(--card);
    border: var(--stroke);
    border-radius: var(--r-md);
    box-shadow: var(--pop-sm);
    padding: 18px 22px;
  }
  .faq summary {
    cursor: pointer;
    list-style: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    font-family: "Fredoka", sans-serif;
    font-weight: 600;
    font-size: 1.2rem;
  }
  .faq summary::-webkit-details-marker { display: none; }
  .faq summary::after {
    content: "+";
    flex: none;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: var(--stroke);
    border-radius: 10px;
    background: var(--sun);
    font-size: 1.2rem;
    line-height: 1;
  }
  .faq details[open] summary::after { content: "–"; background: var(--mint); }
  .faq details p { margin: 12px 0 0; color: var(--muted); font-weight: 500; max-width: 46rem; }
  .faq code { font-weight: 800; color: var(--ink); font-family: inherit; }

  .closing {
    margin-top: 96px;
    text-align: center;
    background: var(--sun);
    border: var(--stroke);
    border-radius: 40px;
    box-shadow: 10px 10px 0 var(--ink);
    padding: clamp(32px, 6vw, 56px) 20px;
  }
  .closing .ctas { justify-content: center; }
  .closing .credit { color: var(--ink); }

  @media (max-width: 880px) {
    .hero { grid-template-columns: 1fr; gap: 48px; padding-top: 16px; }
    .why { grid-template-columns: 1fr; gap: 16px; }
  }

  @media (max-width: 400px) {
    .hl { white-space: normal; }
  }

  @media (max-width: 640px) {
    .steps { grid-template-columns: 1fr; }
    .ctas .button { width: 100%; }
    .button.primary { font-size: 1rem; padding: 16px 18px; }
    section.block { padding-top: 72px; }
    .why, .closing { margin-top: 72px; box-shadow: 6px 6px 0 var(--ink); }
    .phone { box-shadow: 6px 6px 0 var(--ink); }
  }
`;

function renderLandingPage({ contactEmail } = {}) {
  const body = `
    ${navBar()}
    <main>
      <section class="wrap hero">
        <div>
          <span class="chip">🕯️ Outlook &amp; Microsoft 365</span>
          <h1>Set your email to auto-pause for Shabbat every week.<br /><span class="hl">One email. One click.</span></h1>
          <div class="ctas">
            <a class="button primary" href="${SET_MAILTO}">Send email to ${SET_ADDRESS}</a>
          </div>
          <div class="credit">${CREDIT} <a class="alt-link" href="/start">Or connect Outlook directly →</a></div>
        </div>

        <div class="phone" role="img" aria-label="Phone quick settings showing Pause for Shabbat switched on">
          <div class="statusbar"><span>Fri 6:41</span><span>● ● ●</span></div>
          <div class="tiles">
            <div class="tile big">
              <div class="icon">${CANDLES_SVG}</div>
              <div>
                <div class="name">Pause for Shabbat</div>
                <div class="sub">Sunset → Nightfall</div>
              </div>
              <div class="toggle"></div>
            </div>
            <div class="tile"><span class="dot"></span>Inbox<br />paused</div>
            <div class="tile"><span class="dot"></span>Back<br />Sunday</div>
          </div>
          <div class="notif">
            <b>Auto-reply is on</b><br />
            “I observe Shabbat from Friday evening through Saturday evening. I’ll respond on Sunday.”
          </div>
        </div>
      </section>

      <section class="wrap block" id="how">
        <div class="kicker">How it works</div>
        <h2>Set it once. Then forget it.</h2>
        <ol class="steps">
          <li>
            <div class="num">1</div>
            <h3>Send one email</h3>
            <p>Email <span class="addr">${SET_ADDRESS.replace('@', '@<wbr>')}</span> from your work address. Any subject line works.</p>
          </li>
          <li>
            <div class="num">2</div>
            <h3>Click one link</h3>
            <p>We&apos;ll email you a link. Sign in to Microsoft and let Pause for Shabbat manage your automatic replies.</p>
          </li>
          <li>
            <div class="num">3</div>
            <h3>Rest</h3>
            <p>Every week your auto-reply turns on at your local sunset on Friday and off at nightfall on Saturday.</p>
          </li>
        </ol>
      </section>

      <section class="wrap">
        <div class="why">
          <div>
            <div class="kicker">Why we built this</div>
            <h2>No rolling stops.</h2>
            <div class="hebrew">Vaishbot bayom hashvi&apos;i</div>
          </div>
          <div>
            <p>In driver&apos;s ed they teach you to come to a complete stop at a stop sign. Most of us do the rolling stop instead. We slow down almost all the way, and then we keep going.</p>
            <p>When the Torah first mentions Shabbat, in Genesis 2, it uses the word <em>vaishbot</em>: to stop, to cease. It means stopping all the work of the week, including everything that keeps us stressed and running at full speed. It means a complete stop.</p>
            <p>That&apos;s why we created Pause for Shabbat.</p>
            <div class="sig">Rabbi Josh Franklin</div>
          </div>
        </div>
      </section>

      <section class="wrap block" id="faq">
        <div class="kicker">Questions</div>
        <h2>Good to know.</h2>
        <div class="faq">
          <details>
            <summary>What can Pause for Shabbat access?</summary>
            <p>Only your automatic-reply settings, plus your name and email address so we know whose account it is. We never read, send, or delete your email, and we can&apos;t see your contacts or calendar.</p>
          </details>
          <details>
            <summary>How is the timing worked out?</summary>
            <p>We use the time zone in your Outlook settings to find local sunset. Your reply starts at sunset on Friday and ends 42 minutes after sunset on Saturday, which is the usual time given for nightfall. We schedule the next week every Thursday night.</p>
          </details>
          <details>
            <summary>Can I change the message?</summary>
            <p>Yes. Edit your automatic reply in Outlook (Settings → Mail → Automatic replies). We&apos;ll keep your wording every week and only change the start and end times.</p>
          </details>
          <details>
            <summary>How do I turn it off?</summary>
            <p>Send any email to <a href="mailto:${STOP_ADDRESS}"><code>${STOP_ADDRESS}</code></a> from the same address. We&apos;ll cancel your upcoming Shabbat reply and delete your record. You can also remove the app&apos;s access in your Microsoft account at any time.</p>
          </details>
          <details>
            <summary>Does it work with Gmail?</summary>
            <p>Not yet. It works with Outlook and Microsoft 365, including work and school accounts if your organization allows it. Gmail is on the list.</p>
          </details>
          <details>
            <summary>My organization blocked the app. Now what?</summary>
            <p>Some Microsoft 365 organizations require an administrator to approve third-party apps. Send this page to your IT team. We only ask for the <code>MailboxSettings.ReadWrite</code> permission.</p>
          </details>
        </div>
      </section>

      <section class="wrap closing">
        <h2>Take this Shabbat off.</h2>
        <div class="ctas" style="margin-top: 26px;">
          <a class="button primary" href="${SET_MAILTO}">Send email to ${SET_ADDRESS}</a>
        </div>
        <div class="credit">${CREDIT}</div>
      </section>
    </main>
    ${footer({ contactEmail })}`;

  return layout({ title: '', body, styles: LANDING_STYLES });
}

// ---------------------------------------------------------------------------
// Legal pages
// ---------------------------------------------------------------------------

const PROSE_STYLES = `
  .prose {
    width: min(100% - 32px, 760px);
    margin: 20px auto 0;
    background: var(--card);
    border: var(--stroke);
    border-radius: 36px;
    box-shadow: 8px 8px 0 var(--ink);
    padding: clamp(24px, 5vw, 48px);
  }
  .prose h1 { font-size: clamp(2.1rem, 6vw, 3rem); font-weight: 700; line-height: 1.05; margin: 14px 0 6px; }
  .prose h2 { font-size: 1.4rem; font-weight: 600; margin: 34px 0 6px; }
  .prose p, .prose li { color: #2f3656; }
  .prose ul { padding-left: 1.2rem; }
  .prose .updated { color: var(--muted); font-weight: 700; font-size: 0.9rem; }
  .prose code { font-family: inherit; font-weight: 800; }
`;

const LEGAL_UPDATED = 'September 27, 2026';

function contactSentence(contactEmail) {
  return contactEmail
    ? `Questions? Email <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>.`
    : `To stop the service and delete your data, email <a href="mailto:${STOP_ADDRESS}">${STOP_ADDRESS}</a>.`;
}

function renderPrivacyPage({ contactEmail } = {}) {
  const body = `
    ${navBar()}
    <main class="prose">
      <span class="chip">Privacy</span>
      <h1>Privacy Policy</h1>
      <p class="updated">Last updated ${LEGAL_UPDATED}</p>

      <p>Pause for Shabbat does one thing. It schedules your Outlook automatic reply for Shabbat each week. We collect only what we need to do that.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Your email address and display name</strong>, from Microsoft when you connect your account.</li>
        <li><strong>Your mailbox time zone</strong>, from your Outlook settings, so we can work out local sunset.</li>
        <li><strong>Microsoft access and refresh tokens</strong>, so we can update your automatic-reply schedule each week without asking you to sign in again.</li>
        <li><strong>The sender address of emails you send to <code>${SET_ADDRESS}</code> or <code>${STOP_ADDRESS}</code></strong>, used only to reply to you or to stop the service.</li>
      </ul>

      <h2>What we access in your Microsoft account</h2>
      <p>We request two Microsoft Graph permissions: <code>User.Read</code> (your name and email) and <code>MailboxSettings.ReadWrite</code> (your automatic-reply settings and time zone). We also request <code>offline_access</code>, which lets the weekly schedule run while you&apos;re away. We cannot read, send, or delete your email, and we cannot see your contacts, calendar, or files.</p>

      <h2>How we use it</h2>
      <p>We use this information only to schedule your Shabbat automatic reply and to send you setup and confirmation emails. We don&apos;t sell or rent it, we don&apos;t share it for advertising, and we don&apos;t use it for anything else.</p>

      <h2>Where it lives</h2>
      <p>Your record is stored in a Supabase (Postgres) database. The app runs on Vercel. We send email through Resend, and email sent to our addresses is received by SendGrid. Sunset times come from sunrise-sunset.org, which receives only an approximate location for your time zone and nothing about you.</p>

      <h2>Deleting your data</h2>
      <p>Email <a href="mailto:${STOP_ADDRESS}">${STOP_ADDRESS}</a> from your connected address. We&apos;ll cancel any upcoming Shabbat reply and permanently delete your record, including your tokens. You can also revoke access at any time from the app permissions page of your Microsoft account.</p>

      <h2>Changes</h2>
      <p>If this policy changes in a meaningful way, we&apos;ll update this page and the date above.</p>

      <p>${contactSentence(contactEmail)}</p>
    </main>
    ${footer({ contactEmail })}`;

  return layout({ title: 'Privacy', description: 'How Pause for Shabbat handles your data.', body, styles: PROSE_STYLES });
}

function renderTermsPage({ contactEmail } = {}) {
  const body = `
    ${navBar()}
    <main class="prose">
      <span class="chip">Terms</span>
      <h1>Terms of Use</h1>
      <p class="updated">Last updated ${LEGAL_UPDATED}</p>

      <p>By connecting your Microsoft account to Pause for Shabbat, you agree to these terms.</p>

      <h2>The service</h2>
      <p>Pause for Shabbat schedules your Outlook automatic reply to run from sunset on Friday until nightfall on Saturday, based on the time zone in your Outlook settings. It is free and provided as is.</p>

      <h2>Timing is approximate</h2>
      <p>We calculate sunset and nightfall for a representative location in your time zone, not your exact address. Our times may differ by several minutes or more from your community&apos;s published candle-lighting and havdalah times. For precise halachic times, ask your rabbi or check your local luach.</p>

      <h2>Your account</h2>
      <p>You are responsible for the content of your automatic reply and for making sure your use follows your organization&apos;s policies. If your organization requires administrator approval for third-party apps, you may need that approval before you can use the service.</p>

      <h2>No warranty</h2>
      <p>We work to keep the service reliable, but we can&apos;t guarantee that every automatic reply will be scheduled on time, or at all. Microsoft outages, revoked permissions, and changes to your account can all interfere. To the fullest extent the law allows, the service is provided without warranties of any kind, and we are not liable for any loss that results from using it.</p>

      <h2>Stopping</h2>
      <p>You can stop at any time by emailing <a href="mailto:${STOP_ADDRESS}">${STOP_ADDRESS}</a> or by revoking the app&apos;s access in your Microsoft account. We may pause or discontinue the service at any time.</p>

      <p>${contactSentence(contactEmail)}</p>
    </main>
    ${footer({ contactEmail })}`;

  return layout({ title: 'Terms', description: 'Terms of use for Pause for Shabbat.', body, styles: PROSE_STYLES });
}

// ---------------------------------------------------------------------------
// Card pages: OAuth confirmation + status/error
// ---------------------------------------------------------------------------

const CARD_STYLES = `
  .card {
    width: min(100% - 32px, 720px);
    margin: 28px auto 0;
    background: var(--card);
    border: var(--stroke);
    border-radius: 40px;
    box-shadow: 10px 10px 0 var(--ink);
    padding: clamp(26px, 5vw, 44px);
    text-align: center;
  }
  .card h1 { font-weight: 700; font-size: clamp(2rem, 6vw, 3.2rem); line-height: 1.05; margin: 16px 0 0; }
  .card .lede { color: var(--muted); font-weight: 600; margin: 14px auto 0; max-width: 34rem; }
  .card .ctas { margin-top: 26px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

  .badge {
    width: 96px;
    height: 96px;
    margin: 0 auto;
    border: var(--stroke);
    border-radius: 28px;
    background: var(--navy);
    padding: 12px;
    box-shadow: var(--pop-sm);
  }

  .times {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: 28px;
    text-align: left;
  }
  .times > div {
    border: var(--stroke);
    border-radius: var(--r-md);
    padding: 16px 18px;
    box-shadow: var(--pop-sm);
  }
  .times > div:first-child { background: var(--sun); }
  .times > div:last-child { background: var(--lilac); }
  .times .label { font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.8rem; }
  .times .value { font-family: "Fredoka", sans-serif; font-weight: 600; font-size: clamp(1.2rem, 3vw, 1.5rem); line-height: 1.25; margin-top: 4px; }

  .who { margin-top: 18px; color: var(--muted); font-weight: 700; font-size: 0.95rem; word-break: break-word; }

  .message {
    margin-top: 22px;
    text-align: left;
    background: var(--bg);
    border: var(--stroke);
    border-radius: var(--r-md);
    padding: 18px 20px;
  }
  .message .label { font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.8rem; color: var(--navy); }
  .message p { margin: 10px 0 0; white-space: pre-wrap; line-height: 1.65; }

  .fineprint { margin-top: 18px; color: var(--muted); font-weight: 600; font-size: 0.92rem; }

  @media (max-width: 640px) {
    .times { grid-template-columns: 1fr; }
    .card { box-shadow: 6px 6px 0 var(--ink); }
  }
`;

function renderConfirmationPage({ email, timezone, start, end, message, formatTime }) {
  const body = `
    ${navBar()}
    <main class="card">
      <div class="badge">${CANDLES_SVG}</div>
      <h1>You&apos;re all set.</h1>
      <p class="lede">Your auto-reply is scheduled for Shabbat. We&apos;ll schedule it again every week, so you don&apos;t have to do anything else.</p>

      <div class="times">
        <div><div class="label">Starts</div><div class="value">${escapeHtml(formatTime(start))}</div></div>
        <div><div class="label">Ends</div><div class="value">${escapeHtml(formatTime(end))}</div></div>
      </div>

      <div class="who">${escapeHtml(email)} · ${escapeHtml(timezone)}</div>

      <section class="message">
        <div class="label">Your auto-reply</div>
        <p>${escapeHtml(message)}</p>
      </section>

      <div class="ctas">
        <a class="button" href="https://outlook.office.com/mail/options/mail/automaticReplies" target="_blank" rel="noopener">Edit message in Outlook</a>
      </div>

      <div class="fineprint">If you edit your auto-reply in Outlook, we&apos;ll keep your wording every week. To turn Pause for Shabbat off, email ${STOP_ADDRESS}.</div>
    </main>
    ${footer()}`;
  return layout({ title: 'You’re all set', body, styles: CARD_STYLES });
}

function renderStatusPage({ title, message, primary }) {
  const primaryButton = primary
    ? `<a class="button primary" href="${escapeHtml(primary.href)}">${escapeHtml(primary.label)}</a>`
    : '';
  const body = `
    ${navBar()}
    <main class="card" style="max-width: 580px;">
      <div class="badge">${CANDLES_SVG}</div>
      <h1>${escapeHtml(title)}</h1>
      <p class="lede">${escapeHtml(message)}</p>
      <div class="ctas">
        ${primaryButton}
        <a class="button" href="/">Back to home</a>
      </div>
    </main>`;
  return layout({ title, body, styles: CARD_STYLES });
}

module.exports = {
  SET_ADDRESS,
  STOP_ADDRESS,
  escapeHtml,
  renderLandingPage,
  renderPrivacyPage,
  renderTermsPage,
  renderConfirmationPage,
  renderStatusPage,
};
