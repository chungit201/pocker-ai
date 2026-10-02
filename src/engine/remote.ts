// ══════════════════════════════════════════════════════════════════════════
// suited — the remote adapter.
//
// Same surface as `createLocalAdapter`, backed by the gateway. The UI does not
// know which one it is holding.
//
// Three translations happen here and nowhere else:
//
//   1. MONEY.  The wire carries integer micro-USDC (exact). The views render
//      floats. Converting at this boundary keeps the server exact and the UI
//      unchanged.
//
//   2. CARDS.  The wire carries canonical ids ('As'). The views want
//      `{r, s, si, id}`. Hidden cards arrive as '??' and become a placeholder
//      that occupies its slot but carries no rank or suit — the client cannot
//      render what it was never sent.
//
//   3. SEATS.  The server seats you wherever there is room; the UI assumes the
//      hero is seat 0 (`isHero = seat === 0` in the render, and `seats[0]` for
//      the time bank). So every seat index is rotated so that the viewer is
//      always 0 — which is also just what poker clients do: you sit at the
//      bottom of the screen. Rotation is total: seats, toAct, button, blinds,
//      the clock, pot eligibility and every seat reference inside every event.
//
// Pacing is NOT applied here. The server releases events on its own clock (see
// services/gateway/src/actor.ts) so that what you see and what the turn timer is
// actually enforcing cannot drift apart. `setPace` is therefore a no-op.
// ══════════════════════════════════════════════════════════════════════════

const RANKS = '23456789TJQKA';
const SUITS = ['s', 'h', 'd', 'c'];

/** A card whose identity the server deliberately withheld.
 *
 *  It carries no rank and no suit, because it has none — the server sent the
 *  string '??' and nothing else. This used to read `s: 's', si: 0`, a spade
 *  picked for no better reason than being first in SUITS, and anything that
 *  read the suit without first checking the rank drew that spade on the felt.
 *  The slot still exists: the felt animates fixed slots, and a slot that
 *  vanishes mid-hand loses its identity. It is simply empty. */
export const FACE_DOWN = { r: -1, s: '', si: -1, id: '??' };

// Cash tables carry integer micro-USDC on the wire; the felt renders dollars.
const toUsd = (micro) => (micro == null ? 0 : micro / 1e6);
const toUsdMicro = (n) => Math.round((n ?? 0) * 1e6);

function parseCard(id) {
  if (!id || id === '??') return FACE_DOWN;
  const r = RANKS.indexOf(id[0]);
  const s = id[1];
  const si = SUITS.indexOf(s);
  if (r < 0 || si < 0) return FACE_DOWN;
  return { r, s, si, id };
}

