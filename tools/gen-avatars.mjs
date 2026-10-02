/* Generates the avatar art with Gemini and writes it as small square webps
 * under public/avatars/.
 *
 *   portraits/p-NN.webp   the sixteen free faces: what the profile picker offers
 *                         anyone, and what a seat wears at the table before its
 *                         player has chosen.
 *   portraits/pr-NN.webp  the prestige set, one per level title (NN is the level
 *                         that unlocks it). Same room, gold where the free set is
 *                         violet, so rank reads at the size of a seat disc.
 *   earned/<id>.webp      one emblem per achievement, named by its code. Objects,
 *                         never people: a disc with no face on it is a trophy,
 *                         and that has to be legible beside the faces above.
 *
 * The ids and level gates live in SuitedApp.tsx (AV) — keep the two in step.
 *
 * The key is read from GEMINI_API_KEY in .env.local (or the environment) and
 * never printed. Existing files are kept, so a re-run only fills the gaps;
 * delete one to regenerate it.
 *
 *   node tools/gen-avatars.mjs [--set portraits|prestige|earned|all] [--only <id>] [--model gemini-3.1-flash-image] [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const outDir = path.join(root, 'public', 'avatars');
const args = process.argv.slice(2);
const force = args.includes('--force');
const model = args.includes('--model') ? args[args.indexOf('--model') + 1] : 'gemini-3.1-flash-image';
const which = args.includes('--set') ? args[args.indexOf('--set') + 1] : 'all';
// One file by its name without the extension (`--only quads`), for a redo.
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

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

/* Prestige: the same table, lit in gold. The free set came back with a circle
   drawn into some of the squares, which leaves pale corners behind the disc —
   so this one says outright not to. */
const PRESTIGE_STYLE = 'Stylized digital illustration avatar portrait of an elite poker player, head and shoulders, '
  + 'centred and facing the viewer. Moody high-stakes casino at night: deep navy background with a warm polished-gold '
  + '(#d4a84f) rim light and gold accents, subtle film grain, rich but restrained colour, an air of status and wealth. '
  + 'Clean painterly style, like the premium unlockable tier of a game character select screen. '
  + 'Square 1:1, the scene fills the whole square edge to edge: do NOT draw a circular frame, vignette, border or white corners. '
  + 'No text, no letters, no numbers, no logos, no watermark.';

// [level, character] — the level is the file name and the unlock gate.
const PRESTIGE = [
  [5, 'a focused young professional in a fitted charcoal suit, rolling a single gold poker chip across his knuckles'],
  [10, 'a composed woman in an emerald silk blouse wearing a gold tournament bracelet, chin resting on her hand, faint knowing smile'],
  [15, 'an anthropomorphic great white shark in a tailored midnight-blue tuxedo with a gold tie pin, cold confident grin'],
  [20, 'a sly anthropomorphic rat in a riverboat gambler\'s gold-brocade waistcoat and tipped bowler hat, gold pocket watch chain'],
  [25, 'a powerful woman in a black blazer embroidered with gold thread, heavy gold rings, arms crossed, dominant stare'],
  [30, 'a larger-than-life high roller in a white dinner jacket with gold lapels and a diamond ring, towering stacks of gold chips in front of him'],
  [40, 'a silver-haired veteran champion in a black velvet tuxedo with several gold bracelets on his wrist, a golden laurel wreath glowing faintly behind his head'],
  [50, 'a regal masked figure in a black and gold robe wearing a golden crown, eyes glowing gold, golden playing cards orbiting around them in an aura of golden light'],
];

/* Earned: the thing the achievement is about, as an emblem. The light follows
   the tier — violet for the common ones, gold arriving with rarity — which is
   the same ladder the prestige set climbs. */
const EARNED_STYLE = 'Stylized digital illustration game achievement emblem: one bold, simple subject, centred and large, '
  + 'readable as a tiny round icon. No people, no faces, no hands unless described. Moody high-stakes casino at night: '
  + 'deep navy background, subtle film grain, rich but restrained colour, clean painterly style matching a premium '
  + 'poker game\'s collectible badges. Square 1:1, the scene fills the whole square edge to edge: do NOT draw a circular '
  + 'frame, medallion border, vignette or white corners. No words, no captions, no logos, no watermark; playing-card '
  + 'ranks and suit symbols only where the subject calls for them.';
