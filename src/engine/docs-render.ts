import { DOCS, fillChainWords, parseInline, setDocsChain, tocGroups } from './docs-content';
export { setDocsChain };

/* The docs are the one screen that is pure reading, so the type does the work:
   a running section number, a hairline between sections, and a lot of air. The
   palette is the app's paper surface (Suited.dc.html's PAPER/INK/MUTED/BRASS),
   named here so a tweak lands in one place instead of thirty style strings. */
const T = {
  ink: '#e8ecf8',       // headings
  body: '#e8ecf8',      // prose
  muted: '#94a3c4',     // eyebrows, table headers, notes
  /* The quietest label on the page, and it was too quiet to read: #5b6684 is
     2.77:1 on this background, against the 4.5 small text needs, across 58
     nodes (every section number, every eyebrow). #868fab is 4.91:1 and still
     reads as the quietest thing here. audit-contrast.mjs walks eight screens
     and docs is not one of them, which is why this sat unmeasured. */
  faint: '#868fab',     // section numbers, the quietest label
  brass: '#a78bfa',     // links and the active nav mark
  /* The two hairline weights the page is built from. They were translucent
     near-black because the page was cream; the page is dark now, so the same
     two lines are drawn in light at the same weights. */
  rule: 'rgba(232,236,248,0.15)',
  hair: 'rgba(232,236,248,0.09)',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
};

const el = (tag, style?) => { const n = document.createElement(tag); if (style) n.setAttribute('style', style); return n; };

/* Where the contract-address rows link to, handed in by the page from
   /api/chain's `explorerUrl` (see setDocsExplorer). Null until it answers, and
   on every build that names no explorer — in which case the addresses render as
   the same selectable text they always were, rather than as links to nowhere.
   The domain is never written in this file. */
let explorerUrl = null;

/**
 * Point the address rows at this deployment's explorer. Called once from the
 * page beside `setDocsChain`, with `/api/chain`'s `explorerUrl`.
 */
export function setDocsExplorer(url) {
  explorerUrl = url || null;
}

/** 1 → "01". The running number is the spine of the layout, so it is always two digits. */
const num2 = (n) => String(n).padStart(2, '0');

const EYEBROW = `font-family:${T.mono};font-size:10px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:${T.faint}`;
/** The sidebar's own label face — the page's type, not the mono the body uses. */
const NAV_LABEL = `font-size:10.5px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:${T.muted}`;

