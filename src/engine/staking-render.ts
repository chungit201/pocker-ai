/* The staking page.
 *
 * Rendered imperatively into one container, like the docs, because it is a
 * read-mostly page of numbers and charts and putting it in the app template
 * would add two thousand lines to a file that is already long.
 *
 * Every figure here comes from `/api/staking`, which reads it off the chain,
 * or from the staker's own wallet reads. Nothing on this page is a promise
 * about what the yield will be: the headline rate is TRAILING — what was
 * actually paid over the days behind us — because the alternative (this week's
 * pot ÷ seven days, annualised) overstates the rate by an order of magnitude
 * on day one, and every staker who arrives on the strength of it is
 * disappointed by day three.
 *
 * Before the contracts exist the whole page still renders: the ladder, the
 * rules and the arithmetic are fixed at deployment and known in advance, so
 * they are shown with the live figures held empty and one line saying so.
 *
 * ## Two rules this file keeps
 *
 * 1. **Never print a forecast as if it were a record.** A number with no basis
 *    is an em dash and a sentence saying why, never a plausible-looking guess.
 * 2. **Typing must not repaint.** The page rebuilds its DOM wholesale, and an
 *    input replaced mid-keystroke loses focus — so keystrokes update the
 *    dependent nodes in place and never ask for a repaint.
 */

/* ── the felt's palette, as the design deck names it ──────────────────────── */
/* Kept in step with TRAILING_WINDOW_DAYS in services/gateway/src/staking-stats.ts
   — the estimate on this page and the APR the gateway publishes must look over
   the same window, or the page argues with itself about what a lock is worth. */
const TRAILING_WINDOW_DAYS = 14;

const FELT = '#131a2f';
const CARD = '#0a0d16';
const INK = '#e8ecf8';
const MUTED = '#94a3c4';
const BRASS = '#a78bfa';
/* Despite the name, this is a TEXT colour here: fifteen of its sixteen uses are
   `color:${PAPER}` on the dark hero — every display figure and serif heading on
   the page. The one surface that used it is the position card below, which now
   names P_PANEL instead. Themed as a dark panel it made all of them invisible. */
const PAPER = '#e8ecf8';
const WIN = '#22d3ee';
const LOSS = '#f0a8b4';
const CLARET = '#f43f5e';
const BURNT = '#a78bfa';
/* the cream card's own ink */
const P_INK = '#e8ecf8';
const P_SUB = '#94a3c4';
const P_LAB = '#94a3c4';
const P_WELL = '#0d1220';
const P_PANEL = '#1a2238';
const P_BAD = '#e5484d';

const HAIR = 'rgba(232,236,248,0.12)';
const HAIR_SOFT = 'rgba(232,236,248,0.08)';
/* A hairline on the panel. It was a translucent near-black, because the panel
   was cream; the panel is dark glass now, so the same line is drawn in light at
   the same weight. */
const P_HAIR = 'rgba(232,236,248,0.13)';

/* The app self-hosts exactly one display face and no mono, so figures are set
   in Instrument Serif and aligned with tabular numerals rather than pulling in
   a monospace the site does not otherwise load. */
const SERIF = "'Instrument Serif', Georgia, serif";
const UI = "'Inter Tight', system-ui, sans-serif";
const NUM = 'font-variant-numeric:tabular-nums';
const EYEBROW = `font-family:${UI};font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${BRASS}`;
const EYEBROW_M = `font-family:${UI};font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${MUTED}`;

const DAY_MS = 86_400_000;

/* ── dom ──────────────────────────────────────────────────────────────────
   `style.cssText`, not `setAttribute('style', …)`: the app's button system
   keys its hover and active states off the SERIALIZED style attribute
   (`.pill-flat[style*="rgba(139,92,246,1)"]`), and only the CSSOM rewrites
   `#8b5cf6` into `rgba(139,92,246,1)`. Set the attribute as text and the
   buttons on this page would be the only dead ones on the site. */
const el = (tag, style?) => {
  const n = document.createElement(tag);
  if (style) n.style.cssText = style;
  return n;
};
const text = (tag, style, s) => { const n = el(tag, style); n.textContent = s; return n; };
const svgEl = (tag, attrs?) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, String(v));
  return n;
};
const add = (parent, ...kids) => { for (const k of kids) if (k) parent.appendChild(k); return parent; };

/** A milled plate, in the four weights the design uses. */
function plate(label, onClick, { kind = 'outline', disabled = false, wide = false, size = 14 } = {}) {
  const base = `display:inline-flex;align-items:center;justify-content:center;border-radius:5px;`
    + `font-family:${UI};font-size:${size}px;${wide ? 'width:100%;' : ''}`
    + `cursor:${disabled ? 'not-allowed' : 'pointer'};opacity:${disabled ? 0.45 : 1};`;
  const skin = {
    /* The primary action. Its label was `color:${FELT}` — the felt's own green,
       which read on cream and reads at 3.35:1 on the violet that replaced it.
       Near-white instead; FELT stays what it is, a surface. */
    paper: 'padding:13px 18px;background:linear-gradient(180deg,#8b5cf6,#6d3fd4);'
      + 'border:1px solid rgba(148,163,196,0.55);box-shadow:inset 0 1px 0 rgba(255,255,255,0.27),0 1px 3px rgba(0,0,0,0.35);'
      + 'color:#f6f3ff;font-weight:600',
    // ink on cream — the primary action inside the paper card
    ink: 'padding:14px 18px;background:linear-gradient(180deg,#222c47,#0d1220);border:0;'
      + 'box-shadow:inset 0 1px 0 rgba(148,163,196,0.12),0 1px 2px rgba(0,0,0,0.35);color:#b497f7',
    // hairline on felt
    outline: `padding:10px 15px;background:transparent;border:1px solid rgba(232,236,248,0.28);color:${INK}`,
    // hairline on cream
    quiet: `padding:6px 9px;background:transparent;border:1px solid rgba(232,236,248,0.176);color:${P_INK};font-size:12px`,
  }[kind];
  const b = el('button', base + skin);
  b.className = 'pill-flat';
  b.type = 'button';
  b.textContent = label;
  b.disabled = !!disabled;
  if (!disabled && onClick) b.addEventListener('click', onClick);
  return b;
}

/** A range/unit chip: a small toggle with a brass fill when it is on. */
function chip(label, on, onClick) {
  const b = el('button', `position:relative;padding:5px 9px;border-radius:5px;border:1px solid ${on ? 'rgba(139,92,246,0.5)' : 'rgba(232,236,248,0.18)'};`
    + `background:${on ? 'rgba(139,92,246,0.14)' : 'transparent'};font-family:${UI};font-size:10px;letter-spacing:.1em;`
    + `text-transform:uppercase;color:${on ? INK : MUTED};cursor:pointer;transition:border-color .16s ease,color .16s ease`);
  b.className = 'chip';
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

/* ── formatting ────────────────────────────────────────────────────────────
   Two currencies with different decimals and wildly different magnitudes: USDC
   is micro and small, $SUITED is 18-decimal and in the millions. Both are
   strings on the wire (bigint does not survive JSON), so both are parsed here
   and nowhere else. */

const big = (s) => { try { return BigInt(s ?? 0); } catch { return 0n; } };

/** micro-USDC → a number of dollars. Safe: micro-USDC fits a double far past
 *  any balance this contract will hold. */
const usd = (micro) => Number(big(micro)) / 1e6;

/** Token base units → a number of whole tokens, via a bigint divide so an
 *  18-decimal supply never touches the top of a double. */
function toTokens(units, decimals) {
  const d = BigInt(decimals ?? 18);
  if (d <= 6n) return Number(big(units)) / 10 ** Number(d);
  const scale = 10n ** (d - 6n);
  return Number(big(units) / scale) / 1e6;
}

/** a ÷ b for two bigints, as a double. Both are token units here, so six
 *  significant figures is far past what any percentage needs. */
const ratio = (a, b) => (b > 0n ? Number((a * 1_000_000n) / b) / 1e6 : 0);

const num = (n, dp = 0) => (n === null || n === undefined || !isFinite(n) ? 'N/A'
  : n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }));
const money = (n, dp = 2) => (n === null || n === undefined || !isFinite(n) ? 'N/A' : `$${num(n, dp)}`);
const pct = (n, dp = 1) => (n === null || n === undefined || !isFinite(n) ? 'N/A' : `${num(n, dp)}%`);

/** Big counts read better short; small ones need their digits. */
function compact(n) {
  if (n === null || n === undefined || !isFinite(n)) return 'N/A';
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e4) return `${Math.round(n / 1e3)}k`;
  return num(n, 0);
}
const moneyA = (n) => (n === null || n === undefined || !isFinite(n) ? 'N/A'
  : Math.abs(n) >= 10_000 ? `$${compact(n)}` : money(n, Math.abs(n) >= 1000 ? 0 : 2));

/** A threshold is a number someone has to meet exactly, so it is never
 *  abbreviated: "100.0k" invites a wrong guess at the last three digits. */
const exact = (n) => num(n, 0);

