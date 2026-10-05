/* Does the lobby update itself, or only on reload?
 *
 * The bug this was written for: a player joining from another machine did not
 * show up. The per-table seat counts and the header's "N online" chip both
 * come from /api/lobby, which nothing pushes and — until `lobbyTimer` — nothing
 * re-fetched while the lobby was on screen, so both figures sat frozen until
 * the page was reloaded.
 *
 *   node tools/probe-lobby-live.mjs [url]     # needs npm run dev
 *
 * /api/lobby is stubbed rather than driven by a real second client. Seating a
 * second player would need a funded session on the gateway and would prove the
 * same wiring with far more that can go wrong; what has to be shown is that a
 * CHANGED payload reaches the screen with no reload, so the stub changes its
 * answer halfway through and the DOM is read before and after.
 *
 * Three things are checked, because the first two can pass while the screen
 * stays wrong:
 *
 *   polled    /api/lobby is requested more than once while the lobby is open
 *   rendered  the header chip and the table rows show the SECOND payload
 *   stopped   leaving the lobby stops the requests (a leaked interval is
 *             traffic forever, and go() clears every other screen's timer)
 */
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:3001';

/* Two payloads differing in both figures under test. The shapes mirror what
   SuitedApp.loadLobby reads: micro-USDC money, `seated`/`maxSeats` per table,
   and a top-level `playersOnline`.
 *
 * The id prefix is load-bearing. `loadLobby` derives the stake from it
 * (`String(id).split('-')[0]`) and the lobby groups its rows by that, so a
 * table called `probe-001` is counted under a stake the ladder does not list
 * and renders nowhere — which looks exactly like the bug under test. */
const lobby = (seated, online) => ({
  playersOnline: online,
  tables: [{
    id: 'nl200-001', name: 'Probe table', seated, maxSeats: 6,
    sb: 1_000_000, bb: 2_000_000, minBuyIn: 50_000_000, maxBuyIn: 200_000_000, avgPot: 12_500_000,
  }],
});

const BEFORE = lobby(1, 7);
const AFTER = lobby(4, 123);

let phase = 'before';
let hits = 0;
const at = [];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });

await page.route('**/api/lobby', async (route) => {
  hits++;
  at.push(Date.now());
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(phase === 'before' ? BEFORE : AFTER),
  });
});

const results = [];
const step = (name, ok, note) => {
  results.push({ name, ok });
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${name}${note ? ` — ${note}` : ''}`);
};

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

/* Reaching the lobby. It needs no wallet — go() only redirects the TABLE
   screen when there is none — so the nav tab is enough once the landing page
   has handed over. */
const click = async (label, wait = 1500) => {
  const el = page.locator(`button:has-text("${label}")`).first();
  if (!(await el.count())) return false;
  await el.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(wait);
  return true;
};
await click('play now', 2000);
await click('lobby', 2000);

const chip = page.locator('.su-online').first();
if (!(await chip.count())) {
  console.log('FAIL  could not reach the lobby — nothing else could be checked');
  await browser.close();
  process.exit(1);
}

const online = async () => (await chip.innerText()).trim();
/* What the lobby actually puts a seat count into, both off the same payload:
   the hero's "N players seated" (the total across every room) and the stake
   row's own "N seated". Neither is a "4/6" — that shape only appears in the
   table drawer, which is not on screen here. */
const seatCounts = async () => {
  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  return {
    hero: (/(\d+)\s+players? seated/.exec(body) ?? [])[1] ?? null,
    row: (/(\d+)\s+seated/.exec(body) ?? [])[1] ?? null,
  };
};

const firstOnline = await online();
const firstSeated = await seatCounts();
const hitsAfterEntry = hits;
console.log(`on entry: header "${firstOnline}", hero ${firstSeated.hero ?? '?'} seated, row "${firstSeated.row ?? '?'} seated", ${hitsAfterEntry} fetch(es)\n`);

// The payload changes with no interaction and, crucially, no reload.
phase = 'after';
await page.waitForTimeout(7000);

const polled = hits > hitsAfterEntry;
step('/api/lobby is re-fetched while the lobby is open', polled,
  `${hits - hitsAfterEntry} fetch(es) in 7s`
  + (at.length > 1 ? `, gaps ${at.slice(1).map((t, i) => `${((t - at[i]) / 1000).toFixed(1)}s`).join(' ')}` : ''));

const secondOnline = await online();
step('the header chip shows the new count without a reload',
  /123/.test(secondOnline), `"${firstOnline}" -> "${secondOnline}"`);

const secondSeated = await seatCounts();
step('the seat count shows the new figure without a reload',
  secondSeated.hero === '4' && secondSeated.row === '4',
  `hero ${firstSeated.hero ?? '?'} -> ${secondSeated.hero ?? '?'}, row ${firstSeated.row ?? '?'} -> ${secondSeated.row ?? '?'}`);

/* A reload must not be what fixed it. If the figures above only moved because
   something re-mounted the page, this would be the same bug with extra steps. */
const reloads = await page.evaluate(() => performance.getEntriesByType('navigation').length);
step('no reload happened', reloads === 1, `${reloads} navigation entr(y/ies)`);

/* Leaving the screen has to stop the traffic; go() clears jkTimer and stkTimer
   the same way, and an interval that outlives its screen is a leak.
 *
 * That the navigation WORKED is asserted before the traffic is counted. A
 * click that misses its button leaves the page on the lobby, where the poll is
 * supposed to still be running — so this step would "fail" on a leak that is
 * not there, which is worse than not checking at all. */
const left = await click('leaderboard', 1800);
const stillLobby = await page.locator('.su-stakes').count();
if (!left || stillLobby) {
  console.log(`SKIP  leaving the lobby stops the polling — could not leave the lobby${stillLobby ? ' (stake ladder still on screen)' : ''}`);
} else {
  const before = hits;
  await page.waitForTimeout(7000);
  step('leaving the lobby stops the polling', hits === before, `${hits - before} fetch(es) in 7s after leaving`);
}

await browser.close();
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} checks passed`);
process.exit(bad ? 1 : 0);
