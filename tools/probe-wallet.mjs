/* Drives the whole sign-in against a fake wallet.
 *
 * There is no real wallet in a headless browser, so one is injected: an
 * EIP-1193 provider that approves everything and returns a syntactically valid
 * signature. That is enough to exercise the half that was actually written —
 * the picker opens, an address comes back, the gateway's challenge is put in
 * front of the wallet, and whatever it signs is posted to /api/auth/verify in
 * the right field. The signature itself is not real and the echo gateway does
 * not check it; see the note in tools/echo-gateway.mjs.
 *
 * Needs the echo gateway on :3000 and the app on :3001 in gateway mode
 * (NEXT_PUBLIC_SUITED_SERVER blank). Point SUITED_BACKEND and
 * NEXT_PUBLIC_SUITED_WS back at localhost:3000 first — .env.local ships aimed
 * at the deployed gateway, which verifies signatures properly and will refuse
 * the 0x11…11 below.
 *
 * For the real thing, see tools/probe-live.mjs: it signs with a genuine key
 * against the deployed gateway, which is the half this file cannot prove.
 */
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:3001';
const ADDRESS = '0x1111111111111111111111111111111111111111';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });

let failures = 0;
const errors = [];
page.on('pageerror', (e) => {
  errors.push(`UNCAUGHT ${e.message}`);
  // The stack is the only thing that says whose fault it is — the integration
  // or the mock below.
  console.log(`\nUNCAUGHT ${e.message}\n${(e.stack ?? '').split('\n').slice(1, 9).join('\n')}\n`);
});
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  if (/^\[(wallet|mock-solana)\]/.test(m.text())) console.log(`  ${m.text()}`);
});

/* The fake wallet. Announced over EIP-6963 as well as on window.ethereum, so
   both the app's own detection and wagmi's injected connector see it.
 *
 * `--no-evm` leaves it out, which is how the connect screen's empty state for
 * Ethereum gets exercised — and the case that used to be papered over by a
 * catch-all picker row that could not actually connect. */
const WITH_EVM = !process.argv.includes('--no-evm');
if (WITH_EVM) await page.addInitScript(({ address }) => {
  const sig = '0x' + '11'.repeat(65);
  const provider = {
    isMetaMask: true,
    _events: {},
    async request({ method }) {
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts': return [address];
        case 'eth_chainId': return '0xb626';          // 46630
        case 'personal_sign': return sig;
        case 'wallet_switchEthereumChain': return null;
        case 'net_version': return '46630';
        default: return null;
      }
    },
    on(ev, fn) { (this._events[ev] ??= []).push(fn); },
    removeListener() {},
  };
  window.ethereum = provider;
  /* TWO wallets, because one was the whole problem: the connect screen used to
     collapse every EVM wallet into a single row named after whichever was
     discovered first, so a browser with MetaMask and Rabby showed only Rabby.
     Both are announced over EIP-6963, which is how wagmi discovers them. */
  const disc = (fill, letter) => 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">'
    + `<circle cx="24" cy="24" r="24" fill="${fill}"/>`
    + `<text x="24" y="33" font-size="26" font-family="sans-serif" fill="#fff" text-anchor="middle">${letter}</text></svg>`);

  const wallets = [
    { info: { uuid: 'test-0001', name: 'Test Wallet', icon: disc('#f6851b', 'T'), rdns: 'test.wallet' }, provider },
    { info: { uuid: 'test-0002', name: 'Second Wallet', icon: disc('#2563eb', 'S'), rdns: 'second.wallet' }, provider },
    /* Announces itself as MetaMask, which is also in WALLET_CATALOGUE. It must
       appear exactly once — DETECTED — and not a second time as an install
       link. Getting that match wrong is invisible until someone who already has
       MetaMask is offered a download for it. */
    { info: { uuid: 'test-0003', name: 'MetaMask', icon: disc('#f6851b', 'M'), rdns: 'io.metamask' }, provider },
  ];
  const announce = () => {
    for (const w of wallets) {
      window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze(w) }));
    }
  };
  window.addEventListener('eip6963:requestProvider', announce);
  announce();
}, { address: ADDRESS });

/* A fake Solana wallet, registered through the Wallet Standard — which is how
   Phantom, Solflare and Backpack announce themselves, and the reason
   @solana/wallet-adapter-react needs no wallet list. Enough of the interface to
   be discovered, connected to, and asked for a signature.
 *
 * `--no-solana` leaves it out, which is the common real case — most browsers
 * have an EVM wallet and no Solana one — and the only way to see the connect
 * screen's empty state for a chain. */
