/* Measures the candidate victory cues from tools/gen-win-options.mjs against
   the three that ship, so "clear but not shrill" can be checked rather than
   argued about.
 *
 *   node tools/probe-win-options.mjs
 *
 * The number that matters here is >2kHz — the share of a clip's energy above
 * 2 kHz, which is where the ear is most sensitive and where a cue starts to
 * hurt. docs/sound.md records the first pass at these cues measuring 0.50–0.61
 * there and being reported as painful; the shipping set sits at 0.02–0.12. A
 * candidate near the old figures is a candidate that will hurt, however clear
 * it sounds on one listen at low volume.
 *
 * Unlike probe-sound.mjs this needs no dev server: mp3 has no decoder in Node
 * and there is no ffmpeg on this machine, so the decoding is done by Chromium
 * through Web Audio, exactly as the game does it — but fetch is blocked on
 * file://, so a throwaway static server is stood up for the duration. It
 * serves two directories and nothing else.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, normalize } from 'node:path';

const CAND = 'tools/out/win-options';
const SHIP = 'public/sounds';
const CUES = ['win', 'potwin', 'bigwin'];

if (!existsSync(CAND)) {
  console.error(`no ${CAND} — run node tools/gen-win-options.mjs first`);
  process.exit(1);
}

const clips = [
  ...CUES.filter((c) => existsSync(join(SHIP, `${c}.mp3`))).map((c) => ({ label: `shipping/${c}`, url: `/${SHIP}/${c}.mp3` })),
  ...readdirSync(CAND).filter((f) => f.endsWith('.mp3')).sort()
    .map((f) => ({ label: f.replace(/\.mp3$/, '').replace('-', '/'), url: `/${CAND}/${f}` })),
];
if (!clips.length) { console.error('nothing to measure'); process.exit(1); }

/* Only these two trees are reachable, so a stray request cannot read the repo
   — this server exists to hand Chromium nine mp3s. */
const ALLOW = [normalize(CAND), normalize(SHIP)];
const server = createServer((req, res) => {
  /* A real page at the origin, because the measuring runs inside it: Chromium
     needs a document to evaluate in, and fetch from about:blank or file:// is
     blocked. */
  if (req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>probe</title>');
    return;
  }
  const rel = normalize(decodeURIComponent(req.url.slice(1)));
  if (!ALLOW.some((a) => rel.startsWith(a)) || !rel.endsWith('.mp3')) { res.writeHead(403).end(); return; }
  try {
    res.writeHead(200, { 'content-type': 'audio/mpeg' }).end(readFileSync(rel));
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(base, { waitUntil: 'domcontentloaded' });

const rows = await page.evaluate(async ({ list, base }) => {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const rms = (ch) => { let s = 0; for (let i = 0; i < ch.length; i++) s += ch[i] * ch[i]; return Math.sqrt(s / ch.length); };
  const out = [];
  for (const { label, url } of list) {
    try {
      const res = await fetch(base + url);
      if (!res.ok) { out.push({ label, err: `HTTP ${res.status}` }); continue; }
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      const d = buf.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
      let lead = 0;
      for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > 0.01) { lead = i / buf.sampleRate; break; }
      /* The noise floor, as the RMS of the quietest 20 ms, and what it becomes
         once the player lifts the clip towards a common peak. This matters more
         for a gentle cue than for a loud one: a 0.09-peak clip gets a 10x lift,
         and the lift applies to the hiss as well as to the notes. Gain cannot
         change signal-to-noise, so a hissy take has to be regenerated, not
         turned down. */
      const win = Math.max(1, Math.floor(buf.sampleRate * 0.02));
      let floor = Infinity;
      for (let i = 0; i + win <= d.length; i += win) {
        let sum = 0;
        for (let j = i; j < i + win; j++) sum += d[j] * d[j];
        floor = Math.min(floor, Math.sqrt(sum / win));
      }
      if (floor === Infinity) floor = 0;
      /* Same two bands probe-sound.mjs reports, and for the same reason: above
         4 kHz is hiss and clatter, above 2 kHz is where "piercing" lives. A
         chime can sit low on the first and high on the second. */
      const band = async (hz) => {
        const off = new OfflineAudioContext(1, buf.length, buf.sampleRate);
        const src = off.createBufferSource(); src.buffer = buf;
        const hp = off.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = hz; hp.Q.value = 0.7;
        src.connect(hp); hp.connect(off.destination); src.start();
        return rms((await off.startRendering()).getChannelData(0));
      };
      const all = rms(d);
      out.push({
        label, seconds: +buf.duration.toFixed(2),
        peak: +peak.toFixed(3), lead: +lead.toFixed(3),
        /* 0.9 is the common peak the player normalises towards; see load() in
           src/engine/sound.ts. */
        noise: +(peak > 0.001 ? 0.9 * floor / peak : 0).toFixed(4),
        bright: +(all > 0 ? (await band(4000)) / all : 0).toFixed(2),
        pierce: +(all > 0 ? (await band(2000)) / all : 0).toFixed(2),
      });
    } catch (e) {
      out.push({ label, err: e.message.slice(0, 60) });
    }
  }
  await ctx.close();
  return out;
}, { list: clips, base });

await browser.close();
server.close();

console.log('clip                dur   peak  lead-in  >4kHz  >2kHz   noise');
let bad = 0;
for (const r of rows) {
  if (r.err) { console.log(`${r.label.padEnd(19)} FAIL ${r.err}`); bad++; continue; }
  /* The thresholds docs/sound.md arrived at: 0.02 peak is silence with dither
     on top, the painful first pass measured 0.50+ above 2 kHz, and noise above
     0.03 under a clip's own content is audible as hiss. */
  const flags = [
    r.peak < 0.02 ? 'SILENT' : '',
    r.lead > r.seconds * 0.5 ? 'MOSTLY SILENT' : '',
    r.pierce > 0.35 ? 'SHRILL' : '',
    r.noise > 0.03 ? 'HISSY' : '',
  ].filter(Boolean);
  if (flags.length) bad++;
  const dB = r.noise > 0 ? `${(20 * Math.log10(r.noise)).toFixed(0)}dB` : '-inf';
  console.log(`${r.label.padEnd(19)} ${String(r.seconds).padStart(5)} ${String(r.peak).padStart(6)} ${String(r.lead).padStart(8)} ${String(r.bright).padStart(6)} ${String(r.pierce).padStart(6)} ${dB.padStart(7)}  ${flags.join(' ')}`);
}

const cand = rows.filter((r) => !r.err && !r.label.startsWith('shipping/'));
if (cand.length) {
  const by = {};
  for (const r of cand) (by[r.label.split('/')[0]] ??= []).push(r.pierce);
  console.log('\nmean >2kHz per option (lower is gentler; the shipping set is 0.02–0.12):');
  for (const [opt, xs] of Object.entries(by)) {
    console.log(`  ${opt.padEnd(9)} ${(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2)}`);
  }
}
console.log(`\n${rows.length - bad}/${rows.length} clips clean`);
process.exit(bad ? 1 : 0);