/** "4d 17h", "6h 02m", "48s" — a countdown at the resolution that matters. */
function dur(ms) {
  if (!isFinite(ms) || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${s}s`;
}

/** "2 min ago" — how old a read is, said plainly. */
function ago(at, now) {
  if (!at) return null;
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return 'Just now';
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  return `${Math.round(s / 3600)}h ago`;
}

const localWhen = (ms) => new Date(ms).toLocaleString('en-US',
  { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const utcWhen = (ms) => `${new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}, 00:00 UTC`;
const utcDayLabel = (ms) => new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

const boostLabel = (bps) => `${(bps / 10_000).toFixed(bps % 10_000 === 0 ? 0 : 1)}×`;
/** "30-day", for "a 30-day lock" — the ladder only ever uses whole days. */
const lockAdj = (seconds) => {
  const d = Math.round(seconds / 86_400);
  return d >= 1 ? `${d}-day` : `${Math.round(seconds / 3_600)}-hour`;
};
/** The ticker as the site writes it. The contract's symbol is `SUITED`; the
 *  dollar sign is part of the name everywhere it is spoken. */
const ticker = (symbol) => (symbol && symbol.startsWith('$') ? symbol : `$${symbol || 'SUITED'}`);
const short = (a) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || 'N/A');

/** A daily countdown, in the shape the jackpot timer uses: `5d 04:12:03`. */
function clock(ms) {
  if (!isFinite(ms) || ms <= 0) return '00:00:00';
  const t = Math.floor(ms / 1000);
  const p = (x) => String(x).padStart(2, '0');
  const d = Math.floor(t / 86_400);
  return `${d > 0 ? `${d}d ` : ''}${p(Math.floor((t % 86_400) / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`;
}

/**
 * The first midnight in `zone` strictly after `at` — the same arithmetic the
 * sweep keeper runs (services/gateway/src/rake-keeper.ts), so the page's
 * countdown and the keeper's alarm clock agree.
 *
 * Computed from the zone's offset rather than by adding 24 hours, because both
 * DST changeovers land on a real local midnight: in spring the local day is 23
 * hours long, in autumn 25, and a fixed day would drift an hour each way.
 */
function nextMidnightIn(zone, at) {
  const offset = (when) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hour12: false, year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(when));
    const f = (t) => Number((parts.find((x) => x.type === t) || {}).value);
    // 'en-US' with hour12:false has been known to report midnight as 24.
    return Date.UTC(f('year'), f('month') - 1, f('day'), f('hour') % 24, f('minute'), f('second'))
      - Math.floor(when / 1000) * 1000;
  };
  try {
    const midnightLocal = Math.floor((at + offset(at)) / DAY_MS) * DAY_MS + DAY_MS;
    // Correct using the offset in force AT that instant, not at `at`: the two
    // differ across a changeover.
    let utc = midnightLocal - offset(at);
    utc = midnightLocal - offset(utc);
    return utc > at ? utc : utc + DAY_MS;
  } catch {
    return null;   // an engine without that zone in its tz database
  }
}

/** The zone as a place, for prose: "America/New_York" → "New York". */
const zoneLabel = (zone) => String(zone || '').split('/').pop().replace(/_/g, ' ') || 'New York';

/** The contract rounds every unlock UP to the next midnight UTC (`_ceilEpoch`),
 *  so the page computes the same boundary rather than promising an hour the
 *  chain will not honour. */
function ceilUtcDay(ms) {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  let x = d.getTime();
  while (x < ms) x += DAY_MS;
  return x;
}

/**
 * The terms the contract will be deployed with, for the page that exists
 * BEFORE the contract does.
 *
 * Everything here is a constructor argument — fixed at deployment and
 * unchangeable afterwards — so it is knowable in advance and published in the
 * launch runbook (docs/LAUNCH-DAY-STAKING.md). Without this the page contradicts
 * itself pre-launch: it promises "the ladder and the terms below are the ones
 * the contract will be deployed with", then shows an empty ladder.
 *
 * The live contract always wins. This is the fallback, and the page says which
 * it is showing.
 */
const PLANNED_TERMS = {
  // No minimum (user, 2026-09-21): stake one token, or less, if you want to.
  // Deployed as MIN_STAKE=0, which the contract stores as a floor of ONE BASE
  // UNIT — "you have to stake something", not a minimum.
  minStake: '0',
  rewardsDuration: 604800,                // 7 days
  tiers: [
    { duration: 259200, boostBps: 10000 },    //  3 days · 1×
    { duration: 604800, boostBps: 12000 },    //  7 days · 1.2×
    { duration: 1209600, boostBps: 16000 },   // 14 days · 1.6×
    { duration: 2592000, boostBps: 26000 },   // 30 days · 2.6×
  ],
};

/**
 * The contract always keeps a floor of one base unit (it stores `0` as `1`), so
 * `minStake` is never literally zero — but a floor below one whole token is the
 * contract saying "stake something", not a minimum anyone should be told
 * about. Below that line the page says there is no minimum.
 */
const hasMinimum = (minStake, decimals) => big(minStake) >= 10n ** BigInt(decimals);

/** The terms to show, and whether they came from the chain or from the plan. */
const termsOf = (d) => d.terms || PLANNED_TERMS;

/** "150,000.5" → base units, in BigInt. A million tokens at 18 decimals is
 *  1e24, far past a double's exact range, and an amount that silently rounds
 *  is a support ticket. Null for anything that is not a number. */
function toBase(value, decimals) {
  const clean = String(value || '').replace(/[,\s]/g, '');
  if (!/^\d*\.?\d*$/.test(clean) || clean === '' || clean === '.') return null;
  const [whole, frac = ''] = clean.split('.');
  const padded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(padded || '0');
}

/* ── page state ───────────────────────────────────────────────────────────
   The chart range, the unit toggles and the open sheet belong to the page and
   not to the app: they survive a repaint, they never need to be routed, and
   nothing outside this file reads them. */

const ui = {
  range: 30,
  tvlUnit: 'usd',
  aprTier: null,        // null → the longest lock
  aprMode: 'apr',
  log: false,
  sheet: null,          // { kind, pos, pickTier, phase, sawBusy }
};

/** The last render's inputs, so an interaction here can repaint without the
 *  app having to hand them over again. */
let last = null;
const repaint = () => { if (last && last.host.isConnected) render(last.host, last.data, last.me); };

/**
 * What is in the amount box RIGHT NOW.
 *
 * Typing updates the app's draft without asking for a repaint (see
 * `stakeForm`), so a repaint driven from inside this file — a chart range
 * chip, say — is working from the `me` of the last render, whose draft is one
 * keystroke behind. Reading the live input instead means clicking a chip can
 * never take back what somebody just typed.
 */
const liveDraft = () => {
  const node = last && last.host.isConnected ? last.host.querySelector('#stk-amount') : null;
  return node ? node.value : null;
};

/* Live text — countdowns and the claimable figure — is updated by writing to a
   handful of text nodes, NOT by repainting: a repaint four times a second
   would fight the input for focus and rebuild both charts for nothing. */
let tickers = [];
let ticking = null;
function tick() {
  if (ticking) return;
  ticking = setInterval(() => {
    if (!last || !last.host.isConnected) {
      clearInterval(ticking);
      ticking = null;
      tickers = [];
      observers.forEach((o) => o.disconnect());
      observers = [];
      return;
    }
    const now = Date.now();
    for (const t of tickers) { try { t(now); } catch { /* one stale node never stops the rest */ } }
  }, 250);
}

/** Observers for the charts' own width. Torn down and rebuilt each render. */
let observers = [];

/* ── what the page knows ──────────────────────────────────────────────────
   One pass over the payload, so every section reads the same numbers and the
   arithmetic lives in one place. */

function digest(d, me, now) {
  const terms = termsOf(d);
  const tiers = terms.tiers || [];
  const decimals = (d.token && d.token.decimals) || 18;
  const symbol = ticker((d.token && d.token.symbol) || 'SUITED');
  const st = d.state || null;

  // TRAILING ONLY. The instantaneous rate is the pot over the drip, annualised,
  // and on day one — a full week's rewards landing on whoever staked first —
  // it reads in the hundreds of thousands of percent. The anvil rehearsal
  // printed "$243,333 per 100k" as its headline. Until two days of history
  // exist the rate is simply not known yet, and the page says so.
  const rate = (d.apr && d.apr.trailing) || null;
  const price = d.apr && d.apr.priceUsdg ? usd(d.apr.priceUsdg) : null;   // dollars per whole token
  const priceSource = (d.apr && d.apr.priceSource) || null;

  const lockedUnits = st ? big(st.totalStaked) : null;
  const weightUnits = st ? big(st.activeWeight) : 0n;
  const locked = lockedUnits === null ? null : toTokens(lockedUnits, decimals);
  const weight = toTokens(weightUnits, decimals);
  const supply = d.token && d.token.totalSupply ? toTokens(d.token.totalSupply, decimals) : null;

  // USDC per year per unit of weight, as the gateway computed it. Used only as
  // a fallback: see `annualPot` below for why it cannot be the primary.
  const perWeightYear = rate ? usd(rate.perTokenYear) : null;

  // ── the history series, priced on the day it happened ──────────────────
  const hist = d.history || [];
  const days = hist.map((h, i) => {
    const dayMs = Date.parse(`${h.day}T00:00:00Z`);
    const dayLocked = toTokens(h.totalStaked, decimals);
    const dayWeight = toTokens(h.activeWeight, decimals);
    const dayPrice = h.price === null || h.price === undefined ? null : usd(h.price);
    // `funded` only grows, so a day's money in is the difference between two
    // rows. The first row has nothing behind it, so it has no daily figure.
    const paid = i > 0 ? Math.max(0, usd(big(h.funded) - big(hist[i - 1].funded))) : null;
    return {
      ms: dayMs,
      locked: dayLocked,
      weight: dayWeight,
      price: dayPrice,
      tvl: dayPrice === null ? null : dayLocked * dayPrice,
      paid,
      // What that day's money in works out to as a yearly rate at 1×, priced
      // at that day's price. Null unless all three parts are known.
      apr1: paid !== null && dayPrice && dayWeight > 0 ? (paid * 365) / (dayWeight * dayPrice) * 100 : null,
    };
  });
  const paidWeek = days.slice(-7).reduce((a, x) => a + (x.paid || 0), 0);

  /*
   * The POT, annualised — what the streams actually bring in per year, which
   * is the figure every estimate on this page has to be built from.
   *
   * The tempting shortcut is rate × weight: take the gateway's USDC-per-unit-
   * of-weight and multiply by what is locked. It is wrong in the one case that
   * matters most, an empty pool — rate × 0 is zero, so the page tells the
   * first staker in the door that they would earn nothing, when in fact they
   * would earn the entire drip. The money coming in does not depend on who is
   * staked; only its division does.
   */
  /* Over the SAME trailing window the gateway's headline rate uses, not over
     all the history there is. The reason is the gateway's, written at
     services/gateway/src/staking-stats.ts:120 — creator fees scale with
     trading volume, launch-week volume is many times a normal day's, and a
     window that reaches back to launch keeps quoting launch week's rate for as
     long as it reaches. `/api/staking` ships 90 days, so this read launch week
     for three months, and it fed the estimate sitting beside a 30-day lock
     with no early exit while the APR tile further up the page read the
     gateway's 14-day figure. The two disagreed and the optimistic one was the
     one attached to the money. */
  const windowMs = TRAILING_WINDOW_DAYS * DAY_MS;
  const newest = hist.length ? hist[hist.length - 1].at : 0;
  const win = hist.filter((r) => newest - r.at <= windowMs);
  const spanMs = win.length >= 2 ? win[win.length - 1].at - win[0].at : 0;
  const potYear = spanMs >= DAY_MS
    ? (usd(big(win[win.length - 1].funded) - big(win[0].funded)) * 365 * DAY_MS) / spanMs
    : null;
  const potDays = potYear === null ? null : Math.max(1, Math.round(spanMs / DAY_MS));

  // What has been paid in, all time. The live read is two contract calls, one
  // per funder; when neither funder is configured the last daily snapshot
  // holds the same total, and showing an em dash beside a chart of real
  // payments would be the page contradicting itself.
  const liveFunded = d.funded && (d.funded.rake !== null || d.funded.fees !== null)
    ? usd(d.funded.rake) + usd(d.funded.fees) : null;
  const lastRow = hist.length ? hist[hist.length - 1] : null;
  const fundedAll = liveFunded !== null ? liveFunded : lastRow ? usd(lastRow.funded) : null;

  // ── this wallet ────────────────────────────────────────────────────────
  const positions = (me && me.positions) || [];
  const chainNow = (me && me.now) || now;
  const mine = positions.map((p) => {
    const tier = tiers[p.tier] || null;
    const end = p.lockEnd * 1000;
    // The contract does not store when a position started, so the bar is drawn
    // from the tier's own length back from the unlock — which is the start,
    // give or take the rounding up to midnight.
    const start = end - (tier ? tier.duration * 1000 : DAY_MS);
    const live = end > chainNow;
    // The wallet hands these over as BigInts; normalising anyway costs nothing
    // and keeps one loose string from turning the whole page into an exception.
    const weightU = big(p.weight);
    return {
      id: p.id,
      amount: big(p.amount),
      tokens: toTokens(p.amount, decimals),
      weight: weightU,
      tierIndex: p.tier,
      tier,
      end,
      start,
      live,
      share: live && weightUnits > 0n ? ratio(weightU, weightUnits) * 100 : null,
      progress: Math.max(0, Math.min(1, (chainNow - start) / Math.max(1, end - start))),
    };
  });
  const ended = mine.filter((p) => !p.live);
  const myWeightUnits = mine.reduce((a, p) => a + (p.live ? p.weight : 0n), 0n);

  return {
    live: !!d.live,
    paused: !!(st && st.paused),
    readAt: d.readAt || null,
    terms, tiers, decimals, symbol, st, rate, price, priceSource,
    locked, lockedUnits, weight, weightUnits, supply,
    supplyPct: supply && locked !== null && supply > 0 ? (locked / supply) * 100 : null,
    tvlUsd: locked === null || price === null ? null : locked * price,
    perWeightYear, potYear, potDays,
    days, paidWeek, fundedAll,
    router: d.router || null,
    // The keeper's own next run when it has reported one and it is still in
    // the future; otherwise the same midnight it will pick, worked out here.
    // Never a countdown before the contract is live: a clock ticking down to a
    // sweep that cannot happen yet is a promise, not a fact.
    sweepZone: (d.router && d.router.sweepZone) || 'America/New_York',
    sweepAt: null,
    economics: d.economics || null,
    contract: d.contract || null,
    tokenAddress: (d.token && d.token.address) || null,
    positions: mine, ended, myWeightUnits, chainNow,
    balanceUnits: me && me.balance !== null && me.balance !== undefined ? big(me.balance) : null,
    fromPlan: !d.terms,
  };
}

/** Fill in the sweep clock, once the rest of the digest exists. */
function withSweep(v, now) {
  const reported = v.router && v.router.nextSweep;
  v.sweepAt = reported && reported > now ? reported : nextMidnightIn(v.sweepZone, now);
  return v;
}

/**
 * What a given amount at a given tier would earn.
 *
 * Adding weight to the pool dilutes it, including for the person adding it —
 * the pot is fixed, so a staker's share is w / (W + w) of a pot worth r × W.
 * Quoting r × w instead is the oldest overstatement in staking UI, and it is
 * wrong by exactly the amount that matters most: a big stake's own dilution.
 */
function estimate(v, tokens, tierIndex) {
  const tier = v.tiers[tierIndex] || v.tiers[v.tiers.length - 1] || null;
  const mult = tier ? tier.boostBps / 10_000 : 1;
  const w = tokens * mult;
  const W = v.weight || 0;
  const share = W + w > 0 ? w / (W + w) : 0;
  // The pot, split by weight. Falls back to the gateway's per-weight rate when
  // there is no history to annualise — which also means there is no pot to
  // divide, so both are null together in practice.
  const pot = v.potYear !== null ? v.potYear : v.perWeightYear !== null ? v.perWeightYear * W : null;
  const perYear = pot === null || w <= 0 ? null : pot * share;
  const end = ceilUtcDay(v.chainNow + (tier ? tier.duration * 1000 : DAY_MS));
  const lockDays = (end - v.chainNow) / DAY_MS;
  return {
    tier, mult, w, share, end, lockDays,
    perYear,
    perDay: perYear === null ? null : perYear / 365,
    perWeek: perYear === null ? null : (perYear / 365) * 7,
    overLock: perYear === null ? null : (perYear / 365) * lockDays,
    apr: perYear === null || !v.price || !tokens ? null : (perYear / (tokens * v.price)) * 100,
  };
}

/**
 * The tiers a relock may legally pick for `p`, as indices.
 *
 * The contract refuses anything that would end sooner than the lock already
 * does (`CannotShorten`), so those are never offered. A LOWER multiplier that
 * still ends later is refused here rather than by the contract: it trades
 * boost for lock time, which is worse on both counts. And a tier that would
 * change neither the end nor the boost is not an option at all — it is a
 * transaction that costs gas to do nothing, which is how a 30-day lock taken
 * an hour ago has no extension to offer until tomorrow.
 */
function relockTiers(v, p) {
  const out = [];
  v.tiers.forEach((t, i) => {
    const end = ceilUtcDay(v.chainNow + t.duration * 1000);
    if (p.live) {
      if (end < p.end) return;
      if (p.tier && t.boostBps < p.tier.boostBps) return;
      if (end === p.end && p.tier && t.boostBps === p.tier.boostBps) return;
    }
    out.push(i);
  });
  return out;
}

/* ── hero ─────────────────────────────────────────────────────────────────── */

function heroSection(v) {
  const wrap = el('div', `position:relative;border-radius:12px;overflow:hidden;background:${CARD};border:1px solid ${HAIR_SOFT}`);
  wrap.className = 'gm-panel'; // the table-felt card every hero wears (globals.css)

  const body = el('div', 'position:relative;padding:clamp(26px,54px,46px) clamp(22px,51px,44px)');
  const eyebrowRow = el('div', 'display:flex;align-items:center;gap:9px;margin-bottom:clamp(14px,24px,20px)');
  if (v.live) eyebrowRow.appendChild(el('span', `width:7px;height:7px;border-radius:50%;background:${BRASS};flex:none;animation:suPulse 2.2s ease-in-out infinite`));
  // One framing, launched or not (user, 2026-09-22: "it should just read this
  // regardless" — the gap between launch and the contract being wired up is
  // minutes, and a page that flips modes is a page someone has to flip).
  // Each clause is added only when it is TRUE, so the eyebrow is never wrong,
  // just shorter: "staking" alone until there is a day to count.
  const dayN = v.days.length ? Math.floor((Date.now() - v.days[0].ms) / DAY_MS) + 1 : null;
  const eyebrow = ['Staking',
    dayN ? `day ${dayN}` : null,
    v.paused ? 'New locks paused' : v.rate ? 'Rewards streaming' : v.fundedAll ? 'First payments dripping' : null,
  ].filter(Boolean).join(' · ');
  eyebrowRow.appendChild(text('span', EYEBROW_M, eyebrow));
  body.appendChild(eyebrowRow);

  body.appendChild(text('h1',
    `margin:0 0 clamp(14px,24px,18px);font-family:${SERIF};font-weight:400;font-size:clamp(32px,76px,60px);`
    + `line-height:1.02;letter-spacing:-.015em;color:${PAPER};max-width:19ch;text-wrap:balance`,
    'Become the house.'));
  body.appendChild(text('p', `margin:0 0 7px;font-size:clamp(15px,23px,18px);color:${INK};font-weight:300`,
    'Lock $SUITED. Earn alongside the house.'));

  const fresh = text('span', EYEBROW_M, '');
  const setFresh = (now) => {
    // Said only when it is true. With no contract being read there is no
    // freshness to report, so the line is simply absent rather than claiming
    // a read that has not happened.
    fresh.textContent = v.live
      ? (v.readAt ? `Live from the contract · updated ${ago(v.readAt, now)}` : 'Live from the contract')
      : '';
  };
  setFresh(Date.now());
  tickers.push(setFresh);
  body.appendChild(fresh);
  wrap.appendChild(body);
  return wrap;
}

function noticeStrip(v) {
  const wrap = el('div', `display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 18px;border:1px solid ${HAIR};border-radius:8px`);
  const line = v.paused
    ? 'New locks are paused on the contract. Withdrawing and claiming are not pausable and still work.'
    : 'Rewards are paid in USDC from real revenue. Nothing is minted.';
  wrap.appendChild(text('span', `font-size:13.5px;color:${v.paused ? PAPER : MUTED};flex:1 1 220px`, line));
  return wrap;
}

/* ── the four tiles ───────────────────────────────────────────────────────── */

// `caption` and `tone` are optional: a bare figure tile carries neither.
function tile(label, value, caption?, tone?) {
  const box = el('div', `flex:1 1 158px;min-width:0;padding:16px 18px 15px;border:1px solid ${HAIR};border-radius:8px;display:flex;flex-direction:column;gap:8px`);
  box.appendChild(text('span', EYEBROW, label));
  const big = text('span', `font-family:${SERIF};${NUM};font-size:clamp(27px,44px,34px);line-height:1;color:${tone || PAPER}`, value);
  box.appendChild(big);
  box.appendChild(text('span', `font-size:12.5px;font-weight:300;color:${MUTED};line-height:1.35`, caption));
  return { node: box, value: big };
}

function tilesRow(v, d) {
  const wrap = el('div', 'display:flex;flex-wrap:wrap;gap:clamp(10px,17px,14px)');

  // 1 — what is locked, in dollars when a price is knowable and in tokens when
  //     it is not. The caption always carries the token count and the share of
  //     supply, which are facts either way.
  const supplyLine = [
    v.locked === null ? null : `${compact(v.locked)} ${v.symbol}`,
    v.supplyPct === null ? null : `${pct(v.supplyPct)} of supply`,
  ].filter(Boolean).join(' · ');
  wrap.appendChild(tile('Total value locked',
    v.tvlUsd === null ? (v.locked === null ? 'N/A' : compact(v.locked)) : `$${compact(v.tvlUsd)}`,
    v.locked === null ? `${v.symbol} locked · share of supply` : supplyLine).node);

  // 2 — the rate, TRAILING, at the longest lock. No price on chain means no
  //     percentage, so the figure becomes USDC per 100k tokens and says so.
  const top = v.rate && v.rate.perTier && v.rate.perTier.length ? v.rate.perTier[v.rate.perTier.length - 1] : null;
  const longest = v.tiers.length ? lockAdj(v.tiers[v.tiers.length - 1].duration) : '30-day';
  wrap.appendChild(tile('apr',
    top === null ? 'N/A' : top.pct === null ? money(usd(top.perTokenYear) * 100_000, 0) : `Up to ${pct(top.pct)}`,
    top === null
      ? (v.weight <= 0 ? 'Nobody is staked yet, so there is no pool rate'
        : 'A rate opens after two days of payments')
      : top.pct === null
        ? `Per 100k at ${boostLabel(top.boostBps)} · no token price on chain yet`
        : `${longest} lock · trailing ${v.rate.days} days`,
    top === null ? PAPER : BRASS).node);

  // 3 — what has actually been paid.
  wrap.appendChild(tile('Paid to stakers',
    v.fundedAll === null ? 'N/A' : money(v.fundedAll, 0),
    v.fundedAll === null ? 'All time, in USDC'
      : v.paidWeek > 0 ? `${money(v.paidWeek, 0)} in the last 7 days` : 'All time, in USDC').node);

  // 4 — the next sweep, counted down. The keeper's own next run when it has
  //     reported one; otherwise the same midnight it will pick.
  const place = zoneLabel(v.sweepZone);
  const routed = !!(v.router && v.router.destinationOk !== false);
  const t = tile('Next sweep', v.sweepAt ? clock(v.sweepAt - Date.now()) : 'N/A',
    !v.router ? `Daily, at midnight ${place}, once the router is live`
        : !routed ? `Daily, at midnight ${place}, the vault is not pointed at the router`
          : `Rake is swept daily, at midnight ${place}`,
    v.sweepAt ? BRASS : PAPER);
  if (v.sweepAt) {
    tickers.push((now) => {
      // Past its own alarm and before the next read: roll to the following
      // midnight rather than sit at zero.
      if (now >= v.sweepAt) v.sweepAt = nextMidnightIn(v.sweepZone, now) || v.sweepAt + DAY_MS;
      t.value.textContent = clock(v.sweepAt - now);
    });
  }
  wrap.appendChild(t.node);

  // 5 — what the buy wall has taken out of supply. The section further down
  //     breaks this down day by day with a receipt per clip; the headline
  //     belongs up here, because how much of the token is gone is a fact about
  //     $SUITED rather than a detail of the keeper that did it. The figure is
  //     the ledger's own running sum, and it keeps three states apart, because
  //     no keeper running and a keeper that has not bought yet are different
  //     claims: — with nothing wired up, 0 once a keeper is armed and waiting,
  //     and the total once the first burn lands. The caption says which.
  const bb = (d && d.buyback) || null;
  const burnt = bb ? toTokens(bb.totals.burnt, v.decimals) : null;
  const burntPct = burnt && v.supply ? (burnt / v.supply) * 100 : null;
  wrap.appendChild(tile('Tokens burnt',
    burnt === null ? 'N/A' : `${compact(burnt)} ${v.symbol}`,
    !bb ? 'The buy wall is not running yet'
      : burntPct !== null ? `${pct(burntPct, burntPct < 1 ? 3 : 1)} of supply, bought back and burnt`
        : 'Nothing burnt yet',
    burnt ? BRASS : PAPER).node);

  return wrap;
}

/* ── open a position ──────────────────────────────────────────────────────── */

function pLabel(s) { return text('span', `font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${P_LAB}`, s); }

function stakeCard(v, me) {
  const card = el('div', `flex:1 1 570px;min-width:0;border-radius:12px;background:${P_PANEL};color:${P_INK};`
    + `border:1px solid rgba(232,236,248,0.154);box-shadow:inset 0 1px 0 rgba(255,255,255,0.21),0 2px 6px rgba(0,0,0,0.375);overflow:hidden`);
  const head = el('div', `padding:11px 18px 9px;border-bottom:1px solid ${P_HAIR}`);
  head.appendChild(pLabel('Open a position'));
  card.appendChild(head);

  const cols = el('div', 'display:flex;flex-wrap:wrap');
  const left = el('div', 'flex:1 1 320px;min-width:0;padding:14px 18px;display:flex;flex-direction:column;gap:12px');
  const right = el('div', `flex:1 1 236px;min-width:0;padding:14px 18px;background:${P_PANEL};border-left:1px solid rgba(232,236,248,0.11);display:flex;flex-direction:column;gap:9px`);

  const tierIndex = me && me.tier !== null && me.tier !== undefined ? me.tier : v.tiers.length - 1;
  const minBase = big(v.terms.minStake) > 0n ? big(v.terms.minStake) : 1n;
  const showMin = hasMinimum(v.terms.minStake, v.decimals);

  /* ── the amount ─────────────────────────────────────────────────────────
     Keystrokes update everything below IN PLACE. A repaint here would replace
     the input under the cursor and drop focus after the first character. */
  const amountBox = el('div', 'display:flex;flex-direction:column;gap:6px');
  const lab = el('label', `font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${P_LAB}`);
  lab.textContent = 'Amount to lock';
  lab.setAttribute('for', 'stk-amount');
  amountBox.appendChild(lab);

  const well = el('div', `display:flex;align-items:center;gap:10px;padding:3px 12px;border-radius:5px;`
    + `border:1px solid rgba(232,236,248,0.22);background:${P_WELL};box-shadow:inset 0 1px 2px rgba(232,236,248,0.176)`);
  well.className = 'field-paper';
  const input = el('input', `flex:1;min-width:0;border:0;background:transparent;outline:none;font-family:${SERIF};`
    + `${NUM};font-size:clamp(27px,44px,35px);line-height:1.2;color:#e8ecf8;caret-color:${BRASS}`);
  input.id = 'stk-amount';
  input.type = 'text';
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
  input.placeholder = '0';
  /* The live input wins only while the app has not itself moved the draft —
     that is what keeps a chart chip from taking back an in-flight keystroke.
     When the app HAS moved it (a lock cleared it), the app is the authority. */
  input.value = (last && last.appDraftChanged) ? ((me && me.draft) || '') : (liveDraft() ?? ((me && me.draft) || ''));
  well.appendChild(input);
  well.appendChild(text('span', `font-size:10px;letter-spacing:.2em;color:${P_LAB};flex:none`, v.symbol));
  amountBox.appendChild(well);

  // Quick fills are fractions of what this wallet holds, so they only exist
  // once a balance has been read. There is no minimum to offer as a fill.
  if (v.balanceUnits !== null && v.balanceUnits > 0n) {
    const fills = el('div', 'display:flex;flex-wrap:wrap;gap:6px');
    for (const f of [0.25, 0.5, 0.75, 1]) {
      const b = plate(f === 1 ? 'MAX' : `${f * 100}%`, () => {
        // Whole tokens, floored: a fraction of an 18-decimal balance is not a
        // number anyone wants to read back in the box.
        const part = (v.balanceUnits * BigInt(Math.round(f * 1000))) / 1000n;
        input.value = exact(Math.floor(toTokens(part, v.decimals)));
        onType();
        input.focus();
      }, { kind: 'quiet' });
      b.style.flex = '1 1 auto';
      fills.appendChild(b);
    }
    amountBox.appendChild(fills);
  }

  const under = el('div', `display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:12.5px;color:${P_SUB}`);
  const balLine = text('span', `color:${P_SUB}`, '');
  const usdLine = text('span', NUM, '');
  under.appendChild(balLine);
  under.appendChild(usdLine);
  amountBox.appendChild(under);
  const errLine = text('span', `font-size:12.5px;color:${P_BAD}`, '');
  amountBox.appendChild(errLine);
  left.appendChild(amountBox);

  /* ── the lock length ────────────────────────────────────────────────────
     A click, not a keystroke — safe to repaint for. */
  const tierBox = el('div', 'display:flex;flex-direction:column;gap:6px');
  tierBox.appendChild(pLabel('Lock length'));
  // The groove the four tiers sit in: a faint lift, not a fill. It was a cream
  // wash on a cream plate; the hue of cream is the hue of brass, which is how
  // it briefly became a 55% violet block.
  const seg = el('div', 'display:flex;border:1px solid rgba(232,236,248,0.22);border-radius:5px;overflow:hidden;background:rgba(232,236,248,0.06)');
  const perWeekCells = [];
  v.tiers.forEach((t, i) => {
    const on = i === tierIndex;
    const b = el('button', 'position:relative;flex:1 1 0;min-width:0;padding:8px 4px 7px;border:0;'
      + 'border-right:1px solid rgba(232,236,248,0.11);background:transparent;display:flex;flex-direction:column;'
      + 'align-items:center;gap:1px;cursor:pointer');
    b.className = 'seg';
    b.type = 'button';
    // The selected tier's tint, under its accent underline.
    if (on) b.appendChild(el('span', `position:absolute;inset:0;background:rgba(139,92,246,0.16);box-shadow:inset 0 -2px 0 ${BURNT}`));
    b.appendChild(text('span', `position:relative;font-size:12px;color:${P_INK}`, `${Math.round(t.duration / 86_400)} days`));
    b.appendChild(text('span', `position:relative;font-family:${SERIF};font-size:16px;line-height:1.1;color:${P_INK}`, boostLabel(t.boostBps)));
    const pw = text('span', `position:relative;font-size:10.5px;color:${P_SUB};min-height:15px;${NUM}`, '');
    perWeekCells.push(pw);
    b.appendChild(pw);
    b.addEventListener('click', () => { if (me && me.setTier) me.setTier(i); });
    seg.appendChild(b);
  });
  tierBox.appendChild(seg);
  tierBox.appendChild(text('span', `font-size:11.5px;color:${P_SUB};line-height:1.45`,
    'The multiplier divides the pool, it never grows it.'));
  left.appendChild(tierBox);
  left.appendChild(text('span', `margin-top:auto;padding-top:10px;border-top:1px solid ${P_HAIR};font-size:11.5px;color:${P_SUB};line-height:1.5`,
    'No early exit. A lock runs to its end, you can extend it, never shorten it.'));

  /* ── what it would earn ─────────────────────────────────────────────────── */
  right.appendChild(pLabel('You would earn'));
  const estBox = el('div', 'display:flex;flex-direction:column;gap:1px');
  const estBig = text('span', `font-family:${SERIF};${NUM};font-size:clamp(24px,38px,30px);line-height:1;color:${P_INK}`, 'N/A');
  const estUnit = text('span', `font-size:12.5px;color:${P_SUB}`, '');
  estBox.appendChild(estBig);
  estBox.appendChild(estUnit);
  right.appendChild(estBox);

  const rows = el('div', `display:flex;flex-direction:column;border-top:1px solid rgba(232,236,248,0.154)`);
  const rowCells = [];
  for (let i = 0; i < 6; i++) {
    const r = el('div', 'display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px solid rgba(232,236,248,0.099)');
    const k = text('span', `font-size:12.5px;color:${P_SUB}`, '');
    const val = text('span', `font-family:${SERIF};${NUM};font-size:15px;color:${P_INK};text-align:right`, 'N/A');
    r.appendChild(k);
    r.appendChild(val);
    rows.appendChild(r);
    rowCells.push({ k, v: val });
  }
  right.appendChild(rows);
  const bigShare = el('div', `border-left:2px solid ${BURNT};padding:1px 0 1px 10px;font-size:12.5px;color:${P_INK};line-height:1.45;display:none`);
  right.appendChild(bigShare);
  const basis = text('span', `margin-top:auto;padding-top:10px;border-top:1px solid ${P_HAIR};font-size:11.5px;color:${P_SUB};line-height:1.5`, '');
  right.appendChild(basis);

  cols.appendChild(left);
  cols.appendChild(right);
  card.appendChild(cols);

  /* ── when it unlocks ────────────────────────────────────────────────────── */
  const foot = el('div', `display:flex;flex-wrap:wrap;align-items:center;gap:8px 22px;padding:10px 18px;background:${P_PANEL};border-top:1px solid rgba(232,236,248,0.11)`);
  const whenBox = el('div', 'flex:0 1 auto;display:flex;flex-direction:column;gap:1px');
  whenBox.appendChild(pLabel('unlocks'));
  const whenLocal = text('span', `font-family:${SERIF};font-size:18px;line-height:1.2;color:${P_INK}`, '');
  const whenUtc = text('span', `font-size:12px;color:${P_SUB};${NUM}`, '');
  whenBox.appendChild(whenLocal);
  whenBox.appendChild(whenUtc);
  foot.appendChild(whenBox);
  const bar = el('div', 'flex:1 1 150px;min-width:0;display:flex;flex-direction:column;gap:5px');
  // The groove of the lock-length track, and the marker that rides it. Both
  // were dark on cream; both are light on dark now.
  const track = el('div', 'position:relative;height:3px;border-radius:2px;background:rgba(232,236,248,0.15)');
  track.appendChild(el('span', `position:absolute;left:0;top:-2px;width:7px;height:7px;border-radius:50%;background:${BURNT}`));
  track.appendChild(el('span', 'position:absolute;right:0;top:-2px;width:7px;height:7px;border-radius:50%;background:rgba(232,236,248,0.42)'));
  bar.appendChild(track);
  const spanRow = el('div', `display:flex;justify-content:space-between;gap:10px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${P_LAB}`);
  spanRow.appendChild(text('span', '', 'today'));
  const spanVal = text('span', '', '');
  spanRow.appendChild(spanVal);
  bar.appendChild(spanRow);
  foot.appendChild(bar);
  card.appendChild(foot);

  /* ── the button ─────────────────────────────────────────────────────────── */
  const cta = el('div', `padding:10px 18px 12px;border-top:1px solid ${P_HAIR};display:flex;flex-direction:column;gap:6px`);
  const lock = plate('', null, { kind: 'ink', wide: true, size: 15 });
  lock.addEventListener('click', () => {
    if (lock.disabled) return;
    if (!me || !me.address) { if (me && me.connect) me.connect(); return; }
    const amount = toBase(input.value, v.decimals);
    if (amount === null) return;
    ui.sheet = { kind: 'lock', amount, tokens: toTokens(amount, v.decimals), tierIndex, phase: 'review' };
    repaint();
  });
  cta.appendChild(lock);
  const approvalNote = text('span', `font-size:11.5px;color:${P_SUB};line-height:1.5`, '');
  cta.appendChild(approvalNote);
  card.appendChild(cta);

  /* ── the arithmetic, run on every keystroke ─────────────────────────────── */
  function onType() {
    const raw = input.value;
    if (me && me.setDraft) me.setDraft(raw);   // state only — never a repaint
    const amount = toBase(raw, v.decimals);
    const tokens = amount === null ? 0 : toTokens(amount, v.decimals);
    const notANumber = amount === null && raw.trim() !== '';
    const overBalance = v.balanceUnits !== null && amount !== null && amount > v.balanceUnits;
    const belowFloor = amount !== null && amount > 0n && amount < minBase;
    const e = estimate(v, tokens, tierIndex);
    const hasRate = e.perYear !== null && tokens > 0;

    balLine.textContent = v.balanceUnits === null
      ? (me && me.address ? 'Reading your balance…' : 'Connect to see your balance')
      : `You hold ${exact(toTokens(v.balanceUnits, v.decimals))} ${v.symbol}`;
    balLine.style.color = overBalance ? P_BAD : P_SUB;
    usdLine.textContent = tokens && v.price ? `≈ ${money(tokens * v.price)}` : '';
    errLine.textContent = notANumber ? 'That is not a number'
      : belowFloor ? `The contract's floor is ${exact(toTokens(minBase, v.decimals))} ${v.symbol}`
        : '';

    estBig.textContent = hasRate ? money(e.perWeek, 2) : 'N/A';
    estBig.style.color = hasRate ? P_INK : P_SUB;
    estUnit.textContent = hasRate ? `USDC per week, at ${boostLabel(e.tier ? e.tier.boostBps : 10_000)}`
      : v.potYear !== null ? 'Enter an amount to see the estimate'
        : 'A rate opens after two days of payments';

    const cells = [
      ['Per day', hasRate ? money(e.perDay, 2) : 'N/A', P_INK],
      [`Over the ${e.tier ? Math.round(e.tier.duration / 86_400) : 30}-day lock`, hasRate ? money(e.overLock, 2) : 'N/A', P_INK],
      ['Per year', hasRate ? money(e.perYear, 0) : 'N/A', P_INK],
      [`APR at ${boostLabel(e.tier ? e.tier.boostBps : 10_000)}`, e.apr === null ? 'N/A' : pct(e.apr), e.apr === null ? P_SUB : BURNT],
      ['Your weight', tokens ? compact(e.w) : 'N/A', P_INK],
      ['Share of the pool', tokens ? pct(e.share * 100, e.share < 0.01 ? 2 : 1) : 'N/A', P_INK],
    ];
    cells.forEach(([k, val, tone], i) => {
      rowCells[i].k.textContent = k;
      rowCells[i].v.textContent = val;
      rowCells[i].v.style.color = tone;
    });
    if (e.share > 0.05 && tokens) {
      bigShare.style.display = '';
      // An empty pool is its own sentence: "100% of the pool" without it reads
      // as a rate to expect, when it is a rate that falls the moment anyone
      // else locks a token.
      bigShare.textContent = v.weight > 0
        ? `You would be ${pct(e.share * 100)} of the pool. Your own stake lowers the rate you see.`
        : 'Nobody else is staked right now, so this is the whole pool. The rate falls as others lock.';
    } else {
      bigShare.style.display = 'none';
    }
    const priced = v.price
      ? `, with ${v.symbol} at ${money(v.price, 4)}${v.priceSource === 'pool' ? ' live from the pool' : ' set by hand'}`
      : '';
    basis.textContent = v.potYear !== null
      ? `At what the streams paid in over the last ${v.potDays} days${priced}. `
        + 'Rewards stream every second, claim any time.'
      : 'An estimate is only ever built from what was really paid in, over at least two days. '
        + 'The lock, the multiplier and the weight are exact.';

    perWeekCells.forEach((cell, i) => {
      const alt = tokens ? estimate(v, tokens, i) : null;
      cell.textContent = alt && alt.perWeek !== null ? `${money(alt.perWeek, 2)}/wk` : '';
    });

    whenLocal.textContent = localWhen(e.end);
    whenUtc.textContent = utcWhen(e.end);
    spanVal.textContent = `${e.lockDays.toFixed(1)} days`;

    // The button says exactly why it cannot be pressed, in the order the
    // contract would refuse it.
    let label = `lock ${tokens ? exact(tokens) : ''} ${v.symbol} for ${e.tier ? Math.round(e.tier.duration / 86_400) : 30} days`.replace(/\s+/g, ' ');
    let ok = true;
    if (v.paused) { label = 'New locks are paused'; ok = false; } else if (!me || !me.address) { label = 'Connect a wallet to lock'; } else if (me.busy) { label = 'Confirm in your wallet…'; ok = false; } else if (v.positions.length >= 32) { label = 'You hold the maximum 32 positions'; ok = false; } else if (notANumber) { label = 'That is not a number'; ok = false; } else if (!amount || amount <= 0n) { label = 'Enter an amount to lock'; ok = false; } else if (showMin && amount < minBase) { label = `Lock at least ${exact(toTokens(minBase, v.decimals))} ${v.symbol}`; ok = false; } else if (belowFloor) { label = 'That rounds to nothing'; ok = false; } else if (overBalance) { label = `Not enough ${v.symbol}`; ok = false; } else if (!v.live) { label = 'Not open yet'; ok = false; }
    lock.textContent = label;
    lock.disabled = !ok;
    lock.style.cursor = ok ? 'pointer' : 'not-allowed';
    lock.style.opacity = ok ? '1' : '0.45';

    // The first lock needs an approval before the contract can pull the
    // tokens, so two wallet prompts are expected rather than alarming.
    const needsApproval = amount !== null && amount > 0n && me && me.allowance !== null
      && me.allowance !== undefined && big(me.allowance) < amount;
    approvalNote.textContent = needsApproval
      ? 'Your wallet will ask twice the first time: once to let the contract take the tokens, once to lock them.'
      : '';
  }
  input.addEventListener('input', onType);
  onType();
  return card;
}

/* ── your stake ───────────────────────────────────────────────────────────── */

function kvRow(k, value, tone?) {
  const r = el('div', `display:flex;align-items:baseline;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid rgba(232,236,248,0.1)`);
  r.appendChild(text('span', `font-size:12.5px;color:${MUTED}`, k));
  r.appendChild(text('span', `font-family:${SERIF};${NUM};font-size:17px;color:${tone || INK};text-align:right`, value));
  return r;
}

function connectCard(me) {
  const box = el('div', `border:1px solid ${HAIR};border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:14px`);
  box.appendChild(text('span', EYEBROW, 'Your stake'));
  box.appendChild(text('span', `font-family:${SERIF};font-size:27px;line-height:1.12;color:${PAPER}`,
    'Connect to see what you can claim.'));
  box.appendChild(text('span', `font-size:13px;color:${MUTED};line-height:1.55`,
    'Your balance, your locks and your claimable USDC are read straight from the contract. '
    + 'Nobody but you can move your principal.'));
  const b = plate('Connect a wallet', () => me && me.connect && me.connect(), { kind: 'paper', wide: true, size: 14.5 });
  b.style.marginTop = '2px';
  box.appendChild(b);
  return box;
}

function claimCard(v, me) {
  const box = el('div', `border:1px solid ${HAIR};border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:13px`);
  box.appendChild(text('span', EYEBROW, 'Claimable now'));

  const earned = me.earned === null || me.earned === undefined ? null : big(me.earned);
  const line = el('div', 'display:flex;align-items:baseline;gap:2px;flex-wrap:wrap');
  const head = text('span', `font-family:${SERIF};${NUM};font-size:clamp(32px,56px,44px);line-height:1;color:${earned ? BRASS : MUTED}`, 'N/A');
  const tail = text('span', `font-family:${SERIF};${NUM};font-size:20px;line-height:1;color:${MUTED}`, '');
  line.appendChild(head);
  line.appendChild(tail);
  line.appendChild(text('span', `font-size:10px;letter-spacing:.2em;color:${MUTED};margin-left:8px`, 'USDC'));
  box.appendChild(line);

  /* The figure ticks between reads, at the contract's OWN rate: this wallet's
     live weight over the pool's, times the per-second reward rate, and it
     stops dead at `periodFinish` because the contract does. It is the same
     arithmetic `earned()` runs, not a guess at it — and the button below
     always quotes the last READ figure, so nothing promises a penny more than
     the chain will actually pay. */
  const st = v.st;
  const perSecond = st && earned !== null && v.weightUnits > 0n && v.myWeightUnits > 0n
    ? (Number(big(st.rewardRate)) / 1e18) * ratio(v.myWeightUnits, v.weightUnits)
    : 0;
  const finish = st ? Number(st.periodFinish) * 1000 : 0;
  const base = earned === null ? null : usd(earned);
  const readAt = Date.now();
  const grownAt = (now) => {
    const until = finish ? Math.min(now, finish) : now;
    return base + Math.max(0, (until - readAt) / 1000) * (perSecond / 1e6);
  };

  const claimBtn = plate('', () => { ui.sheet = { kind: 'claim', phase: 'review' }; repaint(); },
    { kind: earned && earned > 0n ? 'paper' : 'outline', wide: true, size: 14.5 });

  const paint = (now) => {
    if (base === null) { head.textContent = 'N/A'; tail.textContent = ''; return; }
    const grown = grownAt(now);
    head.textContent = money(Math.floor(grown * 100) / 100, 2);
    tail.textContent = String(Math.floor((grown * 1e6) % 1e4)).padStart(4, '0');
    // The figure above ticks, so the button has to as well — a live $0.03
    // beside a disabled "nothing to claim yet" is the page arguing with
    // itself. A cent is the floor: below that the label would read $0.00 and
    // the gas would cost more than the claim.
    const ready = grown >= 0.01 && !me.busy;
    claimBtn.disabled = !ready;
    claimBtn.style.cursor = ready ? 'pointer' : 'not-allowed';
    claimBtn.style.opacity = ready ? '1' : '0.45';
    claimBtn.textContent = me.busy ? 'working…'
      : grown < 0.01 ? 'Nothing to claim yet'
        : base > 0 ? `claim ${money(base)} USDC` : 'Claim what you have earned';
  };
  paint(readAt);
  if (base !== null && perSecond > 0) tickers.push(paint);
  box.appendChild(claimBtn);

  const rows = el('div', 'display:flex;flex-direction:column;border-top:1px solid rgba(232,236,248,0.1)');
  const totalTokens = v.positions.reduce((a, p) => a + p.tokens, 0);
  const nextUp = v.positions.filter((p) => p.live).sort((a, b) => a.end - b.end)[0] || null;
  rows.appendChild(kvRow('Total locked', v.positions.length ? `${compact(totalTokens)} ${v.symbol}` : 'N/A'));
  rows.appendChild(kvRow('Earning weight',
    v.myWeightUnits > 0n
      ? `${compact(toTokens(v.myWeightUnits, v.decimals))} · ${pct(ratio(v.myWeightUnits, v.weightUnits) * 100, 2)} of pool`
      : 'N/A',
    v.myWeightUnits > 0n ? BRASS : MUTED));
  const nextCell = kvRow('Next unlock', nextUp ? dur(nextUp.end - v.chainNow) : v.positions.length ? 'All ended' : 'N/A');
  rows.appendChild(nextCell);
  if (nextUp) {
    const node = nextCell.lastChild;
    tickers.push((now) => { node.textContent = dur(nextUp.end - now); });
  }
  box.appendChild(rows);

  if (v.ended.length) {
    const nudge = el('div', `border-left:2px solid ${CLARET};padding:2px 0 2px 11px;display:flex;flex-direction:column;gap:4px;align-items:flex-start`);
    nudge.appendChild(text('span', `font-size:13px;color:${INK};line-height:1.45`,
      `${v.ended.length} lock${v.ended.length === 1 ? ' has' : 's have'} ended and stopped earning.`));
    const a = text('a', `font-size:12.5px;color:${BRASS};text-decoration:none;border-bottom:1px solid rgba(139,92,246,0.35);cursor:pointer`,
      'See your positions');
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById('stk-positions');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    nudge.appendChild(a);
    box.appendChild(nudge);
  }
  if (me.error) {
    box.appendChild(text('div',
      `padding:11px 14px;border:1px solid rgba(148,163,196,0.4);border-radius:8px;background:rgba(148,163,196,0.08);font-size:13px;line-height:1.5;color:${PAPER}`,
      me.error));
  }
  return box;
}

/** Where the money comes from — and the arithmetic, so nobody has to take it
 *  on faith. The rakeback ladder is published by the same endpoint, so the
 *  effective rate is computed here rather than asserted. */
function sourcesCard(v) {
  const box = el('div', `flex:1 1 auto;border:1px solid ${HAIR};border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:12px`);
  box.appendChild(text('span', EYEBROW, 'Where rewards come from'));
  const sweepLine = text('span', `font-size:13px;color:${MUTED};line-height:1.55`, '');
  const setSweepLine = (now) => {
    const place = zoneLabel(v.sweepZone);
    sweepLine.textContent = 'USDC is paid to stakers out of what the tables and the token actually earn. '
      + `Rake is swept once a day, at midnight ${place}`
      + (v.sweepAt ? `, next in ${dur(v.sweepAt - now)}` : '')
      + '; creator fees are split as they are collected.';
  };
  setSweepLine(Date.now());
  if (v.sweepAt) tickers.push(setSweepLine);
  box.appendChild(sweepLine);

  const rakeBps = (v.router && v.router.stakersBps) || 1_200;
  const feeBps = (v.economics && v.economics.creatorFeeStakersBps) || 2_000;
  const rows = el('div', 'display:flex;flex-direction:column;border-top:1px solid rgba(232,236,248,0.1)');
  const stream = (name, note, share) => {
    const r = el('div', `display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid ${HAIR_SOFT}`);
    const l = el('span', 'display:flex;flex-direction:column;gap:2px;min-width:0');
    l.appendChild(text('span', `font-size:14px;color:${INK}`, name));
    l.appendChild(text('span', `font-size:12px;color:${MUTED}`, note));
    const rr = el('span', 'display:flex;align-items:baseline;gap:7px;flex:none');
    rr.appendChild(text('span', `font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${MUTED}`, 'Stakers cut'));
    rr.appendChild(text('span', `font-family:${SERIF};${NUM};font-size:17px;color:${BRASS}`, share));
    r.appendChild(l);
    r.appendChild(rr);
    return r;
  };
  rows.appendChild(stream('Net rake', 'The room’s take, after rakeback', `${(rakeBps / 100).toFixed(0)}%`));
  rows.appendChild(stream('Creator fees', 'The token’s own trading fee', `${(feeBps / 100).toFixed(0)}%`));
  box.appendChild(rows);

  // Rakeback comes out before the split, so the stakers' cut of GROSS rake is
  // a range, not a number — and it is a range that shrinks as regulars climb
  // the ladder. Saying "12%" without this is the page's easiest lie to tell.
  const rb = (v.economics && v.economics.rakebackBps) || [];
  if (rb.length) {
    const lowest = Number(rb[0]);
    const highest = Number(rb[rb.length - 1]);
    const eff = (b) => (rakeBps / 100) * (1 - b / 10_000);
    box.appendChild(text('span', `font-size:11.5px;color:${MUTED};line-height:1.55`,
      `Rakeback is paid out first, so ${(rakeBps / 100).toFixed(0)}% of what is left works out at `
      + `${eff(highest).toFixed(1)}%–${eff(lowest).toFixed(1)}% of gross rake, depending on how much rakeback the tables are paying.`));
  }
  if (v.router && !v.router.destinationOk) {
    box.appendChild(text('span', `font-size:11.5px;color:${LOSS};line-height:1.55`,
      'The vault’s rake is not currently pointed at the router, so sweeps are paused. Rewards already paid are unaffected.'));
  }
  return box;
}

function positionsSection(v, me) {
  const wrap = el('div', 'display:flex;flex-direction:column;gap:11px;padding-top:clamp(6px,15px,12px)');
  wrap.id = 'stk-positions';
  const head = el('div', 'display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap');
  head.appendChild(text('span', EYEBROW, 'Your positions'));
  head.appendChild(text('span', `font-size:12.5px;color:${MUTED}`, 'One claim pays everything you have earned across all of them'));
  wrap.appendChild(head);

  for (const p of v.positions) {
    const row = el('div', `border:1px solid ${p.live ? HAIR : 'rgba(148,163,196,0.42)'};border-radius:8px;padding:15px 18px;`
      + 'display:flex;flex-wrap:wrap;gap:16px;align-items:center;transition:border-color .18s ease');
    row.className = 'row-a';

    const amt = el('div', 'flex:1 1 152px;min-width:0;display:flex;flex-direction:column;gap:3px');
    amt.appendChild(text('span', `font-family:${SERIF};${NUM};font-size:24px;line-height:1.05;color:${PAPER}`,
      `${exact(p.tokens)} ${v.symbol}`));
    amt.appendChild(text('span', `font-size:12.5px;color:${MUTED}`,
      p.tier ? `${lockAdj(p.tier.duration)} lock · ${boostLabel(p.tier.boostBps)}` : `tier ${p.tierIndex}`));
    row.appendChild(amt);

    const mid = el('div', 'flex:1 1 200px;min-width:0;display:flex;flex-direction:column;gap:7px');
    const statusRow = el('div', 'display:flex;align-items:center;gap:8px');
    statusRow.appendChild(el('span', `width:6px;height:6px;border-radius:50%;flex:none;background:${p.live ? BRASS : CLARET}`));
    const status = text('span', `font-size:13px;color:${p.live ? INK : LOSS}`, '');
    statusRow.appendChild(status);
    mid.appendChild(statusRow);
    const track = el('div', `position:relative;height:3px;border-radius:2px;background:${HAIR};overflow:hidden`);
    track.appendChild(el('span', `position:absolute;left:0;top:0;bottom:0;width:${((p.live ? p.progress : 1) * 100).toFixed(1)}%;background:${p.live ? BRASS : CLARET}`));
    mid.appendChild(track);
    const when = text('span', `font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:${MUTED};${NUM}`, '');
    mid.appendChild(when);
    const paintRow = (now) => {
      status.textContent = p.live ? 'locked, earning' : `ended ${dur(now - p.end)} ago · not earning`;
      when.textContent = p.live ? `Unlocks in ${dur(p.end - now)} · ${utcWhen(p.end)}` : `unlocked ${utcWhen(p.end)}`;
    };
    paintRow(v.chainNow);
    tickers.push(paintRow);
    row.appendChild(mid);

    const shareBox = el('div', 'flex:0 1 112px;min-width:0;display:flex;flex-direction:column;gap:3px');
    shareBox.appendChild(text('span', `font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${MUTED}`, 'Share of pool'));
    shareBox.appendChild(text('span', `font-family:${SERIF};${NUM};font-size:18px;color:${p.live ? BRASS : MUTED}`,
      p.share === null ? 'N/A' : pct(p.share, 2)));
    row.appendChild(shareBox);

    const acts = el('div', 'flex:0 0 auto;display:flex;gap:8px;flex-wrap:wrap');
    // `withdraw` is never pausable; `relock` is. So a paused contract still
    // offers the exit and drops the roll-over rather than reverting it.
    if (!p.live) {
      acts.appendChild(plate('withdraw', () => { ui.sheet = { kind: 'withdraw', pos: p, phase: 'review' }; repaint(); },
        { kind: 'outline', size: 13.5, disabled: !!me.busy }));
    }
    if (!v.paused && relockTiers(v, p).length) {
      const label = p.live ? 'Extend' : 'Relock';
      acts.appendChild(plate(label, () => {
        ui.sheet = { kind: p.live ? 'extend' : 'relock', pos: p, pickTier: null, phase: 'review' };
        repaint();
      }, { kind: 'outline', size: 13.5, disabled: !!me.busy }));
    }
    row.appendChild(acts);
    wrap.appendChild(row);
  }
  return wrap;
}

/* ── charts ───────────────────────────────────────────────────────────────
   Hand-rolled SVG. A chart library would be the largest dependency on the site
   for two charts, and both of these are a polyline and a set of rectangles.
   Each chart owns its hover: a crosshair that repainted the page would rebuild
   the other chart, the form and every row sixty times a second. */

function niceDomain(values, log) {
  const v = values.filter((x) => x !== null && isFinite(x));
  if (!v.length) return { lo: 0, hi: 1, log: false };
  let hi = Math.max(...v);
  const lo = Math.min(...v);
  if (log) return { lo: Math.max(0.5, lo * 0.7), hi: hi * 1.3, log: true };
  const step = Math.pow(10, Math.floor(Math.log10(hi || 1))) / 4;
  hi = Math.ceil((hi * 1.06) / (step || 1)) * step || 1;
  return { lo: 0, hi, log: false };
}

/**
 * One chart. `spec` is rebuilt on every repaint; the node it returns redraws
 * itself when its box changes width.
 */
function chart(spec) {
  const wrap = el('div', 'position:relative;touch-action:none;outline-offset:4px');
  wrap.tabIndex = 0;
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', spec.aria || '');

  const tip = el('div', `position:absolute;top:0;pointer-events:none;background:${CARD};border:1px solid rgba(232,236,248,0.2);`
    + 'border-radius:5px;padding:7px 11px;display:none;flex-direction:column;gap:2px;box-shadow:0 8px 22px rgba(0,0,0,0.625);min-width:116px;z-index:2');
  const tipDay = text('span', `font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${MUTED}`, '');
  const tipBig = text('span', `font-family:${SERIF};${NUM};font-size:19px;color:${PAPER}`, '');
  const tipSub = text('span', `font-size:11.5px;color:${MUTED};${NUM}`, '');
  add(tip, tipDay, tipBig, tipSub);

  let hover = null;
  let geo = null;

  function draw() {
    const W = Math.max(240, Math.round(wrap.clientWidth || 520));
    const H = 188;
    const g = { x0: 44, x1: Math.max(104, W - 8), y0: 8, y1: 164 };
    geo = g;
    const n = spec.points.length;
    const dom = niceDomain(spec.points.map((p) => p.v), spec.log);
    const y = (val) => {
      let t;
      if (dom.log) {
        const a = Math.log10(dom.lo);
        const b = Math.log10(dom.hi);
        t = (Math.log10(Math.max(dom.lo, val)) - a) / (b - a || 1);
      } else t = (val - dom.lo) / (dom.hi - dom.lo || 1);
      return g.y1 - Math.max(0, Math.min(1, t)) * (g.y1 - g.y0);
    };
    const xAt = (i) => g.x0 + (n <= 1 ? 0 : i / (n - 1)) * (g.x1 - g.x0);

    const svg = svgEl('svg', { width: '100%', height: H, viewBox: `0 0 ${W} ${H}`, style: 'display:block' });

    for (let i = 0; i <= 3; i++) {
      const val = dom.log
        ? Math.pow(10, Math.log10(dom.lo) + (Math.log10(dom.hi) - Math.log10(dom.lo)) * (i / 3))
        : dom.lo + ((dom.hi - dom.lo) * i) / 3;
      const yy = y(val);
      svg.appendChild(svgEl('line', { x1: g.x0, y1: yy.toFixed(1), x2: g.x1, y2: yy.toFixed(1), stroke: 'rgba(232,236,248,0.07)', 'stroke-width': 1 }));
      // The top gridline sits at y0, and a label four pixels above it would be
      // cut off by the edge of the viewBox.
      const t = svgEl('text', { x: 0, y: Math.max(10, yy - 4).toFixed(1), fill: MUTED, 'font-family': UI, 'font-size': 9.5 });
      t.textContent = spec.axis(val);
      svg.appendChild(t);
    }

    // A run of days with no price is said, not skipped: an empty stretch of a
    // yield chart means "we could not price it", never "it paid nothing".
    const firstPriced = spec.points.findIndex((p) => p.v !== null);
    if (spec.markUnpriced && firstPriced > 0) {
      const w = Math.max(6, xAt(firstPriced) - g.x0);
      svg.appendChild(svgEl('rect', { x: g.x0, y: 6, width: w.toFixed(1), height: 158, fill: 'rgba(148,163,196,0.07)' }));
      const t = svgEl('text', { x: g.x0 + 3, y: 18, fill: MUTED, 'font-family': UI, 'font-size': 8.5, 'letter-spacing': '.1em' });
      t.textContent = 'NO PRICE YET';
      svg.appendChild(t);
    }

    if (spec.kind === 'bars') {
      const bw = Math.max(1, (g.x1 - g.x0) / Math.max(1, n) - 1.4);
      spec.points.forEach((p, i) => {
        if (p.v === null) return;
        const yy = y(p.v);
        svg.appendChild(svgEl('rect', {
          x: (xAt(i) - bw / 2).toFixed(1), y: yy.toFixed(1), width: bw.toFixed(1),
          height: Math.max(0.5, g.y1 - yy).toFixed(1), fill: spec.color, opacity: '.5',
        }));
      });
    } else {
      // Nulls are carried forward so the line does not dive to the axis on a
      // day whose price is unknown; the band above says which days those were.
      let carried = null;
      const pts = spec.points.map((p) => { if (p.v !== null) carried = p.v; return carried; });
      const firstReal = pts.find((x) => x !== null);
      const line = pts.map((val, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)} ${y(val === null ? (firstReal ?? 0) : val).toFixed(1)}`).join('');
      if (spec.area) {
        const gid = `stk-${Math.random().toString(36).slice(2, 8)}`;
        const defs = svgEl('defs');
        const grad = svgEl('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
        grad.appendChild(svgEl('stop', { offset: '0', 'stop-color': spec.color, 'stop-opacity': '.24' }));
        grad.appendChild(svgEl('stop', { offset: '1', 'stop-color': spec.color, 'stop-opacity': '0' }));
        defs.appendChild(grad);
        svg.appendChild(defs);
        svg.appendChild(svgEl('path', { d: `${line}L${g.x1.toFixed(1)} ${g.y1}L${g.x0.toFixed(1)} ${g.y1}Z`, fill: `url(#${gid})` }));
      }
      svg.appendChild(svgEl('path', {
        d: line, fill: 'none', stroke: spec.color, 'stroke-width': 1.6, 'stroke-linejoin': 'round',
        'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1',
        style: 'animation:dash 1000ms cubic-bezier(.33,0,.15,1) forwards',
      }));
    }

    if (hover !== null && spec.points[hover]) {
      const hx = xAt(hover);
      const hv = spec.points[hover].v;
      svg.appendChild(svgEl('line', { x1: hx.toFixed(1), y1: 6, x2: hx.toFixed(1), y2: 164, stroke: 'rgba(232,236,248,0.32)', 'stroke-width': 1, 'stroke-dasharray': '2 3' }));
      if (hv !== null) {
        svg.appendChild(svgEl('circle', { cx: hx.toFixed(1), cy: y(hv).toFixed(1), r: 3.6, fill: spec.color, stroke: CARD, 'stroke-width': 1.6 }));
      }
    }

    const at = [0, Math.floor((n - 1) / 2), n - 1];
    const anchors = ['start', 'middle', 'end'];
    at.forEach((i, j) => {
      if (!spec.points[i]) return;
      const t = svgEl('text', { x: xAt(i).toFixed(1), y: 183, fill: MUTED, 'font-family': UI, 'font-size': 9.5, 'text-anchor': anchors[j] });
      t.textContent = utcDayLabel(spec.points[i].ms);
      svg.appendChild(t);
    });

    wrap.replaceChildren(svg, tip);
    if (spec.empty) {
      const over = el('div', `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(10,13,22,0.78)`);
      over.appendChild(text('span', `font-size:13px;color:${MUTED};text-align:center;max-width:18em;line-height:1.5`, spec.empty));
      wrap.appendChild(over);
    }
    if (hover !== null && spec.points[hover]) {
      const p = spec.points[hover];
      tip.style.display = 'flex';
      tip.style.left = `${Math.max(0, Math.min(W - 130, xAt(hover) - 60)).toFixed(0)}px`;
      tipDay.textContent = utcDayLabel(p.ms);
      tipBig.textContent = spec.tip(p);
      tipSub.textContent = spec.tipSub(p);
    } else {
      tip.style.display = 'none';
    }
  }

  const move = (e) => {
    if (!geo || !spec.points.length) return;
    const r = wrap.getBoundingClientRect();
    const u = (e.clientX - r.left - geo.x0) / Math.max(1, geo.x1 - geo.x0);
    const i = Math.max(0, Math.min(spec.points.length - 1, Math.round(u * (spec.points.length - 1))));
    if (i !== hover) { hover = i; draw(); }
  };
  wrap.addEventListener('pointermove', move);
  wrap.addEventListener('pointerdown', move);
  wrap.addEventListener('pointerleave', () => { if (hover !== null) { hover = null; draw(); } });
  wrap.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const cur = hover === null ? spec.points.length - 1 : hover;
    hover = Math.max(0, Math.min(spec.points.length - 1, cur + (e.key === 'ArrowRight' ? 1 : -1)));
    draw();
  });

  draw();
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => draw());
    ro.observe(wrap);
    observers.push(ro);
  }
  return wrap;
}