export function createRemoteAdapter(cfg) {
  const {
    endpoint,
    tableId,
    token,
    maxSeats = 6,
    onError = () => {},
    onBalance = () => {},
  } = cfg;

  // Tournament tables (`priv-tt-…`) deal abstract CHIPS, not money: the wire
  // carries the chip integer directly (10000 stack, 50/100 blinds), so scaling
  // it as micro-USDC would render a 10k stack as $0.01. Pass chips through
  // untouched here and let the felt format them as chip counts; the wallet
  // `balance` is still real money and always uses `toUsd` explicitly below.
  const chips = String(tableId).startsWith('priv-tt-');
  const toDisplay = chips ? (v) => (v == null ? 0 : v) : toUsd;
  const toMicro = chips ? (n) => Math.round(n ?? 0) : toUsdMicro;

  let subs = [];
  let ws = null;
  let closed = false;
  let retry = 0;
  let retryTimer = null;
  let heartbeatTimer = null;
  let lastRecvAt = 0;

  let heroSeat = null; // server-side seat index, or null while spectating
  let lastEventId = 0;
  let legal = null;
  let history = [];
  let view = emptyView();
  let seq = 0;

  function emptyView() {
    return {
      handNo: 0, handId: null, commit: null, phase: 'idle', street: null,
      board: [], pot: 0, bets: 0, potTotal: 0, currentBet: 0, minRaise: 0,
      toAct: null, button: 0, sbIdx: null, bbIdx: null, sb: 0, bb: 0,
      pots: [], seats: [], clock: null, connection: 'reconnecting',
      heroIdx: 0, handHistory: [],
    };
  }

  /* ── seat rotation ─────────────────────────────────────────────────────── */

  // server index -> what the UI should call it
  const toView = (i) => (i == null || heroSeat == null ? i : (i - heroSeat + maxSeats) % maxSeats);

  function rotateSeats(seats) {
    if (heroSeat == null) return seats.map((s, i) => ({ ...s, idx: i }));
    const out = new Array(seats.length);
    for (const s of seats) out[toView(s.idx)] = { ...s, idx: toView(s.idx) };
    // Any hole left by a sparse server array becomes an explicit empty seat, so
    // the render never indexes into undefined.
    for (let i = 0; i < out.length; i++) {
      if (!out[i]) out[i] = blankSeat(i);
    }
    return out;
  }

  function blankSeat(i) {
    return {
      idx: i, id: null, name: 'open', avatar: null, kind: 'player', style: 'reg', stack: 0,
      hole: [], bet: 0, committed: 0, folded: false, allIn: false,
      sittingOut: false, empty: true, hasActed: false, lastAction: null,
      revealed: false, handName: null, winner: false, netLastHand: 0,
      bankPre: 0, bankPost: 0, handsPlayed: 0,
    };
  }

  /* ── decode ────────────────────────────────────────────────────────────── */

  function decodeState(w) {
    if (!w) return view;
    heroSeat = typeof w.heroIdx === 'number' ? w.heroIdx : null;

    const seats = rotateSeats(
      (w.seats ?? []).map((s) => ({
        idx: s.idx,
        id: s.id,
        name: s.name,
        avatar: s.avatar ?? null,
        kind: s.kind,
        style: s.style,
        stack: toDisplay(s.stack),
        hole: (s.hole ?? []).map(parseCard),
        bet: toDisplay(s.bet),
        committed: toDisplay(s.committed),
        folded: s.folded,
        allIn: s.allIn,
        sittingOut: s.sittingOut,
        empty: s.empty,
        hasActed: s.hasActed,
        lastAction: s.lastAction,
        revealed: s.revealed,
        handName: s.handName,
        winner: s.winner,
        netLastHand: toDisplay(s.netLastHand),
        bankPre: s.bankPre,
        bankPost: s.bankPost,
        handsPlayed: s.handsPlayed,
      })),
    );

    return {
      handNo: w.handNo,
      handId: w.handId,
      commit: w.commit,
      phase: w.phase,
      street: w.street,
      board: (w.board ?? []).map(parseCard),
      pot: toDisplay(w.pot),
      bets: toDisplay(w.bets),
      potTotal: toDisplay(w.potTotal),
      currentBet: toDisplay(w.currentBet),
      minRaise: toDisplay(w.minRaise),
      toAct: toView(w.toAct),
      button: toView(w.button) ?? 0,
      sbIdx: toView(w.sbIdx),
      bbIdx: toView(w.bbIdx),
      sb: toDisplay(w.sb),
      bb: toDisplay(w.bb),
      pots: (w.pots ?? []).map((p) => ({
        amount: toDisplay(p.amount),
        eligible: (p.eligible ?? []).map(toView),
      })),
      seats,
      clock: w.clock ? { ...w.clock, seat: toView(w.clock.seat) } : null,
      connection: 'online',
      // After rotation the viewer is always 0; a spectator has no hero seat.
      heroIdx: heroSeat == null ? null : 0,
      handHistory: history,
    };
  }

  const MONEY_KEYS = new Set(['amount', 'to', 'pot', 'rake', 'net', 'stack']);

  /** Rotate seat references and scale money, recursively, inside an event. */
  function decodeEvent(e) {
    if (!e || typeof e !== 'object') return e;
    if (Array.isArray(e)) return e.map(decodeEvent);
    const out = {};
    for (const [k, v] of Object.entries(e)) {
      if (k === 'seat' && typeof v === 'number') out[k] = toView(v);
      else if ((k === 'seats' || k === 'winners' || k === 'revealedSeats') && Array.isArray(v) && v.every((x) => typeof x === 'number')) {
        out[k] = v.map(toView);
      } else if (MONEY_KEYS.has(k) && typeof v === 'number') out[k] = toDisplay(v);
      else out[k] = decodeEvent(v);
    }
    return out;
  }

  function decodeLegal(w) {
    if (!w) return null;
    return {
      seat: toView(w.seat),
      toCall: toDisplay(w.toCall),
      canCheck: w.canCheck,
      canCall: w.canCall,
      canFold: w.canFold,
      canRaise: w.canRaise,
      isRaise: w.isRaise,
      minRaiseTo: toDisplay(w.minRaiseTo),
      maxRaiseTo: toDisplay(w.maxRaiseTo),
      potIfCall: toDisplay(w.potIfCall),
      stack: toDisplay(w.stack),
    };
  }

  /* ── transport ─────────────────────────────────────────────────────────── */

  const publish = (event) => {
    for (const f of subs) {
      try {
        f(view, event ?? null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Anything sent before the socket is open is held, not dropped. The UI calls
  // `sit()` straight after `start()`, and a silently discarded buy-in leaves the
  // player watching a table they believe they joined.
  let outbox = [];

  const send = (msg) => {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
    else outbox.push(msg);
  };

  const flush = () => {
    const pending = outbox;
    outbox = [];
    for (const m of pending) ws.send(JSON.stringify(m));
  };

  // Client-side liveness. A half-open socket — the network path dies with no TCP
  // close (a proxy that drops the connection, a sleeping laptop, a switched
  // network) — delivers no frames and never fires `onclose`, so the reconnect
  // below would never run and the table would silently freeze. So ping on our own
  // clock; if nothing has come back for a couple of intervals, force the socket
  // shut, which *does* fire `onclose`, and the backoff reconnect takes over. The
  // server answers `ping` with `pong`, and any other frame counts as liveness.
  const HEARTBEAT_MS = 25_000;
  const LIVENESS_MS = 60_000;
  function startHeartbeat() {
    stopHeartbeat();
    lastRecvAt = Date.now();
    heartbeatTimer = setInterval(() => {
      if (Date.now() - lastRecvAt > LIVENESS_MS) {
        try { if (ws) ws.close(); } catch { /* already gone */ }
        return;
      }
      try { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: 'ping' })); } catch { /* */ }
    }, HEARTBEAT_MS);
  }
  function stopHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  /* The session's own expiry, read off the token. Deliberately duplicated from
     wallet.js's `tokenLive` rather than imported: the engine modules load
     independently of one another, and a five-line base64 decode does not earn
     an import edge between them. The MAC is the server's to check — we read
     `exp` only, to know when not to bother it. */
  const tokenExpired = () => {
    try {
      const payload = String(token).split('.')[0];
      const body = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return typeof body.exp === 'number' && body.exp <= Date.now();
    } catch {
      return false;   // unreadable — let the server be the judge
    }
  };

  /* A dead session is the one failure retrying cannot fix: the upgrade 401s
     every time, and a browser WebSocket cannot see that status — a refused
     upgrade fires `onclose` with 1006, indistinguishable from lost wifi — so
     the backoff below would loop forever under a "reconnecting" scrim that
     promises the seat is still being held. Stop the loop and name the cause;
     the UI turns this into a sign-in prompt. */
  let authDead = false;
  const sessionExpired = () => {
    authDead = true;
    clearTimeout(retryTimer);
    stopHeartbeat();
    view = { ...view, connection: 'expired' };
    publish({ t: 'connection', status: 'expired' });
    onError('Your session expired, sign in again', 'session_expired');
  };

  let connectGen = 0;
  let resyncing = false;   // the next close is ours — see `resync`
  function open() {
    if (closed) return;
    clearTimeout(retryTimer);
    // Local and free, and it catches the common case: a tab left open across
    // the token's 12h TTL. No point asking for a ticket we know is refused.
    if (tokenExpired()) { sessionExpired(); return; }
    const gen = ++connectGen;
    void (async () => {
      // Prefer a single-use 30s ticket so the long-lived bearer never rides a
      // URL into proxy and access logs; fall back to the token query against a
      // gateway from before tickets existed.
      let q = `token=${encodeURIComponent(token)}`;
      try {
        const r = await fetch(`${endpoint}/api/ws-ticket`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
        // This is the ONLY place the expiry is legible. `/api/ws-ticket` is a
        // plain fetch, so its 401 has a readable status, where the WebSocket
        // upgrade's identical 401 does not. Treating it as just another blip —
        // which `if (r.ok)` alone does — is what sent the page on to dial a
        // socket with a token the gateway had already stopped honouring.
        if (r.status === 401) {
          if (!closed && gen === connectGen) sessionExpired();
          return;
        }
        if (r.ok) {
          const b = await r.json().catch(() => null);
          if (b && b.ticket) q = `ticket=${encodeURIComponent(b.ticket)}`;
        }
      } catch { /* transient or old gateway — the fallback still connects */ }
      // A reconnect or teardown may have raced the fetch; only the newest
      // attempt is allowed to own `ws`, or two sockets fight over the seat.
      if (closed || gen !== connectGen) return;
      /* The socket is the one call that does NOT follow `endpoint`.
       *
       * Under Next, REST reaches the gateway through a rewrite, so `endpoint`
       * is this page's own origin and /api is same-origin — no CORS anywhere.
       * A rewrite cannot carry a WebSocket upgrade, though, so deriving ws://
       * from that origin would dial the Next dev server, which has no /ws.
       * NEXT_PUBLIC_SUITED_WS names the gateway directly instead. WebSocket is
       * not subject to CORS, so this needs nothing from the server.
       *
       * Unset — a single-origin deployment, which is what the gateway serves —
       * falls back to the old behaviour exactly. */
      const wsBase = process.env.NEXT_PUBLIC_SUITED_WS || endpoint.replace(/^http/, 'ws');
      const url = `${wsBase.replace(/\/$/, '')}/ws?${q}&table=${encodeURIComponent(tableId)}`;
      ws = new WebSocket(url);

    ws.onopen = () => {
      retry = 0;
      startHeartbeat();
      // Resume from where we left off; the server replays if it still can and
      // sends a full resync if too much has happened. `hello` goes first, ahead
      // of anything that queued while we were connecting.
      ws.send(JSON.stringify({ t: 'hello', tableId, ...(lastEventId ? { since: lastEventId } : {}) }));
      flush();
    };

    ws.onmessage = (m) => {
      lastRecvAt = Date.now();
      let frame;
      try {
        frame = JSON.parse(m.data);
      } catch {
        return;
      }
      handleFrame(frame);
    };

    ws.onclose = () => {
      stopHeartbeat();
      if (closed || authDead) return;
      // A close we asked for (`resync`) is not a lost connection: redial at
      // once, and without telling the table it is "reconnecting".
      if (resyncing) { resyncing = false; open(); return; }
      view = { ...view, connection: 'reconnecting' };
      publish({ t: 'connection', status: 'reconnecting' });
      // Backoff, capped — a table that is down should not be hammered.
      const wait = Math.min(8000, 400 * 2 ** retry++);
      retryTimer = setTimeout(open, wait);
    };

    ws.onerror = () => {
      /* surfaced via onclose */
    };
    })();
  }

  /**
   * Entropy for the next hand's shuffle, sent inside the seed window that
   * `hand:commit` opens. The server ignores spectators and stale hand numbers,
   * so firing on every commit is safe. Sent seeds are remembered (a few hands
   * deep) so the finished hand's record can attest the seed made the reveal.
   */
  const sentSeeds = new Map();

  /* The commitment as this client SAW it, before the deal — handNo → commit.
     Without it both halves of commit-and-reveal come from the server at verify
     time, and "locked in before the deal" is a claim the server makes about
     itself. A server that changed its mind mid-hand could hand out a matched
     pair afterwards and pass every check. This is the half the client holds. */
  const witnessed = new Map();
  function contributeSeed(handNo) {
    const bytes = new Uint8Array(16);
    // Guarded rather than assumed: an insecure origin has no WebCrypto at all,
    // and the hand still has to be dealt there.
    (globalThis.crypto as Crypto | undefined)?.getRandomValues?.(bytes);
    const seed = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    send({ t: 'seed', handNo, seed });
    sentSeeds.set(handNo, seed);
    for (const k of sentSeeds.keys()) if (k < handNo - 4) sentSeeds.delete(k);
    return seed;
  }

  function handleFrame(frame) {
    switch (frame.t) {
      case 'sync': {
        /* These rows are the server's, and they are SPARSE — handId, handNo,
           commit, clientSeeds, board, rake, at, and nothing else. `remote` is
           what tells the history screen to fetch the rest (the seed, `dealt`,
           `revealed`) from /api/hands rather than trying to re-deal them here.
           Without it a restored row falls into the local-demo verifier and
           throws on `rec.seats.length`, which is what a player saw after any
           refresh at a table. */
        if (Array.isArray(frame.history)) history = frame.history.map((h) => ({ ...h, remote: true }));
        lastEventId = frame.lastEventId ?? lastEventId;
        view = decodeState(frame.state);
        legal = decodeLegal(frame.legal);
        publish(null);
        return;
      }
      case 'event': {
        const decoded = decodeEvent(frame.event);
        view = decodeState(frame.state);
        legal = decodeLegal(frame.legal);
        if (typeof frame.event?.id === 'number') lastEventId = Math.max(lastEventId, frame.event.id);
        if (decoded.t === 'hand:commit' && typeof decoded.handNo === 'number') {
          witnessed.set(decoded.handNo, decoded.commit);
          for (const k of witnessed.keys()) if (k < decoded.handNo - 120) witnessed.delete(k);
          contributeSeed(decoded.handNo);
        }
        if (decoded.t === 'hand:end') history = [handRecord(decoded), ...history].slice(0, 60);
        view.handHistory = history;
        publish(decoded);
        return;
      }
      case 'reject': {
        // The server refused an action we may have shown optimistically.
        legal = decodeLegal(frame.legal) ?? legal;
        onError(frame.reason || 'Action rejected');
        publish({ t: 'reject', reason: frame.reason, seq: frame.seq });
        return;
      }
      case 'balance':
        onBalance(toUsd(frame.balance)); // the wallet is real money even at a chip table
        return;
      case 'chat':
        // Seat numbers arrive in server space like every event's do.
        publish({ t: 'chat', seat: toView(frame.seat), name: frame.name, text: frame.text, at: frame.at });
        return;
      case 'chat:history':
        publish({ t: 'chat:history', msgs: (frame.msgs ?? []).map((m) => ({ ...m, seat: toView(m.seat) })) });
        return;
      case 'seated':
        return;
      case 'pong':
        // Liveness only — arriving already refreshed the frame clock in onmessage.
        return;
      case 'error':
        // The code matters as well as the text: 'dropped' means the seat is
        // gone and the table view on screen is a fiction.
        onError(frame.message || frame.code || 'error', frame.code);
        return;
      default:
    }
  }

  /**
   * Shape a finished hand the way the history screen expects.
   *
   * There is no `serverSeed` here and there cannot be: the socket does not
   * carry it, because everything on the socket reaches spectators too and the
   * seed re-derives every card that was mucked. The row carries the
   * commitment, the board and the cards this client was shown; the seed that
   * turns it into a checkable proof is fetched from /api/hands, which knows
   * who was dealt in.
   */
  function handRecord(e) {
    const mine = (e.seats ?? []).find((s) => s.seat === 0) || {};
    const dealtRows = (e.seats ?? []).filter((s) => (s.hole || []).length === 2);
    return {
      handId: e.handId,
      handNo: view.handNo,
      commit: e.commit,
      // The blind this hand was played at — the history screen counts a hand in
      // big blinds off its own stake, not whichever table is open now.
      bb: view.bb,
      clientSeeds: e.clientSeeds ?? [],
      // The seed THIS client sent for the hand, if it did — so verification can
      // say "your entropy is in the mix", not just "the deck matches".
      myClientSeed: sentSeeds.get(view.handNo) ?? null,
      mySeedIncluded: sentSeeds.has(view.handNo) && (e.clientSeeds ?? []).includes(sentSeeds.get(view.handNo)),
      board: e.board ?? [],
      awards: e.awards ?? [],
      seats: e.seats ?? [],
      dealt: e.dealt,
      // What `verifyHand` checks the deck against, and without it the whole
      // check collapses to "nothing was shown down" on every hand.
      //
      // `position` is the DEAL position, not a seat: cards go to live seats in
      // turn, skipping anyone sitting out, and `e.seats` keeps server order
      // (decodeEvent rewrites the seat NUMBERS into view space but never
      // reorders the rows). The projection replaces a card this client has not
      // earned with `??` rather than dropping it, so every dealt row still has
      // two entries and the ordering survives the trip.
      //
      // A row counts when its cards are real — which is every showdown, plus
      // the hero's own hand. Checking your own cards against the committed deck
      // is the thing most worth checking, and it works on a hand you folded
      // preflop, where nothing was shown down at all.
      revealed: dealtRows
        .map((s, position) => ({ s, position }))
        .filter(({ s }) => !s.hole.includes(FACE_DOWN.id))
        .map(({ s, position }) => ({ position, hole: s.hole })),
      rake: e.rake ?? 0,
      pot: (e.awards ?? []).reduce((a, x) => a + x.amount, 0),
      heroNet: mine.net ?? 0,
      heroHole: mine.hole ?? [],
      showdown: (e.revealedSeats ?? []).length > 0,
      at: Date.now(),
      remote: true,
    };
  }

  /* ── public surface ────────────────────────────────────────────────────── */

  return {
    kind: 'remote',

    subscribe(fn) {
      subs.push(fn);
      fn(view, null);
      return () => {
        subs = subs.filter((f) => f !== fn);
      };
    },

    getState: () => view,
    getLegal: () => legal,

    act(action) {
      if (!legal) return null;
      // `to` is only carried by a raise, so the wire shape grows a field here.
      const wire: any = { type: action.type };
      if (action.type === 'raise' || action.type === 'allin') {
        const target = action.type === 'allin' ? legal.maxRaiseTo : action.to ?? legal.minRaiseTo;
        wire.type = 'raise';
        wire.to = toMicro(Math.min(Math.max(target, legal.minRaiseTo), legal.maxRaiseTo));
      }
      send({ t: 'act', action: wire, seq: ++seq });
      // Clear locally so the action bar cannot be double-fired while the server
      // decides. The next frame is authoritative either way.
      legal = null;
      return { ...action, seq };
    },

    /** Join the table. Remote-only — local seats are fixed at construction. */
    sit(seatIdx, buyIn) {
      send({ t: 'sit', seatIdx, buyIn: toMicro(buyIn) });
    },

    /** Contribute entropy for the next hand's shuffle. */
    contributeSeed,

    /**
     * The commitment this client saw published for `handNo`, before any card
     * was dealt — or null if it was not connected then. The history screen
     * checks a fetched proof against this before believing it.
     */
    witnessedCommit: (handNo) => witnessed.get(handNo) ?? null,


    /** One line of table talk. The server enforces seating, length and pace. */
    sendChat: (text) => send({ t: 'chat', text: String(text).slice(0, 240) }),
    useTimeBank: () => send({ t: 'timebank' }),
    sitOut: () => send({ t: 'sitout' }),
    sitIn: () => send({ t: 'sitin' }),
    sitUp: () => {
      send({ t: 'situp' });
      return 'out';
    },
    leave: () => send({ t: 'leave' }),
    topUp: (n) => send({ t: 'topup', amount: toMicro(n) }),

    history: () => history,
    verify: (handId) => verifyRemote(history.find((h) => h.handId === handId)),

    // Pacing and bot-drives-hero are demo concepts; the server owns both now.
    setPace: () => {},

    start: open,

    // No dropConnection here. Faking a drop is an offline-demo hook; on a real
    // table it switched off auto-reconnect, and the gateway gives an absent
    // seat 1s to act and releases it after 30s (actor.ts). "resume now" on the
    // reconnect scrim just redials early.
    restoreConnection: open,

    /**
     * Take the table again from scratch, on a new socket — what a page reload
     * does on the wire, without the reload. `since` is dropped so the gateway
     * answers the fresh `hello` with a full sync rather than "nothing new",
     * and anything sent meanwhile waits in the outbox and goes out behind it.
     * For when the view is known to be stale and no frame is coming to fix it.
     */
    resync() {
      if (closed || authDead) return;
      lastEventId = 0;
      // A live socket is closed and `onclose` redials; a dead one is redialled here.
      if (ws && ws.readyState <= 1) {
        resyncing = true;
        try { ws.close(); } catch { resyncing = false; open(); }
      } else open();
    },

    destroy() {
      closed = true;
      subs = [];
      stopHeartbeat();
      clearTimeout(retryTimer);
      if (ws) ws.close();
    },
  };
}

/**
 * The receipt a hand carries before its proof has been fetched.
 *
 * This is NOT a verification and does not claim to be one. The socket carries
 * no server seed — see `handRecord` — so nothing here can re-derive a deck.
 * `pending` says so, and the history screen fetches `/api/hands?id=…` and runs
 * the real `verifyHand` from `verify.js` over what comes back.
 *
 * It exists because a row still has to render something before that fetch
 * lands: the commitment the server published before it dealt, and the entropy
 * every player contributed.
 */
export function verifyRemote(rec) {
  if (!rec) return { ok: false, reason: 'Unknown hand' };
  return {
    ok: false,
    pending: true,
    reason: 'The proof for this hand has not been fetched yet',
    commit: rec.commit,
    clientSeeds: rec.clientSeeds ?? [],
    board: (rec.board ?? []).join(' '),
  };
}
