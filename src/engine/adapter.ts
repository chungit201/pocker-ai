// ══════════════════════════════════════════════════════════════════════════
// suited — THE SEAM.
//
// The UI talks to exactly this interface and nothing else. Swap the local
// adapter for a remote one and the frontend does not change.
//
//   const t = createLocalAdapter({ ... })       // demo: bots, local RNG
//   const t = createRemoteAdapter({ ... })      // production: ws + evm
//
//   t.subscribe((state, event) => …)  → unsubscribe fn. Called once per event.
//   t.getState()                      → latest projected TableState
//   t.getLegal()                      → LegalActions | null (hero only)
//   t.act({type,to})                  → 'fold'|'check'|'call'|'raise'
//   t.sitOut() / t.sitIn() / t.sitUp() / t.leave() / t.topUp(n)
//   t.useTimeBank()                   ← two banks, preflop and postflop
//   t.dropConnection() / t.restoreConnection()   ← reconnect demo hooks
//   t.history()                       → HandRecord[]  (newest first)
//   t.verify(handId)                  → { ok, commit, seed, board, deckDigest }
//   t.destroy()
//
// EVENTS (t = type). Each carries `state`, the table as of that moment:
//   hand:start      handNo handId commit button
//   blind           seat amount kind('sb'|'bb')
//   deal:hole       seats[]
//   turn            seat            ← state.clock = {seat,startedAt,duration}
//   action          seat type amount to allIn
//   uncalled        seat amount
//   street:collect  pot from[{seat,amount}]
//   street          street cards[] board[]
//   runout          street
//   showdown        reveals[{seat,hole,name}]
//   award           awards[{seat,amount,potIndex,name,split}]
//   hand:end        handId commit board winners seats[]
//   timebank        seat
//   connection      status('online'|'reconnecting')
//
// The delays below are the pacing of the game. They are data, not code.
// ══════════════════════════════════════════════════════════════════════════

import { createTable } from './table';
import { decide } from './bots';
import { mulberry32, freshDeck, shuffle } from './poker';
import { verifyRemote } from './remote';

// Turn clocks, in ms. Preflop is short unless someone has raised.
export const TURN = { preflop: 10000, preflopRaised: 15000, postflop: 15000 };
export const heroTurnMs = (st) =>
  st.street !== 'preflop' ? TURN.postflop
    : (st.currentBet > st.bb ? TURN.preflopRaised : TURN.preflop);

export const BEATS = {
  'hand:start': 380,
  blind: 260,
  'deal:hole': 1250,
  turn: 0,
  action: 560,
  uncalled: 440,
  'street:collect': 900,
  street: 1150,
  runout: 900,
  showdown: 2300,
  award: 3400,
  'hand:end': 2600,
  timebank: 400,
  connection: 0,
};

