// Re-deal a finished hand in the browser and check it against what was shown.
//
// This is a second implementation of `packages/engine/src/verify.ts`, and that
// duplication is deliberate rather than lazy. The engine's picker is synchronous
// and built on node:crypto; WebCrypto's HMAC is async, so sharing the code would
// mean making the engine async to suit a browser it does not otherwise care
// about. A compact synchronous SHA-256 here is the smaller cost.
//
// The duplication is held honest by `packages/engine/test/browser-parity.test.ts`,
// which runs both against the same hands and fails if they ever disagree. If you
// change one, that test tells you to change the other.
//
// Verifying in the player's own browser is the point. A server that verifies its
// own deals proves nothing.

/* ── sha-256, synchronous ─────────────────────────────────────────────────── */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x, n) => (x >>> n) | (x << (32 - n));

export function sha256(bytes) {
  const len = bytes.length;
  const withPad = new Uint8Array((((len + 8) >> 6) + 1) << 6);
  withPad.set(bytes);
  withPad[len] = 0x80;
  const view = new DataView(withPad.buffer);
  view.setUint32(withPad.length - 4, len << 3, false);
  view.setUint32(withPad.length - 8, (len >>> 29) & 0x1f, false);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);

  for (let off = 0; off < withPad.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }

  const out = new Uint8Array(32);
  new DataView(out.buffer).setUint32(0, h[0], false);
  for (let i = 0; i < 8; i++) new DataView(out.buffer).setUint32(i * 4, h[i], false);
  return out;
}

/** HMAC-SHA256, matching node's `createHmac('sha256', key)`. */
export function hmacSha256(key, message) {
  let k = key.length > 64 ? sha256(key) : key;
  const pad = new Uint8Array(64);
  pad.set(k);
  const inner = new Uint8Array(64 + message.length);
  const outer = new Uint8Array(64 + 32);
  for (let i = 0; i < 64; i++) {
    inner[i] = pad[i] ^ 0x36;
    outer[i] = pad[i] ^ 0x5c;
  }
  inner.set(message, 64);
  outer.set(sha256(inner), 64);
  return sha256(outer);
}

/* ── bytes and hex ────────────────────────────────────────────────────────── */

const enc = new TextEncoder();
const toHex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

export function fromHex(hex) {
  const clean = String(hex).trim().toLowerCase();
  if (clean.length % 2 !== 0 || /[^0-9a-f]/.test(clean)) throw new Error('not hex');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const concat = (...parts) => {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};

/* ── the same derivation the engine uses ──────────────────────────────────── */

const COMMIT_TAG = 'suited/commit/v1';
const SHUFFLE_TAG = 'suited/shuffle/v1';

export const commitFor = (serverSeed, handNo) =>
  toHex(sha256(concat(enc.encode(COMMIT_TAG), serverSeed, enc.encode(String(handNo)))));

export function deriveShuffleSeed(serverSeed, handNo, clientSeeds) {
  const parts = [enc.encode(SHUFFLE_TAG), serverSeed, enc.encode(String(handNo))];
  for (const s of [...(clientSeeds ?? [])].sort()) parts.push(enc.encode(s));
  return sha256(concat(...parts));
}

/** Counter-mode HMAC stream with rejection sampling, matching `commitPicker`. */
function picker(seed) {
  let counter = 0;
  let buf = new Uint8Array(0);
  let off = 0;

  const refill = () => {
    const c = new Uint8Array(4);
    new DataView(c.buffer).setUint32(0, counter++, false);
    buf = hmacSha256(seed, c);
    off = 0;
  };
  const next32 = () => {
    if (off + 4 > buf.length) refill();
    const v = new DataView(buf.buffer, buf.byteOffset).getUint32(off, false);
    off += 4;
    return v;
  };

  return (bound) => {
    if (bound <= 1) return 0;
    // Discarding the tail matters: `% bound` alone biases low indices, which
    // over millions of hands is a real edge.
    const limit = Math.floor(0x100000000 / bound) * bound;
    for (;;) {
      const v = next32();
      if (v < limit) return v % bound;
    }
  };
}

const RANKS = '23456789TJQKA';
const SUITS = ['s', 'h', 'd', 'c'];

// Rank outer, suit inner: 2s 2h 2d 2c 3s … — matching `cards.ts`. Getting this
// backwards produces a valid-looking deck that fails every honest hand, which
// is how the parity test earned its place.
function freshDeck() {
  const d = [];
  for (let r = 0; r < 13; r++) for (let si = 0; si < 4; si++) d.push(RANKS[r] + SUITS[si]);
  return d;
}

/** Fisher–Yates, same traversal as the engine. */
export function deckFor(serverSeedHex, handNo, clientSeeds) {
  const pick = picker(deriveShuffleSeed(fromHex(serverSeedHex), handNo, clientSeeds));
  const d = freshDeck();
  for (let i = d.length - 1; i > 0; i--) {
    const j = pick(i + 1);
    const a = d[i]; d[i] = d[j]; d[j] = a;
  }
  return d;
}

/** Where the cards land: two each in seat order, then a burn before each street. */
export function layout(dealt) {
  const holes = [];
  for (let i = 0; i < dealt; i++) holes.push([i * 2, i * 2 + 1]);
  const after = dealt * 2;
  return { holes, flop: [after + 1, after + 2, after + 3], turn: after + 5, river: after + 7 };
}

/**
 * Check a hand. Synchronous, so the history screen can show a result the moment
 * it is asked rather than spinning.
 */
export function verifyHand(proof) {
  const seed = fromHex(proof.serverSeed);
  const commitOk = commitFor(seed, proof.handNo) === String(proof.commit).toLowerCase();

  const deck = deckFor(proof.serverSeed, proof.handNo, proof.clientSeeds);
  const at = layout(proof.dealt);
  const board = proof.board ?? [];

  const expectedBoard = [...at.flop, at.turn, at.river].slice(0, board.length).map((i) => deck[i] ?? '??');
  const boardOk = expectedBoard.join(' ') === board.join(' ');

  let holeOk = true;
  const problems = [];
  for (const r of proof.revealed ?? []) {
    const pair = at.holes[r.position];
    if (!pair) { holeOk = false; problems.push(`seat ${r.position} was not dealt in`); continue; }
    const expected = pair.map((i) => deck[i] ?? '??').join(' ');
    if (expected !== r.hole.join(' ')) {
      holeOk = false;
      problems.push(`position ${r.position}: expected ${expected}, shown ${r.hole.join(' ')}`);
    }
  }

  const shown = (proof.revealed ?? []).length;
  return {
    ok: commitOk && boardOk && holeOk,
    derivedSeed: toHex(deriveShuffleSeed(seed, proof.handNo, proof.clientSeeds)),
    deckDigest: toHex(sha256(enc.encode(deck.join('')))).slice(0, 16),
    checks: {
      commit: {
        ok: commitOk,
        detail: commitOk
          ? 'The revealed seed hashes to the commitment published before the deal'
          : 'The revealed seed does NOT hash to the published commitment',
      },
      board: {
        ok: boardOk,
        detail: boardOk
          ? board.length
            ? `all ${board.length} board cards came from the committed deck`
            : 'No board to check, the hand ended before the flop'
          : `Board does not match: expected ${expectedBoard.join(' ')}, shown ${board.join(' ')}`,
      },
      holeCards: {
        ok: holeOk,
        detail: holeOk
          ? shown
            ? `${shown} revealed hand${shown === 1 ? '' : 's'} matched the deck`
            : 'No cards were shown down, nothing to check'
          : problems.join('; '),
      },
    },
  };
}
