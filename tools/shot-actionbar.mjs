/* A tight, 2x crop of the action bar on the hero's turn — the earlier captures
   were a 1512px-wide strip scaled down, where a crimson plate and a steel one
   are four pixels apart and indistinguishable. */
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 }, deviceScaleFactor: 2 });
const click = async (label, wait = 900) => {
  const el = page.locator(`button:has-text("${label}")`).first();
  if (await el.count()) { await el.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(wait); }
};
await page.goto(process.argv[2] ?? 'http://localhost:3001', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await click('play now'); await click('join $0.01');
await click('browser wallet', 2600); await click('choose a table', 1200);
await click('quick join', 1500); await click('take your seat', 4000);
for (let i = 0; i < 60; i++) {
  if (await page.evaluate(() => /your action/i.test(document.body.innerText || ''))) break;
  await page.waitForTimeout(1000);
}
await page.waitForTimeout(300);

const box = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /^f?fold$/i.test((x.textContent || '').trim()));
  const tray = b?.closest('div')?.parentElement;
  const r = (tray ?? document.body).getBoundingClientRect();
  return { x: Math.max(0, r.left - 8), y: Math.max(0, r.top - 14), width: Math.min(1512, r.width + 16), height: r.height + 28 };
});

await page.screenshot({ path: 'tools/out/actionbar.png', clip: box });
console.log(`wrote tools/out/actionbar.png  ${Math.round(box.width)}x${Math.round(box.height)} at 2x`);
await browser.close();
