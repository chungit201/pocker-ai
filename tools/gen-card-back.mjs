/* Generates the backs of the playing cards with Gemini and writes them as small
 * webps to public/cards/back-<id>.webp — the designs src/lib/card-backs.ts
 * offers, and what every face-down card on the felt wears.
 *
 * The key is read from GEMINI_API_KEY in .env.local (or the environment) and
 * never printed. Existing files are kept, so a re-run only fills the gaps;
 * delete one (or pass --force) to draw it again. A redraw is a NEW drawing of
 * the same brief, not the same picture — the six in the repo were picked from
 * a first run, so do not regenerate one casually.
 *
 *   node tools/gen-card-back.mjs [--only <id>] [--dir <dir>] [--trim <percent>]
 *                                [--model gemini-3.1-flash-image] [--force]
 *
 * --dir writes somewhere other than public/cards, to look before replacing.
 * --trim crops that share off every edge first: the model sometimes paints a
 * white card margin despite being told the image is the back itself (`deco`
 * did, and shipped trimmed by 4).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const model = opt('--model') ?? 'gemini-3.1-flash-image';
const outDir = opt('--dir') ?? path.join(root, 'public', 'cards');
const only = opt('--only');
const trim = Number(opt('--trim') ?? 0) / 100;
const force = args.includes('--force');

function readKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
  const m = env.match(/^GEMINI_API_KEY=(.*)$/m);
  if (!m) throw new Error('GEMINI_API_KEY not found in .env.local');
  return m[1].trim().replace(/^["']|["']$/g, '');
}
const KEY = readKey();

// The image IS the back, edge to edge: the felt rounds the corners and draws
// the card's edge itself, so a border or a drawn card outline here would be a
// second one. And it has to survive 42×60px, an opponent's hole card — bold
// shapes, not engraving.
const STYLE = 'A playing card back design, seen flat and straight on, filling the entire image edge to edge. '
  + 'The image itself is the card back: no card outline, no rounded corners, no white margin, no table, no perspective, no shadow. '
  + 'Perfectly symmetrical, mirrored left-right and top-bottom. '
  + 'Deep midnight navy (#0d1220) ground with violet (#8b5cf6) and pale lavender (#c4b5fd) ornament, '
  + 'premium modern online casino look, crisp clean vector-like linework, bold shapes that stay readable as a tiny thumbnail. '
  + 'Portrait orientation. No text, no letters, no numbers, no logos, no watermark.';

// Ids match CARD_BACKS in src/lib/card-backs.ts.
const DESIGNS = [
  { id: 'lozenge', brief: 'One large violet diamond lozenge emblem in the centre, on a fine diagonal lattice of thin lavender lines, with a thin lavender frame line inset a little from the edges.' },
  { id: 'deco', brief: 'Art deco: fan rays radiating from a central faceted violet gem, stepped geometric corners, a thin double frame line inset from the edges.' },
  { id: 'argyle', brief: 'A dense argyle pattern of small diamonds in violet tones covering the whole back, with a round medallion in the centre holding a four-pointed star.' },
  { id: 'filigree', brief: 'Ornate classic filigree scrollwork mirrored in four quadrants around a central violet diamond, in the manner of a luxury casino deck, inside a thin inset frame line.' },
  { id: 'ripple', brief: 'Minimal and modern: a soft violet glow behind a single crisp diamond outline in the centre, concentric thin diamond outlines expanding outwards to the edges like ripples.' },
  { id: 'suits', brief: 'A tiled pattern of the four card suits (spade, heart, diamond, club) as small lavender outlines in a diagonal grid, with one larger solid violet diamond in the centre.' },
];

async function generate(prompt) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '2:3' } },
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${body.error?.message ?? ''}`);
  const part = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error('no image in response');
  return Buffer.from(part.inlineData.data, 'base64');
}

if (only && !DESIGNS.some((d) => d.id === only)) throw new Error(`--only is one of: ${DESIGNS.map((d) => d.id).join(', ')}`);
fs.mkdirSync(outDir, { recursive: true });
let made = 0;
for (const d of DESIGNS) {
  if (only && d.id !== only) continue;
  const file = path.join(outDir, `back-${d.id}.webp`);
  if (!force && fs.existsSync(file)) { console.log(`skip ${path.basename(file)}`); continue; }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let img = sharp(await generate(`${STYLE} The design: ${d.brief}`));
      if (trim > 0) {
        const { width, height } = await img.metadata();
        const x = Math.round(width * trim), y = Math.round(height * trim);
        img = img.extract({ left: x, top: y, width: width - 2 * x, height: height - 2 * y });
      }
      // 264×376 is the 66×94 board card at 4x. `fill`, not `cover`: the model
      // draws 2:3 and a card is a touch wider, and cropping would bring an
      // inset frame line closer to two edges than the other two.
      await img.resize(264, 376, { fit: 'fill' }).webp({ quality: 88 }).toFile(file);
      console.log(`made ${path.basename(file)}`);
      made++;
      break;
    } catch (e) {
      console.log(`  ${path.basename(file)} attempt ${attempt} failed: ${e.message}`);
      if (attempt === 3) process.exitCode = 1;
    }
  }
}
console.log(`${made} generated → ${path.relative(root, outDir)}`);
