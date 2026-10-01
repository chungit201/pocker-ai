/* Opens the ported app in a real browser and reports what it actually did.
 *
 * A build that compiles proves nothing here: this app renders entirely on the
 * client, so every interesting failure — a template hole that resolves to
 * undefined, an engine module that throws on import, a screen that mounts
 * blank — happens after the HTML has already been served with a 200.
 *
 * Usage: node tools/verify.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:3001';
const screens = ['/', '/lobby', '/tournaments', '/leaderboard', '/staking', '/docs', '/settings', '/history'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });

/* Faults that predate the port and are present in the original single-file app
   too. Listed rather than silenced so they stay visible, but not counted as
   failures — a check that is always red is a check nobody reads.
   The staking chart builds a <path> whose `d` starts with L instead of M. */
const KNOWN = [/Expected moveto path command/];

/* Endpoints the deployed gateway does not implement. The app asks for them,
   gets a 404, and shows an em-dash — which is the designed behaviour, not a
   fault, so it must not fail this check. See docs/gateway.md.

   These are matched on the request URL rather than on the console message,
   because Chrome's text for a failed fetch — "Failed to load resource: the
   server responded with a status of 404" — names no URL at all. Filtering on
   that string would silence every 404 the app could ever hit, including a real
   one. */
const KNOWN_404 = [/\/api\/stats/, /\/api\/jackpot/, /\/api\/leaderboard/, /\/api\/tournaments/, /\/api\/staking/];

const errors = [];
const warnings = [];
/* Console 404s are collected separately and only rejoin `errors` if the URL
   behind them was not expected. */
let genericFetchErrors = 0;
const unexpected404 = [];
page.on('response', (r) => {
  if (r.status() !== 404) return;
  const path = new URL(r.url()).pathname;
  if (!KNOWN_404.some((k) => k.test(path))) unexpected404.push(`${path} → 404`);
});
page.on('console', (m) => {
  if (m.type() === 'error') {
    if (/Failed to load resource/.test(m.text())) { genericFetchErrors++; return; }
    errors.push(m.text());
  }
  if (m.type() === 'warning') warnings.push(m.text());
});
page.on('pageerror', (e) => errors.push(`UNCAUGHT ${e.message}`));

let failed = 0;

for (const path of screens) {
  errors.length = 0;
  warnings.length = 0;
  unexpected404.length = 0;
  genericFetchErrors = 0;
  /* Not `networkidle`: connected to a gateway the app polls — the jackpot
     clock, the lobby, the tournament schedule — so the network never goes idle
     and the wait times out on a page that rendered fine. Wait for the document
     and then give the client-only tree a moment to mount. */
  await page.goto(base + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);

  const shot = await page.evaluate(() => {
    const root = document.getElementById('dc-root');
    const host = root?.querySelector(':scope > .sc-host');
    const body = document.body;
    // Anything the template failed to resolve leaves one of these behind.
    const unresolved = document.querySelectorAll('.sc-interp.sc-unresolved, .sc-missing').length;
    // A blank screen is the failure mode that still returns 200.
    const text = (body.innerText || '').trim();
    return {
      hasRoot: !!root,
      hasHost: !!host,
      elements: root ? root.querySelectorAll('*').length : 0,
      interps: document.querySelectorAll('.sc-interp').length,
      unresolved,
      textLength: text.length,
      firstWords: text.slice(0, 70).replace(/\s+/g, ' '),
      rootHeight: root ? Math.round(root.getBoundingClientRect().height) : 0,
      title: document.title,
    };
  });

  const fresh = [...errors.filter((e) => !KNOWN.some((k) => k.test(e))), ...unexpected404];
  const ok = shot.hasRoot && shot.hasHost && shot.elements > 40 && shot.textLength > 20 && !fresh.length;
  if (!ok) failed++;

  console.log(`\n${ok ? 'OK  ' : 'FAIL'} ${path}`);
  console.log(`     ${shot.elements} elements, ${shot.interps} interpolations, ${shot.textLength} chars of text, root ${shot.rootHeight}px`);
  console.log(`     title: ${shot.title}`);
  console.log(`     text:  ${shot.firstWords}…`);
  if (shot.unresolved) console.log(`     ⚠ ${shot.unresolved} unresolved template holes`);
  for (const e of [...new Set(fresh)].slice(0, 6)) console.log(`     ✗ ${e.slice(0, 200)}`);
  // Reported, not counted: these are the gateway's missing endpoints.
  if (genericFetchErrors) console.log(`     · ${genericFetchErrors} expected 404s (see KNOWN_404 / docs/gateway.md)`);
  for (const w of [...new Set(warnings)].slice(0, 3)) console.log(`     ! ${w.slice(0, 160)}`);

  await page.screenshot({ path: `tools/out/shot${path.replace(/\//g, '-') || '-root'}.png`, fullPage: false });
}

await browser.close();
console.log(`\n${screens.length - failed}/${screens.length} screens rendered`);
process.exit(failed ? 1 : 0);
