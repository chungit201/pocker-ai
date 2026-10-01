// suited — pure poker rules. No DOM, no timers, no randomness except the
// injected RNG. Everything here is deterministic given a seed, which is what
// makes a commit–reveal fairness receipt possible.

export const RANKS = '23456789TJQKA';
export const SUITS = ['s', 'h', 'd', 'c'];
export const SUIT_GLYPH = { s: '♠', h: '♥', d: '♦', c: '♣' };

const RANK_NAME = ['deuce', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace'];
const RANK_PLURAL = ['deuces', 'threes', 'fours', 'fives', 'sixes', 'sevens', 'eights', 'nines', 'tens', 'jacks', 'queens', 'kings', 'aces'];

// A card is { r: 0..12, s: 's'|'h'|'d'|'c', si: 0..3, id: 'As' }. `si` exists so
// suits can index arrays without leaking the numeric form into the UI.
export const card = (r, si) => ({ r, s: SUITS[si], si, id: RANKS[r] + SUITS[si] });
export const cardLabel = (c) => RANKS[c.r] + SUIT_GLYPH[c.s];

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function freshDeck() {
  const d = [];
  for (let r = 0; r < 13; r++) for (let si = 0; si < 4; si++) d.push(card(r, si));
  return d;
}

export function shuffle(deck, rng) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/* ── evaluation ────────────────────────────────────────────────────────────
   evaluate(cards) -> { v: [category, ...kickers], name }
   Categories 0 high card … 8 straight flush. Compare with cmp().           */

const CATS = ['high card', 'pair', 'two pair', 'three of a kind', 'straight', 'flush', 'full house', 'four of a kind', 'straight flush'];

function straightTop(mask) {
  for (let hi = 12; hi >= 4; hi--) {
    let ok = true;
    for (let k = 0; k < 5; k++) if (!((mask >> (hi - k)) & 1)) { ok = false; break; }
    if (ok) return hi;
  }
  if ((mask >> 12) & 1 && mask & 1 && (mask >> 1) & 1 && (mask >> 2) & 1 && (mask >> 3) & 1) return 3;
  return -1;
}

export function evaluate(cards) {
  const rc = new Array(13).fill(0), sc = [0, 0, 0, 0], bySuit = [[], [], [], []];
  let mask = 0;
  for (const c of cards) { rc[c.r]++; sc[c.si]++; bySuit[c.si].push(c.r); mask |= 1 << c.r; }

  let flushSuit = -1;
  for (let s = 0; s < 4; s++) if (sc[s] >= 5) flushSuit = s;

  if (flushSuit >= 0) {
    let fmask = 0;
    for (const r of bySuit[flushSuit]) fmask |= 1 << r;
    const sf = straightTop(fmask);
    if (sf >= 0) {
      return { v: [8, sf], name: sf === 12 ? 'royal flush' : `straight flush, ${RANK_NAME[sf]}-high` };
    }
  }

  const groups = []; // [count, rank] sorted desc
  for (let r = 12; r >= 0; r--) if (rc[r]) groups.push([rc[r], r]);
  groups.sort((a, b) => b[0] - a[0] || b[1] - a[1]);

  const quad = groups.find((g) => g[0] === 4);
  if (quad) {
    const k = groups.filter((g) => g[1] !== quad[1]).map((g) => g[1]).sort((a, b) => b - a)[0];
    return { v: [7, quad[1], k], name: `four ${RANK_PLURAL[quad[1]]}` };
  }

  const trips = groups.filter((g) => g[0] === 3).map((g) => g[1]).sort((a, b) => b - a);
  const pairs = groups.filter((g) => g[0] === 2).map((g) => g[1]).sort((a, b) => b - a);
  if (trips.length && (trips.length > 1 || pairs.length)) {
    const p = trips.length > 1 ? Math.max(trips[1], pairs[0] ?? -1) : pairs[0];
    return { v: [6, trips[0], p], name: `${RANK_PLURAL[trips[0]]} full of ${RANK_PLURAL[p]}` };
  }

  if (flushSuit >= 0) {
    const top = bySuit[flushSuit].slice().sort((a, b) => b - a).slice(0, 5);
    return { v: [5, ...top], name: `${RANK_NAME[top[0]]}-high flush` };
  }

  const st = straightTop(mask);
  if (st >= 0) return { v: [4, st], name: `straight to the ${RANK_NAME[st]}` };

  if (trips.length) {
    const ks = groups.filter((g) => g[1] !== trips[0]).map((g) => g[1]).sort((a, b) => b - a).slice(0, 2);
    return { v: [3, trips[0], ...ks], name: `three ${RANK_PLURAL[trips[0]]}` };
  }
  if (pairs.length >= 2) {
    const ks = groups.filter((g) => g[1] !== pairs[0] && g[1] !== pairs[1]).map((g) => g[1]).sort((a, b) => b - a)[0];
    return { v: [2, pairs[0], pairs[1], ks], name: `two pair, ${RANK_PLURAL[pairs[0]]} and ${RANK_PLURAL[pairs[1]]}` };
  }
  if (pairs.length === 1) {
    const ks = groups.filter((g) => g[1] !== pairs[0]).map((g) => g[1]).sort((a, b) => b - a).slice(0, 3);
    return { v: [1, pairs[0], ...ks], name: `pair of ${RANK_PLURAL[pairs[0]]}` };
  }
  const hi = groups.map((g) => g[1]).sort((a, b) => b - a).slice(0, 5);
  return { v: [0, ...hi], name: `${RANK_NAME[hi[0]]} high` };
}

export function cmp(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? -1) - (b[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

export const catName = (v) => CATS[v[0]];

/* ── preflop shorthand + a cheap equity estimate for bots ───────────────── */

export function holeLabel(hole) {
  const [a, b] = hole[0].r >= hole[1].r ? hole : [hole[1], hole[0]];
  if (a.r === b.r) return RANKS[a.r] + RANKS[b.r];
  return RANKS[a.r] + RANKS[b.r] + (a.s === b.s ? 's' : 'o');
}

// Monte-carlo win share vs N random opponents. Small sample on purpose: bots
// should be good, not solved.
export function equity(hole, board, opponents, rng, iters = 90) {
  const dead = new Set([...hole, ...board].map((c) => c.id));
  const pool = freshDeck().filter((c) => !dead.has(c.id));
  let score = 0;
  for (let i = 0; i < iters; i++) {
    const p = pool.slice();
    for (let k = p.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [p[k], p[j]] = [p[j], p[k]];
    }
    let idx = 0;
    const runout = board.concat(p.slice(idx, idx += 5 - board.length));
    const mine = evaluate(hole.concat(runout)).v;
    let best = 0, ties = 1;
    for (let o = 0; o < opponents; o++) {
      const oh = [p[idx++], p[idx++]];
      const c = cmp(evaluate(oh.concat(runout)).v, mine);
      if (c > 0) { best = 1; break; }
      if (c === 0) ties++;
    }
    if (!best) score += 1 / ties;
  }
  return score / iters;
}