function chartCard({ eyebrow, head, change, changeTone, chips, node, footChips, foot }) {
  const box = el('div', `flex:1 1 430px;min-width:0;border:1px solid ${HAIR};border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:13px`);
  const top = el('div', 'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap');
  const l = el('div', 'display:flex;flex-direction:column;gap:5px;min-width:0');
  l.appendChild(text('span', EYEBROW, eyebrow));
  const hl = el('div', 'display:flex;align-items:baseline;gap:10px;flex-wrap:wrap');
  hl.appendChild(text('span', `font-family:${SERIF};${NUM};font-size:clamp(27px,44px,34px);line-height:1;color:${PAPER}`, head));
  if (change) hl.appendChild(text('span', `font-size:13px;color:${changeTone};${NUM}`, change));
  l.appendChild(hl);
  top.appendChild(l);
  if (chips && chips.length) {
    const c = el('div', 'display:flex;gap:5px;flex:none;flex-wrap:wrap;justify-content:flex-end');
    chips.forEach((x) => c.appendChild(x));
    top.appendChild(c);
  }
  box.appendChild(top);
  box.appendChild(node);
  const bottom = el('div', 'display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap');
  const fc = el('div', 'display:flex;gap:5px;flex-wrap:wrap');
  (footChips || []).forEach((x) => fc.appendChild(x));
  bottom.appendChild(fc);
  bottom.appendChild(text('span', `font-size:11.5px;color:${MUTED}`, foot));
  box.appendChild(bottom);
  return box;
}

