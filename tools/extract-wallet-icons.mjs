/* Pulls the official wallet marks out of RainbowKit and writes them to
 * public/wallets/ as plain SVG files.
 *
 * Why extract rather than import: RainbowKit ships each icon as its own chunk
 * with a content-hashed filename (metaMaskWallet-EI6MED72.js), so there is no
 * stable specifier to import. And the public API that would hand them over —
 * the wallet factories — throws without a WalletConnect project id for half of
 * them, MetaMask included, and returns the icon as a lazy promise. Neither fits
 * a synchronous render path.
 *
 * So the files are checked in, and this is the tool that authored them. Run it
 * again after a RainbowKit upgrade; it rewrites the same seven paths and says
 * what changed. It is NOT part of the build — nothing at runtime depends on it.
 *
 *   node tools/extract-wallet-icons.mjs
 *
 * Icons are the wallets' own marks, served from our origin. Nothing is fetched
 * from a third party at runtime, and no logo is drawn by hand here.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'node_modules/@rainbow-me/rainbowkit/dist';
const OUT = 'public/wallets';

/* chunk prefix in RainbowKit's dist → the id used by src/engine/wallet-catalogue.ts */
const WANTED = {
  metaMaskWallet: 'metamask',
  rabbyWallet: 'rabby',
  coinbaseWallet: 'coinbase',
  okxWallet: 'okx',
  phantomWallet: 'phantom',
  backpackWallet: 'backpack',
  binanceWallet: 'binance',
  bitgetWallet: 'bitget',
};

if (!existsSync(DIST)) {
  console.error(`no ${DIST} — install dependencies first`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const files = readdirSync(DIST);
let written = 0, failed = 0;

for (const [chunk, id] of Object.entries(WANTED)) {
  // Content-hashed, so matched by prefix. More than one match means the guess
  // is ambiguous and is reported rather than resolved by picking the first.
  const hits = files.filter((f) => f.startsWith(`${chunk}-`) && f.endsWith('.js'));
  if (hits.length !== 1) {
    console.log(`FAIL ${id}: ${hits.length} chunks match "${chunk}-*.js" — ${hits.join(', ') || 'none'}`);
    failed++;
    continue;
  }

  const src = readFileSync(join(DIST, hits[0]), 'utf8');
  /* The icon chunk is a single default export of a data URI. RainbowKit writes
     them URL-encoded rather than base64, so this is decodeURIComponent and not
     a Buffer round-trip. */
  const m = src.match(/"data:image\/svg\+xml,([^"]+)"/);
  if (!m) {
    console.log(`FAIL ${id}: ${hits[0]} holds no svg data URI — is it the connector chunk rather than the icon?`);
    failed++;
    continue;
  }

  let svg;
  try { svg = decodeURIComponent(m[1]); } catch (e) {
    console.log(`FAIL ${id}: could not decode the data URI (${e.message})`);
    failed++;
    continue;
  }
  /* Cheap sanity: it must actually be an SVG root, or we would be writing a
     file the browser silently refuses to render — exactly the invisible-icon
     failure this is meant to avoid. An XML declaration may come first; Backpack
     ships one and the others do not. */
  if (!/^\s*(<\?xml[^>]*\?>\s*)?<svg[\s>]/.test(svg) || !/<\/svg>\s*$/.test(svg)) {
    console.log(`FAIL ${id}: decoded to something that is not an <svg> element`);
    failed++;
    continue;
  }

  const path = join(OUT, `${id}.svg`);
  const before = existsSync(path) ? readFileSync(path, 'utf8') : null;
  writeFileSync(path, svg);
  console.log(`${before === null ? ' new ' : before === svg ? ' same' : ' CHANGED'} ${path}  (${svg.length} bytes, from ${hits[0]})`);
  written++;
}

/* Solflare is the one wallet RainbowKit does not carry — it is Solana-only and
   RainbowKit is an EVM library. Its own adapter has the mark, but that package
   is not a dependency here and should not become one for an asset: Wallet
   Standard discovery is what finds Solflare at runtime, not an adapter. So it
   is installed transiently when this tool runs:
     npm install --no-save @solana/wallet-adapter-solflare
   and the extracted file is what ships. */
const SOLFLARE = 'node_modules/@solana/wallet-adapter-solflare/lib/cjs/adapter.js';
if (existsSync(SOLFLARE)) {
  const src = readFileSync(SOLFLARE, 'utf8');
  const m = src.match(/data:image\/(svg\+xml|png);(base64,)?([^'"`]+)/);
  if (m) {
    const path = join(OUT, m[1] === 'svg+xml' ? 'solflare.svg' : 'solflare.png');
    const body = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'utf8');
    const before = existsSync(path) ? readFileSync(path) : null;
    writeFileSync(path, body);
    console.log(`${before && before.equals(body) ? ' same' : before ? ' CHANGED' : ' new '} ${path}  (${body.length} bytes, from the solflare adapter)`);
    written++;
  } else {
    console.log('FAIL solflare: no data URI in its adapter');
    failed++;
  }
} else {
  console.log(`skip solflare: ${SOLFLARE} not present`);
  console.log('      npm install --no-save @solana/wallet-adapter-solflare, then re-run');
}

console.log(`\n${written} written, ${failed} failed`);
process.exit(failed ? 1 : 0);
