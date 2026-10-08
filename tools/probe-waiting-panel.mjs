/* Does "Waiting for others" appear when you are alone at a table — and stay
   away when you are not?
 *
 *   node tools/probe-waiting-panel.mjs [url]      # needs npm run dev
 *
 * Getting a genuinely empty table is the whole difficulty. The offline demo
 * cannot produce one: `seatsFor` in SuitedApp always seats the whole BOTS list
 * beside the hero, so there is never a moment where the hero is alone. So this
 * runs against the real gateway and does what a player would do — signs in with
 * a real signature, opens a PRIVATE ROOM, and takes a seat in it. A room nobody
 * has been invited to is empty by construction, which is exactly the case the
 * panel is for and exactly how it was reported.
 *
 * The key is generated per run and never leaves this process; the gateway is in
 * faucet mode, so this is a throwaway identity on play money.
 *
 * Two checks, and the second is the one that can fail quietly:
 *
 *   shows   the panel, its copy-link button and its way back to the lobby are
 *           on screen at an empty table
 *   hides   it is NOT on screen at a table with other people in it — a panel
 *           that renders unconditionally would pass the first check and ruin
 *           every real game
 */
import { chromium } from 'playwright';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const url = process.argv[2] ?? 'http://localhost:3001';
const account = privateKeyToAccount(generatePrivateKey());
console.log(`signing as: ${account.address}\n`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });

const results = [];
const step = (name, ok, note) => {
  results.push({ name, ok });
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${name}${note ? ` — ${note}` : ''}`);
};

await page.exposeFunction('__probeSign', async (hexMessage) =>
  account.signMessage({ message: { raw: hexMessage } }));

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
  const w = { info: { uuid: 'wait-0001', name: 'Wait Probe', icon, rdns: 'probe.wait' }, provider };
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
const panelUp = async () => /Waiting for others/i.test(await bodyText());

/* ── sign in ───────────────────────────────────────────────────────────── */
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await click('play now', 2200);
await click('connect a wallet', 1800);
/* The connect screen splits the chains and does not open on Ethereum, so the
   injected EVM provider is on the tab that is not showing. Without this the
   DETECTED row below is simply absent and the run reads as "sign-in broken". */
const ethTab = page.locator('button:has-text("Ethereum")').first();
if (await ethTab.count()) { await ethTab.click().catch(() => {}); await page.waitForTimeout(900); }
const evmRow = page.locator('button').filter({ hasText: /DETECTED/ }).first();
if (await evmRow.count()) { await evmRow.click().catch(() => {}); await page.waitForTimeout(7000); }

if (!/lobby/i.test(await bodyText())) {
  console.log('FAIL  could not sign in — nothing below could run');
  await browser.close();
  process.exit(1);
}

/* ── a room with nobody in it ──────────────────────────────────────────── */
await click('Create a private room', 1800);
const fill = async (placeholder, value) => {
  const el = page.locator(`input[placeholder="${placeholder}"]`).first();
  if (await el.count()) await el.fill(value);
};
await fill('Room name (optional)', 'Waiting probe');
await fill('Small blind', '0.05');
await fill('Big blind', '0.1');
await fill('Minimum', '2');
await fill('Maximum', '10');
await fill('6', '6');
// The pin field is the only four-digit one; it has no placeholder of its own.
const pin = page.locator('input[inputmode="numeric"]').last();
if (await pin.count()) await pin.fill('1234');
await page.waitForTimeout(400);

if (!await click('Create room', 6000)) {
  console.log('FAIL  no "Create room" button — the create-room sheet changed');
  await browser.close();
  process.exit(1);
}
/* Two buttons, both called "Take your seat", and they are different steps: the
   first is the created-room sheet's (it opens the table), the second is the
   seat screen's buy-in confirm (it actually sits you down). Clicking only the
   first leaves the run on "Take a seat" with the felt never reached — which
   reads as "the panel did not show" and is really "we never got there". */
if (!await click('Take your seat', 5000)) {
  console.log(`FAIL  the created room would not open — ${(await bodyText()).slice(0, 180)}`);
  await browser.close();
  process.exit(1);
}
const seated = await click('Take your seat', 8000);
if (!seated) {
  console.log(`FAIL  could not confirm the buy-in — ${(await bodyText()).slice(0, 180)}`);
  await browser.close();
  process.exit(1);
}
await page.waitForTimeout(3000);

const alone = await panelUp();
const copyBtn = await page.locator('button:has-text("Copy table link")').count();
const lobbyBtn = await page.locator('button:has-text("Back to the lobby")').count();
step('the panel is shown at an empty table', alone && !!copyBtn && !!lobbyBtn,
  alone ? `copy button ${copyBtn ? 'yes' : 'NO'}, lobby button ${lobbyBtn ? 'yes' : 'NO'}`
        : 'no "Waiting for others" on the felt');
await page.screenshot({ path: 'tools/out/waiting-panel.png' });
console.log('      screenshot → tools/out/waiting-panel.png');

/* The copy button, actually pressed. A button that renders and does nothing
   looks identical in a screenshot, and this one is the whole point of the
   panel — the label flipping to "Link copied" is `copyTableLink` having
   reached the clipboard rather than having thrown. */
if (copyBtn) {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await page.locator('button:has-text("Copy table link")').first().click().catch(() => {});
  await page.waitForTimeout(600);
  const copied = await page.locator('button:has-text("Link copied")').count();
  const link = await page.evaluate(() => navigator.clipboard.readText().catch(() => '')).catch(() => '');
  step('the copy button puts this table\'s link on the clipboard',
    !!copied && /\/table\//.test(link), copied ? (link || 'label flipped, clipboard unreadable in this browser') : 'the label never changed');
}

/* ── and a table that is NOT empty ─────────────────────────────────────── */
/* The negative case matters more than it looks. A panel wired to render
   unconditionally passes everything above and then sits on top of every real
   hand, which is a far worse bug than the one being fixed. */
await click('leave', 4000) || await click('lobby', 2500);
await page.waitForTimeout(1500);
await click('lobby', 2000);
const joined = await click('join', 5000) || await click('quick join', 5000);
if (joined) await click('take your seat', 6000);
await page.waitForTimeout(3000);

const others = await page.evaluate(() => document.body.innerText).then((t) => t.replace(/\s+/g, ' '));
const atBusy = /fold|check|call|dealing|waiting ·/i.test(others);
if (!atBusy) {
  console.log('SKIP  the panel is NOT shown with others present — could not reach a populated table to try');
} else {
  const stillUp = await panelUp();
  step('the panel stays hidden once somebody else is at the table', !stillUp,
    stillUp ? 'it is on screen during a real table, which would cover the felt' : 'hidden, as it should be');
}

/* Give the seat back. The run buys into two tables on a shared play-money
   deployment, and a probe that walks away from a seat leaves it held until the
   gateway's absent-player timer releases it — which is a table nobody else can
   fill in the meantime. probe-live.mjs does the same for the same reason. */
const left = await click('leave', 4000);
console.log(left ? '\ncleanup: seat released' : '\ncleanup: no leave button — the seat will time out on its own');

await browser.close();
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} checks passed`);
process.exit(bad ? 1 : 0);
