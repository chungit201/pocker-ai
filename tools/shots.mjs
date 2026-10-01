/* Captures the screens that need clicks to reach, for a visual once-over. */
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:3001';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const steps = [['play now', 'lobby'], ['staking', 'staking'], ['leaderboard', 'leaderboard'], ['tournaments', 'tournaments']];
for (const [label, name] of steps) {
  await page.locator(`button:has-text("${label}")`).first().click().catch(() => {});
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `tools/out/screen-${name}.png` });
  console.log(`tools/out/screen-${name}.png`);
}
await browser.close();