export function createLocalAdapter(cfg) {
  const table = createTable(cfg);
  const heroIdx = cfg.heroIdx ?? 0;
  let pace = cfg.pace ?? 1;
  let subs = [];
  let queue = [];
  let timer = null, botTimer = null, clockTimer = null;
  let dead = false, paused = false;
  let connection = 'online';
  /* The snapshot the table hands back is the hand's state; `publish` then
     decorates it with what only the adapter knows — the turn clock, the socket's
     health, which seat is the hero, the history behind this hand. Those four are
     added after the fact, so the inferred snapshot shape is deliberately widened
     rather than the decoration being moved into the engine, which would put
     client-only concerns inside the rules. */
  let view: any = table.snapshot();
  let clock = null;
  let history = [];
  let bank = null;      // {at, post, granted} while a time bank is running
  let autoFold = false; // "sit up" mid-hand: fold as soon as it is our turn
  const rng = mulberry32((cfg.seed ?? 1) ^ 0x9e3779b9);

  const publish = (event) => {
    view = event ? event.state : view;
    view.clock = clock;
    view.connection = connection;
    view.heroIdx = heroIdx;
    view.handHistory = history;
    subs.forEach((f) => { try { f(view, event || null); } catch (e) { console.error(e); } });
  };

  function pump(events) {
    queue.push(...events);
    if (!timer && !paused) step();
  }

  function step() {
    timer = null;
    if (dead || paused) return;
    const e = queue.shift();
    if (!e) return;

    if (e.t === 'hand:end') history = [record(e), ...history].slice(0, 60);

    if (e.t === 'turn') {
      const seat = e.state.seats[e.seat];
      if (seat.kind === 'hero') {
        if (autoFold) {
          autoFold = false;
          timer = setTimeout(() => { timer = null; if (!dead && !paused) pump(table.act(heroIdx, { type: 'fold' })); }, 260 * pace);
          return;
        }
        bank = null;
        const dur = heroTurnMs(table.state);
        clock = { seat: e.seat, startedAt: Date.now(), duration: dur, hero: true };
        publish(e);
        armHeroClock(dur);
      } else {
        const legal = table.legalActions(e.seat);
        // A stale turn: the live table has already moved past this seat (its
        // `toAct` no longer matches), so there is nothing legal to decide. Skip
        // it and drain the rest of the queue rather than reading a null.
        if (!legal) { timer = setTimeout(step, 0); return; }
        const d = decide(table.state, e.seat, legal, rng);
        const think = d.think * pace;
        clock = { seat: e.seat, startedAt: Date.now(), duration: think };
        publish(e);
        botTimer = setTimeout(() => {
          botTimer = null;
          if (dead || paused) return;
          clock = null;
          pump(table.act(e.seat, d.action));
        }, think);
      }
      return;
    }

    clock = null;
    publish(e);
    const wait = (BEATS[e.t] ?? 300) * pace;
    if (e.t === 'hand:end') {
      // Mirror the gateway (actor.ts): a seat whose stack busted at the hand
      // boundary is sat out, so it is not dealt the next hand, the client reads
      // it as busted and offers a rebuy, and heads-up the table freezes on the
      // rebuy prompt rather than trying to deal to one player. The engine itself
      // stays pure — parity with the server engine depends on it not doing this
      // — so the policy lives here, in the adapter, as it does in the actor. A
      // fresh frame carries the change, since the hand:end snapshot predates it.
      let sat = false;
      table.state.seats.forEach((s, i) => {
        if (!s.empty && s.stack <= 0 && !s.sittingOut) { table.sitOut(i); sat = true; }
      });
      if (sat) publish({ state: table.snapshot() });
      timer = setTimeout(() => { timer = null; if (!dead && !paused) nextHand(); }, wait);
    } else {
      timer = setTimeout(step, wait);
    }
  }

  const bankKey = () => (table.state.street === 'preflop' ? 'bankPre' : 'bankPost');

  function armHeroClock(ms) {
    clearTimeout(clockTimer);
    clockTimer = setTimeout(() => {
      if (dead || paused) return;
      const seat = table.state.seats[heroIdx];
      if (bank) spendBank(bank.granted);   // the bank ran out too
      const legal = table.legalActions(heroIdx);
      if (!legal) return;
      act({ type: legal.canCheck ? 'check' : 'fold' }, true);
    }, ms + 300);
  }

  // The bank is a pool, not a one-shot: engaging it grants what is left, and
  // only the seconds actually spent thinking come off it.
  function spendBank(secs) {
    if (!bank) return;
    const seat = table.state.seats[heroIdx];
    const key = bank.post ? 'bankPost' : 'bankPre';
    seat[key] = Math.max(0, Math.round((seat[key] - Math.min(bank.granted, secs)) * 10) / 10);
    bank = null;
  }

  function useTimeBank() {
    const seat = table.state.seats[heroIdx];
    const left = seat[bankKey()];
    if (bank || left <= 0 || table.state.toAct !== heroIdx) return;
    bank = { at: Date.now(), post: table.state.street !== 'preflop', granted: left };
    clock = { seat: heroIdx, startedAt: Date.now(), duration: left * 1000, hero: true, bank: true };
    publish({ t: 'timebank', seat: heroIdx, seconds: left, state: table.snapshot() });
    armHeroClock(left * 1000);
  }

  // `auto` marks an action the clock took for the player, not one they chose.
  function act(action, auto?) {
    if (table.state.toAct !== heroIdx) return null;
    clearTimeout(clockTimer);
    if (bank) spendBank((Date.now() - bank.at) / 1000);
    clock = null;
    const legal = table.legalActions(heroIdx);
    const resolved = action.type === 'allin'
      ? { type: 'raise', to: legal.maxRaiseTo }
      : action;
    const events = table.act(heroIdx, resolved);
    pump(events);
    return { auto: !!auto, ...resolved };
  }

  function nextHand() {
    const evs = table.startHand();
    if (!evs.length) { publish(null); return; }
    pump(evs);
  }

  function record(e) { return recordFrom(e, cfg.seed, heroIdx); }

  return {
    kind: 'local',
    subscribe(fn) { subs.push(fn); fn(view, null); return () => { subs = subs.filter((f) => f !== fn); }; },
    getState: () => view,
    getLegal: () => table.legalActions(heroIdx),
    act,
    useTimeBank,
    // These mutate the live table, so they publish a *fresh* snapshot — a bare
    // `publish(null)` re-sends the last event's snapshot, whose seats are copies,
    // so the change (a top-up, a sit-in) would never reach the client and, for a
    // rebuy, the busted state would stick and its modal never close. `sitIn`
    // also re-deals a table that had frozen with nobody able to act (the
    // heads-up bust), so buying back in resumes play.
    sitOut: () => { table.sitOut(heroIdx); publish({ state: table.snapshot() }); },
    sitIn: () => {
      autoFold = false;
      table.sitIn(heroIdx);
      publish({ state: table.snapshot() });
      if (!timer && !botTimer && !queue.length && !dead && !paused) nextHand();
    },
    leave: () => { table.leave(heroIdx); publish({ state: table.snapshot() }); },
    // "sit up": give up the current hand and skip future ones until you sit down
    sitUp() {
      const seat = table.state.seats[heroIdx];
      const inHand = seat.hole.length > 0 && !seat.folded;
      table.sitOut(heroIdx);
      if (inHand && table.state.toAct === heroIdx) { act({ type: 'fold' }); return 'folded'; }
      if (inHand) { autoFold = true; publish(null); return 'folding'; }
      publish(null);
      return 'out';
    },
    topUp: (n) => { table.topUp(heroIdx, n); publish({ state: table.snapshot() }); },
    history: () => history,
    verify: (handId) => verifyRecord(history.find((h) => h.handId === handId)),
    setPace: (p) => { pace = p; },
    start() { if (table.state.phase === 'idle') nextHand(); },
    dropConnection() {
      connection = 'reconnecting'; paused = true;
      clearTimeout(timer); clearTimeout(botTimer); clearTimeout(clockTimer);
      timer = botTimer = null;
      publish(null);
    },
    restoreConnection() {
      connection = 'online'; paused = false;
      publish(null);
      if (clock && clock.hero) armHeroClock(clock.duration);
      else if (table.state.toAct != null && table.state.seats[table.state.toAct].kind !== 'hero') {
        queue.unshift({ t: 'turn', seat: table.state.toAct, state: table.snapshot() });
      }
      step();
    },
    destroy() { dead = true; clearTimeout(timer); clearTimeout(botTimer); clearTimeout(clockTimer); subs = []; },
  };
}

