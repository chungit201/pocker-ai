/* Generates alternative takes of one sound into tools/out/, without touching
   the set in public/sounds/.
 *
 * For the case where a cue is wrong in a direction rather than simply broken —
 * too bright, too long, too cheerful — and the useful next step is to hear two
 * candidates side by side instead of guessing and regenerating in a loop.
 * tools/sound-sheet.mjs lists whatever is in tools/out/ as alternatives, so
 * they appear next to the shipping clip with their own play buttons.
 *
 *   node tools/gen-variant.mjs win-middle 1.6 0.5 "A warm rising three-note motif …"
 *
 * Promote one by copying it over public/sounds/<name>.mp3, or by putting its
 * prompt into tools/gen-sounds.mjs and running that — the second is better,
 * because it keeps the prompt that produced the sound next to the sound.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const [label, seconds, influence, ...rest] = process.argv.slice(2);
const text = rest.join(' ');
if (!label || !seconds || !influence || !text) {
  console.error('usage: node tools/gen-variant.mjs <label> <seconds> <influence> <prompt…>');
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .map((l) => /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(l))
    .filter(Boolean).map((m) => [m[1], m[2].trim()]),
);
const KEY = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('no ELEVENLABS_API_KEY'); process.exit(1); }

const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
  method: 'POST',
  headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
  body: JSON.stringify({ text, duration_seconds: Number(seconds), prompt_influence: Number(influence) }),
});
if (!res.ok) { console.error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`); process.exit(1); }

const buf = Buffer.from(await res.arrayBuffer());
mkdirSync('tools/out', { recursive: true });
const path = `tools/out/${label}.mp3`;
writeFileSync(path, buf);
console.log(`${path}  ${buf.length} bytes  ${seconds}s`);