function chartsRow(v) {
  const wrap = el('div', 'display:flex;flex-wrap:wrap;gap:clamp(12px,21px,18px);padding-top:clamp(6px,15px,12px)');
  const all = v.days;
  const days = all.slice(Math.max(0, all.length - ui.range));
  // A dollar TVL needs at least one priced day. The preference is left alone
  // when there is none: a page that loaded a minute before the first price
  // must not silently keep the fallback for the rest of the session.
  const anyPrice = all.some((d) => d.price !== null);
  const isUsd = ui.tvlUnit === 'usd' && anyPrice;
  const empty = days.length <= 1 ? 'One point a day. Back tomorrow.' : '';

  const rangeChips = ([[7, '7d'], [30, '30d'], [90, '90d']] as [number, string][]).map(([r, label]) =>
    chip(label, ui.range === r, () => { ui.range = r; repaint(); }));

  /* ── what is locked ─────────────────────────────────────────────────────── */
  const tvlPoints = days.map((d) => ({ ms: d.ms, v: isUsd ? d.tvl : d.locked, day: d }));
  const firstTvl = days.find((d) => (isUsd ? d.tvl : d.locked) !== null);
  const lastTvl = days.length ? days[days.length - 1] : null;
  const tvlNow = lastTvl ? (isUsd ? lastTvl.tvl : lastTvl.locked) : null;
  const tvlFrom = firstTvl ? (isUsd ? firstTvl.tvl : firstTvl.locked) : null;
  const tvlDelta = tvlNow !== null && tvlFrom ? (tvlNow / tvlFrom - 1) * 100 : null;
  const unitChips = anyPrice
    ? [['usd', '$'], ['tokens', v.symbol]].map(([u, label]) => chip(label, ui.tvlUnit === u, () => { ui.tvlUnit = u; repaint(); }))
    : [];

  wrap.appendChild(chartCard({
    eyebrow: 'Total value locked',
    head: isUsd ? moneyA(v.tvlUsd) : v.locked === null ? 'N/A' : `${compact(v.locked)} ${v.symbol}`,
    change: tvlDelta === null ? '' : `${tvlDelta >= 0 ? '+' : ''}${pct(tvlDelta)} over ${ui.range}d`,
    changeTone: tvlDelta === null ? MUTED : tvlDelta >= 0 ? WIN : LOSS,
    chips: unitChips,
    node: chart({
      points: tvlPoints, kind: 'line', area: true, color: BRASS, empty,
      axis: (val) => (isUsd ? `$${compact(val)}` : compact(val)),
      tip: (p) => (p.v === null ? 'No price that day' : isUsd ? moneyA(p.v) : `${compact(p.v)} ${v.symbol}`),
      tipSub: (p) => (p.day.apr1 === null ? 'No rate that day' : `${pct(p.day.apr1)} APR at 1×`),
      aria: `Total value locked over the last ${ui.range} days.`,
    }),
    footChips: rangeChips,
    foot: isUsd ? `${v.symbol} locked × that day’s price` : 'Tokens locked, price aside',
  }));

  /* ── what it paid ───────────────────────────────────────────────────────── */
  const aprTierIndex = ui.aprTier === null ? Math.max(0, v.tiers.length - 1) : ui.aprTier;
  const mult = v.tiers[aprTierIndex] ? v.tiers[aprTierIndex].boostBps / 10_000 : 1;
  const paidMode = ui.aprMode === 'paid';
  const aprPoints = days.map((d) => ({
    ms: d.ms,
    v: paidMode ? d.paid : d.apr1 === null ? null : d.apr1 * mult,
    day: d,
  }));
  const lastApr = [...days].reverse().find((d) => d.apr1 !== null) || null;
  const firstApr = days.find((d) => d.apr1 !== null) || null;
  const aprNow = lastApr ? lastApr.apr1 * mult : null;
  const aprDelta = aprNow !== null && firstApr ? aprNow - firstApr.apr1 * mult : null;
  const paidLast = lastTvl ? lastTvl.paid : null;
  const paidFirst = days.find((d) => d.paid !== null) || null;

  // The axis decides its decimals once, from the top of the scale.
  const aprTop = Math.max(0, ...aprPoints.map((p) => (p.v === null ? 0 : p.v)));
  const tierChips = v.tiers.map((t, i) =>
    chip(boostLabel(t.boostBps), i === aprTierIndex, () => { ui.aprTier = i; repaint(); }));
  const modeChips = [['apr', '% apr'], ['paid', 'usdg/day']]
    .map(([m, label]) => chip(label, ui.aprMode === m, () => { ui.aprMode = m; repaint(); }))
    .concat(paidMode ? [] : [chip('log', ui.log, () => { ui.log = !ui.log; repaint(); })]);

  wrap.appendChild(chartCard({
    eyebrow: paidMode ? 'USDC paid in per day · latest' : `APR at ${boostLabel(v.tiers[aprTierIndex] ? v.tiers[aprTierIndex].boostBps : 10_000)} · latest day`,
    head: paidMode ? money(paidLast, 0) : aprNow === null ? 'N/A' : pct(aprNow),
    change: paidMode
      ? (paidFirst && paidLast !== null ? `${paidLast - paidFirst.paid >= 0 ? '+' : ''}${money(paidLast - paidFirst.paid, 0)} over ${ui.range}d` : '')
      : aprDelta === null ? '' : `${aprDelta >= 0 ? '+' : ''}${pct(aprDelta)} over ${ui.range}d`,
    changeTone: paidMode
      ? (paidFirst && paidLast !== null && paidLast >= paidFirst.paid ? WIN : LOSS)
      : aprDelta === null ? MUTED : aprDelta >= 0 ? WIN : LOSS,
    chips: paidMode ? [] : tierChips,
    node: chart({
      points: aprPoints, kind: paidMode ? 'bars' : 'line', area: false, log: !paidMode && ui.log,
      color: paidMode ? BRASS : WIN, empty, markUnpriced: !paidMode,
      axis: (val) => (paidMode ? `$${compact(val)}` : `${num(val, aprTop < 8 ? 1 : 0)}%`),
      tip: (p) => (p.v === null ? 'No price that day' : paidMode ? money(p.v, 2) : pct(p.v)),
      tipSub: (p) => (p.day.tvl === null ? 'No price that day' : `${moneyA(p.day.tvl)} locked`),
      aria: paidMode ? `USDC paid in per day over the last ${ui.range} days.`
        : `APR at ${boostLabel(v.tiers[aprTierIndex] ? v.tiers[aprTierIndex].boostBps : 10_000)} over the last ${ui.range} days.`,
    }),
    footChips: modeChips,
    // Said precisely: this is money PAID INTO the pool that day, which is what
    // the contract then streams out over the following week.
    foot: paidMode ? 'What was paid into the pool that day' : 'What was paid in that day, annualised at that day’s price',
  }));
  return wrap;
}

