/* The losing tab, when a table is opened twice — fe-seats-and-tabs.md §5.
 *
 *   node tools/probe-one-tab.mjs [url]       # needs npm run dev
 *
 * The gateway only sends this under ONE_TAB=1, which is off by default and is
 * meant to stay off until the FE handles it — so waiting for the server to
 * produce the case would mean never testing the thing that has to be ready
 * first. The two signals are delivered to the live socket instead: the
 * `other_session` error frame, then a close with code 4002. Everything after
 * that is the app's own code path, untouched.
 *
 * What has to be true, and why each one bites:
 *
 *   stops      no redial. This is the whole point of the feature: a tab that
 *              reconnects takes the table back off the other tab, which
 *              reconnects in turn, and the pair trade the socket until the
 *              gateway's rate limit parks them both on "reconnecting".
 *   explains   the overlay says the table is open elsewhere, rather than the
 *              "Reconnecting · your seat is held" scrim, which would be a
 *              promise about something that is not happening.
 *   offers     a way back. Without it the tab is simply dead, which is what
 *              this looks like from the player's side.
 *   returns    pressing it dials again — and only then.
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
  /* Every table socket, kept so the test can speak to the live one. The app is
     otherwise untouched: these are real connections doing real work, and the
     takeover is delivered through the same handlers the gateway would reach. */
  window.__socks = [];
  const Real = window.WebSocket;
  const Patched = function (u, p) {
    const ws = p === undefined ? new Real(u) : new Real(u, p);
    if (/\/ws\?/.test(String(u))) window.__socks.push(ws);
    return ws;
  };
  Patched.prototype = Real.prototype;
  for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) Patched[k] = Real[k];
  window.WebSocket = Patched;

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
  const w = { info: { uuid: 'tab-0001', name: 'Tab Probe', icon, rdns: 'probe.tab' }, provider };
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
const sockCount = () => page.evaluate(() => window.__socks.length);

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await click('play now', 2400);
await click('connect a wallet', 1800);
const ethTab = page.locator('button:has-text("Ethereum")').first();
if (await ethTab.count()) { await ethTab.click().catch(() => {}); await page.waitForTimeout(900); }
const evmRow = page.locator('button').filter({ hasText: /DETECTED/ }).first();
if (await evmRow.count()) { await evmRow.click().catch(() => {}); await page.waitForTimeout(7000); }
await click('Quick join', 4000);
await click('Take your seat', 7000);
await page.waitForTimeout(2500);

if (!await sockCount()) {
  console.log('FAIL  no table socket was opened — nothing below could run');
  await browser.close();
  process.exit(1);
}

/* ── the other tab takes the table ─────────────────────────────────────── */
const openedBefore = await sockCount();
await page.evaluate(() => {
  const ws = window.__socks[window.__socks.length - 1];
  // The order the gateway uses: the frame explains it, the close enforces it.
  ws.onmessage && ws.onmessage({ data: JSON.stringify({ t: 'error', code: 'other_session', message: 'opened elsewhere' }) });
  ws.onclose && ws.onclose({ code: 4002, reason: 'other session' });
});
/* Well past the 400ms first backoff — a redial would have happened several
   times over by now, so a flat count is evidence rather than a near miss. */
await page.waitForTimeout(6000);

const openedAfter = await sockCount();
step('the losing tab stops redialling', openedAfter === openedBefore,
  `${openedAfter - openedBefore} new socket(s) in 6s`);

const text = await bodyText();
step('it says the table is open in another tab', /open in another tab/i.test(text),
  (text.match(/Open in another tab[^·]*·[^.]*/i) || ['(not shown)'])[0].trim());
step('it does NOT claim to be reconnecting', !/Reconnecting/i.test(text));

const useThis = page.locator('button:has-text("Use this tab")').first();
const offered = await useThis.count() === 1 && await useThis.isVisible();
step('it offers a way back', offered);

if (offered) {
  await useThis.click().catch(() => {});
  await page.waitForTimeout(3000);
  const openedFinal = await sockCount();
  step('"Use this tab" dials again — and nothing else did', openedFinal > openedAfter,
    `${openedFinal - openedAfter} new socket(s) after the click`);
}

/* The seat is the other half of §5: a takeover must not cash anybody out. */
const stillSeated = await page.evaluate(() => /\/table\//.test(location.pathname));
step('the seat is untouched — still at the table', stillSeated);

await click('leave', 4000);
await browser.close();
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} checks passed`);
process.exit(bad ? 1 : 0);
