/* Does a SOLANA wallet session survive a page reload?
 *
 * The EVM half is covered by tools/probe-reload.mjs and passes. Solana is the
 * untested half and the more likely one to break, because its resume path is
 * different in two ways:
 *
 *   • `resumeProvider()` in engine/wallet.ts handles `kind === 'evm'` and
 *     returns for anything else, so no Solana handle is re-established.
 *   • the wallet adapter is mounted with `autoConnect={false}`, so the wallet
 *     is not reconnected either.
 *
 * Neither should cost the SESSION — that lives in a token in localStorage —
 * but "should" is what this is for.
 *
 * The signature is real. A mock that returns 64 zero bytes gets a correct 401
 * from the gateway and never reaches the state worth testing, so the mock
 * wallet here holds an ed25519 key and signs with it, exactly as the EVM probe
 * signs with secp256k1.
 *
 *   node tools/probe-reload-solana.mjs [url]
 */
import { chromium } from 'playwright';
import { ed25519 } from '@noble/curves/ed25519';
import bs58 from 'bs58';
import { randomBytes } from 'node:crypto';

const url = process.argv[2] ?? 'http://localhost:3001';
const secret = randomBytes(32);
const pubkey = ed25519.getPublicKey(secret);
const address = bs58.encode(pubkey);

const results = [];
const step = (name, ok, note) => {
  results.push({ name, ok });
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${name}${note ? ` — ${note}` : ''}`);
};

console.log(`signing as: ${address}\n`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });

const calls = [];
page.on('response', (r) => {
  const p = new URL(r.url()).pathname;
  if (p.startsWith('/api/auth/') || p === '/api/me') calls.push(`${p}→${r.status()}`);
});

// Signing happens in Node; the page only asks for it.
await page.exposeFunction('__solSign', async (bytes) =>
  Array.from(ed25519.sign(Uint8Array.from(bytes), secret)));

await page.addInitScript(({ addr, pk }) => {
  const key = Uint8Array.from(pk);
  const account = {
    address: addr,
    publicKey: key,
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
        signMessage: async ({ message }) => {
          const sig = await window.__solSign(Array.from(message));
          return [{ signedMessage: message, signature: Uint8Array.from(sig) }];
        },
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
}, { addr: address, pk: Array.from(pubkey) });

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
const signedIn = () => page.evaluate(() =>
  /[1-9A-HJ-NP-Za-km-z]{4}…[1-9A-HJ-NP-Za-km-z]{4}|0x[0-9a-fA-F]{2,}…/.test(document.body.innerText));

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await click('play now', 2200);
await click('connect a wallet', 1800);
const tab = page.locator('button:has-text("Solana")').first();
if (await tab.count()) { await tab.click().catch(() => {}); await page.waitForTimeout(900); }
const row = page.locator('button').filter({ hasText: /DETECTED/ }).first();
if (!(await row.count())) { console.error('the Solana mock was not discovered'); await browser.close(); process.exit(1); }
await row.click().catch(() => {});
await page.waitForTimeout(7000);

const before = await session();
step('solana sign-in mints a session', !!before?.t && await signedIn(),
  before?.t ? `label "${before.l}"` : `nothing stored · ${calls.join(' ')}`);
if (!before?.t) {
  console.log(`\nauth calls: ${calls.join('  ')}`);
  await page.screenshot({ path: 'tools/out/reload-solana.png' });
  await browser.close();
  process.exit(1);
}

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4500);
const after = await session();
step('survives a reload', !!after?.t && await signedIn(),
  after?.t ? 'still signed in' : 'the session was dropped');

console.log(`\nauth/me calls: ${calls.join('  ')}`);
await page.screenshot({ path: 'tools/out/reload-solana.png' });
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
