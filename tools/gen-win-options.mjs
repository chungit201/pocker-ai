/* Generates three candidate victory-cue SETS into tools/out/win-options/ and
   writes a page that plays them side by side against what ships today.
 *
 *   node tools/gen-win-options.mjs            # all three options (9 calls)
 *   node tools/gen-win-options.mjs glass      # just one option (3 calls)
 *   node tools/gen-win-options.mjs --page     # rebuild the page, generate nothing
 *
 * Why a set and not a single clip: `win`, `potwin` and `bigwin` are the same
 * event at three sizes, and the player hears them in the same session. Picking
 * a `win` in isolation and leaving the other two as they are gives a table
 * where the small pot is a glass bell and the big one is a music box. So each
 * option is one instrument and one character across all three cues, and
 * choosing means choosing a family.
 *
 * Nothing here touches public/sounds/. Promote the winner by moving its voice
 * line into tools/gen-sounds.mjs and running that with --force, so the prompt
 * stays next to the sound it made — see docs/sound.md.
 *
 * ── on the prompts ──────────────────────────────────────────────────────────
 * The brief is "trong trẻo, nhẹ nhàng": clear and gentle. That is close to the
 * request that produced the painful first pass documented in docs/sound.md —
 * "bright rising bells with a light shimmer" came back with 56% of its energy
 * above 2 kHz, which is where the ear is most sensitive and where a cue starts
 * to hurt. Clarity and shrillness are not the same axis, and the prompt has to
 * separate them explicitly:
 *
 *   clear   = one instrument, one phrase, a pure tone, a clean decay, no wash
 *   shrill  = fundamentals in the top octave, metallic overtones, shimmer
 *
 * So every prompt below names the register (middle octaves), asks for the tone
 * to be pure and rounded, and lists the shrill-makers as things to avoid.
 * tools/probe-win-options.mjs measures the >2 kHz share afterwards, so this is
 * checkable rather than hoped for.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'tools/out/win-options';
const PAGE = 'tools/out/win-options.html';
const API = 'https://api.elevenlabs.io/v1/sound-generation';

/* The API rejects a prompt over 450 characters with a 400, which is why all
   nine of these are terse: the shared clause below is already half the budget,
   so the per-cue and per-option halves get about 90 characters each. */
const MAX_TEXT = 450;

/* Said in all nine prompts. Gentle dynamics are part of the brief, and the
   model takes loudness adjectives literally in both directions, so "never
   loud" is here rather than left to the mix. */
const COMMON = 'Soft and gentle, never loud. Major key, one clear uncluttered phrase, nothing layered under it. '
  + 'No percussion, no drums, no cymbals, no chips, no fanfare, no shimmer, no metallic overtones, no shrill highs, no reverb wash.';

/** option → the instrument and character, which is the whole of the choice */
const OPTIONS = {
  /* The slot for the clearest struck tone of the three.
   *
   * It was a glass bell first — the literal reading of "trong trẻo" — and that
   * take came back with 0.68 of its energy above 2 kHz, worse than the pass
   * docs/sound.md records as painful (0.50–0.61) and six times the shipping
   * set. "Middle register" in the prompt did not survive the word "glass";
   * the model hears glass and reaches for the top octave. A vibraphone keeps
   * the clear struck attack and puts a warm body under it, which is the part
   * glass has none of. Measured after the swap: 0.10. */
  vibraphone: {
    title: 'vibraphone — clear struck attack with a warm body, the brightest that is still safe',
    voice: 'a vibraphone struck with soft felt mallets, clear and round with a long warm decay, low register, no motor tremolo',
  },
  /* A celesta is a music box with a body under it — clear in the attack, warm
     in the tail. The middle option in brightness, and the safest. */
  celesta: {
    title: 'celesta — clear attack, warm tail, the safe middle',
    voice: 'a celesta, crystalline in the attack but warm and rounded underneath, middle register',
  },
  /* Plucked strings rather than struck metal: airy and clear without any of
     the overtones that make a bell hurt. The gentlest, and the least "chime". */
  harp: {
    title: 'harp — airy and plucked, the gentlest, least bell-like',
    voice: 'a small harp plucked softly with the fingertips, airy and clear, middle register',
  },
};

/* cue → [the phrase, seconds]. The durations are the shipping ones, so the
   level and the timing in sound.ts hold if an option is promoted. The three
   differ in SIZE, not in loudness: bigwin is a longer phrase, not a bigger
   noise. */
