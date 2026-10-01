// Re-run a finished jackpot draw in the browser and check it against what was
// published.
//
// This is a second implementation of the gateway's draw — `draw.ts` (commit,
// random value, entrant ids) and `jackpot.ts` (tickets, holder weights, the
// walk) — and the duplication is deliberate, for the same reason as
// `verify.js`: a server that checks its own draws proves nothing. It is held
// honest by `services/gateway/test/draw-verify-parity.test.ts`, which runs both
// on the same fields and fails if they ever disagree. Change one, change the
// other.
//
// What it cannot do from inside the page is look the Ethereum block up — the
// page may only talk to its own origin — so it checks everything else, and
// hands back the block's number for the player to check on any explorer: its
// hash, and that it is the first block at or after the close.

import { sha256 } from './verify';

const DRAW_TAG = 'suited/draw/v1';
const ENTRANT_TAG = 'suited/draw/entrant/v1';

const enc = new TextEncoder();
const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (h) => {
  const s = h.startsWith('0x') ? h.slice(2) : h;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
};
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

/** SHA-256("suited/draw/v1" ‖ seed ‖ day) — published when the day opens. */
export const commitFor = (seedHex, day) =>
  hex(sha256(concat(enc.encode(DRAW_TAG), fromHex(seedHex), enc.encode(day))));

/** First 7 bytes of SHA-256("suited/draw/v1" ‖ seed ‖ day ‖ blockhash), ÷ 2^56. */
export function randomFor(seedHex, day, blockhash) {
  const d = sha256(concat(enc.encode(DRAW_TAG), fromHex(seedHex), enc.encode(day), enc.encode(blockhash)));
  let n = 0;
  for (let i = 0; i < 7; i++) n = n * 256 + d[i];
  return n / 2 ** 56;
}

/** An entrant's name in the field: first 16 bytes of SHA-256(tag ‖ day ‖ address). */
export const entrantId = (day, address) =>
  hex(sha256(concat(enc.encode(ENTRANT_TAG), enc.encode(day), enc.encode(String(address).toLowerCase())))).slice(0, 32);

/* ── the ticket maths, operation for operation ──────────────────────────── */

const byKey = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byOddsThenKey = (a, b) => b.odds - a.odds || byKey(a.id, b.id);
const ticketsOf = (odds) => Math.max(1, Math.round(odds * 10_000));

