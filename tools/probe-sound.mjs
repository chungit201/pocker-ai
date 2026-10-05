/* Checks the generated sound set the way the game will actually use it.
 *
 * The risk with generated audio is quiet failure: a file that 404s, a clip the
 * browser refuses to decode, or one that decodes to near-silence. All three
 * sound identical in play — nothing happens — and none of them throws.
 *
 * So every clip is fetched from the running app and decoded with the same
 * Web Audio call src/engine/sound.ts uses, then measured:
 *
 *   duration   what came back, against what was asked for
 *   peak       0 means a silent clip, which is a failed generation
 *   lead-in    silence before the first audible sample; the player skips it,
 *              and a long one means the clip was mostly empty
 *
 *   node tools/probe-sound.mjs [url]
 */
import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:3001';
const names = readdirSync('public/sounds').filter((f) => f.endsWith('.mp3')).map((f) => f.replace(/\.mp3$/, '')).sort();
if (!names.length) { console.error('no clips in public/sounds — run node tools/gen-sounds.mjs'); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

const out = await page.evaluate(async (list) => {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const rows = [];
  for (const name of list) {
    try {
      const res = await fetch(`/sounds/${name}.mp3`);
      if (!res.ok) { rows.push({ name, err: `HTTP ${res.status}` }); continue; }
      const type = res.headers.get('content-type') ?? '';
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      const d = buf.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
      let lead = 0;
      for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > 0.01) { lead = i / buf.sampleRate; break; }
      /* The noise floor, as the RMS of the quietest 20ms window. This is what
         decides how far a quiet clip may be amplified: the lift applies to the
         hiss as well as to the content, so peak alone cannot answer it. */
      const win = Math.max(1, Math.floor(buf.sampleRate * 0.02));
      let floor = Infinity;
      for (let i = 0; i + win <= d.length; i += win) {
        let sum = 0;
        for (let j = i; j < i + win; j++) sum += d[j] * d[j];
        floor = Math.min(floor, Math.sqrt(sum / win));
      }
      /* Brightness: how much of the clip's energy sits above 4 kHz.
       *
       * "Too shrill" is a spectral complaint, not a loudness one — turning a
       * piercing clip down leaves it piercing and quiet. This renders the clip
       * twice through an OfflineAudioContext, once flat and once high-passed,
       * and reports the ratio, so "gentler" can be checked rather than
       * asserted. Roughly: under 0.2 is warm, over 0.5 is bright. */
      const rms = (ch) => { let s = 0; for (let i = 0; i < ch.length; i++) s += ch[i] * ch[i]; return Math.sqrt(s / ch.length); };
      const band = async (hz) => {
        const off = new OfflineAudioContext(1, buf.length, buf.sampleRate);
        const s1 = off.createBufferSource(); s1.buffer = buf;
        const hp = off.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = hz; hp.Q.value = 0.7;
        s1.connect(hp); hp.connect(off.destination); s1.start();
        return rms((await off.startRendering()).getChannelData(0));
      };
      const all = rms(d);
      /* Two bands, because they answer different questions. Above 4 kHz is
         hiss and clatter — chips and card stock live there and are meant to.
         Above 2 kHz is where the ear is most sensitive and where "piercing"
         actually comes from, so a chime can score low at 4 k and still be
         painful. The win cue was exactly that case. */
      const high = await band(4000);
      const mid = await band(2000);
      rows.push({
        name, type, seconds: +buf.duration.toFixed(2),
        peak: +peak.toFixed(3), lead: +lead.toFixed(3),
        floor: +(floor === Infinity ? 0 : floor).toFixed(5),
        bright: +(all > 0 ? high / all : 0).toFixed(2),
        pierce: +(all > 0 ? mid / all : 0).toFixed(2),
      });
    } catch (e) {
      rows.push({ name, err: e.message.slice(0, 60) });
    }
  }
  await ctx.close();
  return rows;
}, names);

let bad = 0;
console.log('name        served         dur   peak   lead-in     floor  >4kHz  >2kHz');
for (const r of out) {
  if (r.err) { console.log(`${r.name.padEnd(11)} FAIL ${r.err}`); bad++; continue; }
  /* A clip under 0.02 peak is silence with a dither on top; the player would
     normalise it into a burst of amplified noise if it were not guarded, and
     either way it is not the sound that was asked for. */
  const silent = r.peak < 0.02;
  // Half the clip being silence means the prompt mostly produced nothing.
  const lateStart = r.lead > r.seconds * 0.5;
  const flag = silent ? '  SILENT' : lateStart ? '  MOSTLY SILENT' : '';
  if (silent || lateStart) bad++;
  console.log(`${r.name.padEnd(11)} ${(r.type || '?').padEnd(14)} ${String(r.seconds).padStart(5)} ${String(r.peak).padStart(6)} ${String(r.lead).padStart(8)} ${String(r.floor).padStart(8)} ${String(r.bright).padStart(6)} ${String(r.pierce).padStart(6)}${flag}`);
}