/* ── buyback and burn ─────────────────────────────────────────────────────
   Receipts, not claims. Every day's sweep is shown against what became of
   it, and every clip carries its two transactions — the buy and the burn —
   linked to the chain, so "we burnt X" is something to click, not to trust. */

const txLink = (explorer, hash, label) => {
  if (!hash) return text('span', `color:${MUTED}`, 'N/A');
  if (!explorer) return text('span', `font-size:11.5px;color:${MUTED};${NUM}`, short(hash));
  const a = text('a', `font-size:11.5px;color:${BRASS};text-decoration:none;border-bottom:1px solid rgba(139,92,246,0.3);${NUM}`, label);
  a.href = `${explorer.replace(/\/$/, '')}/tx/${hash}`;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
};

/**
 * The same offer for a contract or wallet address: `label 0xab…cd`, linked to
 * the explorer where there is one. Without an explorer it is the plain text it
 * has always been — never a link that goes nowhere.
 */
const addrLink = (explorer, address, label) => {
  const body = `${label} ${short(address)}`;
  if (!address) return null;
  if (!explorer) return text('span', `font-size:11.5px;color:${MUTED};${NUM}`, body);
  const a = text('a', `font-size:11.5px;color:${MUTED};text-decoration:none;`
    + `border-bottom:1px solid rgba(139,92,246,0.3);${NUM}`, body);
  a.href = `${explorer.replace(/\/$/, '')}/address/${address}`;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
};

