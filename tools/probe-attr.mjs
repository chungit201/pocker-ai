/* Do the stylesheet's style-attribute selectors match anything in the live DOM?
 *
 * They cannot be checked by reading the source: the selector is written in the
 * form the BROWSER serialises an inline style into — `rgb(42, 39, 37)`, with
 * spaces — while the source writes `#2a2725`. Only the rendered page knows. */
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:3001';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });
/* The original will not boot without this: support.js pins SRI hashes its own
   vendored React no longer matches. Harness-only, the source tree is untouched. */
await page.route('**/support.js', async (route) => {
  const res = await route.fetch();
  const body = (await res.text()).replace(/"sha384-[A-Za-z0-9+/=]+"/g, '""');
  await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': undefined } });
});

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

/* Checked across several screens, not one: a selector that matches nothing on
   the lobby may be the only thing styling a button on the profile. A single
   screen would report a live rule as dead. */
const seen = new Map();
const sweep = async () => {
  const found = await page.evaluate(() => {
    const sels = new Set();
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const r of rules) for (const m of (r.selectorText ?? '').matchAll(/\[style\*="([^"]+)"\]/g)) sels.add(m[1]);
    }
    return [...sels].map((s) => { try { return [s, document.querySelectorAll(`[style*="${s}"]`).length]; } catch { return [s, -1]; } });
  });
  for (const [s, n] of found) seen.set(s, Math.max(seen.get(s) ?? 0, n));
};

await sweep();
for (const label of ['play now', 'staking', 'leaderboard', 'tournaments', 'more', 'settings', 'lobby', 'join $0.01']) {
  await page.locator(`button:has-text("${label}")`).first().click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(900);
  await sweep();
}

const sample = await page.evaluate(() => [...document.querySelectorAll('[style*="background"]')]
  .slice(0, 2).map((e) => e.getAttribute('style').slice(0, 80)));

const rows = [...seen].sort((a, b) => b[1] - a[1]);
const dead = rows.filter(([, n]) => n === 0);
console.log(`style-attribute selectors, best match across every screen visited (${rows.length}):`);
for (const [s, n] of rows) console.log(`  ${n > 0 ? 'MATCHES' : 'DEAD   '} ${String(n).padStart(3)}  [style*="${s}"]`);
console.log('\nhow inline styles serialise here:');
for (const s of sample) console.log(`  ${s}…`);
if (dead.length) process.exitCode = 1;

await browser.close();