const leads = out.filter((r) => !r.err).map((r) => r.lead);
if (leads.length) {
  console.log(`\nlead-in: ${Math.min(...leads).toFixed(3)}s – ${Math.max(...leads).toFixed(3)}s (skipped at playback; see leadIn in src/engine/sound.ts)`);
}

/* What the player will actually do with each clip, computed the same way it
   does: lift towards a common peak, bounded only by ABSOLUTE.
 *
 * There is no noise-based cap, because gain cannot change signal-to-noise —
 * a clip's hiss after normalisation is fixed by the recording:
 *
 *     noise at peak 0.9  =  0.9 × floor / peak
 *
 * so that figure is reported instead. It is the number that says whether a
 * clip is worth regenerating; making a hissy clip quieter never helped. */
const ABSOLUTE = 40;
const levels = out.filter((x) => !x.err).map((r) => {
  const want = r.peak > 0.001 ? 0.9 / r.peak : 1;
  const lift = Math.min(want, ABSOLUTE);
  return { name: r.name, lift, out: +(r.peak * lift).toFixed(2), noise: r.peak > 0 ? 0.9 * r.floor / r.peak : 0 };
});
console.log('\nafter normalisation (before the per-voice mix):');
for (const l of levels.sort((a, b) => a.out - b.out)) {
  const dB = l.noise > 0 ? (20 * Math.log10(l.noise)).toFixed(0) : '-inf';
  console.log(`  ${l.name.padEnd(11)} x${l.lift.toFixed(1).padStart(5)} -> peak ${String(l.out).padEnd(5)} noise ${String(dB).padStart(4)} dBFS${l.lift >= ABSOLUTE ? '   at the absolute lift limit' : ''}`);
}
/* Anything above -30 dBFS of noise under its own content will be audible as
   hiss or as a sustain that never resolves. Named, not quietened. */
const hissy = levels.filter((l) => l.noise > 0.03);
if (hissy.length) {
  console.log(`\nworth regenerating — audible noise under the content: ${hissy.map((l) => l.name).join(' ')}`);
}

/* ── and does the app itself ask for them? ─────────────────────────────────
   Everything above proves the files are good. It does not prove the player is
   wired to them — a typo in the path, or a `load()` that never runs, would
   leave the game on the synthesised fallback and sound perfectly fine, just
   not like this set.

   WHEN it loads is checked as much as whether it loads. The app starts
   unmuted, so the set must not be fetched on mount — 400KB during first paint
   for a visitor who may never make a sound. The trigger is the first `play()`,
   which is a hover or a click, so a page that is merely opened pays nothing.
   Settings carries the toggle and needs no seat, so this works against the
   live gateway where sitting down is no longer possible. */
const asked = new Set();
page.on('request', (r) => {
  const m = /\/sounds\/([a-zA-Z]+)\.mp3$/.exec(new URL(r.url()).pathname);
  if (m) asked.add(m[1]);
});

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);
const before = asked.size;
console.log(`\non load, before any interaction, the app requested ${before} clip(s)${before ? ' — FAIL, it should be none' : ' — nothing, as intended'}`);
if (before) bad++;

/* Getting a sound out of the app means getting to a seat. `sfx()` refuses
   unless you are seated, the felt is the visible screen, the tab is focused
   and a hand exists — sound is a cue for YOUR hand, so nothing on the lobby or
   in settings makes a noise, and clicking the sound toggle only sets a flag.
   That makes the offline demo the only place this half can run: the deployed
   gateway no longer funds new accounts, so there is no seat to take.

     NEXT_PUBLIC_SUITED_SERVER=offline npx next dev -p 3001 */
const click = async (label, wait = 2000) => {
  const el = page.locator(`button:has-text("${label}")`).first();
  if (!(await el.count())) return false;
  await el.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(wait);
  return true;
};
await click('play now', 2200);
await click('join', 3000) || await click('quick join', 3000);
const row = page.locator('button').filter({ hasText: /DETECTED/ }).first();
if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(3500); }
await click('lobby', 2500);
await click('join', 3500) || await click('quick join', 3500);
const seated = await click('take your seat', 5000);

if (!seated) {
  console.log('SKIP  could not take a seat, so no sound could be triggered');
  console.log('      run this against the offline demo to exercise the player end to end');
} else {
  console.log(`seated; the app requested ${asked.size} of ${names.length} clips`);
  if (!asked.size) { console.log('  FAIL the player never asked for a single sample — it is still on the fallback'); bad++; }
  else if (asked.size < names.length) {
    console.log(`  FAIL never requested: ${names.filter((n) => !asked.has(n)).join(' ')}`);
    bad++;
  }
}

await browser.close();
console.log(`\n${out.length - bad}/${out.length} clips usable`);
process.exit(bad ? 1 : 0);
