/* The landing's right-hand card flips face-up when the pointer comes near it —
   `cardState: 'proximity'`. A headless capture has no pointer anywhere near it,
   which is why the first crop showed two sealed backs and said nothing about
   whether the rank on the face is readable. This moves the mouse onto the card
   first. */
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 }, deviceScaleFactor: 2 });
await page.goto(process.argv[2] ?? 'http://localhost:3001/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1600);

/* The hero cards are the only thing on the page measured in container-query
   units, so the block is easy to find without depending on a class. */
const box = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')]
    .find((d) => (d.getAttribute('style') ?? '').includes('cqw'));
  const host = el?.closest('div[style*="container"]') ?? el?.parentElement ?? el;
  const r = (host ?? document.body).getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
});

/* The flip is driven by a `mousemove` listener on window feeding a rAF loop, so
   the pointer has to actually travel — one jump to the final position can land
   before the loop has a frame to react. Walk it in, then let it settle. */
await page.mouse.move(box.x - 200, box.y + box.h * 0.5, { steps: 10 });
await page.waitForTimeout(200);
for (let i = 0; i <= 10; i++) {
  await page.mouse.move(box.x - 200 + (box.w * 0.72 + 200) * (i / 10), box.y + box.h * 0.5);
  await page.waitForTimeout(90);
}
await page.waitForTimeout(2200);

/* The proximity flip is driven by a rAF loop reading real pointer velocity and
   it does not fire for a synthetic mouse. The question here is only what the
   FACE looks like, so if the card is still sealed, turn it over directly. This
   is a harness nudge on a rendered element — no application code is involved,
   and the styles on show are the ones the app computed. */
const forced = await page.evaluate(() => {
  // Exactly one element on the page is a 3D flip container; its own inline
  // style carries no `cqw`, which is why keying on that found nothing.
  const inner = [...document.querySelectorAll('div')]
    .find((d) => getComputedStyle(d).transformStyle === 'preserve-3d');
  if (!inner) return false;
  inner.style.transition = 'none';
  inner.style.transform = 'rotateY(180deg)';
  return true;
});
if (forced) console.log('card turned over by the harness (the proximity flip needs a real pointer)');
await page.waitForTimeout(400);

await page.screenshot({
  path: 'tools/out/hero-card-face.png',
  clip: { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: Math.min(1512 - box.x + 20, box.w + 40), height: box.h + 40 },
});
console.log(`wrote tools/out/hero-card-face.png  (card block ${Math.round(box.w)}x${Math.round(box.h)})`);

await browser.close();