const WITH_SOLANA = !process.argv.includes('--no-solana');
if (WITH_SOLANA) await page.addInitScript(() => {
  const PUBKEY = Uint8Array.from({ length: 32 }, (_, i) => (i * 7 + 3) & 0xff);
  /* A Wallet Standard account. Every field the spec lists is present — an
     earlier version left `icon` as undefined and omitted features the adapter
     reads, and the adapter threw while building its wrapper, which took the
     whole page down. */
  const account = {
    address: '5Hwe5kqSs9VbsL3bBtEBr3tS9xoQ8pqxqkRmA1xWwnp4',
    publicKey: PUBKEY,
    chains: ['solana:devnet'],
    features: ['solana:signMessage', 'solana:signTransaction'],
    label: 'Test Solana',
  };
  let connected = false;
  const listeners = new Set();

  const wallet = {
    version: '1.0.0',
    name: 'Test Solana',
    // A visible icon, for the same reason as the EVM one above: a purple disc
    // with an S, so the connect screen's icon rendering can be seen to work.
    icon: 'data:image/svg+xml;base64,' + btoa(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">'
      + '<circle cx="24" cy="24" r="24" fill="#9945ff"/>'
      + '<text x="24" y="33" font-size="26" font-family="sans-serif" fill="#fff" text-anchor="middle">S</text></svg>'),
    chains: ['solana:devnet'],
    get accounts() { return connected ? [account] : []; },
    features: {
      'standard:connect': {
        version: '1.0.0',
        async connect() { connected = true; listeners.forEach((f) => f({ accounts: [account] })); return { accounts: [account] }; },
      },
      'standard:disconnect': {
        version: '1.0.0',
        async disconnect() { connected = false; listeners.forEach((f) => f({ accounts: [] })); },
      },
      'standard:events': {
        version: '1.0.0',
        on(_event, fn) { listeners.add(fn); return () => listeners.delete(fn); },
      },
      'solana:signMessage': {
        version: '1.0.0',
        async signMessage({ message }) {
          // 64 bytes, the shape of an ed25519 signature. Not a real one.
          const signature = Uint8Array.from({ length: 64 }, (_, i) => (i * 5 + 1) & 0xff);
          return [{ signedMessage: message, signature }];
        },
      },
      /* Required even though sign-in never sends a transaction:
         wallet-adapter only treats a standard wallet as usable when it offers
         signTransaction or signAndSendTransaction, so a message-signing-only
         wallet is filtered out of the list before anything can select it.
         Every real wallet has this; the mock needs it to be discovered at all. */
      'solana:signTransaction': {
        version: '1.0.0',
        /* Not optional. StandardWalletAdapter's constructor reads `.length` off
           this while working out which transaction versions it can offer, so a
           feature without it throws before the adapter exists — which took the
           whole page down, since nothing upstream catches it. */
        supportedTransactionVersions: ['legacy', 0],
        async signTransaction({ transaction }) { return [{ signedTransaction: transaction }]; },
      },
    },
  };

  const register = (api) => {
    try {
      api.register(wallet);
      console.log('[mock-solana] registered');
    } catch (err) {
      console.log(`[mock-solana] register REJECTED: ${err && err.message}`);
    }
  };
  window.addEventListener('wallet-standard:app-ready', (e) => {
    console.log('[mock-solana] app-ready seen');
    register(e.detail);
  });
  window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', { detail: register }));
  console.log('[mock-solana] announced');
});

/* Not `networkidle`: against a real gateway the app polls and the network never
   goes idle, so this times out on a page that rendered fine. Same reasoning as
   tools/verify.mjs. */
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2400);

const step = async (label, wait = 1200) => {
  const el = page.locator(`button:has-text("${label}")`).first();
  if (!(await el.count())) {
    const seen = await page.evaluate(() => [...document.querySelectorAll('button')]
      .filter((b) => b.offsetParent).map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean));
    console.log(`  no "${label}". Available: ${[...new Set(seen)].join(' | ')}`);
    return false;
  }
  await el.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(wait);
  return true;
};

console.log('walking to the connect screen…');
await step('play now');
// The echo gateway reports no tables, so every stake reads "full" and the join
// button is not offered. "connect a wallet" reaches the same screen.
await step('connect a wallet', 1600);

const rows = await page.evaluate(() => [...document.querySelectorAll('button')]
  .filter((b) => b.offsetParent).map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean));
console.log(`\nwallet rows offered: ${rows.filter((r) => /evm|solana|wallet/i.test(r)).join(' | ') || '(none)'}`);

/* ── the chain picker ────────────────────────────────────────────────────── */
/* The tabs are "Ethereum" and "Solana". The rows no longer carry the chain in
   their own label — they are "<name> <STATE>" — so the tab is the only thing
   that says which chain the list below belongs to, and it has to be clicked
   before the rows are read. */
const chainTabs = await page.evaluate(() => [...document.querySelectorAll('button')]
  .filter((b) => b.offsetParent && /^(ethereum|solana)$/i.test((b.textContent ?? '').trim()))
  .map((b) => (b.textContent ?? '').trim()));