export function renderInline(parent, text) {
  // Fill {chain}/{token}/{wallets}/… from the active era before parsing inline
  // grammar — the one chokepoint every placeholder-bearing string flows through.
  for (const tok of parseInline(fillChainWords(text))) {
    if (tok.t === 'text') { parent.appendChild(document.createTextNode(tok.v)); continue; }
    if (tok.t === 'strong') { const b = el('strong', 'font-weight:600;color:' + T.ink); b.textContent = tok.v; parent.appendChild(b); continue; }
    // Mono face only, no chip: horizontal padding on an inline span pushes the
    // punctuation after it away, so `4663`. renders as "4663 ." — and the page
    // is built from hairlines, not little filled panels, anyway.
    if (tok.t === 'code') { const c = el('code', `font-family:${T.mono};font-size:.88em;color:${T.ink}`); c.textContent = tok.v; parent.appendChild(c); continue; }
    if (tok.t === 'link') {
      const a = el('a'); a.textContent = tok.v;
      a.href = tok.href;
      if (tok.href.startsWith('/docs/')) a.dataset.slug = tok.href.slice('/docs/'.length);
      // A link to another page of this app navigates in place; only an outside
      // link opens a new tab.
      else if (!tok.href.startsWith('/')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      a.className = 'docs-a';
      a.setAttribute('style', `color:${T.ink};text-decoration:underline;text-decoration-color:${T.brass};text-decoration-thickness:1px;text-underline-offset:3px`);
      parent.appendChild(a);
    }
  }
}

function block(b) {
  if (b.type === 'heading') {
    const h = el(b.level === 2 ? 'h2' : 'h3', b.level === 2
      ? `font-size:17px;font-weight:600;letter-spacing:-.015em;margin:42px 0 14px;color:${T.ink}`
      : `font-size:14.5px;font-weight:600;margin:26px 0 8px;color:${T.ink}`);
    h.textContent = b.text; return h;
  }
  if (b.type === 'para') { const p = el('p', `margin:0 0 17px;font-size:14.5px;line-height:1.72;color:${T.body}`); renderInline(p, b.text); return p; }
  if (b.type === 'list') {
    const l = el(b.ordered ? 'ol' : 'ul', `margin:0 0 19px;padding-left:20px;font-size:14.5px;line-height:1.72;color:${T.body}`);
    for (const it of b.items) { const li = el('li', 'margin:0 0 9px;padding-left:4px'); renderInline(li, it); l.appendChild(li); }
    return l;
  }
  if (b.type === 'table') {
    const wrap = el('div', 'overflow-x:auto;margin:4px 0 26px');
    const t = el('table', `border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;font-size:14px;color:${T.body}`);
    const thead = el('thead'); const htr = el('tr');
    for (const h of b.headers) { const th = el('th', `text-align:left;padding:0 20px 10px 0;border-bottom:1px solid ${T.rule};${EYEBROW};white-space:nowrap`); th.textContent = h; htr.appendChild(th); }
    thead.appendChild(htr); t.appendChild(thead);
    const tb = el('tbody');
    for (const r of b.rows) {
      const tr = el('tr');
      r.forEach((c, i) => {
        // The first column is the row's subject — it carries the emphasis so the
        // eye can run down it without the other columns competing.
        const td = el('td', `padding:11px 20px 11px 0;border-bottom:1px solid ${T.hair};line-height:1.5;${i === 0 ? `color:${T.ink};font-weight:500` : ''}`);
        renderInline(td, c); tr.appendChild(td);
      });
      tb.appendChild(tr);
    }
    t.appendChild(tb); wrap.appendChild(t); return wrap;
  }
  if (b.type === 'keyvals') {
    const dl = el('dl', 'margin:4px 0 24px');
    for (const r of b.rows) {
      const dt = el('dt', `font-weight:600;font-size:14.5px;color:${T.ink};margin-top:18px`); dt.textContent = r.term;
      const dd = el('dd', `margin:4px 0 0;font-size:14.5px;line-height:1.68;color:${T.body}`); renderInline(dd, r.def);
      dl.appendChild(dt); dl.appendChild(dd);
    }
    return dl;
  }
  if (b.type === 'callout') {
    const isKey = b.tone === 'key';
    // The "key" tone is the don't-trust-us highlight: brass hairline, no fill,
    // so it reads as an aside in the same paper rather than a coloured card.
    const box = el('div', `margin:6px 0 24px;padding:2px 0 2px 20px;border-left:2px solid ${isKey ? T.brass : T.rule}`);
    /* `T.brass`, not the #7d4cf0 that was here: the same violet family, but
       that one is a FILL colour from the sigil set and as 10px text on this
       background it is 3.13:1. Brass is 5.80:1 and is already what the page
       uses to mark something live. */
    if (b.title) { const t = el('div', `${EYEBROW};color:${isKey ? T.brass : T.faint};margin-bottom:7px`); t.textContent = b.title; box.appendChild(t); }
    const p = el('p', `margin:0;font-size:14.5px;line-height:1.68;color:${T.body}`); renderInline(p, b.text); box.appendChild(p);
    return box;
  }
  if (b.type === 'code') {
    const pre = el('pre', `margin:4px 0 26px;padding:16px 18px;border:1px solid ${T.rule};border-radius:4px;background:rgba(232,236,248,0.04);color:${T.ink};overflow-x:auto;font-family:${T.mono};font-size:12px;line-height:1.6`);
    pre.textContent = b.text; return pre;
  }
  if (b.type === 'steps') {
    const l = el('ol', `margin:4px 0 20px;padding-left:20px;font-size:14.5px;line-height:1.72;color:${T.body}`);
    for (const it of b.items) { const li = el('li', 'margin:0 0 11px;padding-left:4px'); renderInline(li, it); l.appendChild(li); }
    return l;
  }
  if (b.type === 'addresses') {
    // Contract addresses are the one place a reader is expected to leave the
    // page and check for themselves, so each gets its own row: what it is, what
    // it does, and the full address — never truncated — as the link out.
    const wrap = el('div', `margin:4px 0 26px;border-top:1px solid ${T.rule}`);
    for (const r of b.rows) {
      const row = el('div', `padding:16px 0;border-bottom:1px solid ${T.hair}`);
      const name = el('div', `font-size:14.5px;font-weight:600;color:${T.ink}`); name.textContent = r.name;
      row.appendChild(name);
      if (r.note) { const n = el('p', `margin:3px 0 0;font-size:14px;line-height:1.6;color:${T.body}`); renderInline(n, r.note); row.appendChild(n); }
      // A link only where there is an explorer to link to; otherwise the same
      // full address, still selectable and still copyable, without the underline
      // that would promise it goes somewhere.
      const base = `display:inline-block;margin-top:9px;font-family:${T.mono};font-size:12px;line-height:1.5;color:${T.ink};word-break:break-all`;
      const a = el(explorerUrl ? 'a' : 'span', explorerUrl
        ? `${base};text-decoration:underline;text-decoration-color:${T.brass};text-decoration-thickness:1px;text-underline-offset:3px`
        : base);
      if (explorerUrl) {
        a.className = 'docs-a';
        a.href = `${explorerUrl.replace(/\/$/, '')}/address/${r.address}`;
        a.target = '_blank'; a.rel = 'noopener noreferrer';
      }
      a.textContent = r.address;
      row.appendChild(a);
      // The address goes to the explorer; `source` goes to the verified source.
      // Its own line, because a break-all address can end anywhere on the row.
      if (r.source) {
        const s = el('a', `display:block;margin-top:6px;font-size:13.5px;line-height:1.5;color:${T.muted};text-decoration:underline;text-decoration-color:${T.brass};text-decoration-thickness:1px;text-underline-offset:3px`);
        s.className = 'docs-a';
        s.href = r.source; s.target = '_blank'; s.rel = 'noopener noreferrer';
        s.textContent = 'Read the source';
        row.appendChild(s);
      }
      wrap.appendChild(row);
    }
    return wrap;
  }
  return document.createComment('unknown block');
}

/** Flat 01..N numbering across every group, so a section has one stable number. */
function numbered(docs = DOCS) {
  const out = []; let n = 0;
  for (const g of docs) {
    g.sections.forEach((s, i) => out.push({ group: g.group, opensGroup: i === 0, section: s, n: (n += 1) }));
  }
  return out;
}

export function renderNav(container, activeId, onPick) {
  container.textContent = '';
  const head = el('div', `${NAV_LABEL};color:${T.faint};padding:10px 12px 12px;border-bottom:1px solid ${T.hair};margin-bottom:6px`);
  head.textContent = 'Contents';
  container.appendChild(head);

  const numbers = new Map(numbered().map((x) => [x.section.id, x.n]));
  for (const g of tocGroups()) {
    const gh = el('div', `${NAV_LABEL};margin:22px 0 8px;padding:0 12px`);
    gh.textContent = g.group; container.appendChild(gh);
    for (const s of g.sections) {
      const on = s.id === activeId;
      // The active mark is a brass rule in the gutter, not a filled pill — the
      // page is paper, and a tinted block reads as a button on it.
      const a = el('a', `display:flex;gap:10px;align-items:baseline;padding:6px 12px;font-size:13.5px;line-height:1.35;text-decoration:none;`
        + `color:${on ? T.ink : T.muted};font-weight:${on ? '600' : '400'};`
        + `box-shadow:inset 2px 0 0 ${on ? T.brass : 'transparent'};transition:color .15s ease,box-shadow .15s ease`);
      a.className = 'docs-nav-a';
      a.href = `/docs/${s.id}`; a.dataset.slug = s.id;
      const idx = el('span', `font-size:10.5px;font-variant-numeric:tabular-nums;color:${on ? T.brass : T.faint};flex:none`);
      idx.textContent = num2(numbers.get(s.id) ?? 0);
      const label = el('span'); label.textContent = s.title;
      a.appendChild(idx); a.appendChild(label);
      if (on) a.setAttribute('aria-current', 'true');
      a.addEventListener('click', (e) => { e.preventDefault(); onPick(s.id); });
      container.appendChild(a);
    }
  }
}

export function renderBody(container, onPick) {
  container.textContent = '';
  container.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-slug]');
    if (a) { e.preventDefault(); onPick(a.dataset.slug); }
  });

  const mast = el('header', `display:flex;justify-content:space-between;align-items:baseline;gap:20px;flex-wrap:wrap;padding-bottom:14px;border-bottom:1px solid ${T.rule}`);
  const left = el('div', `${EYEBROW};color:${T.muted}`); left.textContent = 'Suited · Documentation';
  const right = el('div', EYEBROW); right.textContent = fillChainWords('{chain}');
  mast.appendChild(left); mast.appendChild(right);
  container.appendChild(mast);

  for (const { group, opensGroup, section: s, n } of numbered()) {
    // A hairline plus a deep top margin is the whole separator: at this measure
    // the number and the air are enough to say "new section".
    const sec = el('section', `scroll-margin-top:12px;padding:${n === 1 ? '40px' : '64px'} 0 8px;${n === 1 ? '' : `border-top:1px solid ${T.rule}`}`);
    sec.id = `docs-${s.id}`;
    // The group name rides the eyebrow only where the group opens, so it reads
    // as a chapter marker instead of repeating itself down every section.
    const eyebrow = el('div', `${EYEBROW};display:flex;gap:12px;align-items:baseline;margin-bottom:14px`);
    const idx = el('span', `color:${T.brass}`); idx.textContent = num2(n);
    eyebrow.appendChild(idx);
    if (opensGroup) { const grp = el('span'); grp.textContent = group; eyebrow.appendChild(grp); }
    sec.appendChild(eyebrow);
    const h = el('h1', 'font-size:28px;font-weight:600;letter-spacing:-.03em;line-height:1.15;margin:0 0 22px;color:' + T.ink);
    h.textContent = s.title; sec.appendChild(h);
    for (const b of s.blocks) sec.appendChild(block(b));
    container.appendChild(sec);
  }
}

export function setupScrollSpy(scroller, ids, onActive) {
  const targets = ids.map((id) => scroller.querySelector(`#docs-${id}`)).filter(Boolean);
  // Which sections currently reach into the top band — not where they were when
  // they got there. An entry only fires when its intersection *changes*, so a
  // position captured at that moment is stale by the next scroll tick; the
  // decision below re-measures the few that are in play instead.
  const inBand = new Set<Element>();
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) inBand.add(en.target);
      else inBand.delete(en.target);
    }
    // Of the sections reaching into that band, the active one is the LAST to
    // have begun — the heading nearest the reading line, which is the one the
    // reader is actually under. Taking the first instead (the old rule) picks
    // whichever long section is still trailing off the top of the screen, which
    // is why deep-linking to /docs/<slug> rewrote the address bar back to the
    // section before it the moment the page settled.
    let active = null, lowest = -Infinity;
    for (const el of inBand) {
      const y = el.getBoundingClientRect().top;
      if (y > lowest) { lowest = y; active = el; }
    }
    if (active) onActive(active.id.replace(/^docs-/, ''));
  }, { root: scroller, rootMargin: '0px 0px -75% 0px', threshold: 0 });
  for (const t of targets) io.observe(t);
  return () => io.disconnect();
}
