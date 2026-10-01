/* Finds every piece of unreadable text in the app.
 *
 * The retheme inverts the UI, and the failure mode it keeps producing is always
 * the same shape: a colour that was a dark MARK on a light plate gets treated
 * as a dark SURFACE, or the other way round, and the text ends up the colour of
 * the thing behind it. Three have been found by eye so far — the card rank, the
 * card back's diamond, the toast. Finding the fourth by eye is luck.
 *
 * So: walk the rendered DOM on every screen, work out each text node's real
 * background (climbing past transparent ancestors the way the eye does), and
 * report anything below the WCAG threshold.
 *
 *   node tools/audit-contrast.mjs [url]
 */
import { chromium } from 'playwright';

/* The measurement lives in tools/lib/contrast.mjs so probe-live.mjs can run the
   same one on the screens that need a signed-in session to reach. */
import { AUDIT } from './lib/contrast.mjs';

const url = process.argv[2] ?? 'http://localhost:3001';

const SCREENS = [
  { label: null, as: 'landing' },
  { label: 'play now', as: 'lobby' },
  /* The connect screen, which this never covered — and which carries the most
     deliberately-muted text in the app: the install rows for wallets the
     browser does not have. Reached from the lobby's own button. */
  { label: 'connect a wallet', as: 'connect' },
  { label: 'tournaments', as: 'tournaments' },
  { label: 'leaderboard', as: 'leaderboard' },
  { label: 'staking', as: 'staking' },
  { label: 'more', as: 'more menu' },
  { label: 'settings', as: 'settings' },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });
/* Not `networkidle`: pointed at a gateway, the app polls — the lobby, the
   jackpot clock, the tournament schedule — so the network never goes idle and
   this times out on a page that rendered perfectly well. Wait for the document,
   then give the client-only tree a moment to mount. Same reasoning as
   tools/verify.mjs. */
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);

let total = 0;
for (const s of SCREENS) {
  if (s.label) {
    const el = page.locator(`button:has-text("${s.label}")`).first();
    if (await el.count()) { await el.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1100); }
  }
  const bad = await page.evaluate(AUDIT);
  total += bad.length;
  console.log(`\n${bad.length ? 'FAIL' : 'OK  '} ${s.as}  —  ${bad.length} unreadable`);
  for (const b of bad.slice(0, 10)) {
    console.log(`     ${String(b.c).padStart(5)}:1 (needs ${b.floor})  "${b.text}"`);
    console.log(`            ${b.colour} on ${b.on}  @${b.size}px`);
  }
  if (bad.length > 10) console.log(`     … ${bad.length - 10} more`);
}

await browser.close();
console.log(`\n${total} unreadable text nodes across ${SCREENS.length} screens`);
process.exitCode = total ? 1 : 0;
