/* Writes a page that plays every generated clip, so the set can be auditioned
   before it ships. Open tools/out/sound-sheet.html in a browser.

   This exists because the thing that matters about a sound set cannot be
   checked by any assertion: whether it sounds right. The probes can tell you a
   file decodes and is the length it claims; only a person can tell you the
   chip click sounds like a chip.

     node tools/sound-sheet.mjs
*/
import { readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'public/sounds';
const OUT = 'tools/out/sound-sheet.html';

let files;
try { files = readdirSync(DIR).filter((f) => f.endsWith('.mp3')).sort(); }
catch { console.error(`no ${DIR} — run node tools/gen-sounds.mjs first`); process.exit(1); }
if (!files.length) { console.error(`${DIR} is empty`); process.exit(1); }

/* The mix weights the player applies on top of peak normalisation, repeated
   here so the sheet is honest about what you will actually hear in the game —
   a raw clip played at full scale is not it. Kept in step with MIX in
   src/engine/sound.ts by hand; they are two lines apart in practice. */
const MIX = {
  hover: 0.22, ui: 0.45, lowTime: 0.5, peel: 0.5,
  deal: 0.6, flip: 0.6, chip: 0.6, check: 0.6, seat: 0.6, error: 0.55, fold: 0.6, turnStart: 0.6,
  chips: 0.7, bet: 0.7, lose: 0.65, badbeat: 0.65,
  alert: 0.8, win: 0.85, allin: 0.9, potwin: 0.9, bigwin: 1,
};

const rows = files.map((f) => {
  const name = f.replace(/\.mp3$/, '');
  const kb = (statSync(join(DIR, f)).size / 1024).toFixed(1);
  const mix = MIX[name] ?? 0.6;
  return `  <tr>
    <td class="n">${name}</td>
    <td class="m">${mix}</td>
    <td class="s">${kb} KB</td>
    <td><audio controls preload="none" src="../../${DIR}/${f}"></audio></td>
  </tr>`;
}).join('\n');

mkdirSync('tools/out', { recursive: true });
writeFileSync(OUT, `<!doctype html>
<meta charset="utf-8">
<title>suited — sound set</title>
<style>
  body { background:#0a0d16; color:#e8ecf8; font:14px/1.5 system-ui,sans-serif; margin:40px auto; max-width:760px }
  h1 { font-weight:600; letter-spacing:-.02em; margin:0 0 4px }
  p { color:#94a3c4; margin:0 0 28px }
  table { border-collapse:collapse; width:100% }
  td { padding:9px 10px; border-bottom:1px solid rgba(232,236,248,.12); vertical-align:middle }
  .n { font-weight:500; width:120px }
  .m, .s { color:#94a3c4; width:80px; font-variant-numeric:tabular-nums }
  audio { width:100%; height:34px }
</style>
<h1>suited — sound set</h1>
<p>${files.length} clips from <code>public/sounds/</code>. <strong>mix</strong> is the level the
game plays each one at, after peak-normalising; these previews are at full
scale, so quiet voices will sound louder here than in play.</p>
<table>
<tr><td class="n"><b>name</b></td><td class="m"><b>mix</b></td><td class="s"><b>size</b></td><td></td></tr>
${rows}
</table>
`);

console.log(`${files.length} clips → ${OUT}`);
console.log('open it in a browser to listen to the set.');