console.log(`chain tabs: ${chainTabs.join(' | ') || '(none)'}`);

/* A row ends in its state: DETECTED for a wallet the browser announced,
   INSTALL for a catalogue entry it did not have, OPEN APP on a phone, and
   QR · APP for WalletConnect, which is never "in" this browser at all. All of
   them are matched — a row type that stopped rendering would otherwise read as
   a short list rather than as a regression. */
const ROW = /\b(DETECTED|INSTALL|OPEN APP|QR · APP|NOT FOUND)$/;
const rowsFor = async (tab) => {
  // Substring match: the tab holds an empty dot <span>, so its text content
  // picks up whitespace that an anchored regex fails on.
  const t = page.locator(`button:has-text("${tab}")`).first();
  if (await t.count()) { await t.click().catch(() => {}); await page.waitForTimeout(900); }
  return page.evaluate((src) => {
    const re = new RegExp(src);
    return [...document.querySelectorAll('button')]
      .filter((b) => b.offsetParent && re.test((b.textContent ?? '').replace(/\s+/g, ' ').trim()))
      .map((b) => (b.textContent ?? '').replace(/\s+/g, ' ').trim());
  }, ROW.source);
};

/* The note is wrapped by interp() in a <span class="sc-interp">, so the deepest
   element carrying the text is that span, not a childless div. It no longer
   stands in for an empty list — the list is never empty now — but it is still
   the only thing that tells a wallet-less visitor what the INSTALL rows below
   are for. */
const emptyNote = () => page.evaluate(() => {
  const hit = [...document.querySelectorAll('span, div')]
    .filter((d) => /no (solana|ethereum) wallet in this browser/i.test(d.textContent ?? ''))
    .pop();
  return hit ? (hit.textContent ?? '').trim() : null;
});

for (const [tab, shot] of [['solana', WITH_SOLANA ? '' : '-empty'], ['ethereum', WITH_EVM ? '' : '-empty']]) {
  const found = await rowsFor(tab);
  console.log(`  on "${tab}":`.padEnd(17) + (found.join(' | ') || '(empty)'));
  /* The whole point of the catalogue: a chain with nothing installed still
     offers rows. An empty list here is a failure now, not a state to describe. */
  const installs = found.filter((r) => /INSTALL$/i.test(r));
  if (!found.length) {
    console.log('  FAIL:          no rows at all — the catalogue should fill this chain');
    failures++;
  } else if (!found.some((r) => /DETECTED$/i.test(r))) {
    const note = await emptyNote();
    console.log(`  none installed: ${installs.length} install rows offered`);
    if (!note) { console.log('  FAIL:          nothing explains what the install rows are'); failures++; }
  }
  await page.screenshot({
    path: `tools/out/wallet-chain-${tab === 'solana' ? 'solana' : 'evm'}${shot}.png`,
    clip: { x: 300, y: 180, width: 900, height: 560 },
  });
}

/* A wallet that is installed must not also be offered as a download. The mock
   announces itself as MetaMask, which the catalogue also lists, so this is the
   dedup check — and the one place where being too strict and being too loose
   both produce a believable-looking screen. */
if (WITH_EVM) {
  const evmRows = await rowsFor('ethereum');
  const mm = evmRows.filter((r) => /\bmetamask\b/i.test(r));
  const ok = mm.length === 1 && /DETECTED$/i.test(mm[0]);
  console.log(`metamask dedup: ${ok ? 'one row, DETECTED' : `FAIL — ${mm.length} row(s): ${mm.join(' | ') || '(none)'}`}`);
  if (!ok) failures++;
}

/* An install row must actually go somewhere. The click is intercepted rather
   than followed: letting it open the Chrome Web Store for real would make this
   probe depend on Google being up, and would leave a tab behind on every run.
   What matters is the URL the app chose. */
const storeUrl = await page.evaluate(() => {
  const row = [...document.querySelectorAll('button')]
    .find((b) => b.offsetParent && /INSTALL$/i.test((b.textContent ?? '').replace(/\s+/g, ' ').trim()));
  if (!row) return null;
  let asked = null;
  const real = window.open;
  window.open = (u) => { asked = u; return null; };
  row.click();
  window.open = real;
  return asked;
});
if (/^https:\/\/chromewebstore\.google\.com\/detail\//.test(storeUrl ?? '')) {
  console.log(`install link: ${storeUrl}`);
} else {
  console.log(`install link: FAIL — an INSTALL row opened ${storeUrl ?? 'nothing'}`);
  failures++;
}

