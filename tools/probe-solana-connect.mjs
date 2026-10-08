/* Reproduces "WalletConnectionError: Unexpected error" and checks it is now
   readable.
 *
 *   node tools/probe-solana-connect.mjs [url]      # needs npm run dev
 *
 * The bug it was written for: a Solana connect failed with exactly that line
 * and nothing else — no code, no layer, no reason. The message is the WALLET's
 * own ("Unexpected error" is an extension's way of saying "no reason given");
 * `wallet-standard-wallet-adapter-base/adapter.js:224` wraps it as
 * `new WalletConnectionError(error?.message, error)`, keeping the real error on
 * `.error`, and the app reported only the wrapper. The cause was being thrown
 * away before anyone could read it.
 *
 * It cannot be reproduced with a real wallet — Playwright has no extension, and
 * an extension that fails on demand is not a thing you can ask for. So a
 * Wallet Standard wallet is registered from an init script and its
 * `standard:connect` rejects the way a real one did: message "Unexpected
 * error", `code: -32603`, and a cause underneath that actually says something.
 * Discovery is genuine — the app has no idea this wallet is a fake, it arrives
 * over the same `wallet-standard:register-wallet` event Phantom uses.
 *
 * What is checked:
 *
 *   discovered  the fake wallet reaches the connect screen at all, which is
 *               also a live test of Solana wallet discovery
 *   unwrapped   the surfaced error names the code and the underlying reason,
 *               not just "Unexpected error"
 *   onError     the provider's own log carries the same chain
 */
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:3001';
const WALLET = 'ProbeWallet';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });

const logs = [];
page.on('console', (m) => logs.push(m.text()));
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));

await page.addInitScript((name) => {
  /* A wallet that fails the way the reported one did. `code` and the nested
     cause are the parts the old reporting discarded, so they are what the
     assertions look for. */
  const fail = () => {
    const inner = new Error('the extension is locked');
    const err = new Error('Unexpected error');
    err.code = -32603;
    err.cause = inner;
    return err;
  };

  const wallet = {
    version: '1.0.0',
    name,
    // Wallet Standard requires a data URI; the content is irrelevant here.
    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=',
    chains: ['solana:mainnet', 'solana:devnet'],
    accounts: [],
    features: {
      /* The three features `isWalletAdapterCompatibleStandardWallet` demands —
         without all of them the adapter ignores the wallet and the row never
         appears, which would make this probe pass by accident. */
      'standard:connect': { version: '1.0.0', connect: async () => { throw fail(); } },
      'standard:events': { version: '1.0.0', on: () => () => {} },
      'solana:signTransaction': {
        version: '1.0.0',
        supportedTransactionVersions: ['legacy', 0],
        signTransaction: async () => { throw fail(); },
      },
      'solana:signMessage': { version: '1.0.0', signMessage: async () => { throw fail(); } },
    },
  };

  /* Both halves of the handshake, because the order is not ours to choose: a
     wallet that loads first announces itself and is ignored, so it must also
     wait for the app to say it is listening. Real wallets do exactly this. */
  const callback = ({ register }) => { try { register(wallet); } catch { /* already registered */ } };
  try { window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: callback })); } catch { /* */ }
  try { window.addEventListener('wallet-standard:app-ready', ({ detail }) => callback(detail)); } catch { /* */ }
}, WALLET);

const results = [];
const step = (name, ok, note) => {
  results.push({ name, ok });
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${name}${note ? ` — ${note}` : ''}`);
};

const click = async (label, wait = 1600) => {
  const el = page.locator(`button:has-text("${label}")`).first();
  if (!(await el.count())) return false;
  await el.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(wait);
  return true;
};

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await click('play now', 2200);
await click('connect a wallet', 2000);
// The connect screen splits the chains; Solana rows are behind its own tab
// where one exists.
const solTab = page.locator('button:has-text("Solana")').first();
if (await solTab.count()) { await solTab.click().catch(() => {}); await page.waitForTimeout(1000); }

const row = page.locator('button').filter({ hasText: new RegExp(WALLET, 'i') }).first();
const found = await row.count();
step('the fake Solana wallet reached the connect screen', !!found,
  found ? 'discovery works, so the row below is a real click' : 'no row — discovery or the connect screen changed');
if (!found) {
  console.log(`\nsolana wallets the bridge logged: ${logs.filter((l) => l.includes('[wallet] solana')).join(' | ') || 'nothing'}`);
  await browser.close();
  process.exit(1);
}

await row.click().catch(() => {});

/* The failure is reported as a toast, which expires. Reading the page once a
   few seconds later finds an empty screen and concludes nothing was shown —
   which is a probe bug that looks exactly like the defect. So poll, and keep
   the first frame that mentions the failure. */
let shown = '';
for (let i = 0; i < 40 && !shown; i++) {
  const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  if (/refused to connect|Unexpected error|locked|32603/i.test(text)) shown = text;
  else await page.waitForTimeout(200);
}

const onScreen = shown.match(/[^·|]*(refused to connect)[^·|]*/i)?.[0]?.trim()
  ?? shown.match(/[^·|]*(Unexpected error|locked|32603)[^·|]*/i)?.[0]?.trim()
  ?? '(nothing about the failure)';
console.log(`\nwhat the player is shown: ${onScreen}\n`);

const walletLog = logs.filter((l) => /\[wallet\] solana/.test(l) && /Unexpected|32603|locked/.test(l));

/* On screen and in the console are checked separately on purpose. A cause that
   only reaches the console is better than nothing and still means the person
   looking at the failure sees a bare "Unexpected error". */
step('the player is told the reason, not just that it failed',
  /32603/.test(shown) && /locked/i.test(shown),
  shown ? `code ${/32603/.test(shown) ? 'yes' : 'NO'}, cause ${/locked/i.test(shown) ? 'yes' : 'NO'}` : 'nothing was shown at all');
step('the provider\'s onError logs the unwrapped chain', !!walletLog.length,
  walletLog[0] ? walletLog[0].split('\n')[0].slice(0, 150) : 'no [wallet] solana line carrying the failure');

await browser.close();
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} checks passed`);
process.exit(bad ? 1 : 0);