/**
 * What the last action actually did, once its sheet has closed. The app hands
 * this over as `{ label, explorer }` (see `stakingAct`) and it survives until
 * the next action starts — so "locked" is something to click, not to trust.
 */
function receiptStrip(mine) {
  const r = mine.receipt;
  if (!r || !r.explorer) return null;
  const wrap = el('div', `display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:11px 18px;`
    + `border:1px solid rgba(139,92,246,0.32);border-radius:8px;background:rgba(139,92,246,0.05)`);
  wrap.appendChild(text('span', `font-size:13.5px;color:${PAPER}`, r.label));
  const a = text('a', `font-size:12.5px;color:${BRASS};text-decoration:none;`
    + 'border-bottom:1px solid rgba(139,92,246,0.35)', 'Read the transaction \u2197');
  a.href = r.explorer;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  wrap.appendChild(a);
  return wrap;
}

function buybackSection(v, d) {
  const bb = d.buyback || null;
  const box = el('div', `border:1px solid ${HAIR};border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:14px`);
  const head = el('div', 'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap');
  const left = el('div', 'display:flex;flex-direction:column;gap:5px;min-width:0');
  left.appendChild(text('span', EYEBROW, 'Buyback & burn'));
  const burntTokens = bb ? toTokens(bb.totals.burnt, v.decimals) : null;
  const line = el('div', 'display:flex;align-items:baseline;gap:10px;flex-wrap:wrap');
  line.appendChild(text('span', `font-family:${SERIF};${NUM};font-size:clamp(27px,44px,34px);line-height:1;color:${PAPER}`,
    burntTokens === null ? 'N/A' : `${compact(burntTokens)} ${v.symbol}`));
  line.appendChild(text('span', `font-size:13px;color:${MUTED}`, 'burnt'));
  left.appendChild(line);
  left.appendChild(text('span', `font-size:12.5px;color:${MUTED}`,
    !bb ? 'Nothing burnt yet'
      : [
        `${money(usd(bb.totals.spent), 0)} spent across ${bb.totals.runs} day${bb.totals.runs === 1 ? '' : 's'}`,
        // Early burns are a sliver of supply, and "0.0%" would read as nothing.
        v.supply && burntTokens ? `${pct((burntTokens / v.supply) * 100, (burntTokens / v.supply) * 100 < 1 ? 3 : 1)} of supply` : null,
      ].filter(Boolean).join(' · ')));
  head.appendChild(left);
  if (bb && bb.nextRun) {
    const nextBox = el('div', 'display:flex;flex-direction:column;gap:3px;align-items:flex-end');
    nextBox.appendChild(text('span', `font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${MUTED}`, 'Next buyback'));
    const clockNode = text('span', `font-family:${SERIF};${NUM};font-size:20px;color:${BRASS}`, clock(bb.nextRun - Date.now()));
    tickers.push((now) => { clockNode.textContent = clock(bb.nextRun - now); });
    nextBox.appendChild(clockNode);
    head.appendChild(nextBox);
  }
  box.appendChild(head);

  box.appendChild(text('span', `font-size:13px;color:${MUTED};line-height:1.55`,
    `10% of every creator fee is set aside for this. Once a day, at midnight New York, all of it, every dollar that `
    + `arrived that day, is spent on ${v.symbol} at market in ${bb ? bb.window.clips : 15} buys spread over `
    + `${bb ? bb.window.minutes : 15} minutes, and every token bought is burnt as it lands.`));
  const how = text('a', `align-self:flex-start;font-size:12.5px;color:${BRASS};text-decoration:none;border-bottom:1px solid rgba(139,92,246,0.3)`,
    'How the buyback works ↗');
  how.href = '/docs/buyback-and-burn';
  box.appendChild(how);

  if (!bb || !bb.days.length) return box;

  const list = el('div', 'display:flex;flex-direction:column;border-top:1px solid rgba(232,236,248,0.1)');
  for (const day of bb.days.slice(0, 7)) {
    const row = el('div', `display:flex;flex-direction:column;gap:6px;padding:10px 0;border-bottom:1px solid ${HAIR_SOFT}`);
    const top = el('div', 'display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap');
    const dayMs = Date.parse(`${day.day}T12:00:00Z`);
    top.appendChild(text('span', `font-size:13.5px;color:${INK}`, utcDayLabel(dayMs)));
    const spent = usd(day.spent);
    const snap = usd(day.snapshot);
    const all = big(day.spent) === big(day.snapshot);
    top.appendChild(text('span', `font-size:12.5px;color:${all ? MUTED : LOSS};${NUM}`,
      `${money(spent)} of ${money(snap)} spent${all ? '' : ' · the rest carried'} · `
      + `${compact(toTokens(day.burnt, v.decimals))} ${v.symbol} burnt`));
    row.appendChild(top);
    if (day.clips && day.clips.length) {
      const toggle = text('button', `align-self:flex-start;font-size:11.5px;color:${MUTED};background:transparent;border:0;padding:0;cursor:pointer`,
        `${day.clips.length} buys, each with its burn ↓`);
      const detail = el('div', 'display:none;flex-direction:column;gap:4px;padding:4px 0 2px');
      for (const c of day.clips) {
        const r = el('div', `display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;font-size:11.5px;color:${MUTED};${NUM}`);
        r.appendChild(text('span', `min-width:18px;color:${MUTED}`, String(c.n + 1)));
        r.appendChild(text('span', `min-width:64px;color:${INK}`, money(usd(c.usdgIn))));
        r.appendChild(text('span', 'min-width:110px', c.received ? `→ ${compact(toTokens(c.received, v.decimals))} ${v.symbol}` : c.error ? 'Failed, absorbed' : 'N/A'));
        r.appendChild(txLink(bb.explorer, c.buyTx, 'buy'));
        r.appendChild(txLink(bb.explorer, c.burnTx, 'burn'));
        detail.appendChild(r);
      }
      toggle.addEventListener('click', () => {
        const open = detail.style.display !== 'none';
        detail.style.display = open ? 'none' : 'flex';
        toggle.textContent = `${day.clips.length} buys, each with its burn ${open ? '↓' : '↑'}`;
      });
      row.appendChild(toggle);
      row.appendChild(detail);
    }
    list.appendChild(row);
  }
  box.appendChild(list);
  return box;
}