const TIER_LIGHT = {
  common: 'Lit by a soft violet (#8b5cf6) rim light.',
  uncommon: 'Lit by a violet (#8b5cf6) rim light with a few brass highlights.',
  rare: 'Lit by a warm polished-gold (#d4a84f) rim light with gold accents.',
  mythic: 'Bathed in a radiant golden aura with drifting gold sparks, unmistakably the rarest tier.',
};

// [achievement code, tier, subject] — codes and tiers mirror AV in SuitedApp.tsx.
const EARNED = [
  ['chip-1', 'common', 'a single violet poker chip standing on its edge, spinning on dark felt'],
  ['chip-5', 'common', 'five poker chips flying in a row, trailing bright flames like a comet'],
  ['chip-25', 'common', 'a worn deck of cards beside a neat familiar stack of poker chips under a small table lamp'],
  ['chip-100', 'common', 'a great heaped mountain of poker chips with one chip planted on the summit'],
  ['button', 'uncommon', 'a large white round dealer button marked with a single letter D, resting on dark felt'],
  ['lvl-10', 'uncommon', 'a silver star medal on a ribbon draped over a short stack of poker chips'],
  ['lvl-20', 'uncommon', 'a single playing card being turned face-up on wet felt with water rippling outward from it'],
  ['lvl-30', 'rare', 'a golden whale breaching out of a sea of poker chips'],
  ['lvl-40', 'mythic', 'a golden trophy cup wrapped in a laurel wreath on a pedestal of poker chips'],
  ['day-one', 'mythic', 'a sunrise breaking over a casino skyline, seen behind one golden poker chip standing upright like the rising sun'],
  ['boat', 'uncommon', 'a paddle-steamer riverboat with glowing windows sailing on dark water at night'],
  ['quads', 'rare', 'four aces fanned out, one of each suit, glowing'],
  ['straight-flush', 'rare', 'five consecutive heart cards, 5 6 7 8 9 of hearts, arcing in a streak of light'],
  ['wheel', 'rare', 'a golden spoked wheel with five playing cards, ace 2 3 4 5, fanned around its rim'],
  ['royal', 'mythic', 'a royal flush in spades, 10 J Q K A, fanned beneath a floating golden crown'],
  ['jackpot', 'mythic', 'a treasure chest bursting open with gold coins, poker chips and confetti'],
  ['seven-deuce', 'uncommon', 'a seven of spades and a two of hearts leaning together, wearing a jester\'s cap with bells'],
  ['all-in', 'uncommon', 'two hands shoving a huge pile of poker chips forward across the felt'],
  ['suited', 'uncommon', 'an ace and a king of spades overlapping, with a large glowing spade symbol behind them'],
  ['cooler', 'uncommon', 'a pair of kings frozen solid inside a block of ice, frost creeping across the felt'],
  ['five-bills', 'rare', 'a fan of five banknotes held in a gold money clip'],
  ['verified', 'rare', 'a magnifying glass over a playing card, a glowing check mark inside the lens'],
  ['the-nuts', 'mythic', 'a golden walnut cracked open, a glowing ace of spades rising out of it'],
];

const two = (n) => String(n).padStart(2, '0');
const wants = (set) => which === 'all' || which === set;
const JOBS = [
  ...(wants('portraits') ? CHARACTERS.map((c, i) => ({ name: `portraits/p-${two(i + 1)}.webp`, prompt: `${STYLE} The character: ${c}.` })) : []),
  ...(wants('prestige') ? PRESTIGE.map(([lvl, c]) => ({ name: `portraits/pr-${two(lvl)}.webp`, prompt: `${PRESTIGE_STYLE} The character: ${c}.` })) : []),
  ...(wants('earned') ? EARNED.map(([id, tier, c]) => ({ name: `earned/${id}.webp`, prompt: `${EARNED_STYLE} ${TIER_LIGHT[tier]} The subject: ${c}.` })) : []),
].filter((j) => !only || path.basename(j.name, '.webp') === only);

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

let made = 0;
for (const job of JOBS) {
  const file = path.join(outDir, job.name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!force && fs.existsSync(file)) { console.log(`skip ${path.basename(file)}`); continue; }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const png = await generate(job.prompt);
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
