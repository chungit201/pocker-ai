/* Generates the game's sound set with ElevenLabs and writes it to public/sounds/.
 *
 * Run by hand, never by the build. The audio is committed; the API key is only
 * needed to make it again. Reads ELEVENLABS_API_KEY from .env.local, which is
 * gitignored and carries no NEXT_PUBLIC_ prefix, so nothing reaches the browser
 * bundle.
 *
 *   node tools/gen-sounds.mjs            # only the files that are missing
 *   node tools/gen-sounds.mjs --force    # all of them again
 *   node tools/gen-sounds.mjs deal fold  # just these
 *
 * Existing files are kept by default because every call costs credits and a
 * careless rerun would spend them regenerating a set that was already good.
 *
 * ── on the prompts ──────────────────────────────────────────────────────────
 * These are poker table foley, not music. Three things decide whether a clip is
 * usable in a game:
 *
 *  • It must be DRY and close — reverb reads as distance, and these sounds are
 *    meant to be happening under your hands.
 *  • It must be SHORT. A card landing is 300ms in life; anything longer arrives
 *    after the card has already visibly landed.
 *  • It must have NO MUSIC unless it is a win cue. A musical bed under a chip
 *    click turns every click into an event.
 *
 * Every prompt says so explicitly, because the model will happily add a room
 * and a swell otherwise.
 *
 * Lead-in silence is NOT trimmed here — there is no ffmpeg on this machine and
 * shelling out to one would make this tool unrunnable elsewhere. The player
 * trims it instead, at decode time: see `leadIn` in src/engine/sound.ts, which
 * finds the first audible sample and starts playback there. That is measurable
 * and adjustable without spending credits again.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'public/sounds';
const API = 'https://api.elevenlabs.io/v1/sound-generation';

const DRY = 'Dry, close-miked, no reverb, no room tone, no music, no voices. Mono studio foley.';

/* The voice of all three victory cues, said once so they cannot drift apart.
   Prompts are capped at 450 characters by the API, which is why this is terse. */
const HARP = 'a small harp plucked softly with the fingertips, airy and clear, middle register.'
  + ' Soft and gentle, never loud. Major key, one clear uncluttered phrase, nothing layered under it.'
  + ' No percussion, no drums, no cymbals, no chips, no fanfare, no shimmer, no metallic overtones, no shrill highs, no reverb wash.';

/** name → [prompt, seconds, promptInfluence] */
const SOUNDS = {
  /* ── interface ─────────────────────────────────────────────────────────── */
  ui: [`A single soft muted click of a small plastic button. One click only, very short and quiet. ${DRY}`, 0.5, 0.7],
  hover: [`An extremely faint short tick, like a fingernail brushing plastic. Barely audible. One tick only. ${DRY}`, 0.5, 0.7],
  /* Loud, hard, crisp — not soft, muffled or gentle.
   *
   * The first pass asked for "soft", "muffled" and "resigned" and got exactly
   * that: clips peaking at 0.03–0.14, which the player cannot lift without
   * lifting their noise with them. The model takes loudness adjectives
   * literally, so the ones that must carry over a table say so. `hover` and
   * `lose` are still quiet on purpose. */
  error: [`A single sharp wooden gavel tap on a hardwood block. One hard crack with a short decay. ${DRY}`, 0.6, 0.65],
  seat: [`A short soft wooden knock with a warm low body, like a chair settling. One knock. ${DRY}`, 0.7, 0.6],

  /* ── cards ─────────────────────────────────────────────────────────────── */
  deal: [`One playing card dealt hard and fast across green felt, landing with a crisp loud papery snap. Close and prominent. ${DRY}`, 0.6, 0.75],
  flip: [`One playing card being turned face up onto felt. A quick light snap of stiff card stock. ${DRY}`, 0.6, 0.75],
  peel: [`A playing card bent and peeled back hard by a thumb, loud creaking paper under tension. Close and prominent. ${DRY}`, 1.2, 0.7],
  fold: [`Two playing cards thrown face down and skidding away across felt. A crisp loud papery slide. Close and prominent. ${DRY}`, 0.9, 0.75],

  /* ── chips ─────────────────────────────────────────────────────────────── */
  chip: [`One single clay poker chip set down on a wooden table. One short dry click with a little weight. ${DRY}`, 0.5, 0.8],
  chips: [`A small handful of clay poker chips tossed into a pot. Several chips clattering together briefly. ${DRY}`, 1.0, 0.8],
  bet: [`A stack of clay poker chips pushed forward across felt and settling. Chips rattling as they slide. ${DRY}`, 1.0, 0.75],
  allin: [`A large pile of clay poker chips shoved forward all at once, a big heavy cascade of chips tumbling. ${DRY}`, 1.8, 0.75],
  check: [`Two knuckles rapping twice on a wooden table. Two quick dry knocks. ${DRY}`, 0.7, 0.8],

  /* ── the clock ─────────────────────────────────────────────────────────── */
  turnStart: [`A soft warm two-note electronic prompt, gentle and low, like a turn notification. Short and clean.`, 0.8, 0.5],
  lowTime: [`A single dry urgent clock tick, sharp and bare. One tick only. ${DRY}`, 0.5, 0.75],
  alert: [`A clear attention chime of three rising bell notes, clean and bright, no reverb tail.`, 1.5, 0.5],

  /* ── outcomes ──────────────────────────────────────────────────────────── */
  /* Light and cheerful, and above all UNCLUTTERED. Three passes to get here:
     a "bright chime with a light shimmer" was piercing (56% of its energy
     above 2 kHz); rewriting it low and dark fixed the pain but made the cues
     gloomy; and the chip cascade layered under the two bigger ones was simply
     noise on top of a melody — a win is one clear phrase, not a pile of
     things happening at once.
   *
   * So: a plain melody, a named gentle instrument, major key, nothing
   * percussive, no chips, no swell, and short. The three differ in size, not
   * in loudness — bigwin is a longer phrase, not a bigger noise. */
  /* A fourth pass replaced all three with one instrument, chosen by ear from
   * the three families tools/gen-win-options.mjs generates. Before it, win was
   * a marimba and the other two were a music box — three sizes of the same
   * event in two different instruments.
   *
   * A harp is what ships. It is the gentlest of the three families and the
   * least bell-like: plucked string rather than struck metal, so it is clear
   * without the overtones that make a chime hurt. A celesta was chosen first
   * and held the slot briefly; both measure well (0.13 and 0.10 mean energy
   * above 2 kHz) and the decision between them was taste, not measurement.
   *
   * The clause below is shared so the cues cannot drift apart — three
   * separately worded prompts do. "Middle register" is load-bearing: the same
   * prompts asked for a glass bell instead measured 0.68 above 2 kHz, worse
   * than the pass recorded above as painful. See docs/sound.md. */
  win: [`A light rising three-note melody, friendly, short decay on ${HARP}`, 1.0, 0.5],
  /* `potwin` no longer shares the clause, and the exception is the point.
   *
   * It is the cue a player hears most — every pot won that is not a monster —
   * and on the shared wording it was the one that kept coming back bright: the
   * first take measured 0.24 above 2 kHz against its siblings' 0.08 and 0.06,
   * and re-rolling the same words four times spanned 0.04 to 0.24. Re-rolling
   * fixes a clip; it does not stop the next regeneration rolling badly again.
   *
   * So this prompt pins down what the shared one left to chance — "low
   * register", "quiet throughout", "no bright attack, no sparkle" — and three
   * takes of it came back 0.04, 0.04 and 0.03. The variance is gone, which is
   * worth more than one lucky clip. The trade is that `potwin` can drift from
   * its siblings in timbre, so changes to HARP should be mirrored here by
   * hand. */
  potwin: [`A slow soft rising four-note melody, calm and unhurried, resolving quietly on a small harp plucked very gently with the fingertips, warm and mellow, low register. Quiet throughout, no bright attack, no sparkle. Major key, one clear phrase, nothing layered under it. No percussion, no drums, no cymbals, no chips, no bells, no fanfare, no shimmer, no metallic overtones, no shrill highs, no reverb wash.`, 1.6, 0.5],
  bigwin: [`A happy rising six-note phrase resolving onto a held note over a quiet warm chord, calm on ${HARP}`, 2.2, 0.5],
  lose: [`A soft low descending two-note tone, quiet and deflating. No drums, no reverb tail.`, 1.2, 0.5],
  badbeat: [`A hollow descending four-note tone, dark and disappointed, fading out. No drums.`, 1.6, 0.5],
};

