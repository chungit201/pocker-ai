/* Throwaway: signs in, sits, and dumps what the card faces actually look like
   in the DOM, so the rank check in probe-live.mjs is written against reality
   rather than against a guess. */
import { chromium } from 'playwright';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const url = 'http://localhost:3001';
const account = privateKeyToAccount(generatePrivateKey());
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });

await page.exposeFunction('__probeSign', async (hex) => account.signMessage({ message: { raw: hex } }));
await page.addInitScript(({ address }) => {
  const provider = {
    isMetaMask: true, _events: {},
    async request({ method, params }) {
      switch (method) {
        case 'eth_requestAccounts': case 'eth_accounts': return [address];
        case 'eth_chainId': return '0xb626';
        case 'personal_sign': return window.__probeSign(params[0]);
        default: return null;
      }
    },
    on() {}, removeListener() {},
  };
  window.ethereum = provider;
  const w = { info: { uuid: 'peek', name: 'Peek', icon: 'data:image/svg+xml,%3Csvg/%3E', rdns: 'peek.w' }, provider };
  const go = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze(w) }));
  window.addEventListener('eip6963:requestProvider', go); go();
}, { address: account.address });

const click = async (label, wait = 1500) => {
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
await page.locator('button').filter({ hasText: /·\s*evm\s*DETECTED$/i }).first().click().catch(() => {});
await page.waitForTimeout(6000);
await click('play now', 2000);
await click('join', 5000);
await click('take your seat', 8000);

// Watch a while so a hand gets dealt and cards turn face-up.
const seen = new Set();
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(2000);
  const dump = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('div,span')) {
      if (getComputedStyle(el).position !== 'absolute') continue;
      const t = (el.textContent ?? '').trim();
      if (!/^(10|[2-9TJQKA])$/.test(t)) continue;
      const card = el.parentElement?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (!card || r.width < 2) continue;
      out.push({ t, w: +r.width.toFixed(1), fits: r.right <= card.right + 0.5 });
    }
    return out;
  });
  for (const d of dump) seen.add(`${d.t}(${d.w}px${d.fits ? '' : ' OVERFLOWS'})`);
  if (dump.length) {
    console.log(`tick ${i}: ${dump.map((d) => d.t).join(' ')}`);
    await page.screenshot({ path: `tools/out/peek-cards.png` });
    if ([...seen].some((s) => s.startsWith('10('))) { console.log('\nsaw a ten — stopping'); break; }
  }
}
console.log(`\nranks seen: ${[...seen].sort().join('  ') || 'none'}`);

const leave = page.locator('button').filter({ hasText: /^leave$/i }).first();
if (await leave.count()) await leave.click().catch(() => {});
await page.waitForTimeout(2000);
await browser.close();
