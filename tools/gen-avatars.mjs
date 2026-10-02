/* Generates the seat portraits — the faces a player wears at the table when
 * they have not equipped an avatar of their own — with Gemini, and writes them
 * as small square webps to public/avatars/portraits/p-NN.webp.
 *
 * The key is read from GEMINI_API_KEY in .env.local (or the environment) and
 * never printed. Existing files are kept, so a re-run only fills the gaps;
 * delete one to regenerate it.
 *
 *   node tools/gen-avatars.mjs [--model gemini-3.1-flash-image] [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const outDir = path.join(root, 'public', 'avatars', 'portraits');
const args = process.argv.slice(2);
const force = args.includes('--force');
const model = args.includes('--model') ? args[args.indexOf('--model') + 1] : 'gemini-3.1-flash-image';

function readKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
  const m = env.match(/^GEMINI_API_KEY=(.*)$/m);
  if (!m) throw new Error('GEMINI_API_KEY not found in .env.local');
  return m[1].trim().replace(/^["']|["']$/g, '');
}
const KEY = readKey();

// One shared look so the set reads as a set: the felt's navy and violet, a
// single rim light, head and shoulders centred for a round crop.
const STYLE = 'Stylized digital illustration avatar portrait of a poker player, head and shoulders, '
  + 'centred and facing the viewer, framed to be cropped into a circle. Moody high-stakes casino at night: '
  + 'deep navy background with a soft violet (#8b5cf6) rim light, subtle film grain, rich but restrained colour, '
  + 'confident expression. Clean painterly style, like a premium game character select screen. '
  + 'Square 1:1. No text, no letters, no logos, no watermark, no border, no cards covering the face.';

const CHARACTERS = [
  'a sharp-dressed man in a black tuxedo and loosened bow tie, slicked-back hair',
  'a woman with a red bob haircut, dark lipstick and a sequined black dress, smirking',
  'an older gentleman with a silver beard and a fedora, cigar in hand (unlit)',
  'a young hoodie-wearing online grinder with headphones around his neck and mirrored sunglasses',
  'a woman in a sleek white blazer with gold earrings and her hair in a tight bun, poker face',
  'a cowboy with a wide-brimmed hat and a weathered face, chewing a toothpick',
  'a man in a velvet maroon smoking jacket holding a stack of poker chips',
  'a woman with long black hair and aviator sunglasses, leather jacket',
  'a bald man with a thick moustache, waistcoat and pocket watch chain, stern stare',
  'a casino dealer woman in a crisp vest and bow tie, shuffling cards near her chest',
  'a high-roller with a gold chain, open-collar silk shirt and diamond ring, grinning',
  'a mysterious figure in a dark hooded trench coat, face half in shadow, glowing violet eyes',
  'a young woman with curly hair and a baseball cap worn backwards, playful wink',
  'an elegant older woman with pearls, silver hair and cat-eye glasses, knowing smile',
  'a man in a sharp navy suit with a scar over one eyebrow, holding an ace of spades',
  'a fox-like charismatic hustler with a pencil moustache, pinstripe suit and pocket square',
];

async function generate(prompt) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
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

fs.mkdirSync(outDir, { recursive: true });
let made = 0;
for (let i = 0; i < CHARACTERS.length; i++) {
  const file = path.join(outDir, `p-${String(i + 1).padStart(2, '0')}.webp`);
  if (!force && fs.existsSync(file)) { console.log(`skip ${path.basename(file)}`); continue; }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const png = await generate(`${STYLE} The character: ${CHARACTERS[i]}.`);
      // 160px covers the 72px profile disc at 2x; the seat disc is 30px.
      await sharp(png).resize(160, 160, { fit: 'cover' }).webp({ quality: 82 }).toFile(file);
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
