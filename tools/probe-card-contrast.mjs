/* Is the rank readable on the card face?
 *
 * Asked of the DOM rather than of a screenshot, because the landing's face only
 * flips into view on pointer proximity and a headless run never triggers it.
 * The element is in the document either way, so its colours — and the contrast
 * between them — can be measured directly.
 *
 * Reports WCAG contrast ratio. 4.5 is the threshold for body text; a large
 * display glyph like a card rank wants at least 3, and really wants much more. */
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });
await page.goto(process.argv[2] ?? 'http://localhost:3001/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const out = await page.evaluate(() => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => (s.match(/\d+/g) ?? []).slice(0, 3).map(Number);
  const ratio = (a, b) => {
    const [x, y] = [lum(parse(a)), lum(parse(b))].sort((p, q) => q - p);
    return +((x + 0.05) / (y + 0.05)).toFixed(2);
  };

  /* The hero cards are the only block measured in container-query units. */
  const sides = [...document.querySelectorAll('div')]
    .filter((d) => (d.getAttribute('style') ?? '').includes('backface-visibility')
                || (d.style && d.style.backfaceVisibility === 'hidden'));

  const rows = [];
  for (const side of sides) {
    const bg = getComputedStyle(side).backgroundColor;
    for (const mark of side.querySelectorAll('span, path, polygon')) {
      const cs = getComputedStyle(mark);
      const ink = mark.tagName === 'SPAN' ? cs.color : cs.fill;
      if (!ink || ink === 'none') continue;
      const text = (mark.textContent || '').trim().slice(0, 4);
      rows.push({
        what: mark.tagName.toLowerCase() + (text ? ` "${text}"` : ''),
        on: bg, ink, contrast: ratio(ink, bg),
      });
    }
  }
  return rows;
});

console.log('marks drawn on a card side, and their contrast against it:\n');
for (const r of out) {
  const verdict = r.contrast >= 4.5 ? 'good' : r.contrast >= 3 ? 'thin' : 'UNREADABLE';
  console.log(`  ${verdict.padEnd(11)} ${String(r.contrast).padStart(6)}:1   ${r.what.padEnd(12)} ${r.ink} on ${r.on}`);
}
if (!out.length) console.log('  (no card sides found)');

await browser.close();
process.exitCode = out.some((r) => r.contrast < 3) ? 1 : 0;
