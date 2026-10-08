/* One seat per account, end to end — docs: fe-seats-and-tabs.md.
 *
 *   node tools/probe-one-seat.mjs [url]      # needs npm run dev
 *
 * Signs in with a real signature, takes a seat, and then checks the four
 * things the FE is responsible for:
 *
 *   seats      /api/me reports the seat, with `leaving: false`
 *   redirect   the landing page sends a seated player back to their table
 *   lobby      the held-seat banner is up and every Join is inert
 *   leave      POST /api/seat/leave closes it, and the lobby opens back up
 *
 * The redirect check is the one worth having: it is the only piece here that
 * is not a direct translation of a server field, and the failure mode — a
 * player with chips on a table landing on the marketing page — is silent.
 *
 * The key is generated per run; the gateway is play money.
 */
import { chromium } from 'playwright';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const url = process.argv[2] ?? 'http://localhost:3001';
const account = privateKeyToAccount(generatePrivateKey());
console.log(`signing as: ${account.address}\n`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 950 } });

const results = [];
const step = (name, ok, note) => {
  results.push({ name, ok });
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${name}${note ? ` — ${note}` : ''}`);
};

await page.exposeFunction('__probeSign', async (hex) => account.signMessage({ message: { raw: hex } }));
await page.addInitScript(({ address }) => {
  const provider = {
    isMetaMask: true,
    _events: {},
    async request({ method, params }) {
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts': return [address];
        case 'eth_chainId': return '0xb626';
        case 'net_version': return '46630';
        case 'personal_sign': return window.__probeSign(params[0]);
        case 'wallet_switchEthereumChain': return null;
        default: return null;
      }
    },
    on(ev, fn) { (this._events[ev] ??= []).push(fn); },
    removeListener() {},
  };
  window.ethereum = provider;
  const icon = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#f6851b"/></svg>');
  const w = { info: { uuid: 'seat-0001', name: 'Seat Probe', icon, rdns: 'probe.seat' }, provider };
  const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze(w) }));
  window.addEventListener('eip6963:requestProvider', announce);
  announce();
}, { address: account.address });

const click = async (label, wait = 1600) => {
  const el = page.locator(`button:has-text("${label}")`).first();
  if (!(await el.count())) return false;
  await el.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(wait);
  return true;
};
const bodyText = async () => (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
/* The session token, read the way the app stores it (`{ t, l, e }` under its
   own key — see `persist` in engine/wallet.ts). Hunting for "a long string" in
   localStorage instead silently finds nothing and every call below 401s. */
const me = () => page.evaluate(async () => {
  let tok = null;
  for (const k of Object.keys(localStorage)) {
    try { const v = JSON.parse(localStorage.getItem(k)); if (v && typeof v.t === 'string' && v.t.length > 40) { tok = v.t; break; } } catch { /* not ours */ }
  }
  if (!tok) return { err: 'no session token' };
  return fetch('/api/me', { headers: { authorization: `Bearer ${tok}` } }).then((r) => r.json());
});

/* ── sign in and sit ───────────────────────────────────────────────────── */
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await click('play now', 2400);
await click('connect a wallet', 1800);
const ethTab = page.locator('button:has-text("Ethereum")').first();
if (await ethTab.count()) { await ethTab.click().catch(() => {}); await page.waitForTimeout(900); }
const evmRow = page.locator('button').filter({ hasText: /DETECTED/ }).first();
if (await evmRow.count()) { await evmRow.click().catch(() => {}); await page.waitForTimeout(7000); }

const before = await me();
if (before.err || !Array.isArray(before.seats)) {
  console.log(`FAIL  the gateway does not report seats — ${JSON.stringify(before).slice(0, 160)}`);
  await browser.close();
  process.exit(1);
}

await click('Quick join', 4000);
await click('Take your seat', 7000);
await page.waitForTimeout(2500);

const seated = await me();
const active = (seated.seats || []).find((s) => s && !s.leaving);
step('the seat shows up in /api/me', !!active,
  active ? `${active.name || active.tableId}` : `seats = ${JSON.stringify(seated.seats)}`);
if (!active) {
  console.log('      nothing below can run without a seat');
  await browser.close();
  process.exit(1);
}

/* ── the landing page sends you back ───────────────────────────────────── */
await page.goto(`${url}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const backAtTable = await page.evaluate(() => location.pathname.startsWith('/table/'));
step('the landing page redirects to the table being played',
  backAtTable, `landed on ${await page.evaluate(() => location.pathname)}`);

/* ── the lobby refuses to seat you twice ───────────────────────────────── */
await click('lobby', 2600);
await page.waitForTimeout(1200);
const text = await bodyText();
step('the lobby says where the seat is', /You are seated at/i.test(text),
  (text.match(/You are seated at[^.]*\./i) || ['(no banner)'])[0]);
const liveJoins = await page.evaluate(() => [...document.querySelectorAll('.lb-tbl-row button')]
  .filter((b) => /join/i.test(b.textContent || ''))
  .filter((b) => getComputedStyle(b).cursor !== 'not-allowed').length);
step('every other table\'s Join is inert while a seat is held', liveJoins === 0, `${liveJoins} still clickable`);
const quickJoinGone = await page.evaluate(() => [...document.querySelectorAll('button')]
  .filter((b) => /quick join/i.test(b.textContent || ''))
  .every((b) => getComputedStyle(b).display === 'none'));
step('Quick join is withdrawn', quickJoinGone);

/* ── and lets you leave it from here ───────────────────────────────────── */
const left = await click('Leave that table', 4000);
await page.waitForTimeout(2500);
const after = await me();
const stillActive = (after.seats || []).find((s) => s && !s.leaving);
step('leaving from the lobby releases the seat', left && !stillActive,
  left ? `seats = ${JSON.stringify(after.seats)}` : 'no "Leave that table" button');

await browser.close();
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} checks passed`);
process.exit(bad ? 1 : 0);
