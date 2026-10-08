/* Is the docs page on the same grid as the header?
 *
 *   node tools/probe-docs-layout.mjs [url] [width] [height]
 *
 * The complaint was that the docs layout "doesn't line up with the header",
 * which is the kind of thing a screenshot shows and does not explain. These
 * are the numbers behind it.
 *
 * Everything off the felt is laid out on a fixed 1512x850 design canvas and
 * fitted to the viewport by `--su-scale`, applied as `zoom` through the
 * `.su-stage` class (globals.css, and `measureStage` in SuitedApp). A screen
 * that does not carry that class is drawn at 1:1 beside a header that is not —
 * so on a wide window the header grows and the page does not, and no edge on
 * one has anything to do with an edge on the other.
 *
 * So the check is: the docs nav's left edge against the header's left edge,
 * the article's right edge against the header's, and the effective zoom of
 * each. A gutter that matches at one window size and not another is the
 * signature of exactly this bug, which is why the size is an argument and two
 * are run.
 */
import { chromium } from 'playwright';

/* audit-contrast.mjs walks eight screens and docs is not one of them, so the
   longest piece of prose in the app has never had its text measured. Nothing
   here changed a colour, but a page whose only check is "does it line up"
   invites the next change to be a colour. */
import { AUDIT, describe } from './lib/contrast.mjs';

const url = process.argv[2] ?? 'http://localhost:3001';
const sizes = process.argv[3]
  ? [[Number(process.argv[3]), Number(process.argv[4] ?? 1021)]]
  : [[2000, 1021], [1512, 850]];

const browser = await chromium.launch();
const results = [];
const step = (name, ok, note) => {
  results.push({ name, ok });
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${name}${note ? ` — ${note}` : ''}`);
};

for (const [w, h] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`${url}/docs`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);

  const m = await page.evaluate(() => {
    const zoomOf = (el) => {
      let z = 1;
      for (let n = el; n; n = n.parentElement) {
        const v = parseFloat(getComputedStyle(n).zoom);
        if (v && v !== 1) z *= v;
      }
      return +z.toFixed(3);
    };
    const nav = document.querySelector('.su-nav');
    // The docs shell: the flex row holding the contents rail and the article.
    const rail = [...document.querySelectorAll('nav')].find((n) => /CONTENTS/i.test(n.textContent || ''));
    const article = document.querySelector('[data-docs-body], nav + div > div') || null;
    /* Both boxes, because the two questions here want different ones and
       mixing them invents a four-pixel error out of ordinary padding.
     *
       Whether two columns sit on the same grid is a BORDER box question — the
       rail and the header bar start where their boxes start. Where the reader
       sees text begin is a CONTENT box question: the article carries its
       gutter as padding, so its border box runs hard against the rail while
       the words sit 64px in, and measuring the border box there reports a zero
       gap that is true about the wrong edge. */
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const z = zoomOf(el);
      const pl = parseFloat(cs.paddingLeft) * z || 0;
      const pr = parseFloat(cs.paddingRight) * z || 0;
      return {
        left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), zoom: z,
        textLeft: Math.round(r.left + pl), textRight: Math.round(r.right - pr),
      };
    };
    /* The header's inner gutter, read off the logo rather than off the bar —
       the bar is full-bleed, so its own left edge is 0 and says nothing. */
    const logo = nav && nav.querySelector('button, a');
    return {
      scale: getComputedStyle(document.documentElement).getPropertyValue('--su-scale').trim(),
      header: box(nav),
      logo: box(logo),
      rail: box(rail),
      article: box(article),
      vw: window.innerWidth,
    };
  });

  console.log(`\n── ${w}x${h}  (--su-scale ${m.scale}) ──`);
  for (const k of ['header', 'logo', 'rail', 'article']) {
    const b = m[k];
    console.log(`  ${k.padEnd(8)} ${b ? `box ${String(b.left).padStart(5)}–${String(b.right).padEnd(5)} text ${String(b.textLeft).padStart(5)}–${String(b.textRight).padEnd(5)} zoom ${b.zoom}` : '(not found)'}`);
  }

  if (m.logo && m.rail) {
    /* The one number the eye actually reads: the contents rail and the header's
       first item should start on the same vertical. Two pixels of rounding is
       fine; forty is the bug. */
    const d = Math.abs(m.rail.left - m.logo.left);
    step(`${w}px — the contents rail starts on the header's left edge`, d <= 4, `off by ${d}px`);
  }
  /* Only above the breakpoint. Below it the rail is a drawer ABOVE the article,
     so the horizontal distance between them is negative and means nothing —
     the drawer checks below are what that layout is judged on. */
  if (m.article && m.rail && w > 940) {
    /* Even margins either side of the column — which only became a sensible
       thing to ask for once the column was 860px wide. Centring a 550px ribbon
       (the shape before that) put a moat beside the rail as wide as the rail;
       centring a wide column puts a modest, equal margin on both sides, which
       is what "balanced" was asked for. */
    const leftGap = m.article.left - m.rail.right;
    const rightGap = (m.header.textRight) - m.article.right;
    step(`${w}px — the column sits evenly between the rail and the right gutter`,
      Math.abs(leftGap - rightGap) <= 16,
      `left ${Math.round(leftGap)}, right ${Math.round(rightGap)}`);
  }
  if (m.header && m.article) {
    step(`${w}px — the page is scaled like the header`, m.header.zoom === m.article.zoom,
      `header zoom ${m.header.zoom}, article zoom ${m.article.zoom}`);
  }

  /* Below the breakpoint the rail is a drawer, and the question is whether it
     is actually shut. It was not: a flex item's default `min-height: auto` is
     its content height in a column container, and a minimum beats a maximum,
     so `max-height: 0` collapsed nothing. Measured rather than inspected,
     because the style that was being overridden was computed, not written. */
  if (w <= 940) {
    const navH = () => page.evaluate(() => {
      const n = document.querySelector('.su-docs-nav');
      return n ? Math.round(n.getBoundingClientRect().height) : -1;
    });
    const shut = await navH();
    step(`${w}px — the contents drawer starts shut`, shut === 0, `${shut}px tall`);
    const toggle = page.locator('.su-docs-toggle');
    step(`${w}px — the drawer has a way to open it`, await toggle.count() === 1 && await toggle.isVisible());
    await toggle.click().catch(() => {});
    await page.waitForTimeout(500);
    const open = await navH();
    step(`${w}px — it opens`, open > 100, `${open}px tall`);
    await toggle.click().catch(() => {});
    await page.waitForTimeout(500);
    const shutAgain = await navH();
    step(`${w}px — and shuts again`, shutAgain === 0, `${shutAgain}px tall`);
  }

  const unreadable = await page.evaluate(AUDIT);
  step(`${w}px — every word on the page clears WCAG`, !unreadable.length, `${unreadable.length} unreadable`);
  for (const b of unreadable.slice(0, 6)) console.log(`       ${describe(b)}`);

  await page.screenshot({ path: `tools/out/docs-${w}.png` });
  console.log(`  screenshot → tools/out/docs-${w}.png`);
  await page.close();
}

await browser.close();
const bad = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - bad}/${results.length} checks passed`);
process.exit(bad ? 1 : 0);
