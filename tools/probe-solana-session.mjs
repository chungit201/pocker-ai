/* Can the app look connected while holding no session?
 *
 * The connect screen opens on the Solana tab, and this gateway still refuses a
 * Solana sign-in — `/api/auth/challenge` with `chain:"solana"` answers 400
 * "that is not an address", because its `isAddr` check is EVM-only. If the UI
 * takes "the wallet adapter has a public key" as "signed in", a Solana user
 * sees a connected header with no token behind it: everything works until the
 * page reloads, at which point the adapter state is gone, there is no token to
 * restore, and they are signed out. That is indistinguishable, from the
 * player's side, from "reloading logs me out".
 *
 * This drives the Solana path with a Wallet Standard mock and reports the two
 * facts separately: what the screen claims, and what is actually stored.
 *
 *   node tools/probe-solana-session.mjs [url]
 */
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:3001';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });

const calls = [];
page.on('response', (r) => {
  const p = new URL(r.url()).pathname;
  if (p.startsWith('/api/auth/')) calls.push(`${p} → ${r.status()}`);
});

/* A Wallet Standard wallet, which is how Phantom and friends announce
   themselves. Enough of the interface to be discovered, selected, connected
   and asked for a signature. `solana:signTransaction` and its
   `supportedTransactionVersions` are both required or wallet-adapter filters
   it out before it can be chosen — see docs/wallet-sign-in.md. */
await page.addInitScript(() => {
  const KEY = new Uint8Array(32).fill(7);
  const account = {
    address: '8xwEVf8y5UBmm3b2Z5Tn5oE8nqLxnZkxvSBYkzWvxkLv',
    publicKey: KEY,
    chains: ['solana:mainnet'],
    features: ['solana:signMessage', 'solana:signTransaction'],
  };
  const wallet = {
    version: '1.0.0',
    name: 'Mock Phantom',
    icon: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#ab9ff2"/></svg>'),
    chains: ['solana:mainnet'],
    accounts: [account],
    features: {
      'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [account] }) },
      'standard:events': { version: '1.0.0', on: () => () => {} },
      'solana:signMessage': {
        version: '1.0.0',
        signMessage: async ({ message }) => [{ signedMessage: message, signature: new Uint8Array(64).fill(9) }],
      },
      'solana:signTransaction': {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signTransaction: async ({ transaction }) => [{ signedTransaction: transaction }],
      },
    },
  };
  const register = (api) => { try { api.register(wallet); } catch { /* rejected */ } };
  window.addEventListener('wallet-standard:app-ready', (e) => register(e.detail));
  window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: register }));
});

const click = async (label, wait = 1800) => {
  const el = page.locator(`button:has-text("${label}")`).first();
  if (!(await el.count())) return false;
  await el.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(wait);
  return true;
};

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await click('play now', 2200);
await click('connect a wallet', 1800);

const tab = page.locator('button:has-text("Solana")').first();
if (await tab.count()) { await tab.click().catch(() => {}); await page.waitForTimeout(900); }

const row = page.locator('button').filter({ hasText: /DETECTED/ }).first();
if (!(await row.count())) {
  console.log('no DETECTED Solana wallet — the mock was not discovered, nothing to test');
  await browser.close();
  process.exit(1);
}
console.log(`clicking: ${(await row.innerText()).replace(/\s+/g, ' ').trim()}`);
await row.click().catch(() => {});
await page.waitForTimeout(7000);

const state = await page.evaluate(() => {
  const raw = localStorage.getItem('suited:session');
  const body = document.body.innerText.replace(/\s+/g, ' ');
  return {
    session: raw ? JSON.parse(raw) : null,
    looksConnected: /[1-9A-HJ-NP-Za-km-z]{4}…[1-9A-HJ-NP-Za-km-z]{4}|0x[0-9a-fA-F]{2,}…/.test(body),
    onConnectScreen: /connect a wallet/i.test(body),
    note: (body.match(/(refused|failed|expired|not an address|could not|error)[^.]{0,70}/i) ?? [])[0] ?? null,
  };
});

console.log(`\nauth calls: ${calls.join('  ') || '(none)'}`);
console.log(`screen says connected: ${state.looksConnected}`);
console.log(`session stored:        ${state.session ? 'yes' : 'NO'}`);
if (state.note) console.log(`message on screen:     "${state.note}"`);

let bad = 0;
if (state.looksConnected && !state.session) {
  console.log('\nFAIL  the app shows a connected wallet with no session behind it.');
  console.log('      This is the reload bug: nothing is stored, so a refresh signs you out.');
  bad++;
} else if (!state.looksConnected && !state.session) {
  console.log('\n ok   sign-in failed and the app says so — no false "connected" state.');
} else if (state.session) {
  console.log('\n ok   a real session was stored; Solana sign-in works against this gateway.');
}

await page.screenshot({ path: 'tools/out/solana-session.png' });
await browser.close();
process.exit(bad ? 1 : 0);