/* ── fairness ──────────────────────────────────────────────────────────────
   Locally this recomputes the shuffle from the revealed seed and checks the
   board matches the commit. Against a real backend, replace with a signature
   check over the server seed + the on-chain commitment.                     */

export function verifyRecord(rec) {
  if (!rec) return { ok: false, reason: 'unknown hand' };
  // Server-dealt hands carry a real commitment and a revealed 256-bit seed, so
  // they verify against that rather than by re-running the demo's 32-bit PRNG.
  // The history screen calls this directly (Suited.dc.html), so it has to handle
  // both kinds of record.
  if (rec.remote || rec.serverSeed) return verifyRemote(rec);
  // Fail closed, never throw. This is the local demo's re-deal and it needs a
  // shape only the demo produces; a server-dealt record that reaches it is a
  // routing bug, and a verifier that dies with a TypeError tells the player
  // their hand is broken rather than that we are.
  if (typeof rec.seed !== 'number' || !(rec.dealt || rec.seats?.length)) {
    return { ok: false, reason: 'this hand has no local deal to re-run — fetch its proof instead' };
  }
  const deck = shuffle(freshDeck(), mulberry32(rec.seed + rec.handNo * 7919));
  const n = rec.dealt || rec.seats.length;
  let i = n * 2 + 1;
  const board = [];
  for (let k = 0; k < 3; k++) board.push(deck[i++].id);
  i++; board.push(deck[i++].id);
  i++; board.push(deck[i++].id);
  const shown = rec.board.join(' ');
  return {
    ok: board.slice(0, rec.board.length).join(' ') === shown,
    commit: rec.commit,
    seed: String(rec.seed),
    board: shown,
    derived: board.join(' '),
    deckDigest: deck.slice(0, 10).map((c) => c.id).join(''),
    sig: rec.sig,
  };
}

