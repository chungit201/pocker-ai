/* Does a wallet session survive a page reload?
 *
 * Reported as: connect a wallet, refresh, and you are signed out. The token is
 * kept in localStorage under `suited:session` and adopted synchronously on
 * boot, so if it does not survive, something after boot is throwing it away —
 * and there are several candidates, all of which end in `dropSession()`:
 *
 *   • the stored token failing `tokenLive` (expiry is in ms, not seconds —
 *     checked against Poker-BE, which issues `Date.now() + ttl`)
 *   • `resumeProvider` finding the wallet's account different from the one
 *     the token names
 *   • the account watcher firing `accountsChanged`, which real extensions do
 *     on page load and which reports an EMPTY account list when the wallet is
 *     locked — and an empty list is not the session's key, so it drops
 *
 * The last is the one a mock provider will not reproduce by itself, so this
 * drives all three cases explicitly.
 *
 *   node tools/probe-reload.mjs [url]
 *
 * Signs in with a throwaway key against whatever gateway the app is pointed
 * at. Needs no chips, so it works against the live gateway.
 */
import { chromium } from 'playwright';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const url = process.argv[2] ?? 'http://localhost:3001';
const account = privateKeyToAccount(generatePrivateKey());

const results = [];
const step = (name, ok, note) => {
  results.push({ name, ok });
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${name}${note ? ` — ${note}` : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });
await page.exposeFunction('__probeSign', async (hex) => account.signMessage({ message: { raw: hex } }));

/* A wallet that behaves, plus a switch to make it misbehave the way real ones
   do. `window.__emit` fires an accountsChanged from the test. */
await page.addInitScript(({ address }) => {
  const listeners = {};
  const provider = {
    isMetaMask: true,
    async request({ method, params }) {
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts': return window.__accounts ?? [address];
        case 'eth_chainId': return '0xb626';
        case 'net_version': return '46630';
        case 'personal_sign': return window.__probeSign(params[0]);
        case 'wallet_switchEthereumChain': return null;
        default: return null;
      }
    },
    on(ev, fn) { (listeners[ev] ??= []).push(fn); },
    removeListener(ev, fn) { listeners[ev] = (listeners[ev] ?? []).filter((f) => f !== fn); },
  };
  window.ethereum = provider;
  window.__emit = (ev, arg) => (listeners[ev] ?? []).forEach((f) => f(arg));
  const icon = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#f6851b"/></svg>');
  const w = { info: { uuid: 'reload-01', name: 'Reload Probe', icon, rdns: 'probe.reload' }, provider };
  const go = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze(w) }));
  window.addEventListener('eip6963:requestProvider', go); go();
}, { address: account.address });

const click = async (label, wait = 1800) => {
  const el = page.locator(`button:has-text("${label}")`).first();
  if (!(await el.count())) return false;
  await el.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(wait);
  return true;
};
const session = () => page.evaluate(() => {
  const raw = localStorage.getItem('suited:session');
  return raw ? JSON.parse(raw) : null;
});
/* "Signed in" as a player would judge it: the header shows an address rather
   than the connect button. Reading storage alone would miss a session that is
   present but which the app has stopped believing in. */
const signedIn = () => page.evaluate(() => /0x[0-9a-fA-F]{2,}…/.test(document.body.innerText));

/* ── sign in ───────────────────────────────────────────────────────────────── */
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await click('play now', 2200);
await click('connect a wallet', 1800);
const tab = page.locator('button:has-text("Ethereum")').first();
if (await tab.count()) { await tab.click().catch(() => {}); await page.waitForTimeout(800); }
const row = page.locator('button').filter({ hasText: /DETECTED/ }).first();
if (!(await row.count())) { console.error('no wallet row to click'); await browser.close(); process.exit(1); }
await row.click().catch(() => {});
await page.waitForTimeout(6000);

const before = await session();
step('signed in, session stored', !!before?.t && await signedIn(),
  before ? `label "${before.l}", evmProviderId ${JSON.stringify(before.e)}` : 'nothing in suited:session');
if (!before?.t) { await browser.close(); process.exit(1); }

/* ── a plain reload ────────────────────────────────────────────────────────── */
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
const afterPlain = await session();
step('survives a plain reload', !!afterPlain?.t && await signedIn(),
  afterPlain?.t ? 'still signed in' : 'the session was dropped');

/* ── a reload where the wallet announces itself, as extensions do ──────────── */
if (afterPlain?.t) {
  await page.evaluate((a) => window.__emit('accountsChanged', [a]), account.address);
  await page.waitForTimeout(1500);
  const after = await session();
  step('survives accountsChanged with the same account', !!after?.t && await signedIn(),
    after?.t ? 'still signed in' : 'dropped by its own wallet reporting the account it already had');
}

/* ── the checksummed form of the same address ──────────────────────────────── */
if ((await session())?.t) {
  // Real wallets emit EIP-55 mixed case; the token stores lowercase. If the
  // comparison does not normalise, this ends the session for no reason.
  await page.evaluate((a) => window.__emit('accountsChanged', [a]), account.address);
  await page.waitForTimeout(1200);
  const after = await session();
  step('survives a checksummed address', !!after?.t && await signedIn(),
    after?.t ? 'case is normalised' : 'dropped on a case difference alone');
}

/* ── the wallet is locked: accountsChanged with nothing in it ──────────────── */
if ((await session())?.t) {
  await page.evaluate(() => { window.__accounts = []; window.__emit('accountsChanged', []); });
  await page.waitForTimeout(1500);
  const after = await session();
  console.log(`\nlocking the wallet (accountsChanged []) ${after?.t ? 'kept' : 'ended'} the session`);
  console.log('  — ending it is defensible; the point is whether a RELOAD triggers this path on its own.');
}

await page.screenshot({ path: 'tools/out/reload.png' });
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