/* Did the icons actually render? An <img> that failed to decode has
   naturalWidth 0, which is the difference between "the markup is there" and
   "a person sees a logo" — and it is the exact failure mode for the catalogue
   icons, which are files under public/wallets/ rather than data URIs the wallet
   handed over. A typo in a path renders nothing and throws nothing. */
const icons = await page.evaluate(() => [...document.querySelectorAll('img')]
  .filter((i) => i.getAttribute('aria-hidden') === 'true')
  .map((i) => ({ src: (i.src || '').replace(/^.*\//, '').slice(0, 20), w: i.naturalWidth, h: i.naturalHeight })));
const broken = icons.filter((i) => !i.w);
console.log(`wallet icons: ${icons.length ? icons.map((i) => `${i.src} ${i.w}x${i.h}`).join(', ') : '(none rendered)'}`);
if (!icons.length) { console.log('  FAIL: no wallet icon rendered at all'); failures++; }
if (broken.length) { console.log(`  FAIL: ${broken.length} icon(s) in the DOM but blank: ${broken.map((i) => i.src).join(', ')}`); failures++; }
await page.screenshot({ path: 'tools/out/wallet-rows.png', clip: { x: 300, y: 180, width: 900, height: 420 } });

/* The EVM row opens RainbowKit. Its modal is a portal outside #dc-root, so it
   is looked for in the document rather than in the app's tree. */
/* There should be no catch-all picker row. It was removed on purpose: the list
   offers only wallets this browser actually has, so a row that cannot connect
   never appears. Asserted, because losing it was a deliberate trade and
   re-adding it by accident would be hard to notice. */
const catchAll = await page.evaluate(() => [...document.querySelectorAll('button')]
  .filter((b) => b.offsetParent && /another wallet|ethereum wallet/i.test(b.textContent ?? '')).length);
console.log(`catch-all picker row: ${catchAll ? `PRESENT (${catchAll}) — it was meant to be removed` : 'absent, as intended'}`);

/* Sign in with a real EVM wallet. It must be a DETECTED row: the list also
   holds catalogue rows that only open the Chrome Web Store and a WalletConnect
   row that opens a QR code, and clicking either would quietly skip the sign-in
   this probe exists to test. The chain comes from the tab, which rowsFor() has
   just left on "ethereum". */
const evmRow = page.locator('button').filter({ hasText: /DETECTED/ }).first();
if (await evmRow.count()) { await evmRow.click().catch(() => {}); await page.waitForTimeout(3500); }

/* ── the Solana half ─────────────────────────────────────────────────────── */
/* Back to the connect screen and in through the Solana row this time, so both
   chains are exercised in one run. */
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await step('play now');
await step('connect a wallet', 1600);

/* Rows carry no chain in their label any more, so the Solana list is whatever
   is on screen once the Solana tab is selected. Selecting it is the whole
   point: clicking the tab when you meant the row is how the Solana sign-in
   quietly stopped being exercised at all. */
const solRows = await rowsFor('Solana');
console.log(`\nSolana rows offered: ${solRows.join(' | ') || '(none — the Wallet Standard mock was not discovered)'}`);

// DETECTED only, for the same reason as the EVM row above.
const solDetected = page.locator('button').filter({ hasText: /DETECTED/ }).first();
if (await solDetected.count()) {
  await solDetected.click().catch(() => {});
  await page.waitForTimeout(3500);
}

/* What reached the gateway is the real evidence — but only the echo gateway
   keeps this record, and the app is often pointed at the deployed one instead.
   Skipped with a word rather than crashing, so the connect-screen checks above
   stay runnable without any gateway at all. */
const echo = await fetch('http://localhost:3000/__seen').then((r) => r.json()).catch(() => null);
if (!echo) {
  console.log('\nno echo gateway on :3000 — skipping the sign-in evidence.');
  console.log('run `node tools/echo-gateway.mjs` and point SUITED_BACKEND at it to check that half.');
} else {
  const auth = echo.filter((r) => r.path.startsWith('/api/auth/'));
  console.log(`\nsign-in calls that reached the gateway (${auth.length}):`);
  for (const a of auth) console.log(`  ${a.method} ${a.path}`);

  const sessions = await (await fetch('http://localhost:3000/__sessions')).json();
  console.log(`sessions minted: ${sessions.length}`);
  for (const s of sessions) console.log(`  ${s.chain}  ${s.pubkey}`);
}

const real = [...new Set(errors)].filter((e) => !/AudioContext|autoplay|moveto path|404/i.test(e));
if (real.length) { console.log('\nconsole errors:'); for (const e of real.slice(0, 8)) console.log(`  ✗ ${e.slice(0, 180)}`); }

await page.screenshot({ path: 'tools/out/wallet-connect.png' });
console.log('\nwrote tools/out/wallet-connect.png');
await browser.close();

// Non-zero on a failed assertion, so this is usable from a script rather than
// only by reading it.
console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);
