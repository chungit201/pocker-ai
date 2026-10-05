// suited — the table state machine. Pure: no timers, no DOM, no network.
// Every mutation returns the list of events it produced; whoever calls it owns
// the clock (see adapter.js). This is the file a real backend replaces or mirrors.

import { freshDeck, shuffle, mulberry32, evaluate, cmp } from './poker';

export const STREETS = ['preflop', 'flop', 'turn', 'river'];

let uid = 0;
const nid = () => ++uid;

export function createTable(cfg) {
  /* The blind indices (`sbIdx`, `bbIdx`) are set per hand rather than declared
     here, so the literal's inferred shape is widened rather than seeded with
     nulls that would claim a hand is in progress before one is. */
  const st: any = {
    handNo: 0,
    handId: null,
    seed: cfg.seed ?? 20260805,
    sb: cfg.sb ?? 1,
    bb: cfg.bb ?? 2,
    phase: 'idle', // idle | preflop | flop | turn | river | showdown | complete
    street: null,
    button: cfg.button ?? 0,
    board: [],
    pot: 0,
    bets: 0, // chips out on the current street (pot display adds this)
    currentBet: 0,
    minRaise: cfg.bb ?? 2,
    toAct: null,
    lastAggressor: null,
    seats: cfg.seats.map((s, i) => ({
      idx: i, id: s.id, name: s.name, kind: s.kind || 'bot', style: s.style || 'reg',
      stack: s.stack, hole: [], bet: 0, committed: 0,
      folded: false, allIn: false, sittingOut: !!s.sittingOut, pendingLeave: false,
      hasActed: false, lastAction: null, revealed: false, empty: !!s.empty,
      // two independent time banks, in seconds; capacity accrues with hands played
      bankPre: 15, bankPost: 15, handsPlayed: 0,
      handName: null, winner: false, netLastHand: 0,
    })),
    pots: [],
    results: null,
    deck: [],
    deckIndex: 0,
    commit: null,
  };

  const ev = [];
  // every event carries a point-in-time snapshot, so a consumer can replay the
  // hand at its own pace and the UI never renders ahead of the animation.
  const emit = (t, d) => { ev.push({ id: nid(), t, ...d, state: snapshot() }); };
  const drain = () => ev.splice(0, ev.length);

  const live = () => st.seats.filter((s) => !s.empty && !s.sittingOut && s.stack > 0);
  const inHand = () => st.seats.filter((s) => s.hole.length && !s.folded);
  const actionable = () => inHand().filter((s) => !s.allIn);

  function nextIdx(from, pred) {
    for (let k = 1; k <= st.seats.length; k++) {
      const s = st.seats[(from + k) % st.seats.length];
      if (pred(s)) return s.idx;
    }
    return null;
  }

  // 32-hex pseudo-hash of the shuffle, standing in for the chain's
  // commit–reveal. Swap for the real server seed hash on integration.
  function hashSeed(seed, handNo) {
    let h = 0x811c9dc5 >>> 0;
    const s = `${seed}:${handNo}:river.fun`;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    let out = '';
    let x = h;
    for (let i = 0; i < 8; i++) { x = Math.imul(x ^ (x >>> 13), 0x5bd1e995) >>> 0; out += x.toString(16).padStart(8, '0'); }
    return out.slice(0, 40);
  }

  function startHand() {
    // seat churn resolves between hands only — WSOP-ish, and it keeps the
    // animation from ever having to remove a seat mid-street.
    st.seats.forEach((s) => {
      if (s.pendingLeave) { s.empty = true; s.pendingLeave = false; s.stack = 0; s.name = 'open'; }
    });
    if (live().length < 2) { st.phase = 'idle'; return drain(); }
    // auto top-up: the demo table should never quietly empty out. Deterministic
    // so the seed still reproduces the hand.
    st.seats.forEach((s) => {
      if (!s.empty && s.kind !== 'hero' && s.stack < st.bb * 20) s.stack = st.bb * (80 + s.idx * 24);
    });

    st.handNo++;
    st.handId = `${String(st.seed).slice(-4)}-${String(st.handNo).padStart(4, '0')}`;
    st.commit = hashSeed(st.seed, st.handNo);
    const rng = mulberry32(st.seed + st.handNo * 7919);
    st.deck = shuffle(freshDeck(), rng);
    st.deckIndex = 0;
    st.board = [];
    st.pot = 0; st.bets = 0; st.currentBet = 0; st.minRaise = st.bb;
    st.results = null; st.pots = [];
    st.phase = 'preflop'; st.street = 'preflop';
    st.seats.forEach((s) => {
      s.hole = []; s.bet = 0; s.committed = 0; s.folded = false; s.allIn = false;
      s.hasActed = false; s.lastAction = null; s.revealed = false; s.handName = null;
      s.winner = false; s.netLastHand = 0;
    });
    // time bank accrual: +5s to each bank every 10 hands at this table
    live().forEach((s) => {
      s.handsPlayed++;
      if (s.handsPlayed % 10 === 0) {
        s.bankPre = Math.min(30, s.bankPre + 5);
        s.bankPost = Math.min(60, s.bankPost + 5);
      }
    });

    st.button = nextIdx(st.button, (s) => !s.empty && !s.sittingOut && s.stack > 0);
    const seated = live();
    const heads = seated.length === 2;
    const sbIdx = heads ? st.button : nextIdx(st.button, (s) => seated.includes(s));
    const bbIdx = nextIdx(sbIdx, (s) => seated.includes(s));
    st.sbIdx = sbIdx; st.bbIdx = bbIdx;

    emit('hand:start', { handNo: st.handNo, handId: st.handId, commit: st.commit, button: st.button });
    post(sbIdx, st.sb, 'sb');
    post(bbIdx, st.bb, 'bb');
    st.currentBet = st.bb;
    st.minRaise = st.bb;

    for (const s of seated) s.hole = [st.deck[st.deckIndex++], st.deck[st.deckIndex++]];
    emit('deal:hole', { seats: seated.map((s) => s.idx) });

    st.toAct = nextIdx(bbIdx, (s) => seated.includes(s) && !s.allIn);
    st.lastAggressor = bbIdx;
    if (st.toAct == null) {
      // Everyone still in the hand is all-in (e.g. anted/blinded all-in preflop): no
      // action is possible, so run the board out to showdown rather than emitting a
      // turn on a null/all-in seat. Same runout the mid-round `advance()` null path uses.
      collect();
      nextStreet();
    } else {
      emit('turn', { seat: st.toAct });
    }
    return drain();
  }

  function post(i, amount, kind) {
    const s = st.seats[i];
    const amt = Math.min(amount, s.stack);
    s.stack -= amt; s.bet += amt; s.committed += amt; st.bets += amt;
    if (s.stack === 0) s.allIn = true;
    emit('blind', { seat: i, amount: amt, kind });
  }

  function legalActions(i) {
    const s = st.seats[i];
    if (!s || st.toAct !== i) return null;
    const toCall = Math.max(0, st.currentBet - s.bet);
    const maxTo = s.bet + s.stack;
    const raiseTo = Math.min(maxTo, st.currentBet + st.minRaise);
    return {
      seat: i,
      toCall: Math.min(toCall, s.stack),
      canCheck: toCall === 0,
      canCall: toCall > 0,
      canFold: true,
      // A seat still carrying `hasActed` while its bet trails the current one
      // was closed out by an incomplete all-in: it owes the difference and may
      // call or fold, not raise. Mirrors packages/engine/src/table.ts.
      canRaise: maxTo > st.currentBet && !(s.hasActed && s.bet < st.currentBet),
      isRaise: st.currentBet > 0,
      minRaiseTo: raiseTo,
      maxRaiseTo: maxTo,
      potIfCall: st.pot + st.bets + Math.min(toCall, s.stack),
      stack: s.stack,
    };
  }

  // action: {type:'fold'|'check'|'call'|'raise'|'allin', to?:number}
  function act(i, action) {
    const la = legalActions(i);
    if (!la) return drain();
    const s = st.seats[i];
    let type = action.type;
    if (type === 'check' && !la.canCheck) type = 'call';
    if (type === 'call' && la.canCheck) type = 'check';

    if (type === 'fold') {
      s.folded = true; s.lastAction = 'fold';
      emit('action', { seat: i, type: 'fold' });
    } else if (type === 'check') {
      s.lastAction = 'check';
      emit('action', { seat: i, type: 'check' });
    } else if (type === 'call') {
      const amt = Math.min(la.toCall, s.stack);
      s.stack -= amt; s.bet += amt; s.committed += amt; st.bets += amt;
      if (s.stack === 0) s.allIn = true;
      s.lastAction = s.allIn ? 'all in' : 'call';
      emit('action', { seat: i, type: 'call', amount: amt, allIn: s.allIn, to: s.bet });
    } else {
      const to = Math.max(la.minRaiseTo, Math.min(action.to ?? la.minRaiseTo, la.maxRaiseTo));
      const amt = to - s.bet;
      s.stack -= amt; s.bet = to; s.committed += amt; st.bets += amt;
      if (s.stack === 0) s.allIn = true;
      // Only a FULL raise reopens the betting — an all-in for less is a call
      // for more, and the seats whose action already closed may call or fold
      // but not raise. Measured before `currentBet` moves. Mirrored exactly in
      // packages/engine/src/table.ts; parity.test.ts plays both over 250 seeds.
      const full = to - st.currentBet >= st.minRaise;
      st.minRaise = Math.max(st.minRaise, to - st.currentBet);
      st.currentBet = to;
      st.lastAggressor = i;
      if (full) actionable().forEach((o) => { if (o.idx !== i) o.hasActed = false; });
      s.lastAction = s.allIn ? 'all in' : (la.isRaise ? 'raise' : 'bet');
      emit('action', { seat: i, type: la.isRaise ? 'raise' : 'bet', amount: amt, to, allIn: s.allIn });
    }
    s.hasActed = true;
    advance();
    return drain();
  }

  function roundClosed() {
    const act2 = actionable();
    if (inHand().length < 2) return true;
    if (act2.length === 0) return true;
    if (act2.length === 1 && inHand().length === 1) return true;
    return act2.every((s) => s.hasActed && s.bet === st.currentBet);
  }

  function advance() {
    if (inHand().length === 1) { collect(); return finish(); }
    if (!roundClosed()) {
      const nxt = nextIdx(st.toAct, (s) => inHand().includes(s) && !s.allIn && (!s.hasActed || s.bet < st.currentBet));
      st.toAct = nxt;
      if (nxt == null) { collect(); return nextStreet(); }
      emit('turn', { seat: nxt });
      return;
    }
    collect();
    nextStreet();
  }

  function collect() {
    if (st.bets > 0) {
      // return the uncalled portion of the last aggressor's bet
      const contenders = st.seats.filter((s) => s.bet > 0);
      const sorted = contenders.map((s) => s.bet).sort((a, b) => b - a);
      if (sorted.length && sorted[0] > (sorted[1] ?? 0)) {
        const top = contenders.find((s) => s.bet === sorted[0]);
        const back = sorted[0] - (sorted[1] ?? 0);
        if (back > 0 && contenders.length > 1) {
          top.stack += back; top.bet -= back; top.committed -= back; st.bets -= back;
          emit('uncalled', { seat: top.idx, amount: back });
        }
      }
      // Bets move into the pot before the event goes out: potTotal is pot + bets, so emitting first showed it doubled.
      const from = st.seats.filter((s) => s.bet > 0).map((s) => ({ seat: s.idx, amount: s.bet }));
      st.pot += st.bets;
      st.bets = 0;
      st.seats.forEach((s) => { s.bet = 0; });
      emit('street:collect', { pot: st.pot, from });
    }
  }

  function nextStreet() {
    st.seats.forEach((s) => { s.hasActed = false; s.lastAction = null; });
    st.currentBet = 0; st.minRaise = st.bb;
    const si = STREETS.indexOf(st.street);
    if (si >= 3 || inHand().length < 2) return finish();
    const street = STREETS[si + 1];
    st.street = street; st.phase = street;
    st.deckIndex++; // burn
    const n = street === 'flop' ? 3 : 1;
    const cards = [];
    for (let k = 0; k < n; k++) { const c = st.deck[st.deckIndex++]; st.board.push(c); cards.push(c); }
    emit('street', { street, cards: cards.map((c) => c.id), board: st.board.map((c) => c.id) });

    if (actionable().length < 2) { // everyone all-in — run it out
      emit('runout', { street });
      return nextStreet();
    }
    st.toAct = nextIdx(st.button, (s) => inHand().includes(s) && !s.allIn);
    st.lastAggressor = null;
    emit('turn', { seat: st.toAct });
  }

  function buildPots() {
    const contribs: { idx: number; c: number; folded: boolean }[] = st.seats.filter((s) => s.committed > 0).map((s) => ({ idx: s.idx, c: s.committed, folded: s.folded }));
    const levels = [...new Set(contribs.map((c) => c.c))].sort((a, b) => a - b);
    const pots = [];
    let prev = 0;
    for (const lvl of levels) {
      let amount = 0;
      const eligible = [];
      for (const c of contribs) {
        const part = Math.max(0, Math.min(c.c, lvl) - prev);
        amount += part;
        if (part > 0 && !c.folded) eligible.push(c.idx);
      }
      if (amount > 0) pots.push({ amount, eligible });
      prev = lvl;
    }
    // merge pots with identical eligibility so the UI shows one main pot
    const merged = [];
    for (const p of pots) {
      const last = merged[merged.length - 1];
      if (last && last.eligible.join() === p.eligible.join()) last.amount += p.amount;
      else merged.push(p);
    }
    return merged;
  }

  function finish() {
    st.phase = 'showdown';
    st.toAct = null;
    const contenders = inHand();
    const pots = buildPots();
    st.pots = pots;
    const awards = [];

    if (contenders.length === 1) {
      const w = contenders[0];
      const total = pots.reduce((a, p) => a + p.amount, 0);
      w.stack += total; w.winner = true; w.netLastHand += total;
      awards.push({ seat: w.idx, amount: total, potIndex: 0, uncontested: true });
      emit('award', { awards, uncontested: true });
    } else {
      contenders.forEach((s) => {
        const e = evaluate(s.hole.concat(st.board));
        s.handName = e.name; s.handValue = e.v; s.revealed = true;
      });
      emit('showdown', {
        reveals: contenders.map((s) => ({ seat: s.idx, hole: s.hole.map((c) => c.id), name: s.handName })),
      });
      pots.forEach((p, pi) => {
        const pool = contenders.filter((s) => p.eligible.includes(s.idx));
        let best = pool[0];
        pool.forEach((s) => { if (cmp(s.handValue, best.handValue) > 0) best = s; });
        const winners = pool.filter((s) => cmp(s.handValue, best.handValue) === 0);
        const share = Math.floor((p.amount / winners.length) * 100) / 100;
        winners.forEach((w, k) => {
          const amt = k === 0 ? p.amount - share * (winners.length - 1) : share;
          w.stack += amt; w.winner = true; w.netLastHand += amt;
          awards.push({ seat: w.idx, amount: amt, potIndex: pi, name: w.handName, split: winners.length > 1 });
        });
      });
      emit('award', { awards });
    }
    st.pot = 0;
    st.phase = 'complete';
    st.seats.forEach((s) => { s.netLastHand -= s.committed; });
    emit('hand:end', {
      handId: st.handId, commit: st.commit,
      board: st.board.map((c) => c.id),
      dealt: st.seats.filter((s) => s.hole.length).length,
      winners: awards.map((a) => a.seat),
      awards,
      seats: st.seats.filter((s) => !s.empty).map((s) => ({ seat: s.idx, name: s.name, hole: s.hole.map((c) => c.id), net: s.netLastHand, stack: s.stack, handName: s.handName })),
    });
    // NB: no drain() here — only the public entry points (startHand/act) drain,
    // or the events this produced would never reach the caller.
  }

  function snapshot() {
    return {
      ...st,
      seats: st.seats.map((s) => ({ ...s, hole: s.hole.slice() })),
      board: st.board.slice(),
      pots: st.pots.map((p) => ({ ...p })),
      deck: null,
      potTotal: st.pot + st.bets,
    };
  }

  return {
    state: st, snapshot, startHand, act, legalActions, drain,
    sitOut: (i) => { st.seats[i].sittingOut = true; },
    sitIn: (i) => { st.seats[i].sittingOut = false; },
    leave: (i) => { st.seats[i].pendingLeave = true; },
    join: (i, seat) => { Object.assign(st.seats[i], { ...seat, empty: false, idx: i, hole: [], bet: 0, committed: 0, folded: false, allIn: false, sittingOut: false }); },
    topUp: (i, amt) => { st.seats[i].stack += amt; },
  };
}