/* ── house rules ──────────────────────────────────────────────────────────── */

function rulesSection(v, mine) {
  const wrap = el('div', `display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start;margin-top:28px;border-top:1px solid ${HAIR};padding-top:40px`);
  const l = el('div', 'flex:1 1 250px;min-width:0;display:flex;flex-direction:column;gap:11px');
  l.appendChild(text('span', EYEBROW, 'House rules'));
  l.appendChild(text('h2', `margin:0;font-family:${SERIF};font-weight:400;font-size:clamp(25px,41px,32px);line-height:1.1;color:${PAPER}`,
    'What you agree to when you lock'));
  l.appendChild(text('p', `margin:0;font-size:12.5px;color:${MUTED};line-height:1.6`,
    v.fromPlan
      ? 'Fixed when the contract is deployed, none of it is a setting anyone can change afterwards.'
      : 'Every line here is read from the deployed contract, which is the only copy that can matter.'));
  // The long version lives in the docs; the addresses stay HERE, because this
  // is a money page and "go and find the contract yourself" is not a
  // verification path.
  const more = text('a', `align-self:flex-start;font-size:13.5px;color:${BRASS};text-decoration:none;`
    + 'border-bottom:1px solid rgba(139,92,246,0.3)', 'The full terms, in the docs ↗');
  more.href = '/docs/staking';
  l.appendChild(more);
  const links = el('div', 'display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:4px');
  // Linked, not just printed: "go and find the contract yourself" is not a
  // verification path, and neither is an address you have to paste somewhere.
  const addr = (label, value) => { const n = addrLink(mine.explorer, value, label); if (n) links.appendChild(n); };
  addr('staking', v.contract);
  addr('token', v.tokenAddress);
  addr('router', v.router && v.router.address);
  l.appendChild(links);
  wrap.appendChild(l);

  const minLine = hasMinimum(v.terms.minStake, v.decimals)
    ? `The minimum is ${exact(toTokens(v.terms.minStake, v.decimals))} ${v.symbol} per position.`
    : 'There is no minimum, a single token is a position, and it earns its share of one token’s weight.';
  const faqs = [
    ['Is there a minimum?', minLine],
    ['Can I exit early?', 'No. A lock runs to its end. You can extend it, never shorten it.'],
    ['When do I get paid?', 'Continuously. Claim any time, even while locked. One claim pays every position at once.'],
    ['What happens when my lock ends?', 'It stops earning. Rewards up to the unlock are kept and stay claimable. Withdraw, or relock from now.'],
    ['How is my share worked out?', `Your weight is your stake times the multiplier, and the pool is split by weight every second. `
      + 'Unlocks round up to the next midnight UTC, and one wallet can hold 32 positions.'],
    [v.rate ? 'Why is the APR trailing?' : 'Why is there no APR yet?',
      v.rate
        ? `It is a record, not a forecast, what was actually paid in over the last ${v.rate.days} days, annualised.`
        : 'A rate here is only ever a record of what was really paid. Until two days of payments exist there is nothing to annualise, so the page shows none.'],
    ['Can the house touch my tokens?', 'No. Only you can move a position, and only once it unlocks. Withdrawing and claiming are never pausable.'],
  ];
  const right = el('div', `flex:1 1 400px;min-width:0;display:flex;flex-wrap:wrap;gap:0 26px;border-top:1px solid rgba(232,236,248,0.14)`);
  for (const [q, a] of faqs) {
    const item = el('div', `flex:1 1 250px;min-width:0;display:flex;flex-direction:column;gap:2px;padding:9px 0;border-bottom:1px solid ${HAIR_SOFT}`);
    item.appendChild(text('span', `font-size:13px;color:${INK}`, q));
    item.appendChild(text('span', `font-size:12.5px;line-height:1.5;color:${MUTED}`, a));
    right.appendChild(item);
  }
  wrap.appendChild(right);
  return wrap;
}

/* ── the confirm sheet ────────────────────────────────────────────────────
   One review, then the wallet's own steps as they really happen — the wallet
   reports each prompt opening and each transaction landing (see evmStake), so
   nothing here is a timed animation pretending to be progress. */

