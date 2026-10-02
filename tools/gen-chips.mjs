/* Generates the poker chips with Gemini: one drawing per style, cut out of its
 * background and recoloured into the eight denominations, written as small
 * transparent webps to public/chips/<style>/<colour>.webp.
 *
 * One drawing, eight colours, on purpose. Asking the model for eight chips
 * gets eight different chips — the inserts move, the rim changes width — and a
 * pile of those reads as a mixed bag rather than a set. Rotating the hue of a
 * single violet chip keeps every edge insert in the same place and leaves the
 * white ones white, which is what a real set looks like.
 *
 * The key is read from GEMINI_API_KEY in .env.local (or the environment) and
 * never printed. A style whose base drawing exists is not drawn again — only
 * recoloured — so tuning COLOURS costs nothing; pass --force (or delete
 * <style>/base.png) to redraw, which is a NEW drawing, not the same one.
 *
 * The felt uses one style, `suits` (the ceramic one), and a bare run makes
 * only that. The others are the candidates it was chosen from; --all draws
 * them too, into --dir, to look at.
 *
 *   node tools/gen-chips.mjs [--only <style> | --all] [--dir <dir>] [--force]
 *                            [--model gemini-3.1-flash-image]
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const model = opt('--model') ?? 'gemini-3.1-flash-image';
const outDir = opt('--dir') ?? path.join(root, 'public', 'chips');
const only = args.includes('--all') ? null : (opt('--only') ?? 'suits');
const force = args.includes('--force');

function readKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
  const m = env.match(/^GEMINI_API_KEY=(.*)$/m);
  if (!m) throw new Error('GEMINI_API_KEY not found in .env.local');
  return m[1].trim().replace(/^["']|["']$/g, '');
}

// Straight down, on black: the chip has to come out as a clean circle that a
// mask can lift off its background, and it is drawn at 26px on the felt, so
// the shapes are bold and there is nothing written on it.
const STYLE = 'A single casino poker chip seen from directly above, a perfectly orthographic top-down view so the chip is a perfect circle. '
  + 'The chip is centred and fills about 85% of the square image. Pure solid black background (#000000), no table, no shadow, no reflection, nothing else in the image. '
  + 'The chip body is saturated violet (#7d4cf0) and its edge inserts are white. '
  + 'Bold, clean shapes that stay readable when the chip is shrunk to a tiny icon. No text, no numbers, no letters, no logos, no watermark.';

const STYLES = [
  { id: 'clay', brief: 'A classic clay casino chip: six evenly spaced white rectangular edge inserts, a thin white inner ring, a plain matte violet centre. Soft realistic studio lighting with a gentle bevel.' },
  { id: 'suits', brief: 'A ceramic casino chip: eight white edge blocks, a ring of tiny white card suits (spade, heart, diamond, club) around the inside, and a plain darker violet centre disc. Realistic, softly lit.' },
  { id: 'flat', brief: 'A flat vector-illustration chip for a modern game UI: eight crisp white edge notches, one thin white inner ring, a solid violet centre holding a single white diamond lozenge. Flat colour with only a subtle highlight, no photorealism.' },
  { id: 'luxe', brief: 'A luxury high-roller chip: a polished gold metal inner ring and gold edge inlays between the white inserts, a glossy violet enamel centre with a faceted gem-like shine. Realistic and rich.' },
  { id: 'neon', brief: 'A glossy futuristic chip: smooth glass-like violet body, six rounded white edge inserts, and a bright glowing lavender ring around a darker centre. Stylised 3D render, soft bloom on the chip only.' },
];

/* The eight denominations, as changes to the violet drawing: a hue rotation in
   degrees, then saturation and brightness as multipliers, then an optional
   flat lift. Named for the colour, in the order DENOMS walks them
   (src/components/SuitedApp.tsx): 500 down to 0.01. */
const COLOURS = [
  { id: 'purple', hue: 12, saturation: 1.1, brightness: 0.78 },
  { id: 'charcoal', hue: 0, saturation: 0.1, brightness: 0.5 },
  { id: 'red', hue: 95, saturation: 1.15, brightness: 1 },
  { id: 'gold', hue: 128, saturation: 1.3, brightness: 1.6 },
  { id: 'green', hue: 205, saturation: 1.05, brightness: 1.1 },
  { id: 'cream', hue: 140, saturation: 0.2, brightness: 1.75 },
  { id: 'slate', hue: 325, saturation: 0.38, brightness: 1.05 },
  { id: 'lavender', hue: 0, saturation: 0.6, brightness: 1.45 },
];

async function generate(prompt) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': readKey() },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } },
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${body.error?.message ?? ''}`);
  const part = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error('no image in response');
  return Buffer.from(part.inlineData.data, 'base64');
}

/* Lift the chip off its black ground: find the box of everything that is not
   black, take the circle inscribed in it, and mask to that circle a hair
   inside the edge so no black fringe comes with it. */
async function cutOut(png) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (Math.max(data[i], data[i + 1], data[i + 2]) > 46) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('no chip found on the background');
  const d = Math.min(x1 - x0, y1 - y0) + 1;
  const left = Math.max(0, Math.round((x0 + x1 + 1) / 2 - d / 2)), top = Math.max(0, Math.round((y0 + y1 + 1) / 2 - d / 2));
  const size = Math.min(d, info.width - left, info.height - top);
  const S = 256;
  const mask = Buffer.from(`<svg width="${S}" height="${S}"><circle cx="${S / 2}" cy="${S / 2}" r="${S / 2 - 2.5}" fill="#fff"/></svg>`);
  return sharp(png).extract({ left, top, width: size, height: size }).resize(S, S).ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

if (only && !STYLES.some((s) => s.id === only)) throw new Error(`--only is one of: ${STYLES.map((s) => s.id).join(', ')}`);
let drawn = 0;
for (const s of STYLES) {
  if (only && s.id !== only) continue;
  const dir = path.join(outDir, s.id);
  const baseFile = path.join(dir, 'base.png');
  fs.mkdirSync(dir, { recursive: true });
  if (force || !fs.existsSync(baseFile)) {
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        fs.writeFileSync(baseFile, await cutOut(await generate(`${STYLE} The design: ${s.brief}`)));
        console.log(`drew ${s.id}`);
        drawn++; ok = true;
      } catch (e) {
        console.log(`  ${s.id} attempt ${attempt} failed: ${e.message}`);
        if (attempt === 3) process.exitCode = 1;
      }
    }
    if (!ok) continue;
  } else {
    console.log(`kept ${s.id}/base.png`);
  }
  // 96px: the chip is 26px on the canvas, 35 at the largest scale, doubled for a dense screen.
  for (const c of COLOURS) {
    await sharp(baseFile).modulate({ hue: c.hue, saturation: c.saturation, brightness: c.brightness })
      .resize(96, 96).webp({ quality: 90 }).toFile(path.join(dir, `${c.id}.webp`));
  }
}
console.log(`${drawn} drawn, colours written → ${path.relative(root, outDir)}`);
