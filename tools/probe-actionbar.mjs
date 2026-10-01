/* Reads the action bar out of the live DOM: which element carries which style.
   The screenshots stopped changing while the generated source plainly had, so
   the question is whether the new values reach the element at all. */
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });
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

const out = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
    .filter((b) => b.getBoundingClientRect().top > 760)
    .map((b) => ({
      text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18),
      bg: getComputedStyle(b).backgroundImage.slice(0, 64) || getComputedStyle(b).backgroundColor,
      radius: getComputedStyle(b).borderRadius,
      h: Math.round(b.getBoundingClientRect().height),
    }));
  const fig = [...document.querySelectorAll('span')]
    .find((s) => /BB$/.test((s.textContent || '').trim()));
  return {
    btns,
    figure: fig ? { text: fig.textContent.trim(), size: getComputedStyle(fig).fontSize, family: getComputedStyle(fig).fontFamily.slice(0, 40) } : null,
  };
});

console.log('buttons in the action bar:');
for (const b of out.btns) console.log(`  ${b.text.padEnd(18)} h=${String(b.h).padStart(3)}  r=${b.radius.padEnd(8)} ${b.bg}`);
console.log(`\nthe wagered figure: ${JSON.stringify(out.figure)}`);

await browser.close();