function pseudoSig(seed) {
  const abc = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let h = 0;
  for (let i = 0; i < String(seed).length; i++) h = (Math.imul(h, 31) + String(seed).charCodeAt(i)) | 0;
  let out = '';
  let x = h >>> 0;
  for (let i = 0; i < 44; i++) { x = Math.imul(x ^ (x >>> 15), 0x2545f491) >>> 0; out += abc[x % abc.length]; }
  return out;
}

function recordFrom(e, seed, heroIdx) {
  return {
    handId: e.handId, handNo: e.state.handNo, commit: e.commit, seed,
    // The blind this hand was actually played at, so the history screen can
    // still count a finished hand in big blinds after the player has moved
    // stakes. Recorded, never re-derived — the table it came from is gone.
    bb: e.state.bb,
    board: e.board, awards: e.awards, seats: e.seats, dealt: e.dealt,
    pot: e.awards.reduce((a, x) => a + x.amount, 0),
    heroNet: (e.seats.find((s) => s.seat === heroIdx) || {}).net ?? 0,
    heroHole: (e.state.seats[heroIdx].hole || []).map((c) => c.id),
    showdown: !e.uncontested,
    at: Date.now(),
    sig: pseudoSig(e.commit),
  };
}

// Runs whole hands with no clock, so the hand-history screen has real,
// verifiable receipts the moment it opens. Bots play every seat.
export function simulateHands({ seats, sb, bb, seed, heroIdx = 0, hands = 8 }) {
  const table = createTable({ seats: seats.map((s) => ({ ...s })), sb, bb, seed });
  const rng = mulberry32((seed ^ 0x51ed270b) >>> 0);
  const out = [];
  for (let h = 0; h < hands; h++) {
    let evs = table.startHand();
    if (!evs.length) break;
    let guard = 0;
    while (guard++ < 300) {
      const end = evs.find((x) => x.t === 'hand:end');
      if (end) { out.unshift(recordFrom(end, seed, heroIdx)); break; }
      const turn = evs.filter((x) => x.t === 'turn').pop();
      if (!turn) break;
      const legal = table.legalActions(turn.seat);
      if (!legal) break;
      evs = table.act(turn.seat, decide(table.state, turn.seat, legal, rng).action);
    }
  }
  return out;
}

/* ── production ────────────────────────────────────────────────────────────
   The real remote adapter lives in `remote.js` — it is substantial enough to
   deserve its own file (money, card and seat translation, reconnect, resync)
   and re-exported here so `adapter.js` stays the single seam the UI imports.  */

export { createRemoteAdapter, verifyRemote, FACE_DOWN } from './remote';
