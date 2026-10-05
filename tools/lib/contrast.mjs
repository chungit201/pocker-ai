/* The contrast measurement itself, shared by every tool that wants it.
 *
 * It lives apart from tools/audit-contrast.mjs because that file launches a
 * browser at import time, and the screens most at risk — the seat screen, the
 * table — can only be reached with a signed-in session, which is
 * tools/probe-live.mjs's job rather than the audit walker's. Splitting it means
 * both can measure the same way instead of one of them growing its own copy.
 *
 * AUDIT is passed to page.evaluate(), so it must be entirely self-contained:
 * nothing in it may close over anything in this module.
 */

/** Returns every text node below the WCAG threshold, as plain objects. */
export const AUDIT = () => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => {
    const n = (s.match(/[\d.]+/g) ?? []).map(Number);
    return { rgb: n.slice(0, 3), a: n.length > 3 ? n[3] : 1 };
  };
  const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a));
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return +((x + 0.05) / (y + 0.05)).toFixed(2);
  };

  /* Nearly every filled control in this app is painted with a gradient, not a
     background-color — so reading backgroundColor alone sees straight through a
     violet button to the page behind it and calls its label unreadable. The
     mean of a gradient's stops is a good enough stand-in for what the text
     actually sits on. */
  const gradientMean = (bgImage) => {
    if (!/gradient\(/.test(bgImage)) return null;
    const stops = [...bgImage.matchAll(/rgba?\(([^)]+)\)/g)]
      .map((m) => m[1].split(',').map(Number))
      .filter((n) => n.length >= 3 && (n.length < 4 || n[3] > 0.15));
    if (!stops.length) return null;
    return [0, 1, 2].map((i) => Math.round(stops.reduce((a, s) => a + s[i], 0) / stops.length));
  };

  /** What is actually behind this element, climbing past transparent layers. */
  const backdrop = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      const grad = gradientMean(cs.backgroundImage);
      if (grad) return grad;
      const c = parse(cs.backgroundColor);
      if (c.a >= 0.6) return over(c, [10, 13, 22]);
      node = node.parentElement;
    }
    return [10, 13, 22];
  };

  const out = [];
  for (const el of document.querySelectorAll('*')) {
    // only elements with their own visible text
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (!own) continue;
    /* `aria-hidden` is the author saying "this is not content". The drifting
       suit glyphs behind every screen are text nodes by accident of being
       characters rather than shapes, and holding them to a reading threshold
       is wrong twice over: they are meant to be barely there, and 40 of them
       drowned out the four real findings on the lobby. Honoured here rather
       than listed as exceptions, so it keeps working as the backdrop changes. */
    if (el.closest('[aria-hidden="true"]')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.25) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;

    const fg = parse(cs.color);
    if (fg.a < 0.25) continue;
    const bg = backdrop(el);
    const c = ratio(over(fg, bg), bg);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    const floor = large ? 3 : 4.5;
    if (c < floor) out.push({ text: own.slice(0, 46), colour: cs.color, on: `rgb(${bg.map(Math.round).join(',')})`, c, size, floor });
  }
  return out;
};

/** One finding, formatted the way audit-contrast.mjs prints them. */
export const describe = (b) =>
  `${String(b.c).padStart(6)}:1 (needs ${b.floor})  "${b.text}"\n`
  + `            ${b.colour} on ${b.on}  @${b.size}px`;
