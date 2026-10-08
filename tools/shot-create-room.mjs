/* The create-a-room sheet, both of its steps, at 2x.
 *
 *   node tools/shot-create-room.mjs [url]       # needs npm run dev
 *
 * It needs a signed-in session — the button sends a visitor to the connect
 * screen instead of opening — so this signs in the way tools/probe-live.mjs
 * does, with a throwaway key the gateway's faucet funds. Nothing is created:
 * the form is photographed filled but not submitted, and the second shot comes
 * from actually creating one, because the "Room ready" step cannot be reached
 * any other way.
 *
 * Writes tools/out/create-room-form.png and create-room-ready.png — a tight
 * crop of the sheet, not the page, so a change to its padding is visible
 * rather than being three percent of a 1512px screenshot.
 */
import { chromium } from 'playwright';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

/* This sheet is behind a sign-in, so tools/audit-contrast.mjs — which walks the
   app cold — has never once measured it. That gap is not theoretical: a label
   colour on this sheet was dimmed to #7884a1, measured 4.22:1 against its own
   panel, and looked completely fine in the screenshots below. A screenshot
   cannot tell you that, which is the whole reason the audit exists. So the
   shot tool carries the audit the last two steps, the way probe-live.mjs does
   for the seat screen and the felt. */
import { AUDIT, describe } from './lib/contrast.mjs';

const url = process.argv[2] ?? 'http://localhost:3001';
const account = privateKeyToAccount(generatePrivateKey());

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 950 }, deviceScaleFactor: 2 });

await page.exposeFunction('__shotSign', async (hex) => account.signMessage({ message: { raw: hex } }));
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
        case 'personal_sign': return window.__shotSign(params[0]);
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
  const w = { info: { uuid: 'shot-0001', name: 'Shot Probe', icon, rdns: 'probe.shot' }, provider };
  const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze(w) }));
  window.addEventListener('eip6963:requestProvider', announce);
  announce();
}, { address: account.address });

const click = async (label, wait = 1500) => {
  const el = page.locator(`button:has-text("${label}")`).first();
  if (!(await el.count())) return false;
  await el.click({ timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(wait);
  return true;
};

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await click('play now', 2200);
await click('connect a wallet', 1800);
// The connect screen does not open on Ethereum, and the injected provider is
// an EVM one — without this the DETECTED row is on the tab that is not showing.
const ethTab = page.locator('button:has-text("Ethereum")').first();
if (await ethTab.count()) { await ethTab.click().catch(() => {}); await page.waitForTimeout(900); }
const evmRow = page.locator('button').filter({ hasText: /DETECTED/ }).first();
if (await evmRow.count()) { await evmRow.click().catch(() => {}); await page.waitForTimeout(7000); }

/* The audit walks the whole document, and the lobby behind the backdrop has
   failures of its own (its selected stake row, violet-on-violet). Reporting
   those here would make this tool red for something it did not touch and
   useless as a gate, so what the SHEET adds is measured instead: the lobby's
   own rows are keyed first, and only rows that were not already there get
   reported once the sheet is up. */
// The row's real field names — `colour` and `on`, not `fg`/`bg`. Getting these
// wrong leaves every key ending in "undefined|undefined", which still mostly
// works off the text and quietly stops discriminating by colour.
const key = (b) => `${b.text}|${b.colour}|${b.on}|${b.size}`;
const before = new Set((await page.evaluate(AUDIT)).map(key));

if (!await click('Create a private room', 1800)) {
  console.error('could not open the create-room sheet — not signed in?');
  await browser.close();
  process.exit(1);
}

/* The sheet is the only child of the backdrop that stops propagation; found by
   its heading so a change to the markup around it does not silently crop the
   wrong box. */
const sheetBox = async () => page.evaluate(() => {
  const h = [...document.querySelectorAll('h2')].find((x) => /Create a room|Room ready/.test(x.textContent || ''));
  const el = h && h.closest('div')?.parentElement;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const pad = 26;
  return { x: r.x - pad, y: r.y - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
});

const fill = async (placeholder, value) => {
  const el = page.locator(`input[placeholder="${placeholder}"]`).first();
  if (await el.count()) await el.fill(value);
};
/* Keyed to the placeholders the sheet actually uses. They are the field's own
   example value now rather than its name ("0.05", not "Small blind"), so a
   stale key here silently fills nothing and photographs an empty form — which
   is a believable-looking screenshot of the wrong thing. */
await fill('Friday night', 'Friday night');
await fill('0.05', '0.05');
await fill('0.10', '0.10');
await fill('2', '2');
await fill('10', '10');
await page.locator('input[inputmode="numeric"]').last().fill('4821').catch(() => {});
await page.waitForTimeout(500);

let bad = 0;
const audit = async (label) => {
  const rows = (await page.evaluate(AUDIT)).filter((b) => !before.has(key(b)));
  if (!rows.length) { console.log(`  ok  ${label} — every label clears WCAG`); return; }
  console.log(`  FAIL ${label} — ${rows.length} unreadable`);
  for (const b of rows.slice(0, 6)) console.log(`       ${describe(b)}`);
  bad += rows.length;
};

let box = await sheetBox();
if (box) await page.screenshot({ path: 'tools/out/create-room-form.png', clip: box });
console.log('tools/out/create-room-form.png');
await audit('the form');

await click('Create room', 6000);
box = await sheetBox();
if (box) await page.screenshot({ path: 'tools/out/create-room-ready.png', clip: box });
console.log('tools/out/create-room-ready.png');
await audit('room ready');

await browser.close();
process.exit(bad ? 1 : 0);