function playerTickets(players, rules) {
  const min = BigInt(rules.minVolumeToEnter);
  const eligible = players.filter((p) => BigInt(p.volume) >= min).sort((a, b) => byKey(a.id, b.id));
  if (!eligible.length) return [];
  const raw = eligible.map((p) => ({ id: p.id, weight: Math.pow(Number(BigInt(p.volume)) / 1e6, rules.ticketAlpha) }));
  const total = raw.reduce((a, r) => a + r.weight, 0);
  if (total <= 0) return [];
  const cap = Math.max(rules.maxTicketShareBps / 10_000, 1 / raw.length);
  const capped = new Map();
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    const uncappedTotal = raw.reduce((a, r) => (capped.has(r.id) ? a : a + r.weight), 0);
    const capacityLeft = 1 - [...capped.values()].reduce((a, v) => a + v, 0);
    for (const r of raw) {
      if (capped.has(r.id)) continue;
      const share = (r.weight / uncappedTotal) * capacityLeft;
      if (share > cap + 1e-9) {
        capped.set(r.id, cap);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const uncappedTotal = raw.reduce((a, r) => (capped.has(r.id) ? a : a + r.weight), 0);
  const capacityLeft = 1 - [...capped.values()].reduce((a, v) => a + v, 0);
  return raw
    .map((r) => {
      const odds = capped.has(r.id) ? capped.get(r.id) : uncappedTotal > 0 ? (r.weight / uncappedTotal) * capacityLeft : 0;
      return { id: r.id, odds, tickets: ticketsOf(odds) };
    })
    .sort(byOddsThenKey);
}

function holderWeights(holders, h) {
  const supply = BigInt(h.supply);
  if (supply <= 0n) return [];
  const out = [];
  for (const x of [...holders].sort((a, b) => byKey(a.id, b.id))) {
    const held = BigInt(x.held);
    const staked = BigInt(x.staked);
    const total = held + staked;
    if (total * 10_000n < supply * BigInt(h.entryBps)) continue;
    const base = Number(held) + Number(staked) * (h.stakedWeightBps / 10_000);
    const full = total * 10_000n >= supply * BigInt(h.fullBps) || staked * 10_000n >= supply * BigInt(h.stakedFullBps);
    const weight = full ? base : base * (h.minorWeightBps / 10_000);
    if (weight > 0) out.push({ id: x.id, weight });
  }
  return out;
}

/** The ticket list a field's inputs produce — what the gateway's draw walked. */
export function ticketsFor(field) {
  const p = playerTickets(field.players, field.rules);
  const h = field.rules.holders;
  const weights = h ? holderWeights(field.holders, h) : [];
  if (!weights.length) return p;
  const totalWeight = weights.reduce((a, w) => a + w.weight, 0);
  if (totalWeight <= 0) return p;
  if (!p.length) {
    return weights
      .map((w) => ({ id: w.id, odds: w.weight / totalWeight }))
      .map((x) => ({ id: x.id, odds: x.odds, tickets: ticketsOf(x.odds) }))
      .sort(byOddsThenKey);
  }
  const groupShare = h.groupCapBps / 10_000;
  const cap = p[0].odds * (1 - groupShare);
  const capped = new Map();
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    const uncappedWeight = weights.reduce((a, w) => (capped.has(w.id) ? a : a + w.weight), 0);
    const left = groupShare - [...capped.values()].reduce((a, v) => a + v, 0);
    if (uncappedWeight <= 0 || left <= 0) break;
    for (const w of weights) {
      if (capped.has(w.id)) continue;
      if ((w.weight / uncappedWeight) * left > cap + 1e-12) {
        capped.set(w.id, cap);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const uncappedWeight = weights.reduce((a, w) => (capped.has(w.id) ? a : a + w.weight), 0);
  const left = Math.max(0, groupShare - [...capped.values()].reduce((a, v) => a + v, 0));
  const holderOdds = weights.map((w) => ({
    id: w.id,
    odds: capped.has(w.id) ? capped.get(w.id) : uncappedWeight > 0 ? (w.weight / uncappedWeight) * left : 0,
  }));
  const holderTotal = holderOdds.reduce((a, x) => a + x.odds, 0);
  const scale = 1 - holderTotal;
  const merged = new Map();
  for (const x of p) merged.set(x.id, x.odds * scale);
  for (const x of holderOdds) merged.set(x.id, (merged.get(x.id) ?? 0) + x.odds);
  return [...merged.entries()]
    .filter(([, odds]) => odds > 0)
    .map(([id, odds]) => ({ id, odds, tickets: ticketsOf(odds) }))
    .sort(byOddsThenKey);
}

/** Walk the published tickets: the entry that takes the cursor to ≤ 0 wins. */
export function walk(tickets, random) {
  if (!tickets.length) return null;
  let cursor = random * tickets.reduce((a, t) => a + t.odds, 0);
  for (const t of tickets) {
    cursor -= t.odds;
    if (cursor <= 0) return t.id;
  }
  return tickets[tickets.length - 1].id;
}

/**
 * Check a draw record from `/api/jackpot/draw?day=`. Every check is reported,
 * not just the first failure, so a player sees exactly what held and what did
 * not. `me` (optional) is the viewer's own address, to find their entry.
 */
export function verifyDraw(record, me) {
  const d = record && record.draw;
  const f = record && record.field;
  const day = record && record.day;
  const checks = [];
  const add = (key, ok, label) => checks.push({ key, ok, label });
  if (!d || !d.seed) {
    return { ok: false, verifiable: false, checks, reason: 'this day has not been drawn yet' };
  }
  add('commit', commitFor(d.seed, day) === d.commit, 'the revealed seed matches the commitment published at the start of the day');
  add('random', randomFor(d.seed, day, d.blockhash) === d.random, 'the random value comes from that seed and the Ethereum block');
  if (!f) {
    return {
      ok: checks.every((c) => c.ok), verifiable: false, checks,
      reason: 'drawn before full fields were published — the seed and block check, the entrant list cannot',
    };
  }
  add('block', !!f.entropy && f.entropy.hash === d.blockhash && f.entropy.number === d.blockNumber
    && f.entropy.timestamp * 1000 >= record.closesAt, 'the Ethereum block is dated at or after the close');

  // Recompute every entry's odds from its published inputs. Compared by id and
  // with a hair of tolerance: `Math.pow` may differ in the last bit between
  // browsers. The walk below uses the published odds, which are exact.
  const mine = ticketsFor(f);
  const byId = new Map<any, any>(f.tickets.map((t) => [t.id, t]));
  const same = mine.length === f.tickets.length && mine.every((t) => {
    const pub = byId.get(t.id);
    return !!pub && pub.tickets === t.tickets && Math.abs(pub.odds - t.odds) <= 1e-12 * Math.max(1, Math.abs(t.odds));
  });
  const ordered = f.tickets.every((t, i, a) => i === 0 || byOddsThenKey(a[i - 1], t) <= 0);
  add('tickets', same && ordered && f.tickets.length === d.entrants,
    `all ${f.tickets.length} entries' chances follow from their published inputs and the rules`);

  const winnerId = walk(f.tickets, d.random);
  // A day nobody entered draws nobody. That is a real, checkable outcome — an
  // empty field with no winner — not a failure to find one.
  const empty = f.tickets.length === 0;
  add(
    'winner',
    empty ? !d.winner : !!d.winner && winnerId === entrantId(day, d.winner),
    empty ? 'nobody was in the draw, and nobody was drawn' : 'walking the tickets with the random value lands on the winner',
  );

  let you = null;
  if (me) {
    const id = entrantId(day, me);
    const i = f.tickets.findIndex((t) => t.id === id);
    if (i >= 0) you = { id, rank: i + 1, odds: f.tickets[i].odds, tickets: f.tickets[i].tickets };
  }
  return {
    ok: checks.every((c) => c.ok),
    verifiable: true,
    checks,
    winnerId,
    you,
    entries: f.tickets.length,
    block: { number: f.entropy.number, hash: f.entropy.hash, timestamp: f.entropy.timestamp },
  };
}