/* ── the key ───────────────────────────────────────────────────────────────── */
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .map((l) => /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(l))
    .filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const KEY = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('no ELEVENLABS_API_KEY in the environment or .env.local');
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));
const wanted = only.length ? only : Object.keys(SOUNDS);

const unknown = wanted.filter((n) => !SOUNDS[n]);
if (unknown.length) {
  console.error(`unknown sound(s): ${unknown.join(', ')}`);
  console.error(`known: ${Object.keys(SOUNDS).join(' ')}`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
console.log(`${wanted.length} sound(s) → ${OUT}\n`);

let made = 0, kept = 0, failed = 0;
for (const name of wanted) {
  const [text, seconds, influence] = SOUNDS[name];
  const path = join(OUT, `${name}.mp3`);
  if (existsSync(path) && !force) {
    console.log(` keep ${name.padEnd(10)} already present (--force to replace)`);
    kept++;
    continue;
  }

  let res;
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ text, duration_seconds: seconds, prompt_influence: influence }),
    });
  } catch (e) {
    console.log(` FAIL ${name.padEnd(10)} ${e.message}`);
    failed++;
    continue;
  }

  if (!res.ok) {
    // The body carries the reason — a quota, a bad key, a rejected prompt — and
    // printing it is the difference between fixing this and guessing.
    const why = (await res.text().catch(() => '')).slice(0, 200);
    console.log(` FAIL ${name.padEnd(10)} HTTP ${res.status} ${why}`);
    failed++;
    continue;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  /* A 200 with a tiny or non-audio body is the quiet failure worth catching:
     it would be written as an .mp3 the browser silently refuses to decode, and
     the game would just go quiet with nothing in the console. */
  const isMp3 = buf.subarray(0, 3).toString() === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);
  if (!isMp3 || buf.length < 1024) {
    console.log(` FAIL ${name.padEnd(10)} ${buf.length} bytes, not recognisable as mp3`);
    failed++;
    continue;
  }

  writeFileSync(path, buf);
  console.log(`  new ${name.padEnd(10)} ${String(buf.length).padStart(6)} bytes  ${seconds}s  "${text.slice(0, 48)}…"`);
  made++;
}

console.log(`\n${made} generated, ${kept} kept, ${failed} failed`);
if (made) console.log('listen before shipping: tools/out/sound-sheet.html lists every clip with a play button.');
process.exit(failed ? 1 : 0);
