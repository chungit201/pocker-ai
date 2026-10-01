/* Records the exact DOM every screen renders, so a refactor can be shown to
 * have changed nothing.
 *
 * Splitting a 4 900-line component into nineteen files is only safe if the
 * output is identical afterwards, and "it still looks right" is not a check —
 * it is how a dropped element or a closed-up gap survives into production. The
 * port was held to a DOM diff against the original; the same bar applies here.
 *
 *   node tools/snapshot.mjs before     # writes tools/snap/before.json
 *   …refactor…
 *   node tools/snapshot.mjs after      # writes after.json and diffs the two
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const name = process.argv[2] ?? 'snap';
const url = process.argv[3] ?? 'http://localhost:3001';
const DIR = 'tools/snap';

/* Every tag, class and inline declaration, in tree order. Inline styles are
   sorted, because property order is not meaningful and two code paths can emit
   the same style in a different sequence. */
const CAPTURE = () => {
  const walk = (el) => ({
    tag: el.tagName.toLowerCase(),
    cls: el.getAttribute('class') ?? '',
    style: (el.getAttribute('style') ?? '').split(';').map((s) => s.trim()).filter(Boolean).sort().join(';'),
    text: [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''),
    kids: [...el.children].map(walk),
  });
  const root = document.getElementById('dc-root');
  return root ? { total: root.querySelectorAll('*').length, tree: walk(root) } : { error: 'no #dc-root' };
};

const SCREENS = [
  { label: null, as: 'landing' },
  { label: 'play now', as: 'lobby' },
  { label: 'tournaments', as: 'tournaments' },
  { label: 'leaderboard', as: 'leaderboard' },
  { label: 'staking', as: 'staking' },
  { label: 'more', as: 'more menu' },
  { label: 'settings', as: 'settings' },
  { label: 'lobby', as: 'back to lobby' },
  { label: 'join $0.01', as: 'connect' },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const snap = {};
for (const s of SCREENS) {
  if (s.label) {
    const el = page.locator(`button:has-text("${s.label}")`).first();
    if (await el.count()) { await el.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1000); }
  }
  snap[s.as] = await page.evaluate(CAPTURE);
}
await browser.close();

mkdirSync(DIR, { recursive: true });
writeFileSync(`${DIR}/${name}.json`, JSON.stringify(snap, null, 1), 'utf8');
console.log(`wrote ${DIR}/${name}.json`);
for (const [k, v] of Object.entries(snap)) console.log(`  ${k.padEnd(16)} ${v.total ?? '—'} elements`);

/* ── diff, when there is something to diff against ───────────────────────── */
const prev = `${DIR}/before.json`;
if (name === 'after' && existsSync(prev)) {
  const before = JSON.parse(readFileSync(prev, 'utf8'));

  /* Mask what is supposed to differ between two loads. The hand's commit digest
     is freshly generated each time and the staking page counts down to
     midnight, so comparing them raw reports noise on three screens and buries
     anything real. */
  const norm = (t) => (t ?? '')
    .replace(/\b[0-9a-f]{4}(?:·[0-9a-f]{4})+\b/gi, '‹hash›')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, '‹time›')
    .replace(/\b\d+h \d+m\b/g, '‹left›');

  const diffs = [];
  const cmp = (a, b, path) => {
    if (diffs.length > 40) return;
    if (!a || !b) { diffs.push(`${path}: present in only one`); return; }
    if (a.tag !== b.tag) { diffs.push(`${path}: <${a.tag}> vs <${b.tag}>`); return; }
    if (a.cls !== b.cls) diffs.push(`${path} <${a.tag}>: class "${a.cls}" vs "${b.cls}"`);
    if (a.style !== b.style) diffs.push(`${path} <${a.tag}>: style differs`);
    if (norm(a.text) !== norm(b.text)) diffs.push(`${path} <${a.tag}>: text ${JSON.stringify(a.text)} vs ${JSON.stringify(b.text)}`);
    const n = Math.max(a.kids.length, b.kids.length);
    for (let i = 0; i < n; i++) cmp(a.kids[i], b.kids[i], `${path}/${a.tag}[${i}]`);
  };

  console.log('\n── diff against before.json');
  let bad = 0;
  for (const k of Object.keys(before)) {
    diffs.length = 0;
    cmp(before[k].tree, snap[k]?.tree, '');
    const same = diffs.length === 0 && before[k].total === snap[k]?.total;
    if (!same) bad++;
    console.log(`  ${same ? 'same' : 'DIFF'}  ${k.padEnd(16)} ${before[k].total} → ${snap[k]?.total}`);
    for (const d of diffs.slice(0, 6)) console.log(`          ${d}`);
  }
  console.log(bad ? `\n${bad} screen(s) changed` : '\nevery screen identical');
  process.exitCode = bad ? 1 : 0;
}