function sheetFor(v, me) {
  const s = ui.sheet;
  if (!s) return null;
  const close = () => { ui.sheet = null; repaint(); };

  const scrim = el('div', 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:60;display:flex;align-items:center;'
    + 'justify-content:center;padding:20px;animation:fadeIn 160ms ease-out');
  scrim.addEventListener('click', () => { if (!me.busy) close(); });
  const card = el('div', `width:100%;max-width:438px;max-height:765px;overflow-y:auto;border-radius:12px;background:${CARD};`
    + 'border:1px solid rgba(232,236,248,0.16);box-shadow:0 30px 70px -18px rgba(0,0,0,0.72);animation:riseIn 200ms cubic-bezier(.33,0,.15,1)');
  card.addEventListener('click', (e) => e.stopPropagation());

  const pos = s.pos || null;
  const est = s.kind === 'lock' ? estimate(v, s.tokens, s.tierIndex) : null;
  const needsApproval = s.kind === 'lock' && me.allowance !== null && me.allowance !== undefined
    && big(me.allowance) < s.amount;

  let eyebrow = s.phase === 'sent' && needsApproval ? 'Two wallet prompts'
    : s.phase === 'sent' ? 'One wallet prompt' : 'review';
  let title = '';
  let rows = [];
  let note = '';
  let primary = '';
  const earned = me.earned === null || me.earned === undefined ? 0n : big(me.earned);

  if (s.kind === 'lock') {
    title = `Lock ${exact(s.tokens)} ${v.symbol}`;

    rows = [
      ['amount', `${exact(s.tokens)} ${v.symbol}`, INK],
      ['Lock length', `${Math.round((est.tier ? est.tier.duration : 0) / 86_400)} days · ${boostLabel(est.tier ? est.tier.boostBps : 10_000)}`, INK],
      ['unlocks', localWhen(est.end), INK],
      ['', utcWhen(est.end), MUTED],
      ['estimated', est.perWeek === null ? 'N/A' : `${money(est.perWeek, 2)}/wk`, BRASS],
    ];
    note = 'No early exit. A lock runs to its end. You can extend it but never shorten it.';
    primary = `lock ${exact(s.tokens)} ${v.symbol}`;
  } else if (s.kind === 'claim') {
    title = `Claim ${money(usd(earned))} USDC`;
    rows = [
      ['across', `${v.positions.length} position${v.positions.length === 1 ? '' : 's'}`, INK],
      ['Paid in', 'USDC', INK],
    ];
    note = 'One claim pays everything you have earned across every position. Your principal stays locked.';
    primary = `claim ${money(usd(earned))} USDC`;
  } else if (s.kind === 'withdraw') {
    title = `Withdraw ${exact(pos.tokens)} ${v.symbol}`;
    rows = [
      ['unlocked', utcWhen(pos.end), INK],
      ['Rewards earned', 'Kept, claim any time', INK],
    ];
    note = 'The tokens return to your wallet. Rewards earned up to the unlock are kept and stay claimable.';
    primary = `withdraw ${exact(pos.tokens)} ${v.symbol}`;
  } else {
    const extending = s.kind === 'extend';
    if (s.phase !== 'sent') eyebrow = extending ? 'extend' : 'relock';
    title = `${extending ? 'Extend' : 'Relock'} ${exact(pos.tokens)} ${v.symbol}`;
    rows = [[extending ? 'unlocks' : 'ended', utcWhen(pos.end), MUTED]];
    note = extending
      ? 'Relocking restarts the clock from now, it does not add to the old end. Only tiers that unlock no '
        + 'earlier than this one, at no lower a multiplier, are offered: the contract refuses the rest.'
      : 'The position starts again from now, at the tier you pick.';
    primary = s.pickTier === null ? ''
      : `${extending ? 'Extend to' : 'Relock for'} ${Math.round(v.tiers[s.pickTier].duration / 86_400)} days`;
  }

  const head = el('div', `padding:20px 22px 15px;border-bottom:1px solid rgba(232,236,248,0.1);display:flex;flex-direction:column;gap:7px`);
  head.appendChild(text('span', EYEBROW, eyebrow));
  head.appendChild(text('span', `font-family:${SERIF};font-size:25px;line-height:1.14;color:${PAPER}`, title));
  card.appendChild(head);

  const body = el('div', 'padding:17px 22px;display:flex;flex-direction:column;gap:12px');
  for (const [k, val, tone] of rows) {
    const r = el('div', `display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding-bottom:9px;border-bottom:1px solid ${HAIR_SOFT}`);
    r.appendChild(text('span', `font-size:13px;color:${MUTED}`, k));
    r.appendChild(text('span', `font-family:${SERIF};${NUM};font-size:17px;color:${tone};text-align:right`, val));
    body.appendChild(r);
  }

  /* The tiers a relock may legally pick. The contract refuses anything that
     would end sooner than the lock already does (CannotShorten), and a lower
     multiplier is never offered: it trades boost for lock time, which is worse
     on both counts. A tier that would change nothing is not an option. */
  if ((s.kind === 'extend' || s.kind === 'relock') && s.phase !== 'sent') {
    // Once it is sent the choice is made: a list of alternatives beside a
    // transaction already in flight is an invitation to click the wrong one.
    relockTiers(v, pos).forEach((i) => {
      const t = v.tiers[i];
      const end = ceilUtcDay(v.chainNow + t.duration * 1000);
      const alt = estimate(v, pos.tokens, i);
      const on = s.pickTier === i;
      const b = el('button', `position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;`
        + `padding:12px 14px;border-radius:5px;border:1px solid ${on ? 'rgba(139,92,246,0.6)' : 'rgba(232,236,248,0.18)'};`
        + `background:${on ? 'rgba(139,92,246,0.12)' : 'transparent'};text-align:left;cursor:pointer;width:100%`);
      b.className = 'pill-flat';
      b.type = 'button';
      const l = el('span', 'display:flex;flex-direction:column;gap:2px');
      l.appendChild(text('span', `font-size:14px;color:${INK}`, `${Math.round(t.duration / 86_400)} days · ${boostLabel(t.boostBps)}`));
      l.appendChild(text('span', `font-size:12px;color:${MUTED};${NUM}`, `unlocks ${utcWhen(end)}`));
      b.appendChild(l);
      b.appendChild(text('span', `font-family:${SERIF};${NUM};font-size:16px;color:${BRASS};text-align:right`,
        alt.perWeek === null ? 'N/A' : `${money(alt.perWeek, 2)}/wk`));
      b.addEventListener('click', () => { ui.sheet = { ...s, pickTier: i }; repaint(); });
      body.appendChild(b);
    });
  }

  /* The steps, as the wallet reports them. */
  if (s.phase === 'sent') {
    const reported = me.steps || {};
    const names = s.kind === 'lock'
      ? [['approve', 'Allow the contract to take $SUITED'], ['stake', 'Lock your $SUITED']]
      : [[s.kind === 'extend' ? 'relock' : s.kind, {
        claim: 'Claim your USDC', relock: 'Relock your position', withdraw: 'Withdraw your $SUITED',
      }[s.kind === 'extend' ? 'relock' : s.kind]]];
    const shown = names.filter(([key]) =>
      key !== 'approve' || (reported.approve !== 'skipped' && (needsApproval || reported.approve)));
    const list = el('div', 'display:flex;flex-direction:column;gap:9px');
    shown.forEach(([key, label], i) => {
      const status = reported[key] || 'waiting';
      const done = status === 'done' || status === 'skipped';
      const active = !done && (status === 'wallet' || status === 'confirming');
      const tone = done ? WIN : active ? BRASS : '#a78bfa';
      const r = el('div', `display:flex;align-items:center;gap:13px;padding:12px 14px;border-radius:5px;`
        + `border:1px solid ${active ? 'rgba(139,92,246,0.4)' : HAIR};background:rgba(0,0,0,0.175)`);
      r.appendChild(text('span', `width:22px;height:22px;border-radius:50%;border:1px solid ${tone};display:flex;`
        + `align-items:center;justify-content:center;flex:none;font-size:11px;color:${tone}`, done ? '✓' : String(i + 1)));
      const mid = el('span', 'display:flex;flex-direction:column;gap:1px;min-width:0;flex:1');
      mid.appendChild(text('span', `font-size:14px;color:${INK}`, label));
      mid.appendChild(text('span', `font-size:12px;color:${done ? WIN : MUTED}`,
        status === 'done' ? 'done' : status === 'skipped' ? 'Already allowed'
          : status === 'wallet' ? 'Waiting for your wallet…'
            : status === 'confirming' ? 'Confirming on chain…' : 'waiting'));
      r.appendChild(mid);
      if (active) {
        const t = el('span', 'position:relative;width:34px;height:2px;background:rgba(232,236,248,0.14);overflow:hidden;flex:none');
        t.appendChild(el('span', `position:absolute;left:0;top:0;height:2px;width:38%;background:${BRASS};animation:scan 1.05s ease-in-out infinite`));
        r.appendChild(t);
      }
      list.appendChild(r);
    });
    body.appendChild(list);
  } else if (needsApproval) {
    body.appendChild(text('span', `font-size:12.5px;color:${MUTED};line-height:1.55`,
      'Your wallet will ask twice: once to let the contract take the tokens, once to lock them.'));
  }

  if (note) body.appendChild(text('span', `font-size:12.5px;color:${MUTED};line-height:1.55`, note));
  if (s.phase === 'sent' && me.error) {
    body.appendChild(text('div', `border-left:2px solid ${CLARET};padding:2px 0 2px 11px;font-size:13px;color:${INK};line-height:1.5`,
      me.error));
  }
  card.appendChild(body);

  const footer = el('div', 'padding:0 22px 20px;display:flex;gap:10px;flex-wrap:wrap');
  const failed = s.phase === 'sent' && !!me.error && !me.busy;
  const run = () => {
    if ((s.kind === 'extend' || s.kind === 'relock') && s.pickTier === null) return;
    ui.sheet = { ...ui.sheet, phase: 'sent', sawBusy: false };
    if (s.kind === 'lock') me.stake(s.amount, s.tierIndex);
    else if (s.kind === 'claim') me.claim();
    else if (s.kind === 'withdraw') me.withdraw(pos.id);
    else me.relock(pos.id, s.pickTier);
  };
  if (primary && (s.phase !== 'sent' || failed)) {
    const b = plate(failed ? 'Try again' : primary, run, { kind: 'paper', size: 14.5, disabled: !!me.busy });
    b.style.flex = '1 1 190px';
    footer.appendChild(b);
  }
  const dismiss = plate(me.busy ? 'close' : failed ? 'close' : 'cancel', close,
    { kind: 'outline', size: 14, disabled: false });
  dismiss.style.flex = '0 1 auto';
  dismiss.style.color = MUTED;
  footer.appendChild(dismiss);
  card.appendChild(footer);

  scrim.appendChild(card);
  return scrim;
}

/* ── entry ────────────────────────────────────────────────────────────────── */

/**
 * Render the whole page into `host`. Called on mount and on every refresh; it
 * replaces the contents wholesale rather than diffing, because the page is a
 * few hundred nodes and rebuilding is cheaper to reason about than patching.
 *
 * `data` is `/api/staking`'s body, or null when the fetch failed — in which
 * case the page still renders its fixed half, because the terms do not depend
 * on the network being up.
 */
export function render(host, data, me) {
  const d = data || { live: false };
  const mine = me || {};
  /* Whether the APP changed the draft since the last paint, captured before
     `last` is overwritten. `liveDraft()` reads the input still in the document
     — `replaceChildren` does not run until the end of this function — so after
     a successful lock, when the app resets its draft to '', the old node still
     holds the amount that was just staked and the reset is thrown away. Worse,
     `onType` then writes the stale value back into app state, so it survives
     navigation and the lock button stays armed with the amount already locked.
     A second confirm is a second position: the contract has no top-up and no
     early exit. */
  const appDraftChanged = !last || (last.me && last.me.draft) !== mine.draft;
  last = { host, data: d, me: mine, appDraftChanged };
  const now = Date.now();
  const v = withSweep(digest(d, mine, now), now);

  // A sheet whose transaction has been sent closes itself when the action
  // finishes — the app toasts the result and re-reads the chain — and stays
  // open with the reason when the wallet or the contract refused it.
  if (ui.sheet && ui.sheet.phase === 'sent') {
    if (mine.busy) ui.sheet.sawBusy = true;
    else if (ui.sheet.sawBusy && !mine.error) ui.sheet = null;
  }
  if (ui.sheet && (ui.sheet.kind === 'withdraw' || ui.sheet.kind === 'extend' || ui.sheet.kind === 'relock')) {
    // The position list is re-read after every action; a sheet pointing at a
    // position that no longer exists is closed rather than left to revert.
    const still = v.positions.find((p) => p.id === ui.sheet.pos.id);
    if (!still) ui.sheet = null; else ui.sheet.pos = still;
  }

  tickers = [];
  observers.forEach((o) => o.disconnect());
  observers = [];

  /* The shell is the one every wide page wears — `.su-page` in the page's own
     stylesheet carries the measure and the gutters, so this screen lines up
     with the lobby instead of running 400px narrower than it. Only the tail is
     this page's own: staking scrolls further than any of them. */
  const page = el('div', 'display:flex;flex-direction:column;align-items:center;padding-bottom:140px');
  const col = el('div', 'display:flex;flex-direction:column;gap:clamp(16px,27px,24px)');
  col.className = 'su-page';

  col.appendChild(heroSection(v));
  const receipt = receiptStrip(mine);
  if (receipt) col.appendChild(receipt);
  col.appendChild(noticeStrip(v));
  col.appendChild(tilesRow(v, d));

  const main = el('div', 'display:flex;flex-wrap:wrap;gap:clamp(12px,21px,18px);align-items:stretch');
  main.appendChild(stakeCard(v, mine));
  const side = el('div', 'flex:1 1 290px;min-width:0;display:flex;flex-direction:column;gap:12px');
  side.appendChild(mine.address ? claimCard(v, mine) : connectCard(mine));
  side.appendChild(sourcesCard(v));
  main.appendChild(side);
  col.appendChild(main);

  if (v.positions.length) col.appendChild(positionsSection(v, mine));
  col.appendChild(chartsRow(v));
  col.appendChild(buybackSection(v, d));
  col.appendChild(rulesSection(v, mine));

  page.appendChild(col);
  const sheet = sheetFor(v, mine);
  host.replaceChildren(sheet ? add(el('div'), page, sheet) : page);
  if (tickers.length) tick();
}

export const __testing = {
  toTokens, toBase, compact, exact, dur, ago, lockAdj, boostLabel, ceilUtcDay,
  ticker, hasMinimum, termsOf, digest, estimate, relockTiers, niceDomain, PLANNED_TERMS, ui,
  clock, nextMidnightIn, zoneLabel, withSweep,
};