const CUES = {
  win: ['A light rising three-note melody, friendly, short decay', 1.0],
  potwin: ['A cheerful rising four-note melody, unhurried, resolving gently', 1.6],
  bigwin: ['A happy rising six-note phrase resolving onto a held note over a quiet warm chord, calm', 2.2],
};

const INFLUENCE = 0.5; // what the shipping win cues use

const prompt = (opt, cue) => `${CUES[cue][0]} on ${OPTIONS[opt].voice}. ${COMMON}`;

/* Checked up front, for every combination, rather than discovered one 400 at a
   time halfway through a run. Over-length prompts cost no credits, but they do
   cost the run. */
const tooLong = Object.keys(OPTIONS).flatMap((o) => Object.keys(CUES)
  .map((c) => ({ id: `${o}/${c}`, n: prompt(o, c).length }))
  .filter((x) => x.n > MAX_TEXT));
if (tooLong.length) {
  console.error(`prompt over the ${MAX_TEXT}-character API limit:`);
  for (const t of tooLong) console.error(`  ${t.id}  ${t.n}`);
  process.exit(1);
}

/* ── the page ─────────────────────────────────────────────────────────────── */
/* Audio tags with plain relative sources, because that is the one thing that
   works when the page is opened from disk — fetch and decodeAudioData are
   blocked on file://, so the page cannot measure anything itself. The numbers
   come from tools/probe-win-options.mjs instead. */
const writePage = () => {
  const size = (p) => (existsSync(p) ? `${(statSync(p).size / 1024).toFixed(1)} KB` : '—');
  const have = existsSync(OUT) ? readdirSync(OUT).filter((f) => f.endsWith('.mp3')) : [];

  const block = (opt) => {
    const rows = Object.keys(CUES).map((cue) => {
      const file = `${opt}-${cue}.mp3`;
      const there = have.includes(file);
      return `    <tr>
      <td class="n">${cue}</td>
      <td class="s">${CUES[cue][1]}s · ${size(join(OUT, file))}</td>
      <td>${there ? `<audio controls preload="none" src="./win-options/${file}"></audio>` : '<span class="s">not generated</span>'}</td>
    </tr>`;
    }).join('\n');
    return `  <section>
    <h2>${opt}</h2>
    <p>${OPTIONS[opt].title}</p>
    <table>
${rows}
    </table>
    <details><summary>prompt</summary><pre>${prompt(opt, 'win').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></details>
  </section>`;
  };

  const current = Object.keys(CUES).map((cue) => `  <tr>
    <td class="n">${cue}</td>
    <td class="s">${size(`public/sounds/${cue}.mp3`)}</td>
    <td><audio controls preload="none" src="../../public/sounds/${cue}.mp3"></audio></td>
  </tr>`).join('\n');

  /* Anything in the folder that is not one of the three options above — a
     re-roll of a single cue, which is the usual next move when one clip of an
     otherwise good family comes back wrong. Listed because a page that only
     renders what OPTIONS knows about silently hides takes that exist on disk,
     and a candidate nobody can hear is a candidate nobody will choose.
     `harpd-potwin` is how the shipping potwin was found. */
  const known = new Set(Object.keys(OPTIONS).flatMap((o) => Object.keys(CUES).map((c) => `${o}-${c}.mp3`)));
  const extra = have.filter((f) => !known.has(f)).sort();
  const extraRows = extra.map((f) => `  <tr>
    <td class="n">${f.replace(/\.mp3$/, '')}</td>
    <td class="s">${size(join(OUT, f))}</td>
    <td><audio controls preload="none" src="./win-options/${f}"></audio></td>
  </tr>`).join('\n');

  mkdirSync('tools/out', { recursive: true });
  writeFileSync(PAGE, `<!doctype html>
<meta charset="utf-8">
<title>suited — victory cue options</title>
<style>
  body { background:#0a0d16; color:#e8ecf8; font:14px/1.5 system-ui,sans-serif; margin:40px auto; max-width:760px; padding:0 16px }
  h1 { font-weight:600; letter-spacing:-.02em; margin:0 0 4px }
  h2 { font-weight:600; margin:0 0 2px; font-size:16px }
  p { color:#94a3c4; margin:0 0 14px }
  section { border-top:1px solid rgba(232,236,248,.14); padding:22px 0 6px }
  table { border-collapse:collapse; width:100% }
  td { padding:8px 10px 8px 0; border-bottom:1px solid rgba(232,236,248,.08); vertical-align:middle }
  .n { font-weight:500; width:90px }
  .s { color:#94a3c4; width:130px; font-variant-numeric:tabular-nums }
  audio { width:100%; height:34px }
  details { margin:10px 0 0; color:#94a3c4 }
  summary { cursor:pointer }
  pre { white-space:pre-wrap; color:#8ea0c4; font-size:12px; margin:8px 0 0 }
</style>
<h1>victory cue — three options</h1>
<p>Each option is one instrument across all three cues, so you are picking a
family rather than a clip. Previews are at full scale; in play the mix sets
win to 0.85, potwin to 0.9 and bigwin to 1.</p>
<section>
  <h2>shipping now</h2>
  <p>What is in <code>public/sounds/</code> today, for comparison.</p>
  <table>
${current}
  </table>
</section>
${Object.keys(OPTIONS).map(block).join('\n')}
${extra.length ? `<section>
  <h2>extra takes</h2>
  <p>Re-rolls of a single cue, from <code>tools/gen-variant.mjs</code> with an
  option's own prompt. The API is not deterministic, so the same words give a
  different take every time — which is the cheapest fix when one clip of a good
  family comes back wrong.</p>
  <table>
${extraRows}
  </table>
</section>` : ''}
<p style="margin:28px 0 0">Tell me which one, and I will move its prompt into
<code>tools/gen-sounds.mjs</code> and regenerate the three shipping clips from it.</p>
`);
  console.log(`page → ${PAGE}`);
};

