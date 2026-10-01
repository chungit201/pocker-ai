import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
const r = await p.evaluate(() => {
  // Hero/board card is 66x94; the rank sits at left 12% with font-size 30% of
  // the height, in the app's serif.
  const cw = 66, ch = 94, left = cw * 0.12, size = ch * 0.3;
  const probe = document.createElement('span');
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:'Instrument Serif', Georgia, serif;font-size:${size}px;line-height:1`;
  document.body.appendChild(probe);
  const out = {};
  for (const t of ['10', 'T', 'A', 'Q', 'W']) { probe.textContent = t; out[t] = +probe.getBoundingClientRect().width.toFixed(1); }
  probe.remove();
  return { left, size, cw, widths: out, rightEdgeOf10: +(left + out['10']).toFixed(1) };
});
console.log(JSON.stringify(r, null, 2));
await b.close();