/* ── generate ─────────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const pageOnly = args.includes('--page');
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));

if (pageOnly) { writePage(); process.exit(0); }

const unknown = only.filter((o) => !OPTIONS[o]);
if (unknown.length) {
  console.error(`unknown option(s): ${unknown.join(', ')}`);
  console.error(`known: ${Object.keys(OPTIONS).join(' ')}`);
  process.exit(1);
}
const wanted = only.length ? only : Object.keys(OPTIONS);

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .map((l) => /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(l))
    .filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const KEY = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('no ELEVENLABS_API_KEY in the environment or .env.local'); process.exit(1); }

mkdirSync(OUT, { recursive: true });
console.log(`${wanted.length} option(s) x ${Object.keys(CUES).length} cues → ${OUT}\n`);

let made = 0, kept = 0, failed = 0;
for (const opt of wanted) {
  for (const cue of Object.keys(CUES)) {
    const path = join(OUT, `${opt}-${cue}.mp3`);
    if (existsSync(path) && !force) {
      console.log(` keep ${`${opt}/${cue}`.padEnd(18)} already present (--force to replace)`);
      kept++;
      continue;
    }

    let res;
    try {
      res = await fetch(API, {
        method: 'POST',
        headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ text: prompt(opt, cue), duration_seconds: CUES[cue][1], prompt_influence: INFLUENCE }),
      });
    } catch (e) {
      console.log(` FAIL ${`${opt}/${cue}`.padEnd(18)} ${e.message}`);
      failed++;
      continue;
    }
    if (!res.ok) {
      const why = (await res.text().catch(() => '')).slice(0, 200);
      console.log(` FAIL ${`${opt}/${cue}`.padEnd(18)} HTTP ${res.status} ${why}`);
      failed++;
      continue;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    /* A 200 carrying a tiny or non-audio body is the quiet failure worth
       catching: it would be written as an .mp3 nothing can decode. */
    const isMp3 = buf.subarray(0, 3).toString() === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);
    if (!isMp3 || buf.length < 1024) {
      console.log(` FAIL ${`${opt}/${cue}`.padEnd(18)} ${buf.length} bytes, not recognisable as mp3`);
      failed++;
      continue;
    }

    writeFileSync(path, buf);
    console.log(`  new ${`${opt}/${cue}`.padEnd(18)} ${String(buf.length).padStart(6)} bytes  ${CUES[cue][1]}s`);
    made++;
  }
}

console.log(`\n${made} generated, ${kept} kept, ${failed} failed`);
writePage();
console.log('measure them: node tools/probe-win-options.mjs');
process.exit(failed ? 1 : 0);
