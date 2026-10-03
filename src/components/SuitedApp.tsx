'use client';

/* The application. Edit it directly.
 *
 * State, the table and wallet wiring, the router, the screen loaders, and a
 * renderVals() that flattens all of it into the bag SuitedTemplate reads.
 *
 * It came across from the logic script inside the original index.html, carried
 * by a generator that has since been retired: the port is finished and nothing
 * syncs from upstream. Earlier revisions said "re-running overwrites this file"
 * — no longer true, there is nothing to re-run.
 *
 * It is one large class component with inline styles, which is not how anyone
 * would start today. That was the point: a literal port could be diffed against
 * the original and shown to render the same DOM, which a rewrite could not.
 * Decomposing it is now an ordinary refactor, safe to do a screen at a time.
 *
 * The palette below is the chokepoint for most of the app's colour. Note that
 * several constants are deliberately split by role — CARD_FACE from PAPER,
 * ON_FILL and PAPER_INK from the surfaces they are named after — because a
 * colour that is a surface in one place and text in another cannot be themed as
 * one thing. Two tools enforce it and you want both after any colour change:
 * tools/audit-contrast.mjs for the signed-out screens, tools/probe-live.mjs for
 * the seat screen and the felt, which need a session to reach. See
 * docs/readability.md — this one mistake has produced nine invisible-text bugs.
 */
import React from 'react';
import SuitedTemplate from './SuitedTemplate';
import * as SUITED from '@/engine';
import { SUITED_SERVER, SUITED_OFFLINE } from '@/config';
import {
  FELT, FELT_DEEP, PAPER, PAPER_COOL, MUTED, CARD_FACE, CTA, CTA_INK, ON_FILL, PAPER_INK,
  BRASS, CLARET, TURN, RED, RED_INK, WIN, LOSS, INK, INK_MUT, FELT_INK,
  SERIF, UI, MONO, DISP, EASE,
  FELT_LIGHT, FLAT_CARD, LIT_CARD, RED_CARD, RECEIPT_LINK, SIGILS,
  BG, SURF, ACC, ACC2, MUT, DIM,
} from '@/lib/palette';
import {
  TABLE_STYLES, TABLE_STYLE_KEY, tableStyle, storedTableStyle,
  tableSurfaceCss, tableGroundCss, tableSwatchCss,
} from '@/lib/table-styles';
import {
  CARD_BACKS, CARD_BACK_KEY, cardBack, storedCardBack, cardBackCss, cardBackSwatchCss,
} from '@/lib/card-backs';

/* The palette lives in @/lib/palette — see the note at the top of that file
   about the constants that look redundant and are not. */

/* ── Table geometry — the redesign's fixed design canvas ─────────────────────
   The felt is a fixed 1420×750 canvas, scaled as a single unit to fit its box
   (HANDOFF §Responsive). Every seat is anchored to an edge or the centre line at
   a fixed pixel inset, and the whole play area is `scale(s)`d — so a collision
   verified once at the design geometry (corner card vs. board frame, card vs.
   bet pill, ring vs. plate) holds at every window size, and the table keeps its
   proportions rather than reflowing into a different shape between windows.

   Seat order is ours: 0 is the hero at the bottom, then anticlockwise. Each
   anchor carries the plate's own position and, from it, where that seat's hole
   cards and bet pill sit. The corner pairs are symmetric because their insets
   are equal (172px), never because coordinates sum to a constant; the `min()`
   on the corner cards holds them off the plate until the fixed 472px board
   frame's edge catches up, then yields, so the two never collide. */
let CANVAS = { w: 1420, h: 750 };
/* The floor was 0.55, and below it the canvas simply overflowed its box and was
   clipped — which on a phone cut the top seat and the hero's own plate off the
   screen. A table that is small is still a table; one with seats missing is
   not. So the floor is now only where it stops being drawable at all. */
const SCALE_MIN = 0.3, SCALE_MAX = 1.35;

/* The page's design canvas — the felt's CANVAS, for every screen that is not
   the felt. 1512x850 is 16:9 at the measure the pages already use, so a normal
   desktop window renders at s = 1 and today's tuning is preserved exactly. The
   floor keeps a small window legible; the ceiling stops a large monitor from
   making the type absurd. */

const STAGE = { w: 1512, h: 850 };
const STAGE_MIN = 0.62, STAGE_MAX = 1.6;

let SEAT_ANCHORS = [
  // 0 · hero — bottom centre, cards face-up above the plate, bet at the felt lip
  { edge: 'c',
    plate: 'left:50%;bottom:48px;transform:translateX(-50%)',
    cards: 'left:50%;bottom:116px;transform:translateX(-50%)',
    bet:   'left:50%;bottom:8px;transform:translateX(-50%)' },
  // 1 · bottom-left
  { edge: 'l',
    plate: 'left:172px;top:520px;transform:translate(-50%,-50%)',
    cards: 'left:min(250px, calc(50% - 298.5px));top:382px;transform:translateX(-50%)',
    bet:   'left:172px;top:472px;transform:translate(-50%,-50%)' },
  // 2 · top-left
  { edge: 'l',
    plate: 'left:172px;top:210px;transform:translate(-50%,-50%)',
    cards: 'left:min(250px, calc(50% - 298.5px));top:288px;transform:translateX(-50%)',
    bet:   'left:172px;top:258px;transform:translate(-50%,-50%)' },
  // 3 · top-centre
  { edge: 'c',
    plate: 'left:50%;top:44px;transform:translate(-50%,-50%)',
    cards: 'left:50%;top:118px;transform:translateX(-50%)',
    bet:   'left:50%;top:92px;transform:translate(-50%,-50%)' },
  // 4 · top-right
  { edge: 'r',
    plate: 'right:172px;top:210px;transform:translate(50%,-50%)',
    cards: 'right:min(250px, calc(50% - 298.5px));top:288px;transform:translateX(50%)',
    bet:   'right:172px;top:258px;transform:translate(50%,-50%)' },
  // 5 · bottom-right
  { edge: 'r',
    plate: 'right:172px;top:520px;transform:translate(50%,-50%)',
    cards: 'right:min(250px, calc(50% - 298.5px));top:382px;transform:translateX(50%)',
    bet:   'right:172px;top:472px;transform:translate(50%,-50%)' },
];

// Board frame and pot, centred on the canvas. The frame is a fixed 472×168 with
// the wordmark breaking its top edge (a real gap in the stroked path, never a
// patch of felt-coloured background); the pot sits below it.
let BOARD = { cx: 710, cy: 334, w: 472, h: 168, slot: { w: 66, h: 94, r: 7 }, gap: 14 };
const BOARD_PATH = 'M 168 0 H 20 A 20 20 0 0 0 0 20 V 148 A 20 20 0 0 0 20 168 H 452 A 20 20 0 0 0 472 148 V 20 A 20 20 0 0 0 452 0 H 304';
let POT = { cx: 710, cy: 482 };

/* The anchors above resolve to constant canvas coordinates (the canvas width is
   fixed, so the design's `min()` and edge insets never move), and the deal /
   collect / ship animations need real numbers rather than CSS strings. This is
   that table: the plate centre, the bet pill and the hole-card cluster for each
   seat, in play-area pixels. Keep it in step with SEAT_ANCHORS. */
let SEAT_PX = [
  { plate: { x: 710, y: 675 }, bet: { x: 710, y: 727 }, cards: { x: 710, y: 587 } },
  { plate: { x: 172, y: 520 }, bet: { x: 172, y: 472 }, cards: { x: 250, y: 412 } },
  { plate: { x: 172, y: 210 }, bet: { x: 172, y: 258 }, cards: { x: 250, y: 318 } },
  { plate: { x: 710, y: 44 },  bet: { x: 710, y: 92 },  cards: { x: 710, y: 148 } },
  { plate: { x: 1248, y: 210 }, bet: { x: 1248, y: 258 }, cards: { x: 1170, y: 318 } },
  { plate: { x: 1248, y: 520 }, bet: { x: 1248, y: 472 }, cards: { x: 1170, y: 412 } },
];

/* Furniture, at the design's literal size — the whole play area scales, not the
   pieces, so these stay fixed. Plates are 180×54; the dealer/blind marker sits
   off the plate's edge; opponents' hole cards are small face-down backs, the
   hero's are large and face-up, and the board deals 66×94. */
let PLATE = { w: 180, h: 54 };
const HOLE = { w: 42, h: 60, r: 6 };   // an opponent's face-down hole card
const HERO_CARD = { w: 66, h: 94, r: 7 };
const CARD = { w: 66, h: 94, r: 7 };    // board card
const MARKER_GAP = 12;                  // dealer/blind badge, off the plate edge

// Where each seat's hole-card pair lands, in canvas px: the pair's centre-x, its
// top, and the card size + gap. Corner pairs sit 78px inboard of their plate —
// the design's min() rule, constant at this fixed canvas width.
let CARD_SLOT = [
  { cx: 710, top: 540, cw: HERO_CARD.w, ch: HERO_CARD.h, gap: 8 },
  { cx: 250, top: 382, cw: HOLE.w, ch: HOLE.h, gap: 5 },
  { cx: 250, top: 288, cw: HOLE.w, ch: HOLE.h, gap: 5 },
  { cx: 710, top: 118, cw: HOLE.w, ch: HOLE.h, gap: 5 },
  { cx: 1170, top: 288, cw: HOLE.w, ch: HOLE.h, gap: 5 },
  { cx: 1170, top: 382, cw: HOLE.w, ch: HOLE.h, gap: 5 },
];

// Where each seat's dealer/blind badge sits, as an offset from its plate's
// centre: off the outboard end of the plate, on the plate's own centre line.
let MARKER = [
  { dx: -(PLATE.w / 2 + MARKER_GAP), dy: 0 }, { dx: -(PLATE.w / 2 + MARKER_GAP), dy: 0 },
  { dx: -(PLATE.w / 2 + MARKER_GAP), dy: 0 }, { dx: -(PLATE.w / 2 + MARKER_GAP), dy: 0 },
  { dx: PLATE.w / 2 + MARKER_GAP, dy: 0 }, { dx: PLATE.w / 2 + MARKER_GAP, dy: 0 },
];

/* ── The same table, stood on end ────────────────────────────────────────────
   A phone held upright is 390px wide. The landscape canvas fitted into that is
   a quarter of its size — plates 49px across, cards the size of a fingernail —
   which is why the felt used to refuse the orientation and ask to be turned.
   This is the other answer: a second canvas, 680 wide, with the SAME furniture
   at the same sizes, arranged for a tall box. It fits a phone at a little over
   half scale, which is what the landscape canvas manages on a phone's side.

   Hero at the foot, one seat at the head, two down each side on the rail. The
   side seats' cards sit inboard of their plates, on the plate's own line, and
   their bets go on toward the middle from there — below the upper pair, above
   the lower — so nothing a seat owns crosses the board or the pot, and the
   space above each plate is left for the winner's crown. Every figure below is
   a literal position on this canvas, checked against the others once, exactly
   as the wide table's are. */
const WIDE = { CANVAS, SEAT_ANCHORS, BOARD, POT, SEAT_PX, CARD_SLOT, MARKER, PLATE };
/* The tall canvas is as tall as the box it is drawn in. A phone's height varies
   far more than its width — 660px of page in one browser, 840 in another — and
   a fixed 680×900 would leave the difference as dead bands above and below the
   table. So the width is fixed and the height follows the box, from 900 (the
   design, where every gap below was checked) up to 1150. Stretching only ever
   opens the gaps: the head seat stays at the top, the hero at the foot, and
   the side seats, the board and the pot spread between them in proportion.
   What belongs to a seat — its cards, its bet — keeps its fixed offset from
   the plate, so a seat looks the same at every height. */
const TALL_W = 680, TALL_H = 900, TALL_H_MAX = 1150;
/* The one piece of furniture that is NOT the same size here: the nameplate is
   148 wide rather than 180. On a canvas this narrow two full plates and the
   board between them leave the side seats' cards nowhere to go but the middle
   of the table; 32px off each plate moves them, and their bets, that much
   closer to the rail. The height is unchanged — it is two lines of text. */
const TALL_PLATE = { w: 148, h: 54 };
const tallLayout = (H) => {
  const k = (H - 83) / (TALL_H - 83);                 // 44 at the head, H-39 at the foot
  const y = (v) => Math.round(44 + (v - 44) * k);
  const hero = H - 39, up = y(215), low = y(640), board = y(385);
  const at = (x, yy) => `left:${x}px;top:${yy}px;transform:translate(-50%,-50%)`;
  const cardsAt = (x, top) => `left:${x}px;top:${top}px;transform:translateX(-50%)`;
  // [plate x, plate y, cards x, cards top, bet x, bet y, edge]
  const seats: [number, number, number, number, number, number, string][] = [
    [340, hero, 340, hero - 129, 340, hero - 159, 'c'],
    [80, low, 208, low - 30, 208, low - 54, 'l'],
    [80, up, 208, up - 30, 208, up + 53, 'l'],
    [340, 44, 340, 75, 340, 160, 'c'],
    [600, up, 472, up - 30, 472, up + 53, 'r'],
    [600, low, 472, low - 30, 472, low - 54, 'r'],
  ];
  return {
    CANVAS: { w: TALL_W, h: H },
    SEAT_ANCHORS: seats.map(([px, py, cx, ct, bx, by, edge]) => ({ edge, plate: at(px, py), cards: cardsAt(cx, ct), bet: at(bx, by) })),
    BOARD: { ...WIDE.BOARD, cx: 340, cy: board },
    POT: { cx: 340, cy: board + 139 },
    SEAT_PX: seats.map(([px, py, cx, ct, bx, by], i) => ({
      plate: { x: px, y: py }, bet: { x: bx, y: by },
      cards: { x: cx, y: ct + (i === 0 ? HERO_CARD.h : HOLE.h) / 2 },
    })),
    CARD_SLOT: seats.map(([, , cx, ct], i) => (i === 0
      ? { cx, top: ct, cw: HERO_CARD.w, ch: HERO_CARD.h, gap: 8 }
      : { cx, top: ct, cw: HOLE.w, ch: HOLE.h, gap: 5 })),
    /* A side plate is hard against the canvas edge here, so its badge cannot
       hang off the outboard end: it rides the plate's inboard top corner. */
    MARKER: [
      { dx: -(TALL_PLATE.w / 2 + MARKER_GAP), dy: 0 }, { dx: 60, dy: -34 }, { dx: 60, dy: -34 },
      { dx: -(TALL_PLATE.w / 2 + MARKER_GAP), dy: 0 }, { dx: -60, dy: -34 }, { dx: -60, dy: -34 },
    ],
    PLATE: TALL_PLATE,
  };
};
/** The tall canvas's height for a felt box of this shape, in steps of ten so a
 *  browser bar sliding by a pixel does not re-lay the table. */
const tallHeight = (felt) => (felt && felt.w > 0 && felt.h > 0
  ? Math.min(TALL_H_MAX, Math.max(TALL_H, Math.round((TALL_W * felt.h / felt.w) / 10) * 10))
  : TALL_H);
/* Which layout is live. Module state rather than a prop threaded through every
   reader: one felt is ever on screen, and the tables above are read from event
   handlers and animation code as well as from render. Set from the viewport in
   `onResize` and again, with the measured felt, at the top of every render. */
let TABLE_LAYOUT = 'wide';
const setTableLayout = (tall, felt?) => {
  const H = tall ? tallHeight(felt) : 0;
  const key = tall ? `tall:${H}` : 'wide';
  if (key === TABLE_LAYOUT) return;
  TABLE_LAYOUT = key;
  ({ CANVAS, SEAT_ANCHORS, BOARD, POT, SEAT_PX, CARD_SLOT, MARKER, PLATE } = (tall ? tallLayout(H) : WIDE) as typeof WIDE);
};

// Pot chips. Squared into columns by denomination and grown sideways, never
// down: `CHIP` is the disc, `CHIP_RISE` how far each peeks above the one below,
// `CHIP_GAP` the space between columns.
const CHIP = 26;
const CHIP_RISE = 6;
const CHIP_GAP = 5;

// The acting seat's timer ring traces a rounded rect 3px outside the 180×54
// plate, clockwise from top centre; `RING_LEN` is that path's length, which is
// both the dash and the distance the sweep drains.
const RING_PATH = 'M90 -3 H171 A12 12 0 0 1 183 9 V45 A12 12 0 0 1 171 57 H9 A12 12 0 0 1 -3 45 V9 A12 12 0 0 1 9 -3 Z';
const RING_LEN = 471.4;
/* The same ring for a plate of any size — the upright table's is narrower. The
   two constants above are this at 180×54, kept literal because the `ringWide`
   keyframes in globals.css end on that exact length. */
const ringPath = (p) => `M${p.w / 2} -3 H${p.w - 9} A12 12 0 0 1 ${p.w + 3} 9 V${p.h - 9} A12 12 0 0 1 ${p.w - 9} ${p.h + 3} H9 A12 12 0 0 1 -3 ${p.h - 9} V9 A12 12 0 0 1 9 -3 Z`;
const ringLen = (p) => Math.round((2 * (p.w - 18) + 2 * (p.h - 18) + 2 * Math.PI * 12) * 10) / 10;

// Pot chip denominations, largest first — the order `breakdown` walks: purple,
// charcoal, red, gold, green, cream, slate, lavender (HANDOFF §Chips). The range
// spans both ends on purpose: high chips keep a four-figure pot to a handful of
// varied discs rather than a red carpet, and the sub-quarter chips give a 3¢ pot
// something to show. A given pot only ever draws the three or four denominations
// that make it up, so the pile reads as varied, not busy.
const DENOMS = [
  { v: 500, chip: 'purple' },
  { v: 100, chip: 'charcoal' },
  { v: 25, chip: 'red' },
  { v: 5, chip: 'gold' },
  { v: 1, chip: 'green' },
  { v: 0.25, chip: 'cream' },
  { v: 0.05, chip: 'slate' },
  { v: 0.01, chip: 'lavender' },
];
/* A chip is a picture, not a flat disc: the ceramic set from
   tools/gen-chips.mjs, one drawing recoloured into the eight denominations so
   the pile reads as one set. Root-relative, for the same reason the card backs
   are — the felt's route is two segments deep. The disc underneath is round so
   its shadow is the chip's. */
const chipFace = (d) => `border-radius:50%;background:center/contain no-repeat url(/chips/suits/${d.chip}.webp)`;

const DENOM = {
  1: { bg: '#222c47', fg: '#1a1030' },
  5: { bg: ACC2, fg: '#3d2673' },
  25: { bg: ACC, fg: BG },
  100: { bg: '#1a1030', fg: BG },
  500: { bg: '#812535', fg: BG },
};

// The ring. Blinds, name, min/max buy-in — 20bb to 100bb, industry standard.
/* Backend discovery. `?server=http://host:port` wins, then a global set by the
   host page, then a same-origin default when the page is not on the filesystem.
   Absent all three the app runs the original local demo — which is why opening
   Suited.dc.html straight from disk still works with nothing installed. */
const serverUrl = () => {
  // The ?server= override is a dev convenience only. Honouring it on a deployed
  // origin hands the victim's bearer token to whatever host a crafted link
  // names — the page fires an authed /api/me on load — so it is dead outside
  // localhost/file://, where pointing a static page at a local gateway is real.
  const devHost = !location.protocol.startsWith('http')
    || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const q = devHost ? new URLSearchParams(location.search).get('server') : null;
  if (q) return q.replace(/\/$/, '');
  if (SUITED_SERVER) return String(SUITED_SERVER).replace(/\/$/, '');
  if (SUITED_SERVER === null) return null;          // explicit: local demo
  if (!location.protocol.startsWith('http')) return null;  // file:// — local demo
  // Two-process local dev: `npm run web` on 8788, gateway on 8787.
  if (location.port === '8788') return `${location.protocol}//${location.hostname}:8787`;
  // Otherwise assume the gateway served this page. That is the single-origin
  // deployment, where wss:// derives from the page's own host and there is no
  // cross-origin request to configure. A CDN-hosted frontend sets
  // window.SUITED_SERVER instead.
  return location.origin;
};

/* How long an optimistic `seated` may stand without the server confirming a
   hero seat before the client accepts it is spectating. Long enough for a normal
   sit to land; short enough that a dropped or raced rejoin does not leave you
   watching a bot play a seat the server actually released. */
const SEAT_LOST_MS = 4000;

/** Distinguishes loadLeaderboard's "stake not passed" from an explicit null. */
const NO_STAKE_ARG = Symbol('no-stake');

const STAKES = [
  { id: 'nl2', name: '1\u00a2/2\u00a2', sb: 0.01, bb: 0.02, min: 0.4, max: 2, tag: 'micro', tagBg: '#b497f7', tagFg: '#7d4cf0' },
  { id: 'nl10', name: '5\u00a2/10\u00a2', sb: 0.05, bb: 0.1, min: 2, max: 10, tag: 'micro', tagBg: '#b497f7', tagFg: '#7d4cf0' },
  { id: 'nl50', name: '25\u00a2/50\u00a2', sb: 0.25, bb: 0.5, min: 10, max: 50, tag: 'low', tagBg: '#b497f7', tagFg: '#7d4cf0' },
  { id: 'nl200', name: '$1/$2', sb: 1, bb: 2, min: 50, max: 200, tag: 'mid', tagBg: '#fcd3da', tagFg: '#f33f5d' },
  { id: 'nl500', name: '$2/$5', sb: 2, bb: 5, min: 100, max: 500, tag: 'high', tagBg: '#fcd3da', tagFg: '#f33f5d' },
  { id: 'nl1000', name: '$5/$10', sb: 5, bb: 10, min: 200, max: 1000, tag: 'nosebleed', tagBg: '#fcd3da', tagFg: '#f33f5d' },
];

/* Rooms. One table per stake does not survive contact with real traffic, so the
   lobby lists many per level and filters client-side. Generated deterministically
   here; a live build replaces ROOMS with the gateway's table list and everything
   below it is unchanged. */
const SPARK = '\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588';
/* Live rooms, once /api/lobby answers. Until then the generated set below is
   what the offline demo renders — it is never mixed with real data. */
let LIVE_ROOMS = null;
/* True from the moment a gateway is known until /api/lobby has answered (or
   failed). In that window the demo set still gives the ladder its shape, but
   with nobody seated: its invented counts used to headline the lobby for half a
   second ("91 players seated") and then vanish when the real list landed, which
   flipped the hero to another layout and jolted everything under it. */
let ROOMS_PENDING = false;
let ROOMS_IDLE = null;
const ROOMS_ALL = () => LIVE_ROOMS
  || (ROOMS_PENDING ? (ROOMS_IDLE ||= ROOMS.map((r) => ({ ...r, seated: 0, open: true }))) : ROOMS);

const ROOMS = STAKES.flatMap((s, si) => Array.from({ length: 4 }, (_, i) => {
  let x = (si * 7919 + i * 104729 + 17) >>> 0;
  const rnd = () => ((x = Math.imul(x ^ (x >>> 15), 0x2545f491) >>> 0) / 4294967296);
  const seated = 2 + Math.floor(rnd() * 5);
  return {
    id: `${s.id}-${String(i + 1).padStart(2, '0')}`,
    stake: s.id,
    name: `${s.name} \u00b7 ${i + 1}`,
    seated,
    open: seated < 6,
    speed: ['fast', 'normal', 'turbo', 'normal'][Math.floor(rnd() * 4)],
    avgPot: Math.round(s.bb * (14 + rnd() * 46) * 100) / 100,
    spark: Array.from({ length: 12 }, () => SPARK[Math.floor(rnd() * 8)]).join(''),
  };
}));

const hashId = (s) => { let n = 0; for (let i = 0; i < s.length; i++) n = (Math.imul(n, 31) + s.charCodeAt(i)) >>> 0; return n % 100000; };
// A live table id is `<stake>-<hex>` (e.g. `nl10-d7015…`); a bare stake id is
// just `nl10`. Match on the stake PREFIX so a real table id resolves to its own
// bounds (min/max buy-in, blinds, name) instead of falling through to the nl200
// default — the fallback is only for a genuinely unrecognised id. (This was the
// rebuy-modal bug: an nl10 table id fell back to nl200's $200 max, so a busted
// player was offered a rebuy far above the table's real cap.)
/* Looked up by id, never by index. This was `STAKES[2]` — which meant the
   fallback was whatever happened to sit third in the list, so adding a stake
   above $1/$2 silently moved it. Naming it makes the list's order irrelevant. */
const FALLBACK_STAKE = STAKES.find((s) => s.id === 'nl200') || STAKES[0];
const stakeOf = (id) => {
  const stake = String(id ?? '').split('-', 1)[0];
  return STAKES.find((s) => s.id === stake) || FALLBACK_STAKE;
};
const roomById = (id) => ROOMS_ALL().find((r) => r.id === id);
/* Private-room tables the client has joined this session. The server owns the
   real stakes; this mirrors them (converted from wire micro-USDC to the dollars
   STAKES uses) so the seat screen and openTable read the room's own blinds and
   buy-in bounds rather than the nl200 fallback stakeOf lands on for an
   unrecognised id. Not in the lobby list — a room is reached by link, never
   browsed. */
const PRIV_TABLES = new Map();
const rememberPrivTable = (info) => {
  PRIV_TABLES.set(info.tableId, {
    id: info.tableId,
    name: info.name || 'Private room',
    sb: info.sb / 1e6, bb: info.bb / 1e6,
    min: info.minBuyIn / 1e6, max: info.maxBuyIn / 1e6,
    tag: 'private', tagBg: '#e8ecf8', tagFg: '#7d4cf0',
  });
};
// Takes a room id or a bare stake id; always answers with the stake config plus
// the display identity of whatever was asked for.
const tableById = (id) => {
  if (PRIV_TABLES.has(id)) return PRIV_TABLES.get(id);
  const r = roomById(id);
  const s = stakeOf(r ? r.stake : id);
  // A live room's own bounds win over the stake's when the lobby carried them
  // (the generated offline set has none); the stake stays the base so tag,
  // colours and the rest still come from one place.
  const live = r && r.min != null ? { sb: r.sb, bb: r.bb, min: r.min, max: r.max } : null;
  return { ...s, ...live, id: r ? r.id : s.id, name: r ? r.name : s.name };
};
const BOTS = [
  { id: 'b1', name: 'ppltrdr', style: 'reg', bb: 82 },
  { id: 'b2', name: 'nitwit.eth', style: 'nit', bb: 124 },
  { id: 'b3', name: '9xQm\u20264Tz', style: 'lag', bb: 73 },
  { id: 'b4', name: 'slowroll', style: 'station', bb: 102 },
  { id: 'b5', name: 'donkbet', style: 'maniac', bb: 49 },
];
const seatsFor = (tbl, heroStack) => [
  { id: 'hero', name: 'You', kind: 'hero', stack: heroStack },
  ...BOTS.map((b) => ({ id: b.id, name: b.name, kind: 'bot', style: b.style, stack: Math.round(tbl.bb * b.bb * 100) / 100 })),
];

// Preset avatars only — no uploads. Two glyphs so they stay readable at 8px.
/* Four card indices and four faces. `pip` marks the ones the pip system applies
   to: a rank belongs beside a suit mark, a face does not, and slicing a rank off
   `^_^` to force one gives `^`. The faces keep their whole glyph and go
   without. */
// Avatar registry: 8 letter defaults (av-<id>.svg) + 23 earned (id ===
// achievement code === earned/<id>.webp), then the generated portraits \u2014 16
// free, 8 level-gated. All the art but the letters is tools/gen-avatars.mjs.
// Mirrors apps/web/avatars/achievements.json \u2014 keep the two in sync.
const AV = [
  { id: 'index-as', tier: 'default', name: 'Ace of spades',    def: true },
  { id: 'index-ah', tier: 'default', name: 'Ace of hearts',    def: true },
  { id: 'index-kd', tier: 'default', name: 'King of diamonds', def: true },
  { id: 'index-qc', tier: 'default', name: 'Queen of clubs',   def: true },
  { id: 'face-grin',    tier: 'default', name: 'Grin',      def: true },
  { id: 'face-deadpan', tier: 'default', name: 'Deadpan',   def: true },
  { id: 'face-wide',    tier: 'default', name: 'wide-eyed', def: true },
  { id: 'face-busted',  tier: 'default', name: 'Busted',    def: true },
  { id: 'chip-1',   tier: 'common',   name: 'First blood', condition: 'Win your first pot' },
  { id: 'chip-100', tier: 'common',   name: 'Century',     condition: 'Win 100 pots' },
  { id: 'chip-5',   tier: 'common',   name: 'Heater',      condition: 'Win five pots in a row' },
  { id: 'button',   tier: 'uncommon', name: 'On the button', condition: 'Play 10,000 hands' },
  { id: 'lvl-10',   tier: 'uncommon', name: 'Reg',        condition: 'Reach level 10' },
  { id: 'lvl-20',   tier: 'uncommon', name: 'River rat',  condition: 'Reach level 20' },
  { id: 'lvl-30',   tier: 'rare',     name: 'Whale',      condition: 'Reach level 30' },
  { id: 'lvl-40',   tier: 'mythic',   name: 'Legend',     condition: 'Reach level 40' },
  { id: 'day-one',  tier: 'mythic',   name: 'Day one',    condition: 'One of the first 77 accounts' },
  { id: 'boat',     tier: 'uncommon', name: 'Boat',       condition: 'Make 25 full houses' },
  { id: 'quads',    tier: 'rare',     name: 'Quads',      condition: 'Make four of a kind' },
  { id: 'straight-flush', tier: 'rare', name: 'Straight flush', condition: 'Make a straight flush' },
  { id: 'wheel',    tier: 'rare',     name: 'The wheel',  condition: 'Make a five-high straight' },
  { id: 'royal',    tier: 'mythic',   name: 'Royal',      condition: 'Make a royal flush' },
  { id: 'jackpot',  tier: 'mythic',   name: 'Jackpot',    condition: 'Win a daily jackpot draw' },
  { id: 'chip-25',      tier: 'common',   name: 'Regular',      condition: 'Play 25 sessions' },
  { id: 'seven-deuce',  tier: 'uncommon', name: 'seven-deuce',  condition: 'Win a showdown holding 7-2 offsuit' },
  { id: 'all-in',       tier: 'uncommon', name: 'All in',       condition: 'Win an all-in pot of 200bb+' },
  { id: 'suited',       tier: 'uncommon', name: 'Suited',       condition: 'Make 50 flushes from suited holes' },
  { id: 'cooler',       tier: 'uncommon', name: 'Cooler',       condition: 'Take 25 bad beats' },
  { id: 'five-bills',   tier: 'rare',     name: 'Five bills',   condition: 'Win 25 pots over $500', light: true },
  { id: 'verified',     tier: 'rare',     name: 'Verified',     condition: 'Re-deal and check 100 hands yourself' },
  { id: 'the-nuts',     tier: 'mythic',   name: 'The nuts',     condition: 'Win 25 showdowns holding the nuts' },
  /* The portraits (tools/gen-avatars.mjs). `free` are the sixteen faces anyone
     may wear — they are what the picker offers in place of the letter defaults
     above, which stay registered only so an account still holding one resolves.
     `level` is the prestige set: one per level title, usable from that level
     on. Both carry their own `src`; see avSrc for the rest. */
  ...([
    'The tux', 'Red', 'The don', 'Hoodie', 'Ice', 'Cowboy', 'Velvet', 'Aviator',
    'The boss', 'Dealer', 'High roller', 'The shadow', 'Wildcard', 'Pearls', 'Scar', 'The fox',
  ].map((name, i) => {
    const n = String(i + 1).padStart(2, '0');
    return { id: `p-${n}`, tier: 'default', name, free: true, src: `/avatars/portraits/p-${n}.webp` };
  })),
  ...([
    [5, 'Grinder', 'uncommon'], [10, 'Reg', 'uncommon'], [15, 'Shark', 'rare'], [20, 'River rat', 'rare'],
    [25, 'Crusher', 'rare'], [30, 'Whale', 'rare'], [40, 'Legend', 'mythic'], [50, 'Mythic', 'mythic'],
  ] as [number, string, string][]).map(([level, title, tier]) => {
    const n = String(level).padStart(2, '0');
    return { id: `pr-${n}`, tier, name: `${title} prestige`, level, condition: `Reach level ${level}`, src: `/avatars/portraits/pr-${n}.webp` };
  }),
] as any[];
const avById = new Map(AV.map((a) => [a.id, a]));
const FREE_AVATARS = AV.filter((a) => a.free);
const PRESTIGE_AVATARS = AV.filter((a) => a.level);
const DEFAULT_AVATAR = 'index-as';
const TIER_MOTION = new Set(['rare', 'mythic']); // only these two carry motion (tiers.css)
const avEntry = (id) => avById.get(id) || avById.get(DEFAULT_AVATAR);
// Root-relative (/avatars/…), not relative: the disc renders on the table too,
// whose route is two segments (/table/<id>) — a relative `avatars/…` there
// resolves to /table/avatars/… and 404s, leaving only the tier aura showing.
const avSrc = (id) => {
  const e = avEntry(id);
  // Portraits name their own file; an achievement is its emblem, earned/<code>;
  // only the letter defaults are still the hand-drawn av-<id>.svg.
  return e.src || (e.def ? `/avatars/av-${e.id}.svg` : `/avatars/earned/${e.id}.webp`);
};
const avTier = (id) => { const t = avEntry(id).tier; return TIER_MOTION.has(t) ? t : ''; };
const avName = (id) => avEntry(id).name;
// The avatar disc lives in a POSITIONED child of the .av wrapper, carrying the
// image as a background (not an <img src="{{ }}">, which this runtime would leave
// unresolved long enough for the browser to 404-fetch the literal placeholder).
// position:relative lifts it above the tier-motion pseudo-elements (mythic aura,
// rare wipe) exactly as tiers.css's own `.av > img { position:relative }` does —
// so the aura sits behind and the ring frames it, instead of covering it. The
// .av wrapper itself carries the size.
const avInner = (id) => `position:relative;width:100%;height:100%;border-radius:50%;background:center/cover no-repeat url(${avSrc(id)})`;
/* Seat portraits (tools/gen-avatars.mjs) for a player who has not equipped an
   avatar — bots, and anyone who never chose — so the felt shows faces rather
   than a column of initials. Picked by a hash of the seat's id (or name), so a
   given player keeps the same face from hand to hand and table to table. */
const PORTRAIT_COUNT = FREE_AVATARS.length;
const portraitHash = (key) => {
  let h = 0;
  for (const ch of String(key || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % PORTRAIT_COUNT;
};
const portraitInner = (n) => avInner(FREE_AVATARS[n].id);
/** Which of the sixteen a free-portrait id is, or -1 for anything else. */
const portraitIndex = (id) => FREE_AVATARS.findIndex((a) => a.id === id);
/* The eight free defaults are letters on a disc (A♠, ^_^) — and `index-as` is
   what every account holds until it picks something, so on the felt they would
   put the initials straight back. A seat wearing one of those gets a portrait;
   an earned avatar is a trophy and stays. */
const wearsPortrait = (id) => !id || !!avEntry(id).def;
/* One portrait per seat, no twins at a table: six hashes into sixteen faces
   collide two times in three, so a taken face steps to the next free one. Seat
   0 (the viewer) claims first and the rest follow in key order, which keeps the
   assignment independent of seat rotation and of who sat down when. */
const seatPortraits = (keys, worn = []) => {
  const out = keys.map(() => null);
  // A face somebody at the table chose is theirs; nobody is handed its twin.
  const taken = new Set(worn);
  const order = keys.map((k, i) => i).filter((i) => keys[i] != null)
    .sort((a, b) => (a === 0 ? -1 : b === 0 ? 1 : String(keys[a]) < String(keys[b]) ? -1 : 1));
  for (const i of order) {
    let n = portraitHash(keys[i]);
    while (taken.has(n) && taken.size < PORTRAIT_COUNT) n = (n + 1) % PORTRAIT_COUNT;
    taken.add(n);
    out[i] = n;
  }
  return out;
};
// Curated easiest→hardest order for the 23 earnable avatars. Live rarity % is
// noisy with sparse data — a hand-ordered list reads as a difficulty ladder,
// and the % stays only in the hover. Ids off the list sort last (defensive).
const AV_ORDER = [
  'chip-1', 'day-one', 'chip-5', 'lvl-10', 'chip-25', 'quads', 'wheel',
  'seven-deuce', 'lvl-20', 'chip-100', 'boat', 'all-in', 'straight-flush',
  'suited', 'cooler', 'five-bills', 'lvl-30', 'verified', 'jackpot', 'button',
  'the-nuts', 'royal', 'lvl-40',
];
const avRank = new Map(AV_ORDER.map((id, i) => [id, i]));
const avOrderKey = (id) => (avRank.has(id) ? avRank.get(id) : AV_ORDER.length);
// The catalog, grouped by set and ordered easiest→hardest within each set —
// leveling badges together, the chip/pot family together, made hands together,
// signature feats together. This is the dropdown's structure; AV_ORDER above
// still drives the header showcase's rarest/easiest picks.
const AV_GROUPS = [
  { label: 'LEVELS', ids: ['lvl-10', 'lvl-20', 'lvl-30', 'lvl-40'] },
  { label: 'POTS',   ids: ['chip-1', 'chip-5', 'chip-25', 'chip-100', 'five-bills'] },
  { label: 'HANDS',  ids: ['boat', 'suited', 'quads', 'wheel', 'straight-flush', 'royal'] },
  { label: 'FEATS',  ids: ['seven-deuce', 'all-in', 'cooler', 'button', 'verified', 'the-nuts', 'jackpot'] },
  // Time-gated badges you can't earn by playing — being here when it counted.
  // Its own set so it stays distinct as more legacy drops land over time.
  { label: 'LEGACY', ids: ['day-one'] },
];
// XP is lifetime volume wagered. Curve: threshold(L) = 56 * L^2.2 usdc, which
// puts $100k at level 30 and keeps levels arriving (slower) forever after —
// level 50 ~ $307k, level 75 ~ $780k, level 100 ~ $1.4m.
const XP_A = 56, XP_P = 2.2;
const xpThreshold = (L) => Math.round(XP_A * Math.pow(L, XP_P));
const XP_TITLES: [number, string][] = [[50, 'Mythic'], [40, 'Legend'], [30, 'Whale'], [25, 'Crusher'], [20, 'River rat'], [15, 'Shark'], [10, 'Reg'], [5, 'Grinder'], [0, 'Fish']];
/* The level as the gateway states it (`/api/me.level`), with the bar between
   that level and the next drawn from the curve above — the same curve the
   gateway uses, so the two agree; where they ever did not, its figure is the
   one shown, because it is the one that unlocks the level avatars. */
const xpAt = (level, w, title) => {
  const prev = xpThreshold(level), next = xpThreshold(level + 1);
  return {
    level, prev, next,
    pct: Math.round(((Math.max(0, w) - prev) / Math.max(1, next - prev)) * 100),
    title: title || (XP_TITLES.find((t) => level >= t[0]) || [0, 'Fish'])[1],
  };
};
const xpFor = (w) => {
  const v = Math.max(0, w);
  const level = Math.max(1, Math.floor(Math.pow(v / XP_A, 1 / XP_P)));
  const prev = xpThreshold(level), next = xpThreshold(level + 1);
  return {
    level, prev, next,
    pct: Math.round(((v - prev) / Math.max(1, next - prev)) * 100),
    title: (XP_TITLES.find((t) => level >= t[0]) || [0, 'Fish'])[1],
  };
};

const BANNED = ['fuck', 'shit', 'cunt', 'bitch', 'bastard', 'dick', 'cock', 'pussy', 'slut', 'whore', 'nigg', 'fagg', 'retard', 'rape', 'nazi', 'hitler', 'kike', 'spic', 'chink', 'tranny', 'wank', 'twat', 'arse', 'anal', 'porn', 'sex', 'admin', 'moderator', 'suited', 'riverfun', 'support'];
function checkNick(raw) {
  const n = String(raw || '').trim();
  if (n.length < 3) return { ok: false, msg: 'At least 3 characters' };
  if (n.length > 16) return { ok: false, msg: '16 characters max' };
  if (!/^[a-zA-Z0-9._-]+$/.test(n)) return { ok: false, msg: 'Letters, numbers, . _ - only' };
  const flat = n.toLowerCase().replace(/[^a-z]/g, '').replace(/1/g, 'i').replace(/0/g, 'o').replace(/3/g, 'e').replace(/\$/g, 's');
  if (BANNED.some((b) => flat.includes(b))) return { ok: false, msg: 'Pick something else' };
  return { ok: true, msg: 'Saved \u00b7 ' + n, value: n };
}

const SUITG = { s: '\u2660', h: '\u2665', d: '\u2666', c: '\u2663' };
const RANKS = '23456789TJQKA';
const fmt = (n) => (n == null ? 'N/A' : (Math.abs(n % 1) > 0.001 ? n.toFixed(2) : Math.round(n).toLocaleString('en-US')));
/* The same figure counted in big blinds. Two decimal places at MOST — a stack
   is "97.5 bb", never "97.49999999999999" and never "97.50" — so trailing zeros
   go and a round number reads round. `toLocaleString` does both jobs in one
   pass and keeps the thousands separator a four-figure tournament stack needs.
   Below a hundredth of a blind it would print "0", which reads as nothing at
   all where something was actually bet, so that floor is shown as "<0.01". */
const fmtBB = (n) => {
  if (n == null) return 'N/A';
  const r = Math.round(n * 100) / 100;
  if (r === 0 && n > 0) return '<0.01';
  return r.toLocaleString('en-US', { maximumFractionDigits: 2 });
};
// Time left until the jackpot draw, as a live-ticking clock. Weeks show days;
// a short test window shows plain HH:MM:SS. `drawing…` while the draw runs.
/* One row per hand, preferring whichever copy knows more. A row fetched from
   /api/hands carries the server seed and the cards; a row restored from a sync
   carries neither. Same hand, so the fuller one is the one to keep. */
const mergeHistory = (incoming, existing) => {
  const known = new Map();
  for (const h of existing) if (h && h.handId) known.set(h.handId, h);
  return incoming.map((h) => {
    const had = h && h.handId ? known.get(h.handId) : null;
    return had && had.serverSeed && !h.serverSeed ? had : h;
  });
};

const fmtCountdown = (ms) => {
  if (ms == null) return '';
  if (ms <= 0) return 'Drawing…';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (x) => String(x).padStart(2, '0');
  return d > 0 ? `${d}d ${p(h)}:${p(m)}:${p(sec)}` : `${p(h)}:${p(m)}:${p(sec)}`;
};
/* The two ways into the daily draw, in the draw's own numbers: wagering is the
   player's way in, holding $SUITED is the other, and the prize is the same one.
   One sentence, used verbatim on the lobby, the leaderboard and the rules. */
/* The same floor in a subtitle's worth of words. A hand is NOT a ticket —
   tickets scale with volume wagered — and the copy said otherwise for as long
   as it took a player to notice they had played all day and were not entered. */
const jkEntryShort = (jk) => {
  const r = (jk && jk.rules) || {};
  const wager = '$' + (r.minVolumeToEnter != null ? Math.round(Number(r.minVolumeToEnter) / 1e6) : 50);
  return `${wager} wagered in a day enters the jackpot draw`;
};
const jkEntryLine = (jk) => {
  const r = (jk && jk.rules) || {};
  const wager = '$' + (r.minVolumeToEnter != null ? Math.round(Number(r.minVolumeToEnter) / 1e6) : 50);
  const h = r.holders;
  return h
    ? `Wager ${wager} within the day or hold ${pct(h.entryBps)} of $SUITED to be eligible.`
    : `Wager ${wager} within the day to be eligible.`;
};
/* How a holder's chance is worked out, in the same numbers the draw uses. */
const jkHolderRule = (jk) => {
  const h = (jk && jk.rules && jk.rules.holders) || null;
  if (!h) return '';
  const x = (bps) => String(Math.round((bps / 10000) * 100) / 100) + '×';
  return `Holders enter at ${pct(h.entryBps)} of supply and reach full weight at ${pct(h.fullBps)} held `
    + `or ${pct(h.stakedFullBps)} staked, ${x(h.minorWeightBps)} below that. `
    + `Staked tokens count ${x(h.stakedWeightBps)}. `
    + `Holders take at most ${Math.round(h.groupCapBps / 100)}% of the draw, never more than its best single player.`;
};
/* Basis points as a percentage. `pct` is the bare figure, which is what a
   sentence about $SUITED wants; `pctOfSupply` spells out what it is a share of. */
const pct = (bps) => {
  const p = bps / 100;
  return (p < 1 ? String(Math.round(p * 100) / 100) : String(p)) + '%';
};
const pctOfSupply = (bps) => pct(bps) + ' of supply';
/* A tournament's own clock, in the two units that actually matter to a player:
   when can I register, and when does it start. Coarse at distance and precise
   near the deadline — `3d 04h` reads at a glance, `4m 12s` is what you watch. */
const fmtShort = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (x) => String(x).padStart(2, '0');
  if (d > 0) return `${d}d ${p(h)}h`;
  if (h > 0) return `${h}h ${p(m)}m`;
  if (m > 0) return `${m}m ${p(sec)}s`;
  return `${sec}s`;
};
/* Once an event is past registering, the state IS the status line. */
const T_STATE_LABEL = {
  locked: 'starting…', running: 'In progress', final_table: 'Final table',
  complete: 'finished', cancelled: 'cancelled',
};
/* The one clock both the list rows and the detail screen read, so a row and the
   screen it opens can never disagree. Mirrors the gateway's own `transition`
   (services/gateway/src/tournament-model.ts): scheduled counts to openAt, then
   registering counts to startAt, and every later state is a plain label.
   `urgent` is the cue to switch the row to the accent colour near a deadline. */
/* The ladder's opening levels, for the hero when no event is scheduled and so
   none can supply its own. These five are DEFAULT_BLINDS[0..4] verbatim from
   services/gateway/src/tournament-model.ts — the ladder every event created so
   far is built on. An event that carries its OWN blinds shows those instead;
   this is only ever the no-event fallback. */
const DEFAULT_BLINDS_PREVIEW = [[50, 100, 0], [75, 150, 0], [100, 200, 0], [125, 250, 50], [150, 300, 60]];

const tCountdown = (state, openAt, startAt, now) => {
  const t = now || Date.now();
  if (state === 'scheduled' && openAt != null) {
    const ms = openAt - t;
    return ms <= 0
      ? { label: 'Registration opening…', clock: false, urgent: true }
      : { label: `Registration opens in ${fmtShort(ms)}`, clock: true, urgent: ms <= 60_000 };
  }
  if (state === 'registering' && startAt != null) {
    const ms = startAt - t;
    return ms <= 0
      ? { label: 'Starting…', clock: false, urgent: true }
      : { label: `Starts in ${fmtShort(ms)}`, clock: true, urgent: ms <= 120_000 };
  }
  return { label: T_STATE_LABEL[state] || '', clock: false, urgent: false };
};
/* Part 4 Task 3 — tournament session controller cadences. The seated poll runs
   at 2s, tightening to ~1s at the bubble (remaining ≤ payouts+1) where one
   elimination moves money and the HUD must feel live. A table move / auto-seat
   shows a short courtesy countdown, then AUTO-advances — the field never waits
   on the client (server-side moves + auto-fold), so this only ever warns. */
const TSESS_POLL_MS = 2000, TSESS_POLL_FAST_MS = 1000, TSESS_MOVE_MS = 4000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/**
 * Bet sizes snap to a cent, not to a dollar.
 *
 * The action bar works in floating-point dollars, and rounding to whole ones
 * made a 1c/2c table unplayable: the slider's whole range — 0.04 to 2.00 —
 * collapsed to 0, 1 and 2, and half-pot, two-thirds-pot and pot all rounded to
 * 0 preflop and clamped to the same min-raise. A cent is the granularity USDC
 * is quoted in, so this needs to know nothing about the blinds to be right at
 * every stake. It also clears the float noise that would otherwise send
 * 0.06999999999999999 to a server that quietly re-clamps it.
 */
const snapMoney = (v) => Math.round(v * 100) / 100;
// Bet sizing snaps to a cent at a cash table, but to a whole CHIP at a
// tournament table — a chip has no fractional unit, so "raise 275.5" is wrong.
const snapBet = (v, isChips) => (isChips ? Math.round(v) : snapMoney(v));
/** Where the thumb sits, as a percentage. Degenerate range pins it to the end. */
const buyPct = (v, lo, hi) => (hi <= lo ? 100 : clamp(((v - lo) / (hi - lo)) * 100, 0, 100));
const usd = (n) => '$' + (Math.abs(n % 1) > 0.001 ? n.toFixed(2) : String(n));
const stakes = (t) => `${usd(t.sb)}/${usd(t.bb)}`;
// Micro-USDC → the profile funding card's amount-field convention ('25.00'),
// or '' when there's nothing to withdraw. Shared by every route into the
// tournament results screen so the withdraw field opens pre-filled with the
// payout, exactly like a hand-typed deposit/withdraw amount.
const usdcToStr = (payout) => (payout != null && Number(payout) > 0) ? (Number(payout) / 1e6).toFixed(2) : '';
const parseId = (id) => ({ r: RANKS.indexOf(id[0]), s: id[1] });
/* A card as text, for the hand log and the history screen — the ten spelled
   "10" the way it is printed on the card itself. `RANKS` stays single-character
   because it is how a card is identified, not how it is shown; see rankLabel in
   engine/card-view.ts. The crown-highlight id sets below use RANKS directly and
   must keep doing so. */
const cardText = (id) => { const c = parseId(id); return SUITED.cardView.rankLabel(c.r) + SUITG[c.s]; };
const stamp = () => new Date().toTimeString().slice(0, 8);

/* ── URL routing ──────────────────────────────────────────────────────────
   The app is one page; the router keeps the address bar in step with the screen
   so links share, a refresh lands where you were, and Back/Forward work. It is
   pure client-side history — no per-screen server round trip — and the server
   serves the app for every path (the SPA fallback). `PATH_OF`/`SCREEN_OF` map
   the plain screens both ways; the table and a private room carry an id in the
   path. A room slug may be none of the reserved words, which is what lets
   `/<slug>` be bare without ever shadowing a screen or a static asset. */
const PATH_OF = { lobby: 'lobby', leaderboard: 'leaderboard', history: 'hands', profile: 'profile', settings: 'settings', connect: 'connect', tournaments: 'tournaments', staking: 'staking' };
const SCREEN_OF = { lobby: 'lobby', leaderboard: 'leaderboard', hands: 'history', profile: 'profile', settings: 'settings', connect: 'connect', tournaments: 'tournaments', staking: 'staking' };
const RESERVED_SLUGS = new Set([
  'landing', 'home', 'lobby', 'leaderboard', 'hands', 'history', 'profile',
  'connect', 'table', 'seat', 'docs', 'staking', 'about', 'terms', 'privacy',
  'api', 'ws', 'admin', 'settings', 'r', 'room', 'rooms', 'tournaments',
  'static', 'assets', 'fonts', 'engine', 'favicon.ico', 'index.html', 'support.js',
]);

// A room slug is only ever what the gateway mints: lowercase alphanumerics and
// hyphens, 3–31 chars, first char not a hyphen. Mirrors `SLUG_RE` in
// services/gateway/src/rooms.ts — the client routes `/<slug>` on the same rule,
// so a path that could never be a slug (a stray `/Suited.dc.html`, anything with
// a dot, a too-short or too-long segment) is not mistaken for a real room link.
const SLUG_RE = /^[a-z0-9][a-z0-9-]{2,30}$/;

// A tournament id is exactly what newTournamentId mints: 10 lowercase hex chars
// (services/gateway/src/tournament-model.ts). Mirrors `PID` in
// services/gateway/src/tournaments-api.ts, so `/tournaments/<junk>` is not
// mistaken for a real event and never fires a doomed detail fetch.
const TOURNEY_ID_RE = /^[0-9a-f]{10}$/;

const FIELD_ART = '#7d4cf0', FIELD_RED = '#f33f5d';
const FIELD_SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'];

// Stable per-cell noise. Seeds travel with their column, so the texture scrolls
// with the content and no band edge ever shimmers between frames.
function fieldHash(a, b) {
  let h = (a ^ Math.imul(b + 0x9e37, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2545f491) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

// Eleven discrete bands, each with its own glyph AND its own alpha, so weight
// carries the shading as well as glyph density. The steps must stay hard — a
// smooth gradient here reads as blur, not contour.
function fieldBand(d) {
  if (d < -9) return 0;
  if (d < -6.5) return 1;
  if (d < -4.5) return 2;
  if (d < -3) return 3;
  if (d < -1.8) return 4;
  if (d < -0.6) return 5;
  if (d < 0.8) return 6;
  if (d < 2.2) return 7;
  if (d < 3.8) return 8;
  if (d < 5.6) return 9;
  if (d < 7.5) return 10;
  return -1;
}
const FIELD_GLYPH = ['#', '#', 'X', 'x', '+', '=', '=', '-', ':', '.', '.'];
const FIELD_ALPHA = [0.95, 0.82, 0.74, 0.66, 0.58, 0.52, 0.46, 0.4, 0.33, 0.26, 0.18];

// One scrolling band of ASCII terrain, drawn into its own canvas.
//
// The canvas only ever redraws the handful of columns entering at the right
// edge; the scroll itself is a self-blit plus a CSS transform for the fraction
// of a cell in between. Per frame that is one style write, which is what makes
// it smooth at any refresh rate — sub-pixel drawImage gets snapped by the
// browser and stutters at these speeds.
class Layer {
  /* Assigned in methods rather than at construction, as they were in the
     original JavaScript. Declared, not initialised — no runtime effect. */
  declare H: any;
  declare K: any;
  declare W: any;
  declare alphaMul: any;
  declare amp: any;
  declare ampMul: any;
  declare baseRow: any;
  declare ch: any;
  declare cols: any;
  declare cv: any;
  declare cw: any;
  declare dpr: any;
  declare fs: any;
  declare g: any;
  declare h: any;
  declare phase: any;
  declare rows: any;
  declare seed: any;
  declare speedMul: any;
  declare suit: any;
  declare suits: any;
  declare yOff: any;


  constructor(cv, opts) {
    this.cv = cv;
    this.g = cv.getContext('2d');
    Object.assign(this, opts);   // ampMul, alphaMul, K, suits, speedMul
    this.phase = 0;
  }

  layout(W, H, dpr, fs, density) {
    this.W = W; this.H = H; this.dpr = dpr; this.fs = fs;
    const g = this.g;
    // measure before resizing — a resize resets the context, including the font
    g.font = fs + 'px ' + MONO;
    const adv = g.measureText('#').width || fs * 0.6;
    // Quantise the cell to whole device pixels. advance() blits by a rounded
    // integer while step() positions with the exact width, so any fractional
    // remainder accumulates every column until the blitted body of the field
    // sits off the grid the new right-edge columns are drawn on.
    this.cw = Math.round(adv * 1.9 * dpr) / dpr;
    this.ch = this.cw;
    // The canvas has to be as wide as the whole grid. Sizing it to the viewport
    // means columns entering on the right are drawn past its edge and are simply
    // lost — the field then scrolls into blank space.
    this.cols = Math.ceil(W / this.cw) + this.K + 6;
    this.rows = Math.ceil(H / this.ch) + 2;
    const cssW = this.cols * this.cw;
    this.cv.style.width = cssW + 'px';
    this.cv.width = Math.round(cssW * this.dpr);
    this.cv.height = Math.round(H * dpr);
    this.baseRow = Math.round(this.rows * 1.02);
    this.amp = this.rows * this.ampMul * density;
    this.build();
    this.render(0, this.cols - 1);
    this.cv.style.transform = 'translate3d(0,0,0)';
  }

  walk(v) {
    let n = v + (Math.random() - 0.5) * this.amp * 0.34;
    if (Math.random() < 0.08) n += (Math.random() - 0.5) * this.amp;   // a big pot, won or lost
    return clamp(n, 0.6, this.amp * 1.4);
  }

  newSuit() {
    const g = FIELD_SUITS[(Math.random() * 4) | 0];
    return { g, c: g === '\u2665' || g === '\u2666' ? FIELD_RED : ACC2 };
  }

  build() {
    const n = this.cols;
    this.h = new Float32Array(n);
    this.seed = new Int32Array(n);
    this.suit = new Array(n).fill(null);
    let v = this.amp * 0.5;
    for (let i = 0; i < n; i++) {
      v = this.walk(v);
      this.h[i] = v;
      this.seed[i] = (Math.random() * 2147483647) | 0;
      if (this.suits && Math.random() < 0.05) this.suit[i] = this.newSuit();
    }
  }

  render(c0, c1) {
    const g = this.g, h = this.h, K = this.K;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.font = this.fs + 'px ' + MONO;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = FIELD_ART;
    let curA = -1;

    for (let c = c0; c <= c1; c++) {
      const x = c * this.cw + this.cw * 0.5;
      const hc = h[c];
      const topRow = this.baseRow - Math.round(hc);
      const seed = this.seed[c];

      for (let r = 0; r < this.rows; r++) {
        const up = this.baseRow - r;
        // distance to the skyline surface only — everything under it is mass,
        // so stacks have solid cores that dissolve upward into contours
        let best = Infinity;
        for (let k = -K; k <= K; k++) {
          const i = c + k;
          if (i < 0 || i >= this.cols) continue;
          const dy = up - h[i];
          const dd = k * k + dy * dy;
          if (dd < best) best = dd;
        }
        const d = (up <= hc ? -Math.sqrt(best) : Math.sqrt(best)) + (fieldHash(seed ^ 0x5bd1, r) - 0.5) * 1.1;
        const b = fieldBand(d);
        if (b < 0) continue;
        // Two stable dithers. The first keeps holes even in the solid cores so
        // the field breathes; the second dissolves the feather into loose dots.
        if (fieldHash(seed ^ 0x2f11, r) > 0.54) continue;
        if (d > 0.4 && fieldHash(seed ^ 0x1b7f, r) > 1 - (d - 0.4) / 4.5) continue;

        // the far layer sits half a cell down, so its glyphs never land exactly
        // on the near layer's and read as one crowded grid
        const y = (r + this.yOff) * this.ch + this.ch * 0.5;
        if (this.suits && this.suit[c] && r === topRow) {
          g.globalAlpha = 0.9;
          g.fillStyle = this.suit[c].c;
          g.fillText(this.suit[c].g, x, y);
          g.fillStyle = FIELD_ART;
          curA = -1;
          continue;
        }
        const a = Math.round(FIELD_ALPHA[b] * this.alphaMul * 20) / 20;
        if (a !== curA) { g.globalAlpha = a; curA = a; }
        g.fillText(FIELD_GLYPH[b], x, y);
      }
    }
    g.globalAlpha = 1;
  }

  advance() {
    const n = this.cols, K = this.K;
    this.h.copyWithin(0, 1);
    this.h[n - 1] = this.walk(this.h[n - 2]);
    this.seed.copyWithin(0, 1);
    this.seed[n - 1] = (Math.random() * 2147483647) | 0;
    if (this.suits) { this.suit.shift(); this.suit.push(Math.random() < 0.05 ? this.newSuit() : null); }

    const g = this.g, cv = this.cv;
    const px = Math.round(this.cw * this.dpr);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'copy';
    g.drawImage(cv, px, 0, cv.width - px, cv.height, 0, 0, cv.width - px, cv.height);
    g.globalCompositeOperation = 'source-over';
    const c0 = Math.max(0, n - (K + 2));
    g.clearRect(Math.floor(c0 * this.cw * this.dpr), 0, cv.width, cv.height);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.render(c0, n - 1);
  }

  step(dt, ms) {
    this.phase += dt / (ms * this.speedMul);
    let guard = 0;
    while (this.phase >= 1 && guard++ < 4) { this.phase -= 1; this.advance(); }
    this.cv.style.transform = 'translate3d(' + (-this.phase * this.cw).toFixed(2) + 'px,0,0)';
  }
}

export default class SuitedApp extends React.Component<any, any> {
  /* Assigned in methods rather than at construction, as they were in the
     original JavaScript. Declared, not initialised — no runtime effect. */
  declare R: any;
  declare _achKnown: any;
  declare _achReadyAt: any;
  declare _crownHand: any;
  declare _crownIds: any;
  declare _docsMounted: any;
  declare _docsRenderedSlug: any;
  declare _docsSpy: any;
  declare _jkWinTold: any;
  declare _lastPath: any;
  declare _noCrown: any;
  declare _pill: any;
  declare _raiseW: any;
  declare _rebuy: any;
  declare _rebuyLock: any;
  declare _resuming: any;
  declare _seatConfirmedAt: any;
  declare _sessionDead: any;
  declare _walletChain: any;
  declare _srvSittingOut: any;
  declare _stakingPainted: any;
  declare _tDue: any;
  declare _tickFor: any;
  declare _tw: any;
  declare _twCtx: any;
  declare adapter: any;
  declare backEl: any;
  declare cardApplied: any;
  declare cardCoarse: any;
  declare cardEl: any;
  declare cardLast: any;
  declare cardMeasured: any;
  declare cardOn: any;
  declare cardP: any;
  declare cardRaf: any;
  declare cardReduced: any;
  declare cardTarget: any;
  declare ctaEl: any;
  declare ctaRect: any;
  declare docsBodyEl: any;
  declare docsNavEl: any;
  declare docsScrollEl: any;
  declare feltEl: any;
  declare feltRO: any;
  declare fieldLast: any;
  declare fieldOn: any;
  declare fieldRaf: any;
  declare fieldReduced: any;
  declare frontEl: any;
  declare fundHistToken: any;
  declare hasPointer: any;
  declare jkTimer: any;
  declare layers: any;
  declare measureCta: any;
  declare mx: any;
  declare my: any;
  declare onCardLeave: any;
  declare onCardMove: any;
  declare onDocClick: any;
  declare onFieldResize: any;
  declare onFieldVis: any;
  declare onPop: any;
  declare onVis: any;
  declare peelRef: any;
  declare pendingArrivals: any;
  declare railAutoClosed: any;
  declare railTouched: any;
  declare sealedEl: any;
  declare server: any;
  declare sound: any;
  declare stakingEl: any;
  declare stkTimer: any;
  declare tMineTimer: any;
  declare tNowTimer: any;
  declare tSessTimer: any;
  declare unsub: any;
  declare unsubWallet: any;
  declare verifiedEl: any;
  declare volStart: any;
  declare wallet: any;


  /* The editor's prop panel used to supply these; they are the component's
     defaults now, at the values the page shipped with. Declared inside the
     class rather than assigned to it afterwards — React 19's types no longer
     describe defaultProps as a writable static. */
  static defaultProps = {
    "pace": 1,
    "squeeze": false,
    "soundDefault": true,
    "volume": 0.15,
    "cardBack": "hatch",
    "density": "calm",
    "startScreen": "landing",
    "cardState": "proximity",
    "revealRadius": 460
  };

  render() {
    const templateVals = { ...this.props, ...(this.renderVals() || {}) };
    return (
      <div id="dc-root">
        <div className="sc-host" data-sc-name="Suited">
          <SuitedTemplate v={templateVals} />
        </div>
      </div>
    );
  }

  state: any = {
    screen: this.props.startScreen || 'landing',
    docSlug: null,
    ready: false,
    compact: false,
    /* The two shapes a phone gives the table (see `onResize`). `mini` is a
       phone on its side: the felt takes the whole screen and the controls sit
       over its bottom corners. `upright` is a phone held upright — any
       narrow, tall window — where the landscape table cannot be drawn at a
       size anyone can read, so the felt is laid out on end instead (TALL). */
    mini: false,
    upright: false,
    scale: 1,
    // The measured felt. Every seat position is a fraction of this, so it is
    // seeded with a plausible size rather than zero — one frame of seats piled
    // in the top-left corner before the observer fires reads as a broken table.
    felt: { w: 980, h: 600 },
    wallet: null,
    approving: null,
    connectStep: 0,
    /* Which chain the connect screen is showing wallets for. Null means the
       player has not chosen, in which case renderVals picks the chain that
       actually has a wallet installed — landing someone on an empty list
       because they happen to run Phantom and not MetaMask would be a poor
       first impression of a site that supports both. */
    connectChain: null as 'evm' | 'solana' | null,
    roomsAt: 0,           // bumped when the live table list arrives
    walletBalance: null,  // tokens in the connected wallet, ready to deposit
    me: null,             // /api/me: identity plus real play stats
    meErr: false,         // ...and whether the last attempt to read it FAILED
    rb: null,             // /api/rakeback: claimable balance and current rate
    rbBusy: false,
    rbTx: null,           // explorer link for the last rakeback redemption
    fundDraft: '',        // profile deposit/withdraw amount
    fundBusy: false,
    fundNote: '',
    fundBad: false,
    // The explorer link for the last deposit or withdrawal, so the receipt
    // outlives the toast that announced it. Null on a build with no explorer.
    fundTx: null,
    // Deposits and withdrawals for the profile. Null means "this session has no
    // history to show" (not Solana, or never asked) and hides the section;
    // loading and failed are their own flags for the reason `meErr` is.
    sessionErr: false,    // the reload's /api/me failed with the token still good
    fundHist: null,
    fundHistBusy: false,
    fundHistErr: false,
    fundHistAll: false,   // past the first few rows
    stats: null,         // /api/stats: real site numbers, never placeholders
    tournaments: [],       // /api/tournaments: joinable events, with your registered flag when signed in
    tMine: [],             // /api/tournaments/mine: this caller's own registrations (pollMine) — feeds the list rows and "your events"
    tournamentBusy: {},    // { [id]: true } for tournaments mid register/unregister — a map, not a
                            // scalar, so registering A while B is still in flight doesn't un-busy A
    tournamentError: '',   // last register/unregister failure, shown inline on the list
    tFilter: 'all',        // schedule filter: 'all' (scheduled + registering) | 'open' (registering only)
    tournamentDetail: null,     // /api/tournaments/:id: the loaded detail object for the open tournament
    // The FEATURED event's detail, for the tournaments hero. Separate from
    // `tournamentDetail` so browsing an event never disturbs the hero and
    // vice versa — they are two different tournaments most of the time.
    tFeatDetail: null,
    tournamentDetailId: null,   // which tournament id the detail screen is open on
    /* Part 4 Task 3 — the in-event session controller. `tSession` is the state
       machine that follows a registered player lobby → seat → moves → bust/win.
       `tSessionDetail` is the SEATED poll's /api/tournaments/:id payload — the
       HUD source (Task 4), deliberately distinct from `tournamentDetail` (the
       browsed screen) so browsing event X while seated in Y never clobbers the
       HUD. `tournamentResult` is the finished registration routed on bust/win. */
    tSession: null,             // { tournamentId, tableId, status:'seated'|'moving'|'busted'|null, moveTo, countdownAt, pauseReason, seatNo }
    tSessionDetail: null,       // last /api/tournaments/:id from the seated poll (HUD source, Task 4)
    tournamentResult: null,     // finished registration handed to the results screen (Task 5 renders it)
    lbPeriod: 'week',     // leaderboard window: 'week' (today) | '7d' | 'all'
    lbStake: null,        // leaderboard stake filter: null = all stakes, else a stake id
    lb: null,             // last /api/leaderboard payload
    lbErr: false,         // ...and whether the last read of it failed
    tourErr: false,       // same, for the tournament schedule
    lbLimit: 20,          // how deep the board is fetched — "show more" raises it to 100
    lbView: 'rankings',   // leaderboard sub-view: 'rankings' | 'jackpot' | 'records'
    jk: null,             // last /api/jackpot payload (jackpot + records views)
    stk: null,            // last /api/staking payload (the staking page)
    stkMine: null,        // this wallet's positions/earned/balance, read from the contract
    stkDraft: '',         // the stake amount being typed
    stkTier: 3,           // which lock is selected (the longest, by default)
    stkBusy: false,       // a staking transaction is in flight
    stkErr: '',           // the last staking failure, in words
    // The last successful staking action as `{ label, explorer }` — a lock, a
    // claim, a withdrawal. The action sheet closes itself on success, so the
    // receipt is kept here and shown on the page rather than lost with it.
    stkReceipt: null,
    connectReturn: null,  // a screen to go back to after connecting, when it was not the table
    jkVoucher: null,      // this wallet's own claimable jackpot voucher, or null
    jkVerify: {},         // per drawn day: { busy, out, err } from re-running that draw here
    jkClaiming: false,    // a claim tx is in flight
    jkClaimMsg: '',       // last claim outcome, shown under the claim button
    jkClaimTx: null,      // explorer link for that claim — the proof, beside the word
    now: Date.now(),      // ticks each second while the leaderboard is open — drives the jackpot countdown
    chain: null,          // /api/chain: { enabled, minDeposit, … }
    depositDraft: '',
    depositing: false,
    balance: 2480.5,
    seated: false,
    session: null,
    pendingTable: 'nl200-01',   // seats open, by default
    table: null,
    log: [],
    fx: { arrived: {}, flipped: {}, peel: null, fly: null, celebrate: null, callout: null, winHide: false },
    betTo: 0,
    railTab: 'log',
    chat: [],           // table talk, per sitting — cleared when the table opens
    chatDraft: '',
    chatUnread: false,  // a line arrived while another rail tab was up
    walletMenu: false,
    moreMenu: false,
    copied: false,      // brief "copied" confirmation on the address
    avatarMenu: false,  // the avatar picker, behind the face on the profile
    achMenu: false,     // the full achievements catalog, behind the showcase
    nickEditing: false, // the name is being edited in place
    nickHover: false,   // hovering your own name, so the pencil shows
    /* Action hotkeys (f / c / r / a / space). A device preference, not an
       account one, so it lives in localStorage — the one client-side value
       this app keeps, because "my keys fold hands" follows the keyboard, not
       the wallet. Off until you ask for it: a key that folds a hand is a
       sharp edge to hand someone who hasn't opted in. Absent or unreadable
       storage means off. */
    hotkeys: (() => { try { return localStorage.getItem('suited:hotkeys') === 'on'; } catch { return false; } })(),
    /* How money reads on the felt: dollars, or counted in big blinds. A device
       preference like `hotkeys` for the same reason — which unit you think in
       follows the screen you play on, not the wallet you play with. It only
       ever changes amounts that HAVE a big blind (the table, the hand log, a
       hand's net, a stake's average pot); a bankroll, a deposit and a rakeback
       balance belong to no table and stay in dollars under either setting. */
    amountUnit: (() => { try { return localStorage.getItem('suited:amount-unit') === 'bb' ? 'bb' : 'usd'; } catch { return 'usd'; } })(),
    /* Which table is drawn under the game (@/lib/table-styles). A device
       preference like the two above: it is what this screen looks like, and
       nobody else at the table sees it. */
    tableStyle: storedTableStyle(),
    // And which back the face-down cards wear (@/lib/card-backs), for the same reason.
    cardBackStyle: storedCardBack(),
    playersOnline: 0,
    /* Private rooms. `room*` back the join screen a shared `/<slug>` link lands
       on; `cr*` back the create-a-room modal, and `createdRoom` flips that modal
       to a share-the-link view once the room exists. */
    roomSlug: null, roomInfo: null, roomPin: '', roomMsg: '', roomBad: false, roomBusy: false,
    // The private room this player HOSTS (slug + table id), or null — set from any
    // room response that comes back isHost. Gates the "end the session" control and
    // survives a refresh (a host re-entering via the pin screen is told isHost).
    hostRoom: null, closeRoomOn: false, roomClosing: false, closeRoomMsg: '', closeRoomBad: false,
    createRoomOn: false, createdRoom: null, crCopied: false,
    crName: '', crSb: '', crBb: '', crMin: '', crMax: '', crSeats: '6', crPin: '',
    crMsg: '', crBad: false, crBusy: false,
    // null means "not chosen yet", which defaults to the table maximum the
    // bankroll can cover. Distinct from 0, which would be an explicit choice.
    buyIn: null,
    dragBuy: false,
    // Busting raises a funding modal over the felt. `rebuyDismissed` folds it
    // into a small "buy back in" pill so a busted player can watch; it can only
    // ever be true while still broke, since the sole ways out — rebuy or leave —
    // both clear it. `dragRebuy` is the modal slider's own pointer flag.
    rebuyDismissed: false,
    // Set the instant "rebuy" is clicked, so the modal closes on that one click
    // rather than lingering until the server's next projection clears heroBroke
    // (a round-trip that made the click feel dead and invited a second, locked
    // one). Cleared the moment the bust actually resolves, so a later bust still
    // raises the modal.
    rebuyPending: false,
    dragRebuy: false,
    railOpen: true,
    expanded: null,
    verified: {},
    history: [],
    toasts: [],
    celebrations: [], // achievements just unlocked, shown as a live celebration
    pace: this.props.pace ?? 1,
    muted: !(this.props.soundDefault ?? true),
    volume: this.props.volume ?? 0.15,
    preAction: null,
    sittingOut: false,
    avatar: 'index-as',
    wagered: 42000,
    nick: null,
    nickDraft: '',
    nickMsg: '',
    nickOk: false,
    drag: null,
  };

  // Sound is only ever a cue for something you can see. If the table is not the
  // visible screen, the only thing that makes a noise is the your-turn ping.
  /* Sound is a cue for YOUR hand. Every one of these has to hold:
     you are seated (spectating is silent), the felt is the visible screen, the
     tab is focused, and a hand actually exists. Checked at play time, not at
     schedule time, because a queued cue can land after any of them changed. */
  sfx(n) {
    if (!this.sound || !n) return;
    if (!this.state.seated) return;
    if (this.state.screen !== 'table') return;
    if (document.visibilityState !== 'visible') return;
    if (!this.state.table) return;
    this.sound.play(n);
  }

  // Deliberate UI confirmations (deposit, unmute) are the player's own action,
  // so they are allowed anywhere — but they still respect mute.
  uiSfx(n) { if (this.sound) this.sound.play(n); }

  // one render per whole second, only while a clock is running
  tickTimer = null;
  startTicker() {
    clearInterval(this.tickTimer);
    const step = () => {
      const t = this.state.table;
      const cl = t && t.clock;
      if (!cl) { clearInterval(this.tickTimer); this.tickTimer = null; if (this.state.secsLeft != null) this.setState({ secsLeft: null }); return; }
      const left = Math.max(0, Math.ceil((cl.startedAt + cl.duration - Date.now()) / 1000));
      if (left !== this.state.secsLeft) this.setState({ secsLeft: left });
      if (left <= 0) { clearInterval(this.tickTimer); this.tickTimer = null; }
    };
    this.tickTimer = setInterval(step, 200);
    step();
  }

  /* ── landing ASCII field ──────────────────────────────────────────────
     Driven entirely by the canvas refs, so it starts when the landing screen
     mounts and tears down when the user navigates away.                    */
  backRef = (el) => { this.backEl = el; this.syncField(); };
  frontRef = (el) => { this.frontEl = el; this.syncField(); };

  syncField() {
    const want = !!(this.backEl && this.frontEl);
    if (want === !!this.fieldOn) return;
    this.fieldOn = want;
    if (want) this.bootField(); else this.teardownField();
  }

  bootField() {
    this.fieldReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Quieter than it was. At full amplitude the skyline reached the top of
    // the viewport, so it read as a wall of glyphs rather than terrain — and
    // the page it sits behind is now mostly white space and one headline.
    this.layers = [
      new Layer(this.backEl, { ampMul: 0.74, alphaMul: 0.15, K: 4, suits: false, speedMul: 2, yOff: 0.5 }),
      new Layer(this.frontEl, { ampMul: 1.0, alphaMul: 0.42, K: 6, suits: true, speedMul: 1, yOff: 0 }),
    ];
    this.onFieldResize = () => this.layoutField();
    this.onFieldVis = () => { if (document.hidden) this.stopField(); else { this.fieldLast = 0; this.startField(); } };
    window.addEventListener('resize', this.onFieldResize);
    document.addEventListener('visibilitychange', this.onFieldVis);
    this.layoutField();
    if (!this.fieldReduced) this.startField();
  }

  teardownField() {
    this.stopField();
    window.removeEventListener('resize', this.onFieldResize);
    document.removeEventListener('visibilitychange', this.onFieldVis);
    this.layers = null;
  }

  stopField() { cancelAnimationFrame(this.fieldRaf); this.fieldRaf = 0; }

  layoutField() {
    if (!this.layers || !this.frontEl) return;
    const host = this.frontEl.parentElement;
    const W = host.clientWidth || window.innerWidth;
    const H = host.clientHeight || window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // Bigger cell, lower crest: fewer, larger glyphs settling into the lower
    // half read as a horizon; small ones filling the frame read as static.
    this.layers.forEach((l) => l.layout(W, H, dpr, W < 760 ? 15 : 14, 0.72));
  }

  startField() {
    if (this.fieldRaf || this.fieldReduced) return;
    const step = (ts) => {
      this.fieldRaf = requestAnimationFrame(step);
      if (!this.fieldLast) { this.fieldLast = ts; return; }
      const dt = Math.min(120, ts - this.fieldLast);
      this.fieldLast = ts;
      if (this.layers) this.layers.forEach((l) => l.step(dt, 450));
    };
    this.fieldRaf = requestAnimationFrame(step);
  }

  /* ── landing hero card ────────────────────────────────────────────────
     The face-down card turns as the pointer approaches the call to action,
     so the commit-then-reveal claim is demonstrated by the thing you are
     about to click rather than described next to it.

     Boots off the refs like the ASCII field above, so no loop runs behind
     the seven screens that do not have this card.                        */
  /**
   * The hero card is a mockup, so its commitment is invented — but it is
   * invented fresh per load rather than baked in, and it stays internally
   * consistent: the strip is the two cards' own fragments joined, which is
   * the shape a real commitment covering both would take. Generated rather
   * than picked from a list so that consistency cannot drift.
   */
  demoCommit = (() => {
    const quad = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
    const [a, b, c, d] = [quad(), quad(), quad(), quad()];
    return { back: `${a}·${b}`, front: `${c}·${d}`, strip: `${a}·${b}·${c}` };
  })();

  cardRef = (el) => { this.cardEl = el; this.syncCard(); };
  ctaRef = (el) => { this.ctaEl = el; this.syncCard(); };
  sealedRef = (el) => { this.sealedEl = el; };
  verifiedRef = (el) => { this.verifiedEl = el; };
  docsNavRef = (el) => { this.docsNavEl = el; };
  docsScrollRef = (el) => { this.docsScrollEl = el; };
  docsBodyRef = (el) => { this.docsBodyEl = el; };
  // The staking page renders itself into this one node (engine/staking-render.js),
  // the same arrangement the docs use: a screen made of numbers and charts is
  // hundreds of lines of markup that nothing else on the site shares.
  stakingRef = (el) => {
    this.stakingEl = el;
    if (el) this.paintStaking();
  };

  syncCard() {
    const want = !!(this.cardEl && this.ctaEl);
    if (want === !!this.cardOn) return;
    this.cardOn = want;
    if (want) this.bootCard(); else this.teardownCard();
  }

  bootCard() {
    this.cardP = 0; this.cardTarget = 0; this.ctaRect = null;
    this.mx = 0; this.my = 0; this.hasPointer = false;
    this.cardApplied = -1;
    this.cardReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Proximity needs a pointer to be near. On a touch screen there is never
    // one, so the card would sit sealed forever and the payoff — the reveal —
    // would only ever exist on desktop. It rests revealed there instead.
    this.cardCoarse = window.matchMedia('(hover: none)').matches;

    // The button's box is read on layout changes, never inside the frame loop.
    this.measureCta = () => { this.ctaRect = this.ctaEl ? this.ctaEl.getBoundingClientRect() : null; };
    this.measureCta();
    this.onCardMove = (e) => { this.mx = e.clientX; this.my = e.clientY; this.hasPointer = true; };
    this.onCardLeave = () => { this.hasPointer = false; };
    window.addEventListener('resize', this.measureCta);
    window.addEventListener('scroll', this.measureCta, { passive: true });
    window.addEventListener('mousemove', this.onCardMove, { passive: true });
    document.addEventListener('mouseleave', this.onCardLeave);
    this.cardRaf = requestAnimationFrame(this.cardStep);
  }

  cardStep = (t) => {
    this.cardRaf = requestAnimationFrame(this.cardStep);
    const dt = Math.min(50, t - (this.cardLast || t));
    this.cardLast = t;

    // The button can move for reasons that fire neither resize nor scroll —
    // zoom, a font swap, stats arriving and growing the row. Refresh at 8Hz.
    if (t - (this.cardMeasured || 0) > 120) { this.measureCta(); this.cardMeasured = t; }

    const mode = this.props.cardState || 'proximity';
    if (mode === 'revealed' || (mode === 'proximity' && this.cardCoarse)) this.cardTarget = 1;
    else if (mode === 'sealed') this.cardTarget = 0;
    else if (this.hasPointer && this.ctaRect) {
      const r = this.ctaRect;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const far = this.props.revealRadius || 460, near = far * 0.28;
      const d = Math.hypot(this.mx - cx, this.my - cy);
      this.cardTarget = Math.max(0, Math.min(1, (far - d) / (far - near)));
    } else this.cardTarget = 0;

    // Frame-rate independent smoothing: the same feel at 60Hz and 120Hz.
    const k = this.cardReduced ? 1 : 1 - Math.pow(0.0022, dt / 1000);
    this.cardP += (this.cardTarget - this.cardP) * k;

    // Settled means settled — otherwise an untouched landing page writes
    // three styles a frame forever.
    const p = this.cardP;
    if (Math.abs(p - this.cardApplied) < 0.0004) return;
    this.cardApplied = p;

    const e = p * p * (3 - 2 * p);
    if (this.cardEl) {
      this.cardEl.style.transform = `rotateY(${(-180 * e).toFixed(3)}deg) rotateX(${(7 - 12 * e).toFixed(3)}deg) translateZ(${(Math.sin(Math.PI * e) * 38).toFixed(2)}px)`;
    }
    if (this.sealedEl) this.sealedEl.style.opacity = Math.max(0, 1 - p * 1.9).toFixed(3);
    if (this.verifiedEl) this.verifiedEl.style.opacity = Math.max(0, (p - 0.58) / 0.42).toFixed(3);
  };

  teardownCard() {
    cancelAnimationFrame(this.cardRaf); this.cardRaf = 0;
    window.removeEventListener('resize', this.measureCta);
    window.removeEventListener('scroll', this.measureCta);
    window.removeEventListener('mousemove', this.onCardMove);
    document.removeEventListener('mouseleave', this.onCardLeave);
  }

  timers = [];
  later(fn, ms) { const t = setTimeout(() => { this.timers = this.timers.filter((x) => x !== t); fn(); }, ms); this.timers.push(t); return t; }
  clearTimers() { this.timers.forEach(clearTimeout); this.timers = []; }

  componentDidMount() {
    this.onResize();
    this.measureStage();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('resize', this.measureStage);
    window.addEventListener('keydown', this.onKey);
    this.onVis = () => this.syncTitle(this.state.table);
    document.addEventListener('visibilitychange', this.onVis);
    // The account menu opens on click now, so something has to close it. A
    // menu you can only dismiss by hitting the same 30px circle again is the
    // kind of thing that gets called broken rather than fiddly.
    this.onDocClick = () => {
      const s = this.state;
      if (s.walletMenu || s.avatarMenu || s.achMenu || s.moreMenu) {
        this.setState({ walletMenu: false, avatarMenu: false, achMenu: false, moreMenu: false });
      }
    };
    document.addEventListener('click', this.onDocClick);
    // Back/Forward: replay whatever the address bar now reads, without pushing a
    // new entry (the path already matches, so `syncUrl` no-ops afterwards).
    this.onPop = () => { if (this.server) this.applyRoute(this.parseRoute(location.pathname)); };
    window.addEventListener('popstate', this.onPop);
    // The engine is imported rather than waited for, so there is no longer a
    // 'suited:ready' race to lose; the two follow-ups that used to be repeated
    // in the late branch are the same two already run just below.
    this.boot();
    // A first render can land directly on docs (deep-link boot, e.g. a refresh
    // on `/docs/<slug>`) — in that case there is no later `componentDidUpdate`
    // to catch the mount, since this IS the initial commit. Covered by the
    // same guard `mountDocs` itself uses, so a normal boot (screen still
    // 'landing' here) simply no-ops.
    if (this.state.screen === 'docs' && !this._docsMounted) this.mountDocs();
    if (this.state.screen === 'staking') { this.paintStaking(); this.loadStaking(); }
  }

  componentDidUpdate(prev) {
    const p = this.props;
    if (prev.soundDefault !== p.soundDefault) {
      const muted = !(p.soundDefault ?? true);
      this.setState({ muted });
      if (this.sound) this.sound.setMuted(muted);
    }
    if (prev.volume !== p.volume && p.volume != null) {
      this.setState({ volume: p.volume });
      if (this.sound) this.sound.setVolume(p.volume);
    }
    // One place catches every screen change: whatever moved the screen, the URL
    // follows. `syncUrl` compares against the address bar and pushes only on a
    // real change, so replays from Back/Forward and boot do not re-push.
    const path = this.routePath();
    if (path !== this._lastPath) { this._lastPath = path; this.syncUrl(); }
    // Docs: fill the containers on entering, tear the scroll-spy observer down
    // on leaving, and follow a slug that changed while already on the screen
    // (Back/Forward into a different section — a same-screen click or the
    // scroll-spy itself already handled their own scrolling and recorded
    // `_docsRenderedSlug`, so this only fires for the Back/Forward case).
    // Staking: the page is one module rendering into one node, so there is no
    // mount/teardown to track — only "is it drawn with the data we have".
    if (this.state.screen === 'staking') this.paintStaking();
    const onDocs = this.state.screen === 'docs';
    if (onDocs && !this._docsMounted) this.mountDocs();
    else if (!onDocs && this._docsMounted) this.teardownDocs();
    else if (onDocs && this._docsMounted && this.state.docSlug !== this._docsRenderedSlug) {
      const body = this.docsBodyEl;
      const target = body && this.state.docSlug && body.querySelector(`#docs-${this.state.docSlug}`);
      if (target) target.scrollIntoView({ block: 'start' });
      this._docsRenderedSlug = this.state.docSlug;
      // Don't rely on the scroll-spy's IntersectionObserver to fix the
      // highlight: a same-viewport jump (target already visible) or a bare
      // `/docs` (docSlug null, so the scroll above is skipped) never triggers
      // it, so the nav would otherwise still show whatever was highlighted
      // before this Back/Forward navigation.
      if (this.docsNavEl && this.R) this.R.docsRender.renderNav(this.docsNavEl, this.state.docSlug, this.gotoDocSection);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('resize', this.measureStage);
    window.removeEventListener('keydown', this.onKey);
    document.removeEventListener('visibilitychange', this.onVis);
    document.removeEventListener('click', this.onDocClick);
    window.removeEventListener('popstate', this.onPop);
    this.unsubWallet && this.unsubWallet();
    this.clearTimers();
    clearInterval(this.tickTimer);
    // Not in `this.timers` (clearTimers only drains setTimeouts), and the
    // second-ticker now issues fetches — a leaked interval leaks traffic.
    clearInterval(this.jkTimer); this.jkTimer = null;
    clearInterval(this.stkTimer); this.stkTimer = null;
    clearInterval(this.tNowTimer); this.tNowTimer = null;
    clearInterval(this.tSessTimer); this.tSessTimer = null;
    clearTimeout(this.tMineTimer); this.tMineTimer = null;
    this.adapter && this.adapter.destroy();
    this.teardownField();
    this.teardownCard();
    this.teardownDocs();
    if (this.feltRO) { this.feltRO.disconnect(); this.feltRO = null; }
    // release the audio context outright — a detached instance that keeps one
    // open stays audible and ignores the new instance's mute
    this.sound && this.sound.destroy();
    this.sound = null;
  }

  /* All this decides now is which set of furniture sizes to use. The felt
     measures itself, so there is no longer a scale factor to compute — that
     was the fixed-stage model, and it is what made a wide window render an
     absurdly large board rather than a wider one. */
  onResize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    const compact = w < 900;
    /* A phone, by the shape of its viewport rather than its user agent. On its
       side it is short — no laptop window anyone plays in is under 520px tall —
       and gets the landscape table with its controls laid over the felt.
       Upright it is narrow and tall, and gets the table stood on end (TALL) —
       as does any window that shape; it is the box that matters, not what is
       holding it. */
    const mini = h < 520 && w > h;
    const upright = w < 700 && h > w;
    setTableLayout(upright, this.state.felt);
    if (compact !== this.state.compact || mini !== this.state.mini || upright !== this.state.upright) {
      this.setState({ compact, mini, upright });
    }
    if (this._docsMounted) this.layoutDocs();
    // A short stacked window cannot hold a playable felt and an open rail at
    // once, so the rail starts closed there — once only, and never after the
    // player has touched the toggle, whose choice outranks the heuristic.
    if ((mini || upright || (compact && h < 640)) && this.state.railOpen && !this.railTouched && !this.railAutoClosed) {
      this.railAutoClosed = true;
      this.setState({ railOpen: false });
    }
  };

  boot() {
    // Never leave a second adapter pumping events, a second wallet pushing
    // balances, or a second AudioContext playing: each remount otherwise adds
    // one more of each, and muting only ever silences the newest.
    if (this.adapter) { this.unsub && this.unsub(); this.adapter.destroy(); this.adapter = null; }
    if (this.unsubWallet) { this.unsubWallet(); this.unsubWallet = null; }
    this.clearTimers();
    clearInterval(this.tickTimer);
    const R = SUITED;
    this.R = R;
    // ── the seam ──────────────────────────────────────────────────────────
    // With a backend configured the game is server-authoritative: the gateway
    // deals, holds the clocks and owns every balance. Without one, the original
    // local demo runs exactly as before. Nothing below this line knows which.
    this.server = serverUrl();
    ROOMS_PENDING = !!this.server && !LIVE_ROOMS;
    this.wallet = this.server
      ? R.wallet.createServerWallet({ endpoint: this.server })
      : R.wallet.createMockWallet({ balance: this.state.balance, avatar: this.state.avatar, wagered: this.state.wagered, nick: this.state.nick });
    this.unsubWallet = this.wallet.subscribe((w) => {
      // A fresh session re-arms sessionDead's latch, or the NEXT expiry would
      // be swallowed for the lifetime of the page.
      if (w.address) this._sessionDead = false;
      // The funding path depends on which chain the session is on: a Solana
      // wallet is funded through /api/sol, not the EVM contract /api/chain
      // describes. Ask again when that changes, so the deposit screen follows.
      const walletChain = w.chain || null;
      if (walletChain !== (this._walletChain || null)) {
        this._walletChain = walletChain;
        if (this.server && this.wallet && this.wallet.chainInfo) {
          this.wallet.chainInfo().then((chain) => this.setState({ chain })).catch(() => {});
        }
      }
      this.detectUnlocks(w);
      this.setState({
        balance: w.balance, walletBalance: w.walletBalance, avatar: w.avatar, wagered: w.wagered,
        achievements: w.achievements, level: w.level,
        wallet: w.address ? { name: w.label, addr: w.address } : null,
      });
    });
    // A refreshed page may have restored a session token; pull the identity and
    // balance behind it so the account chip and bankroll are right on whatever
    // screen the address bar lands on, table or not — and silently re-attach the
    // wallet extension for a returning wallet user, so the next deposit or
    // withdrawal needs no reconnect click.
    if (this.server && this.hasToken()) {
      this.resumeSession();
      this.wallet.resumeWallet && this.wallet.resumeWallet();
      this.checkJackpotWin();
      // Part 4 Task 3: resume an in-flight tournament. If the runtime has a live
      // seat for this player, `pollMine` warns + auto-seats them onto the felt;
      // if they busted while away, it routes to results. Runs on every load, so
      // a refresh mid-event lands the player back where the field left them.
      this.pollMine();
    }
    // Whether this server has custody wired up decides between a real deposit
    // and the faucet. Ask once; if it fails we fall back to the faucet path.
    this.loadStats();
    this.loadLobby();
    if (this.server && this.wallet.chainInfo) {
      this.wallet.chainInfo()
        .then((chain) => {
          this.setState({ chain });
          // Tell the docs which era's words to render (wallet names, token,
          // draw entropy). Default stays EVM until this resolves.
          this.R.docsRender.setDocsChain?.(chain.kind ?? 'evm');
          // And where its contract-address rows should link to. Unset leaves
          // them as the plain, full addresses they already were.
          this.R.docsRender.setDocsExplorer?.(chain.explorerUrl ?? null);
        })
        .catch(() => this.setState({ chain: { enabled: false } }));
    }
    this.sound = R.sound.createSound();   // module-level singleton: closes any predecessor
    this.sound.setMuted(this.state.muted);
    this.sound.setVolume(this.state.volume);
    const t0 = tableById('nl200-01');
    // The demo seeds the history screen with simulated hands so it is never
    // empty. Against a real server the history is whatever was actually dealt.
    const history = this.server
      ? []
      : R.adapter.simulateHands({ seats: seatsFor(t0, t0.max), sb: t0.sb, bb: t0.bb, seed: 771294, heroIdx: 0, hands: 7 });
    // Honour the address bar BEFORE the first render syncs the URL. Applying the
    // route up front lets a shared `/<slug>` link claim the room screen; done
    // after, the landing render's URL sync pushes '/' over the slug first and the
    // room route can never get it back — the recipient lands in the lobby with no
    // pin prompt. `_lastPath` is seeded to the real path so the room URL is not
    // then treated as a change and re-pushed.
    if (this.server) {
      const path = location.pathname;
      this._lastPath = (path || '/').replace(/\/+$/g, '') || '/';
      const route = this.parseRoute(path);
      if (route.screen !== 'landing') this.applyRoute(route, { resume: true });
    }
    this.setState({ ready: true, history, seedHistory: history });
  }

  /* ── session: no table | spectating | seated ────────────────────────────
     Leaving destroys the adapter outright: no hand is running for you, and the
     nav sends you to the lobby instead of a table you are not at.           */
  openTable(tableId, opts) {
    if (!this.R) return;
    // Remote play needs a session before the socket will open. Take a guest
    // identity now; connecting a real wallet later replaces it.
    if (this.server && !this.wallet.token()) {
      this.wallet.connect('guest')
        .then(() => {
          // connect('guest') is meant to leave a session token. If it resolved
          // without one, retrying is both futile and dangerous: each attempt
          // resolves straight into the next with no token, no delay and no cap,
          // so the .catch never fires and the client floods the gateway with
          // /api/auth/dev + /api/me until the tab is closed. One attempt only —
          // a still-absent token is a dead end, so surface it and stop.
          if (!this.wallet.token()) { this.toast('Could not start a guest session', 'bad'); return; }
          this.openTable(tableId, opts);
        })
        .catch((e) => this.toast(String((e && e.message) || e), 'bad'));
      return;
    }
    const tbl = tableById(tableId);
    // A resumed open (a refresh landing back on /table/:id) does not yet know
    // whether the player still holds a seat — the gateway's first projection
    // answers that. `_resuming` is the note to reconcile `seated` to it once.
    this._resuming = !!(opts && opts.resume);
    this._srvSittingOut = null;
    if (this.adapter) { this.unsub && this.unsub(); this.adapter.destroy(); this.adapter = null; }
    this.clearTimers();
    clearInterval(this.tickTimer);
    const heroStack = clamp((opts && opts.buyIn) || tbl.max, tbl.min, tbl.max);
    /* `server` decides where *data* comes from; this decides who runs the table.
       They are usually the same answer, but the offline designer build keeps
       `server` set so every screen loads through its normal path while the table
       itself runs on bots. Nothing sets SUITED_OFFLINE in production. */
    this.adapter = (this.server && !SUITED_OFFLINE)
      ? this.R.adapter.createRemoteAdapter({
          endpoint: this.server,
          // The id the caller asked for, which the server owns — not tbl.id. On
          // a refresh straight to /table/<id> the lobby list has not loaded yet,
          // so tableById() cannot resolve the gateway's random id and falls back
          // to the bare stake id; connecting to that would point the socket at a
          // table that does not exist and hang on "connecting…". The server's
          // sync carries the real stakes, so nothing here needs tbl for a table
          // it could not resolve.
          tableId,
          token: this.wallet.token(),
          maxSeats: 6,
          onError: (msg, code) => {
            // A private room reached with no live pin grant — a refresh after the
            // gateway restarted (grants are in-memory), or the `/table/<id>` URL
            // the address bar shows while seated opened instead of the share
            // link. Tear down the dead socket and send them through the room's
            // pin screen, rather than stranding them on a table they cannot join
            // with no way to enter the pin. A live grant (a plain refresh in the
            // same server process) never lands here — the socket syncs and the
            // seat resumes.
            if (code === 'pin_required') {
              if (this.adapter) { this.unsub && this.unsub(); this.adapter.destroy(); this.adapter = null; }
              this.enterRoomByTable(tableId);
              return;
            }
            // The host ended the session (or the room was reaped): the table is
            // gone. Everyone's chips are already back in their bankroll — leave
            // the felt for the lobby rather than sitting on a table that no longer
            // exists. The host's own client lands here too, right after its close.
            if (code === 'room_closed') {
              this.toast(msg || 'This private room has closed', 'ok');
              if (this.adapter) { this.unsub && this.unsub(); this.adapter.destroy(); this.adapter = null; }
              this.closeTable();
              return;
            }
            /* The session's 12h TTL ran out. The adapter has already stopped
               retrying and put the felt behind the expired scrim, so this only
               has to say so out loud — and must NOT tear the adapter down, since
               that scrim is rendered from its view. Leaving the table screen up
               is deliberate: the seat and stack are still there, and signing in
               again from here is a two-click return rather than a re-navigation. */
            /* The table is gone. Only a private room gets `room_closed`;
               `ensureCapacity` retires a surplus public table silently, so this
               is the only notice that ever arrives — and without acting on it
               `session` outlives a table that provably does not exist. */
            if (code === 'no_table') {
              this.toast(msg || 'That table has closed', 'warn');
              this.closeTable();
              return;
            }
            if (code === 'session_expired') {
              this.toast(msg || 'Your session expired, sign in again', 'warn');
              return;
            }
            this.toast(msg, 'bad');
            // A released seat leaves the table screen showing a hand the player
            // is no longer in. Get them out of it rather than letting them try
            // to act on it.
            if (code === 'dropped') {
              /* The drop notice describes the past — "a seat you held was
                 released while you were away". It can arrive on the same
                 attach that precedes a fresh buy-in, and closing the table on
                 it then throws the player out of a seat they are actively
                 taking. If this client believes it is seated, the notice is
                 history, not instruction: keep the toast, keep the table. */
              this.sfx('error');
              if (!this.state.seated) this.closeTable();
            }
          },
          onBalance: (b) => this.wallet.setBalance(b),
        })
      : this.R.adapter.createLocalAdapter({
          seats: seatsFor(tbl, heroStack), sb: tbl.sb, bb: tbl.bb,
          seed: 20260805 + hashId(tbl.id), heroIdx: 0, pace: this.state.pace,
        });
    this.unsub = this.adapter.subscribe(this.onEvent);
    this.setState({
      session: { tableId }, seated: true, sittingOut: false, screen: 'table',
      table: null, log: [], secsLeft: null, preAction: null,
      chat: [], chatDraft: '', chatUnread: false,
      fx: { arrived: {}, flipped: {}, peel: null, fly: null, celebrate: null, callout: null, winHide: false },
    }, this.onResize);
    this.adapter.start();
  }

  closeTable() {
    if (this.adapter) { this.unsub && this.unsub(); this.adapter.destroy(); this.adapter = null; }
    this.clearTimers();
    clearInterval(this.tickTimer);
    this.setState(
      { session: null, seated: false, sittingOut: false, table: null, log: [], secsLeft: null, screen: 'lobby' },
      () => { this.onResize(); this.syncTitle(null); },
    );
  }

  /* Picking a table is the only thing that opens the seat screen. Anyone
     without a wallet, or short of the table minimum, funds up first. */
  /**
   * Seat the player at a stake without letting them choose the table.
   *
   * Table selection is the mechanism behind bum-hunting: given a list, a strong
   * player picks the game with the weakest opponent in it, and that game stops
   * being worth sitting in for everyone else. Assigning the seat removes the
   * choice. Preferring the fullest table with a seat free also concentrates
   * players instead of scattering them across empty felt.
   */
  quickSit = (stakeId) => {
    const at = ROOMS_ALL().filter((r) => r.stake === stakeId && r.open);
    if (!at.length) return this.toast('No open seat at that stake', 'bad');
    const target = at.slice().sort((a, b) => b.seated - a.seated)[0];
    this.sitAt(target.id);
  };

  sitAt = (tableId) => {
    const tbl = tableById(tableId);
    this.setState({ pendingTable: tbl.id });
    if (!this.state.wallet) { this.setState({ screen: 'connect', connectStep: 0 }); return; }
    if (this.state.balance < tbl.min) {
      this.setState({ screen: 'connect', connectStep: 1 });
      // The funding screen leads with "N usdc in your wallet, ready to
      // deposit" \u2014 re-read it on the way in rather than showing the figure
      // from connect time.
      if (this.wallet && this.wallet.refreshWallet) this.wallet.refreshWallet();
      this.toast(`${tbl.name} needs ${fmt(tbl.min)} USDC, top up your bankroll`, 'bad');
      return;
    }
    if (this.wallet && this.wallet.refreshWallet) this.wallet.refreshWallet();
    this.setState({ screen: 'seat' }, () => this.syncTitle(this.state.table));
  };


  /* ── event → state ─────────────────────────────────────────────────── */

  onEvent = (t, e) => {
    const fx = { ...this.state.fx };
    const log = this.state.log;
    const snd = (n) => this.sfx(n);
    const name = (i) => (i === 0 ? 'you' : (t.seats[i] || {}).name || '?');

    // A refresh reopened this table without knowing whether we were seated or
    // just watching. The gateway's first real projection settles it: a held seat
    // comes back as heroIdx 0, a released one (grace elapsed) or a spectator as
    // heroIdx null. Reconcile `seated` to that once, so a reconnect lands back
    // in the seat — or honestly shows the spectator state — rather than a guess.
    if (this._resuming && this.adapter && this.adapter.kind === 'remote' && t && t.connection === 'online') {
      this._resuming = false;
      const holdsSeat = t.heroIdx != null;
      const patch: any = {};
      if (holdsSeat !== this.state.seated) patch.seated = holdsSeat;
      /* And whether that seat is sitting out, for the same reason. `sittingOut`
         is written from nine places in this file and read back from none of the
         server's: `openTable` sets it false on every attach, so standing up and
         then refreshing left the pill reading "sit up" while the server still
         had the seat out — and the first click re-sent `situp`, asking for the
         state it was already in.

         Only on resume, not on every frame. A seat change resolves between
         hands, so between clicking and the server agreeing there is a window
         where the local flag is the intent and the projection is still the old
         truth; reconciling continuously would fight that. This is the one
         moment the client has no intent to defend. */
      const heroSeat = holdsSeat ? (t.seats || [])[0] : null;
      if (heroSeat && !!heroSeat.sittingOut !== this.state.sittingOut) patch.sittingOut = !!heroSeat.sittingOut;
      if (Object.keys(patch).length) this.setState(patch);
    }

    if (e) {
      if (e.t === 'chat' || e.t === 'chat:history') {
        this.setState((s) => ({
          // History replaces: it is the server's authoritative recent window,
          // and the client re-attaches more often than it thinks (sit, resync,
          // reconnect) — appending it again duplicated the whole conversation.
          chat: e.t === 'chat:history' ? e.msgs.slice(-80) : [...s.chat, e].slice(-80),
          // History is context, not news — only a live line lights the tab.
          chatUnread: s.railTab !== 'chat' && e.t === 'chat' ? true : s.chatUnread,
        }));
        if (e.t === 'chat' && e.seat !== 0) this.sfx('ui');
        return;
      }
      if (e.t === 'hand:start') {
        Object.assign(fx, { arrived: {}, flipped: {}, peel: null, fly: null, celebrate: null, callout: null, winHide: false });
        // Any deal still in flight belongs to the hand that just ended.
        this.pendingArrivals = {};
        // An armed pre-action is a decision about *this hand's* betting. It is
        // cleared when it fires (`act`), but a hand that ends before the turn
        // ever reaches you leaves it armed — and check/fold carried into a
        // fresh hand folds a hand you never saw.
        if (this.state.preAction) this.setState({ preAction: null });
        this.pushLog(`-- hand ${e.handId} \u00b7 commit ${String(e.commit).slice(0, 8)}\u2026`, 'meta');
      }
      /* The blind is named in words rather than as `sb`/`bb`. The abbreviation
         was unambiguous while every figure was money; counted in big blinds it
         reads "posts bb 1 bb", where the same two letters mean the blind that
         was posted and the unit it is measured in. */
      if (e.t === 'blind') { snd('chip'); this.pushLog(`${name(e.seat)} posts the ${e.kind === 'bb' ? 'big' : 'small'} blind {0}`, 'dim', [e.amount], t.bb); }
      if (e.t === 'deal:hole') {
        const keys = [];
        for (let k = 0; k < 2; k++) for (const s of e.seats) keys.push(`h${s}-${k}`);
        // ~88ms a card, out of the deck, and your own two turn over 290ms
        // after the last one lands — both from the handoff's motion table.
        this.arrive(keys, 88, 'deal');
        if (!this.props.squeeze) {
          this.later(() => this.flip([`h0-0`, `h0-1`]), 88 * keys.length + 290);
        }
      }
      if (e.t === 'action') {
        snd(e.allIn ? 'allin' : e.type === 'fold' ? 'fold' : e.type === 'check' ? 'check' : e.type === 'call' ? 'chip' : 'bet');
        // `{0}` is the call amount, `{1}` the raise target — the line names the
        // slot rather than the number, so the rail can be re-read in either unit.
        const txt = e.type === 'fold' ? 'folds' : e.type === 'check' ? 'checks'
          : e.type === 'call' ? 'calls {0}' : `${e.type}s to {1}`;
        this.pushLog(`${name(e.seat)} ${e.allIn ? 'is all in \u00b7 {1}' : txt}`, ['bet', 'raise'].includes(e.type) || e.allIn ? 'acc' : 'dim', [e.amount, e.to], t.bb);
      }
      if (e.t === 'street:collect') {
        snd('chips');
        this.fly(e.from.flatMap((f) => {
          const from = SEAT_PX[f.seat].bet;
          return this.flatChips(f.amount, 4).map((d) => ({ from, to: { x: POT.cx, y: POT.cy }, denom: d }));
        }), 760);
      }
      if (e.t === 'street') {
        const base = t.board.length - e.cards.length;
        this.arrive(e.cards.map((c, i) => `b${base + i}`), 108, 'flip');
        this.pushLog(`${e.street}  ${e.cards.map((c) => cardText(c)).join(' ')}`, 'meta');
      }
      if (e.t === 'reveal') {
        // Betting is closed with the field all-in \u2014 the hands are tabled
        // before the runout. The faces themselves come from the projected
        // state (`s.revealed`); this is the sound and the record.
        snd('flip');
        e.reveals.forEach((r) => this.pushLog(`${name(r.seat)} shows ${r.hole.map((c) => cardText(c)).join(' ')} \u00b7 all in`, 'acc'));
      }
      if (e.t === 'showdown') {
        snd('flip');
        e.reveals.forEach((r) => this.pushLog(`${name(r.seat)} shows ${r.hole.map((c) => cardText(c)).join(' ')} \u00b7 ${r.name}`, 'dim'));
      }
      if (e.t === 'award') {
        const heroWin = e.awards.find((a) => a.seat === 0);
        const top = e.awards.slice().sort((a, b) => b.amount - a.amount)[0];
        const monster = top && /full house|four |straight|flush/.test(top.name || '');
        const big = !!top && (top.amount >= 60 || monster);
        /* Showdown, player-first, in order: the winner is crowned and spotlit
           the instant the hand completes (render-driven), the pill names the
           result at +700ms, and only after the celebration — at +2800ms — do the
           chips ship to their plate, the reward converging on the one seat. */
        const isChipTable = !!(this.state.session && String(this.state.session.tableId).startsWith('priv-tt-'));
        const award = () => {
          this.setState((s) => ({
            fx: {
              ...s.fx,
              callout: top ? {
                text: top.name || 'Takes it down',
                // In big blinds the figure carries its own unit, so the trailing
                // "usdg"/"chips" would read "12.5 bb usdg". The blind comes off
                // this event's own projection, like the log's — see `pushLog`.
                amount: `${top.split ? 'Split \u00b7 ' : ''}${this.amt(top.amount, t.bb)}${this.state.amountUnit === 'bb' ? '' : ` ${isChipTable ? 'chips' : 'USDC'}`} to ${name(top.seat)}`,
                win: !!heroWin, big,
              } : null,
            },
          }));
        };
        // Everything lands together, on the *formed* crown. The spotlight and
        // dim fade in over ~240ms; the pill and confetti fire at 240ms — as that
        // finishes — so the burst never precedes the crown it belongs to, yet
        // still reads as one moment. The hero's own wins always get confetti;
        // opponents' only when the pot is worth the fuss.
        this.later(award, 240);
        if (big || heroWin) this.later(() => this.setState((s) => ({ fx: { ...s.fx, celebrate: { at: Date.now() } } })), 240);
        else if (((t.seats[0] || {}).committed || 0) > 30 && (t.seats[0] || {}).revealed) this.later(() => snd('badbeat'), 240);
        snd(big ? 'bigwin' : 'potwin');
        // Then the whole crowning fades out as one — dim, spotlight, crown,
        // lifted cards, pill and confetti, all gated on `winHide` — at +2200ms,
        // and only once it has gone (at +2800ms) do the chips ship, so the pot
        // crosses a clear felt rather than through the burst.
        this.later(() => this.setState((s) => ({ fx: { ...s.fx, callout: null, winHide: true } })), 2200);
        const gp = { x: POT.cx, y: POT.cy };
        this.later(() => this.fly(e.awards.flatMap((a) => {
          const seat = SEAT_PX[a.seat].plate;
          // overshoot past the seat so the motion reads as a shove, not a delivery
          const to = { x: gp.x + (seat.x - gp.x) * 1.12, y: gp.y + (seat.y - gp.y) * 1.12 };
          // The same denominations that made the pot, so the pile that lands
          // equals the pile that left.
          return this.flatChips(a.amount, 22).map((d, k) => ({ from: gp, to, denom: d, dur: 720 + k * 40 }));
        }), 1600), 2800);
        e.awards.forEach((a) => this.pushLog(`${name(a.seat)} wins {0}${a.name ? ' with ' + a.name : ''}`, 'win', [a.amount], t.bb));
      }
      if (e.t === 'hand:end') {
        // The event's own `seats` are hand records with no committed figure,
        // and there is no `e.state` — reading it threw here, once per hand,
        // which took the XP accrual below down with it. The view at this
        // event is the hand's final state, so the figure comes from there.
        const staked = ((t.seats[0] || {}).committed) || 0;
        if (staked > 0 && this.wallet) this.wallet.addWagered(staked); // xp = volume
        // Re-read /api/me after every hand while seated. Busting needs the fresh
        // bankroll immediately (the rebuy control's ceiling); otherwise re-read a
        // beat later — long enough for the server to persist a just-earned
        // achievement — so it reaches the client and detectUnlocks celebrates it.
        // (Without this, a hand you win but survive never refreshed, so the
        // celebration never fired.)
        if (this.state.seated && this.wallet && this.wallet.refresh) {
          if (((t.seats[0] || {}).stack || 0) <= 0) this.wallet.refresh().catch(() => {});
          else setTimeout(() => this.wallet.refresh().catch(() => {}), 900);
        }
        // Clears as the chips start moving, so the pill is gone by the time
        // they cross the felt rather than competing with them.
        this.later(() => this.setState((s) => ({ fx: { ...s.fx, callout: null, celebrate: null } })), 3800);
      }
      if (e.t === 'turn' && e.seat === 0 && this.state.seated) {
        const away = this.state.screen !== 'table' || document.visibilityState !== 'visible';
        if (away) {
          // the only cue allowed to cross screens — and only for a real turn
          if (this.sound) this.sound.play('alert');
          this.toast('Your turn at ' + tableById((this.state.session || {}).tableId).name, 'warn');
        } else snd('turnStart');
        const legal = this.adapter.getLegal();
        this.setState({ betTo: legal ? legal.minRaiseTo : 0 });
        this.later(() => {
          if (this.state.seated && this.state.table && this.state.table.toAct === 0) snd('lowTime');
        }, (t.clock ? t.clock.duration : 20000) * 0.72);
        if (this.state.preAction) this.later(() => this.applyPreAction(legal), 260);
      }
      if (e.t === 'turn' || e.t === 'timebank') this._tickFor = null;   // the tail restarts it, keyed on the new clock
      if (e.t === 'timebank') this.pushLog(`You engage the time bank \u00b7 ${e.seconds}s`, 'acc');
      if (e.t === 'connection') {
        this.pushLog(
          e.status === 'online' ? 'reconnected'
            : e.status === 'expired' ? 'Session expired, sign in again to retake your seat'
            : 'Connection lost, holding your seat',
          'acc',
        );
      }
    }

    /* Cards only ever "arrive" on the event that deals them, which is fine
       while you are watching and wrong the moment you are not. Joining a table
       mid-hand, or reconnecting, delivers a snapshot rather than the events
       that built it — so nothing was ever marked arrived and every card stayed
       face-down at the deck, which is the frozen deal reported from the
       playtest. Anything already on the table is placed without animation:
       a card dealt before you got here has nothing to animate. */
    this.settleDealt(t, fx);

    /* Reconcile our seat against the server's truth. `heroIdx` is null exactly
       when the server has us spectating; `seated` is otherwise an optimistic
       flag that a dropped or raced rejoin would leave stuck true — rendering
       hero controls at a seat the server released, with a bot rotated into it,
       which reads as the app playing for you. A confirmed hero seat keeps (or
       restores) the flag; spectator frames past the sit grace fall back to
       spectating rather than a phantom seat. Remote only — the local demo owns
       its own seat state. */
    const seatPatch: any = {};
    if (this.adapter && this.adapter.kind === 'remote') {
      if (t.heroIdx != null) {
        this._seatConfirmedAt = Date.now();
        if (!this.state.seated) seatPatch.seated = true;
      } else if (this.state.seated && Date.now() - (this._seatConfirmedAt || 0) > SEAT_LOST_MS) {
        seatPatch.seated = false;
      }
      /* Sitting out, the same way — but on the server's *edges*, not its level.
         The resume reconcile above runs once; after it the pill only ever heard
         the player's own clicks, so a seat the gateway sat out by itself (the
         turn clock ran dry on someone away from the keyboard) kept reading
         "Sit up", and the click re-sent `situp` for the state it was already
         in. Comparing every frame would fight the window where a click is the
         intent and the projection is still the old truth; a *change* in the
         projection is the server deciding something, and that is always news.
         A bust is left alone: it sits the seat out too, but the rebuy modal
         owns that state and clears it with its own sit-in. */
      const heroSeat = t.heroIdx != null ? (t.seats || [])[0] : null;
      const srvOut = heroSeat ? !!heroSeat.sittingOut : null;
      // (Not while a rebuy is settling: its own sit-up/sit-down would read
      // here as the server sitting the player out, and say so in a toast.)
      if (srvOut != null && this._srvSittingOut != null && srvOut !== this._srvSittingOut && !this._rebuy
        && srvOut !== this.state.sittingOut && (!srvOut || (heroSeat.stack || 0) > 0)) {
        seatPatch.sittingOut = srvOut;
        if (srvOut) {
          seatPatch.preAction = null;
          this.toast('You were sat out · sit down to be dealt back in', 'warn');
        }
      }
      this._srvSittingOut = srvOut;
      // A rebuy in flight reads every frame: the one that shows the chips on
      // the seat is the cue for its sit-in.
      if (this._rebuy) this.rebuyStep(t);
    }

    /* Merge, do not replace. Two sources fill `history` and they carry
       different things: `loadHands` fetches rows from /api/hands with the
       seed, `dealt`, `revealed` and the money already scaled, while the
       table's own frames carry sparse sync rows. This runs on EVERY table
       frame, so replacing here wiped the fetched rows a moment after they
       arrived and left the history screen with nothing to show or verify.
       Keyed by handId, the richer row wins. */
    const merged = mergeHistory(t.handHistory || [], this.state.history || []);
    this.setState({ table: t, fx, history: merged.concat(this.state.seedHistory || []), ...seatPatch }, () => {
      /* The countdown is started by the `turn` event — and a resume does not
         get one. A refresh always resyncs (`remote.js` omits `since` while
         `lastEventId` is 0) and a sync publishes with a null event, so the
         clock arrived in the state with nothing to start the ticker: the pill
         stayed hidden while the server counted the player down to an auto-fold.
         The stale case is the same bug from the other side — the interval
         clears itself at zero, so the next clock found a dead timer and the
         pill sat on a permanent 0s.

         Keyed on `startedAt` so a new clock always restarts it, and run from
         the setState callback because `step()` reads `this.state.table` and
         would otherwise see the state this call is replacing. */
      const cl = this.state.table && this.state.table.clock;
      if (cl && (!this.tickTimer || this._tickFor !== cl.startedAt)) {
        this._tickFor = cl.startedAt;
        this.startTicker();
      }
    });
    this.syncTitle(t);
  };

  /** Mark as arrived anything the table says is dealt but we never saw land. */
  settleDealt(t, fx) {
    if (!t || t.phase === 'idle') return;
    const arrived = { ...fx.arrived };
    const flipped = { ...fx.flipped };
    let touched = false;
    // A pending arrival is one this client scheduled and has not run yet;
    // clobbering it would cut a deal that is legitimately still in flight.
    const inFlight = this.pendingArrivals || {};
    (t.board || []).forEach((_, i) => {
      const k = `b${i}`;
      if (!arrived[k] && !inFlight[k]) { arrived[k] = 1; flipped[k] = 1; touched = true; }
    });
    (t.seats || []).forEach((s, si) => {
      if (!s || !s.hole) return;
      s.hole.forEach((card, k) => {
        const key = `h${si}-${k}`;
        if (card && !arrived[key] && !inFlight[key]) { arrived[key] = 1; touched = true; }
      });
      // Our own cards are ours to look at; an opponent's stay face-down until
      // they are actually shown.
      if (si === 0 && !this.props.squeeze) {
        [0, 1].forEach((k) => {
          const key = `h0-${k}`;
          if (s.hole[k] && !flipped[key] && !inFlight[key]) { flipped[key] = 1; touched = true; }
        });
      }
    });
    if (touched) { fx.arrived = arrived; fx.flipped = flipped; }
  }

  // the browser tab is the other place a player might be looking
  syncTitle(t) {
    const mine = t && t.toAct === 0 && this.state.seated;
    const want = mine && (this.state.screen !== 'table' || document.hidden) ? '(!) Your turn \u00b7 Suited' : 'Suited \u00b7 onchain hold\u2019em';
    if (document.title !== want) document.title = want;
  }

  /* \u2500\u2500 router \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
     `routePath` is the path the current screen should own; `syncUrl` pushes it
     when it changes (driven from `componentDidUpdate`, so every navigation is
     caught in one place rather than instrumented at each call site). `parseRoute`
     is the inverse, used on boot and Back/Forward. The offline designer never
     owns the URL \u2014 `serverUrl()` is null there \u2014 so the whole router no-ops. */
  routePath() {
    const s = this.state;
    if (s.screen === 'table' || s.screen === 'seat') {
      const id = (s.session && s.session.tableId) || s.pendingTable;
      return id ? `/table/${id}` : '/lobby';
    }
    // The join screen owns the bare `/<slug>` — the shareable link itself.
    if (s.screen === 'room') return s.roomSlug ? `/${s.roomSlug}` : '/lobby';
    // The detail screen owns `/tournaments/<id>` — the shareable sub-page link.
    // Falls back to the list path until the id is stashed, so the URL never
    // degrades to '/' mid-navigation.
    if (s.screen === 'tournamentDetail') return s.tournamentDetailId ? `/tournaments/${s.tournamentDetailId}` : '/tournaments';
    // The results screen renders from ephemeral state a cold load cannot
    // rebuild, so it is deliberately NOT a parse target (absent from
    // SCREEN_OF) — but it still owns its event's URL, so busting no longer
    // pushes '/' over the felt and a refresh lands on that event.
    if (s.screen === 'tournamentResult') {
      const rid = s.tournamentResult && s.tournamentResult.tournamentId;
      return rid ? `/tournaments/${rid}` : '/tournaments';
    }
    if (s.screen === 'docs') return s.docSlug ? `/docs/${s.docSlug}` : '/docs';
    return PATH_OF[s.screen] ? `/${PATH_OF[s.screen]}` : '/';
  }
  syncUrl() {
    if (!this.server) return;
    const p = this.routePath();
    if (p !== location.pathname) history.pushState({ screen: this.state.screen }, '', p);
  }
  parseRoute(pathname) {
    const clean = (pathname || '/').replace(/\/+$/g, '') || '/';
    if (clean === '/') return { screen: 'landing' };
    const seg = clean.slice(1).split('/');
    const head = decodeURIComponent(seg[0] || '').toLowerCase();
    if (head === 'table' && seg[1]) return { screen: 'table', tableId: decodeURIComponent(seg[1]) };
    // `/tournaments/<id>` is the sub-page link. Must sit ABOVE the RESERVED_SLUGS
    // check below, or every deep link resolves to the marketing page. A junk id
    // falls back to the list rather than firing a doomed detail fetch.
    if (head === 'tournaments' && seg[1]) {
      const tid = decodeURIComponent(seg[1]).toLowerCase();
      return TOURNEY_ID_RE.test(tid) ? { screen: 'tournamentDetail', id: tid } : { screen: 'tournaments' };
    }
    if (SCREEN_OF[head] && seg.length === 1) return { screen: SCREEN_OF[head] };
    if (head === 'docs') return { screen: 'docs', docSlug: seg[1] ? decodeURIComponent(seg[1]).toLowerCase() : null };
    if (RESERVED_SLUGS.has(head)) return { screen: 'landing' };
    // Only a single segment that could actually be a slug is a room link. A deep
    // path, or a segment the gateway would never mint (a file like
    // `Suited.dc.html`, anything with a dot, too short or too long), is not a
    // real link: land on the marketing page rather than firing a doomed
    // `/api/rooms/<junk>` lookup and stranding boot on an error'd room screen.
    if (seg.length === 1 && SLUG_RE.test(head)) return { screen: 'room', slug: head };
    return { screen: 'landing' };
  }
  applyRoute(route, opts?) {
    if (route.screen === 'table' && route.tableId) {
      // A table link opens that table for anyone who already has a session — a
      // connected wallet, or a guest token restored from a refresh. That
      // restored token is what makes a reload land back in the held seat instead
      // of minting a new identity; `resume` tells openTable to take the seat
      // from the server's projection rather than assuming it. With no session at
      // all there is nothing to sit with, so it lands in the lobby.
      if (this.hasToken() || this.state.wallet) this.openTable(route.tableId, { resume: !!(opts && opts.resume) });
      // A bare `/table/priv-<id>` link (the URL the address bar shows once seated,
      // which people copy and share instead of the `/<slug>` room link) reaches a
      // signed-out visitor with no session to sit with. Rather than dumping them
      // in the lobby — the room nowhere in sight, the "void" the link felt like —
      // resolve the opaque id back to its room and show the pin screen, where
      // joining connects a wallet. Tournament tables (`priv-tt-`) are not pin
      // rooms and keep the old lobby fallback.
      else if (route.tableId.startsWith('priv-') && !route.tableId.startsWith('priv-tt-')) this.enterRoomByTable(route.tableId);
      else this.go('lobby', true)();
      return;
    }
    // A `/tournaments/<id>` link opens the detail for anyone, signed in or not:
    // GET /api/tournaments/:id is public and only enriches `you` with a token.
    // openTournament sets id + screen in ONE setState, so routePath never sees
    // the half-state that would push the bare /tournaments over the link.
    if (route.screen === 'tournamentDetail' && route.id) { this.openTournament(route.id, true); return; }
    if (route.screen === 'room' && route.slug) { this.enterRoom(route.slug); return; }
    if (route.screen === 'docs') { this.goDocs(route.docSlug || null, true)(); return; }
    this.go(route.screen || 'landing', true)();
  }
  enterRoom = (slug) => {
    // A shared `/<slug>` link lands here. The room's public face — name, stakes,
    // how full — needs no pin, so it renders straight away; the pin gates
    // sitting, which `joinRoom` handles. Screen and slug are set in one update:
    // set separately, the in-between state (room screen, no slug) makes routePath
    // resolve to `/lobby`, and the URL sync then loses the link entirely.
    this.setState(
      { screen: 'room', roomSlug: slug, roomInfo: null, roomPin: '', roomMsg: '', roomBad: false, roomBusy: false },
      () => { this.onResize(); this.syncTitle(this.state.table); },
    );
    if (!this.server) return;
    fetch(`${this.server}/api/rooms/${encodeURIComponent(slug)}`)
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.error || 'no such room'); return b; })
      // Guard against a slow response for a room the user already navigated off.
      .then((info) => { if (this.state.roomSlug === slug) this.setState({ roomInfo: info }); })
      .catch((e) => { if (this.state.roomSlug === slug) this.setState({ roomMsg: String((e && e.message) || e), roomBad: true }); });
  };

  /* Recover the pin screen from an opaque `/table/<id>` the client cannot join.
     A private room's table id carries no slug, so when a socket is refused for
     want of a grant (`pin_required`), resolve the id back to its room — slug and
     public face in one call — and hand off to the ordinary pin flow. This is
     what turns "stranded on an unjoinable table" into "enter the pin". */
  enterRoomByTable = (tableId) => {
    if (!this.server || !tableId) { this.go('lobby', true)(); return; }
    fetch(`${this.server}/api/rooms/by-table/${encodeURIComponent(tableId)}`)
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.error || 'no such room'); return b; })
      // One update, like enterRoom: the info is already in hand, so the pin
      // input renders straight away rather than after a second round trip.
      .then((info) => {
        rememberPrivTable({ ...info, tableId });
        this.noteHostRoom({ ...info, tableId });
        this.setState(
          { screen: 'room', roomSlug: info.slug, roomInfo: info, roomPin: '', roomMsg: '', roomBad: false, roomBusy: false },
          () => { this.onResize(); this.syncTitle(this.state.table); },
        );
      })
      .catch(() => { this.toast('That room has closed', 'bad'); this.go('lobby', true)(); });
  };

  /* A room response comes back isHost when the authenticated requester created it.
     Remember which room this player hosts (by table id) so the felt can offer the
     "end the session" control — and so it survives a refresh, since a host
     re-entering through the pin screen is told isHost just the same. */
  noteHostRoom = (info) => {
    if (info && info.isHost && info.slug && info.tableId) {
      this.setState({ hostRoom: { slug: info.slug, tableId: info.tableId } });
    }
  };

  promptCloseRoom = () => { this.setState({ closeRoomOn: true, walletMenu: false, closeRoomMsg: '', closeRoomBad: false }); this.sfx('ui'); };
  dismissCloseRoom = () => this.setState({ closeRoomOn: false });
  closeRoom = () => {
    const hr = this.state.hostRoom;
    if (!hr || !this.server || !this.hasToken()) { this.setState({ closeRoomOn: false }); return; }
    if (this.state.roomClosing) return;
    this.setState({ roomClosing: true, closeRoomMsg: '', closeRoomBad: false });
    fetch(`${this.server}/api/rooms/${encodeURIComponent(hr.slug)}/close`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.wallet.token()}` },
    })
      .then(this.authCheck)
      .then(async (r) => { const b = await r.json().catch(() => ({})); if (!r.ok) throw new Error(b.error || 'could not end the session'); return b; })
      // The server's teardown pushes `room_closed` to every socket — including
      // this one — and that lands in the table adapter's onError, which drops
      // everyone (the host included) back to the lobby with chips already swept to
      // bankroll. So there's nothing to navigate here: just close the sheet and
      // drop the host badge. A 202 means it's still draining; the push follows.
      .then(() => { this.setState({ roomClosing: false, closeRoomOn: false, hostRoom: null }); this.sfx('seat'); })
      .catch((e) => { this.setState({ roomClosing: false, closeRoomMsg: String((e && e.message) || e), closeRoomBad: true }); this.sfx('error'); });
  };

  /* Joining and creating both move funds, so both need a session token. In
     faucet mode a guest identity is minted on the spot, exactly as openTable
     does; in chain mode connect('guest') is refused, so the caller falls back
     to the wallet picker. */
  ensureIdentity() {
    if (!this.server) return Promise.resolve();
    if (this.wallet && this.wallet.token && this.wallet.token()) return Promise.resolve();
    if (!this.wallet) return Promise.reject(new Error('no wallet'));
    return this.wallet.connect('guest');
  }
  hasToken() { return !!(this.wallet && this.wallet.token && this.wallet.token()); }

  /* A reload keeps the session token but not the identity behind it: that
     comes back with /api/me a moment later, and until it does `state.wallet`
     is null. The profile used to read that gap as "signed out" and throw a
     signed-in player onto the connect screen on every refresh. It waits now
     (see `profilePending`), which means this read has to say how it ended:
     a token that died goes to sign-in as before, anything else is a server we
     could not reach — said so, with a retry, rather than a spinner for ever. */
  resumeSession = () => {
    this.setState({ sessionErr: false });
    this.wallet.refresh().catch(() => {
      if (this.hasToken()) this.setState({ sessionErr: true });
      else if (this.state.screen === 'profile') this.sessionDead();
    });
  };

  /* One place a REJECTED session is noticed, as opposed to an expired one.
     Every signed call below now passes its Response through here before its own
     handling, so success paths are untouched — the only new behaviour is on 401.

     This matters because most of those calls read `r.json()` with no status
     check at all, and a 401 body parses perfectly well: a dead session rendered
     as an empty hand history and a $0 rakeback rather than as an error, which
     on a money screen reads as real data. pollMine's own comment already noted
     this for registrations; it was true of every other read too.

     The expiry timer in wallet.js covers a token that runs out. This covers one
     the server refuses while its own `exp` is still in the future — a redeploy
     without a fixed SUITED_AUTH_SECRET, or a `disconnect` from another device
     (which revokes every session, not only its own). Nothing retired this
     session in that case. */
  authCheck = (r) => {
    if (r && r.status === 401) this.sessionDead();
    return r;
  };

  /* Every read goes through here, and a read that failed is not data.
   *
   * `authCheck` caught a 401 and then handed the response on regardless, so any
   * other failure was parsed as if it were the answer. The gateway's catch-all
   * returns `400 {error}` — a perfectly good object — and assigning that to
   * state produced figures like `fmt(undefined)`, which is not a dash or a zero
   * but the literal string "NaN": "NaN% rakeback" on the profile, "level NaN"
   * beside it. A screen that cannot say what it knows must say nothing, and
   * that is what the `.catch` on each of these already does. This just makes
   * sure the catch is the branch a failure actually takes. */
  okJson = (r) => {
    if (r && r.status === 401) this.sessionDead();
    if (!r || !r.ok) throw new Error(`${r ? r.status : 'no'} response`);
    return r.json();
  };

  /* Latched, so a burst of parallel polls all 401-ing prompts once; the latch
     lifts when a new session arrives (see the wallet subscription).

     The felt is deliberately NOT navigated away from. The socket authenticated
     at upgrade and outlives the token, so a hand in progress stays playable and
     the table's own expired scrim takes over when the socket finally drops.
     Dropping the token here does not disturb that hand — the adapter captured
     its own copy at construction and plays over the socket, not over these
     calls — and keeping a session the server has refused IS the bug. */
  sessionDead = () => {
    if (this._sessionDead) return;
    this._sessionDead = true;
    this.wallet && this.wallet.disconnect && this.wallet.disconnect();
    this.toast('Your session expired, sign in again', 'warn');
    if (this.state.screen !== 'table') {
      this.setState({ screen: 'connect', connectStep: 0 }, () => this.onResize());
    }
  };

  joinRoom = () => {
    const slug = this.state.roomSlug, pin = this.state.roomPin;
    if (!/^\d{4}$/.test(pin)) { this.setState({ roomMsg: 'Enter the four-digit pin', roomBad: true }); this.sfx('error'); return; }
    this.setState({ roomBusy: true, roomMsg: '', roomBad: false });
    this.ensureIdentity()
      .then(() => fetch(`${this.server}/api/rooms/${encodeURIComponent(slug)}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.wallet.token()}` },
        body: JSON.stringify({ pin }),
      }))
      .then(this.authCheck)
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.error || 'could not join'); return b; })
      // The join grants this pubkey WS access server-side; remember the stakes,
      // then hand off to the ordinary seat flow (buy-in, funding if short).
      .then((info) => { this.setState({ roomBusy: false }); rememberPrivTable(info); this.noteHostRoom(info); this.sfx('seat'); this.sitAt(info.tableId); })
      .catch((e) => {
        // No identity (chain mode refused a guest) → the wallet picker, not a
        // dead end. A real error with a token in hand is a wrong pin: show it.
        if (!this.hasToken()) {
          this.setState({ roomBusy: false, screen: 'connect', connectStep: 0 });
          this.toast('Connect a wallet to join the room', 'ok');
          return;
        }
        this.setState({ roomBusy: false, roomMsg: String((e && e.message) || e), roomBad: true }); this.sfx('error');
      });
  };

  openCreateRoom = () => {
    // Identity is settled at submit (ensureIdentity), exactly as joining is, so
    // the modal opens for anyone — a guest is minted in faucet mode, and chain
    // mode falls back to the wallet picker only if the create is confirmed.
    this.setState({ createRoomOn: true, createdRoom: null, crMsg: '', crBad: false, crBusy: false });
    this.sfx('ui');
  };
  closeCreateRoom = () => this.setState({ createRoomOn: false });

  createRoom = () => {
    const s = this.state;
    const toMicro = (x) => Math.round(Number(x) * 1e6);
    // Client-side echoes of the server's rules (rooms.ts), for a fast inline
    // message; the server stays the source of truth via its {error,code}. The
    // link is server-generated now, so there is nothing to validate for it here.
    const sb = toMicro(s.crSb), bb = toMicro(s.crBb), min = toMicro(s.crMin), max = toMicro(s.crMax);
    if (!(sb > 0 && bb > 0 && sb <= bb)) { this.setState({ crMsg: 'Small blind must be positive and no larger than the big blind', crBad: true }); this.sfx('error'); return; }
    if (!(min > 0 && max >= min)) { this.setState({ crMsg: 'The maximum buy-in must be at least the minimum', crBad: true }); this.sfx('error'); return; }
    const seats = Number(s.crSeats);
    if (!(seats >= 2 && seats <= 6)) { this.setState({ crMsg: 'A table holds two to six seats', crBad: true }); this.sfx('error'); return; }
    if (!/^\d{4}$/.test(s.crPin)) { this.setState({ crMsg: 'Pin must be four digits', crBad: true }); this.sfx('error'); return; }
    this.setState({ crBusy: true, crMsg: '', crBad: false });
    this.ensureIdentity()
      .then(() => fetch(`${this.server}/api/rooms`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.wallet.token()}` },
        body: JSON.stringify({ name: s.crName || undefined, sb, bb, minBuyIn: min, maxBuyIn: max, maxSeats: seats, pin: s.crPin }),
      }))
      .then(this.authCheck)
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.error || 'could not create the room'); return b; })
      // Room exists and the host is granted. Flip the modal to the share view —
      // the link and pin are the whole point — rather than whisking them off.
      .then((info) => {
        rememberPrivTable(info);
        this.noteHostRoom(info); // the creator is always the host
        const url = (location.origin || '') + '/' + info.slug;
        this.setState({ crBusy: false, createdRoom: { slug: info.slug, tableId: info.tableId, pin: s.crPin, url } });
        this.sfx('seat');
      })
      .catch((e) => {
        if (!this.hasToken()) {
          this.setState({ crBusy: false, createRoomOn: false, screen: 'connect', connectStep: 0 });
          this.toast('Connect a wallet to open a room', 'ok');
          return;
        }
        this.setState({ crBusy: false, crMsg: String((e && e.message) || e), crBad: true }); this.sfx('error');
      });
  };

  copyRoomLink = () => {
    const cr = this.state.createdRoom; if (!cr) return;
    try {
      navigator.clipboard.writeText(cr.url);
      this.setState({ crCopied: true });
      setTimeout(() => this.setState({ crCopied: false }), 1600);
    } catch { /* clipboard blocked — the link is on screen to copy by hand */ }
  };

  enterCreatedRoom = () => {
    const cr = this.state.createdRoom; if (!cr) return;
    this.setState({ createRoomOn: false });
    this.sitAt(cr.tableId);
  };

  /* One money formatter for every amount that belongs to a table.
     In dollars it is `fmt` and nothing has changed. In big blinds it divides by
     the blind and carries the unit inside the string, because these figures land
     in a dozen places — a seat plate, a button, a log line — and only some of
     them have a label beside them to hang the unit on. An unlabelled "2.5" next
     to an unlabelled "5" is the one way this feature can mislead.
     `bb` defaults to the open table's blind; the callers that pass their own are
     formatting something that is not the open table (a finished hand, a stake
     row in the lobby). No blind to divide by — a screen with no table, an
     older hand recorded before the blind was kept — falls back to dollars,
     which is wrong-looking but never wrong. */
  /* Width of a string in a given font, measured once and remembered.
     A canvas measurement is the only way to know how wide a label WILL be
     before it is rendered, and the alternative — reserving space in `ch` —
     over-reserves badly for a proportional face, where an 'i' is a third of a
     '0'. Cached on font+text, so the hot path pays for a given label once. */
  textWidth(text, font) {
    const cache = this._tw || (this._tw = new Map());
    const key = font + '\u0000' + text;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const ctx = this._twCtx || (this._twCtx = document.createElement('canvas').getContext('2d'));
    ctx.font = font;
    const w = ctx.measureText(text).width;
    // A hand changes the widest label a handful of times; this never grows
    // unbounded in practice, but a table that ran for a week would.
    if (cache.size > 400) cache.clear();
    cache.set(key, w);
    return w;
  }

  amt(n, bb?) {
    if (this.state.amountUnit !== 'bb') return fmt(n);
    const b = bb == null ? ((this.state.table || {}).bb || 0) : bb;
    if (!(b > 0) || n == null) return fmt(n);
    return fmtBB(n / b) + ' bb';
  }

  /* A log line is a transcript, so it is stored UNFORMATTED: the text carries
     `{0}`-style slots and the amounts travel beside it as numbers, formatted
     only at render. Switching units then re-reads the whole log rather than
     leaving every line already dealt written in the unit it was dealt in.
     The blind is pinned at push time, so a line keeps the stake it was played
     at even after the player moves to another table. */
  pushLog(text, kind?, amts?, bb?) {
    /* `onEvent` commits `state.table` only at its end, so the state this method
       can see is the frame BEFORE the event being logged. That is the same blind
       within a cash hand, but a tournament level ticks over between hands — so
       the callers that log an amount pass the blind off the event's own
       projection, and only the ones that log no amount fall back to state. */
    const b = bb == null ? ((this.state.table || {}).bb || 0) : (bb || 0);
    this.setState((s) => ({ log: [{ text, kind, amts: amts || null, bb: b, at: stamp(), k: Math.random() }, ...s.log].slice(0, 70) }));
  }

  /* Deals one card at a time so the table reads as being dealt to rather than
     filled in. `pendingArrivals` marks the ones still in flight, so a state
     frame landing mid-deal cannot short-circuit the animation by settling
     them all at once — see `settleDealt`. */
  arrive(keys, gap, snd) {
    this.pendingArrivals = this.pendingArrivals || {};
    keys.forEach((k) => { this.pendingArrivals[k] = 1; });
    keys.forEach((k, i) => this.later(() => {
      delete this.pendingArrivals[k];
      this.setState((s) => ({ fx: { ...s.fx, arrived: { ...s.fx.arrived, [k]: 1 }, flipped: k[0] === 'b' ? { ...s.fx.flipped, [k]: 1 } : s.fx.flipped } }));
      if (snd) this.sfx(snd);
    }, i * gap));
  }

  flip(keys) {
    this.setState((s) => {
      const f = { ...s.fx.flipped };
      keys.forEach((k) => { f[k] = 1; });
      return { fx: { ...s.fx, flipped: f } };
    });
    this.sfx('flip');
  }

  fly(items, dur) {
    if (!items.length) return;
    const list = items.slice(0, 18);
    this.setState((s) => ({ fx: { ...s.fx, fly: { items: list, go: false } } }));
    requestAnimationFrame(() => requestAnimationFrame(() => this.setState((s) => (s.fx.fly ? { fx: { ...s.fx, fly: { ...s.fx.fly, go: true } } } : {}))));
    this.later(() => this.setState((s) => ({ fx: { ...s.fx, fly: null } })), dur);
  }

  /* Pixel geometry for this frame, resolved against the measured felt. Callers
     keep reading `g.seats[i].cards` and `g.board` exactly as they did when the
     stage was a fixed 980x600 — what changed is where those numbers come from. */
  geo() {
    // The play area is a fixed CANVAS design box. The container it lives in is
    // measured into `state.felt`; one factor fits the box to that container and
    // the whole area scales as a unit — so every coordinate below is a literal
    // canvas position, and a collision verified once holds at every window size.
    // Growing past 1 is generous on a large monitor and is what the design
    // ships; the floor keeps a small window legible rather than illegible.
    const f = this.state.felt;
    const s = clamp(Math.min(f.w / CANVAS.w, f.h / CANVAS.h), SCALE_MIN, SCALE_MAX);
    return { w: CANVAS.w, h: CANVAS.h, s };
  }

  /* Measuring the felt.

     The observer watches the felt's *container*, never the felt. Watching the
     felt is a feedback loop: the measurement goes into state, state re-renders
     the felt, the observer fires again, and with an aspect ratio to satisfy the
     browser can settle on a slightly different box each pass — which is the
     table visibly breathing. The container's size does not depend on anything
     measured here, so the loop cannot close.

     The container's box is reported as-is; `geo()` fits the fixed canvas into
     it. There is no aspect to satisfy here any more — the play area scales as a
     unit — so the box the observer reports cannot depend on the box it sets.

     Same callback-ref shape as the ASCII field, so leaving the table tears the
     observer down without needing a lifecycle hook. */
  feltRef = (el) => {
    if (this.feltEl === el) return;
    if (this.feltRO) { this.feltRO.disconnect(); this.feltRO = null; }
    this.feltEl = el;
    if (!el) return;
    if (window.ResizeObserver) {
      this.feltRO = new ResizeObserver(this.measureFelt);
      this.feltRO.observe(el);
    }
    this.measureFelt();
  };

  /* The viewport, not a container — so there is no loop to close: `zoom` on a
     descendant does not change window.innerWidth. Same shape as geo(): one
     clamped factor fitting the canvas to the box. Written straight to the
     custom property rather than through state, because nothing renders off it
     and a re-render per resize frame would be waste. */
  measureStage = () => {
    const w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) return;
    const s = clamp(Math.min(w / STAGE.w, h / STAGE.h), STAGE_MIN, STAGE_MAX);
    document.documentElement.style.setProperty('--su-scale', s.toFixed(4));
  };

  measureFelt = () => {
    const el = this.feltEl;
    if (!el) return;
    // Just the container's box. The play area inside is absolutely positioned
    // and scaled, so it takes no part in the container's layout — measuring the
    // container therefore cannot feed back into its own size, and `geo()` turns
    // this box into the one scale factor that fits the fixed canvas to it.
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    const cur = this.state.felt;
    // A 1px settle is not worth a re-render, and re-rendering on it is how a
    // measurement loop keeps itself alive.
    if (Math.abs(w - cur.w) <= 1 && Math.abs(h - cur.h) <= 1) return;
    this.setState({ felt: { w, h } });
  };

  /* ── chips ──────────────────────────────────────────────────────────────
     An amount becomes a small number of columns, largest denomination first.
     Everything is in whole cents so the arithmetic is exact — a stack that
     renders 0.30 as 29 cents of chips is worse than no chips at all.        */

  /** Greedy change-making, capped at six chips a column. */
  breakdown(amount, maxCols) {
    let rest = Math.round(amount * 100);
    const out = [];
    DENOMS.forEach((d) => {
      const unit = Math.round(d.v * 100);
      const n = Math.floor(rest / unit);
      // The full count, not a capped one: the pile has to sum to the figure
      // beside it. The six denominations keep even a four-figure pot to a few
      // chips per column, so "honest" and "tidy" are the same pile.
      if (n > 0) { rest -= n * unit; out.push({ d, n }); }
    });
    return out.slice(0, maxCols || DENOMS.length);
  }

  /** A flat run of chips, for a payout in flight rather than a settled pile. */
  flatChips(amount, max) {
    const out = [];
    this.breakdown(amount, 6).forEach((col) => {
      for (let i = 0; i < col.n && out.length < (max || 12); i++) out.push(col.d);
    });
    return out.length ? out : [DENOMS[DENOMS.length - 1]];
  }

  applyPreAction(legal) {
    if (!legal) return;
    const pa = this.state.preAction;
    if (pa === 'checkfold') this.act(legal.canCheck ? 'check' : 'fold');
    if (pa === 'callany') this.act(legal.canCheck ? 'check' : 'call');
  }

  /* ── hero input ────────────────────────────────────────────────────── */

  act = (type, to?) => {
    if (!this.adapter) return;
    const t = this.state.table;
    if (!t || t.toAct !== 0) return;
    this.sfx('ui');
    this.adapter.act({ type, to });
    this.setState({ preAction: null });
  };

  onKey = (e) => {
    if (this.state.screen !== 'table' || e.metaKey || e.ctrlKey) return;
    // The toggle exists because these are single unmodified letters: anyone
    // typing anywhere — chat, another window's muscle memory — is one slip
    // from folding a live hand. Off means off; the UI hides the underlines too.
    if (!this.state.hotkeys) return;
    // Typing into a field is never an action, toggle or no toggle.
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const t = this.state.table;
    if (!t || t.toAct !== 0) return;
    const legal = this.adapter && this.adapter.getLegal();
    if (!legal) return;
    const k = e.key.toLowerCase();
    if (k === 'f') this.act('fold');
    else if (k === 'c' || k === ' ') { e.preventDefault(); this.act(legal.canCheck ? 'check' : 'call'); }
    // Clamped, unlike the button, which reads the already-clamped value. Held
    // raw, `betTo` could be below the minimum and the raise silently became a
    // min-raise — the key did something other than what the slider showed.
    // When there is no legal raise — your whole stack cannot exceed the current
    // bet — the key calls instead, so it goes all-in for less rather than
    // firing a raise the server rejects as illegal.
    else if (k === 'r') {
      if (!legal.canRaise) this.act(legal.canCheck ? 'check' : 'call');
      else this.act('raise', clamp(this.state.betTo || legal.minRaiseTo, legal.minRaiseTo, legal.maxRaiseTo));
    }
    // No all-in hotkey: the slider's all-in preset is the way to shove, and a
    // single unmodified key for putting a whole stack in is one slip too many.
  };

  sliderFrom(e, el) {
    const box = el.getBoundingClientRect();
    // Stood on end (the upright table's sizing panel) it runs bottom to top.
    if (box.height > box.width) return clamp(1 - (e.clientY - box.top) / box.height, 0, 1);
    return clamp((e.clientX - box.left) / box.width, 0, 1);
  }

  /** Buy-in slider. Same pointer arithmetic as the bet slider, cent-snapped. */
  buyFrom(e, lo, hi) {
    if (hi <= lo) return;
    const p = this.sliderFrom(e, e.currentTarget);
    const v = snapMoney(lo + p * (hi - lo));
    if (v !== this.state.buyIn) this.setState({ buyIn: v });
  }

  /** Rebuy-modal slider. Writes the same `rebuyDraft` the amount reads from. */
  rebuyFrom(e, lo, hi) {
    if (hi <= lo) return;
    const p = this.sliderFrom(e, e.currentTarget);
    this.setState({ rebuyDraft: String(snapMoney(lo + p * (hi - lo))) });
  }

  betDown = (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); this.setState({ drag: 'bet' }); this.betMove(e); };
  betMove = (e) => {
    if (this.state.drag !== 'bet' && e.type === 'pointermove') return;
    const legal = this.adapter && this.adapter.getLegal();
    if (!legal) return;
    const p = this.sliderFrom(e, e.currentTarget);
    const isChips = !!(this.state.session && String(this.state.session.tableId).startsWith('priv-tt-'));
    const v = snapBet(legal.minRaiseTo + p * (legal.maxRaiseTo - legal.minRaiseTo), isChips);
    if (v !== this.state.betTo) { this.setState({ betTo: v }); this.sfx('hover'); }
  };
  betUp = () => this.setState({ drag: null });

  /* A rebuy is two messages, the top-up and the sit-in, and their ORDER on the
     gateway is what restarts a frozen table: the sit-in is what makes it look
     for a hand to deal, and it only finds one if the chips are already on the
     seat. Sent back to back, the sit-in was read first — the top-up waits on
     the ledger — found a seat with nothing behind it, dealt nothing, and by
     the time the chips landed nothing was left to ask again. Both seats
     funded, both sat in, no hand: "top up and it just stands there", cured by
     sit up / sit down, which is the same sit-in said after the chips arrived.

     So the sit-in now waits for the chips. `rebuyStep` runs on every table
     frame (and on a timer, for a table too frozen to send one) until a hand
     has been dealt:
       chips not on the seat yet   wait; after a couple of seconds with no
                                   frame at all, take the table afresh once
       chips on the seat           sit in — once
       still no hand after that    sit up, sit down — the sequence a player
                                   was doing by hand — once
     and then it lets go. */
  rebuyStep = (t) => {
    const r = this._rebuy, a = this.adapter;
    if (!r || !a || a.kind !== 'remote') { this._rebuy = null; return; }
    const hero = t && t.heroIdx != null ? (t.seats || [])[0] : null;
    const now = Date.now();
    // Over: the seat is gone, a hand has been dealt since, or it has run long enough.
    if (!hero || (t.handNo || 0) > r.hand || now - r.at > 20000) { this._rebuy = null; return; }
    if ((hero.stack || 0) <= 0) {
      if (!r.resynced && now - r.at > 2500 && a.resync) { r.resynced = true; a.resync(); }
      return;
    }
    if (!r.satAt) { r.satAt = now; a.sitIn(); return; }
    // Somebody to play against, chips down, sit-in said, and still no cards.
    const opponents = (t.seats || []).filter((s, i) => i !== 0 && s && !s.empty && (s.stack || 0) > 0 && !s.sittingOut).length;
    if (!r.cycled && opponents > 0 && now - r.satAt > 3000) { r.cycled = true; a.sitUp(); a.sitIn(); }
  };
  rebuyFollowUp = () => {
    if (!this._rebuy || !this.adapter) return;
    this.rebuyStep(this.adapter.getState());
    if (this._rebuy) this.later(this.rebuyFollowUp, 1000);
  };

  /* Click = mute toggle, press-and-drag up/down = volume. The drag is gated on
     `volStart` alone: React state has not committed by the time the first
     pointermove lands, so gating on it swallowed short drags and they fell
     through to the mute toggle instead. */
  volDown = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    this.volStart = { y: e.clientY, from: this.state.muted ? 0 : this.state.volume, moved: false };
    this.setState({ drag: 'vol' });
  };

  volMove = (e) => {
    const vs = this.volStart;
    if (!vs) return;
    const dy = vs.y - e.clientY;
    if (!vs.moved && Math.abs(dy) < 4) return;
    vs.moved = true;
    const v = clamp(vs.from + dy / 140, 0, 1);
    if (Math.round(v * 16) !== Math.round(this.state.volume * 16)) this.uiSfx('hover');
    if (this.sound) { this.sound.setMuted(v <= 0); this.sound.setVolume(v); }
    this.setState({ volume: v, muted: v <= 0 });
  };

  volUp = (e) => {
    const vs = this.volStart;
    this.volStart = null;
    this.setState({ drag: null });
    if (!vs || vs.moved) return;
    const m = !this.state.muted;
    this.setState({ muted: m });
    if (this.sound) { this.sound.setMuted(m); if (!m) this.uiSfx('seat'); }
  };

  peelDown = (key) => (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    this.peelRef = { key, y: e.clientY };
    this.sfx('peel');
  };
  peelMove = (key) => (e) => {
    if (!this.peelRef || this.peelRef.key !== key) return;
    const p = clamp((this.peelRef.y - e.clientY) / 78, 0, 1);
    this.setState((s) => ({ fx: { ...s.fx, peel: { key, p } } }));
  };
  peelUp = (key) => () => {
    if (!this.peelRef) return;
    const p = (this.state.fx.peel && this.state.fx.peel.key === key) ? this.state.fx.peel.p : 0;
    this.peelRef = null;
    if (p > 0.55) this.flip([key]);
    this.setState((s) => ({ fx: { ...s.fx, peel: null } }));
  };

  toast(text, kind) {
    const id = Math.random();
    this.setState((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
    // A raw timer, not `this.later`: a toast's dismissal must not be swept up by
    // `clearTimers()`, which the adapter fires on connect and every hand start —
    // that is what left "wallet connected" pinned to the corner forever.
    setTimeout(() => this.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3600);
  }

  /* A freshly-earned achievement, caught by diffing what /api/me now reports
     (the wallet re-reads it after every hand) against what we last knew — the
     design's "no server push needed". A short grace after sign-in skips the
     initial load, so we celebrate a real unlock, not the whole history the
     moment you connect. */
  detectUnlocks(w) {
    if (w.address && !this._achReadyAt) this._achReadyAt = Date.now() + 4000;
    const next = new Set(w.achievements || []);
    if (this._achKnown && this._achReadyAt && Date.now() >= this._achReadyAt) {
      for (const code of next) if (!this._achKnown.has(code)) this.celebrate(code);
    }
    this._achKnown = next;
  }

  celebrate(code) {
    const e = avEntry(code);
    if (!e || e.def) return; // earnable avatars only
    const id = Math.random();
    this.sfx('win');
    this.setState((s) => ({ celebrations: [...s.celebrations, { id, code }] }));
    setTimeout(() => this.setState((s) => ({ celebrations: s.celebrations.filter((c) => c.id !== id) })), 5200);
  }

  go = (screen, silent?) => () => {
    if (!silent) this.sfx('ui');   // silent when the router replays a route, not a click
    // FIX 3: the results screen pre-fills the SHARED `fundDraft` with the
    // payout (enterBust/routeTournamentResult/openResult). It's cleared only on
    // a successful fundMove and on init, so leaving results without withdrawing
    // leaves the stale payout on the profile funding card. Clear it on the way
    // OUT of tournamentResult (never on the way in — the pre-fill must survive
    // there).
    const from = this.state.screen;
    const clearDraft = (from === 'tournamentResult' && screen !== 'tournamentResult')
      ? { fundDraft: '', fundNote: '', fundBad: false } : {};
    // A "come back here after connecting" only holds while the person is ON the
    // connect screen. Leaving it any other way abandons the connect, and a later
    // one (to play poker, say) must not be thrown to the staking page.
    const clearReturn = screen !== 'connect' && this.state.connectReturn ? { connectReturn: null } : {};
    /* A receipt belongs to the visit that made it. The transaction is on the
       chain for good either way, but "redeemed to your wallet" still sitting
       over a balance that has since grown back would be a lie, so leaving the
       screen ends the receipt — along with the note it was attached to. */
    const clearReceipts = screen !== from
      ? { fundTx: null, fundNote: '', fundBad: false, rbTx: null, jkClaimTx: null, jkClaimMsg: '', stkReceipt: null }
      : {};
    this.setState({ screen, ...clearDraft, ...clearReceipts, ...clearReturn }, () => {
      this.onResize();
      this.syncTitle(this.state.table);
      clearInterval(this.jkTimer); this.jkTimer = null;
      clearInterval(this.stkTimer); this.stkTimer = null;
      // Part 4 Task 3: the tournament poll + the whole-flow second-ticker are
      // cleared on every navigation, exactly like jkTimer, then re-armed below
      // for the screens that need them (the felt re-arms the seated poll; the
      // detail screen re-arms only the ticker, via loadTournamentDetail). The
      // session STATE (`tSession`) survives — pollMine re-syncs on return.
      clearInterval(this.tSessTimer); this.tSessTimer = null;
      clearInterval(this.tNowTimer); this.tNowTimer = null;
      if (screen === 'leaderboard') {
        this.loadLeaderboard();
        this.loadJackpot();
        /* For the name this viewer plays under (nickname/ENS), which the board
           shows beside their row. Whether they are IN the draw no longer
           depends on it — `jk.you` answers that from the gateway. */
        this.loadMe();
        let n = 0;
        this.jkTimer = setInterval(() => {
          this.setState({ now: Date.now() });
          if (++n % 30 === 0) this.loadJackpot(); // refresh pool/entrants, and roll to the next window after a draw
        }, 1000);
      }
      // `refresh` re-reads both figures the funding card shows: the bankroll
      // from the gateway and the wallet's own tokens from the chain. Without
      // it the card keeps whatever was fetched at connect time — a deposit
      // made from another tab, or funds moved outside the site, never show.
      if (screen === 'profile' && this.state.wallet && this.wallet && this.wallet.refresh) {
        this.wallet.refresh().catch(() => {});
      }
      if (screen === 'profile') { this.loadRakeback(); this.loadMe(); this.loadRarity(); this.loadFundHistory(); }
      // The hands hero states your record, which is /api/me — the same payload
      // the profile reads. Without this the hero sat on em dashes until the
      // player happened to visit their profile first.
      if (screen === 'history') { this.loadHands(); this.loadMe(); }
      // Repaint from whatever is already in state so the page is never blank
      // while the fetch is in flight, then refresh it.
      if (screen === 'staking') {
        this.paintStaking();
        this.loadStaking();
        // Rewards stream every second, so a figure read once goes stale while
        // the page is open — the testnet rehearsal showed "$0.02 claimable"
        // beside a claim that paid $0.52. Re-read every 15s. But a re-read
        // repaints the page, and a repaint under someone's fingers is how the
        // amount box used to lose every keystroke after the first — so a tick
        // that would land while an input on this page has focus is skipped;
        // the next one catches up.
        this.stkTimer = setInterval(() => { this.refreshStakingQuietly(); }, 15000);
      }
      // The list's per-row countdowns run off `st.now`, exactly like the detail
      // screen's — so the whole-flow ticker that the clear at the top of go()
      // just stopped has to come back on here, or every row's clock is frozen
      // at whatever second the tab was opened. `pollMine` stays: it is the list
      // screen's only discovery starter.
      if (screen === 'tournaments') { this.loadTournaments(); this.pollMine(); this.startTNowTicker(); }
      if (screen === 'tournamentDetail') this.loadTournamentDetail(); // also (re)starts the whole-flow ticker + pollMine
      // Returning to the felt mid-tournament (e.g. the "your turn" prompt)
      // re-arms the seated poll + ticker the top-of-go() clear just stopped.
      if (screen === 'table' && this.state.tSession && this.state.tSession.tournamentId && this.state.tSession.status !== 'busted') {
        this.startTournamentSession();
      }
      // No wallet AND no token is signed out. No wallet with a token is a
      // session still resuming after a reload — the profile waits for it.
      if (screen === 'profile' && this.server && !this.state.wallet && !this.hasToken()) {
        this.setState({ screen: 'connect', connectStep: 0 });
        this.toast('Connect a wallet to create a profile', 'ok');
      }
      // The table is not a shop window: without a wallet there is nothing to
      // sit down with. This closes the NAV route only. `/table/<id>` still
      // reaches a public table for anyone signed in, because `openTable` sets
      // the screen itself and never passes through here — see the note on
      // watching-by-URL in docs/AUDIT-FRONTEND-2026-09-28.md. Closing that is a
      // product decision, not an oversight in this branch.
      if (screen === 'table' && this.server && !this.state.wallet) {
        this.setState({ screen: 'connect', connectStep: 0 });
        this.toast('Connect a wallet to sit at a table', 'ok');
      }
      if (screen === 'landing') this.loadStats();
      // The lobby's biggest-pots panel reads the same /api/jackpot payload the
      // leaderboard does, so entering the lobby warms it too. Cheap and
      // cached in `st.jk`: a player who then opens the leaderboard sees it
      // already filled rather than an empty panel that fills a beat later.
      if (screen === 'lobby') { this.loadLobby(); this.loadStats(); this.loadJackpot(); }
    });
  };

  goDocs = (slug, silent?) => () => {
    if (!silent) this.sfx('ui');
    this.setState({ screen: 'docs', docSlug: slug || null }, () => this.onResize());
  };

  /* ── docs lifecycle ──────────────────────────────────────────────────
     The two containers (`docsNavEl`, `docsBodyEl`, sitting inside the
     scroller `docsScrollEl`) exist only while `isDocs` is true, so they are
     filled here rather than at render time — `componentDidUpdate` calls
     this once the containers land in the DOM, and `componentWillUnmount` /
     the reverse screen change tear the observer back down. */
  mountDocs() {
    const nav = this.docsNavEl;
    const body = this.docsBodyEl;
    const scroller = this.docsScrollEl;
    if (!nav || !body || !scroller || !this.R) return;
    const pick = (slug) => this.gotoDocSection(slug);
    this.R.docsRender.renderBody(body, pick);
    // section id list, in document order, for scroll-spy:
    const secIds = Array.from<Element>(body.querySelectorAll('section[id^="docs-"]')).map((n) => n.id.replace(/^docs-/, ''));
    const active = this.state.docSlug && secIds.includes(this.state.docSlug) ? this.state.docSlug : secIds[0];
    this.R.docsRender.renderNav(nav, active, pick);
    this._docsSpy = this.R.docsRender.setupScrollSpy(scroller, secIds, (id) => this.onDocsScrollActive(id));
    this._docsMounted = true;
    this._docsRenderedSlug = this.state.docSlug;
    // Lay out FIRST. Below 760px layoutDocs stacks the nav above the body and
    // repads the column; doing that after the jump reflows every section out
    // from under the offset the jump just set, landing a deep link thousands of
    // pixels away (the glossary, for /docs/contracts on a phone).
    this.layoutDocs();
    // Deep-link: jump to the requested section without animation on first mount.
    const slug = this.state.docSlug;
    if (slug && secIds.includes(slug)) {
      const target = body.querySelector(`#docs-${slug}`);
      if (target) {
        const jump = () => target.scrollIntoView({ block: 'start' });
        jump();
        // Web fonts resolve after mount and re-flow the whole column, which
        // moves the anchor again — so take the measurement once more when they
        // land, but only if the reader has not already scrolled off it.
        const settled = scroller.scrollTop;
        const fonts = document.fonts && document.fonts.ready;
        if (fonts) fonts.then(() => {
          if (!this._docsMounted || this._docsRenderedSlug !== slug) return;
          if (Math.abs(scroller.scrollTop - settled) > 2) return; // they moved; leave them alone
          jump();
        }).catch(() => {});
      }
    }
  }

  // Below ~760px there isn't room for a fixed 240px sidebar beside a readable
  // body column, so the nav becomes a capped-height horizontal strip stacked
  // above the body instead of fighting renderNav's vertical-list markup.
  layoutDocs() {
    const nav = this.docsNavEl;
    if (!nav) return;
    const wrap = nav.parentElement; // the flex container at template line 1116
    const body = this.docsBodyEl;
    const mobile = window.innerWidth < 760;
    if (mobile) {
      if (wrap) wrap.style.flexDirection = 'column';
      nav.style.width = 'auto';
      nav.style.maxHeight = '38vh';
      nav.style.borderRight = '0';
      nav.style.borderBottom = '1px solid rgba(232,236,248,0.132)';
      nav.style.padding = '10px 8px 14px';
      if (body) body.style.padding = '24px 20px 96px';
    } else {
      if (wrap) wrap.style.flexDirection = 'row';
      nav.style.width = '264px';
      nav.style.maxHeight = '';
      nav.style.borderRight = '1px solid rgba(232,236,248,0.132)';
      nav.style.borderBottom = '0';
      nav.style.padding = '12px 10px 48px';
      if (body) body.style.padding = '36px 40px 140px';
    }
  }

  teardownDocs() {
    if (this._docsSpy) { this._docsSpy(); this._docsSpy = null; }
    this._docsMounted = false;
  }

  // Sidebar click / internal link: scroll to the section and update the URL (one history entry).
  gotoDocSection = (slug) => {
    // The screen can be left between a click firing and this callback running
    // (e.g. a stray event queued right as the router moved off docs) — the
    // containers are gone by then, so there is nothing left to scroll or
    // highlight.
    if (!this.docsBodyEl) return;
    const body = this.docsBodyEl;
    const target = body.querySelector(`#docs-${slug}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.setState({ docSlug: slug }); // routePath → syncUrl pushes /docs/<slug>
    this._docsRenderedSlug = slug;
    const nav = this.docsNavEl;
    if (nav && this.R) this.R.docsRender.renderNav(nav, slug, this.gotoDocSection);
  };

  // Scroll-spy: update the highlight + address bar WITHOUT a history entry and
  // without a re-render (so scrolling stays cheap and Back still leaves docs).
  onDocsScrollActive = (slug) => {
    if (!this.docsNavEl) return;
    const nav = this.docsNavEl;
    if (this.R) this.R.docsRender.renderNav(nav, slug, this.gotoDocSection);
    // `routePath()` derives the docs URL purely from `state.docSlug`, and the
    // generic URL-sync block at the top of `componentDidUpdate` runs on every
    // update, comparing `routePath()` against `_lastPath`. Writing the new
    // slug straight onto `state` (never through `setState`, so this stays a
    // no-re-render update) keeps that comparison honest — otherwise the next
    // *unrelated* setState anywhere in the app (a wallet balance tick, the
    // mute toggle, ...) would recompute `routePath()` from a stale `docSlug`,
    // see it disagree with the `_lastPath` this method just stamped, and push
    // a spurious history entry reverting the address bar to the old section.
    this.state.docSlug = slug;
    this._docsRenderedSlug = slug; // and keep the Back/Forward branch from re-scrolling to it
    const path = `/docs/${slug}`;
    if (this.server && location.pathname !== path) {
      history.replaceState({ screen: 'docs' }, '', path);
      this._lastPath = path; // keep componentDidUpdate's generic URL-sync diff quiet
    }
  };

  /* ── the connect screen's chain picker ──────────────────────────────────
     Two chains, two different kinds of wallet, and a signature scheme that has
     nothing in common between them — so which chain you are signing in on is a
     real choice and is made before picking a wallet, not implied by it.

     `connectChain` is null until the player touches the picker. Until then the
     screen resolves it to a chain that actually has a wallet installed, so
     someone running only Phantom does not land on an empty EVM list, and the
     common case — one wallet, one chain — needs no interaction at all. */
  connectChains() {
    const all = this.R?.wallet ? this.R.wallet.detectProviders() : [];
    const has = (chain) => all.some((w) => this.chainOf(w.id) === chain && w.detected);
    // Solana is the default: it is the chain deposits and withdrawals run on. The
    // Ethereum tab is still one click away.
    const resolved = this.state.connectChain ?? 'solana';
    return { all, resolved, has };
  }

  chainOf(id) { return String(id).startsWith('solana:') ? 'solana' : 'evm'; }

  walletRowsForChain() {
    const { all, resolved } = this.connectChains();
    return all.filter((w) => this.chainOf(w.id) === resolved);
  }

  connectChainVals() {
    const { resolved, has } = this.connectChains();
    const tab = (chain, label) => {
      const on = resolved === chain;
      return {
        label,
        pick: () => { this.sfx('ui'); this.setState({ connectChain: chain }); },
        style: `flex:0 0 auto;padding:9px 18px;border-radius:8px;font-size:13px;letter-spacing:.02em;`
          + `transition:background .18s ease,color .18s ease,box-shadow .18s ease;`
          /* The same gradient every other filled action uses. The tab had its
             own, a stop lighter (BRASS→CTA), and ON_FILL on it came to 3.09:1 —
             the selected chain was the least readable word on the screen.
             tools/audit-contrast.mjs now covers this screen and would catch it
             again. */
          + (on
            ? `background:linear-gradient(180deg,#8b5cf6,#6d3fd4);color:${ON_FILL};font-weight:600;`
              + 'box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 6px 16px -10px rgba(139,92,246,.9)'
            : `background:rgba(255,255,255,.04);color:${MUTED};border:1px solid rgba(232,236,248,.14)`),
        // A quiet dot only where a wallet for that chain is actually present.
        dot: `display:${has(chain) ? 'inline-block' : 'none'};width:5px;height:5px;border-radius:50%;`
          + `margin-left:8px;vertical-align:middle;background:${on ? ON_FILL : WIN}`,
      };
    };
    return {
      chainTabs: [tab('evm', 'Ethereum'), tab('solana', 'Solana')],
      chainTabsStyle: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap',
      /* A line above the list, shown when nothing on this chain is installed.
         The list itself is never empty now — every catalogue wallet gets an
         install row — so this explains what those rows are rather than
         apologising for an empty panel. */
      chainEmpty: !this.walletRowsForChain().some((w) => w.detected),
      // On a phone the rows open the wallet's app instead (see openInApp), and
      // "install it" would be advice nobody can follow.
      chainEmptyNote: this.walletRowsForChain().some((w) => w.open)
        ? 'A phone browser cannot hold a wallet. Pick yours below and this page reopens inside its app, where you connect as usual.'
        : resolved === 'solana'
        ? 'No Solana wallet in this browser yet. Pick one below to install it, this list fills itself once it is ready.'
        : 'No Ethereum wallet in this browser yet. Pick one below to install it, this list fills itself once it is ready.',
      chainEmptyStyle: `padding:22px 18px;font-size:14px;line-height:1.55;color:${MUTED};`
        + 'border-top:1px solid rgba(232,236,248,0.14);border-bottom:1px solid rgba(232,236,248,0.14)',
    };
  }

  pickWallet = (name, _unusedShort?) => () => {
    if (!this.wallet) return;
    this.setState({ approving: name });
    this.wallet.connect(name).then(() => {
      // Where a sign-in goes next: a screen that asked to be returned to (the
      // staking page) gets it, and everyone else lands in the lobby — funded
      // or not. The funding step used to be forced on anyone who could not yet
      // afford a seat; it is still one click away (the account menu's Deposit,
      // or sitting at a table the bankroll does not cover), but a sign-in no
      // longer ends on a deposit form nobody asked for.
      const back = this.state.connectReturn;
      this.setState({ approving: null, connectReturn: null, connectStep: 0 }, () => this.go(back || 'lobby', true)());
      // The profile and the funding step's name prompt both read this.
      this.loadMe();
      this.toast('Wallet connected \u00b7 ' + name, 'ok');
      this.checkJackpotWin();
    }).catch((err) => {
      // Dismissing a wallet popup is the most common wallet interaction there
      // is — the screen must come back, not wedge on "approve in …".
      this.setState({ approving: null });
      const friendly = this.wallet._explain ? this.wallet._explain(err) : err;
      this.toast(String((friendly && friendly.message) || friendly || 'the wallet refused'), 'err');
    });
  };

  /* A row for a wallet this browser does not have. It cannot sign in, so it
     sends the visitor to the Chrome Web Store instead — in a new tab, because
     losing the half-finished connect screen to a download page is the worst of
     both. `noopener` so the store page gets no handle on this window.

     Nothing polls for the result: the extension lands, the page is reloaded or
     refocused, and discovery picks it up on the next render — which is why
     detectProviders() is a function called at render rather than a constant. */
  openInstall = (row) => () => {
    this.sfx('ui');
    if (!row.install) {
      this.toast(`${row.label} installs from the Chrome Web Store, this browser cannot use it`, 'bad');
      return;
    }
    window.open(row.install, '_blank', 'noopener,noreferrer');
    this.toast(`Opening the Chrome Web Store · ${row.label}`, 'ok');
  };

  /* The same row on a phone. No extension can ever land in this browser, so
     the way in is the wallet app's own: its universal link reopens this site
     inside the app, where the wallet is injected and the connect screen finds
     it like any desktop extension. A plain navigation in the tap's own turn —
     a universal link opened any other way (a new tab, a timer) is one the OS
     declines to hand to the app. Without the app installed the same link is
     the wallet's own page, which is where its download is. */
  openInApp = (row) => () => {
    this.sfx('ui');
    this.toast(`Opening ${row.label}…`, 'ok');
    window.location.href = row.open;
  };

  /* ── funding ────────────────────────────────────────────────────────────
     Deposits fund one bankroll that every table draws from. All of the actual
     work lives in `engine/wallet.js` — the money seam — so a redesign inherits
     it rather than reimplementing it.                                        */

  /* ── leaderboard ──────────────────────────────────────────────────────
     Ranked by net, not volume: volume rewards churn, and this table decides
     who gets rake back.                                                     */

  loadLobby = () => {
    if (!this.server) return;
    fetch(`${this.server}/api/lobby`)
      .then(this.okJson)
      .then((body) => {
        const stakeOfId = (id) => String(id).split('-')[0];
        LIVE_ROOMS = (body.tables || []).map((t) => ({
          id: t.id,
          stake: stakeOfId(t.id),
          name: t.name,
          seated: t.seated,
          open: t.seated < t.maxSeats,
          speed: 'normal',
          // Null is carried through rather than flattened to 0. "No average
          // yet" and "the pots here are tiny" are different claims, and the
          // lobby renders them differently.
          avgPot: t.avgPot == null ? null : t.avgPot / 1e6,
          // The server's own blinds and buy-in band, not the static STAKES
          // guess keyed off the id prefix. They agree today, but the bounds
          // decide whether a busted player is offered a rebuy or told to go
          // and deposit, so they are read from the table that will accept the
          // buy-in rather than inferred from its name.
          sb: t.sb / 1e6, bb: t.bb / 1e6,
          min: t.minBuyIn / 1e6, max: t.maxBuyIn / 1e6,
          // The sparkline is decoration, not data. Until there is per-table
          // history worth charting it stays flat rather than inventing a curve.
          spark: '\u2581'.repeat(12),
        }));
        ROOMS_PENDING = false;
        this.setState({ roomsAt: Date.now(), playersOnline: body.playersOnline ?? 0 });
      })
      // No gateway answer: fall back to the demo set, as before.
      .catch(() => { if (ROOMS_PENDING) { ROOMS_PENDING = false; this.setState({ roomsAt: Date.now() }); } });
  };

  /**
   * Move money in or out of the bankroll from the profile.
   *
   * Both directions go through `engine/wallet.js`, which owns every signature
   * and relay. Nothing here touches a key.
   */
  fundMove = (dir) => {
    /* One move at a time. `fundBusy` was set on every call and read only to dim
       the button — which is not a guard, and a deposit has no server in the
       path to dedupe a second one, so two clicks were two transactions for the
       full amount each. The connect screen's own deposit already gates on
       `state.depositing` this way; this is the same rule for the profile card
       and the tournament payout's withdraw, which share this handler. */
    if (this.state.fundBusy) return;
    const amount = Number(this.state.fundDraft);
    if (!(amount > 0)) {
      this.setState({ fundNote: 'Enter an amount first', fundBad: true });
      return;
    }
    if (!this.wallet || !this.wallet[dir]) {
      this.setState({ fundNote: `${dir} is not available on this server`, fundBad: true });
      return;
    }
    this.setState({ fundBusy: true, fundNote: '', fundBad: false, fundTx: null });
    this.wallet[dir](amount)
      .then((r) => {
        // The note says what moved and stays put; the toast is gone in a few
        // seconds and a link nobody can reach is not a receipt.
        this.setState({
          fundBusy: false, fundDraft: '', fundBad: false,
          fundNote: `${dir === 'deposit' ? 'Deposited' : 'Withdrew'} ${fmt(amount)} USDC`,
          fundTx: (r && r.explorer) || null,
        });
        this.toast(`${dir === 'deposit' ? 'Deposited' : 'Withdrew'} ${fmt(amount)} usdg`, 'ok');
        this.sfx('chips');
        this.loadFundHistory();
      })
      .catch((e) => {
        // The server names which of the four "still in play" cases applies, so
        // showing it verbatim beats any generic line we could substitute.
        this.setState({ fundBusy: false, fundBad: true, fundNote: String((e && e.message) || e), fundTx: null });
        this.sfx('error');
        // A move that "failed" here can still have left a row behind — a
        // withdrawal held for review, a deposit still confirming.
        this.loadFundHistory();
      });
  };

  /** The profile's deposit and withdrawal list. See `wallet.fundingHistory`. */
  loadFundHistory = () => {
    if (!this.server || !this.wallet || !this.wallet.fundingHistory) return;
    const token = this.wallet.token && this.wallet.token();
    // Rows read under another session are another account's. Those are dropped
    // before the fetch, not after it, so they cannot outlive a read that fails.
    const mine = !!token && token === this.fundHistToken;
    this.fundHistToken = token;
    this.setState({ fundHist: mine ? this.state.fundHist : null, fundHistBusy: true, fundHistErr: false });
    const current = () => this.fundHistToken === token;
    this.wallet.fundingHistory()
      .then((rows) => { if (current()) this.setState({ fundHist: rows, fundHistBusy: false }); })
      // Keep this session's rows on screen: a failed re-read is not an empty history.
      .catch(() => { if (current()) this.setState({ fundHistBusy: false, fundHistErr: true }); });
  };

  fundDeposit = () => this.fundMove('deposit');
  fundWithdraw = () => this.fundMove('withdraw');

  /* The sign-up name, from the funding step. Same endpoint as the profile
     editor; the separate draft keeps the two forms from typing into each
     other. On success the prompt row disappears (loadMe refreshes the
     nickname the row keys on). */
  saveSignupNick = () => {
    const r = checkNick(this.state.snDraft);
    if (!r.ok || !this.server) {
      this.setState({ snMsg: r.msg, snBad: true });
      this.sfx('error');
      return;
    }
    const token = this.wallet && this.wallet.token && this.wallet.token();
    fetch(`${this.server}/api/nickname`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: r.value }),
    })
      .then(this.authCheck)
      .then(async (res) => { const b = await res.json(); if (!res.ok) throw new Error(b.error); return b; })
      .then((b) => {
        this.setState({ nick: b.name, snMsg: '', snBad: false });
        this.loadMe();
        this.toast(`You play as ${b.name}`, 'ok');
        this.sfx('seat');
      })
      .catch((e) => {
        this.setState({ snMsg: String((e && e.message) || e), snBad: true });
        this.sfx('error');
      });
  };

  /** The player's own record. Real hands only — see /api/me. */
  /** Your own hands, with the proof needed to re-deal each one. */
  loadHands = () => {
    const token = this.wallet && this.wallet.token && this.wallet.token();
    if (!this.server || !token) return;
    fetch(`${this.server}/api/hands?limit=50`, { headers: { authorization: `Bearer ${token}` } })
      .then(this.okJson)
      .then((body) => {
        const hands = (body.hands || []).map((h) => ({
          handId: h.handId,
          handNo: h.handNo,
          commit: h.commit,
          serverSeed: h.serverSeed,
          clientSeeds: h.clientSeeds || [],
          board: h.board || [],
          dealt: h.dealt,
          // Absolute deal positions, left alone: the verifier re-derives the
          // deck from these and `heroHole` below is matched against them.
          revealed: h.revealed || [],
          // Normalised into the shape the live `hand:end` path produces, because
          // both land in the same `st.history` and the renderer can only read
          // one of them. The wire is micro-USDC and the screen is dollars, and
          // nothing converted — which is why a 29.97 USDC pot displayed as
          // "+29,966,900". Hero goes to seat 0, which is how the row marks
          // itself as yours.
          seats: (h.seats || []).map((s) => ({
            seat: s.position === h.you ? 0 : s.position + 1,
            name: s.alias,
            net: (s.net || 0) / 1e6,
          })),
          rake: (h.rake || 0) / 1e6,
          remote: true,
          // `you` is derived for the authenticated caller and never stored in
          // the record, so the row can be highlighted without the log knowing
          // who anybody is.
          heroHole: (h.revealed || []).find((r) => r.position === h.you)?.hole || [],
          heroNet: (((h.seats || []).find((x) => x.position === h.you) || {}).net || 0) / 1e6,
        }));
        if (hands.length) this.setState({ history: hands });
      })
      .catch(() => {});
  };

  /**
   * The proof for one hand: the server seed, and the cards that were shown.
   *
   * Not on the socket and deliberately so \u2014 the seed re-derives all 52
   * cards, so a spectator holding it could read every hand that was mucked.
   * /api/hands serves it to the seats that were dealt in, and only those. A
   * record that came from there already carries it and needs no second trip.
   */
  proofFor = (h) => {
    const fetched = h.serverSeed
      ? Promise.resolve(h)
      : (() => {
        const token = this.wallet && this.wallet.token && this.wallet.token();
        if (!this.server || !token) return Promise.reject(new Error('sign in to verify a hand'));
        return fetch(`${this.server}/api/hands?id=${encodeURIComponent(h.handId)}`, {
          headers: { authorization: `Bearer ${token}` },
        })
          .then(this.okJson)
          .then((body) => ({ ...h, ...body.hand }));
      })();
    /* The commitment has to be the one we saw BEFORE the deal, not the one
       handed back with the seed. Otherwise both halves of commit-and-reveal
       come from the same party at the same moment, and a server that picked
       its deck late could hand out a matching pair and pass. We only hold it
       for hands played while this tab was connected — say nothing about the
       rest rather than pretend to have checked. */
    return fetched.then((proof) => {
      const saw = this.adapter && this.adapter.witnessedCommit
        ? this.adapter.witnessedCommit(proof.handNo)
        : null;
      if (saw && saw !== proof.commit) {
        throw new Error('this is not the commitment published before the deal — do not trust this hand');
      }
      return { ...proof, witnessed: !!saw };
    });
  };

  loadMe = () => {
    const token = this.wallet && this.wallet.token && this.wallet.token();
    if (!this.server || !token) { this.setState({ me: null, meErr: false }); return; }
    fetch(`${this.server}/api/me`, { headers: { authorization: `Bearer ${token}` } })
      .then(this.okJson)
      .then((me) => this.setState({ me }))
      /* `me: null` on its own cannot be read: it is also the value this state
         starts at, and `meLoading` tests exactly that — so a 500 left the
         profile saying "…" forever, until the player navigated away and back.
         A read that failed is a different thing from a read that has not
         happened, and the screen should say which. */
      .catch(() => this.setState({ me: null, meErr: true }));
  };

  loadRakeback = () => {
    const token = this.wallet && this.wallet.token && this.wallet.token();
    if (!this.server || !token) { this.setState({ rb: null }); return; }
    fetch(`${this.server}/api/rakeback`, { headers: { authorization: `Bearer ${token}` } })
      .then(this.okJson)
      .then((rb) => this.setState({ rb }))
      .catch(() => this.setState({ rb: null }));
  };

  claimRakeback = () => {
    const token = this.wallet && this.wallet.token && this.wallet.token();
    if (!token || this.state.rbBusy) return;
    // On an EVM deployment rakeback redeems as one signed transaction to the
    // wallet (prepare -> sign -> submit); everywhere else the gateway moves it
    // into the bankroll (`toBankroll`). The wallet layer decides which.
    if (!this.wallet.redeemRakeback) { this.toast('Rakeback redemption is not available here', 'bad'); return; }
    this.setState({ rbBusy: true, rbTx: null });
    this.wallet.redeemRakeback()
      .then((r) => {
        this.setState({ rbBusy: false, rbTx: (r && r.explorer) || null });
        this.wallet.refresh && this.wallet.refresh();
        this.loadRakeback();
        this.toast(r.toBankroll
          ? `${fmt(r.redeemed / 1e6)} USDC rakeback added to your bankroll`
          : `redeemed ${fmt(r.redeemed / 1e6)} USDC rakeback`, 'ok');
        this.sfx('chips');
      })
      .catch((e) => { this.setState({ rbBusy: false, rbTx: null }); this.toast(String((e && e.message) || e), 'bad'); });
  };

  loadStats = () => {
    if (!this.server) { this.setState({ stats: null }); return; }
    fetch(`${this.server}/api/stats`)
      .then(this.okJson)
      .then((stats) => this.setState({ stats }))
      .catch(() => {});
  };

  /* ── tournaments ────────────────────────────────────────────────────────
     A minimal register/unregister rail (the polished lobby is Part 4). Every
     list row carries the server's own `registered` flag — never assumed
     client-side — and the two actions are a challenge → wallet-signed
     consent → submit round trip, same shape the rakeback redemption uses:
     the gateway names the exact amount in the message, the wallet is what
     actually shows and signs it, we never construct that string ourselves. */

  /** Joinable tournaments. GET is public; a bearer token additionally marks
      each row's `registered`/`invited` flags, which is what points each row's
      button the right way. */
  loadTournaments = () => {
    if (!this.server) { this.setState({ tournaments: [], tourErr: false }); return; }
    const token = this.wallet && this.wallet.token && this.wallet.token();
    fetch(`${this.server}/api/tournaments`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
      .then(this.okJson)
      .then((body) => {
        const rows = body.tournaments || [];
        this.setState({ tournaments: rows, tourErr: false });
        /* The hero states the structure — starting stack, level length, the
           payout places and the blind ladder — and NONE of that is on the list
           endpoint; `handleList` ships money and counts only. So the featured
           event's detail is fetched once, here. One extra request, and the
           panel renders em dashes until it lands rather than inventing a
           ladder that might not be this event's. */
        const feat = rows.filter((t) => t.state === 'registering').sort((a, b) => a.startAt - b.startAt)[0]
          || rows.filter((t) => t.state === 'scheduled').sort((a, b) => (a.openAt || 0) - (b.openAt || 0))[0]
          || null;
        if (!feat) { this.setState({ tFeatDetail: null }); return; }
        if (this.state.tFeatDetail && this.state.tFeatDetail.id === feat.id) return;
        fetch(`${this.server}/api/tournaments/${feat.id}`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
          .then((d) => { if (d && d.id === feat.id) this.setState({ tFeatDetail: d }); })
          .catch(() => this.setState({ tFeatDetail: null }));
      })
      /* Swallowing this said "nothing scheduled" when the truth was "we could
         not ask" — the one sentence on the screen, stated as fact, on no
         information at all. The list keeps whatever it last had; only the
         claim changes. */
      .catch(() => this.setState({ tourErr: true }));
  };

  /** Add/remove one id from the per-row busy map, immutably — a fresh object
      each time, matching the file's other map-shaped state (e.g. `verified`),
      so a wallet round-trip on one row never marks a different row idle. */
  setTournamentBusy(id, on) {
    this.setState((s) => {
      const next = { ...s.tournamentBusy };
      if (on) next[id] = true; else delete next[id];
      return { tournamentBusy: next };
    });
  }

  registerForTournament = async (id) => {
    const token = this.wallet && this.wallet.token && this.wallet.token();
    if (!this.server || !token) return;
    const authed = (path, body) => fetch(`${this.server}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body || {}),
    }).then(this.authCheck).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.status); return j; });
    this.setTournamentBusy(id, true);
    this.setState({ tournamentError: '' });
    try {
      const ch = await authed(`/api/tournaments/${id}/register/challenge`, {});
      const signature = await this.wallet.signMessage(ch.message);
      await authed(`/api/tournaments/${id}/register`, { nonce: ch.nonce, signature });
      this.toast('Registered for the tournament', 'ok');
      this.sfx('chips');
      this.loadTournaments();   // refresh the list
      // Registering is the moment this client acquires a pending event, so it
      // must (re)START discovery. The tab-entry poll saw an empty list,
      // mineDelay([]) returned null, and the loop deleted its own timer — so
      // without this the player is registered, seated server-side, and
      // invisible to their own browser until they navigate away and back.
      // pollMine clears tMineTimer on entry, so this is idempotent.
      this.pollMine();
    } catch (err) {
      this.setState({ tournamentError: String((err && err.message) || err) });
      this.sfx('error');
    } finally {
      this.setTournamentBusy(id, false);
    }
  };

  /** Mirror of registerForTournament, on the /unregister/... paths. */
  unregisterFromTournament = async (id) => {
    const token = this.wallet && this.wallet.token && this.wallet.token();
    if (!this.server || !token) return;
    const authed = (path, body) => fetch(`${this.server}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body || {}),
    }).then(this.authCheck).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.status); return j; });
    this.setTournamentBusy(id, true);
    this.setState({ tournamentError: '' });
    try {
      const ch = await authed(`/api/tournaments/${id}/unregister/challenge`, {});
      const signature = await this.wallet.signMessage(ch.message);
      await authed(`/api/tournaments/${id}/unregister`, { nonce: ch.nonce, signature });
      this.toast('Withdrew from the tournament', 'ok');
      // Part 4 Task 3: withdrawing from the event this client is tracking ends
      // the session — stop the poll/ticker and drop the state machine.
      if (this.state.tSession && this.state.tSession.tournamentId === id) this.endTournamentSession();
      this.loadTournaments();   // refresh the list
      this.pollMine();          // recompute the discovery cadence off the new (possibly empty) set
    } catch (err) {
      this.setState({ tournamentError: String((err && err.message) || err) });
      this.sfx('error');
    } finally {
      this.setTournamentBusy(id, false);
    }
  };

  /** List row / anywhere else -> the detail screen. Stashes the id and clears
      any previous event's payload before navigating, so a slow fetch never
      shows the last-opened tournament's numbers under the new one's name. */
  openTournament = (id, silent?) => {
    // openTournament bypasses go(), so it must also do go()'s leaderboard-ticker
    // teardown — a Back/Forward or deep link arriving from /leaderboard would
    // otherwise leave jkTimer setState-ing once a second forever.
    clearInterval(this.jkTimer); this.jkTimer = null;
    // FIX-3 (whole-branch review): openTournament bypasses go(), so clear the
    // results-seeded fundDraft here too when this is the exit from the results
    // screen (results → "view tournament" → detail → profile), else the stale
    // payout leaks onto the profile funding card.
    const clearDraft = this.state.screen === 'tournamentResult' ? { fundDraft: '', fundNote: '', fundBad: false } : {};
    this.setState({ tournamentDetailId: id, tournamentDetail: null, screen: 'tournamentDetail', ...clearDraft }, () => { if (!silent) this.sfx('ui'); this.loadTournamentDetail(); });
  };

  /** The bare re-read: the same GET with NO side effects — no ticker re-arm, no
      pollMine — so the second-ticker can call it on a cadence without clearing
      the interval it is itself running inside. Guards a slow response for an
      event the player has already navigated off (open A, back, open B). */
  fetchTournamentDetail = () => {
    const id = this.state.tournamentDetailId;
    if (!id || !this.server) return;
    const token = this.wallet && this.wallet.token && this.wallet.token();
    fetch(`${this.server}/api/tournaments/${id}`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
      // `r.json()` alone accepted the gateway's ERROR bodies as tournaments:
      // a 404 or a 501 parses to `{ error: '…' }`, which is truthy, has no
      // `payouts` and no `blinds`, and took the detail screen's `.map` down
      // with it — and a throw in renderVals blanks every screen, not just
      // this one. An error is a rejection, and the screen keeps its spinner.
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => { if (this.state.tournamentDetailId === id) this.setState({ tournamentDetail: d }); })
      .catch(() => {});
  };

  /** GET /api/tournaments/:id — the detail screen's one load. A bearer token
      additionally fills in `you` (registered/invited/live seat/finish), same
      shape `loadTournaments` uses for the list's per-row flags. */
  loadTournamentDetail = () => {
    const id = this.state.tournamentDetailId;
    if (!id || !this.server) return;
    // Part 4 Task 3 (Ruling 6): the per-second ticker must run while the player
    // is anywhere in the tournament flow, so the detail screen's start-countdown
    // ticks. Start it here (idempotent) rather than only in go(), so the normal
    // list-row → openTournament path — which does not pass through go() — ticks
    // too. `pollMine` catches a live seat the instant this event starts.
    this.startTNowTicker();
    this.pollMine();
    this.fetchTournamentDetail();
  };

  /* ── Part 4 Task 3: tournament session controller ─────────────────────────
     The client-side poll + state machine that follows a registered player from
     lobby → seat → table moves → bust/win. `pollMine` discovers/resumes the
     active seat; the seated poll (`tSessTimer`) diffs the enhanced detail's
     `you` each tick and drives auto-seat, follow-move and bust routing. The
     felt itself is the cash felt reused — see `enterTournamentTable`. Nothing
     here gates the field: moves are server-side with turn auto-fold, so every
     transition is a courtesy warn that AUTO-advances (spec §4.3). */

  // Discover/resume the caller's active tournament from /api/tournaments/mine.
  // Runs on app load and on entering the tournaments area / a detail screen.
  // Auto-seats when the runtime has given the caller a live tableId; routes a
  // finished entry (busted while away) to the results screen. Idempotent and
  // self-guarding — it never re-triggers a move it is already showing.
  // How long until the NEXT discovery poll — or null to stop. `pollMine` only
  // ever ran on navigation (app load, entering the tournaments area / a detail
  // screen), so a player who signed up and then simply WAITED for the clock —
  // on the detail, list or lobby screen — was never re-checked, and the runtime
  // assigning their seat at start went unseen: registered, but never seated,
  // staring at an empty screen while the bots (which poll /mine in a loop) sat
  // down. So discovery must self-reschedule until the seat is adopted: fast
  // while an event is live and we still owe a seat, a slow heartbeat while only
  // waiting on an upcoming event, and off once nothing is pending. A seat we've
  // adopted (seated/moving on it) is the seated poll's job — never re-polled here.
  //
  // `locked` is the trap that made the loop die in the last seconds before the
  // seat existed: the scheduler flips registering→locked on a 10s tick and the
  // runtime only then seats and flips locked→running on its own 5s tick, so
  // `locked` is a real, multi-second, observable state. It was in neither branch
  // below, so a heartbeat landing in it returned null and stopped discovery for
  // good. It now takes the FAST lane — the seat is seconds away.
  mineDelay = (regs) => {
    const s = this.state.tSession || {};
    let live = false, pending = false;
    for (const r of regs || []) {
      if (r.finishPlace != null) continue;                 // finished — not awaiting a seat
      if (r.state === 'running' || r.state === 'final_table') {
        const adopted = (s.status === 'seated' || s.status === 'moving')
          && s.tournamentId === r.tournamentId && (s.tableId === r.tableId || s.moveTo === r.tableId);
        if (!adopted) live = true;                          // seat assigned or imminent — grab it now
      } else if (r.state === 'locked') {
        live = true;                                        // lock → start is seconds away — fast lane
      } else if (r.state && r.state !== 'complete' && r.state !== 'cancelled') {
        pending = true;                                     // upcoming (incl. draft) — watch for the start flip
      }
    }
    return live ? 2000 : pending ? 6000 : null;
  };

  pollMine = () => {
    clearTimeout(this.tMineTimer); this.tMineTimer = null;  // exactly one discovery timer in flight
    if (!this.server || !this.hasToken()) return;
    const token = this.wallet.token();
    const rearm = (regs) => { const d = this.mineDelay(regs); if (d != null) this.tMineTimer = setTimeout(this.pollMine, d); };
    fetch(`${this.server}/api/tournaments/mine`, { headers: { authorization: `Bearer ${token}` } })
      .then(this.authCheck)
      // A 401 body parses perfectly well as JSON, yielding zero registrations —
      // which would clobber `tMine` to [] and stop discovery for good. Route a
      // non-OK response into the catch below, which always re-arms instead.
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((body) => {
        const regs = (body && body.registrations) || [];
        // Part 4 Task 6: stash the raw per-registration list so the tournaments
        // LIST can key its own rows off it (seated → "return to your table",
        // finished → "view result") without a second fetch — this is the same
        // /mine call the session controller below already makes on every tab
        // entry (go()'s `screen === 'tournaments'` branch) and detail load.
        this.setState({ tMine: regs });
        const active = regs.find((r) => r.state === 'running' || r.state === 'final_table');
        const s = this.state.tSession || {};
        // Busted while away: finished (finishPlace set) with no live seat → route
        // to results, once. The busted guard stops a re-route every poll.
        if (active && active.finishPlace != null && !active.tableId) {
          if (!(s.status === 'busted' && s.tournamentId === active.tournamentId)) this.routeTournamentResult(active);
        } else if (active && active.tableId) {
          // Adopt the tournament id, then courtesy-warn + auto-advance onto the
          // felt (beginMove is shared by the initial auto-seat and every move) —
          // unless we're already following this exact seat.
          const following = (s.status === 'moving' && s.moveTo === active.tableId)
            || (s.status === 'seated' && s.tableId === active.tableId);
          if (!following) {
            this.setState(
              { tSession: { ...s, tournamentId: active.tournamentId, seatNo: active.seatNo ?? null } },
              () => this.beginMove(active.tableId, active.pauseReason, active.tournamentId),
            );
          }
        }
        rearm(regs);
      })
      // Never STOP on an error. A blip, a redeploy or an expired token must not
      // end discovery — that is how a registered player goes permanently blind.
      // The bot loop's `catch { await wait(3000); continue; }` is the model.
      .catch(() => { this.tMineTimer = setTimeout(this.pollMine, 6000); });
  };

  // Arm the seated poll + the whole-flow second-ticker. Called once the felt is
  // attached (enterTournamentTable) and when returning to the felt via go().
  // Idempotent — every arm clears its predecessor first, so re-entry never leaks
  // a second interval.
  startTournamentSession = () => {
    this.startTNowTicker();
    clearInterval(this.tSessTimer);
    this.tSessTimer = setTimeout(this.pollTournamentSession, 0); // first tick immediately
  };

  // The per-second ticker that drives every countdown across the tournament
  // flow (the detail-screen start clock AND the move overlay), not only while
  // seated — Ruling 6. It also fires the auto-advance the instant a move
  // countdown elapses, so the advance never waits on the 2s poll cadence.
  startTNowTicker = () => {
    clearInterval(this.tNowTimer);
    let n = 0;
    this.tNowTimer = setInterval(() => {
      this.setState({ now: Date.now() });
      this.advanceMoveIfDue();
      // The clocks tick locally, but `state`, `entrants` and the pool only ever
      // change server-side: without a re-read a row counts down to zero and
      // sits on "starting…" forever, a scheduled row never visibly flips to
      // registering, and other players signing up or withdrawing never show.
      // So re-read every 3s — the headcount and pool should look live — plus a
      // fast path on the exact tick a deadline elapses so the flip is seen
      // within a second. A hidden tab skips the fetch (nobody is looking) and
      // catches up within a few ticks of coming back. LOBBY SCREENS ONLY — the
      // felt has its own 2s seated poll, and this guard is what keeps the
      // ticker from issuing fetches there.
      const sc = this.state.screen;
      if (sc !== 'tournaments' && sc !== 'tournamentDetail') return;
      if (document.hidden) return;
      if (!(++n % 3 === 0 || this.tDeadlinePassed())) return;
      if (sc === 'tournaments') this.loadTournaments(); else this.fetchTournamentDetail();
    }, 1000);
  };

  // True on the single tick where a visible event's own deadline (openAt for a
  // scheduled row, startAt for a registering one) has just elapsed — the moment
  // the gateway's `transition` fires. Latched per id+state so it reports once,
  // not on every tick thereafter. The latch is dropped in endTournamentSession
  // so it cannot grow unbounded across a long session.
  tDeadlinePassed = () => {
    const now = Date.now();
    const seen = (this._tDue = this._tDue || {});
    const list = this.state.screen === 'tournamentDetail'
      ? (this.state.tournamentDetail ? [this.state.tournamentDetail] : [])
      : (this.state.tournaments || []);
    let hit = false;
    for (const t of list) {
      const at = t.state === 'scheduled' ? t.openAt : t.state === 'registering' ? t.startAt : null;
      if (at == null || now < at) continue;
      const key = `${t.id}:${t.state}`;
      if (seen[key]) continue;
      seen[key] = true; hit = true;
    }
    return hit;
  };

  // One seated-poll tick: fetch the enhanced detail, diff `you`, act, then
  // reschedule (2s, tightening to ~1s on the bubble). A terminal transition
  // (bust) stops the poll and does NOT reschedule. Guards a stale in-flight
  // response after the session changed or ended so it never re-arms a dead poll.
  pollTournamentSession = () => {
    const s0 = this.state.tSession;
    if (!s0 || !s0.tournamentId) return; // session ended — do not re-arm
    const id = s0.tournamentId;
    const token = this.wallet && this.wallet.token && this.wallet.token();
    fetch(`${this.server}/api/tournaments/${id}`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
      .then(this.okJson)
      .then((d) => {
        const cur = this.state.tSession;
        if (!cur || cur.tournamentId !== id) return; // session changed/ended under us — drop, do not re-arm
        if (!d || d.error) { this.scheduleSessPoll(TSESS_POLL_MS); return; }
        // FIX 5: terminal event lifecycle (spec §8). If the event ends without
        // stamping THIS player's finishPlace (a cancellation, or a defensive
        // 'complete' we didn't route via enterBust), the felt would stay
        // attached and the poll spin forever. Detect it before the you-diff:
        // tear the adapter down (mirror enterBust), stop the session, notify.
        if (d.state === 'cancelled') {
          if (this.adapter) { this.unsub && this.unsub(); this.adapter.destroy(); this.adapter = null; }
          this.endTournamentSession();
          this.toast('Tournament cancelled, your buy-in was refunded', 'warn');
          this.go('tournaments', true)(); // silent — re-arms the ticker + re-reads the list, which a bare setState skips
          return;
        }
        if (d.state === 'complete' && (!d.you || d.you.finishPlace == null)) {
          if (this.adapter) { this.unsub && this.unsub(); this.adapter.destroy(); this.adapter = null; }
          this.endTournamentSession();
          this.go('tournaments', true)(); // silent — re-arms the ticker + re-reads the list, which a bare setState skips
          return;
        }
        const you = d.you || {};
        if (you.finishPlace != null) { this.enterBust(d, you); return; } // bust/win → results (stops the poll)
        if (you.tableId && cur.tableId && you.tableId !== cur.tableId && cur.status === 'seated') {
          this.beginMove(you.tableId, you.pauseReason, id); // moved → warn + auto-advance
          this.setState({ tSessionDetail: d });
          this.scheduleSessPoll(this.sessPollDelay(d));
          return;
        }
        // Still seated here — update the HUD source. Ruling 1: this is the
        // seated poll's OWN key (tSessionDetail), never `tournamentDetail`.
        this.setState({ tSessionDetail: d });
        this.scheduleSessPoll(this.sessPollDelay(d));
      })
      .catch(() => { const cur = this.state.tSession; if (cur && cur.tournamentId === id) this.scheduleSessPoll(TSESS_POLL_MS); });
  };

  // 2s normally; ~1s once the field is at the bubble (remaining ≤ payouts+1),
  // where a single elimination can move money and the clock must feel live.
  sessPollDelay = (d) => {
    const remaining = d && typeof d.remaining === 'number' ? d.remaining : null;
    const payouts = d && Array.isArray(d.payouts) ? d.payouts.length : 0;
    return (remaining != null && payouts && remaining <= payouts + 1) ? TSESS_POLL_FAST_MS : TSESS_POLL_MS;
  };

  // The poll re-arms itself as a self-rescheduling timeout (not a fixed
  // interval) so the cadence can tighten at the bubble. `clearInterval` clears a
  // timeout handle just as well, so the go()/end teardown next to jkTimer works.
  scheduleSessPoll = (delay) => {
    clearInterval(this.tSessTimer);
    this.tSessTimer = setTimeout(this.pollTournamentSession, delay);
  };

  // Warn + short countdown, then AUTO-advance onto `newTableId` — shared by the
  // initial auto-seat and every table move. Never a tap-gate: the countdown
  // elapsing (advanceMoveIfDue) advances on its own, and "go now" only shortcuts
  // it. `reason` (a runtime PauseReason) labels the overlay.
  beginMove = (newTableId, reason, tournamentId) => {
    const s = this.state.tSession || {};
    this.setState({
      tSession: {
        tournamentId: tournamentId || s.tournamentId || null,
        tableId: s.tableId || null,
        status: 'moving',
        moveTo: newTableId,
        countdownAt: Date.now() + TSESS_MOVE_MS,
        pauseReason: reason || null,
        seatNo: s.seatNo ?? null,
      },
      now: Date.now(),
    }, () => { this.startTNowTicker(); }); // ensure the countdown ticks even before a seated poll exists (initial auto-seat)
    this.sfx('ui');
  };

  // Fired every ticker second (and every poll tick): once a move countdown has
  // elapsed, advance. This is what makes the move auto-complete with no tap.
  advanceMoveIfDue = () => {
    const s = this.state.tSession;
    if (s && s.status === 'moving' && s.countdownAt != null && Date.now() >= s.countdownAt) this.goMoveNow();
  };

  // "go now" button / countdown-elapsed: attach to the pending table now.
  goMoveNow = () => {
    const s = this.state.tSession || {};
    if (s.status !== 'moving' || !s.moveTo) return;
    this.enterTournamentTable(s.moveTo, s.seatNo, s.tournamentId); // FIX 2: thread the id (beginMove already set it)
  };

  // Attach the felt to a tournament table — Ruling 2: a REAL, working attach so
  // the controller is exercisable on its own (Task 4 layers the HUD on top).
  // Reuses the openTable core, which destroys any prior adapter, creates the
  // remote adapter against THIS tableId (the server owns the id, not tableById),
  // subscribes, sets screen:'table' and starts. `resume:true` reconciles
  // `seated` to the server's projection — the runtime already holds the seat.
  // Then (re)arms the seated poll + ticker and clears the move overlay.
  enterTournamentTable = (tableId, seatNo, tournamentId) => {
    const s = this.state.tSession || {};
    this.setState({
      // FIX 2: carry tournamentId explicitly. When tSession is still null (a
      // cold "take your seat" / "return to your table" before pollMine has
      // populated it) the `...s` spread yields no tournamentId, so
      // pollTournamentSession's `if (!s0.tournamentId) return` kills the seated
      // poll for good. Every call site now threads the id.
      tSession: { ...s, tableId, tournamentId: tournamentId ?? s.tournamentId ?? null, status: 'seated', moveTo: null, countdownAt: null, seatNo: seatNo ?? s.seatNo ?? null },
    }, () => {
      this.openTable(tableId, { resume: true }); // reuses the adapter-destroy → create → subscribe → start core
      this.startTournamentSession();
    });
  };

  // Bust or win: tear down the felt, stop the poll, and route to results with
  // the finished registration — Ruling 3. `fundDraft` is seeded with the
  // payout here (Task 5) so the results screen's withdraw field opens
  // pre-filled rather than picking up whatever was last typed on the profile
  // funding card; `fundNote`/`fundBad` are cleared for the same reason.
  enterBust = (d, you) => {
    // BONUS: already routed to results — a concurrent/late poll must not re-fire
    // and re-seed `fundDraft` (clobbering a withdraw amount mid-edit) or replay
    // the bust sfx.
    const cur = this.state.tSession || {};
    if (cur.status === 'busted') return;
    if (this.adapter) { this.unsub && this.unsub(); this.adapter.destroy(); this.adapter = null; }
    this.clearTimers();
    clearInterval(this.tickTimer);
    clearInterval(this.tSessTimer); this.tSessTimer = null;
    clearInterval(this.tNowTimer); this.tNowTimer = null;
    clearTimeout(this.tMineTimer); this.tMineTimer = null;
    const s = this.state.tSession || {};
    const reg = {
      tournamentId: s.tournamentId || (d && d.id) || null,
      name: (d && d.name) || null,
      state: (d && d.state) || null,
      finishPlace: you.finishPlace ?? null,
      payout: you.payout ?? null,
    };
    this.setState({
      tSession: { ...s, status: 'busted', moveTo: null, countdownAt: null },
      tournamentResult: reg,
      screen: 'tournamentResult',
      // FIX 4: the tournament seat set top-level `seated` (via openTable); the
      // server already cleared the seat on bust and the payout is auto-credited,
      // so clear it here or `fundNote` wrongly reads "leave your table before
      // moving funds" on the results withdraw block AND the profile card.
      seated: false, sittingOut: false,
      fundDraft: usdcToStr(reg.payout), fundNote: '', fundBad: false,
    });
    this.sfx(you.finishPlace === 1 ? 'win' : 'error');
  };

  // pollMine's finished-while-away path: same results route, but with no felt to
  // tear down. Builds the reg shape from a `mine` row. Same `fundDraft` seed
  // as `enterBust` (Task 5).
  routeTournamentResult = (r) => {
    clearInterval(this.tSessTimer); this.tSessTimer = null;
    clearInterval(this.tNowTimer); this.tNowTimer = null;
    this.setState({
      tSession: { tournamentId: r.tournamentId, tableId: null, status: 'busted', moveTo: null, countdownAt: null, pauseReason: null, seatNo: null },
      tournamentResult: {
        tournamentId: r.tournamentId, name: r.name || null, state: r.state || null,
        finishPlace: r.finishPlace ?? null, payout: r.payout ?? null,
      },
      screen: 'tournamentResult',
      seated: false, sittingOut: false, // FIX 4 (defensive): keep the funding note honest even on a cold busted-while-away resume
      fundDraft: usdcToStr(r.payout), fundNote: '', fundBad: false,
    });
  };

  // Third way into the results screen: a "view result" affordance on a
  // finished list/detail row (Task 6), reusing whatever registration shape
  // that row already has (`tournamentId`, `name`, `state`, `finishPlace`,
  // `payout`) rather than requiring a specific one. Same `fundDraft` seed as
  // the other two routes, for the same reason.
  openResult = (reg) => this.setState({
    tournamentResult: reg,
    screen: 'tournamentResult',
    fundDraft: usdcToStr(reg && reg.payout), fundNote: '', fundBad: false,
  });

  // Stop the poll + ticker and clear the session. Called on unregister, on the
  // event completing/cancelling, or on leaving the tournament area for good.
  endTournamentSession = () => {
    clearInterval(this.tSessTimer); this.tSessTimer = null;
    clearInterval(this.tNowTimer); this.tNowTimer = null;
    clearTimeout(this.tMineTimer); this.tMineTimer = null;
    this._tDue = null;                                     // drop the deadline latch with the session
    this.setState({ tSession: null, tSessionDetail: null });
  };

  // Public rarity map (code -> {holders, pct}); feeds the profile gallery's
  // "only x% of players have this" and its rarest-first ordering.
  loadRarity = () => {
    if (!this.server) { this.setState({ rarity: {} }); return; }
    fetch(`${this.server}/api/achievements`)
      .then(this.okJson)
      .then((j) => this.setState({ rarity: j.rarity || {} }))
      .catch(() => {});
  };

  /* How deep the board is fetched. The gateway caps `limit` at 100, so that is
     also where "show more" stops — asking for more returns the same 100 and
     the button would never go away. Reset to the first page whenever the
     period or the stake changes: those are different boards, and carrying a
     depth across them asks for 100 rows of a board nobody has scrolled yet. */
  LB_PAGE = 20;
  LB_MAX = 100;

  loadLeaderboard = (period?, stake = NO_STAKE_ARG, limit?) => {
    const p = period || this.state.lbPeriod;
    // `stake` may be explicitly null (all stakes), so distinguish "not passed"
    // (falls back to current state) from "cleared" (null) with a sentinel
    // default rather than a falsy check.
    const s = stake === NO_STAKE_ARG ? this.state.lbStake : stake;
    const n = Math.min(this.LB_MAX, limit || this.LB_PAGE);
    if (!this.server) { this.setState({ lbPeriod: p, lbStake: s, lbLimit: n, lb: null }); return; }
    const token = this.wallet && this.wallet.token && this.wallet.token();
    const q = `period=${p}&limit=${n}${s ? `&stake=${encodeURIComponent(s)}` : ''}`;
    fetch(`${this.server}/api/leaderboard?${q}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
      .then(this.okJson)
      .then((lb) => this.setState({ lbPeriod: p, lbStake: s, lbLimit: n, lb, lbErr: false }))
      /* An empty board and an unreachable one are not the same news. Without
         this the gateway being down read as "no one has 30+ hands this period
         yet — be the first", which is a confident claim about other players
         made on no information at all. */
      .catch(() => this.setState({ lbPeriod: p, lbStake: s, lbLimit: n, lb: null, lbErr: true }));
  };

  showMoreLeaders = () => {
    const next = Math.min(this.LB_MAX, (this.state.lbLimit || this.LB_PAGE) + this.LB_PAGE);
    if (next === this.state.lbLimit) return;
    this.sfx('ui');
    this.loadLeaderboard(this.state.lbPeriod, NO_STAKE_ARG, next);
  };

  setLbPeriod = (p) => () => { this.setState({ lbPeriod: p }); this.loadLeaderboard(p, NO_STAKE_ARG, this.LB_PAGE); this.sfx('ui'); };
  setLbStake = (e) => { const s = e.target.value || null; this.setState({ lbStake: s }); this.loadLeaderboard(this.state.lbPeriod, s, this.LB_PAGE); this.sfx('ui'); };

  // The jackpot payload feeds both the Jackpot view (pool + recent winners) and
  // the Records view (biggest pots ever) — one fetch, two views.
  /* ── staking ─────────────────────────────────────────────────────────
     One public read (`/api/staking`), all of it chain fact. The page renders
     with or without it: the ladder and the terms are fixed at deployment and
     known in advance, so a failed fetch loses the live figures and nothing
     else. Kept in state so a re-render repaints from the same data. */
  loadStaking = () => {
    if (!this.server) { this.paintStaking(); return; }
    fetch(`${this.server}/api/staking`)
      .then(this.okJson)
      .then((stk) => this.setState({ stk }, () => { this.paintStaking(); this.loadStakingMine(); }))
      .catch(() => this.setState({ stk: null }, () => this.paintStaking()));
  };

  /* Repaint only when there is something new to draw. The ref fires before
     `boot()` assigns `this.R` on a deep-link load (`/staking` refreshed), so
     the first paint has no module to call — `componentDidUpdate` calls this on
     every update to catch that, and the guard below makes all the other calls
     free. */
  /* This wallet's own side of the staking page: positions, what they have
     earned, and what they hold to stake. Read STRAIGHT FROM THE CONTRACT over
     the public RPC — the gateway has no part in it and could not answer for it
     if it wanted to. Cheap enough to re-read after every action. */
  loadStakingMine = () => {
    const stk = this.state.stk;
    const staking = stk && stk.contract;
    const stakeToken = stk && stk.token && stk.token.address;
    if (!staking || !this.wallet || !this.wallet.stakingMine || !this.state.wallet) {
      if (this.state.stkMine) this.setState({ stkMine: null }, () => this.paintStaking(true));
      return Promise.resolve();
    }
    return this.wallet.stakingMine(staking, stakeToken)
      .then((mine) => this.setState({ stkMine: mine }, () => this.paintStaking(true)))
      .catch(() => {});
  };

  /**
   * The 15-second refresh (see go()). Fetches both halves first and applies
   * them only if nobody started typing while it fetched: the check has to sit
   * next to the repaint, not at the top, or a click into the amount box during
   * the fetch is repainted out from under the cursor.
   */
  refreshStakingQuietly = async () => {
    const typing = () => {
      const host = this.stakingEl;
      const a = document.activeElement;
      return !!(host && a && host.contains(a) && a.tagName === 'INPUT');
    };
    if (!this.server || document.hidden || this.state.stkBusy || typing()) return;
    try {
      const stk = await (await fetch(`${this.server}/api/staking`)).json();
      const staking = stk && stk.contract;
      const stakeToken = stk && stk.token && stk.token.address;
      const mine = staking && this.wallet && this.wallet.stakingMine && this.state.wallet
        ? await this.wallet.stakingMine(staking, stakeToken).catch(() => null)
        : null;
      if (this.state.screen !== 'staking' || this.state.stkBusy || typing()) return;
      this.setState({ stk, ...(mine ? { stkMine: mine } : {}) }, () => this.paintStaking(true));
    } catch { /* a missed tick costs nothing; the next one tries again */ }
  };

  /** Run one staking transaction, then re-read everything it could have moved.
   *  `fn` is handed a reporter: the wallet calls it as each prompt opens and
   *  each transaction lands, and the page's confirm sheet shows exactly that —
   *  a real step, never a timed animation pretending to be one. */
  stakingAct = (label, fn) => {
    if (this.state.stkBusy) return;
    const onStep = (key, status) => {
      this.setState((prev) => ({ stkSteps: { ...(prev.stkSteps || {}), [key]: status } }),
        () => this.paintStaking(true));
    };
    this.setState({ stkBusy: true, stkErr: '', stkSteps: {}, stkReceipt: null }, () => this.paintStaking(true));
    Promise.resolve()
      .then(() => fn(onStep))
      .then((r) => {
        this.sfx('ui');
        this.toast(label, 'ok');
        this.setState({
          stkBusy: false, stkDraft: '',
          // The sheet closes itself on success (see staking-render), so the
          // transaction it sent is recorded on the page instead.
          stkReceipt: r && r.explorer ? { label, explorer: r.explorer } : null,
        }, () => this.paintStaking(true));
        // The contract moved; so did the pool. Re-read both.
        return Promise.all([this.loadStakingMine(), this.loadStaking()]);
      })
      .catch((err) => {
        const why = (err && err.message) || String(err);
        this.setState({ stkBusy: false, stkErr: why }, () => this.paintStaking(true));
      });
  };

  /** The `me` half of the staking page — state plus the four actions. */
  stakingMe = () => {
    const stk = this.state.stk;
    const staking = stk && stk.contract;
    const stakeToken = stk && stk.token && stk.token.address;
    const decimals = (stk && stk.token && stk.token.decimals) || 18;
    const mine = this.state.stkMine;
    const wholeUnits = (text) => {
      // The stake token is 18-decimal and the amounts are whole tokens, so the
      // conversion is done in BigInt — 100000 * 10**18 overflows a double.
      const [intPart, frac = ''] = String(text || '').replace(/[^0-9.]/g, '').split('.');
      const padded = (frac + '0'.repeat(decimals)).slice(0, decimals);
      return BigInt(intPart || '0') * 10n ** BigInt(decimals) + BigInt(padded || '0');
    };
    return {
      // `state.wallet` is `{ name, addr }` (see the wallet subscription) — NOT
      // `.address`. Reading the wrong key made every connected staker see the
      // "connect a wallet" prompt; the anvil rehearsal caught it.
      address: this.state.wallet ? this.state.wallet.addr : null,
      positions: mine ? mine.positions : [],
      earned: mine ? mine.earned : null,
      balance: mine ? mine.balance : null,
      // The raw allowance, not a verdict on it: the form works out whether the
      // amount being typed needs an approval itself, keystroke by keystroke,
      // without asking the page to repaint (see `stakeForm`).
      allowance: mine ? mine.allowance : null,
      // The chain's clock, when read — a lock's end is judged against it.
      now: mine ? mine.now : null,
      draft: this.state.stkDraft,
      tier: this.state.stkTier,
      busy: this.state.stkBusy,
      error: this.state.stkErr,
      // Where to read the chain. The staking page prints the staking, token and
      // router addresses, and until now printed them as dead text; with this it
      // links them. Null on a build with no explorer, and the renderer falls
      // back to the same plain text it showed before.
      explorer: (this.state.chain && this.state.chain.explorerUrl) || null,
      // The last action that succeeded — `{ label, explorer }` — so the page can
      // show the receipt the closing sheet took away with it.
      receipt: this.state.stkReceipt || null,
      connect: () => this.setState({ connectReturn: 'staking' }, () => this.go('connect')()),
      // No repaint: the form updates itself as the user types, and a repaint
      // would replace the input under their fingers and drop focus.
      setDraft: (v) => this.setState({ stkDraft: v }),
      setTier: (i) => this.setState({ stkTier: i }, () => this.paintStaking(true)),
      // How far each wallet prompt has got — `{ approve: 'done', stake: 'confirming' }`.
      // Written by the wallet itself as it goes (see stakingAct).
      steps: this.state.stkSteps || null,
      stake: (amountBase, tier) => this.stakingAct('locked', (onStep) =>
        this.wallet.stake(staking, stakeToken,
          amountBase === undefined ? wholeUnits(this.state.stkDraft) : amountBase,
          tier === undefined ? this.state.stkTier : tier, onStep)),
      relock: (id, tier) => this.stakingAct('Lock extended', (onStep) => this.wallet.relock(staking, id, tier, onStep)),
      withdraw: (id) => this.stakingAct('withdrawn', (onStep) => this.wallet.unstake(staking, id, onStep)),
      claim: () => this.stakingAct('claimed', (onStep) => this.wallet.claimStakingRewards(staking, onStep)),
    };
  };

  paintStaking = (force?) => {
    const host = this.stakingEl;
    if (!host || !this.R || !this.R.stakingRender) return;
    const data = this.state.stk || null;
    if (!force && this._stakingPainted === data && host.childElementCount) return;
    this._stakingPainted = data;
    this.R.stakingRender.render(host, data, this.stakingMe());
  };

  loadJackpot = () => {
    if (!this.server) { this.setState({ jk: null, jkVoucher: null }); return; }
    // Signed in, the payload carries `you`: this wallet's standing in the WHOLE
    // field, which the published top-20 `odds` list cannot answer.
    const token = this.wallet && this.wallet.token && this.wallet.token();
    fetch(`${this.server}/api/jackpot`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
      .then(this.okJson)
      .then((jk) => this.setState({ jk }))
      .catch(() => this.setState({ jk: null }));
    // This wallet's own claimable win (if any) — drives the Claim button. Best
    // effort: a signed-out or error state simply shows no button.
    if (this.wallet && this.wallet.jackpotVoucher) {
      this.wallet.jackpotVoucher()
        .then((v) => this.setState({ jkVoucher: v }))
        .catch(() => this.setState({ jkVoucher: null }));
    }
  };

  // Re-run one day's draw in this browser, from what the gateway published —
  // the jackpot's counterpart of the hand history's re-shuffle & verify. The
  // checker (engine/draw-verify.js) is a second implementation of the draw, so
  // a pass here is not the server vouching for itself. A second tap closes it.
  verifyJackpotDraw = (week) => () => {
    if (!this.server || !week || !this.R || !this.R.drawVerify) return;
    const cur = (this.state.jkVerify || {})[week];
    if (cur && cur.busy) return;
    if (cur && (cur.out || cur.err)) {
      this.setState((s) => {
        const next = { ...(s.jkVerify || {}) };
        delete next[week];
        return { jkVerify: next };
      });
      return;
    }
    const set = (v) => this.setState((s) => ({ jkVerify: { ...(s.jkVerify || {}), [week]: v } }));
    set({ busy: true });
    fetch(`${this.server}/api/jackpot/draw?day=${encodeURIComponent(week)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((rec) => set({ out: this.R.drawVerify.verifyDraw(rec, this.state.wallet ? this.state.wallet.addr : null) }))
      .catch((err) => set({ err: (err && err.message) || 'Network error' }));
  };

  // A winner may never open the jackpot tab — a holder who won without playing
  // least of all — so a signed-in wallet with a prize waiting is told, once per
  // page load, wherever it lands.
  checkJackpotWin = () => {
    if (!this.server || !this.wallet || !this.wallet.jackpotVoucher) return;
    this.wallet.jackpotVoucher()
      .then((v) => {
        if (!v) return;
        this.setState({ jkVoucher: v });
        if (this._jkWinTold) return;
        this._jkWinTold = true;
        const amount = fmt(Number(v.amount) / 1e6);
        this.toast(`You won the jackpot \u00b7 ${amount}, claim it on the leaderboard\u2019s jackpot tab`, 'good');
      })
      .catch(() => {});
  };

  // Pull a won jackpot to the wallet. The button only shows when a voucher is
  // live, so this always has something to claim; the wallet fetches a fresh
  // voucher, submits the tx, and reports it for the recent-winners page.
  doClaimJackpot = () => {
    if (this.state.jkClaiming) return;
    this.setState({ jkClaiming: true, jkClaimMsg: '', jkClaimTx: null });
    this.wallet.claimJackpot()
      .then((r) => {
        this.setState({
          jkClaiming: false, jkVoucher: null, jkClaimMsg: 'Claimed, paid to your wallet',
          jkClaimTx: (r && r.explorer) || null,
        });
        this.toast('Jackpot claimed', 'good');
        this.loadJackpot();
      })
      .catch((err) => {
        this.setState({ jkClaiming: false, jkClaimMsg: (err && err.message) || 'Claim failed', jkClaimTx: null });
        this.toast((err && err.message) || 'Claim failed', 'bad');
      });
  };

  // Switch the leaderboard sub-view. Rankings is already loaded; the other two
  // need the jackpot payload, refetched on each switch so it is never stale.
  setLbView = (v) => () => {
    if (this.state.lbView === v) return;
    this.setState({ lbView: v });
    if (v !== 'rankings') this.loadJackpot();
    this.sfx('ui');
  };

  doDeposit = () => {
    if (!this.wallet || this.state.depositing) return;
    const amount = Number(this.state.depositDraft);
    const min = this.state.chain && this.state.chain.minDeposit ? this.state.chain.minDeposit / 1e6 : 1;
    if (!Number.isFinite(amount) || amount < min) {
      this.toast(`Minimum deposit is ${fmt(min)} ${this.tokenSymbol().toLowerCase()}`, 'bad');
      return;
    }
    this.setState({ depositing: true });
    this.wallet.deposit(amount)
      .then(({ balance }) => {
        this.setState({ depositing: false, depositDraft: '', screen: 'lobby' }, this.onResize);
        this.toast(`deposited ${fmt(amount)} ${this.tokenSymbol()} · bankroll ${fmt(balance)}`, 'ok');
        this.sfx('seat');
      })
      .catch((e) => {
        this.setState({ depositing: false });
        this.toast(String((e && e.message) || e), 'bad');
      });
  };

  /** The token this deployment funds with: USDC on the Solana path, USDC on the EVM one. */
  tokenSymbol = () => (this.state.chain && this.state.chain.symbol) || 'USDC';

  doFaucet = () => {
    if (!this.wallet || !this.wallet.faucet) return;
    const onChain = !!(this.state.chain && this.state.chain.kind === 'solana');
    if (onChain) this.toast('Approve in your wallet, then the test tokens arrive', 'ok');
    this.wallet.faucet()
      .then((b) => this.toast(onChain ? `Test ${this.tokenSymbol()} sent to your wallet — deposit it to play` : `Test USDC added · bankroll ${fmt(b)}`, 'ok'))
      .catch((e) => this.toast(String((e && e.message) || e), 'bad'));
  };

  /* One bankroll funds every table, so there is no amount to choose and
     nothing to sign: you bring the table maximum, or your whole balance if
     that is smaller. The adapter moves the chips. */
  takeSeat = () => {
    const tbl = tableById(this.state.pendingTable || (this.state.session && this.state.session.tableId));
    // Whatever the slider says, clamped again here rather than trusted: this is
    // the call that moves money, and it should not depend on a render having
    // already bounded it.
    const ceil = Math.min(this.state.balance, tbl.max);
    const amount = this.state.buyIn == null
      ? clamp(this.state.balance, 0, tbl.max)
      : clamp(snapMoney(this.state.buyIn), tbl.min, ceil);
    if (amount < tbl.min) { this.toast(`${tbl.name} needs ${fmt(tbl.min)} USDC to sit`, 'bad'); return; }
    if (!this.adapter || !this.state.session || this.state.session.tableId !== tbl.id) {
      this.openTable(tbl.id, { buyIn: amount });
    }
    if (this.adapter && this.adapter.kind === 'remote') {
      // the server owns seat assignment; -1 asks it to pick an open one
      const open = ((this.state.table || {}).seats || []).find((s) => s.empty);
      this.adapter.sit(open ? open.idx : -1, amount);
    } else if (this.adapter) {
      this.adapter.topUp(Math.max(0, amount - ((this.state.table || { seats: [{}] }).seats[0].stack || 0)));
    }
    // Demo mode keeps its own books, so the bankroll must be debited here to
    // pair with the credit on leaving. A real gateway owns both sides and
    // exposes neither call.
    if (this.wallet && this.wallet.reserve) this.wallet.reserve(amount);
    // Optimistic \u2014 the server has not confirmed the seat yet. Stamp the moment so
    // `onEvent` gives the sit a grace window to land before it decides, on the
    // server's own `heroIdx`, that we are actually spectating.
    this._seatConfirmedAt = Date.now();
    this.setState({ seated: true, screen: 'table' }, this.onResize);
    this.toast(`Seated at ${tbl.name} \u00b7 ${fmt(amount)} usdg`, 'ok');
    this.sfx('seat');
  };


  renderVals() {
    const st = this.state;
    const t = st.table;
    // A tournament table (`priv-tt-…`) deals abstract CHIPS, not money: the felt
    // formats amounts as chip counts (integer, no "$"/"usdc") rather than USD.
    // Hoisted to the top of render so every money site below can pick the skin.
    const isTournamentTable = !!(st.session && String(st.session.tableId).startsWith('priv-tt-'));
    // Blinds/stakes label: cash reads "$1/$2 usdc" off the resolved table; a
    // tournament reads its LIVE chip blinds from the table view (t.sb/t.bb),
    // never the fallback cash stake that produced a bogus "$1/$2".
    const stakesLabel = () => {
      if (isTournamentTable) return t && t.bb ? `${fmt(t.sb)}/${fmt(t.bb)}` : '';
      const s = st.session ? tableById(st.session.tableId) : null;
      return s ? `${stakes(s)} USDC` : '';
    };
    // Before anything reads a seat position: which canvas this render is on.
    setTableLayout(!!st.upright, st.felt);
    const g = this.geo();
    const c = st.compact;
    // A phone on its side (see `onResize`). `tight` is where the table's own
    // controls take their small sizes: a narrow window, or that phone — whose
    // long edge can be past the 900px that `compact` stops at.
    const mini = st.mini;
    // Held upright: the tall canvas (see TALL). Like `mini` it draws at about
    // half size, so it takes the same larger type on the seats.
    const tall = !!st.upright;
    const tight = c || mini;
    const scr = st.screen;
    const walletShort = st.wallet ? st.wallet.addr.slice(0, 4) + '\u2026' + st.wallet.addr.slice(-4) : 'Not connected';
    /* The viewer's own disc \u2014 header, drawer, profile. An account that has not
       chosen (or still holds a letter default) wears the portrait its address
       hashes to, the same rule the felt uses for its seat, so the face on the
       profile is the face at the table rather than an A\u2660 nobody else sees. */
    const myAvId = wearsPortrait(st.avatar)
      ? FREE_AVATARS[portraitHash(st.wallet && st.wallet.addr)].id
      : st.avatar;

    // Fund & sit. With one bankroll behind every table there is nothing to pick
    // a buy-in with: you bring the table maximum, or everything you have if
    // that is less, and you cannot sit at all below the table minimum.
    const sitTable = tableById(st.pendingTable || (st.session && st.session.tableId));
    /* How much of the bankroll comes to the table is a choice again.
       The ceiling is whichever is lower, the table's maximum or what you
       actually have; the floor is the table's minimum. Default is the ceiling,
       which is what the screen did before the slider existed, so clicking
       straight through behaves as it always has. */
    const sitCeil = Math.min(st.balance, sitTable.max);
    const sitAmount = st.buyIn == null
      ? clamp(st.balance, 0, sitTable.max)
      : clamp(snapMoney(st.buyIn), sitTable.min, sitCeil);
    const canSit = sitAmount >= sitTable.min && st.balance >= sitTable.min;
    const depMin = st.chain && st.chain.minDeposit ? st.chain.minDeposit / 1e6 : 1;

    const rb = st.rb;
    const sstat = st.stats;
    const lb = st.lb;
    const lbRows = (lb && lb.rows) || [];
    const lbYou = (lb && lb.you) || null;
    const myKey = st.wallet ? st.wallet.addr : null;
    const lbTab = (on) => `display:inline-flex;align-items:center;gap:6px;padding:0 0 9px;background:transparent;font-size:14px;color:${on ? FELT_INK : MUTED};transition:color .18s ease`;

    /* The summary: where the viewer stands, and the net that would pass the
       player one place above them. `mine` marks the viewer's own row; `ahead`
       is the row directly above, which the server supplies even when the viewer
       is off the visible top N. rank 0 means "played, not yet at the minimum". */
    const lbMine = lbYou || lbRows.find((r) => r.mine) || null;
    const lbAhead = (lb && lb.ahead) || null;
    const lbMin = (lb && lb.minHands) || 30;
    const lbStakeName = st.lbStake ? ((STAKES.find((x) => x.id === st.lbStake) || {}).name || st.lbStake) : null;
    const lbPeriodName = st.lbPeriod === '7d' ? 'This week' : st.lbPeriod === 'all' ? 'All time' : 'Today';
    const lbCtx = `${lbPeriodName}${lbStakeName ? ' · ' + lbStakeName : ''}`;

    /* Jackpot + Records views. Both read one /api/jackpot payload (st.jk):
       winners for the Jackpot view, biggestPots for Records. */
    const jk = st.jk;
    const fmtDay = (t) => (t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');
    // A 24-hour claim deadline needs the hour, not just the day.
    const fmtWhen = (t) => (t
      ? new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '');
    const stakeLabel = (id) => (id ? ((STAKES.find((x) => x.id === id) || {}).name || id) : 'mixed');
    const jkV = st.jkVerify || {};
    const jkPct = (odds) => (Math.round(odds * 10_000) / 100) + '%';
    /* The leaderboard's own work, and only its own.
       `renderVals` recomputes EVERY screen's values on every render, and a
       slider drag renders on every pointermove — so anything built here is
       built sixty-plus times a second while somebody is sizing a bet at a
       table that has no leaderboard on it. Measured on the felt: the jackpot
       block alone was 0.9ms of a 1.7ms pass, more than half of it, for values
       nothing on screen could read. The rows below stay empty off-screen; the
       markup that consumes them only renders under `isLeader`. */
    const jkOnScreen = scr === 'leaderboard';
    const jkWinnersArr = !jkOnScreen ? [] : ((jk && jk.winners) || []).map((w, i, a) => {
      // This row's re-run, if the viewer asked for one (see verifyJackpotDraw).
      const v = jkV[w.week] || null;
      const out = v && v.out;
      let verifyLine = '';
      let verifyTail = '';
      let blockUrl = '';
      if (v && v.busy) verifyLine = 'Re-running this draw in your browser\u2026';
      else if (v && v.err) verifyLine = 'Could not load this draw, ' + v.err;
      else if (out && !out.verifiable) verifyLine = (out.ok ? '\u2713 The seed and the randomness check out, ' : '\u2717 ') + (out.reason || '');
      else if (out && out.ok) {
        verifyLine = `\u2713 Commitment \u00b7 \u2713 randomness \u00b7 \u2713 all ${out.entries} entries recomputed \u00b7 \u2713 winner, drawn on Ethereum block`;
        blockUrl = `https://etherscan.io/block/${out.block.number}`;
        verifyTail = '(check its hash, and that it is the first block after 00:00 UTC)'
          + (out.you ? ` \u00b7 you were in it: entry ${out.you.rank}, a ${jkPct(out.you.odds)} chance` : '');
      } else if (out) verifyLine = '\u2717 ' + out.checks.filter((c) => !c.ok).map((c) => c.label).join('; ');
      /* The badge says what became of the prize. A flat "PAID" on every row
         would be a claim about money that in three of the four states has not
         moved: a win can be unclaimed and still claimable, past its window, or
         already released back into the pool. */
      const paid = !!w.claimTx;
      const badge = paid ? 'PAID' : w.released ? 'RELEASED' : w.expired ? 'EXPIRED' : 'UNCLAIMED';
      const badgeTone = paid ? '#22d3ee' : w.released || w.expired ? '#94a3c4' : '#a78bfa';
      return {
      name: w.name || 'Player',
      sigil: (w.name || '?').slice(0, 2).toLowerCase(),
      when: fmtDay(w.at),
      // The draw's own day key (YYYY-MM-DD), short. `at` is when it was drawn,
      // which is the same day but only because the draw runs just after close.
      day: w.week ? new Date(w.week + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }) : fmtDay(w.at),
      badge,
      badgeStyle: `flex:none;padding:2px 7px;border-radius:4px;border:1px solid ${badgeTone}59;font-size:10px;letter-spacing:.1em;color:${badgeTone};white-space:nowrap`,
      prize: '$' + fmt((w.pool || 0) / 1e6),
      row: `display:grid;grid-template-columns:1fr 92px;gap:10px;align-items:center;padding:14px 20px;font-size:13px;color:#e8ecf8;${i < a.length - 1 ? 'border-bottom:1px dashed rgba(232,236,248,0.132);' : ''}`,
      sigilStyle: `position:relative;display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;background:${SIGILS[i % SIGILS.length]};color:#f6f3ff;font-size:9px;font-weight:700;flex:0 0 auto`,
      avTier: w.avatar ? avTier(w.avatar) : '',
      avWrap: w.avatar ? 'position:absolute;inset:0;width:100%;height:100%' : 'display:none',
      avInner: w.avatar ? avInner(w.avatar) : '',
      prizeStyle: `text-align:right;font-family:${SERIF};font-size:18px;line-height:1;color:#a78bfa;font-variant-numeric:tabular-nums`,
      // The on-chain claim tx, once the winner has pulled it — proof, for anyone.
      claimTx: w.claimTx || '',
      claimStyle: w.claimTx
        ? 'font-size:11px;color:#94a3c4;text-decoration:none;border-bottom:1px dotted rgba(232,236,248,0.3)'
        : 'display:none',
      // Unpaid: until when the winner can still claim; past that, when the
      // prize returns to the pool (held until every voucher has lapsed); then
      // that it has.
      claimNote: w.claimTx ? ''
        : w.released ? 'Unclaimed \u00b7 back in the pool'
        : w.expired ? 'Unclaimed \u00b7 returns to the pool ' + fmtWhen(w.releasedAt)
        : w.claimBy ? 'Claim by ' + fmtWhen(w.claimBy) : '',
      claimNoteStyle: !w.claimTx && (w.expired || w.claimBy) ? 'font-size:11px;color:#94a3c4;white-space:nowrap' : 'display:none',
      // Re-run the draw here, from what was published. Only for draws made
      // under the pinned-block rule, which keep their whole field.
      verify: this.verifyJackpotDraw(w.week),
      verifyLabel: v && v.busy ? 'Checking\u2026' : out ? (out.ok ? 'Verified \u2713' : out.verifiable ? 'Failed \u2717' : 'Partly \u2713') : 'Verify',
      verifyStyle: w.verifiable && w.week
        ? 'background:none;border:0;border-bottom:1px dotted rgba(232,236,248,0.3);padding:0;font:inherit;font-size:11px;color:'
          + (out && !out.ok ? '#f0a8b4' : '#94a3c4') + ';cursor:pointer;white-space:nowrap'
        : 'display:none',
      metaStyle: (!w.claimTx && (w.expired || w.claimBy)) || (w.verifiable && w.week)
        ? 'display:flex;align-items:center;flex-wrap:wrap;gap:4px 12px;padding-left:31px'
        : 'display:none',
      verifyLine,
      verifyTail,
      verifyLineStyle: verifyLine
        ? 'display:flex;flex-wrap:wrap;gap:4px;font-size:11px;line-height:1.5;padding-left:62px;color:' + (out && !out.ok ? '#f0a8b4' : '#22d3ee')
        : 'display:none',
      blockUrl,
      blockLabel: out && out.block ? '#' + Number(out.block.number).toLocaleString() + ' \u2197' : '',
      blockLinkStyle: blockUrl ? 'color:#22d3ee;text-decoration:none;border-bottom:1px dotted rgba(148,163,196,0.45);font-variant-numeric:tabular-nums' : 'display:none',
      };
    });
    const jkPotsArr = !jkOnScreen ? [] : ((jk && jk.biggestPots) || []).map((p, i, a) => ({
      rank: String(i + 1).padStart(2, '0'),
      pot: fmt((p.pot || 0) / 1e6),
      stake: stakeLabel(p.stake),
      winner: p.winner || 'player',
      row: `display:grid;grid-template-columns:44px 1fr 90px 1fr;gap:10px;align-items:center;padding:14px 20px;font-size:13px;color:#e8ecf8;${i < a.length - 1 ? 'border-bottom:1px dashed rgba(232,236,248,0.132);' : ''}`,
      rankStyle: `font-family:${SERIF};font-size:17px;line-height:1;color:${i < 3 ? '#7d4cf0' : '#94a3c4'}`,
      potStyle: `font-family:${SERIF};font-size:18px;line-height:1;color:#e8ecf8;font-variant-numeric:tabular-nums`,
      // A standalone disc before the winner's name (there is no sigil here).
      avTier: p.winnerAvatar ? avTier(p.winnerAvatar) : '',
      avWrap: p.winnerAvatar ? 'width:20px;height:20px;flex:none' : 'display:none',
      avInner: p.winnerAvatar ? avInner(p.winnerAvatar) : '',
    }));

    let lbPos = 'N/A', lbPosSub = '', lbGap = 'N/A', lbGapSub = '';
    if (!lb) { /* still loading — leave the dashes */ }
    else if (!st.wallet) { lbPosSub = 'Connect to see your rank'; }
    else if (!lbMine) { lbPos = 'Unranked'; lbPosSub = `Play ${lbMin} hands to join`; }
    else if (!lbMine.rank) {
      const left = Math.max(1, lbMin - (lbMine.hands || 0));
      lbPos = 'Unranked';
      lbPosSub = `${left} more hand${left === 1 ? '' : 's'} to qualify`;
      lbGapSub = 'Reach the minimum first';
    } else {
      lbPos = '#' + lbMine.rank;
      lbPosSub = lbCtx;
      if (lbMine.rank === 1 || !lbAhead) { lbGap = 'Leader'; lbGapSub = 'You hold the top spot'; }
      else {
        lbGap = '+' + fmt(Math.max(0, (lbAhead.net - lbMine.net) / 1e6));
        lbGapSub = `Net to pass ${lbAhead.name}`;
      }
    }

    // Underline, not a filled pill: the system is hairlines rather than panels,
    // and a terracotta pill on every route would spend the one accent the page
    // is allowed on navigation. The transparent border is on all of them so the
    // row does not resize by 1.5px as the active item moves.
    // Read through `this.R` rather than an ES import: the x-dc logic block is
    // eval'd without the module bindings in scope, and a top-level reach at
    // that scope once blanked every screen.
    const CA = (this.R && this.R.token && this.R.token.TOKEN_CA) || '';

    /* Game-menu tabs: every tab is a pill with the same padding and a border
       (transparent when idle), so the row never shifts as you navigate; the
       active one lights up violet like a selected tab in a game lobby. The
       idle hover lives in globals.css (.su-tab). */
    const tab = (on) => `padding:7px 14px;border-radius:10px;border:1px solid ${on ? 'rgba(167,139,250,0.55)' : 'transparent'};`
      + `display:inline-flex;align-items:center;gap:7px;color:${on ? '#ffffff' : '#aab4cf'};font-weight:${on ? 600 : 400};white-space:nowrap;`
      + `background:${on ? 'linear-gradient(180deg,rgba(139,92,246,0.4),rgba(109,63,212,0.18))' : 'transparent'};`
      + `box-shadow:${on ? '0 0 20px -4px rgba(139,92,246,0.8),inset 0 1px 0 rgba(255,255,255,0.16)' : 'none'};`
      + 'transition:background .18s ease,color .18s ease,box-shadow .18s ease';
    const pill = (on) => `padding:5px 12px;border-radius:999px;font-size:11px;${on ? `background:${ACC};color:${ON_FILL}` : `border:1px solid ${DIM};color:#5b6684`}`;

    const vals: any = {
      // `min-height` lets the root grow with its content, which is right for
      // every screen that scrolls the window. Docs does NOT: it is a sticky
      // contents list beside its own scrolling column, and that needs a root
      // bounded by the viewport — without it the nav stretches to the full
      // 20,000px of the document, scrolls away with the page, and the
      // scroll-spy's `root: scroller` never scrolls, so the active section and
      // the /docs/<slug> address never update. `table` already pins for the
      // same reason.
      // `z-index:0` is load-bearing: with `position:relative` it makes this the
      // stacking context the felt background's z-index:-1 is measured against.
      // Without it that layer escapes to the root stacking context, paints
      // behind the body's own fill, and simply is not there.
      // The table is `dvh`, not `vh`: on a phone `100vh` is the screen with the
      // browser's bars retracted, so the bottom of the felt — the hero's seat
      // and the action buttons — sat under the toolbar.
      rootStyle: `${scr === 'table' ? 'height:100dvh' : scr === 'docs' ? 'height:100vh' : 'min-height:100vh'};display:flex;flex-direction:column;background:${FELT};position:relative;z-index:0;overflow:hidden`,
      // One word decides whether the landing page mentions the token at all —
      // `TOKEN_CA` in engine/token.js, the same value the docs page reads.
      caOn: !!CA, ca: CA, caBuyHref: `https://fomo.family/tokens/robinhood/${CA}`,
      // No nav bar on the felt: the table gets the full height, and TableDrawer
      // carries the same links behind one button.
      chromeOn: scr !== 'landing' && scr !== 'table',
      backRef: this.backRef, frontRef: this.frontRef,
      cardRef: this.cardRef, ctaRef: this.ctaRef, sealedRef: this.sealedRef, verifiedRef: this.verifiedRef,
      docsNavRef: this.docsNavRef, docsScrollRef: this.docsScrollRef, docsBodyRef: this.docsBodyRef,
      stakingRef: this.stakingRef,
      commitBack: this.demoCommit.back, commitFront: this.demoCommit.front, commitStrip: this.demoCommit.strip,
      isLanding: scr === 'landing', isConnect: scr === 'connect', isLobby: scr === 'lobby',
      isSeat: scr === 'seat', isTable: scr === 'table', isHistory: scr === 'history', isProfile: scr === 'profile', isSettings: scr === 'settings', isLeader: scr === 'leaderboard', isRoom: scr === 'room', isTournaments: scr === 'tournaments', isTournamentDetail: scr === 'tournamentDetail', isTournamentResult: scr === 'tournamentResult', isDocs: scr === 'docs', isStaking: scr === 'staking',
      /* "take a seat" means take a seat. Sending a player who is already
         connected and already holding a balance to the funding page asks them
         to solve a problem they do not have — so the connect flow is only on
         the path when there is actually nothing to play with. */
      goLanding: this.go('landing'),
      goDocsNav: (e) => { if (e && e.preventDefault) e.preventDefault(); this.goDocs(null)(); },
      // The header/CTA "connect" entry point. It must land on the *right* step
      // regardless of what a prior session left behind: a signed-out click wants
      // the wallet picker (step 0), and `connectStep` can be stale at 1 from an
      // earlier deposit, which showed an empty funding card and read as "the
      // button does nothing". Signed-in-and-funded shortcuts straight to lobby.
      goConnect: () => {
        const s = this.state;
        if (s.wallet && s.balance > 0) { this.go('lobby')(); return; }
        this.sfx('ui');
        this.setState({ screen: 'connect', connectStep: s.wallet ? 1 : 0 }, () => {
          this.onResize();
          this.syncTitle(this.state.table);
        });
      },
      goDeposit: () => {
        this.sfx('ui');
        this.setState({ walletMenu: false, screen: 'connect', connectStep: 1 }, () => this.onResize());
      },
      goLobby: this.go('lobby'),
      goTable: this.go('table'), goHistory: this.go('history'), goProfile: this.go('profile'), goSettings: this.go('settings'), goLeader: this.go('leaderboard'),
      goTournaments: this.go('tournaments'),
      goStaking: this.go('staking'),
      // Shown only when there is a SEAT to go back to. `session` merely means a
      // socket is attached, and standing up deliberately keeps it so the felt
      // can still be spectated — so testing it offered a way back to a table
      // the player had already left. The `scr === 'table'` arm must stay: a
      // spectator standing on the felt still needs the tab they are on in
      // order to navigate away from it.
      hasTable: (!!st.session && !!st.seated) || scr === 'table',
      tabTable: tab(scr === 'table'),
      tabLobby: tab(scr === 'lobby'),
      // The header's live chip: people connected right now, off /api/lobby.
      navOnline: `${Number(st.playersOnline || 0).toLocaleString()} online`,
      tabLeader: tab(scr === 'leaderboard'),
      // The site menu reads as active on the screens it owns, and while it is
      // open — so the row never looks like nothing is selected.
      tabMore: `${tab(scr === 'docs' || scr === 'settings' || scr === 'history' || st.moreMenu)};display:inline-flex;align-items:center`,
      moreCaret: `display:block;margin-left:6px;transform:rotate(${st.moreMenu ? 180 : 0}deg);transition:transform .18s ease`,
      // Hung from the button's RIGHT edge: on a phone `more` sits near the
      // right of the bar, and a menu anchored left ran 15px off the screen.
      moreMenuStyle: `position:absolute;top:calc(100% + 12px);right:0;z-index:60;width:184px;display:${st.moreMenu ? 'block' : 'none'};`
        + `border-radius:12px;background:${PAPER};border:1px solid rgba(232,236,248,0.154);`
        + 'box-shadow:inset 0 1px 0 rgba(255,255,255,0.21),0 22px 48px rgba(0,0,0,0.563);overflow:hidden',
      // stopPropagation, or the document listener that closes it would fire on
      // the very click that opened it.
      moreMenuToggle: (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        this.setState((st2) => ({ moreMenu: !st2.moreMenu, walletMenu: false }));
      },
      tabTournaments: tab(scr === 'tournaments'), tabStaking: tab(scr === 'staking'),
      walletOn: !!st.wallet, walletOff: !st.wallet,
      // The shell's avatar is now the equipped image, keyed by id.
      headerAvInner: avInner(myAvId),
      headerTier: avTier(myAvId),
      headerNameStyle: `max-width:${c ? 96 : 168}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:${UI};font-size:13px;color:${FELT_INK}`,
      headerCaretStyle: `position:absolute;right:-2px;bottom:-2px;display:flex;align-items:center;justify-content:center;width:13px;height:13px;border-radius:50%;background:${BG};box-shadow:0 0 0 1.5px #b497f7;transform:rotate(${st.walletMenu ? 180 : 0}deg);transition:transform .18s ease`,
      copyNote: st.copied ? 'Copied' : 'Copy',
      copyNoteStyle: `font-size:10px;letter-spacing:.16em;color:${st.copied ? ACC2 : 'rgba(232,236,248,0.28)'}`,

      /* ── disconnect ──────────────────────────────────────────────────
         Kept on hover rather than always visible: rare, destructive, and the
         bar has one accent to spend. Clay rather than terracotta, because
         terracotta is the action you are meant to take.                    */
      /* Click, not hover. The menu now holds the address and the balance as
         well as the disconnect, so it is something to read rather than
         something to pass through — and a hover menu that closes when the
         pointer leaves cannot be copied out of. */
      walletMenuToggle: (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        this.setState((s) => ({ walletMenu: !s.walletMenu, copied: false }));
      },
      walletMenuClose: () => this.setState({ walletMenu: false }),
      copyAddr: (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const addr = st.wallet && st.wallet.addr;
        if (!addr) return;
        // The full address, never the shortened one on screen — a truncated
        // key pasted into a transfer is a lost transfer.
        const done = () => {
          this.setState({ copied: true });
          this.later(() => this.setState({ copied: false }), 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(addr).then(done).catch(() => this.toast('Could not copy the address', 'bad'));
        } else {
          this.toast('Clipboard unavailable in this browser', 'warn');
        }
      },
      // `name` is what the session carries — `label` is the wallet module's own
      // field name and never reaches this object.
      walletLabelUpper: (st.wallet && st.wallet.name ? st.wallet.name : 'wallet').toUpperCase(),
      walletMenuStyle: `position:absolute;top:calc(100% + 12px);right:0;z-index:60;width:280px;display:${st.walletMenu ? 'block' : 'none'};border-radius:12px;background:${PAPER};border:1px solid rgba(232,236,248,0.154);box-shadow:inset 0 1px 0 rgba(255,255,255,0.21),0 22px 48px rgba(0,0,0,0.563);overflow:hidden`,
      // The panic button: kills every outstanding session server-side (a leaked
      // token dies with them), then drops this one. Distinct from disconnect,
      // which only forgets the session on this device.
      /**
       * Leave. One control, and it is the thorough one: the token is revoked
       * for every device before this browser lets go of it.
       *
       * There used to be two — a local "disconnect" and a claret "sign out
       * everywhere" — which asked people to know which of their devices held a
       * session in order to pick. Revoking is the safe default, so it is the
       * only one; the tooltip says so, and the label stays the everyday word.
       *
       * Chips at a table are not stranded by this: the seat is the server's,
       * and it releases on the sit-out clock with the stack going back to the
       * on-chain bankroll. Signing in again picks it straight back up.
       */
      doDisconnect: () => {
        // Reset the funding step too: a later signed-out "connect" must open on
        // the wallet picker, not the deposit card this session happened to reach.
        this.setState({ walletMenu: false, connectStep: 0 });
        const w = this.wallet;
        const letGo = () => {
          w && w.disconnect();
          this.sfx('ui');
          this.go('landing')();
        };
        if (!w || !w.revokeAllSessions) { this.toast('Wallet disconnected', 'ok'); letGo(); return; }
        // A failed revoke still disconnects THIS browser — and says plainly
        // that the other devices may not have been reached.
        w.revokeAllSessions()
          .then(() => this.toast('Disconnected on every device', 'ok'))
          .catch(() => this.toast('Disconnected here, other devices may still be signed in', 'bad'))
          .finally(letGo);
      },
      walletName: st.wallet ? st.wallet.name : '',
      walletShort,
      balanceLabel: fmt(st.balance),
      // Account menu: money lives here, never in the header. IN PLAY (the seated
      // stack) and sit-up/leave show only when actually seated at a table.
      menuSeated: scr === 'table' && !!st.seated,
      inPlayLabel: fmt(((st.table || { seats: [{}] }).seats[0] || {}).stack || 0),
      inPlayUnit: isTournamentTable ? 'CHIPS' : 'USDC', // a tournament "stack" is chips, not money

      leaveNote: `Cash out ${fmt(((st.table || { seats: [{}] }).seats[0] || {}).stack || 0)} after this hand`,
      volDown: this.volDown, volMove: this.volMove, volUp: this.volUp,
      unusedChips: this.R ? [].map((s) => ({
        art: this.R.ascii.CHIP_ART(s.label).join('\n'), style: `position:absolute;left:${s.left}%;top:${s.top}%;font-size:${13 * s.scale}px;line-height:1.05;color:rgba(232,236,248,0.187);transform:rotate(${s.rot}deg);--dx:${s.drift}px;animation:drift ${s.dur}s linear ${s.delay}s infinite`,
      })) : [],

      connectStep0: st.connectStep === 0, connectStep1: st.connectStep === 1,
      step1Style: `color:${st.connectStep === 0 ? FELT_INK : MUTED};font-weight:${st.connectStep === 0 ? 500 : 400}`,
      // MUTED, like step 1 above. It was MUTED at 0.6 alpha — 3.3:1, and the
      // only step label dimmed that far, which reads as an oversight rather
      // than a decision.
      step2Style: `color:${st.connectStep === 1 ? FELT_INK : MUTED};font-weight:${st.connectStep === 1 ? 500 : 400}`,
      /* Asked of `window` on every render rather than hardcoded. Extensions
         inject late, and the old fixed flags told a wallet-holder their wallet
         was missing while inviting a wallet-less one to click a dead row. */
      ...this.connectChainVals(),
      walletRows: this.walletRowsForChain()
        .map((w) => {
          const short = w.short;
          /* "Usable", not "detected": in the offline demo every row works,
             because the wallet behind them all is a mock. Every visual cue on
             the row hangs off this, so a row that connects never looks like one
             that cannot — and vice versa. */
          const usable = w.detected || !this.server;
          return {
            label: w.label,
            short,
            /* The wallet's own icon, or nothing. The two letters stay underneath
               either way — an icon that fails to load, or a wallet that
               announced none, leaves a mark rather than an empty disc. */
            icon: w.icon || null,
            iconStyle: `display:${w.icon ? 'block' : 'none'};position:absolute;inset:0;width:100%;height:100%;border-radius:50%;object-fit:cover`,
            /* Three states, not two. "NOT FOUND" alone was a dead end; INSTALL
               says the row still does something, and the browsers that cannot
               use a Chrome store link keep the honest dead end.
             *
             * `!this.server` is the offline demo, where the wallet is a mock
             * that connects to anything you click. Sending that visitor to the
             * Chrome Web Store would be absurd — and it would make the demo
             * unreachable, since no row would ever be DETECTED in a browser
             * with no extension, which is exactly the browser the demo is for. */
            // WalletConnect is never "detected" — it is the route to a wallet that
            // is somewhere else, by QR code or by handing off to its app.
            state: w.wc ? 'QR · APP' : usable ? 'DETECTED' : w.open ? 'OPEN APP' : (w.install ? 'INSTALL' : 'NOT FOUND'),
            pick: usable ? this.pickWallet(w.id, short) : w.open ? this.openInApp(w) : this.openInstall(w),
            rowStyle: `display:flex;align-items:center;gap:20px;width:100%;text-align:left;padding:22px ${usable ? '4px' : '18px'};border-top:1px solid rgba(232,236,248,0.14);border-bottom:1px solid rgba(232,236,248,0.14);margin-bottom:-1px;${usable ? 'background:rgba(232,236,248,0.05);' : ''}cursor:pointer`,
            // `position:relative` so the icon can sit over the letters.
            badgeStyle: `position:relative;display:flex;align-items:center;justify-content:center;flex:none;width:34px;height:34px;border-radius:50%;overflow:hidden;font-size:13px;letter-spacing:.04em;${usable ? `background:${PAPER};color:${ON_FILL};margin-left:14px` : `border:1px solid rgba(232,236,248,0.28);color:${MUTED}`}`,
            nameStyle: `flex:1;font-size:20px;font-weight:400;color:${usable ? FELT_INK : MUTED}`,
            stateStyle: `display:flex;align-items:center;gap:9px;font-size:11.5px;letter-spacing:.14em;${usable ? `color:${BRASS};margin-right:14px` : `color:${MUTED};opacity:.7`}`,
            // Olive presence dot only where there is presence to report.
            dotStyle: `display:${usable ? 'block' : 'none'};width:6px;height:6px;border-radius:50%;background:${BRASS};animation:suPulse 2.2s ease-in-out infinite`,
          };
        }),
      approveStyle: `display:${st.approving ? 'flex' : 'none'};flex-direction:column;gap:12px`,
      approveLabel: st.approving ? `Approve in ${st.approving}` : '',
      backToWallet: () => { this.wallet && this.wallet.disconnect(); this.setState({ connectStep: 0 }); },
      /* \u2500\u2500 fund & sit \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
         One bankroll funds every table, so there is no per-table buy-in to
         choose: you bring as much as the table allows, capped by what you
         have. The only decision left is how much to deposit.               */
      bankrollLabel: fmt(st.balance),
      // The bankroll is what the program holds. This is what is still in the
      // wallet, waiting to be deposited — without it, a funded player staring
      // at a zero bankroll reasonably concludes the site is broken.
      walletAvailLabel: st.walletBalance == null
        ? 'Held by the table program'
        : `${fmt(st.walletBalance)} ${this.tokenSymbol()} in your wallet, ready to deposit`,
      /* ── sign-up name ──────────────────────────────────────────────
         Seats show real identities now, so the funding step asks for a
         name once. Skippable — until chosen, every surface shows the
         verified .eth name or the pubkey shorthand — and gone for good
         the moment one is saved. A wallet that already carries a .eth
         name is not nagged: that IS a chosen identity. */
      signupNickOn: !!this.server && !!st.me && !st.me.nickname && !st.me.ens && !st.nick,
      snDraft: st.snDraft || '',
      snInput: (e) => this.setState({ snDraft: e.target.value, snMsg: '' }),
      snKey: (e) => { if (e.key === 'Enter') this.saveSignupNick(); },
      snSave: () => this.saveSignupNick(),
      snMsg: st.snMsg || `Until you pick one, tables show you as ${walletShort}`,
      snMsgStyle: `font-size:10px;color:${st.snBad ? RED : INK_MUT};margin-top:7px;line-height:1.5`,
      toLobbyLabel: st.balance > 0 ? 'Choose a table \u2192' : 'Browse tables \u2192',
      toLobbyStyle: `width:100%;padding:13px;border-radius:999px;background:${CTA};color:${CTA_INK};font-size:14px;font-weight:500`,
      depositOn: !this.server || !!(st.chain && st.chain.enabled),
      faucetOn: !!this.server && (!(st.chain && st.chain.enabled) || !!(st.chain && st.chain.kind === 'solana' && st.chain.faucet)),
      faucetLabel: `Faucet ${this.tokenSymbol()}`,
      menuFaucet: () => { this.setState({ walletMenu: false }); this.doFaucet(); },
      isSeatScreen: st.screen === 'seat',
      depositDraft: st.depositDraft,
      depositInput: (e) => this.setState({ depositDraft: e.target.value.replace(/[^0-9.]/g, '') }),
      dep25: () => this.setState({ depositDraft: '25' }),
      dep50: () => this.setState({ depositDraft: '50' }),
      dep100: () => this.setState({ depositDraft: '100' }),
      doDeposit: this.doDeposit,
      doFaucet: this.doFaucet,
      depositBtnLabel: st.depositing ? 'Confirm in your wallet\u2026' : 'Deposit',
      depositBtnStyle: `width:100%;padding:11px;border-radius:999px;background:${st.depositing ? 'rgba(232,236,248,0.28)' : CTA};color:${CTA_INK};font-size:13px;font-weight:500`,
      depositNote: `Minimum ${fmt(depMin)} ${this.tokenSymbol()} \u00b7 goes to the table program, not to us`,
      seatLabel: 'First open seat',
      sitAmountLabel: sitAmount > 0 ? fmt(sitAmount) : 'N/A',
      sitBbLabel: sitTable.bb > 0 ? `${Math.round(sitAmount / sitTable.bb)} big blinds` : '',
      sitMinLabel: fmt(sitTable.min),
      sitMaxLabel: fmt(Math.min(sitTable.max, st.balance || sitTable.max)),
      sitLeftLabel: `${fmt(Math.max(0, st.balance - sitAmount))} USDC`,
      tableRangeLabel: `${fmt(sitTable.min)} \u2013 ${fmt(sitTable.max)} usdg`,
      sitBtnLabel: canSit ? `Take your seat \u00b7 ${fmt(sitAmount)}` : `Deposit at least ${fmt(sitTable.min)} to play`,
      /* The one filled action on this screen, painted like every other one.
         It used to be `background:PAPER; color:FELT` — correct when PAPER was a
         cream plate and FELT the dark ink on it, and invisible ever since the
         retheme made both of them dark surfaces. Exactly the role-confusion
         this file's header warns about, missed because the seat screen needs a
         signed-in session and so was never in the contrast audit's reach;
         tools/probe-live.mjs audits it now. */
      sitBtnStyle: `display:flex;align-items:center;justify-content:center;gap:16px;width:100%;padding:19px 0;border-radius:999px;`
        + (canSit
          ? `background:linear-gradient(180deg,#8b5cf6,#6d3fd4);border:1px solid rgba(255,255,255,0.165);`
            + `box-shadow:inset 0 1px 0 rgba(255,255,255,0.285),0 2px 6px rgba(0,0,0,0.375);color:${ON_FILL};`
          : `background:rgba(232,236,248,0.12);color:${MUTED};`)
        + `font-size:clamp(17px,2.2vw,20px);font-weight:500;cursor:${canSit ? 'pointer' : 'not-allowed'}`,
      sitBtnPipStyle: `display:${canSit ? 'block' : 'none'};flex:none`,
      takeSeat: this.takeSeat,

      /* The buy-in slider. Range is the table's minimum up to whichever is
         lower of its maximum and the bankroll, so the track can never offer an
         amount that cannot be paid. Snapped to the cent for the same reason the
         bet slider is: whole dollars made the bottom stakes unusable. */
      buyTrackStyle: `position:relative;height:34px;display:flex;align-items:center;touch-action:none;cursor:${sitCeil > sitTable.min ? 'ew-resize' : 'default'};opacity:${sitCeil > sitTable.min ? 1 : .4}`,
      buyFillStyle: `position:absolute;left:0;height:2px;width:${buyPct(sitAmount, sitTable.min, sitCeil)}%;background:${ACC}`,
      buyThumbStyle: `position:absolute;top:50%;left:${buyPct(sitAmount, sitTable.min, sitCeil)}%;transform:translate(-50%,-50%);width:20px;height:20px;border-radius:50%;background:${ACC};box-shadow:0 2px 8px rgba(10,13,22,0.25)`,
      buyDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); this.setState({ dragBuy: true }); this.buyFrom(e, sitTable.min, sitCeil); },
      buyMove: (e) => { if (st.dragBuy) this.buyFrom(e, sitTable.min, sitCeil); },
      buyUp: () => this.setState({ dragBuy: false }),
      /* ── profile funding ─────────────────────────────────────────────
         Deposit and withdraw in one place, against one bankroll. Withdrawing
         while seated is refused by the server (409) because chips on a table
         are not yours to move yet; that is surfaced as plain language rather
         than a status code. */
      // Bare figure: the screen prints its own USDC label beside it, and
      // stating the unit twice is the rule this system is most insistent about.
      fundBankroll: fmt(st.balance),
      fundWalletNote: st.walletBalance != null ? `${fmt(st.walletBalance)} in your wallet` : '',
      fundDraft: st.fundDraft,
      fundInput: (e) => this.setState({ fundDraft: e.target.value, fundNote: '' }),
      fundDeposit: this.fundDeposit,
      fundWithdraw: this.fundWithdraw,
      // Fixed-size pills beside the amount field. `flex:1` was right when the
      // row owned the whole page width; sharing a row with rakeback, a button
      // that grows with the column reads as the most important thing on it.
      fundDepositStyle: `flex:0 0 auto;padding:10px 24px;border-radius:5px;${st.fundBusy ? 'background:rgba(232,236,248,0.12)' : 'background:linear-gradient(180deg,#8b5cf6,#6d3fd4);border:1px solid rgba(255,255,255,0.165);box-shadow:inset 0 1px 0 rgba(255,255,255,0.27),0 1px 3px rgba(0,0,0,0.35)'};color:${st.fundBusy ? 'rgba(232,236,248,0.4)' : FELT};font-size:13px;font-weight:500`,
      fundWithdrawStyle: `flex:0 0 auto;padding:10px 24px;border-radius:5px;border:1px solid rgba(232,236,248,0.28);background:linear-gradient(180deg,rgba(148,163,196,0.05),rgba(0,0,0,0.125));box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);color:${st.fundBusy ? 'rgba(232,236,248,0.4)' : FELT_INK};font-size:13px`,
      // The old copy here ran two unrelated ideas together and implied the
      // timelocked exit was a normal way to withdraw. It is a safety valve for
      // a server that has stopped answering, and taking it ends your session.
      fundNote: st.fundNote || (st.seated
        ? 'Leave your table before moving funds'
        : 'Withdrawals settle straight away'),
      fundNoteStyle: `font-size:10px;color:${st.fundNote && st.fundBad ? '#f33f5d' : '#94a3c4'};margin-top:9px;line-height:1.5`,
      // The deposit or withdrawal just made, on the explorer. Present only when
      // there is a transaction AND the deployment names an explorer — a faucet
      // build shows the note alone (see RECEIPT_LINK).
      fundTxUrl: st.fundTx || '',
      fundTxStyle: st.fundTx ? RECEIPT_LINK : 'display:none',

      /* ── rakeback ─────────────────────────────────────────────────────
         Claimed on demand rather than swept automatically: a player should
         see it accumulate and decide when it is worth taking.            */
      rbClaimable: rb ? fmt(rb.claimable / 1e6) : '0',
      rbRateLabel: rb ? `${(rb.rateBps / 100).toFixed(0)}% rakeback` : '',
      rbRateCaps: rb ? `${(rb.rateBps / 100).toFixed(0)}% RAKEBACK` : '',
      // A fresh redemption speaks first. Without this the receipt hangs off
      // whatever the balance happens to say next ("minimum 5 usdg to claim"),
      // which is not what the link is a receipt for.
      rbNote: st.rbTx
        ? 'Redeemed to your wallet'
        : !rb
        ? 'Play a hand to start earning'
        // The server's own words when it has paused claiming, rather than a
        // greyed-out button with no explanation — the balance is still theirs
        // and still growing, which is the part worth saying.
        : rb.pausedReason
          ? rb.pausedReason
          : rb.canClaim
            ? 'Ready to claim'
            : `Minimum ${fmt(rb.minClaim / 1e6)} USDC to claim`,
      rbTxUrl: st.rbTx || '',
      rbTxStyle: st.rbTx ? RECEIPT_LINK : 'display:none',
      rbBtnLabel: st.rbBusy ? 'Claiming…' : 'Claim',
      rbClaim: this.claimRakeback,
      rbBtnStyle: `padding:10px 22px;border-radius:5px;font-size:13px;font-weight:500;${rb && rb.canClaim && !st.rbBusy ? 'background:linear-gradient(180deg,#8b5cf6,#6d3fd4);border:1px solid rgba(255,255,255,0.165);box-shadow:inset 0 1px 0 rgba(255,255,255,0.27),0 0 22px -8px rgba(232,236,248,0.09),0 1px 3px rgba(0,0,0,0.35)' : 'background:rgba(232,236,248,0.12)'};color:${rb && rb.canClaim && !st.rbBusy ? FELT : 'rgba(232,236,248,0.4)'};cursor:${rb && rb.canClaim && !st.rbBusy ? 'pointer' : 'not-allowed'}`,

      /* ── landing stats ───────────────────────────────────────────────
         Real numbers or nothing. A page whose whole claim is that the money
         is verifiable cannot open with invented figures.                  */
      statHands: sstat ? Number(sstat.handsDealt).toLocaleString() : 'N/A',
      statHandsSub: sstat ? `${Number(sstat.handsThisWeek).toLocaleString()} today` : 'Run a gateway to see live numbers',
      statInPlay: sstat ? fmt(sstat.inPlay / 1e6) : 'N/A',
      statTablesSub: sstat
        ? `${sstat.seated} seated across ${sstat.liveTables} live ${sstat.liveTables === 1 ? 'table' : 'tables'}`
        : 'Chips in front of players',
      statCustody: sstat && sstat.custodied != null ? fmt(sstat.custodied / 1e6) : 'N/A',
      statCustodySub: sstat && sstat.chain ? 'Held by the table program' : 'Not connected to a chain',
      statRake: sstat ? fmt(sstat.rake / 1e6) : 'N/A',
      statJackpot: sstat ? fmt((sstat.jackpot || 0) / 1e6) : 'N/A',
      statJackpotSub: sstat ? 'Rolls daily at 00:00 UTC' : 'Daily prize pool',

      /* ── leaderboard ─────────────────────────────────────────────── */
      lbBlurb: st.lbView === 'jackpot'
        ? 'The daily prize pool, its winners, and who is in the draw'
        : st.lbView === 'records'
          ? 'The biggest pots ever dealt'
          : st.lbPeriod === '7d'
            ? `Ranked by net this week \u00b7 resets Sunday 00:00 UTC \u00b7 ${jkEntryShort(jk)}`
            : st.lbPeriod === 'all'
              ? `Every hand ever dealt, ranked by net \u00b7 ${jkEntryShort(jk)}`
              : `Ranked by net today \u00b7 resets daily 00:00 UTC \u00b7 ${jkEntryShort(jk)}`,
      // view switch: rankings / jackpot / records \u2014 all inside this one tab
      lbShowRankings: this.setLbView('rankings'),
      lbShowJackpot: this.setLbView('jackpot'),
      lbShowRecords: this.setLbView('records'),
      lbRankViewStyle: lbTab(st.lbView === 'rankings'),
      lbJackViewStyle: lbTab(st.lbView === 'jackpot'),
      lbRecViewStyle: lbTab(st.lbView === 'records'),
      lbARank: st.lbView === 'rankings' ? '1' : '0',
      lbAJack: st.lbView === 'jackpot' ? '1' : '0',
      lbARec: st.lbView === 'records' ? '1' : '0',
      lbViewRankings: st.lbView === 'rankings',
      lbViewJackpot: st.lbView === 'jackpot',
      lbViewRecords: st.lbView === 'records',
      // jackpot view
      jkPool: jk ? fmt((jk.pool || 0) / 1e6) : 'N/A',
      jkEntrants: jk ? String(jk.entrants || 0) : '0',
      // Claim banner \u2014 only when THIS wallet has a live, unclaimed jackpot voucher.
      jkHasClaim: !!st.jkVoucher,
      // Class fields never reach the template on their own — bindings resolve
      // against renderVals' return only — so the handler must be exported here.
      doClaimJackpot: this.doClaimJackpot,
      jkClaimAmount: st.jkVoucher ? fmt(Number(st.jkVoucher.amount) / 1e6) : '',
      jkClaimLabel: st.jkClaiming ? 'Claiming\u2026' : 'Claim to wallet',
      jkClaimMsg: st.jkClaimMsg || '',
      jkClaimBannerStyle: st.jkVoucher
        ? 'margin:0 0 14px;padding:16px 18px;border-radius:12px;background:linear-gradient(180deg,#222c47,#0d1220);border:1px solid rgba(255,255,255,0.08);box-shadow:inset 0 1px 0 rgba(255,255,255,0.08),0 2px 6px rgba(0,0,0,0.438);color:#e8ecf8;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap'
        : 'display:none',
      jkClaimBtnStyle: 'padding:10px 22px;border-radius:5px;border:1px solid rgba(255,255,255,0.15);background:' + (st.jkClaiming ? '#2d1c54' : 'linear-gradient(180deg,#8b5cf6,#6d3fd4)') + ';box-shadow:inset 0 1px 0 rgba(255,255,255,0.27),0 0 22px -8px rgba(232,236,248,0.096),0 1px 3px rgba(0,0,0,0.375);color:#e8ecf8;font:inherit;font-size:13px;font-weight:600;cursor:' + (st.jkClaiming ? 'default' : 'pointer'),
      jkClaimMsgStyle: st.jkClaimMsg ? 'width:100%;font-size:11px;color:#94a3c4;margin-top:2px' : 'display:none',
      jkClaimTxUrl: st.jkClaimTx || '',
      jkClaimTxStyle: st.jkClaimTx ? RECEIPT_LINK : 'display:none',
      // A closed day whose winner is not known yet: the draw is waiting for the
      // first Ethereum block after the close to finalise, which takes about a
      // quarter of an hour. Say so, with how long it has been.
      jkIsDrawing: !!(jk && jk.drawing),
      // The draw day is a UTC day, so name it in UTC — an hour's timezone drift
      // would label yesterday's draw with today's date.
      jkDrawingHead: jk && jk.drawing
        ? 'drawing ' + new Date(jk.drawing.day + 'T12:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
          + '\u2019s jackpot\u2026'
        : '',
      jkDrawingSub: jk && jk.drawing
        ? 'The winner is drawn against the first ETH block after 00:00 UTC, this can take up to 15 minutes.'
        : '',
      jkDrawingStyle: 'display:flex;align-items:center;gap:12px;margin:18px 0 0;padding:14px 18px;border-radius:12px;'
        + 'background:#1a2238;color:#e8ecf8;border:1px solid rgba(232,236,248,0.154);'
        + 'box-shadow:inset 0 1px 0 rgba(255,255,255,0.21),0 2px 6px rgba(0,0,0,0.375)',
      jkDrawingDotStyle: 'flex:0 0 auto;width:8px;height:8px;border-radius:999px;background:#8b5cf6;'
        + 'animation:seatPulse 1.6s ease-in-out infinite',
      jkDrawingHeadStyle: 'font-size:13px;font-variant-numeric:tabular-nums',
      jkDrawingSubStyle: 'font-size:11px;line-height:1.5;color:#94a3c4',
      // Live countdown to the next draw, shown ticking on the jackpot tab.
      jkCountdown: (jk && jk.closesAt) ? fmtCountdown(jk.closesAt - st.now) : '',
      jkHasCountdown: !!(jk && jk.closesAt),
      jkCountdownStyle: 'margin-left:7px;font-size:10px;opacity:.72;font-variant-numeric:tabular-nums;letter-spacing:.02em;display:inline-flex;align-items:center;gap:3px',
      lbJkHeadStyle: 'display:grid;grid-template-columns:1fr 92px;gap:10px;padding:12px 20px;font-size:10px;letter-spacing:.1em;color:#94a3c4;border-bottom:1px dashed rgba(232,236,248,0.198)',
      jkWinners: jkWinnersArr,
      jkNoWinners: jkWinnersArr.length === 0,
      // records view
      lbRecHeadStyle: 'display:grid;grid-template-columns:44px 1fr 90px 1fr;gap:10px;padding:12px 20px;font-size:10px;letter-spacing:.1em;color:#94a3c4;border-bottom:1px dashed rgba(232,236,248,0.198)',
      jkPots: jkPotsArr,
      jkNoPots: jkPotsArr.length === 0,
      lbWeek: this.setLbPeriod('week'),
      lbWeek7: this.setLbPeriod('7d'),
      lbAll: this.setLbPeriod('all'),
      lbWeekStyle: lbTab(st.lbPeriod === 'week'),
      lbWeek7Style: lbTab(st.lbPeriod === '7d'),
      lbAllStyle: lbTab(st.lbPeriod === 'all'),
      lbStakeVal: st.lbStake || '',
      setLbStake: this.setLbStake,
      lbStakeSelStyle: '',
      lbTileStyle: `background:linear-gradient(180deg,#8b5cf6,#3d2673);border-radius:12px;border:1px solid rgba(232,236,248,0.154);box-shadow:inset 0 1px 0 rgba(255,255,255,0.27),0 2px 5px rgba(0,0,0,0.375);padding:16px 18px;display:flex;flex-direction:column;gap:6px;min-width:0`,
      lbTileLabel: 'font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#94a3c4',
      lbTileSub: 'font-size:11px;color:#94a3c4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap',
      lbPos, lbPosSub,
      lbPosStyle: `font-family:${SERIF};font-size:30px;line-height:1;color:#e8ecf8`,
      lbGap, lbGapSub,
      lbGapStyle: `font-family:${SERIF};font-size:30px;line-height:1;color:${lbGap === 'Leader' ? '#62c6da' : '#e8ecf8'}`,
      lbJackpot: lb ? fmt((lb.jackpot || 0) / 1e6) : '0',
      lbJackStyle: `font-family:${SERIF};font-size:30px;line-height:1;color:#a78bfa`,
      lbHeadStyle: 'display:grid;grid-template-columns:44px 1fr 62px 68px 82px 92px;gap:10px;padding:12px 20px;font-size:10px;letter-spacing:.1em;color:#94a3c4;border-bottom:1px dashed rgba(232,236,248,0.198)',
      lbRows: lbRows.map((r, i) => {
        const bb = r.hands > 0 ? (r.netBb / r.hands) * 100 : 0;
        return {
          rank: String(r.rank).padStart(2, '0'),
          name: r.name,
          hands: r.hands.toLocaleString(),
          bb100: r.hands > 0 ? (bb >= 0 ? '+' : '\u2212') + Math.abs(bb).toFixed(1) : 'N/A',
          biggest: fmt((r.best || 0) / 1e6),
          net: (r.net >= 0 ? '+' : '\u2212') + fmt(Math.abs(r.net / 1e6)),
          sigil: (r.name || '?').slice(0, 2).toLowerCase(),
          row: `display:grid;grid-template-columns:44px 1fr 62px 68px 82px 92px;gap:10px;align-items:center;padding:13px 20px;font-size:13px;color:#e8ecf8;${i < lbRows.length - 1 ? 'border-bottom:1px dashed rgba(232,236,248,0.132);' : ''}${r.mine ? 'background:rgba(139,92,246,0.16);' : ''}`,
          rankStyle: `font-family:${SERIF};font-size:17px;line-height:1;color:${r.rank <= 3 ? '#7d4cf0' : '#94a3c4'}`,
          sigilStyle: `position:relative;display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;background:${SIGILS[r.rank % SIGILS.length]};color:#f6f3ff;font-size:9px;font-weight:700;flex:0 0 auto`,
          // The player's avatar (with tier motion) overlays the two-letter sigil
          // when the gateway sent one; otherwise it stays hidden and the sigil shows.
          avTier: r.avatar ? avTier(r.avatar) : '',
          avWrap: r.avatar ? 'position:absolute;inset:0;width:100%;height:100%' : 'display:none',
          avInner: r.avatar ? avInner(r.avatar) : '',
          numStyle: 'text-align:right;font-size:12px;color:#94a3c4;font-variant-numeric:tabular-nums',
          bbStyle: `text-align:right;font-variant-numeric:tabular-nums;font-size:12px;color:${bb >= 0 ? '#62c6da' : '#e5484d'}`,
          netStyle: `text-align:right;font-family:${SERIF};font-size:15px;font-variant-numeric:tabular-nums;color:${r.net >= 0 ? '#62c6da' : '#e5484d'}`,
        };
      }),
      lbEmpty: lbRows.length === 0,
      lbEmptyText: st.lbErr
        ? 'Could not load the board, try again in a moment'
        : st.lbStake
          ? `No one has ${lbMin}+ hands at ${lbStakeName} yet, be the first`
          : `No one has ${lbMin}+ hands this period yet, be the first`,
      // Guarded on the session as well as the payload: the gateway only sends
      // `you` to an authenticated caller, but a fixture or a stale payload
      // must never pin a "you" row under a signed-out visitor.
      lbHasYou: !!lbYou && !!st.wallet,
      lbYouRank: lbYou ? (lbYou.rank ? String(lbYou.rank).padStart(2, '0') : 'N/A') : '',
      lbYouHands: lbYou ? lbYou.hands.toLocaleString() : '0',
      lbYouBb: lbYou && lbYou.hands > 0
        ? ((lbYou.netBb / lbYou.hands) * 100 >= 0 ? '+' : '\u2212') + Math.abs((lbYou.netBb / lbYou.hands) * 100).toFixed(1)
        : 'N/A',
      lbYouBest: lbYou ? fmt((lbYou.best || 0) / 1e6) : '0',
      lbYouNet: lbYou ? (lbYou.net >= 0 ? '+' : '\u2212') + fmt(Math.abs(lbYou.net / 1e6)) : '',
      lbYouNumStyle: 'text-align:right;font-size:12px;color:#94a3c4;font-variant-numeric:tabular-nums',
      lbYouBbStyle: `text-align:right;font-variant-numeric:tabular-nums;font-size:12px;color:${lbYou && lbYou.netBb < 0 ? '#e5484d' : '#62c6da'}`,
      lbYouNetStyle: `text-align:right;font-family:${SERIF};font-size:15px;font-variant-numeric:tabular-nums;color:${lbYou && lbYou.net < 0 ? '#e5484d' : '#62c6da'}`,
      lbPlayers: lb ? lb.players : 0,
      lbHands: lb ? Number(lb.hands).toLocaleString() : '0',
      lbPool: lb ? fmt((lb.pool || 0) / 1e6) : '0',
      /* Offer more only when the last page came back FULL *and* the period has
         more players than the board is showing. Either test alone is wrong: a
         short page is the end of the board, and a full page can still be the
         whole board — a 20-player day filled a 20-row request exactly, and the
         button then read "show more · 20 of 20" over nothing. 100 is the
         gateway's own ceiling on `limit`, so that is where it retires. */
      lbHasMore: !!lb && lbRows.length >= (st.lbLimit || 20)
        && (st.lbLimit || 20) < 100 && Number(lb.players || 0) > lbRows.length,
      lbShowMoreLabel: 'Show more',
      lbShowMore: this.showMoreLeaders,

      toasts: st.toasts.map((x) => ({
        text: x.text,
        style: `display:flex;align-items:center;gap:9px;padding:9px 15px;border-radius:8px;background:linear-gradient(180deg,#222c47,#0d1220);color:${ON_FILL};font-size:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08),0 3px 10px rgba(0,0,0,0.4);animation:riseIn .3s ${EASE} both`,
        dot: `width:6px;height:6px;border-radius:999px;background:${x.kind === 'ok' ? '#8b5ff2' : ACC}`,
      })),
      // A live "you earned it" card, with the new avatar wearing its tier motion.
      celebrations: st.celebrations.map((c) => ({
        tier: avTier(c.code),
        inner: avInner(c.code),
        name: avName(c.code),
        card: `display:flex;align-items:center;gap:13px;padding:11px 18px 11px 12px;border-radius:12px;background:#0a0d16;border:1px solid rgba(232,236,248,0.1);box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 14px 34px rgba(0,0,0,0.575);animation:riseIn .34s ${EASE} both`,
      })),
    };

    /* ── tables: lobby actions and session labels ─────────────────────
       Fund-and-sit means there is no per-table amount to choose, and seats are
       assigned rather than browsed, so a stake is the only thing to pick.     */
    const sess = st.session ? tableById(st.session.tableId) : null;
    const all = ROOMS_ALL();
    const seatedTotal = all.reduce((a, r) => a + r.seated, 0);
    /* ── leaderboard: the jackpot, your tickets, and the board ───────
       Everything here is the /api/jackpot and /api/leaderboard payloads as the
       gateway sends them. Nothing is modelled client-side: the ticket rules,
       the holder thresholds and the claim window are all published BY the draw
       so the page can never quote terms the draw does not actually apply. */
    const jkRules = (jk && jk.rules) || {};
    vals.jkEyebrow = "TODAY'S JACKPOT · ROLLS AT 00:00 UTC";
    vals.jkLine = 'One player takes the whole pool when the day closes. Funded entirely by creator fees on $SUITED.';
    /* `pool` is already the bankroll MINUS prizes owed to past winners who have
       not claimed, so it is what a new entrant can actually win. `reserved` is
       that held-back amount, stated only when there is one. */
    const jkReserved = jk && jk.reserved ? Number(jk.reserved) / 1e6 : 0;
    vals.jkFacts = [
      { k: 'DRAWN IN', v: (jk && jk.closesAt) ? fmtCountdown(jk.closesAt - st.now) : 'N/A', tone: BRASS },
      { k: 'IN THE DRAW', v: jk ? Number(jk.entrants || 0).toLocaleString() : 'N/A', tone: PAPER_INK },
      jkReserved > 0
        ? { k: 'OWED TO WINNERS', v: '$' + fmt(jkReserved), tone: PAPER_INK }
        : { k: 'FROM CREATOR FEES', v: jk ? '$' + fmt(Number(jk.fromCreator || 0) / 1e6) : 'N/A', tone: PAPER_INK },
    ];

    /* The name this viewer plays under, resolved the way the gateway resolves
       it: nickname, else verified .eth, else the address shorthand. */
    const viewerName = st.nick || (st.me && st.me.nickname) || (st.me && st.me.ens) || walletShort;
    /* Your own row in today's field, as the GATEWAY answered it — `jk.you`.
       It is not inferred here, because this page cannot see the field: `odds`
       is the top 20 of a field that runs to hundreds, and it carries no
       pubkey, so the old test (find my display name in those 20 rows) called
       every entrant past the cut, everyone sharing a nickname, and everyone
       with no nickname at all, "not in the draw". The gateway knows the
       address asking and holds the whole field, so it answers instead. */
    const jkYou = jkOnScreen && st.wallet ? (jk && jk.you) || null : null;
    const jkIn = !!(jkYou && jkYou.in);
    /* Still to wager to enter that way. 0 once in, and 0 for a holder, whose
       way in is a token balance rather than a sum of dollars. */
    const jkShort = jkYou && !jkIn ? Number(jkYou.shortBy || 0) / 1e6 : 0;
    vals.youInDraw = jkIn;
    vals.youOutOfDraw = !jkIn;
    vals.youChance = jkIn ? `${jkYou.chance}%` : 'N/A';
    vals.youDrawRows = jkIn
      ? [
        { k: 'Your tickets', v: Number(jkYou.tickets).toLocaleString() },
        { k: 'In the field', v: `${jkYou.rank} of ${jkYou.field}` },
      ]
      : [];
    vals.youOutTitle = !st.wallet ? 'Connect to see your tickets.' : 'You are not in today’s draw.';
    /* What is actually missing, when the gateway can say. The entry rule alone
       leaves a player who has played all day guessing whether it applied. */
    vals.youOutLine = jkShort > 0
      ? `$${fmt(jkShort)} more wagered today puts you in. ${jkEntryLine(jk)}`
      : jkEntryLine(jk);
    vals.youOutBtn = !st.wallet ? 'Connect a wallet' : 'To the lobby';
    vals.youOutGo = !st.wallet ? this.go('connect') : this.go('lobby');
    vals.youOutBtnStyle = 'margin-top:auto;padding:12px 16px;border-radius:5px;border:1px solid rgba(232,236,248,0.28);'
      + 'background:linear-gradient(180deg,rgba(148,163,196,0.05),rgba(0,0,0,0.125));box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);'
      + `color:${FELT_INK};font-size:13.5px`;

    /* The claim banner's heading names the day that was won, because a winner
       may not open the page the morning after — a holder who never played can
       go a week without signing in, and "YOU WON YESTERDAY" would be wrong. */
    const jkWonDay = st.jkVoucher && st.jkVoucher.week
      ? new Date(st.jkVoucher.week + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'long', day: 'numeric', timeZone: 'UTC' })
      : null;
    vals.jkClaimHead = jkWonDay ? `YOU WON THE ${jkWonDay.toUpperCase()} DRAW` : 'YOU WON A JACKPOT';

    /* How the draw works, in the draw's own published numbers rather than a
       paragraph someone has to remember to update. */
    if (!jkOnScreen) { vals.drawRules = []; }
    const alpha = jkRules.ticketAlpha;
    const capPct = jkRules.maxTicketShareBps != null ? Math.round(jkRules.maxTicketShareBps / 100) : null;
    const claimHrs = jkRules.claimHours != null ? jkRules.claimHours : null;
    if (jkOnScreen) vals.drawRules = [
      { t: jkEntryLine(jk)
        + (alpha != null
          ? ` Tickets rise with volume but slower: they scale as volume^${alpha}, so wagering 100× more buys about ${Math.round(Math.pow(100, alpha))}× the tickets.`
          : '') },
      { t: capPct != null ? `No player holds more than ${capPct}% of the tickets.` : '' },
      { t: jkHolderRule(jk) },
      { t: 'The commitment goes up before the day closes. The seed, the field and the first ETH block after 00:00 UTC follow it. That block picks the winner and nobody can predict it. "verify" on any draw above re-runs it in your browser.' },
      { t: claimHrs != null
        ? `The winner has ${claimHrs} hours to claim on chain, to their own wallet. Unclaimed prizes return to the pool.`
        : 'The winner claims on chain, to their own wallet.' },
    ].filter((d) => d.t);

    /* The board, on felt. `netBb` is net in big blinds, which is the only way
       to state a win rate across stakes — bb/100 is netBb / hands * 100. */
    vals.lbRows = lbRows.map((r) => {
      const bb = r.hands > 0 ? (r.netBb / r.hands) * 100 : null;
      const top3 = r.rank <= 3;
      return {
        rank: String(r.rank).padStart(2, '0'),
        rankTone: r.mine || top3 ? BRASS : MUTED,
        name: r.name,
        nameTone: r.mine ? BRASS : FELT_INK,
        avTier: r.avatar ? avTier(r.avatar) : '',
        avInner: r.avatar ? avInner(r.avatar) : '',
        hands: r.hands.toLocaleString(),
        bb100: bb === null ? 'N/A' : (bb >= 0 ? '+' : '−') + Math.abs(bb).toFixed(1),
        bbStyle: `flex:0 0 11%;min-width:62px;text-align:right;font-size:12.5px;font-variant-numeric:tabular-nums;color:${bb === null ? MUTED : bb >= 0 ? '#22d3ee' : '#f0a8b4'}`,
        biggest: '$' + fmt((r.best || 0) / 1e6),
        net: (r.net >= 0 ? '+' : '−') + '$' + fmt(Math.abs(r.net / 1e6)),
        netTone: r.net >= 0 ? '#22d3ee' : '#f0a8b4',
        // A brass rule in the gutter marks your row without tinting it.
        mineBar: r.mine
          ? 'position:absolute;left:-12px;top:2px;bottom:2px;width:3px;border-radius:2px;background:#8b5cf6'
          : 'display:none',
      };
    });
    vals.lbYouBbStyle = `flex:0 0 11%;min-width:62px;text-align:right;font-size:12.5px;font-variant-numeric:tabular-nums;color:${lbYou && lbYou.netBb < 0 ? '#f0a8b4' : '#22d3ee'}`;
    vals.lbYouNetTone = lbYou && lbYou.net < 0 ? '#f0a8b4' : '#22d3ee';
    vals.lbYouBest = lbYou ? '$' + fmt((lbYou.best || 0) / 1e6) : '';
    vals.lbYouNet = lbYou ? (lbYou.net >= 0 ? '+' : '−') + '$' + fmt(Math.abs(lbYou.net / 1e6)) : '';

    /* The period chips. `week` is the DAILY board on the gateway (stats.ts
       defaults its window to one day) — a legacy key name, which is why the
       chip that selects it reads TODAY. */
    vals.lbPeriods = [['week', 'Today'], ['7d', 'This week'], ['all', 'All time']].map(([k, label]) => ({
      label,
      on: st.lbPeriod === k,
      ink: st.lbPeriod === k ? '#ffffff' : '#aab4cf',
      pick: this.setLbPeriod(k),
    }));

    vals.lbPlayersLine = lb ? `${Number(lb.players).toLocaleString()} ranked` : '';
    vals.lbHandsLine = lb ? `${Number(lb.hands).toLocaleString()} hands` : '';
    vals.lbPoolLine = lb ? `$${fmt((lb.pool || 0) / 1e6)} raked` : '';
    // What it would take to move up one place — the gateway sends the row
    // above the viewer for exactly this, even when they are off the top N.
    vals.lbGapLine = lbGap && lbGap !== 'N/A' && lbGapSub ? `${lbGap} ${lbGapSub}` : '';

    /* The five biggest pots, and a medal on the first three.
       Five, not the ten the endpoint sends: this is a sidebar beside the
       winners list, and a top ten there is a second leaderboard competing with
       the one above it.

       The medal is the RULE UNDER THE NUMBER, recoloured across exactly the
       width the rank occupies, plus a soft bloom beneath it. A glow around the
       whole row would be the loudest thing on a page built out of hairlines —
       this reads at a glance and still disappears when you are not looking for
       it. Drawn entirely in background layers so the row keeps one box: a 1px
       linear-gradient that is metal for the first 22px and the ordinary
       hairline after it, under a small radial bloom. A `border-bottom` cannot
       do it — a border is one colour for its whole length. */
    const POT_MEDALS = [
      // Brass is the system's gold already; silver and bronze are mixed to sit
      // at the same weight on felt rather than to be literally those metals.
      // Bronze is pushed well into copper on purpose: a truer bronze lands a
      // few degrees off the brass and, at 1px and 15px, first and third stop
      // being tellable apart — which is the whole job of a medal.
      { line: '#a78bfa', glow: 'rgba(139,92,246,0.3)', ink: '#a78bfa' },
      { line: '#bee0e9', glow: 'rgba(148,163,196,0.26)', ink: '#bee0e9' },
      { line: '#f33f5d', glow: 'rgba(148,163,196,0.3)', ink: '#f33f5d' },
    ];
    const POT_HAIR = 'rgba(232,236,248,0.08)';
    vals.jkPots = jkPotsArr.slice(0, 5).map((p, i) => {
      const medal = POT_MEDALS[i] || null;
      return {
        ...p,
        // `$` on the pot: it reads as money beside a rank, where the bare
        // figure in the old records table had a column header to lean on.
        pot: '$' + p.pot,
        row: 'display:flex;gap:10px;align-items:center;padding:9px 0;'
          + (medal
            ? `background:radial-gradient(ellipse 26px 7px at 11px 100%, ${medal.glow}, transparent 72%),`
              + `linear-gradient(90deg, ${medal.line} 0 22px, ${POT_HAIR} 22px) bottom/100% 1px no-repeat`
            : `border-bottom:1px solid ${POT_HAIR}`),
        rankStyle: "flex:0 0 22px;font-family:'Instrument Serif',serif;font-variant-numeric:tabular-nums;font-size:15px;color:"
          + (medal ? medal.ink : MUTED),
      };
    });

    vals.lobbySummary = `${all.length} tables \u00b7 ${seatedTotal} seated \u00b7 ${all.filter((r) => r.open).length} with an open seat`;

    /* One row per stake, each carrying its own join \u2014 always on, not revealed
       under the pointer. The old arrangement \u2014 click a row to select it, then
       press a button at the foot \u2014 put the control and the thing it acted on at
       opposite ends of the screen; hiding the button until hover fixed that but
       left a phone no way in at all, and a board you had to sweep to learn what
       it offered. The button is an outline pill, never the cream one: the system
       allows one filled action per page, this page has five rows, and the cream
       plate belongs to quick join up in the hero. */
    const playersAt = (id) => all.filter((r) => r.stake === id).reduce((a, r) => a + r.seated, 0);
    const openAt = (id) => all.filter((r) => r.stake === id && r.open).length > 0;
    /* The stake this player is HOLDING A SEAT at, or null. Two things it is
       careful about.

       It reads the ROOM, not `sess`: `tableById` answers with the stake CONFIG
       spread over the table's own id and name, and a stake config has no
       `stake` key at all (`{ id: 'nl200', name: '$1/$2', sb, bb, min, max,
       tag }`) — so the `sess.stake` this used to test was always undefined,
       which quietly made every row's "you are here" pip and its "back to your
       table" label dead. `roomById` also answers null for a private room, which
       is right: a room reached by link is not any of the stakes listed here.

       And it asks `seated`, not `session`. `leaveTable` cashes the stack out
       and sets `seated: false` but deliberately KEEPS the session, so the felt
       stays watchable. It is not the only way to hold a table without a seat —
       every buy-in passes through one, since the server refuses `sit` until
       `attach` has set `conn.tableId`.
       That player holds no seat and has their money back, so the lobby owes
       them a "join", not a "back to your table". */
    const seatedStake = (st.seated && st.session) ? ((roomById(st.session.tableId) || {}).stake || null) : null;

    /* The hero's one number. Seated players when anyone is playing, because
       that is the only figure that answers "is there a game"; today's hands
       when nobody is, because an empty room still has a history. Both come off
       /api/stats — `handsThisWeek` is the `week` period, which is one day
       (stats.ts: weekPeriodMs defaults to DAY_MS), which is why the landing
       page already labels it "today". Never a table count: tables spawn on
       demand, so that describes our spawner, not whether there is a game. */
    const seatedNow = all.reduce((a, r) => a + r.seated, 0);
    const handsToday = sstat ? Number(sstat.handsThisWeek) : null;
    vals.lobbyPipStyle = `width:7px;height:7px;border-radius:50%;background:${BRASS};flex:none;animation:suPulse 2.2s ease-in-out infinite;display:${seatedNow ? 'block' : 'none'}`;
    vals.lobbyEyebrow = seatedNow ? 'PLAYING RIGHT NOW' : 'THE ROOM IS QUIET';
    vals.lobbyBig = seatedNow
      ? String(seatedNow)
      : (handsToday == null ? 'N/A' : handsToday.toLocaleString());
    vals.lobbyBigUnit = seatedNow
      ? (seatedNow === 1 ? 'player seated' : 'players seated')
      : (handsToday === 1 ? 'hand today' : 'hands today');
    /* Always said, in one of two wordings of the same length, so the card
       keeps one height whether the room is busy or quiet. Hiding the line in a
       quiet room made the whole lobby jump whenever the count crossed zero,
       which is exactly what happens while the page is loading. */
    vals.lobbyLine = seatedNow
      ? 'Tables spawn as people arrive, so there is always a seat at the stake you want.'
      : 'Sit down at any stake and a table opens for you, so you never wait for a seat.';
    vals.lobbyLineStyle = 'font-size:clamp(14px,22px,16px);color:#e8ecf8;max-width:42ch;text-wrap:pretty';
    /* Facts that exist, straight off /api/stats, em dash when no gateway
       answered. The first one swaps so the hero never states the same figure
       twice: today's hands is the headline when the room is quiet, so the
       slot carries presence instead. */
    // Rounded to the dollar with a thousands separator: these tiles are small
    // and a bankroll's cents are noise beside a five-figure number.
    const statMoney = (v) => (sstat && v != null ? '$' + Math.round(v / 1e6).toLocaleString('en-US') : 'N/A');
    vals.lobbyFacts = [
      seatedNow
        ? { k: 'HANDS TODAY', v: handsToday == null ? 'N/A' : handsToday.toLocaleString(), sub: 'Across every stake', tone: PAPER_INK }
        : { k: 'PLAYERS ONLINE', v: String(st.playersOnline), sub: 'Connected right now', tone: PAPER_INK },
      { k: 'IN PLAY', v: statMoney(sstat && sstat.inPlay), sub: 'Chips on the felt', tone: PAPER_INK },
      { k: 'HANDS DEALT', v: sstat ? Number(sstat.handsDealt).toLocaleString() : 'N/A', sub: 'Since the first deal', tone: PAPER_INK },
    ];

    /* Today's jackpot, from the /api/jackpot payload this screen already
       loads. The biggest pots that used to sit here are ranked at the foot of
       the leaderboard; a second copy in the lobby repeated a page one click
       away. This does not: it is time-boxed, it moves while you watch, and it
       is the only thing on this screen that answers "why now". */
    vals.lobbyJkPool = jk ? fmt(Number(jk.pool || 0) / 1e6) : 'N/A';
    vals.lobbyJkRows = [
      { k: 'Drawn in', v: (jk && jk.closesAt) ? fmtCountdown(jk.closesAt - st.now) : 'N/A', tone: BRASS },
      { k: 'In the draw', v: jk ? Number(jk.entrants || 0).toLocaleString() : 'N/A', tone: FELT_INK },
    ];
    /* The entry rule in the draw's own numbers. The same sentence runs on the
       leaderboard and in the rules, so the three can never disagree. */
    // Straight to the draw's own rules, not just the leaderboard's front door.
    vals.lobbyJkGo = () => { this.setState({ lbView: 'jackpot' }); this.go('leaderboard')(); };
    vals.lobbyJkRule = jkEntryLine(jk);

    /* The ladder as six tiles. Everything here is live: `playersAt` sums the
       seated across that stake's tables, `openAt` asks whether any of them has
       a chair free, and affordability is the same question quick join asks —
       `st.wallet` first, because a signed-out visitor's balance is a
       placeholder rather than their money, and then the stake's own minimum. */
    const bank = st.wallet ? st.balance : null;
    const affords = (x) => bank != null && bank >= x.min;
    /* Selected stake: the one you are sitting at, else the best one open to
       you — highest you can afford that has a game running, falling back to the
       highest you can afford at all, then the cheapest. That is the same order
       quick join picks in, worked out here rather than read from `qjPick`,
       which is declared further down this function and would be in its dead
       zone. Never a stored id that no longer exists: a stake can leave the
       ladder between renders. */
    const best = () => {
      const open = STAKES.filter((x) => openAt(x.id));
      const mine = open.filter(affords).reverse();
      return (mine.find((x) => playersAt(x.id) > 0) || mine[0] || open[0] || STAKES[0]).id;
    };
    const selId = (STAKES.find((x) => x.id === st.stakeSel) && st.stakeSel)
      || seatedStake
      || best();
    const sel = STAKES.find((x) => x.id === selId) || STAKES[0];

    vals.stakeRows = STAKES.map((s, i) => {
      const players = playersAt(s.id);
      const mine = seatedStake === s.id;
      const free = openAt(s.id);
      const ok = affords(s);
      const on = s.id === selId;
      /* White at the bottom of the ladder, brass at the top, so the six read as
         a run rather than six of the same thing. */
      const u = i / (STAKES.length - 1);
      const tone = [246, 243, 236].map((v, k) => Math.round(v + ([167, 139, 250][k] - v) * u)).join(',');
      return {
        on,
        pick: () => this.setState({ stakeSel: s.id }),
        /* Double-click is the join. It takes the same route as the button —
           `quickSit` for a stake, `go('table')` for the one you are already
           at — so the two ways in can never disagree about what a tile means.
           The single click still lands first, so the selection is right even
           if the second click is swallowed. */
        join: () => (mine ? this.go('table')() : this.quickSit(s.id)),
        blinds: stakes(s),
        nameTone: `rgb(${tone})`,
        // `usd` pads the cents, so 0.4 reads as $0.40 beside $2.
        buyIn: `${usd(s.min)} \u2013 ${usd(s.max)}`,
        buyTone: ok ? FELT_INK : MUTED,
        /* A stake with no chair free says so in place of the count. "full" is a
           fact about the stake, not a disabled button — the tile still selects,
           and the join above it is what refuses. */
        players: mine ? 'Your table' : (!free ? 'Full' : (players ? `${players} seated` : 'Nobody yet')),
        playingStyle: `display:flex;align-items:center;gap:6px;font-size:13px;font-variant-numeric:tabular-nums;color:${players || mine ? FELT_INK : MUTED}`,
        hint: ok || bank == null ? '' : `Needs ${usd(s.min)} to sit`,
        cls: `su-stake${ok ? ' su-stake--open' : ''}${on ? ' su-stake--on' : ''}${players ? ' su-stake--busy' : ''}`,
      };
    });

    /* One way in, naming the stake it will seat you at. `sitAt` already sends a
       wallet-less visitor to connect and an underfunded one to the deposit
       step, so this button does not need to decide either. */
    const selMine = seatedStake === sel.id;
    const selOpen = openAt(sel.id);
    vals.joinStakeName = stakes(sel);
    vals.joinStakeLabel = selMine ? 'Back to your table' : (selOpen ? 'Join' : 'Every table full at');
    vals.joinStakeClass = `su-join${selMine || selOpen ? '' : ' su-join--shut'}`;
    /* `quickSit`, not `sitAt`. `sitAt` wants a TABLE id; handing it a bare stake
       id looks like it works, because `tableById` falls back to the stake config
       of the same name — and then the socket opens on a table that does not
       exist and hangs on "connecting…". `quickSit` resolves the stake to its
       fullest table with a seat free first, which is also the anti-bum-hunting
       rule every other way in already goes through. The seated case navigates
       rather than seating again. */
    vals.joinStake = () => (selMine ? this.go('table')() : this.quickSit(sel.id));
    /* What the ladder costs you, in your own money. Signed out it says what the
       ladder is instead of inventing a bankroll. */
    vals.bankrollLine = bank == null
      ? `${STAKES.length} stakes \u00b7 ${usd(STAKES[0].min)} to ${usd(STAKES[STAKES.length - 1].max)}`
      : `Your bankroll ${fmt(bank)} \u00b7 ${STAKES.filter(affords).length} of ${STAKES.length} stakes open to you`;

    /* Quick join: the one button on this page that needs nothing decided
       first. It answers "where is the game I can sit in", and a game needs
       somebody already in it — so it starts at the top of what this bankroll
       can afford and walks DOWN until it finds a stake where someone is
       actually sitting at a joinable table. The old rule took the highest
       affordable stake full stop, which on a quiet room meant the button
       promised a game and delivered an empty felt while four players were
       three rows below. Highest first, but live beats high.
       Affordability is read in the player's own terms, not the room's: a stake
       counts only if its minimum buy-in this bankroll clears AND it has a seat
       open somewhere. A stake that is full is skipped rather than offered and
       then refused. When nobody is seated anywhere — the whole room asleep —
       it falls back to the highest affordable stake, which is the old rule and
       the right one: there is no game to join, so sit at the best table you
       can and let one form around you.

       Two more fallbacks, both deliberate. No wallet connected yet: the balance on
       state is a placeholder, not this player's money, so nothing is affordable
       by definition and the lowest open stake is picked — `sitAt` sends them to
       connect, which is where they were always going. Connected but short of
       even the smallest minimum: the lowest open stake again, where `sitAt`
       names the shortfall and opens the funding screen. Neither case guesses;
       both land on the screen that can actually fix it.

       It never seats anyone: `quickSit` opens the seat screen, which states the
       stake and the buy-in and takes a second press. So the label can stay a
       plain "quick join" without the button ever moving money by surprise.
       Behind the screen check, because `renderVals` builds every screen's
       values on every render and a bet-slider drag renders on every
       pointermove — the cost 45c7cdd went and removed. A scan of every table
       on the site does not belong on that path, and the markup that reads
       these only exists inside the lobby's own sc-if anyway. */
    const qjOn = scr === 'lobby';
    let qjPick = null;
    let qjRedundant = false;
    if (qjOn) {
      /* Affordability is decided on the number `sitAt` will actually check, not
         on the STAKES constant: `tableById` overlays a live room's own
         `minBuyIn` over the stake config, and the two agreeing today is a fact
         about the current gateway, not a guarantee — the rebuy bug above
         `stakeOf` is what trusting the constant already cost once. Read straight
         off the room (`r.min` when the lobby carried it, else the stake's), so
         this is one pass over the table list rather than a `tableById` lookup
         per room, which is itself a scan. */
      const roomMin = (r) => (r.min != null ? r.min : stakeOf(r.stake).min);
      /* One pass, two facts per stake: the cheapest way in (what decides
         affordability) and the busiest joinable table (what decides whether
         there is a game). `busiest` counts only OPEN tables on purpose — six
         players at a table with no seat is not a game this button can send
         anyone to, and counting it would pick a stake `quickSit` then has to
         seat them somewhere else at. */
      const openStake = new Map();
      for (const r of all) {
        if (!r.open) continue;
        const lo = roomMin(r);
        const cur = openStake.get(r.stake);
        if (!cur) { openStake.set(r.stake, { min: lo, busiest: r.seated }); continue; }
        if (lo < cur.min) cur.min = lo;
        if (r.seated > cur.busiest) cur.busiest = r.seated;
      }
      const openStakes = STAKES.filter((s) => openStake.has(s.id));
      const affordable = st.wallet ? openStakes.filter((s) => st.balance >= openStake.get(s.id).min) : [];
      // Highest first, then the first one down that list with a game running.
      const descending = affordable.slice().reverse();
      qjPick = descending.find((s) => openStake.get(s.id).busiest > 0)
        || descending[0]
        || openStakes[0]
        || null;
      /* It stands down when the only place it could send you is the table you
         are already at, because "my table" is the next button along and two
         buttons one gap apart with the same destination is not a choice. Two
         ways that happens: it picked your own stake, or you are AT a table and
         nothing is affordable at all — the ordinary state of a player whose
         whole bankroll is on the felt, and the case that used to offer them the
         cheapest stake in the room and then refuse it at the funding screen.
         The second arm asks `st.seated`, not `seatedStake`: a private room and
         a tournament table are both a table you hold a seat at, and neither is
         any of the stakes listed here, so `seatedStake` is null for both. It is
         not `st.session` either — a player who stood up keeps the session so
         they can watch, and they have their whole bankroll back, so quick join
         is exactly what they want. */
      qjRedundant = !!st.seated && (!affordable.length || (!!qjPick && seatedStake === qjPick.id));
    }
    /* The cream plate the rows gave up. One filled action per page, and this is
       it: every other way in is an outline pill on felt. */
    vals.quickJoinStyle = (!qjOn || qjRedundant)
      ? 'display:none'
      : `padding:12px 20px;border-radius:5px;background:linear-gradient(180deg,#8b5cf6,#6d3fd4);border:1px solid rgba(255,255,255,0.165);box-shadow:inset 0 1px 0 rgba(255,255,255,0.285),0 2px 6px rgba(0,0,0,0.375);color:${ON_FILL};font-size:14px;font-weight:500;letter-spacing:.01em;white-space:nowrap`;
    /* The lobby is where a signed-out visitor arrives from the landing page
       now, so it needs a door where they are already looking. `connectReturn`
       is the idiom the staking page uses and `pickWallet` honours it, so
       connecting brings them straight back here. */
    vals.lobbyConnectGo = () => this.setState({ connectReturn: 'lobby' }, () => this.go('connect')());
    vals.quickJoinGo = () => {
      if (!qjPick) { this.toast('Every table is full right now, try again in a moment', 'bad'); return; }
      this.quickSit(qjPick.id);
    };

    vals.tableName = sess ? sess.name : 'N/A';
    vals.tableStakes = stakesLabel();
    vals.myTableStyle = `display:${st.seated && st.session ? 'block' : 'none'};padding:11px 20px;border-radius:5px;border:1px solid rgba(232,236,248,0.28);background:linear-gradient(180deg,rgba(148,163,196,0.05),rgba(0,0,0,0.125));box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);color:${FELT_INK};font-size:13px`;
    /* Spectating is only reachable by standing up from a table you were
       playing, so the only thing this control means is "sit back down". It was
       rendered but never bound before. */
    vals.specNote = this.server
      ? 'You stood up, your seat is open until someone takes it'
      : 'A bot is holding seat 1 until you sit down';
    vals.sitHere = () => (sess ? this.sitAt(sess.id) : this.go('lobby')());
    vals.buyTableLabel = (() => {
      const tb = tableById(st.pendingTable);
      return `${tb.name} \u00b7 nlh 6-max \u00b7 ${stakes(tb)} usdg`;
    })();

    /* ── profile: session curve, xp, preset avatars ───────────────── */

    /* ── profile: real play stats ─────────────────────────
       Every figure here comes from hands actually dealt, via /api/me. Rates
       arrive as null until there is a big enough sample to mean anything, and
       a null renders as a dash rather than a zero — "0% VPIP" is a claim, "—"
       is an admission.                                                       */
    const ps = st.me && st.me.stats;
    /* The real join date is the first hand ever played — the only one we know.
       Somebody who has not played yet gets nothing rather than a made-up month. */
    vals.sinceLabel = st.me && st.me.joinedAt
      ? ` \u00b7 seated since ${new Date(st.me.joinedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }).toLowerCase()}`
      : '';
    // "no hands yet" while the fetch is still in flight would tell a returning
    // player their record is gone. Loading and empty are different states.
    const meLoading = st.me === null && !st.meErr;
    const meFailed = !!st.meErr;
    /* Three states, three sentences: still loading, could not load, loaded and
       empty. They used to share one. */
    const noRecord = (empty) => (meLoading ? '\u2026' : meFailed ? 'Could not load your record' : empty);
    const dash = (v, suffix?) => (v === null || v === undefined ? 'N/A' : `${v}${suffix || ''}`);
    const bigStyle = (colour?) => `font-family:'Inter Tight',system-ui,sans-serif;font-weight:600;letter-spacing:-.03em;font-size:28px;line-height:1${colour ? ';color:' + colour : ''}`;
    const noteStyle = 'font-size:10px;color:#94a3c4;margin-top:5px';
    const thin = ps && ps.bb100 === null ? `needs ${ps.minSample} hands` : '';
    vals.statTiles = [
      {
        label: 'BB / 100',
        value: ps ? dash(ps.bb100 === null ? null : (ps.bb100 > 0 ? '+' + ps.bb100 : ps.bb100)) : 'N/A',
        valueStyle: bigStyle(ps && ps.bb100 > 0 ? '#7d4cf0' : ps && ps.bb100 < 0 ? '#f33f5d' : null),
        note: thin || (ps ? `Over ${ps.hands.toLocaleString()} hands` : noRecord('No hands yet')),
        noteStyle,
      },
      {
        label: 'VPIP / PFR',
        value: ps && ps.vpip !== null ? `${Math.round(ps.vpip)} / ${Math.round(ps.pfr)}` : 'N/A',
        valueStyle: bigStyle(),
        note: thin || 'Played / raised preflop',
        noteStyle,
      },
      {
        label: 'WTSD',
        value: ps ? dash(ps.wtsd === null ? null : Math.round(ps.wtsd), '%') : 'N/A',
        valueStyle: bigStyle(),
        note: thin || 'Reached showdown',
        noteStyle,
      },
      {
        label: 'BIGGEST POT',
        value: ps && ps.best > 0 ? fmt(ps.best / 1e6) : 'N/A',
        valueStyle: bigStyle(),
        note: ps && ps.rank ? `Rank #${ps.rank} all-time` : 'USDC',
        noteStyle,
      },
    ];
    /* Four columns divided by hairlines rather than four filled tiles. The
       first has no left rule and the last no right padding, so the row sits
       flush to the measure instead of floating inside it. */
    vals.statTiles = vals.statTiles.map((t, i) => ({
      ...t,
      cellStyle: `display:flex;flex-direction:column;gap:12px;min-width:0;padding:26px ${i === vals.statTiles.length - 1 ? '0' : 'clamp(16px,39px,40px)'} 0 ${i === 0 ? '0' : 'clamp(16px,39px,40px)'};${i === 0 ? '' : 'border-left:1px solid rgba(232,236,248,0.12);'}`,
    }));
    /* ── profile: deposits and withdrawals ─────────────────────────────
       One list, newest first, both directions — the sign and the word say
       which. Built only on the profile, for the reason the jackpot rows are
       built only on the leaderboard. */
    const fhRows = scr === 'profile' && st.fundHist ? st.fundHist : [];
    const fhSolana = !!(st.chain && st.chain.kind === 'solana');
    const FH_SHORT = 8;
    /* The gateway's words, in the page's. Anything it adds later falls through
       to its own name rather than to a guess about what it means. */
    const fhStatus = (r) => {
      const s = r.status;
      if (s === 'credited' || s === 'confirmed') return { label: 'Completed', colour: '#22d3ee' };
      if (s === 'failed' || s === 'rejected') return { label: s === 'rejected' ? 'Rejected' : 'Failed', colour: '#f33f5d' };
      if (s === 'expired') return { label: 'Not credited', colour: '#f33f5d' };
      if (s === 'review') return { label: 'Awaiting approval', colour: '#a78bfa' };
      return { label: s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Pending', colour: '#a78bfa' };
    };
    vals.fundHistOn = scr === 'profile' && (st.fundHist !== null || (fhSolana && (st.fundHistBusy || st.fundHistErr)));
    vals.fundHistRows = (st.fundHistAll ? fhRows : fhRows.slice(0, FH_SHORT)).map((r) => {
      const s = fhStatus(r);
      const out = r.kind === 'withdraw';
      return {
        kind: out ? 'Withdraw' : 'Deposit',
        amount: `${out ? '−' : '+'}${fmt(r.amount)} ${this.tokenSymbol()}`,
        amountStyle: `flex:1 1 110px;min-width:0;font-size:14px;font-variant-numeric:tabular-nums;color:${out ? '#e8ecf8' : '#22d3ee'}`,
        status: s.label,
        statusStyle: `flex:0 0 130px;font-size:11px;letter-spacing:.08em;color:${s.colour}`,
        when: r.at ? new Date(r.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
        txUrl: r.explorer || '',
        txStyle: r.explorer ? 'flex:0 0 70px;text-align:right;font-size:12px;color:#a78bfa;text-decoration:none' : 'flex:0 0 70px;visibility:hidden',
      };
    });
    vals.fundHistNote = fhRows.length
      ? (st.fundHistErr ? 'Could not refresh — showing what loaded last' : '')
      : st.fundHistBusy ? '…' : st.fundHistErr ? 'Could not load your history' : 'No deposits or withdrawals yet';
    vals.fundHistNoteStyle = vals.fundHistNote ? 'font-size:12px;color:#94a3c4;padding-top:16px' : 'display:none';
    vals.fundHistMoreOn = fhRows.length > FH_SHORT;
    vals.fundHistMoreLabel = st.fundHistAll ? 'Show fewer' : `Show all ${fhRows.length}`;
    vals.fundHistMore = () => this.setState({ fundHistAll: !st.fundHistAll });
    vals.resultsCardStyle = 'padding:22px;border-radius:26px;background:#1a2238';
    vals.lifetimeNet = ps ? `${ps.net > 0 ? '+' : ''}${fmt(ps.net / 1e6)} usdg` : 'N/A';
    vals.lifetimeNetStyle = `font-family:'Inter Tight',system-ui,sans-serif;font-weight:600;letter-spacing:-.03em;font-size:24px;color:${ps && ps.net > 0 ? '#7d4cf0' : ps && ps.net < 0 ? '#f33f5d' : '#e8ecf8'}`;
    vals.resultsNote = ps
      ? `${ps.hands.toLocaleString()} hands \u00b7 ${fmt(ps.volume / 1e6)} USDC wagered \u00b7 ${ps.handsThisWeek.toLocaleString()} today`
      : noRecord('Play a hand and this fills in');

    /* ── profile: xp from volume wagered, preset avatars ──────────────
       Lifetime volume comes from /api/rakeback, which is the same number the
       tier and the rate are derived from — so the level a player sees and the
       rakeback they are paid can never disagree. A gateway without
       /api/rakeback leaves `st.rb` null, and the level would then sit at 1
       for ever — so the volume /api/me reports with the play stats stands in
       for it. `st.wagered` is the offline demo's own figure and is only used
       when there is neither. */
    const wagered = st.rb ? st.rb.lifetimeVolume / 1e6
      : ps && ps.volume != null ? ps.volume / 1e6
      : st.wagered;
    const srvLevel = st.level && st.level.level > 0 ? st.level : null;
    const xp = srvLevel ? xpAt(srvLevel.level, wagered, srvLevel.title) : xpFor(wagered);
    vals.xpLevel = xp.level;
    vals.xpTitle = xp.title;
    vals.xpNext = `${fmt(Math.max(0, xp.next - wagered))} to level ${xp.level + 1}`;
    vals.xpWagered = fmt(wagered);
    /* Mono labels run uppercase in this system. Done here rather than with
       text-transform so the values stay greppable as the strings they are. */
    vals.xpTitleCaps = String(xp.title).toUpperCase();
    vals.xpNextCaps = `${fmt(Math.max(0, xp.next - wagered))} TO LEVEL ${xp.level + 1}`;
    vals.xpFill = `position:absolute;left:0;top:0;bottom:0;width:${clamp(xp.pct, 2, 100)}%;border-radius:999px;background:linear-gradient(90deg,#a63044,#a63044);transition:width .6s ${EASE}`;
    // A plain 72px disc — no level ring. Levelling up no longer draws a border or
    // aura; the avatar's own rarity motion (tiers.css) is the flair now.
    // border:0;padding:0 is load-bearing: a UA <button> adds asymmetric border
    // and padding, so a 100%-sized child fills a non-square content box and the
    // round avatar renders as an oval. Zeroing them keeps the disc a true circle.
    vals.avatarDiscStyle = `position:relative;display:flex;align-items:center;justify-content:center;width:72px;height:72px;box-sizing:border-box;flex:none;border:0;padding:0;border-radius:50%;background:${PAPER};box-shadow:none`;
    /* The identity is still on its way back after a reload (see resumeSession):
       the screen holds its shape with a placeholder instead of rendering a
       profile for nobody. */
    vals.profilePending = scr === 'profile' && !!this.server && !st.wallet && this.hasToken();
    vals.profilePendingNote = st.sessionErr ? 'Could not reach the server' : 'Loading your profile…';
    vals.profileRetryOn = !!st.sessionErr;
    vals.profileRetry = this.resumeSession;
    vals.heroAvInner = avInner(myAvId);
    vals.heroTier = avTier(myAvId);
    vals.avatarMenuToggle = (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      this.setState((s) => ({ avatarMenu: !s.avatarMenu }));
    };
    vals.avatarCaretStyle = `position:absolute;right:0;bottom:0;z-index:3;display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${BG};box-shadow:0 0 0 3px ${BG};transform:rotate(${st.avatarMenu ? 180 : 0}deg);transition:transform .18s ease`;
    // Fades + lifts in rather than snapping: kept in the DOM and toggled by
    // opacity/visibility (display:none can't transition), with pointer-events off
    // while hidden so it can't be clicked through.
    vals.avatarMenuStyle = `position:absolute;top:calc(100% + 12px);left:0;z-index:60;transform-origin:top left;border-radius:12px;background:${PAPER};border:1px solid rgba(232,236,248,0.154);box-shadow:inset 0 1px 0 rgba(255,255,255,0.21),0 22px 48px rgba(0,0,0,0.563);overflow:hidden;opacity:${st.avatarMenu ? 1 : 0};visibility:${st.avatarMenu ? 'visible' : 'hidden'};transform:translateY(${st.avatarMenu ? '0' : '-6px'}) scale(${st.avatarMenu ? 1 : 0.98});pointer-events:${st.avatarMenu ? 'auto' : 'none'};transition:opacity .18s ease, transform .2s ease, visibility .2s`;
    // The one name a player has — profile, leaderboard, and the table alike
    // since the alias reversal. A verified .eth name beats the shorthand;
    // a chosen nickname beats both.
    vals.displayName = viewerName;

    vals.nickDraft = st.nickDraft;
    vals.nickInput = (e) => this.setState({ nickDraft: e.target.value, nickMsg: '' });

    /* Inline editing. The name is the control, the pencil is the hint, and the
       whole thing collapses back to a line of text when it is not being used —
       which is what let the separate NICKNAME field go. */
    vals.nickIdle = !st.nickEditing;
    vals.nickEditing = !!st.nickEditing;
    vals.nickHoverOn = () => { if (!st.nickEditing) this.setState({ nickHover: true }); };
    vals.nickHoverOff = () => this.setState({ nickHover: false });
    // Keyboard reaches this too: the pencil is a hover affordance, but the name
    // is a real button, so focusing it and pressing enter opens the editor.
    vals.nickPencilStyle = `display:block;flex:none;opacity:${st.nickHover ? 1 : 0};transition:opacity .15s ease`;
    vals.nickEdit = () => {
      // Seed with what is actually shown, unless that is only the address —
      // there is nothing to edit in a truncated public key.
      const seed = st.nick || (st.me && st.me.nickname) || '';
      this.setState({ nickEditing: true, nickHover: false, nickDraft: seed, nickMsg: '' });
    };
    vals.nickCancel = () => this.setState({ nickEditing: false, nickMsg: '' });
    // Focus on open, so it can be typed into without a second click.
    vals.nickRef = (el) => { if (el && st.nickEditing && document.activeElement !== el) el.focus(); };
    vals.nickKey = (e) => {
      if (e.key === 'Enter') vals.nickSave();
      if (e.key === 'Escape') vals.nickCancel();
    };
    vals.nickSave = () => {
      const r = checkNick(st.nickDraft);
      if (!r.ok || !this.server) {
        // The editor closes only on an accepted name. A rejected one keeps it
        // open with the reason underneath — closing would throw the typing away
        // along with the explanation of what was wrong with it.
        this.setState({ nickMsg: r.msg, nick: r.ok ? r.value : st.nick, nickOk: r.ok, nickEditing: !r.ok });
        this.sfx(r.ok ? 'seat' : 'error');
        return;
      }
      // Checked here for a quick answer and again on the server, which owns
      // uniqueness and is the only side that can enforce it.
      const token = this.wallet && this.wallet.token && this.wallet.token();
      fetch(`${this.server}/api/nickname`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: r.value }),
      })
        .then(this.authCheck)
        .then(async (res) => { const b = await res.json(); if (!res.ok) throw new Error(b.error); return b; })
        .then((b) => {
          this.setState({ nick: b.name, nickMsg: `Saved \u00b7 ${b.name}`, nickOk: true, nickEditing: false });
          this.sfx('seat');
        })
        .catch((e) => {
          this.setState({ nickMsg: String((e && e.message) || e), nickOk: false });
          this.sfx('error');
        });
    };
    // Lives inline in the meta row now, so it sizes like its neighbours and
    // vanishes entirely when there is nothing to say.
    vals.nickMsgStyle = `display:${st.nickMsg ? 'inline' : 'none'};font-size:11px;letter-spacing:.05em;text-transform:none;color:${st.nickOk ? '#22d3ee' : RED}`;
    /* A card index rather than a suit character: rank glyph beside the pip, in
       a 54px disc. The selected one takes an outline rather than a ring of
       page colour, so the gap reads as space instead of a second border. */
    // ── profile achievements: a header showcase + a dropdown catalog ──
    // The showcase (in the header's open right side) is the player's rarest
    // *earned* avatars, rarest first; with none earned yet it teases the easiest
    // still-locked ones. The dropdown holds the full 23, ordered easiest→hardest
    // by hand (AV_ORDER) — live rarity % is too noisy to sort by, so it lives
    // only in the hover text. Locked entries grey out and show their how-to.
    const heldSet = new Set(st.achievements || []);
    const rarity = st.rarity || {};
    const pctOf = (id) => (rarity[id] && rarity[id].pct != null) ? rarity[id].pct : 100;
    // Achievements only: the portraits are not earned by a feat (free ones are
    // nobody's trophy, prestige ones are gated on level — see below).
    const earnable = AV.filter((a) => !a.def && !a.free && !a.level);
    const earned = earnable.filter((a) => heldSet.has(a.id));
    const hasEarned = earned.length > 0;
    // Rarest = lowest %; ties break toward the harder (later) curated rank.
    const rarest = [...earned].sort((x, y) => (pctOf(x.id) - pctOf(y.id)) || (avOrderKey(y.id) - avOrderKey(x.id)));
    /* Nothing earned? Tease the easiest still-locked ones as a "next up"
       preview — led by the next prestige portrait, which is the one thing on
       this row a player can see themselves closing in on (the xp bar is right
       below it). */
    const nextPrestige = PRESTIGE_AVATARS.find((a) => a.level > xp.level);
    const teaser = [
      ...(nextPrestige ? [nextPrestige] : []),
      ...earnable.filter((a) => !heldSet.has(a.id)).sort((x, y) => avOrderKey(x.id) - avOrderKey(y.id)),
    ];
    const showRow = (hasEarned ? rarest : teaser).slice(0, 5);
    vals.achShowcaseLabel = hasEarned ? 'RAREST' : 'NEXT UP';
    vals.showcaseAch = showRow.map((a) => ({
      inner: avInner(a.id),
      tier: hasEarned ? avTier(a.id) : '',
      title: hasEarned ? `${a.name}, only ${pctOf(a.id)}% of players have this` : `${a.name}: ${a.condition}`,
      wrap: `width:34px;height:34px;flex:none` + (hasEarned ? '' : ';filter:grayscale(1) brightness(.6)'),
    }));
    vals.achMenuToggle = (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      this.setState((s) => ({ achMenu: !s.achMenu }));
    };
    // Clicks inside the popover must not reach the document-level closer.
    vals.achMenuStop = (e) => { if (e && e.stopPropagation) e.stopPropagation(); };
    vals.achCaretStyle = `display:inline-flex;align-items:center;justify-content:center;transform:rotate(${st.achMenu ? 180 : 0}deg);transition:transform .18s ease`;
    vals.achMenuStyle = `position:absolute;top:calc(100% + 14px);right:0;z-index:60;transform-origin:top right;border-radius:12px;background:${PAPER};border:1px solid rgba(232,236,248,0.154);box-shadow:inset 0 1px 0 rgba(255,255,255,0.21),0 22px 48px rgba(0,0,0,0.563);overflow:hidden;opacity:${st.achMenu ? 1 : 0};visibility:${st.achMenu ? 'visible' : 'hidden'};transform:translateY(${st.achMenu ? '0' : '-6px'}) scale(${st.achMenu ? 1 : 0.98});pointer-events:${st.achMenu ? 'auto' : 'none'};transition:opacity .18s ease, transform .2s ease, visibility .2s`;
    // One cell for the dropdown grid: earned renders in full with its %, locked
    // greys out and shows the how-to. Built per id so the four sets can each map
    // their own ordered list (a full-width label separates them in the popover).
    const achCell = (id) => {
      const a = avById.get(id);
      const unlocked = heldSet.has(id);
      return {
        inner: avInner(id),
        tier: unlocked ? avTier(id) : '',
        name: a.name,
        title: unlocked ? `${a.name}, only ${pctOf(id)}% of players have this` : `${a.name}: ${a.condition}`,
        tell: unlocked ? `only ${pctOf(id)}% have this` : a.condition,
        wrap: `display:flex;flex-direction:column;align-items:center;gap:6px;width:92px;` + (unlocked ? '' : 'filter:grayscale(1);opacity:.5'),
      };
    };
    vals.achGroupLabel = `width:100%;font-size:9px;letter-spacing:.22em;color:#a78bfa`;
    vals.achLevels = AV_GROUPS[0].ids.map(achCell);
    vals.achPots = AV_GROUPS[1].ids.map(achCell);
    vals.achHands = AV_GROUPS[2].ids.map(achCell);
    vals.achFeats = AV_GROUPS[3].ids.map(achCell);
    vals.achLegacy = AV_GROUPS[4].ids.map(achCell);
    /* The picker, in three shelves: the free portraits, the prestige set, and
       whatever has been earned at the table. The letter defaults are not
       offered any more — the portraits replaced them.

       Prestige unlocks on the level the xp bar shows, worked out here: the
       gateway stores whichever avatar id it is sent and checks nothing, so this
       gate is the page's own and not a security boundary. */
    const avCell = (a, locked) => ({
      inner: avInner(a.id),
      // A locked disc does not get to shimmer: the motion is the reward.
      tier: locked ? '' : avTier(a.id),
      title: locked ? `${a.name}: ${a.condition || 'locked'}` : a.name,
      // The gateway has the last word on what may be worn (see wallet.setAvatar).
      pick: () => {
        if (locked) return;
        if (!this.wallet) { this.setState({ avatar: a.id }); return; }
        this.wallet.setAvatar(a.id).catch((e) => { this.toast(String((e && e.message) || e), 'bad'); this.sfx('error'); });
      },
      style: `position:relative;display:flex;align-items:center;justify-content:center;width:54px;height:54px;box-sizing:border-box;border:0;padding:0;background:none;border-radius:50%;`
        + (locked ? 'cursor:not-allowed;' : 'cursor:pointer;')
        + (a.id === myAvId ? `outline:2px solid ${ACC};outline-offset:3px;` : ''),
      // The grey goes on the disc rather than the button, so the level tag
      // underneath it stays readable — it is the only thing a locked one says.
      discStyle: `width:100%;height:100%${locked ? ';filter:grayscale(1) brightness(.5)' : ''}`,
      badge: a.level ? `LV ${a.level}` : '',
      badgeStyle: a.level
        ? `position:absolute;left:50%;bottom:-5px;z-index:4;transform:translateX(-50%);padding:1px 6px;border-radius:999px;background:${locked ? '#2a3350' : '#c9a961'};color:${locked ? '#94a3c4' : '#1b201c'};font-size:8.5px;letter-spacing:.08em;line-height:1.5;white-space:nowrap`
        : 'display:none',
    });
    vals.avatarsFree = FREE_AVATARS.map((a) => avCell(a, false));
    vals.avatarsPrestige = PRESTIGE_AVATARS.map((a) => avCell(a, xp.level < a.level));
    vals.avatarsPrestigeNote = nextPrestige ? `NEXT AT LEVEL ${nextPrestige.level}` : 'ALL UNLOCKED';
    vals.avatarsEarned = earnable.map((a) => avCell(a, !heldSet.has(a.id)));
    vals.avatarGroupLabel = `display:flex;justify-content:space-between;gap:10px;width:100%;font-size:9px;letter-spacing:.22em;color:#a78bfa`;

    /* ── settings ─────────────────────────────────────────────────────
       Three device preferences, one row shape. `setSegBtn` is the underline
       tab from the leaderboard rather than a filled pill: a two-option row on
       this page would otherwise put three terracotta pills on a screen the
       system allows one, and the underline already means "this is the one that
       is on" everywhere else in the app. */
    const setRow = 'display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px 32px;padding:24px 0;border-bottom:1px solid rgba(232,236,248,0.16)';
    const setSegBtn = (on) => `padding:4px 0 8px;border-bottom:1.5px solid ${on ? BRASS : 'transparent'};background:transparent;font-size:14px;color:${on ? FELT_INK : MUTED};white-space:nowrap;transition:color .18s ease,border-color .18s ease`;
    vals.setRow = setRow;
    vals.setText = 'display:flex;flex-direction:column;gap:7px;flex:1 1 320px;min-width:0';
    vals.setLabel = `font-size:10.5px;letter-spacing:.26em;color:${BRASS}`;
    vals.setNote = `font-size:13px;line-height:1.5;color:${MUTED};max-width:52ch`;
    vals.setSeg = 'display:flex;align-items:center;gap:22px;flex:none';

    const inBb = st.amountUnit === 'bb';
    vals.unitNote = inBb
      ? 'Every figure on the felt is counted against the table’s big blind, to two decimal places at most, a stack, a pot, a bet, the buttons you act with.'
      : 'Money, the way it leaves your stack. The felt reads in USDC, pots, bets, stacks and the buttons you act with.';
    vals.unitUsdStyle = setSegBtn(!inBb);
    vals.unitBbStyle = setSegBtn(inBb);
    /* A preference, not an account setting — same reasoning as `hotkeys`, and
       the same storage. Writing it is best-effort: a browser with storage
       blocked still switches, it just forgets on the next load. */
    const setUnit = (u) => () => {
      if (st.amountUnit === u) return;
      this.sfx('ui');
      this.setState({ amountUnit: u });
      try { localStorage.setItem('suited:amount-unit', u); } catch {}
      this.toast(u === 'bb' ? 'Amounts in big blinds' : 'Amounts in USDC', 'ok');
    };
    vals.unitUsd = setUnit('usd');
    vals.unitBb = setUnit('bb');
    /* The setting argued rather than described: three figures off one real
       $1/$2 hand, written the way the felt is about to write them. It runs
       through `amt` itself, so what is promised here is what actually renders
       — including the rounding. */
    const PV_BB = 2;   // the $1/$2 the caption names
    vals.unitPreview = [
      { label: 'STACK', value: this.amt(200, PV_BB) },
      { label: 'POT', value: this.amt(47.5, PV_BB) },
      { label: 'TO CALL', value: this.amt(6.75, PV_BB) },
    ];

    /* The table's skin. Offered here and in the table's own drawer, where a
       pick repaints the felt behind it — the same list and the same handler,
       so the two can never disagree. */
    const skinNow = tableStyle(st.tableStyle);
    vals.tableStyleNote = skinNow.note;
    vals.tableStyles = TABLE_STYLES.map((s) => {
      const on = s.id === skinNow.id;
      return {
        id: s.id,
        name: s.name,
        on,
        swatch: tableSwatchCss(s),
        btn: `display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px 4px 4px;border-radius:9px;background:transparent;font-size:12px;color:${on ? FELT_INK : MUTED};outline:${on ? `2px solid ${BRASS}` : '0'};outline-offset:1px;transition:color .18s ease`,
        pick: () => {
          if (st.tableStyle === s.id) return;
          this.sfx('ui');
          this.setState({ tableStyle: s.id });
          try { localStorage.setItem(TABLE_STYLE_KEY, s.id); } catch {}
        },
      };
    });

    // The cards' back: the same shape of choice as the skin, and the same two places.
    const backNow = cardBack(st.cardBackStyle);
    vals.cardBackNote = backNow.note;
    vals.cardBacks = CARD_BACKS.map((b) => {
      const on = b.id === backNow.id;
      return {
        id: b.id,
        name: b.name,
        on,
        swatch: cardBackSwatchCss(b),
        btn: `display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px 4px 4px;border-radius:9px;background:transparent;font-size:12px;color:${on ? FELT_INK : MUTED};outline:${on ? `2px solid ${BRASS}` : '0'};outline-offset:1px;transition:color .18s ease`,
        pick: () => {
          if (st.cardBackStyle === b.id) return;
          this.sfx('ui');
          this.setState({ cardBackStyle: b.id });
          try { localStorage.setItem(CARD_BACK_KEY, b.id); } catch {}
        },
      };
    });

    vals.hotkeysNote = st.hotkeys
      ? 'F folds, c checks or calls, r raises, space takes the default action. The letter is underlined in the button itself.'
      : 'The keyboard does nothing at the table, every action is a click.';
    vals.hotkeysOnStyle = setSegBtn(st.hotkeys);
    vals.hotkeysOffStyle = setSegBtn(!st.hotkeys);
    const setHotkeys = (on) => () => {
      if (st.hotkeys === on) return;
      this.sfx('ui');
      this.setState({ hotkeys: on });
      try { localStorage.setItem('suited:hotkeys', on ? 'on' : 'off'); } catch {}
    };
    vals.hotkeysOn = setHotkeys(true);
    vals.hotkeysOff = setHotkeys(false);

    /* Sound is on/off only here. Level stays on the felt's own disc, where it
       can be dragged while a hand is running — the thing you actually want to
       reach when the table is too loud. */
    vals.soundNote = st.muted
      ? 'Silent. The felt’s speaker sets the level, hold and drag it.'
      : `Cards, chips and your turn. The felt’s speaker sets the level, currently ${Math.round((st.volume || 0) * 100)}%.`;
    vals.soundOnStyle = setSegBtn(!st.muted);
    vals.soundOffStyle = setSegBtn(st.muted);
    const setMuted = (m) => () => {
      if (st.muted === m) return;
      /* Dragging the felt's disc all the way down mutes AND leaves the level at
         zero, so turning sound back on here has to restore a level too — without
         it the switch flips to "on" and the table stays silent, which reads as
         the setting not working. */
      const v = (!m && !(st.volume > 0)) ? 0.15 : st.volume;
      this.setState({ muted: m, volume: v });
      if (this.sound) { this.sound.setVolume(v); this.sound.setMuted(m); }
      // The cue is its own confirmation that sound came back; nothing to hear
      // when it goes.
      if (!m) this.uiSfx('seat');
    };
    vals.soundOn = setMuted(false);
    vals.soundOff = setMuted(true);

    /* ── history rows ─────────────────────────────────────────────── */
    const rows = (st.history || []).slice(0, 12);

    /* ── the hands hero ───────────────────────────────────────────────
       Your record, from /api/me. Same discipline as the profile tiles: a rate
       the server could not compute is null, and null renders as an em dash
       with the reason beside it — "0 bb/100" would be a claim we cannot make. */
    const hp = st.me && st.me.stats;
    const hDash = (v) => (v === null || v === undefined ? 'N/A' : v);
    const hNet = hp ? hp.net / 1e6 : null;
    vals.sessNet = hNet == null ? 'N/A' : (hNet >= 0 ? '+' : '−') + '$' + fmt(Math.abs(hNet));
    vals.sessNetTone = hNet == null ? MUTED : hNet >= 0 ? '#22d3ee' : '#f0a8b4';
    /* Signed out, loading and empty are three different things and the hero
       has to say which. Without the wallet check a signed-out visitor sat on
       "loading your record…" forever, because `loadMe` returns early with no
       token and never resolves into anything. */
    vals.sessNetSub = hp
      ? `Net across ${hp.hands.toLocaleString()} hands`
      : (!st.wallet ? 'Connect a wallet to see your record'
        : st.me === null ? 'Loading your record…' : 'No hands yet');
    const hThin = hp && hp.bb100 === null ? `needs ${hp.minSample} hands` : '';
    vals.sessFacts = [
      { k: 'TODAY', v: hp ? hp.handsThisWeek.toLocaleString() : 'N/A', sub: 'Hands played', tone: PAPER_INK },
      { k: 'BIGGEST POT', v: hp && hp.best > 0 ? '$' + fmt(hp.best / 1e6) : 'N/A', sub: 'Won in one hand', tone: PAPER_INK },
      { k: 'BB/100', v: hp ? hDash(hp.bb100) : 'N/A', sub: hThin || (hp ? `Over ${hp.hands.toLocaleString()} hands` : 'Win rate'), tone: PAPER_INK },
      // rank is null below the hand minimum and 0 when played-but-unranked.
      { k: 'RANK', v: hp && hp.rank ? '#' + hp.rank : 'N/A', sub: hp && hp.rank ? 'On the all-time board' : 'Not yet ranked', tone: PAPER_INK },
    ];

    /* The proof rail. THREE checks, because engine/verify.js returns three —
       commit, board, holeCards. A fourth ("seed signed by the table") would be
       a fairness guarantee nothing in the stack provides: no hand is signed.
       The real fourth check — whether YOUR seed made the revealed mix — is per
       hand and only knowable for hands this session sent a seed for, so it
       stays on the row where it can be true, and is not promised up here. */
    const vDone = Object.keys(st.verified || {}).filter((k) => st.verified[k] && st.verified[k].ok);
    const anyVerified = vDone.length > 0;
    vals.proofChecks = [
      'The revealed seed hashes to the commitment',
      'Every board card came from that deck',
      'Every hand shown down matches it',
    ].map((l) => ({ label: l, mark: anyVerified ? '✓' : '·', tone: anyVerified ? '#22d3ee' : MUTED }));

    /* Verify everything on the page. Each hand goes through the same per-row
       `verify` the button does — one re-shuffle in this browser per hand, and
       for server-dealt hands one POST so the pass counts toward `verified`.
       Nothing is faked: a hand that fails stays failed and says so. */
    const allDone = rows.length > 0 && rows.every((h) => st.verified[h.handId] && st.verified[h.handId].ok);
    vals.verifyAllLabel = rows.length === 0
      ? 'Nothing to verify yet'
      : allDone ? `All ${rows.length} hands verified` : `Verify every hand on this page`;
    vals.verifyAllStyle = `padding:12px 16px;border-radius:5px;border:1px solid rgba(232,236,248,0.28);background:linear-gradient(180deg,rgba(148,163,196,0.05),rgba(0,0,0,0.125));box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);color:${rows.length && !allDone ? FELT_INK : MUTED};font-size:13.5px;${rows.length && !allDone ? '' : 'cursor:default;'}`;
    // Filled as `handRows` is built below; the button can only be clicked
    // after that, so iterating it here is safe — and explicit, rather than
    // reaching back into `vals` for a key assigned later in the same pass.
    const rowVerifiers = [];
    vals.verifyAll = () => {
      if (!rows.length || allDone) return;
      rowVerifiers.forEach((run) => run());
    };
    vals.handsNote = 'Only yours, a hand record is readable by the players who were dealt into it, and holds no addresses';
    /* A signed net, through the unit formatter. The blind is the one THAT hand
       was played at (`h.bb`), never the open table's — a hand from a $1/$2 game
       is 30 bb whatever the player moved on to. Passing 0 rather than undefined
       matters: hands recorded before the blind was kept fall back to dollars
       instead of silently borrowing the current table's. */
    const sgnAmt = (n, bb) => (n > 0 ? '+' + this.amt(n, bb) : n < 0 ? '-' + this.amt(Math.abs(n), bb) : '0');
    vals.handRows = rows.map((h) => {
      const open = st.expanded === h.handId;
      const v = st.verified[h.handId];
      const row = {
        id: '#' + String(h.handNo).padStart(4, '0'),
        hole: (h.heroHole || []).map((x) => cardText(x)).join(' ') || 'N/A',
        board: (h.board || []).map((x) => cardText(x)).join(' ') || 'No showdown',
        holeStyle: `letter-spacing:.06em;color:${INK}`,
        boardStyle: `letter-spacing:.06em;color:${MUT}`,
        net: sgnAmt(h.heroNet, h.bb || 0), netStyle: `font-weight:500;color:${h.heroNet > 0 ? '#7d4cf0' : h.heroNet < 0 ? '#f33f5d' : MUT}`,
        caret: open ? '\u2212' : '+',
        toggle: () => { this.sfx('ui'); this.setState({ expanded: open ? null : h.handId }); },
        detailStyle: `display:${open ? 'block' : 'none'};padding:4px 20px 20px;background:rgba(232,236,248,0.072)`,
        // The seed is not on a row until its proof has been fetched \u2014 the
        // socket does not carry it. `v.seed` is what verifying put there.
        commit: h.commit,
        seed: (h.serverSeed || (v && v.seed) || 'Revealed when you verify') + ' \u00b7 hand ' + h.handNo,
        // Every player's contributed entropy, which is what stops the seed
        // being the house's alone. `\u2014` when a hand carried none.
        clientSeeds: (h.clientSeeds || []).length ? (h.clientSeeds || []).join('  ') : 'N/A',
        summary: (h.seats || []).filter((s) => s.handName).map((s) => `${s.seat === 0 ? 'You' : s.name}: ${s.handName}`).join('\n') || 'Won before showdown',
        verify: () => {
          // The real thing: re-derive the whole deck from the revealed seed and
          // check every card that was shown against it. The commitment alone
          // would pass even if the server had dealt a different deck entirely.
          //
          // The seed is fetched rather than held: it re-derives every card
          // including the mucked ones, so it is not on the socket, and
          // /api/hands serves it only for hands you were dealt into. A row that
          // already has one came from that same endpoint.
          const run = () => {
            if (!h.remote) return this.R.adapter.verifyRecord(h);
            return this.proofFor(h).then((proof) => {
              const res = this.R.verify.verifyHand(proof);
              return { ...res, seed: proof.serverSeed };
            });
          };
          Promise.resolve().then(run)
            .then((res) => {
              this.sfx(res.ok ? 'win' : 'error');
              this.setState((s) => ({ verified: { ...s.verified, [h.handId]: res } }));
              // Count a genuine pass toward the `verified` achievement. The server
              // re-verifies the hand itself, so a false claim earns nothing; this
              // is a best-effort fire-and-forget, for server-dealt hands only.
              if (res.ok && h.remote && this.server) {
                const token = this.wallet && this.wallet.token && this.wallet.token();
                fetch(`${this.server}/api/verify`, {
                  method: 'POST',
                  headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
                  body: JSON.stringify({ handId: h.handId }),
                }).then(this.authCheck).catch(() => {});
              }
            })
            .catch((err) => {
              this.sfx('error');
              this.setState((s) => ({ verified: { ...s.verified, [h.handId]: { ok: false, checks: null, error: String((err && err.message) || err) } } }));
            });
        },
        // The result is presented so a player can actually tell what was proven,
        // not just that "it's clean": a plain-language verdict, then each check
        // in words, then the recomputed deck fingerprint as evidence the shuffle
        // really was re-run in their browser. Before verifying, only the hint
        // shows; the whole card appears once there is a result.
        verifyHint: 'Recomputes the shuffle from the revealed seed, in your browser',
        verifyHintStyle: `font-size:11.5px;color:${MUT};display:${v ? 'none' : 'inline'}`,
        verifyResultStyle: `display:${v ? 'block' : 'none'};margin-top:14px;padding:14px 16px;border-radius:16px;background:rgba(232,236,248,0.09);border:1px solid rgba(232,236,248,0.11)`,
        verdictText: v ? (v.error ? 'Couldn\u2019t verify' : v.ok ? '\u2713  provably fair' : '\u2717  does not match') : '',
        verdictStyle: `display:inline-block;padding:6px 14px;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:.01em;`
          + (v && v.ok && !v.error ? 'background:rgba(148,163,196,0.18);color:#7d4cf0' : 'background:rgba(148,163,196,0.16);color:#f33f5d'),
        verdictSub: v
          ? (v.error
              ? String(v.error)
              : v.ok
                ? ('The deck was locked in before the deal, and every card you were shown was dealt from that same deck.'
                    + (h.mySeedIncluded ? ' Your own entropy is in the shuffle: the seed your client sent is part of the reveal.' : ''))
                : 'the cards shown do NOT match the committed deck \u2014 do not trust this hand; report it.')
          : '',
        verdictSubStyle: `font-size:12px;line-height:1.55;color:${INK};margin:10px 0 0`,
        checksStyle: `display:${v && v.checks ? 'grid' : 'none'};gap:7px;margin-top:12px`,
        checkCommit: v && v.checks ? `${v.checks.commit.ok ? '\u2713' : '\u2717'}\u2002${v.checks.commit.detail}` : '',
        checkCommitStyle: `font-size:11.5px;line-height:1.5;color:${v && v.checks && v.checks.commit.ok ? '#7d4cf0' : '#f33f5d'}`,
        checkBoard: v && v.checks ? `${v.checks.board.ok ? '\u2713' : '\u2717'}\u2002${v.checks.board.detail}` : '',
        checkBoardStyle: `font-size:11.5px;line-height:1.5;color:${v && v.checks && v.checks.board.ok ? '#7d4cf0' : '#f33f5d'}`,
        checkHole: v && v.checks ? `${v.checks.holeCards.ok ? '\u2713' : '\u2717'}\u2002${v.checks.holeCards.detail}` : '',
        checkHoleStyle: `font-size:11.5px;line-height:1.5;color:${v && v.checks && v.checks.holeCards.ok ? '#7d4cf0' : '#f33f5d'}`,
        // Only for hands where THIS client sent a seed (session memory) — a
        // server-loaded history row can't know what an earlier session sent.
        checkSeed: v && v.checks && h.myClientSeed
          ? (h.mySeedIncluded ? '\u2713\u2002Your contributed seed is in the revealed mix' : '\u2717\u2002The seed you sent is not in the reveal, it may have missed the seed window')
          : '',
        checkSeedStyle: `font-size:11.5px;line-height:1.5;color:${h.mySeedIncluded ? '#7d4cf0' : '#f33f5d'};display:${v && v.checks && h.myClientSeed ? 'block' : 'none'}`,
        deckLine: v && v.deckDigest ? `Recomputed deck fingerprint \u00b7 ${v.deckDigest}` : '',
        deckLineStyle: `font-size:10.5px;color:${MUT};margin-top:12px;word-break:break-all;display:${v && v.deckDigest ? 'block' : 'none'}`,
      };
      // Registered so "verify every hand" runs exactly what the per-row button
      // runs — one browser re-shuffle each, no shortcut that marks them passed.
      rowVerifiers.push(row.verify);
      return row;
    });
    vals.historyEmptyStyle = `display:${rows.length ? 'none' : 'block'};padding:40px 4px;text-align:left`;
    // The receipt card only exists to hold receipts. With none, its header row
    // sat over an empty card above the "nothing dealt yet" note — two empty
    // states stacked, one of which looked like a table that had failed to load.
    vals.historyCardStyle = rows.length
      ? 'border-radius:12px;background:#1a2238;color:#e8ecf8;border:1px solid rgba(232,236,248,0.154);box-shadow:inset 0 1px 0 rgba(255,255,255,0.21),0 2px 6px rgba(0,0,0,0.375);overflow:hidden'
      : 'display:none';

    /* ── tournaments ──────────────────────────────────────────────── */
    const tAll = st.tournaments || [];
    /* OPEN is registration open NOW — the difference between an event you can
       enter and one merely on the books. RUNNING is under way: listed to be
       watched, never joinable. The hero is chosen from `tAll`, not from this,
       so filtering the schedule never changes what is featured above it. */
    const tLiveState = (st$) => st$ === 'locked' || st$ === 'running' || st$ === 'final_table';
    const tFilter = st.tFilter || 'all';
    const tRows = tFilter === 'open' ? tAll.filter((t) => t.state === 'registering')
      : tFilter === 'live' ? tAll.filter((t) => tLiveState(t.state))
        : tAll;
    // Part 4 Task 6: `st.tMine` (populated by pollMine, fetched alongside
    // loadTournaments on entering the tab) keys each row's own registration —
    // seated in a running/final-table event → "return to your table"
    // (enterTournamentTable); finished → "view result" (openResult, reusing
    // the exact mine-row shape routeTournamentResult already builds one from).
    // Anything else falls through to the existing register/unregister rail.
    const tMineById = new Map<any, any>((st.tMine || []).map((m) => [m.tournamentId, m]));

    /* ── the featured event ───────────────────────────────────────────
       GET /api/tournaments returns ONLY `scheduled` and `registering` rows, so
       the hero can only ever feature something you can still enter. A RUNNING
       or FINISHED event reaches this page one way — /api/tournaments/mine —
       which is per-player, and is what "your events" renders.

       The hero renders either way. An empty schedule is the state this page
       sits in most of the time, and it still has to say what a suited
       tournament is: the facts below are fixed by the engine, not by an
       event, so they are true with nothing on the books. */
    const tOpen = tAll.filter((t) => t.state === 'registering').sort((a, b) => a.startAt - b.startAt);
    const tSoon = tAll.filter((t) => t.state === 'scheduled').sort((a, b) => (a.openAt || 0) - (b.openAt || 0));
    const feat = tOpen[0] || tSoon[0] || null;
    // The featured event's own detail — the only source of its structure.
    const fd = st.tFeatDetail && feat && st.tFeatDetail.id === feat.id ? st.tFeatDetail : null;
    const fDash = (v) => (v == null ? 'N/A' : v);

    if (feat) {
      const fBuy = Number(feat.buyIn || 0) / 1e6;
      const fFee = Number(feat.fee || 0) / 1e6;
      const fc = tCountdown(feat.state, feat.openAt, feat.startAt, st.now);
      const fMine = tMineById.get(feat.id) || null;
      const fBusy = !!(st.tournamentBusy && st.tournamentBusy[feat.id]);
      const fFull = !feat.registered && !feat.invited && feat.openSeats === 0;
      const at = feat.state === 'registering' ? feat.startAt : feat.openAt;
      const fPool = Number(feat.projectedPool || 0) / 1e6;

      vals.featPipStyle = 'width:7px;height:7px;border-radius:50%;background:#8b5cf6;flex:none;animation:suPulse 2.2s ease-in-out infinite';
      vals.featEyebrow = feat.state === 'registering' ? 'NEXT UP · REGISTRATION OPEN' : 'NEXT UP · REGISTRATION NOT YET OPEN';
      vals.featName = feat.name;
      vals.featClockStyle = 'display:flex;align-items:baseline;gap:10px;flex-wrap:wrap';
      // `tCountdown` wraps the gap in a sentence; the hero wants the clock and
      // its caption apart.
      vals.featCountdown = fc.label.replace(/^(starts|registration opens) in /, '');
      vals.featStartLine = (feat.state === 'registering' ? 'Until cards are in the air · ' : 'Until registration opens · ')
        + (at ? new Date(at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : 'N/A');
      vals.featBlurbStyle = 'display:none';
      vals.featBlurb = '';
      vals.featFacts = [
        // Buy-in and fee are separate on the wire and separate here: the fee is
        // not part of the prize pool, and one number would hide that.
        { k: 'BUY-IN', v: fFee > 0 ? `${usd(fBuy)} + ${usd(fFee)}` : usd(fBuy) },
        { k: 'FIELD', v: `${feat.entrants}/${feat.maxEntrants}` },
        { k: 'PRIZE POOL', v: usd(fPool) },
        // Paying seats still for sale; held invite seats are counted out by the
        // gateway, so this is what a stranger can actually buy.
        { k: 'SEATS LEFT', v: String(feat.openSeats) },
      ];
      /* This event's own ladder, from its detail — not DEFAULT_BLINDS. A
         tournament carries its `blinds` array, and while every event created so
         far uses the default, the page must show the one that will be dealt. */
      vals.featBlindsLabel = fd
        ? `FIRST LEVELS · ${fd.levelMinutes} MINUTES EACH`
        : 'FIRST LEVELS';
      vals.featBlinds = (fd && fd.blinds ? fd.blinds : []).slice(0, 5).map((b, i) => ({
        label: `${b.sb}/${b.bb}${b.ante ? ' + ' + b.ante : ''}`,
        tone: i === 0 ? BRASS : MUTED,
      }));
      vals.featStructure = [
        { k: 'Starting stack', v: fd ? Number(fd.startingStack).toLocaleString() : 'N/A' },
        { k: 'Levels', v: fd ? `${fd.levelMinutes} min` : 'N/A' },
        // `tableSize` is never shipped on the wire, but `validateTournament`
        // refuses anything but 6 ("until 9-handed tables are built"), so this
        // is a fact about the engine rather than a guess about this event.
        { k: 'Table size', v: '6-handed' },
        { k: 'Added money', v: Number(feat.addedPrize || 0) > 0 ? usd(Number(feat.addedPrize) / 1e6) : 'none' },
        { k: 'Minimum field', v: String(feat.minEntrants) },
      ];
      vals.featPaysStyle = fd && fd.payouts && fd.payouts.length
        ? 'display:flex;flex-direction:column;gap:6px;padding-top:2px'
        : 'display:none';
      vals.featPayouts = (fd && fd.payouts ? fd.payouts : []).map((p, i) => ({
        place: `${['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'][i] || `${i + 1}th`} · ${p}%`,
        amount: usd(fPool * p / 100),
      }));
      vals.featPoolNote = `Pool grows with every entry, ${usd(Number(feat.maxPool || 0) / 1e6)} if the field fills.`;

      vals.featActionLabel = fBusy
        ? (feat.registered ? 'Withdrawing…' : 'Registering…')
        : fFull ? 'Full'
          : feat.registered ? 'You are registered · withdraw'
            : feat.state === 'registering' ? `Register for ${usd(fBuy + fFee)}` : 'Registration not open yet';
      const fLive = !fBusy && !fFull && feat.state === 'registering';
      vals.featActionStyle = fLive && !feat.registered
        ? `padding:14px 24px;border-radius:5px;background:linear-gradient(180deg,#8b5cf6,#6d3fd4);border:1px solid rgba(255,255,255,0.165);box-shadow:inset 0 1px 0 rgba(255,255,255,0.285),0 2px 6px rgba(0,0,0,0.375);color:${ON_FILL};font-size:15px;font-weight:500;flex:none`
        : `padding:14px 20px;border-radius:5px;border:1px solid rgba(232,236,248,0.28);background:linear-gradient(180deg,rgba(148,163,196,0.05),rgba(0,0,0,0.125));box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);color:${fLive ? FELT_INK : MUT};font-size:14.5px;flex:none${fLive ? '' : ';cursor:not-allowed'}`;
      vals.featAction = () => {
        if (fBusy || fFull || feat.state !== 'registering') return;
        (feat.registered ? this.unregisterFromTournament : this.registerForTournament)(feat.id);
      };
      vals.featOpenStyle = 'padding:14px 18px;border-radius:5px;border:1px solid rgba(232,236,248,0.28);background:linear-gradient(180deg,rgba(148,163,196,0.05),rgba(0,0,0,0.125));box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);color:#e8ecf8;font-size:13.5px';
      vals.featOpen = () => this.openTournament(feat.id);
      /* Registering is a challenge → wallet signature → submit round trip, not
         a click: the gateway names the exact amount and the wallet is what
         shows and signs it. Saying so up front stops the signature prompt
         reading as something having gone wrong. */
      vals.featNote = feat.registered
        ? 'Your seat is held. Withdraw any time while registration is open and the buy-in comes straight back.'
        : feat.state === 'registering'
          ? 'Your wallet signs for the exact amount. Refundable until registration closes.'
          : 'Registration opens before the start; the buy-in moves into escrow only when you sign for it.';
      if (fMine && fMine.finishPlace != null) vals.featNote = 'You have already played this one.';
    } else {
      /* Nothing on the books.
         One line and a way out, not a page of scaffolding. Four structure rows
         reading "set per event" and a blind ladder for an event that does not
         exist are filler dressed as information — the reader learns nothing and
         the screen looks like it is mid-load. It says the one true thing and
         gets out of the way; the moment an event is published from the admin
         panel, `feat` is non-null and the real hero takes over. */
      vals.featPipStyle = 'display:none';
      vals.featEyebrow = 'TOURNAMENTS';
      /* Same distinction the list below makes: an empty schedule and an
         unreachable one look identical from here, and only one of them is a
         promise we can keep. Saying "a tournament will be hosted soon" because
         the gateway did not answer is a claim invented out of a failed
         request. */
      vals.featName = st.tourErr
        ? 'The schedule could not be loaded.'
        : 'A tournament will be hosted soon.';
      vals.featClockStyle = 'display:none';
      vals.featCountdown = ''; vals.featStartLine = '';
      vals.featBlurbStyle = 'font-size:clamp(14px,22px,16px);color:#94a3c4;max-width:44ch;text-wrap:pretty';
      vals.featBlurb = st.tourErr
        ? 'This is a problem reaching the server, not an empty calendar, try again in a moment.'
        : 'It shows up here as soon as it is scheduled, with the time to register.';
      vals.featFacts = [];
      vals.featBlindsLabel = '';
      vals.featBlinds = [];
      vals.featStructure = [];
      vals.featPaysStyle = 'display:none';
      vals.featPayouts = [];
      vals.featPoolNote = '';
      vals.featActionLabel = 'To the lobby';
      vals.featActionStyle = `padding:14px 24px;border-radius:5px;background:linear-gradient(180deg,#8b5cf6,#6d3fd4);border:1px solid rgba(255,255,255,0.165);box-shadow:inset 0 1px 0 rgba(255,255,255,0.285),0 2px 6px rgba(0,0,0,0.375);color:${ON_FILL};font-size:15px;font-weight:500;flex:none`;
      vals.featAction = this.go('lobby');
      vals.featOpenStyle = 'display:none';
      vals.featOpen = () => {};
      vals.featNote = '';
    }
    vals.tournamentRows = tRows.map((tt) => {
      const busy = !!(st.tournamentBusy && st.tournamentBusy[tt.id]);
      const registered = !!tt.registered;
      const buyInMicro = Number(tt.buyIn || 0);
      const mine = tMineById.get(tt.id) || null;
      const seated = !!(mine && (mine.state === 'running' || mine.state === 'final_table') && mine.tableId != null);
      const finished = !!(mine && mine.finishPlace != null);
      // Live per-row clock — the one thing that told a registered player nothing
      // at all before: `state`/`openAt`/`startAt` all ride the same GET the row
      // is already built from. `st.now` is the whole-flow ticker, re-armed for
      // this screen in go().
      const tc = tCountdown(tt.state, tt.openAt, tt.startAt, st.now);
      /* Under way. The gateway lists these so they can be WATCHED — it refuses
         register and unregister in any state but `registering`, in the handler
         and again in `Tournaments` — so the row must not offer an action it
         would only be told no for. A player of this event still gets their way
         back in: `seated` is checked first, and comes from their own
         /api/tournaments/mine row, not from this listing. */
      const live = tt.state === 'locked' || tt.state === 'running' || tt.state === 'final_table';
      let action, actionLabel, actionStyle;
      if (seated) {
        action = (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.enterTournamentTable(mine.tableId, mine.seatNo, mine.tournamentId); }; // FIX 2: thread the id
        actionLabel = 'Return to your table';
        actionStyle = `padding:9px 16px;border-radius:5px;border:1px solid rgba(255,255,255,0.15);background:linear-gradient(180deg,#8b5cf6,#6d3fd4);box-shadow:inset 0 1px 0 rgba(255,255,255,0.27),0 1px 3px rgba(0,0,0,0.35);color:${ON_FILL};font-size:13px;font-weight:500;white-space:nowrap;cursor:pointer`;
      } else if (finished) {
        action = (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.openResult(mine); };
        actionLabel = 'View result';
        actionStyle = `padding:9px 14px;border-radius:5px;border:1px solid rgba(232,236,248,0.28);background:linear-gradient(180deg,rgba(148,163,196,0.05),rgba(0,0,0,0.125));box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);font-size:13px;white-space:nowrap;cursor:pointer;color:${FELT_INK}`;
      } else if (live) {
        /* Under way and not yours. The row opens the event's page — which is
           read-only for a non-participant, its own action rail being gated on
           `td.you && td.state === 'registering'` — and the cell itself offers
           nothing. A label, not a disabled button: there is no action here to
           disable, and a greyed-out "register" would read as one that might
           come back. */
        action = (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.openTournament(tt.id); };
        actionLabel = 'Watch';
        actionStyle = `padding:9px 14px;border-radius:5px;border:1px solid rgba(148,163,196,0.32);background:transparent;color:#22d3ee;font-size:13px;white-space:nowrap;cursor:pointer`;
      } else {
        // No seat left for this viewer: every paying seat is sold and they hold
        // no invite. An invitee's seat stays theirs, so they still get
        // "register"; a field filled with paying and invited players leaves no
        // one unregistered holding an invite, so everyone else reads "full".
        const full = !registered && !tt.invited && tt.openSeats === 0;
        action = (e) => { if (e && e.stopPropagation) e.stopPropagation(); if (!busy && !full) (registered ? this.unregisterFromTournament : this.registerForTournament)(tt.id); };
        actionLabel = busy ? (registered ? 'Withdrawing…' : 'Registering…') : full ? 'Full' : (registered ? 'Withdraw' : 'Register');
        actionStyle = full && !busy
          ? `padding:9px 14px;border-radius:5px;border:1px solid rgba(232,236,248,0.16);background:transparent;color:${MUT};font-size:13px;white-space:nowrap;opacity:.7;cursor:not-allowed`
          : registered
            ? `padding:9px 14px;border-radius:5px;border:1px solid rgba(148,163,196,0.4);background:transparent;color:#f0a8b4;font-size:13px;white-space:nowrap${busy ? ';opacity:.5;cursor:not-allowed' : ';cursor:pointer'}`
            : `padding:9px 16px;border-radius:5px;border:1px solid rgba(255,255,255,0.15);background:linear-gradient(180deg,#8b5cf6,#6d3fd4);box-shadow:inset 0 1px 0 rgba(255,255,255,0.27),0 1px 3px rgba(0,0,0,0.35);color:${ON_FILL};font-size:13px;font-weight:500;white-space:nowrap${busy ? ';opacity:.5;cursor:not-allowed' : ';cursor:pointer'}`;
      }
      return {
        name: tt.name,
        buyInLabel: buyInMicro > 0 ? usd(buyInMicro / 1e6) : 'Free',
        // The menu pitch, in the regular UI font (the serif hero is saved for the
        // detail page): while registration is open, lead with the guaranteed floor
        // (added prize) and the ceiling (every paying seat filled); once locked,
        // the pool is final so just show it.
        poolLine: (() => {
          const addedMicro = Number(tt.addedPrize || 0);
          // Same picks as the detail screen, all the server's: the frozen pool
          // once locked, else the projection, and the ceiling. Neither is rebuilt
          // from `entrants` or `maxEntrants` — invited seats never pay.
          const ceilMicro = Number(tt.maxPool || 0);
          const projMicro = tt.prizePool != null ? Number(tt.prizePool) : Number(tt.projectedPool || 0);
          const preLock = tt.state === 'scheduled' || tt.state === 'registering';
          if (!preLock) return `${usd(projMicro / 1e6)} prize pool`;
          if (addedMicro > 0) return `${usd(addedMicro / 1e6)} guaranteed · up to ${usd(ceilMicro / 1e6)}`;
          return `Up to ${usd(ceilMicro / 1e6)}`;
        })(),
        // Seats held for invites are capacity the public can't buy — say how
        // many (never who).
        invitesLabel: tt.inviteSeats > 0 ? `${tt.inviteSeats} seat${tt.inviteSeats === 1 ? '' : 's'} held for invites` : '',
        invitesStyle: `display:${tt.inviteSeats > 0 ? 'block' : 'none'};font-size:11px;line-height:1.4;margin-top:2px;color:${MUT}`,
        entrantsLabel: `${tt.entrants ?? 0}/${tt.maxEntrants ?? 'N/A'}`,
        // The pool as its own column, beside buy-in and field. `poolLine` above
        // still carries the guaranteed/ceiling pitch under the name.
        pool: usd((tt.prizePool != null ? Number(tt.prizePool) : Number(tt.projectedPool || 0)) / 1e6),
        // Open to enter reads brass, under way reads green, not open yet muted.
        dot: tt.state === 'registering' ? BRASS : live ? '#22d3ee' : MUT,
        /* An event under way says where it is, not when it starts — the clock
           already ran. `currentLevel` and `remaining` ride the list for exactly
           this; both are null until the runtime has them, so each half is
           stated only once it is known. */
        when: live
          ? [
              tt.state === 'final_table' ? 'Final table' : 'In play',
              tt.currentLevel != null ? `level ${tt.currentLevel}` : '',
              tt.remaining != null ? `${tt.remaining} left` : '',
            ].filter(Boolean).join(' · ')
          : tc.label,
        whenTone: live ? '#22d3ee' : tc.urgent ? '#f0a8b4' : MUT,
        countdownLabel: tc.label,
        countdownStyle: `display:${tc.label ? 'block' : 'none'};font-size:11px;line-height:1.4;margin-top:2px;font-variant-numeric:tabular-nums;color:${tc.urgent ? '#f33f5d' : MUT}`,
        // The row itself opens the detail screen; the action button is a
        // shortcut that stops its click from also bubbling up into that same
        // row handler — same idiom regardless of which action it resolves to.
        open: () => this.openTournament(tt.id),
        action, actionLabel, actionStyle,
      };
    });
    /* With nothing on the books at all, the hero has already said so — a
       structure panel with no event to describe, and a table of column
       headings over an empty row, only repeat it twice more in the language of
       a page that failed to load. Both come back the instant an event exists.

       A filter that empties the list is a different thing: the schedule stays,
       because the chips have to remain reachable to undo. */
    const tNothingAtAll = tAll.length === 0;
    vals.featStructureStyle = tNothingAtAll
      ? 'display:none'
      : 'flex:1 1 280px;min-width:0;border:1px solid rgba(232,236,248,0.12);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:12px';
    vals.scheduleStyle = tNothingAtAll ? 'display:none' : 'display:flex;flex-direction:column;gap:10px';
    vals.tournamentsEmpty = tRows.length === 0;
    vals.tournamentsEmptyText = st.tourErr
      ? 'Could not load the schedule, try again in a moment.'
      : tFilter === 'open' ? 'Nothing open for registration right now.'
        : tFilter === 'live' ? 'No event is being played right now.'
          : 'Nothing scheduled, the next event shows up here when it is.';
    /* ALL / OPEN / RUNNING. No FINISHED chip: `handleList`'s allow-list stops
       at the states an event is still in, so a completed one is not on this
       page for anybody — your own finished events reach it through
       /api/tournaments/mine, and sit under "your events" above. A chip that
       could only ever be empty is worse than no chip. */
    vals.tFilters = [['all', 'ALL'], ['open', 'OPEN'], ['live', 'RUNNING']].map(([k, label]) => ({
      label,
      on: tFilter === k,
      ink: tFilter === k ? FELT_INK : MUTED,
      pick: () => this.setState({ tFilter: k }),
    }));
    vals.tournamentError = st.tournamentError || '';
    vals.tournamentErrorStyle = `display:${st.tournamentError ? 'block' : 'none'};padding:10px 16px;margin-bottom:14px;border-radius:12px;background:rgba(148,163,196,0.14);color:#f33f5d;font-size:12px`;

    /* ── tournament detail ───────────────────────────────────────────
       One object, `st.tournamentDetail`, loaded by `loadTournamentDetail`
       (GET /api/tournaments/:id, Part 4 Task 1) whenever the id in
       `st.tournamentDetailId` opens. renderVals runs on every render
       regardless of which screen is up, so every field below degrades to a
       quiet placeholder while the fetch is still in flight or on a screen
       that never opened one. */
    const td = st.tournamentDetail;
    const tdId = st.tournamentDetailId;
    const tdBusy = !!(tdId && st.tournamentBusy && st.tournamentBusy[tdId]);
    // 1 -> "1st", 11 -> "11th", 21 -> "21st" — shared by the payouts table
    // and the your-status line so a finish and its payout row read alike.
    const ord = (n) => {
      const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
      return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
    };

    /* ── FIX 1: "your events" — the caller's own live/finished registrations ──
       GET /api/tournaments (handleList) returns ONLY scheduled/registering
       events, so a running/final_table/complete event is never in
       st.tournaments and the join-based CTAs in `tournamentRows` never render
       for it — a player who leaves the felt is stranded with no in-app route
       back or to their result. This section renders straight off `st.tMine`
       (populated by pollMine on tab entry), INDEPENDENT of the list, so the
       "return to your table" / "view result" affordances always exist. Uses
       `ord` (defined just above) — hence its placement here rather than beside
       the tournaments list vals. Placed after `ord` on purpose. */
    vals.tMineRows = (st.tMine || []).reduce((rows, mine) => {
      const seated = !!((mine.state === 'running' || mine.state === 'final_table') && mine.tableId != null);
      const finished = mine.finishPlace != null;
      // handleList ships ONLY scheduled|registering, so an event that has locked
      // — or started before the runtime handed this player a table — is in
      // neither the list nor here: registered, and the event simply vanished
      // from the app. Keep those rows.
      const seating = !seated && !finished
        && (mine.state === 'locked' || mine.state === 'running' || mine.state === 'final_table');
      if (!seated && !finished && !seating) return rows; // scheduled/registering already live in the normal list
      let action, actionLabel, actionStyle, statusLabel;
      if (seated) {
        action = (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.enterTournamentTable(mine.tableId, mine.seatNo, mine.tournamentId); };
        actionLabel = 'Return to your table';
        actionStyle = `padding:9px 16px;border-radius:5px;border:1px solid rgba(255,255,255,0.15);background:linear-gradient(180deg,#8b5cf6,#6d3fd4);box-shadow:inset 0 1px 0 rgba(255,255,255,0.27),0 1px 3px rgba(0,0,0,0.35);color:${ON_FILL};font-size:13px;font-weight:500;white-space:nowrap;cursor:pointer`;
        statusLabel = mine.state === 'final_table' ? 'Final table' : 'In play';
      } else if (seating) {
        action = (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.openTournament(mine.tournamentId); };
        actionLabel = 'View';
        actionStyle = `padding:9px 14px;border-radius:5px;border:1px solid rgba(232,236,248,0.28);background:linear-gradient(180deg,rgba(148,163,196,0.05),rgba(0,0,0,0.125));box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);font-size:13px;white-space:nowrap;cursor:pointer;color:${FELT_INK}`;
        statusLabel = mine.state === 'locked' ? 'Registration closed · seating you' : 'Seating you…';
      } else {
        action = (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.openResult(mine); };
        actionLabel = 'View result';
        actionStyle = `padding:9px 14px;border-radius:5px;border:1px solid rgba(232,236,248,0.28);background:linear-gradient(180deg,rgba(148,163,196,0.05),rgba(0,0,0,0.125));box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);font-size:13px;white-space:nowrap;cursor:pointer;color:${FELT_INK}`;
        statusLabel = `Finished ${ord(mine.finishPlace)}`;
      }
      /* What the row states beside the name. `mine` carries what actually
         moved — `buyInPaid`/`feePaid`, and `payout` once the event settles —
         so a finished row shows what it returned and a live one shows what it
         cost. Neither is a projection. */
      const paid = (Number(mine.buyInPaid || 0) + Number(mine.feePaid || 0)) / 1e6;
      const metaK = finished ? 'PAYOUT' : 'BUY-IN PAID';
      const metaV = finished
        ? (mine.payout != null ? usd(Number(mine.payout) / 1e6) : 'N/A')
        : (mine.paid ? usd(paid) : 'invited');
      rows.push({
        name: mine.name || 'Tournament',
        statusLabel,
        // Live events wear the win rule; everything else the plain hairline.
        border: seated ? 'rgba(148,163,196,0.4)' : 'rgba(232,236,248,0.12)',
        tone: seated ? '#22d3ee' : MUT,
        metaK,
        metaV,
        metaStyle: 'flex:0 1 auto;display:flex;flex-direction:column;gap:2px',
        open: () => this.openTournament(mine.tournamentId),
        action, actionLabel, actionStyle,
      });
      return rows;
    }, []);
    vals.hasMine = vals.tMineRows.length > 0;
    vals.tMineStyle = `display:${vals.tMineRows.length ? 'block' : 'none'};margin-bottom:22px`;

    vals.tdName = td ? td.name : 'Loading…';
    vals.tdStateLabel = td
      ? `${String(td.state).replace('_', ' ').toUpperCase()}${td.currentLevel ? ` · LEVEL ${td.currentLevel}` : ''}${td.remaining != null ? ` · ${td.remaining} LEFT` : ''}`
      : '';
    const tdAddedMicro = td ? Number(td.addedPrize || 0) : 0;
    // Frozen pool once locked (t.prizePool); before that, the server's
    // buy-ins-collected + added-money projection, the same figure the list row
    // gets. Never rebuilt here from `entrants` — that counts invited seats,
    // which paid nothing.
    const tdPoolMicro = td
      ? (td.prizePool != null ? Number(td.prizePool) : Number(td.projectedPool || 0))
      : 0;
    vals.tdPoolLabel = td ? usd(tdPoolMicro / 1e6) : 'N/A';
    // Prize-pool showcase: an overlay event is a guaranteed floor (the added
    // prize) climbing to a ceiling (every paying seat filled — the server's
    // `maxPool`, which leaves out seats held for invites, so a full field fills
    // the bar). Show all three — the live pool, what is guaranteed, and how high
    // it can go — while registration is open, so it never reads as a flat
    // number. Once the field is locked the pool is final, so the projection
    // chrome drops away.
    const tdMaxPoolMicro = td ? Number(td.maxPool || 0) : 0;
    const tdPreLock = !!(td && (td.state === 'scheduled' || td.state === 'registering'));
    const tdFillPct = tdMaxPoolMicro > 0 ? Math.max(3, Math.min(100, (tdPoolMicro / tdMaxPoolMicro) * 100)) : 3;
    vals.tdGtdLabel = `${usd(tdAddedMicro / 1e6)} guaranteed`;
    vals.tdMaxPoolLabel = `Up to ${usd(tdMaxPoolMicro / 1e6)}`;
    vals.tdGtdChipStyle = `display:${tdPreLock && tdAddedMicro > 0 ? 'inline-flex' : 'none'};align-items:center;font-size:11px;color:#a78bfa;border:1px solid rgba(139,92,246,0.4);border-radius:5px;padding:3px 9px;background:linear-gradient(180deg,rgba(139,92,246,0.09),rgba(0,0,0,0.063))`;
    vals.tdCeilChipStyle = `display:${tdPreLock && tdMaxPoolMicro > tdPoolMicro ? 'inline-flex' : 'none'};align-items:center;font-size:11px;color:#94a3c4;border:1px solid rgba(232,236,248,0.18);border-radius:5px;padding:3px 9px`;
    vals.tdPoolBarStyle = `display:${tdPreLock && tdMaxPoolMicro > 0 ? 'block' : 'none'};position:relative;height:5px;border-radius:3px;background:rgba(0,0,0,0.35);margin-top:12px;max-width:420px;overflow:hidden`;
    vals.tdPoolFillStyle = `position:absolute;left:0;top:0;bottom:0;width:${tdFillPct}%;border-radius:3px;background:linear-gradient(90deg,rgba(139,92,246,0.6),#8b5cf6);box-shadow:0 0 10px -2px rgba(139,92,246,0.7);transition:width .4s ease`;
    vals.tdEntrantsLabel = td ? `${td.entrants ?? 0}/${td.maxEntrants ?? 'N/A'}` : 'N/A';
    // Seats held for invites: capacity the public can't buy, shown while it
    // still matters (before the field locks).
    const tdInviteSeats = td ? Number(td.inviteSeats || 0) : 0;
    vals.tdInvitesLabel = `${tdInviteSeats} seat${tdInviteSeats === 1 ? '' : 's'} held for invites`;
    vals.tdInvitesStyle = `display:${tdPreLock && tdInviteSeats > 0 ? 'inline' : 'none'}`;
    // The same helper the list rows use, so a row and the screen it opens can
    // never show different clocks. A `scheduled` event now counts down to
    // REGISTRATION OPENING rather than silently to a start nobody can register
    // for yet. Terminal states are left to the caps chip above (`tdStateLabel`,
    // which already carries level + players left); `locked` is the exception —
    // "starting…" beside "LOCKED" is genuinely new information.
    const tdClock = td ? tCountdown(td.state, td.openAt, td.startAt, st.now) : { label: '', clock: false, urgent: false };
    vals.tdCountdown = (tdClock.clock || (td && td.state === 'locked')) ? tdClock.label : '';
    vals.tdCountdownStyle = `display:${vals.tdCountdown ? 'inline' : 'none'};font-variant-numeric:tabular-nums${tdClock.urgent ? ';color:#a78bfa' : ''}`;
    // Display-only estimate (percent of the pool, remainder-to-1st not
    // reproduced) — the gateway's `splitPayouts` is the payout of record.
    /* `|| []` on both: these come off the wire, and a response that is missing
       one — an older gateway, a partial body, an error that slipped through —
       must render an empty ladder, not throw. renderVals is shared by every
       screen, so an exception here takes the whole site down. */
    vals.tdPayoutRows = td ? (td.payouts || []).map((p, i) => ({
      place: ord(i + 1),
      pctLabel: `${p}%`,
      amountLabel: usd((tdPoolMicro * p) / 100 / 1e6),
    })) : [];
    vals.tdBlindRows = td ? (td.blinds || []).map((l, i) => {
      const lvl = i + 1;
      const current = td.currentLevel === lvl;
      return {
        levelLabel: `L${lvl}`,
        blindsLabel: `${fmt(l.sb)}/${fmt(l.bb)}`,
        anteLabel: l.ante ? fmt(l.ante) : 'N/A',
        rowStyle: `display:grid;grid-template-columns:44px 1fr auto;gap:12px;padding:8px 18px;font-size:12.5px;border-bottom:1px dashed rgba(232,236,248,0.11);${current ? 'background:rgba(139,92,246,0.22);font-weight:500;' : ''}`,
      };
    }) : [];
    vals.tdYouStatus = (() => {
      if (!td) return '';
      const you = td.you;
      if (!you) return 'Connect a wallet to see your status';
      if (you.finishPlace) {
        const payout = you.payout != null ? Number(you.payout) : 0;
        return payout > 0 ? `You finished ${ord(you.finishPlace)} · ${usd(payout / 1e6)} credited` : `You finished ${ord(you.finishPlace)}`;
      }
      if (you.tableId) return `You're seated · table ${you.tableId} seat ${you.seatNo}`;
      if (you.registered) return "You're registered, good luck";
      if (you.invited) return 'You have a free invite, register to claim your seat';
      return 'Not registered';
    })();
    vals.tdRegisterAction = (() => {
      const hidden = { label: '', onClick: () => {}, style: 'display:none' };
      if (!td || !td.you || td.state !== 'registering') return hidden;
      const registered = !!td.you.registered;
      // Same rule as the list row: every paying seat sold and no invite held.
      if (!registered && !td.you.invited && td.openSeats === 0 && !tdBusy) {
        return {
          label: 'Full', onClick: () => {},
          style: `padding:10px 22px;border-radius:5px;font-size:12px;font-weight:500;border:1px solid rgba(232,236,248,0.22);background:transparent;color:${MUT};opacity:.6;cursor:not-allowed`,
        };
      }
      const label = tdBusy ? (registered ? 'Withdrawing…' : 'Registering…') : (registered ? 'Withdraw' : 'Register');
      const onClick = () => {
        if (tdBusy) return;
        // Refresh the detail too (not just the list) so `you.registered` / status
        // flip on THIS screen without a navigate-away-and-back.
        (registered ? this.unregisterFromTournament : this.registerForTournament)(td.id)
          .then(() => this.loadTournamentDetail());
      };
      const style = `padding:10px 22px;border-radius:5px;font-size:12px;font-weight:500;${registered ? `border:1px solid rgba(232,236,248,0.22);background:transparent;color:#f33f5d` : `border:none;background:linear-gradient(180deg,#222c47,#0d1220);color:${PAPER_INK};box-shadow:inset 0 1px 0 rgba(255,255,255,0.12),0 1px 2px rgba(0,0,0,0.35)`}${tdBusy ? ';opacity:.5;cursor:not-allowed' : ';cursor:pointer'}`;
      return { label, onClick, style };
    })();
    // Present once the runtime has actually seated the caller (`you.tableId`
    // live). The controller that drives an in-tournament felt attach is Part
    // 4 Task 3/4; until it lands this degrades to a toast instead of a dead
    // click.
    vals.tdSeatAction = (() => {
      const hidden = { label: '', onClick: () => {}, style: 'display:none' };
      if (!td || !td.you || !td.you.tableId) return hidden;
      const tableId = td.you.tableId, seatNo = td.you.seatNo, tournamentId = td.id;
      return {
        label: 'Take your seat',
        onClick: () => {
          if (this.enterTournamentTable) this.enterTournamentTable(tableId, seatNo, tournamentId); // FIX 2: pass td.id
          else this.toast('Table entry lands with the session controller', 'ok');
        },
        style: `padding:10px 22px;border-radius:5px;font-size:12px;font-weight:500;border:none;background:linear-gradient(180deg,#222c47,#0d1220);color:${PAPER_INK};box-shadow:inset 0 1px 0 rgba(255,255,255,0.12),0 1px 2px rgba(0,0,0,0.35);cursor:pointer`,
      };
    })();

    /* ── tournament session: move / auto-seat overlay (Part 4 Task 3) ──
       A courtesy warn + short countdown, then auto-advance onto the (new)
       table. Rendered over any screen while `tSession.status==='moving'` —
       the initial auto-seat and every rebalance move share it. `pauseReason`
       (a runtime PauseReason) labels it; "go now" only shortcuts the clock. */
    const tsess = st.tSession;
    const tMoving = !!(tsess && tsess.status === 'moving');
    vals.tMoveOverlayOn = tMoving;
    // Same backdrop idiom as the rebuy dialog (z above it so a move over a
    // busted felt still reads on top).
    vals.tMoveBackdrop = `position:absolute;inset:0;z-index:85;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,0.72)`;
    vals.tMoveOverlayTitle = (() => {
      if (!tMoving) return '';
      const r = tsess.pauseReason;
      if (r === 'formingFinalTable') return 'Forming the final table';
      if (r === 'move') return 'Tables are rebalancing';
      if (r === 'handForHand') return 'hand-for-hand';
      if (r === 'outage') return 'A brief pause';
      return tsess.tableId ? 'Moving tables' : 'Taking your seat';
    })();
    vals.tMoveOverlaySub = tMoving
      ? (tsess.tableId ? 'The field never waits, you move automatically' : 'The field never waits, you are seated automatically')
      : '';
    vals.tMoveOverlayCountdown = (() => {
      if (!tMoving || tsess.countdownAt == null) return '';
      const secs = Math.max(0, Math.ceil((tsess.countdownAt - st.now) / 1000));
      return secs > 0 ? `Moving in ${secs}s` : 'Moving now…';
    })();
    vals.tMoveOverlayGo = () => this.goMoveNow();

    /* ── tournament result ────────────────────────────────────────────
       Part 4 Task 3 routes here on bust/win (`enterBust`) and on resume of a
       busted-while-away entry (`routeTournamentResult`); Task 5's `openResult`
       is the third way in, for a finished row's "view result" (Task 6).
       `ord`/`usd` are in scope above. The payout is already credited to the
       bankroll by the runtime — this screen only states that and offers a
       withdraw, never a claim. */
    const tr = st.tournamentResult;
    const trInMoney = !!(tr && tr.payout != null && Number(tr.payout) > 0);
    vals.trName = tr && tr.name ? tr.name : 'Tournament';
    vals.trPlace = tr && tr.finishPlace != null ? ord(tr.finishPlace) : '';
    vals.trIsWinner = !!(tr && tr.finishPlace === 1);
    vals.trEyebrow = vals.trIsWinner ? 'CHAMPION' : 'TOURNAMENT';
    vals.trFinishLabel = tr && tr.finishPlace != null ? `You finished ${vals.trPlace}` : 'Thanks for playing';
    // Below the money: quiet "no cash this time" — never a blank line, and
    // never a withdraw prompt for a $0 balance (trShowWithdraw below).
    vals.trPayoutLabel = trInMoney
      ? `${usd(Number(tr.payout) / 1e6)} credited to your bankroll`
      : 'No cash this time';
    vals.trPayoutStyle = `font-size:13px;color:${trInMoney ? '#22d3ee' : '#94a3c4'};margin-bottom:34px`;
    vals.trShowWithdraw = trInMoney;
    // Reuses the exact profile withdraw pipeline — no new fetch, no new
    // endpoint. `fundDraft`/`fundInput`/`fundNote`/`fundWithdrawStyle` are the
    // same vals the profile funding card binds (defined above); this screen's
    // `enterBust`/`routeTournamentResult`/`openResult` each seed `fundDraft`
    // with the payout so the field opens pre-filled and stays editable.
    vals.trWithdrawAction = this.fundWithdraw;
    vals.trHasDetail = !!(tr && tr.tournamentId);
    vals.trViewDetail = () => tr && tr.tournamentId && this.openTournament(tr.tournamentId);

    /* ── the table ────────────────────────────────────────────────── */
    // On a phone's side the rail is an overlay, so nothing stacks under the felt.
    vals.tableShell = `position:relative;flex:1;display:flex;flex-direction:${c && !mini ? 'column' : 'row'};align-items:stretch;gap:0;min-height:0`;
    /* The felt's column. min-height:0 is load-bearing: without it `flex:1` on
       the felt's container does not cap its height, and since the felt's
       measured height becomes its rendered height, the two grow each other
       every frame until the table runs off the page. On a phone's side the
       padding goes and it becomes the positioning box for the action controls,
       which lie over the felt's bottom corners instead of under it. */
    vals.feltCol = `flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;align-items:center;${mini ? 'position:relative;padding:0' : tall ? 'padding:6px 6px 0' : 'padding:14px 12px 0'}`;
    // The container the play area is fitted into: felt green with a lit centre.
    // It holds the design's own aspect via nothing at all — the play area scales
    // to whatever box this is, so this just needs to be a bounded, clipped box.
    // Under an oval skin it is the dark ground instead, and the table itself is
    // `tableSurface`, the first thing painted inside the play area.
    const skin = tableStyle(st.tableStyle);
    vals.stageBox = `position:relative;flex:1;min-height:0;overflow:hidden;width:100%;${tableGroundCss(skin)}`;
    vals.tableSurface = tableSurfaceCss(skin, tall ? CANVAS.h : 0);
    // The fixed design canvas, centred and scaled as one unit.
    vals.playArea = `position:absolute;left:50%;top:50%;width:${CANVAS.w}px;height:${CANVAS.h}px;transform:translate(-50%,-50%) scale(${g.s.toFixed(4)});transform-origin:center;font-family:${UI}`;

    const board = t ? t.board : [];
    const seats = t ? t.seats : [];
    const potTotal = t ? t.potTotal || 0 : 0;
    const clock = t && t.clock;
    const calm = (this.props.density ?? 'calm') === 'calm';

    // With no hand running the felt should say so rather than name a street.
    const streetLabel = t && t.street
      ? (t.phase === 'complete' ? 'Showdown' : t.street)
      : 'Waiting';
    vals.handIdLabel = t && t.handId ? t.handId : 'N/A';
    vals.commitLabel = t && t.commit ? t.commit.slice(0, 8) + '…' : 'N/A';
    vals.streetLabel = streetLabel;
    vals.feltRef = this.feltRef;

    // What is happening, top-left; the street, top-right.
    // An oval's rail curves down through this corner, so under one both lines
    // move up into the ground above it and the status stops 300px along, short
    // of where the rail arrives; the hand id already ellipsises.
    // Stood on end, the head seat's plate starts 250px along the same edge, so
    // the status stops short of that instead.
    // the head of the screen is the corner buttons' (Leave, sit, menu), so both
    // lines drop under them.
    const corner = tall ? { x: 16, y: 92, max: '230px' }
      : skin.felt ? { x: 24, y: 8, max: '280px' } : { x: 40, y: 26, max: '60%' };
    vals.feltStatusStyle = `position:absolute;left:${corner.x}px;top:${corner.y}px;display:flex;align-items:center;gap:9px;font-size:13px;font-weight:500;letter-spacing:.01em;pointer-events:none;z-index:5;max-width:${corner.max}`;
    vals.handIdSep = `${tall ? 'display:none;' : ''}opacity:.4;color:#94a3c4`;
    // MUTED at full strength: at 0.7 over the felt's darkest corner this read
    // 4.36:1, and a hand id is what you quote when disputing a hand.
    vals.handIdOnFelt = `${tall ? 'display:none;' : ''}font-size:11px;letter-spacing:.12em;color:${MUTED};white-space:nowrap;overflow:hidden;text-overflow:ellipsis`;
    /* While the rail is closed the menu button floats in the screen's top-right
       corner (TableDrawer), 52px in from the edge. Where the canvas leaves less
       than that beside itself — a table as wide as its box, which is every
       narrow phone and any window with the rail shut — the street moves
       inboard far enough to clear it, in canvas pixels. */
    const sideGap = Math.max(0, (st.felt.w - CANVAS.w * g.s) / 2);
    const menuClear = st.railOpen ? 0 : (mini ? 60 : 48);   // the felt's column is padded 12px off a phone
    const streetX = tall ? corner.x : Math.max(corner.x, (menuClear - sideGap) / g.s);
    vals.streetStyle = `position:absolute;right:${streetX.toFixed(0)}px;top:${corner.y + 2}px;display:flex;align-items:center;gap:10px;font-size:12px;letter-spacing:.22em;color:#94a3c4;text-transform:uppercase;pointer-events:none;z-index:5`;
    vals.streetDotStyle = `width:6px;height:6px;border-radius:50%;background:${BRASS};${t && t.phase !== 'complete' && t.running !== false ? 'animation:suPulse 1.6s ease-in-out infinite' : 'opacity:.4'}`;

    // The board's own frame: a stroked path with a real gap, the wordmark in it,
    // five slots centred inside it.
    vals.boardFrameStyle = `position:absolute;left:${BOARD.cx}px;top:${BOARD.cy}px;transform:translate(-50%,-50%);width:${BOARD.w}px;height:${BOARD.h}px;pointer-events:none;z-index:1`;
    vals.boardPath = BOARD_PATH;
    vals.boardStroke = `fill:none;stroke:rgba(232,236,248,0.26);stroke-width:1.5`;
    vals.boardMark = 'suited.club';
    vals.boardMarkStyle = `position:absolute;left:50%;top:0;transform:translate(-50%,-50%);font-size:19px;font-weight:400;letter-spacing:-.01em;color:#e8ecf8;white-space:nowrap`;
    vals.boardSlotsRow = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;gap:${BOARD.gap}px`;
    vals.boardSlots = [0, 1, 2, 3, 4].map(() => ({
      style: `width:${BOARD.slot.w}px;height:${BOARD.slot.h}px;box-sizing:border-box;border-radius:${BOARD.slot.r}px;border:1px dashed rgba(232,236,248,0.22)`,
    }));

    /* Cards. 12 hole slots then 5 board slots, a fixed order so a card's
       identity never shifts under it. Each is dealt from the middle of the
       board to its place; the hero's turn over once they land, an opponent's
       stay down unless the hand is shown. */
    /* The crown. At showdown the cards that actually made the winning hand —
       the best five of a winner's hole + board, not the whole board — lift off
       the felt and light brass. Derived from the winner's seven cards with the
       same evaluator the engine settles with, and memoised per hand so the
       21-combo search runs once rather than on every render frame. */
    // The engine is reached through the global the boot sets, not the module
    // import: inside a class method that `import * as poker` binding is out of
    // scope (unlike the module-level consts), so use the one that is in scope.
    const poker = SUITED.poker;
    // Same reason as `poker` above. Falls back to showing nothing rather than
    // to showing everything: if the module is missing, the cards stay blank.
    const cardView = SUITED.cardView
      || { cardFace: () => ({ rank: '', suit: '', red: false, shown: false }) };
    // The win moment keys off the winner flag (set the instant the pot is
    // awarded), not `phase === 'complete'`. The award beat is 3400ms, so waiting
    // for the phase would land the crown *after* the +2200ms fade timer had
    // already fired and swallowed it — the whole crown never showing, only the
    // gold plate (which is not gated on the fade) surviving.
    const hasWinner = !!(t && t.seats && t.seats.some((s) => s && s.winner));
    let crownIds = (this._crownIds instanceof Set && this._crownHand === (t && t.handId)) ? this._crownIds : null;
    if (!crownIds && poker && t && hasWinner && board.length === 5) {
      const ids = new Set();
      const toCard = (c) => ({ r: c.r, s: c.s, si: poker.SUITS.indexOf(c.s) });
      const bd = board.map(toCard);
      seats.forEach((s) => {
        if (!(s && s.winner && s.revealed && s.hole && s.hole.length === 2)) return;
        const seven = [toCard(s.hole[0]), toCard(s.hole[1]), ...bd];
        let bestV = null, bestFive = null;
        for (let a = 0; a < 3; a++) for (let b = a + 1; b < 4; b++) for (let c = b + 1; c < 5; c++)
          for (let d = c + 1; d < 6; d++) for (let e = d + 1; e < 7; e++) {
            const five = [seven[a], seven[b], seven[c], seven[d], seven[e]];
            const v = poker.evaluate(five).v;
            if (!bestV || poker.cmp(v, bestV) > 0) { bestV = v; bestFive = five; }
          }
        if (bestFive) bestFive.forEach((c) => ids.add(RANKS[c.r] + c.s));
      });
      crownIds = ids; this._crownIds = ids; this._crownHand = t.handId;
    }
    if (!(crownIds instanceof Set)) crownIds = this._noCrown || (this._noCrown = new Set());
    const crownOn = hasWinner;
    const reduceMotion = typeof window !== 'undefined' && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // Every face-down card wears the chosen back (@/lib/card-backs).
    const backCss = cardBackCss(cardBack(st.cardBackStyle));
    const cards = [];
    const deckX = BOARD.cx, deckY = BOARD.cy;
    for (let seat = 0; seat < 6; seat++) {
      const slot = CARD_SLOT[seat];
      const s = seats[seat];
      const isHero = seat === 0;
      const cw = slot.cw, ch = slot.ch, cr = isHero ? HERO_CARD.r : HOLE.r;
      const totalW = 2 * cw + slot.gap;
      for (let k = 0; k < 2; k++) {
        const key = `h${seat}-${k}`;
        const has = !!(s && s.hole && s.hole[k]);
        const folded = s && s.folded;
        const arrived = !!st.fx.arrived[key] && has;
        const destX = slot.cx - totalW / 2 + k * (cw + slot.gap);
        const x = arrived && !folded ? destX : deckX - cw / 2;
        const y = arrived && !folded ? slot.top : deckY - ch / 2;
        const faceUp = isHero ? !!st.fx.flipped[key] : !!(s && s.revealed);
        const rot = (isHero ? (k === 0 ? -3 : 3) : (k === 0 ? -2 : 2)) + (arrived ? 0 : 10);
        const cid = has ? s.hole[k] : null;
        /* The face is decided once, by `cardFace`, and withheld until the slot
           is actually face-up — see engine/card-view.js. The gate is `faceUp`
           and not `arrived`: an opponent's card lands face-down, so arrival
           would have published the projected card's suit on every back. `pc`
           stays for the geometry below, which needs a shape either way. */
        const face = cardView.cardFace(cid, faceUp && !folded);
        const pc = cid ? { r: cid.r, s: cid.s } : { r: 12, s: 's' };
        const red = face.red;
        const crown = crownOn && !st.fx.winHide && !folded && face.shown && crownIds.has(RANKS[pc.r] + pc.s);
        const lift = crown && !reduceMotion ? 20 : 0;
        const cScale = crown ? 1.06 : (arrived && !folded ? 1 : 0.92);
        cards.push({
          wrap: `position:absolute;left:0;top:0;width:${cw}px;height:${ch}px;transform:translate3d(${x.toFixed(1)}px,${(y - lift).toFixed(1)}px,0) rotate(${crown ? 0 : rot}deg) scale(${cScale});opacity:${has && !folded ? 1 : 0};transition:transform .55s ${EASE},opacity .34s ease;z-index:${crown ? 50 : (isHero ? 26 : 12)};pointer-events:none;filter:drop-shadow(0 ${crown ? 16 : arrived ? 7 : 2}px ${crown ? 30 : arrived ? 18 : 5}px rgba(0,0,0,${crown ? 0.5 : 0.42}))`,
          inner: `position:relative;width:100%;height:100%;transform-style:preserve-3d;transform:rotateY(${faceUp ? 0 : 180}deg);transition:transform .42s ${EASE}`,
          back: `position:absolute;inset:0;border-radius:${cr}px;backface-visibility:hidden;transform:rotateY(180deg);${backCss};box-shadow:inset 0 0 0 1px rgba(232,236,248,0.26), ${FLAT_CARD}`,
          face: `position:absolute;inset:0;border-radius:${cr}px;backface-visibility:hidden;background:${CARD_FACE};box-shadow:${crown ? LIT_CARD : FLAT_CARD};transition:box-shadow .42s ease`,
          cornerA: `position:absolute;left:${(cw * 0.12).toFixed(1)}px;top:${(ch * 0.045).toFixed(1)}px;font-family:${SERIF};font-size:${(ch * 0.3).toFixed(1)}px;line-height:1;color:${red ? RED_CARD : '#101828'}`,
          cornerB: `position:absolute;right:${(cw * 0.12).toFixed(1)}px;bottom:${(ch * 0.05).toFixed(1)}px;font-size:${(ch * 0.235).toFixed(1)}px;line-height:1;color:${red ? RED_CARD : '#101828'}`,
          rank: face.rank,
          suit: face.suit,
        });
      }
    }
    for (let i = 0; i < 5; i++) {
      const key = `b${i}`;
      const has = i < board.length;
      const arrived = !!st.fx.arrived[key] && has;
      const cid = has ? board[i] : null;
      /* Same rule as the hole cards. Here the gate is arrival, because a board
         card is only ever dealt face-up — and this is the street leak: the real
         rank and suit used to go into the DOM the moment the event landed. */
      const face = cardView.cardFace(cid, arrived);
      const pc = cid ? { r: cid.r, s: cid.s } : { r: 12, s: 's' };
      const red = face.red;
      const crown = crownOn && !st.fx.winHide && face.shown && crownIds.has(RANKS[pc.r] + pc.s);
      const lift = crown && !reduceMotion ? 14 : 0;
      const cw = BOARD.slot.w, ch = BOARD.slot.h, cr = BOARD.slot.r;
      const destX = BOARD.cx - 193 + i * 80, destY = BOARD.cy - 47;   // five 66px slots, 14px apart, centred in the frame
      const x = arrived ? destX : deckX - cw / 2;
      const y = arrived ? destY : deckY - ch / 2;
      cards.push({
        wrap: `position:absolute;left:0;top:0;width:${cw}px;height:${ch}px;transform:translate3d(${x.toFixed(1)}px,${(y - lift).toFixed(1)}px,0) rotate(${arrived ? 0 : 8}deg) scale(${crown ? 1.05 : 1});opacity:${has ? 1 : 0};transition:transform .55s ${EASE},opacity .3s ease;z-index:${crown ? 50 : 14};pointer-events:none;filter:drop-shadow(0 ${crown ? 16 : 7}px ${crown ? 30 : 18}px rgba(0,0,0,${crown ? 0.5 : 0.42}))`,
        inner: `position:relative;width:100%;height:100%;transform-style:preserve-3d;transform:rotateY(${arrived ? 0 : 180}deg);transition:transform .5s ${EASE}`,
        back: `position:absolute;inset:0;border-radius:${cr}px;backface-visibility:hidden;transform:rotateY(180deg);${backCss};box-shadow:inset 0 0 0 1px rgba(232,236,248,0.26), ${FLAT_CARD}`,
        face: `position:absolute;inset:0;border-radius:${cr}px;backface-visibility:hidden;background:${CARD_FACE};box-shadow:${crown ? LIT_CARD : FLAT_CARD};transition:box-shadow .42s ease`,
        cornerA: `position:absolute;left:8px;top:4px;font-family:${SERIF};font-size:${(ch * 0.3).toFixed(1)}px;line-height:1;color:${red ? RED_CARD : '#101828'}`,
        cornerB: `position:absolute;right:8px;bottom:5px;font-size:${(ch * 0.235).toFixed(1)}px;line-height:1;color:${red ? RED_CARD : '#101828'}`,
        rank: face.rank, suit: face.suit,
      });
    }
    vals.cards = cards;

    /* The pot as a mound. Every chip that has gone in sits in a rough oval pile
       rather than a cashier's stack, so the pile grows with the money and a big
       pot reads as a big pile — the thing that makes a monster pot worth
       watching build. A deterministic scatter keeps the same chips in the same
       places as more land, so the pile accretes rather than reshuffling each
       frame; the count is capped so a four-figure pot stays a pile, not a
       carpet, and the figure sits to its right. */
    const potFlat = [];
    if (potTotal > 0) {
      let rest = Math.round(potTotal * 100);
      for (const d of DENOMS) {
        const unit = Math.round(d.v * 100);
        const n = Math.floor(rest / unit);
        rest -= n * unit;
        for (let i = 0; i < n && potFlat.length < 46; i++) potFlat.push(d);
      }
    }
    const pcr = (n) => { const x = Math.sin(n * 91.17) * 43758.5453; return x - Math.floor(x); };
    const pileR = 8 + Math.sqrt(potFlat.length) * 8;   // the mound widens with the count
    const potChips = potFlat.map((d, i) => {
      const ang = pcr(i * 2.7) * Math.PI * 2;
      const rr = Math.sqrt(pcr(i * 5.3)) * pileR;       // sqrt fills the disc evenly
      const x = Math.cos(ang) * rr;
      const y = Math.sin(ang) * rr * 0.52 - i * 0.35;   // squashed to an oval, a little stack rise
      return {
        style: `position:absolute;left:50%;top:50%;margin:${-CHIP / 2}px 0 0 ${-CHIP / 2}px;transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px);width:${CHIP}px;height:${CHIP}px;${chipFace(d)};box-shadow:0 1px 2px rgba(0,0,0,0.5);z-index:${i}`,
      };
    });
    const pileW = potFlat.length ? Math.ceil(pileR * 2 + CHIP) : 0;
    const pileH = potFlat.length ? Math.ceil(pileR * 1.04 + CHIP) : 0;
    vals.potChips = potChips;
    vals.potChipsWrap = `position:relative;flex:none;width:${pileW}px;height:${pileH}px;display:${potFlat.length ? 'block' : 'none'}`;
    vals.potStyle = `position:absolute;left:${POT.cx}px;top:${POT.cy}px;transform:translate(-50%,-50%);display:flex;align-items:center;gap:20px;z-index:18;opacity:${potTotal > 0 ? 1 : 0};transition:opacity .26s linear;pointer-events:none`;
    vals.potReadStyle = `display:flex;align-items:baseline;gap:9px`;
    vals.potAmountStyle = `font-family:${SERIF};font-size:38px;line-height:1;color:#e8ecf8`;
    vals.potUnitStyle = `font-size:11px;letter-spacing:.06em;color:#94a3c4`;
    vals.potLabel = this.amt(potTotal);

    /* Pot ship: the pot's own chips shoved to the winner at showdown. Only while
       something is actually flying — the items mount at the source and move on
       the next frame, so there are no dead nodes parked at the pot. */
    const shipChips = [];
    const fly = st.fx.fly;
    if (fly && fly.items && fly.items.length) {
      fly.items.forEach((it, i) => {
        const at = fly.go ? it.to : it.from;
        if (!at || !Number.isFinite(at.x) || !Number.isFinite(at.y)) return;
        const dur = it.dur || 780;
        const lag = i * 26;
        const d = it.denom || DENOMS[DENOMS.length - 1];
        shipChips.push({
          style: `position:absolute;left:0;top:0;width:${CHIP}px;height:${CHIP}px;transform:translate(${(at.x - CHIP / 2 + (i % 5) * 5 - 10).toFixed(1)}px,${(at.y - CHIP / 2 + (i % 3) * 4 - 4).toFixed(1)}px);${chipFace(d)};box-shadow:0 2px 5px rgba(0,0,0,0.525);z-index:30;opacity:${fly.go ? 0 : 1};transition:transform ${dur}ms cubic-bezier(.22,.7,.3,1) ${lag}ms,opacity ${Math.round(dur * 0.6)}ms ease ${lag + Math.round(dur * 0.42)}ms`,
        });
      });
    }
    vals.shipChips = shipChips;

    // A bet is a dark pill under the nameplate, held for the whole street.
    vals.betPills = seats.map((s, i) => {
      if (!s || s.empty || !(s.bet > 0)) return null;
      return {
        style: `position:absolute;${SEAT_ANCHORS[i].bet};display:flex;align-items:center;gap:11px;background:#0a0d16;border-radius:8px;padding:6px 14px;white-space:nowrap;z-index:19;box-shadow:0 5px 14px rgba(0,0,0,0.475)`,
        labelStyle: `font-size:11px;letter-spacing:.14em;color:rgba(232,236,248,0.074)`,
        amountStyle: `font-family:${SERIF};font-size:18px;line-height:1;color:${BRASS}`,
        label: 'BET',
        amount: this.amt(s.bet),
      };
    }).filter(Boolean);

    /* The acting seat's timer traces the plate itself, 3px outside it, clockwise
       from top centre. Keyed on the clock's start so a new turn remounts the
       element and the sweep restarts from full rather than inheriting a drained
       ring when the same seat is asked to act twice running. */
    vals.seatRings = seats.map((s, i) => {
      const acting = !!(clock && clock.seat === i && t.toAct === i && t.phase !== 'complete');
      if (!acting) return null;
      return {
        id: `ring-${i}-${clock.startedAt}`,
        wrap: `position:absolute;${SEAT_ANCHORS[i].plate};width:${PLATE.w}px;height:${PLATE.h}px;z-index:23;pointer-events:none`,
        // The plate's own box, for the svg that draws the ring around it.
        w: PLATE.w, h: PLATE.h,
        path: PLATE.w === 180 ? RING_PATH : ringPath(PLATE),
        track: `fill:none;stroke:rgba(232,236,248,0.28);stroke-width:2.5`,
        sweep: `fill:none;stroke:${TURN};stroke-width:3;stroke-linecap:round;${PLATE.w === 180 ? `stroke-dasharray:${RING_LEN};animation:ringWide` : `stroke-dasharray:${ringLen(PLATE)};--ring-len:${-ringLen(PLATE)};animation:ringAny`} ${clock.duration}ms linear both;filter:drop-shadow(0 0 6px rgba(34,197,94,0.9))`,
      };
    }).filter(Boolean);

    /* Seats. One fixed 180×54 plate carrying an avatar, a name and one line
       under it — a stack when in the hand, or the state that has replaced it. */
    // The seat wears the player's avatar (with its tier motion) when it has an
    // earned one: the gateway resolves it per frame from the seat's pubkey. The
    // hero prefers its own live `st.avatar`, so re-equipping updates the felt
    // instantly. No avatar, or only a letter default → a generated portrait.
    const seatAv = seats.map((s, i) => (s.empty ? null : ((i === 0 ? (st.avatar || s.avatar) : s.avatar) || null)));
    const seatFace = seatPortraits(
      seats.map((s, i) => (!s.empty && wearsPortrait(seatAv[i]) ? (s.id || s.name || `seat-${i}`) : null)),
      seatAv.map(portraitIndex).filter((n) => n >= 0),
    );
    vals.seatCells = seats.map((s, i) => {
      const isHero = i === 0;
      const empty = !!s.empty;
      const folded = !!s.folded;
      const sittingOut = !!s.sittingOut;
      const allIn = !!s.allIn;
      const won = !!(s && s.winner);
      const acting = !!(clock && clock.seat === i && t.toAct === i && t.phase !== 'complete');
      const dimmed = folded || sittingOut || empty;
      const inHand = !empty && !sittingOut && !folded && !!(s.hole && s.hole.length);

      const bg = won ? '#b497f7'
        : empty ? 'rgba(232,236,248,0.031)'
        : sittingOut ? 'rgba(232,236,248,0.074)'
        : folded ? 'rgba(232,236,248,0.082)'
        : PAPER;
      // The winner's plate is the hero of the showdown: a bright brass crown ring
      // that reads over the dimmed felt, and lifted above the dim on z (below).
      // Gold is the win; the live turn is green (TURN). A seat that is neither acting
      // nor the winner recedes while someone else is on the clock, so the acting
      // seat reads first.
      const someoneActing = !!(clock && t.toAct != null && t.phase !== 'complete');
      const recede = empty ? 0.7 : (someoneActing && !acting ? 0.82 : 1);
      // Only the winner gets a plate glow (brass). The acting seat's signal is
      // the green timer ring alone — the two together read as a double halo.
      const ring = won ? '0 0 0 2.5px #a78bfa, 0 0 34px 8px rgba(139,92,246,0.62)' : 'none';
      const dash = (sittingOut || empty) ? '1px dashed rgba(232,236,248,0.06)' : '0';

      const isStack = !empty && !sittingOut && !folded && !allIn;
      const sub = empty ? 'Open'
        : sittingOut ? 'Sitting out'
        : allIn ? 'All in'
        : folded ? 'Folded'
        : this.amt(s.stack);
      /* The winner's plate goes bright violet, so its text has to go dark with
         it — light ink on that fill is 2.04:1, and the one moment it has to be
         readable is the showdown, when it names who just took the pot. */
      const textCol = won ? FELT_DEEP : dimmed ? '#7884a1' : '#e8ecf8';
      const showPip = inHand;
      const tag = empty ? '' : ((s.name || (isHero ? 'you' : '?')).trim().replace(/[^a-z0-9]/gi, '').slice(0, 1).toUpperCase() || '0');
      const portrait = seatFace[i] != null;
      const av = portrait ? null : seatAv[i];

      return {
        plate: `position:absolute;${SEAT_ANCHORS[i].plate};display:flex;align-items:center;gap:11px;width:${PLATE.w}px;height:${PLATE.h}px;box-sizing:border-box;padding:0 14px 0 9px;border-radius:9px;background:${bg};border:${dash};box-shadow:${ring};opacity:${recede};transition:background .3s linear,box-shadow .3s linear,opacity .3s linear;white-space:nowrap;z-index:${won ? 46 : 22}`,
        sigil: `position:relative;flex:none;width:30px;height:30px;border-radius:50%;background:${dimmed ? 'rgba(232,236,248,0.28)' : FELT_DEEP};display:${empty ? 'none' : 'flex'};align-items:center;justify-content:center;gap:2px`,
        sigilGlyph: `font-family:${SERIF};font-size:16px;line-height:.8;color:${PAPER_INK}`,
        sigilPip: `display:${showPip ? 'block' : 'none'};flex:none`,
        tag,
        // Overlay disc, painted last so an opaque avatar covers the monogram;
        // display:none keeps it out of the box entirely when there is no avatar.
        avTier: av ? avTier(av) : '',
        avWrap: av || portrait ? 'position:absolute;inset:0;width:100%;height:100%' : 'display:none',
        avInner: av ? avInner(av) : portrait ? portraitInner(seatFace[i]) : '',
        name: empty ? 'Open seat' : (isHero ? 'You' : s.name),
        // On a phone's side the canvas is drawn at about half size, so the two
        // lines a seat is read by are set larger to land near 8px and 10px
        // rather than 7 and 8. The plate itself does not grow: it has the room.
        nameStyle: `overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:${mini || tall ? 15 : 13}px;color:${textCol}`,
        sub,
        subStyle: `display:${sub ? 'block' : 'none'};${isStack ? `font-family:${SERIF};font-size:${mini || tall ? 19 : 16}px;line-height:1;` : `font-size:${mini || tall ? 14 : 12}px;letter-spacing:.06em;`}color:${textCol}`,
      };
    });

    /* Dealer and blind markers, off the plate's outer edge. In calm they fade
       once the blinds have stopped being the thing you are working out. */
    const roleFor = (i) => {
      if (!t || t.button == null) return null;
      if (i === t.button) return 'D';
      if (i === t.sbIdx) return 'SB';
      if (i === t.bbIdx) return 'BB';
      return null;
    };
    const late = ['flop', 'turn', 'river', 'showdown'].indexOf(String(t && t.street)) >= 0;
    vals.seatMarkers = seats.map((s, i) => {
      const role = s.empty ? null : roleFor(i);
      if (!role) return null;
      const px = SEAT_PX[i].plate;
      const mx = px.x + MARKER[i].dx, my = px.y + MARKER[i].dy;
      const isD = role === 'D';
      return {
        /* The dealer button is a real object: a pale disc with dark letters.
           It was `background:PAPER; color:FELT`, which was exactly that while
           PAPER was a cream plate — and after the retheme made both of them
           dark surfaces it came to 1.09:1, a disc with an invisible D on it.
           SB/BB keep the dim treatment but stay light: their disc is a pale
           wash over the felt (rgb 79,85,103), so light letters read at 6.29:1
           where dark ones manage 2.6. They were at 0.108 alpha — below even the
           contrast audit's floor for counting a node as text at all. */
        style: `position:absolute;left:0;top:0;transform:translate(${mx.toFixed(1)}px,${my}px) translate(-50%,-50%);display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${isD ? PAPER_COOL : 'rgba(232,236,248,0.28)'};color:${isD ? FELT_DEEP : PAPER_COOL};font-size:9px;font-weight:700;letter-spacing:.02em;box-shadow:0 3px 8px rgba(0,0,0,0.5);opacity:${(calm && late && !isD) ? 0.4 : 1};transition:opacity .3s linear;z-index:24`,
        label: role,
      };
    }).filter(Boolean);

    const callout = st.fx.callout;
    vals.calloutText = callout ? callout.text : '';
    vals.calloutAmount = callout ? callout.amount : '';
    /* Showdown, player-first. The felt dims full-bleed, the winner's seat is
       spotlit and crowned above the dim, the result names itself, and only then
       does the pot ship to them. The dim is over-sized so the felt's own
       `overflow:hidden` clips it to full bleed at any scale — an `inset:0` dim
       lives inside the scaled play area and only ever covers the 1420×750 box,
       which is the "wipe doesn't reach the edges" bug. */
    const winSeats = crownOn ? seats.map((s, i) => ({ s, i })).filter((x) => x.s && x.s.winner) : [];
    const winShown = winSeats.length > 0;
    const spot = SEAT_PX[winSeats.length ? winSeats[0].i : 0].plate;
    const shown = !!callout;
    vals.dimStyle = `position:absolute;inset:-2000px;background:rgba(0,0,0,0.72);opacity:${winShown && !st.fx.winHide ? 1 : 0};transition:opacity 240ms ease;pointer-events:none;z-index:40`;
    // The spotlight: a warm bright pool on the winner's seat, over the dim.
    vals.glowStyle = `position:absolute;left:${spot.x}px;top:${spot.y}px;transform:translate(-50%,-50%);width:660px;height:660px;border-radius:50%;background:radial-gradient(circle, rgba(232,236,248,0.041), rgba(232,236,248,0) 60%);opacity:${winShown && !st.fx.winHide ? 1 : 0};transition:opacity 240ms ease,left .5s ease,top .5s ease;pointer-events:none;z-index:41`;
    // A crown drops onto each winner's plate — the moment the seat, not the
    // cards, is the hero. Above the winner's plate (z 46) so it sits on top.
    vals.seatCrowns = winSeats.map(({ i }) => {
      const px = SEAT_PX[i].plate;
      return { style: `position:absolute;left:0;top:0;transform:translate(${px.x}px,${(px.y - PLATE.h / 2 - 20).toFixed(0)}px) translate(-50%,-100%);z-index:48;pointer-events:none;opacity:${st.fx.winHide ? 0 : 1};transition:opacity 240ms ease` };
    });
    vals.calloutStyle = `position:absolute;left:${BOARD.cx}px;top:${BOARD.cy + 96}px;transform:translate(-50%,-50%) scale(${shown ? 1 : 0.9});opacity:${shown ? 1 : 0};transition:transform 520ms cubic-bezier(.2,.95,.28,1),opacity 300ms linear;pointer-events:none;z-index:80`;
    // Semi-transparent with a backdrop blur, so the felt and cards behind it
    // soften and darken a few px rather than being covered by a solid slab —
    // the result reads as glass laid over the win, not a card taped on top.
    vals.calloutInner = `display:flex;flex-direction:column;align-items:center;gap:7px;background:rgba(0,0,0,0.72);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);border-radius:13px;padding:16px 40px;white-space:nowrap;box-shadow:0 12px 40px rgba(0,0,0,0.625), 0 0 0 1px rgba(139,92,246,0.4)`;
    vals.calloutNameStyle = `font-family:${SERIF};font-size:30px;font-weight:400;letter-spacing:-.01em;color:#e8ecf8`;
    vals.calloutAmtStyle = `font-size:11.5px;letter-spacing:.2em;color:${BRASS}`;

    const celeb = st.fx.celebrate;
    vals.confettiLayer = `position:absolute;inset:0;pointer-events:none;z-index:70;overflow:visible;display:${celeb ? 'block' : 'none'};opacity:${st.fx.winHide ? 0 : 1};transition:opacity 240ms ease`;
    const CONF = [BRASS, WIN, PAPER, '#7d4cf0', '#22d3ee', '#b194f6'];
    /* Confetti clusters in an oval around the winner's seat and fades in and out
       rather than raining down the whole felt — the celebration belongs to them.
       A stable per-index pseudo-random keeps the burst from re-scattering every
       frame, which a fresh Math.random in render would. The wrap positions each
       piece in the oval; the inner animates, so the two do not fight over transform. */
    const cr = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
    // Only once there is a winner to centre on — otherwise `spot` falls back to
    // seat 0 and the burst flashes on the hero (often the loser) before it jumps.
    vals.confetti = (celeb && winShown) ? Array.from({ length: 30 }, (_, i) => {
      const a = cr(i) * Math.PI * 2, rad = 0.28 + cr(i + 91) * 0.72;
      const px = spot.x + Math.cos(a) * rad * 250, py = spot.y + Math.sin(a) * rad * 150;
      const disc = i % 4 === 0;
      const w = 5 + Math.round(cr(i + 53) * 5) + (disc ? 2 : 0);
      const h = disc ? w : Math.round(w * (1.5 + cr(i + 77) * 0.8));
      return {
        wrap: `position:absolute;left:0;top:0;transform:translate(${px.toFixed(1)}px,${py.toFixed(1)}px)`,
        inner: `display:block;width:${w}px;height:${h}px;border-radius:${disc ? '999px' : '1px'};background:${CONF[i % CONF.length]};--peak:${(0.34 + cr(i + 13) * 0.2).toFixed(2)};--dx:${((cr(i + 41) - 0.5) * 28).toFixed(0)}px;--dr:${((cr(i + 61) - 0.5) * 320).toFixed(0)}deg;opacity:0;animation:confettiPop ${(1.5 + cr(i + 37) * 1.0).toFixed(2)}s ease-in-out ${(cr(i + 29) * 0.5).toFixed(2)}s infinite`,
      };
    }) : [];

    // away-from-table nudge: purely derived, so it can never get out of step
    const away = !!(t && t.toAct === 0 && st.screen !== 'table' && st.seated);
    vals.turnPromptOn = away;
    vals.turnPromptBtn = `position:relative;pointer-events:auto;display:flex;align-items:center;gap:14px;padding:12px 22px 14px;border-radius:8px;background:linear-gradient(180deg,#3d2673,#39236a);color:${ON_FILL};overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,0.12),0 6px 22px rgba(0,0,0,0.438);animation:riseIn .3s ${EASE} both`;
    const aclock = t && t.clock ? t.clock.duration : 20000;
    vals.turnPromptSub = t ? `${t.currentBet > (t.seats[0] || {}).bet ? this.amt(t.currentBet - t.seats[0].bet) + ' to call' : 'Checked to you'} \u00b7 pot ${this.amt(t.potTotal || 0)}` : '';
    vals.turnPromptTrack = 'position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(232,236,248,0.25)';
    vals.turnPromptFill = `display:block;height:100%;background:#222c47;transform-origin:left center;animation:drain ${aclock}ms linear both`;

    const vdrag = st.drag === 'vol';
    const vpct = Math.round(st.volume * 100);
    vals.volPct = st.muted ? 'off' : vpct + '%';
    /* Monochrome. A terracotta speaker competed with the one action the screen
       is allowed, and volume is not an action — it is furniture. Ink on cream
       when live, outlined when muted, and the drag ring is a grey lift rather
       than an accent glow. */
    /* Inside the felt's own inner rule, not straddling its rounded corner. The
       hairline is inset 14px and the corner radius is 26, so a control tucked
       into the corner overlaps the curve; 26px in on both axes puts it on the
       inner edge where it reads as sitting on the table. */
    // Inset past the 16px corner radius so the discs sit on green, not on the
    // curve — 20px in from each edge clears it at both furniture scales.
    // On a phone's side the bottom corners belong to the action controls, so
    // the speaker goes to the top-left, under the status line.
    // Held upright the right corner is the sizing panel's, so it sits on the left.
    vals.volWrap = mini
      ? `position:absolute;left:10px;top:34px;z-index:46;display:flex;flex-direction:column-reverse;align-items:center;gap:8px`
      : tall ? `position:absolute;left:10px;bottom:10px;z-index:46;display:flex;flex-direction:column;align-items:center;gap:8px`
      : `position:absolute;right:20px;bottom:20px;z-index:46;display:flex;flex-direction:column;align-items:center;gap:8px`;
    vals.sndBtnStyle = `display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;touch-action:none;cursor:ns-resize;background:${st.muted ? 'rgba(232,236,248,0.1)' : INK};color:${st.muted ? 'rgba(232,236,248,0.086)' : BG};border:1px solid ${st.muted ? 'rgba(232,236,248,0.041)' : 'transparent'};box-shadow:${vdrag ? '0 0 0 5px rgba(232,236,248,0.198)' : 'none'};transition:background .2s ease,color .2s ease,box-shadow .2s ease`;
    // The speaker's ink runs x=2..19 in a 24 box when live, x=2..21 when muted;
    // either way it is left-weighted, so the box needs pulling right to look centred.
    vals.sndGlyphStyle = `display:block;transform:translateX(${st.muted ? 0.5 : 1.5}px)`;
    vals.sndMeterStyle = `position:relative;width:10px;height:78px;border-radius:999px;background:rgba(232,236,248,0.154);overflow:visible;opacity:${vdrag ? 1 : 0};transform:translateY(${vdrag ? 0 : 6}px);transition:opacity .18s ease,transform .18s ease;pointer-events:none`;
    vals.sndMeterFill = `position:absolute;left:0;right:0;bottom:0;height:${st.muted ? 0 : vpct}%;border-radius:999px;background:${ACC}`;
    vals.sndMeterMark = `position:absolute;right:16px;bottom:${st.muted ? 0 : vpct}%;transform:translateY(50%);font-size:10px;color:#94a3c4;white-space:nowrap`;
    vals.sndWave1 = `opacity:${!st.muted && st.volume > 0.02 ? 1 : 0}`;
    vals.sndWave2 = `opacity:${!st.muted && st.volume > 0.45 ? 1 : 0}`;
    vals.sndMute1 = `opacity:${st.muted ? 1 : 0}`;
    vals.sndMute2 = `opacity:${st.muted ? 1 : 0}`;

    /* Two states share this scrim, and the difference matters: a reconnect is
       waiting on the network and mends itself, an expired session never will.
       So the expired face drops the progress bar (there is no progress) and
       stops promising that the seat is "held" — it is, on-chain, but not
       reachable again until this wallet signs. */
    const connExpired = !!(t && t.connection === 'expired');
    const connDown = connExpired || !!(t && t.connection === 'reconnecting');
    vals.reconnectStyle = `position:absolute;inset:0;z-index:40;display:${connDown ? 'flex' : 'none'};align-items:center;justify-content:center;background:rgba(0,0,0,0.72);backdrop-filter:blur(3px)`;
    vals.reconnTitle = connExpired ? 'Session expired' : 'Reconnecting';
    vals.reconnNote = connExpired
      ? 'Your seat and stack are safe \u00b7 sign in again to take it back'
      : 'Your seat and stack are held on-chain \u00b7 nothing is lost';
    vals.reconnBtn = connExpired ? 'Sign in again' : 'Resume now';
    vals.reconnBarStyle = `position:relative;width:210px;height:5px;border-radius:999px;background:rgba(232,236,248,0.16);overflow:hidden;display:${connExpired ? 'none' : 'block'}`;
    vals.restore = connExpired
      ? () => { this.sfx('ui'); this.setState({ screen: 'connect', connectStep: 0 }, () => this.onResize()); }
      : () => { this.adapter.restoreConnection(); this.toast('Reconnected \u00b7 seat held', 'ok'); };

    /* ── action bar ───────────────────────────────────────────────── */
    const legal = t && t.toAct === 0 && this.adapter ? this.adapter.getLegal() : null;
    const myTurn = !!legal;
    const hero = seats[0] || { stack: 0, bet: 0 };
    const toCall = legal ? legal.toCall : 0;
    const minTo = legal ? legal.minRaiseTo : 0;
    const maxTo = legal ? legal.maxRaiseTo : 0;
    const betTo = clamp(st.betTo || minTo, minTo, maxTo);
    /* Split from its clamp: the row needs to know what a preset *wanted* to be,
       not only what it was allowed to be. See the strike on the preset pills. */
    const rawTo = (frac) => snapBet(t.currentBet + (potTotal + toCall) * frac, isTournamentTable);
    const sizeTo = (frac) => clamp(rawTo(frac), minTo, maxTo);

    /* A hairline above it, and nothing else. This was a filled, bordered,
       shadowed panel that lit up on your turn — three containers doing what one
       rule and an opacity change do, and against a system whose first layout
       rule is "hairlines, not panels". The row dims to .32 when it is not your
       turn, which is the design's own signal and needs no fill to carry it. */
    /* The bar itself never dims and never wraps on desktop: its height is the
       one thing the felt above is measured against, so it must not change with
       whose turn it is. What greys out of turn is the raise machinery alone —
       fold and call stay live because out of turn they *are* the pre-actions. */
    /* min-height on desktop: with nowrap the row's height is its tallest pill,
       which is constant — the floor just makes that a stated guarantee, so no
       label change (hotkey hints on or off, call amount growing) can move the
       felt above by a pixel. */
    /* On a phone's side there is no bar. The row would take a quarter of a
       390px-tall screen from a table that is already small, so its two halves
       lie over the felt's bottom corners instead — sizing on the left, the
       three decisions on the right, the hero's seat between them — where the
       canvas has nothing but the curve of the rail. The strip itself lets
       touches through; only the two clusters take them. The side padding
       honours the notch. */
    // No hand under way (see heroControls below): the plates are hidden, and
    // upright the empty tray goes with them, keeping only its height.
    const noHand = !t || t.phase === 'idle';
    vals.actionBar = mini
      ? 'position:absolute;left:0;right:0;bottom:0;z-index:45;box-sizing:border-box;display:flex;align-items:flex-end;'
        + 'padding:0 max(10px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));pointer-events:none'
      : `${tall ? 'position:relative;' : ''}width:100%;box-sizing:border-box;display:flex;flex-wrap:${c ? 'wrap' : 'nowrap'};`
      + `align-items:center;gap:${c ? 10 : 14}px;margin:${tall ? '6px 0 max(8px, env(safe-area-inset-bottom))' : `${c ? 8 : 10}px 0 14px`};`
      + `padding:${tall ? '8px' : c ? '12px 14px' : '14px 20px'};`
      + 'background:#0d1220;border:1px solid rgba(232,236,248,.09);border-radius:14px;'
      + 'box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 18px 40px -28px rgba(0,0,0,1);'
      + `${c ? '' : 'min-height:78px'}`
      + (tall && noHand ? ';background:transparent;border-color:transparent;box-shadow:none' : '');
    vals.turnDotStyle = `width:7px;height:7px;border-radius:999px;flex:0 0 auto;background:${myTurn ? TURN : 'rgba(232,236,248,0.5)'};${myTurn ? 'animation:suPulse 1.4s ease-in-out infinite' : ''}`;
    const spectating = !st.seated;

    /* A table needs two players who can act. Below that the felt simply sits
       there, and until now it said "dealing" while nothing dealt \u2014 which is
       indistinguishable from a crash, and is what the playtest reported as the
       table freezing after someone busted or left.

       Busting is the common way in: a stack of zero is sat out automatically,
       so heads-up it drops the table to one live seat. Saying so, and saying
       what would fix it, is the difference between waiting and being stuck. */
    const liveSeats = seats.filter((s) => !s.empty && !s.sittingOut && (s.stack || 0) > 0).length;
    const stalled = !!t && t.toAct == null && t.phase !== 'complete' && liveSeats < 2;
    /* Busted, not merely all-in. Going all-in zeroes the stack while the hand
       is still live and unresolved — you have not lost until it plays out. The
       gateway (and, offline, the local adapter) sits a seat out for a dead stack
       at the hand boundary, after settlement, so its `sittingOut` flag is the
       honest "busted" signal: a zero stack that is also sat out. A player who is
       all-in mid-hand has a zero stack but is not sat out, so the rebuy stays
       hidden until they actually lose. `allIn` is not checked — it is not
       cleared until the next deal, which for a frozen heads-up bust never comes,
       so keying on it would hide the rebuy in exactly the case it is for. */
    const heroBroke = !spectating && (hero.stack || 0) <= 0 && !!hero.sittingOut;

    /* ── Part 4 Task 4: tournament HUD + freezeout ─────────────────────
       A tournament table is any table id under the runtime's `priv-tt-`
       namespace (tournament-runtime.ts: `priv-tt-<id>-<n>` / `-ft`). The RAW
       id is `st.session.tableId` — the id `openTable` actually connected
       with — not `sess.id`: `tableById()` cannot resolve an id it does not
       recognise (a tournament table is never registered via
       `rememberPrivTable`) and silently falls back to an unrelated stake's
       id, which would never match the `priv-tt-` prefix.

       Freezeout: busting is elimination, not a stack to top back up — no
       rebuy, no sit-out, no leave, no top-up. Leaving the table SCREEN
       (navigating to another tab) only detaches the felt — nothing on that
       path calls `adapter.leave()` / `wallet.cashOut` (those live solely
       behind `leaveTable`, gated off below) or `closeTable()` (only the
       "seat dropped while not seated" error path calls that) — so the
       runtime still holds the seat and the session controller (Task 3)
       re-attaches on return via `enterTournamentTable`. */
    vals.isTournamentTable = isTournamentTable; // hoisted to the top of render (chips vs USD skin)
    /* The header account-menu renders a SECOND copy of sit-up / leave-table
       (gated by `menuSeated`); suppress it too on a freezeout table so neither
       appears (both handlers early-return anyway, but a visible dead control
       must not show). The "IN PLAY" balance row stays on plain `menuSeated`. */
    vals.menuSeatedCash = vals.menuSeated && !isTournamentTable;

    /* HUD data source: the SEATED poll's own detail (Ruling 1) — never
       `st.tournamentDetail` (the browsed detail screen's own key), which
       would show a different tournament's level/clock/pool if the player
       had browsed one while seated at another. */
    const tsd = isTournamentTable ? st.tSessionDetail : null;
    const tsdYou = (tsd && tsd.you) || null;
    const tLevelIdx = (tsd && typeof tsd.currentLevel === 'number') ? tsd.currentLevel : null;
    const tBlindsArr = (tsd && Array.isArray(tsd.blinds)) ? tsd.blinds : [];
    const tBlind = tLevelIdx != null ? tBlindsArr[tLevelIdx - 1] : null;

    vals.tHudLevel = tLevelIdx != null
      ? `level ${tLevelIdx}${tBlind ? ` · ${fmt(tBlind.sb)}/${fmt(tBlind.bb)}${tBlind.ante ? ` · ante ${fmt(tBlind.ante)}` : ''}` : ''}`
      : '';
    // Re-reads `levelStartedAt`/`levelMinutes` off the poll's OWN payload
    // every render (spec §7) rather than free-running a local timer, so a
    // level change or an outage re-anchor lands the instant the next poll
    // arrives. `st.now` (Task 3's 1s whole-flow ticker) is what makes it
    // visibly tick down between polls. The blind clock runs through a table
    // `pauseReason` (hand-for-hand/move/forming-final-table) — `escalate`
    // advances purely on wall-clock time — so this never special-cases it.
    vals.tHudClock = (() => {
      if (!tsd || tsd.levelStartedAt == null || tsd.levelMinutes == null) return '';
      const ms = tsd.levelStartedAt + tsd.levelMinutes * 60000 - st.now;
      return ms > 0 ? fmtCountdown(ms) : 'Leveling up…';
    })();
    vals.tHudRemaining = (tsd && typeof tsd.remaining === 'number')
      ? `${tsd.remaining} of ${tsd.entrants ?? 'N/A'} left`
      : '';
    // The bubble is the single spot before the money; otherwise, while short
    // of it, name where the money starts so the field size is oriented
    // against a payout the player can picture, not a bare place count.
    vals.tHudNextPay = (() => {
      if (!tsd || typeof tsd.remaining !== 'number' || !Array.isArray(tsd.payouts) || !tsd.payouts.length) return '';
      const paid = tsd.payouts.length;
      if (tsd.remaining <= paid) return 'In the money';
      if (tsd.remaining === paid + 1) return 'bubble';
      return `In the money at ${ord(paid)}`;
    })();
    vals.tHudPool = (tsd && tsd.prizePool != null) ? usd(Number(tsd.prizePool) / 1e6) : '';
    // Stack off the felt's own hero seat (seat 0 is always the hero's
    // perspective — see the card-dealing isHero convention below), not the
    // detail poll: the poll's `you` block carries seat/pause/finish state,
    // not a live stack. `bb` from the CURRENT level converts it to a
    // playable-shape number a poker player actually reads at a glance.
    // Omitted alongside rank once busted (stack <= 0) — same "about to be
    // torn down" moment, so a "0 chips" flash never shows in the gap before
    // the poll's `finishPlace` routes the screen away.
    vals.tHudStack = (() => {
      if (!t || !hero || (hero.stack || 0) <= 0) return '';
      const chips = hero.stack || 0;
      const bb = tBlind ? tBlind.bb : 0;
      // This HUD always showed both readings. In big-blind mode the left half is
      // already the blind count, so repeating it after the dot says nothing.
      if (st.amountUnit === 'bb') return this.amt(chips, bb);
      return `${fmt(chips)}${bb > 0 ? ` · ${(chips / bb).toFixed(1)} bb` : ''}`;
    })();
    // Rank is relative to the felt view this HUD can actually see — the
    // seats at the hero's OWN table, not the whole field (no per-table
    // breakdown of every other table's stacks is available client-side) —
    // so it is worded "at table", never implied to be the field placement.
    // Omitted (not "1st") when there is no felt yet or the hero has no
    // chips to rank (busted — the HUD is about to be torn down anyway).
    vals.tHudRank = (() => {
      if (!t || !hero || (hero.stack || 0) <= 0) return '';
      const heroChips = hero.stack || 0;
      const others = seats.filter((s, i) => i !== 0 && s && !s.empty && (s.stack || 0) > 0);
      const ahead = others.filter((s) => (s.stack || 0) > heroChips).length;
      return `${ord(1 + ahead)} at table`;
    })();
    // The clock never stops for a table pauseReason (spec §7) — this is a
    // status note, not a "clock held" claim, and never implies the player
    // is in trouble.
    vals.tHudPauseOn = !!(tsdYou && tsdYou.pauseReason);
    vals.tHudPauseLabel = (() => {
      const r = tsdYou && tsdYou.pauseReason;
      if (r === 'handForHand') return 'Hand-for-hand, on the bubble';
      if (r === 'move') return 'Tables rebalancing, you may move any hand';
      if (r === 'formingFinalTable') return 'Forming the final table';
      if (r === 'outage') return 'A brief pause, the clock keeps running';
      return r ? 'Table paused' : '';
    })();

    // A single stacked column pinned over the top of the felt (not a flex
    // sibling of the felt/rail row below, which splits row/column by `c` —
    // the HUD needs to span the full width regardless), so the bar and its
    // contextual pause strip lay out under one another with no guessed
    // pixel offset between them.
    vals.tHudWrapStyle = `position:absolute;left:0;right:0;top:0;z-index:50;display:flex;flex-direction:column;pointer-events:none`;
    vals.tHudBarStyle = `pointer-events:auto;display:flex;align-items:center;gap:10px;padding:${c ? '8px 14px' : '10px 22px'};background:linear-gradient(180deg, rgba(0,0,0,0.72), rgba(0,0,0,0.72));border-bottom:1px solid rgba(232,236,248,0.16);font-family:${UI};font-size:${c ? 11 : 12}px;color:${PAPER_COOL};flex-wrap:${c ? 'wrap' : 'nowrap'};row-gap:4px`;
    vals.tHudLevelStyle = `font-weight:600;color:${BRASS};letter-spacing:.01em;white-space:nowrap;flex:0 0 auto`;
    vals.tHudClockStyle = `font-variant-numeric:tabular-nums;color:${PAPER_INK};font-weight:500;white-space:nowrap;flex:0 0 auto`;
    vals.tHudDotStyle = `width:3px;height:3px;border-radius:50%;background:rgba(232,236,248,0.3);flex:0 0 auto`;
    vals.tHudMetaStyle = `color:${MUTED};white-space:nowrap;flex:0 0 auto`;
    vals.tHudSpacerStyle = `flex:1 1 auto;min-width:8px`;
    vals.tHudStackStyle = `color:${PAPER_COOL};font-weight:500;white-space:nowrap;flex:0 0 auto`;
    vals.tHudRankStyle = `display:${vals.tHudRank ? 'inline' : 'none'};color:${BRASS};font-size:${c ? 10 : 11}px;white-space:nowrap;flex:0 0 auto`;
    // The bubble/status note, not a clock-hold — brass-on-brass-tint so it
    // reads as "notable", not "wrong" (that register is reserved for RED).
    vals.tHudPauseStyle = `pointer-events:auto;display:${vals.tHudPauseOn ? 'block' : 'none'};padding:6px ${c ? '14px' : '22px'};text-align:center;font-size:${c ? 10.5 : 11}px;letter-spacing:.01em;color:${BRASS};background:rgba(139,92,246,0.14);border-bottom:1px solid rgba(139,92,246,0.24)`;

    /* One line now that the bar is one row. The stalled cases keep their
       detail because "waiting" without a reason reads as broken \u2014 everything
       else trusts the felt, which is already showing whose turn it is. */
    vals.turnTitle = !t ? 'Connecting\u2026'
      : stalled ? (heroBroke ? 'Out of chips, stand up to buy back in' : `Waiting \u00b7 ${liveSeats} of 2 to deal`)
      : spectating ? `Watching ${sess ? sess.name : ''}`
      : myTurn ? 'Your action'
      : t.phase === 'complete' ? 'Hand complete'
      : t.toAct != null ? `${(seats[t.toAct] || {}).name || ''} thinking` : 'Dealing';

    const secs = st.secsLeft;
    const ticking = t && t.clock && secs != null;
    vals.secsLabel = ticking ? secs + 's' : '';
    // On the dark felt now, so the resting pill is light rather than an ink tint.
    /* The pill has two backgrounds, so it cannot have one text colour. Violet
       reads on the resting grey (4.56:1) and vanishes on the urgent crimson
       (1.52:1) — which is the one moment the number matters. CLARET is too
       bright for white to clear the floor at 10.5px (3.67:1), so the urgent
       state goes dark-on-red: 5.29:1, and it still reads as an alarm. */
    vals.secsStyle = `display:${ticking ? 'inline-flex' : 'none'};align-items:center;padding:1px 7px;border-radius:999px;font-size:10.5px;font-weight:${secs <= 4 ? 700 : 500};font-variant-numeric:tabular-nums;background:${secs <= 4 ? CLARET : 'rgba(232,236,248,0.16)'};color:${secs <= 4 ? FELT_DEEP : '#b497f7'}`;

    // One line on desktop is the contract; under 900px the row is allowed to
    // wrap rather than run off the edge, because a phone-width window gets a
    // second row and a desktop gets a jitter-free felt.
    // Busted swaps the action buttons for the rebuy control, so the two never
    // share the row.
    // One standard gap between every control, so the row reads as evenly spaced
    // rather than tuned pill by pill.
    /* No hand under way — the table is idle, waiting for a second player or
       for the first deal — and there is nothing to fold, call or raise, so the
       three plates are not shown at all rather than shown dimmed. Between
       hands the phase is `complete`, not `idle`, so they stay through the
       pause before the next deal. Stood upright the bar's height is what the
       felt is fitted to, so there the row only goes invisible and keeps its
       room: a table that jumps when the cards come is worse than an empty
       strip under it. */
    vals.heroControls = mini
      ? `display:${spectating || heroBroke || noHand ? 'none' : 'flex'};flex:1;align-items:flex-end;justify-content:space-between;gap:10px;min-width:0`
      : `display:${spectating || heroBroke || (noHand && !tall) ? 'none' : 'flex'};${noHand && tall ? 'visibility:hidden;' : ''}flex:1;flex-wrap:${c ? 'wrap' : 'nowrap'};align-items:center;gap:${c ? 8 : 10}px;min-width:0`;
    /* The row's two halves. Everywhere but a phone's side they are
       `display:contents` — boxes that are not there, so the row lays out its
       ten controls exactly as it did before they existed. On a phone's side
       they are the two corner clusters: the decisions keep to the right, and
       the sizing, which only means anything on your turn, shows only then. */
    /* Held upright the bar is the three decisions and nothing else, each a
       third of its width — a thumb's target, not a pill sized to its label.
       The sizing leaves the bar altogether: it is a small panel standing on
       the bar's right end, over the felt's lower corner beside the hero, and
       only while there is a raise to size. Its slider runs up the panel's
       side; the amount it would raise to is on the raise button itself. */
    vals.decisionGroup = mini
      ? 'order:2;display:flex;align-items:flex-end;gap:6px;pointer-events:auto'
      : tall ? 'flex:1 0 100%;display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:8px'
      : 'display:contents';
    vals.sizingGroup = mini
      ? `order:1;display:flex;flex-wrap:wrap;align-items:center;gap:5px 4px;box-sizing:border-box;width:min(292px, 38vw);padding:6px 8px;border-radius:12px;background:rgba(10,13,22,0.78);border:1px solid rgba(232,236,248,.09);pointer-events:auto;visibility:${myTurn ? 'visible' : 'hidden'}`
      : tall ? 'position:absolute;right:0;bottom:calc(100% + 8px);z-index:47;box-sizing:border-box;display:grid;'
        + 'grid-template-columns:78px 30px;grid-template-rows:repeat(4, auto);gap:5px 6px;padding:7px;border-radius:12px;'
        + 'background:rgba(10,13,22,0.9);border:1px solid rgba(232,236,248,.14);box-shadow:0 14px 30px -12px rgba(0,0,0,.9);'
        + `visibility:${myTurn && legal && legal.canRaise ? 'visible' : 'hidden'}`
      : 'display:contents';
    // The slider takes the slack — it grows to eat the space that used to sit
    // empty on the right — but shrinks first when the row is tight, down to a
    // small floor, so a raise prompt can never push the presets off the screen.
    // Side margin on top of the row gap: the thumb sits centred on the track's
    // ends, so at min or max it would otherwise touch the neighbouring button.
    /* The scale under the slider: floor, current size, ceiling. Not drawn on a
       phone's side. The cluster has to stay under the corner seat's plate, and
       with a browser's bars showing that leaves about 75px; the row was the
       17 that did not fit. Nothing is lost with it — the raise button carries
       the size, and Min and All-in are the two ends. */
    vals.betScaleStyle = tall
      ? 'grid-column:1;grid-row:1;display:flex;align-items:center;justify-content:center;min-height:26px;border-radius:7px;background:rgba(232,236,248,0.08);overflow:hidden'
      : `display:${mini ? 'none' : 'flex'};align-items:center;justify-content:space-between;gap:6px;font-size:9.5px;letter-spacing:.14em;color:#94a3c4;font-variant-numeric:tabular-nums;overflow:hidden`;
    // The scale's two ends. In the upright panel the slider's own ends say it.
    vals.betEndStyle = tall ? 'display:none' : 'white-space:nowrap;flex:none';
    vals.betReadoutStyle = `color:#ffffff;white-space:nowrap;overflow:hidden;font-family:${SERIF};font-size:${tall ? 17 : 19}px;letter-spacing:0;line-height:1`;
    vals.betBlockStyle = `display:flex;flex-direction:column;gap:4px;${mini ? 'flex:1 0 100%;margin:0 6px' : `flex:1 1 auto;min-width:${c ? 90 : 96}px;margin:0 ${c ? 8 : 18}px`};opacity:${myTurn ? 1 : 0.32};pointer-events:${myTurn ? 'auto' : 'none'};transition:opacity 260ms linear`;
    if (tall) vals.betBlockStyle = 'display:contents';
    vals.specControls = `display:${spectating && t ? 'flex' : 'none'};flex:1;flex-wrap:wrap;align-items:center;gap:12px;justify-content:${c && !mini ? 'flex-start' : 'flex-end'}${mini ? ';pointer-events:auto' : ''}`;

    // The rail's own toggle disappears with it, so a floating tab reopens it.
    vals.railShowTab = `position:absolute;right:0;top:${tall ? '44%' : c && !mini ? '20%' : '50%'};transform:translateY(-50%);display:${!st.railOpen ? 'flex' : 'none'};flex-direction:column;align-items:center;gap:8px;padding:14px 7px;border:1px solid rgba(232,236,248,0.176);border-right:0;border-radius:12px 0 0 12px;background:rgba(139,92,246,0.7);z-index:30`;
    /* One pill, in two sizes. The action area had three separate button
       vocabularies in one row — a filled ink slab, a bordered pill at a
       different size, and a third set for bank/top-up/leave — which is what
       made it read as clutter rather than as a row of controls. Everything
       below now comes out of here: mono, .06em tracking, fully rounded, and
       only the colour says what a control is for.

       `lead` is the size for a decision, `minor` for everything that is not
       the decision — the sizing presets and the seat controls. */
    const actPill = (kind?, size?) => {
      const lead = size !== 'minor';
      // Sized for a bar that shares one row with everything else the seat
      // needs: a decision keeps its weight through colour, not through bulk.
      /* Plates, not pills. Each decision is a solid colour-coded block big
         enough to hit without reading, in the manner of the reference client:
         fold is crimson, check/call is steel, the aggressive action is the
         theme's violet, and the sizing presets stay small and quiet so they
         never compete with the three that matter. */
      const base = `font-family:${UI};font-weight:${lead ? 600 : 500};text-transform:uppercase;`
        + `font-size:${lead ? (tight ? 12 : 13) : (tight ? 9.5 : 10)}px;letter-spacing:${lead ? '.06em' : '.04em'};`
        + `border-radius:${lead ? 10 : 7}px;`
        + `padding:${lead ? (mini ? '12px 13px' : c ? '12px 16px' : '15px 22px') : (tight ? '7px 8px' : '9px 10px')};`
        + 'white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;'
        + 'transition:transform .12s ease,box-shadow .18s ease,filter .18s ease';
      /* One recipe for every plate: a lit top edge, a coloured rim, and a drop
         that seats it on the tray. */
      const plate = (top, bottom, rim, ink) =>
        `${base};background:linear-gradient(180deg,${top},${bottom});color:${ink};`
        + `border:1px solid ${rim};`
        + 'box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 8px 16px -10px rgba(0,0,0,.95),0 1px 0 rgba(0,0,0,.4)';
      // A pill is a milled plate: a hairline, a lit top edge, and a shadow that
      // seats it on the felt. Hover/press are the .pill rules in the helmet.
      const raised = 'background:linear-gradient(180deg,rgba(148,163,196,0.055),rgba(0,0,0,0.125));box-shadow:inset 0 1px 0 rgba(255,255,255,0.1),0 1px 2px rgba(0,0,0,0.325)';
      // The action row sits on the felt, so its ink is light. The one filled
      // action per view — the raise, and the rebuy — takes paper; everything
      // else is an outline. Brass is reserved for a live pre-action, never a fill.
      const filled = `background:linear-gradient(180deg,#3d2673,#6d3fd4);color:${ON_FILL};border:1px solid rgba(255,255,255,0.15);font-weight:500;box-shadow:inset 0 1px 0 rgba(255,255,255,0.27),0 0 26px -9px rgba(232,236,248,0.096),0 2px 4px rgba(0,0,0,0.375)`;
      // The one aggressive action, and the loudest thing in the bar.
      if (kind === 'primary' || kind === 'ink') {
        // Starts at #8b5cf6, not #a78bfa: a stop lighter put the white label at
        // 4.12:1 on the most-pressed control in the app. This is the same
        // gradient every other filled action uses.
        return plate('#8b5cf6', '#6d3fd4', 'rgba(167,139,250,.75)', '#ffffff')
          + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 0 28px -8px rgba(139,92,246,.9),0 8px 16px -10px rgba(0,0,0,.95)';
      }
      // Crimson, and the only crimson in the bar: giving up the hand should
      // never be reachable by muscle memory aimed at something else.
      if (kind === 'fold') return plate('#8e2238', '#5c1223', 'rgba(244,63,94,.5)', '#ffdfe6');
      // A pre-action that is armed: lit from within, so "this will fire on my
      // turn" reads differently from "this is what I am about to press".
      if (kind === 'on') {
        return plate('rgba(139,92,246,.35)', 'rgba(109,63,212,.18)', 'rgba(167,139,250,.85)', '#e8ecf8')
          + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 0 20px -6px rgba(139,92,246,.95)';
      }
      if (kind === 'off') return plate('rgba(255,255,255,.03)', 'rgba(0,0,0,.2)', 'rgba(232,236,248,.1)', 'rgba(232,236,248,.3)');
      // Steel for check/call — a decision, so it is a plate, but never the
      // colour of the one that costs money. The sizing presets share it at
      // minor size, where the smaller type and radius keep them subordinate.
      return plate('#303f6b', '#1c2745', 'rgba(148,163,196,.4)', '#e8ecf8');
    };
    this._pill = actPill;

    /* ── rebuy (busted only) ──────────────────────────────────────────
       Busting raises a funding modal over the felt — the deposit card's paper
       and the take-a-seat slider, so buying back in is visibly the same act as
       sitting down. Choose an amount between the table minimum and whichever is
       lower of the table max and the bankroll, buy in, and sit back down; the
       server's sit-in resumes the table, which is what was frozen. Dismissing
       trades the modal for a "buy back in" pill in the action row, so a busted
       player can still watch without a half-built form in the bar. */
    // The RAW seated id (`st.session.tableId`), not `sess.tableId`: `sess` is
    // already a tableById() RESULT — a stake object whose id field is `id`, so
    // `sess.tableId` is forever undefined and this fell through to
    // `pendingTable`. `pendingTable` is only written by `sitAt`, and starts life
    // at the 'nl200-01' default, so anyone who reached the felt without going
    // through the lobby this session — a refresh on /table/<id>, a shared link,
    // a resumed seat — had their rebuy priced against $1/$2: a busted nl10
    // player holding $5 was told they needed $40 and shown "add funds" at a
    // table where $2 buys back in.
    const rbTbl = tableById((st.session && st.session.tableId) || st.pendingTable);
    const rbBankroll = st.balance || 0;
    const rbCeil = Math.min(rbBankroll, rbTbl.max);
    const rbCanAfford = rbCeil >= rbTbl.min;
    const rbDraft = st.rebuyDraft != null ? st.rebuyDraft : (rbCanAfford ? fmt(rbCeil) : '');
    const rbAmount = snapMoney(Number(rbDraft) || 0);
    const rbValid = rbCanAfford && rbAmount >= rbTbl.min && rbAmount <= rbCeil;
    // Part 4 Task 4: freezeout — a tournament stack is server-side and
    // busting is elimination (the session controller routes to results the
    // instant the poll sees it), so the cash rebuy path is never offered
    // here. Gating it at the source keeps `rebuyModalOn`/`rebuyBarStyle`
    // (both derived from `rbBusted` below) from ever flashing it in the gap
    // between the felt showing a zero stack and the ~2s poll noticing.
    const rbBusted = !spectating && heroBroke && !isTournamentTable;
    const rbPct = buyPct(rbAmount, rbTbl.min, rbCeil);

    // `rebuyPending` optimistically folds the modal the instant rebuy is clicked;
    // once the bust resolves (heroBroke clears after sit-in acks) drop it — and
    // any stale dismiss — so a later bust raises the modal fresh. Guarded so it
    // settles once rather than looping.
    if (!heroBroke && (st.rebuyPending || st.rebuyDismissed)) {
      queueMicrotask(() => { if (this.state.rebuyPending || this.state.rebuyDismissed) this.setState({ rebuyPending: false, rebuyDismissed: false }); });
    }
    vals.rebuyModalOn = rbBusted && !st.rebuyDismissed && !st.rebuyPending;
    vals.rebuyBackdrop = `position:absolute;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,0.72)`;
    vals.rebuyStop = (e) => e.stopPropagation();
    vals.rebuyBankrollLabel = fmt(rbBankroll);
    vals.rebuyCanAfford = rbCanAfford;
    vals.rebuyCantAfford = !rbCanAfford;
    vals.rebuyAmountLabel = rbAmount > 0 ? fmt(rbAmount) : 'N/A';
    vals.rebuyBbLabel = rbTbl.bb > 0 ? `${Math.round(rbAmount / rbTbl.bb)} big blinds` : '';
    vals.rebuyMinLabel = fmt(rbTbl.min);
    vals.rebuyMaxLabel = fmt(rbCeil);
    vals.rebuyTrackStyle = `position:relative;height:34px;display:flex;align-items:center;touch-action:none;cursor:${rbCeil > rbTbl.min ? 'ew-resize' : 'default'};opacity:${rbCeil > rbTbl.min ? 1 : .4}`;
    vals.rebuyFill = `position:absolute;left:0;height:2px;width:${rbPct}%;background:${CTA}`;
    vals.rebuyThumb = `position:absolute;top:50%;left:${rbPct}%;transform:translate(-50%,-50%);width:20px;height:20px;border-radius:50%;background:${CTA};box-shadow:0 2px 8px rgba(10,13,22,0.3)`;
    vals.rebuyDown = (e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); this.setState({ dragRebuy: true }); this.rebuyFrom(e, rbTbl.min, rbCeil); };
    vals.rebuyMove = (e) => { if (st.dragRebuy) this.rebuyFrom(e, rbTbl.min, rbCeil); };
    vals.rebuyUp = () => this.setState({ dragRebuy: false });
    vals.rebuyBtnLabel = `Rebuy ${fmt(rbAmount)}`;
    vals.rebuyBtnStyle = `display:block;width:100%;padding:14px;border-radius:999px;background:${CTA};color:${CTA_INK};font-size:14px;font-weight:500;text-align:center;opacity:${rbValid ? 1 : .4};pointer-events:${rbValid ? 'auto' : 'none'}`;
    vals.rebuyNeedLabel = `You need ${fmt(rbTbl.min)} USDC to sit, top up your bankroll first`;
    vals.rebuyDepositStyle = `display:block;width:100%;padding:14px;border-radius:999px;background:${CTA};color:${CTA_INK};font-size:14px;font-weight:500;text-align:center`;
    vals.rebuyDeposit = () => this.go('profile')();
    vals.rebuyDismiss = () => this.setState({ rebuyDismissed: true });
    // The pill the dismissed modal leaves behind, in the action row.
    vals.rebuyBarStyle = `display:${rbBusted && st.rebuyDismissed ? 'flex' : 'none'};flex:1;align-items:center;gap:12px;min-width:0${mini ? ';pointer-events:auto' : ''}`;
    vals.rebuyReopen = () => this.setState({ rebuyDismissed: false });
    vals.rebuyPillLabel = rbCanAfford ? `Buy back in · ${fmt(rbBankroll)} USDC` : 'Add funds to play on';
    vals.doRebuy = () => {
      if (!this.adapter) return;
      if (!rbCanAfford) { this.go('profile')(); return; }   // bankroll too low → deposit
      if (!rbValid) return;
      // Re-entry guard. The button stays on screen for the moment between the
      // click and the server confirming the top-up — the stack is still zero
      // locally — so a second click fires another top-up, which the seat now
      // rejects as "would exceed max buy-in". One rebuy per bust: the lock
      // clears when the next hand deals, or after a couple of seconds if the
      // top-up never lands.
      if (this._rebuyLock && Date.now() - this._rebuyLock < 3000) return;
      this._rebuyLock = Date.now();
      this.adapter.topUp(rbAmount);
      // The sit-in has to reach the gateway AFTER the chips do (see rebuyStep),
      // so on a real table it is sent from there, off the frame that shows
      // them. The offline table applies a top-up on the spot and sits in now.
      if (this.adapter.kind === 'remote') {
        this._rebuy = { at: Date.now(), hand: (this.state.table && this.state.table.handNo) || 0, satAt: 0, resynced: false, cycled: false };
        this.later(this.rebuyFollowUp, 1000);
      } else {
        this.adapter.sitIn();
      }
      // Fold the modal on this click (rebuyPending), don't wait on the round-trip.
      this.setState({ sittingOut: false, rebuyDraft: null, rebuyDismissed: false, rebuyPending: true });
      this.sfx('seat');
      this.toast(`rebought ${fmt(rbAmount)} USDC, dealt in the next hand`, 'ok');
      // Backstop: if the sit-in never acks (a dropped socket), un-hide the modal
      // so the player can try again rather than staring at a chipless felt.
      setTimeout(() => { if (this.state.rebuyPending) this.setState({ rebuyPending: false }); }, 4000);
    };

    /* One terracotta action per screen: the raise. Fold takes clay because the
       palette reserves it for destructive, and check/call is a plain outline —
       it was a filled ink slab, which put two solid buttons in competition when
       only one of them is the aggressive move. */
    /* Out of turn the same three buttons carry the pre-actions, so the row
       never changes shape. Fold arms check/fold, call arms call any, and the
       armed one takes the quiet `on` treatment — while the raise, which has
       no out-of-turn meaning, greys out and ignores the pointer. */
    /* `myTurn` is `!!legal`, and the adapter nulls `legal` the instant you act
       so the bar cannot double-fire while the server decides. That left a
       window — your action sent, the table still saying it is your turn — in
       which these three buttons quietly became the PRE-action bar in the same
       place, at the same size. The second click of an ordinary double-click on
       check landed in it and armed "call any", which then survives every
       street and fires 260ms into your next turn. Check is the action most
       likely to be double-clicked, because the first click costs nothing.

       `toAct` is the table's own answer and does not move until the server
       says so, which is the question this was always asking. */
    /* Folded, the hand is over for you: no pre-action means anything, so the
       whole row greys out and ignores the pointer until the next deal. */
    const heroFolded = !!(t && t.phase !== 'complete' && hero.folded);
    const preMode = !spectating && t && !myTurn && t.toAct !== 0 && t.phase !== 'complete' && !stalled && !heroFolded;
    const deadBtn = heroFolded ? ';opacity:.32;pointer-events:none;transition:opacity 260ms linear' : '';
    vals.foldStyle = (preMode ? actPill(st.preAction === 'checkfold' ? 'on' : '') : actPill('fold')) + deadBtn;
    vals.callStyle = (preMode ? actPill(st.preAction === 'callany' ? 'on' : '') : actPill()) + deadBtn;
    // A lit dot on the armed pre-action, so a queued click reads at a glance
    // rather than only through the plate's quieter `on` tint.
    const preDot = (armed) => `display:${preMode && armed ? 'inline-block' : 'none'};width:7px;height:7px;border-radius:50%;`
      + 'margin-right:7px;flex:none;background:#4ade80;box-shadow:0 0 0 2px rgba(74,222,128,.22),0 0 8px rgba(74,222,128,.85);'
      + 'animation:suPulse 1.6s ease-in-out infinite';
    vals.foldDotStyle = preDot(st.preAction === 'checkfold');
    vals.callDotStyle = preDot(st.preAction === 'callany');
    /* The raise button reserves the width of the WIDEST label it can show this
       hand, and never resizes while you drag.

       Its text carries the amount, so every step of a slider drag rewrote it —
       and because the bet block beside it is `flex:1 1 auto`, the slider
       absorbed the difference. The track got narrower as the number got wider,
       which jittered the whole row AND fed back into the value: `sliderFrom`
       divides by the track's live width, so the same cursor position mapped to
       a different fraction one frame later.

       The widest label is knowable — the amount is bounded by `maxTo`, and at
       the top of the range the label becomes the all-in one — so it is
       measured once per hand rather than guessed at in `ch`, which would
       over-reserve badly in a proportional face. Tabular figures then keep
       equal-length numbers from wobbling inside the reserved box. */
    const raisePad = mini ? 13 : c ? 15 : 18;
    const raiseFont = `500 ${tight ? 12 : 13}px ${UI}`;
    /* The widest label is NOT the one at `maxTo`. `fmt` drops the cents on a
       round figure, so "raise to 200" is narrower than "raise to 128.40" — a
       value in the middle of the range renders wider than the top of it.
       Sample the ends and the widest shape in between (the most integer digits
       WITH cents) and take the longest of them, through `amt` so the big-blind
       unit is measured in whatever unit is actually on screen. */
    const raiseCandidates = [];
    if (legal) {
      const verb = legal.isRaise ? 'Raise to' : 'Bet';
      const widestCents = Math.max(minTo, Math.min(maxTo, Math.floor(maxTo) - 0.01));
      for (const n of [minTo, maxTo, widestCents]) raiseCandidates.push(`${verb} ${this.amt(n)}`);
      raiseCandidates.push(`all-in ${this.amt(legal.stack)}`);
    } else {
      raiseCandidates.push('bet');
    }
    const widestRaise = raiseCandidates
      .reduce((a, b) => (this.textWidth(b, raiseFont) > this.textWidth(a, raiseFont) ? b : a));
    // + the hotkey glyph and its separator, which sit inside the same button.
    /* Hold the reservation between turns as well as during them.
       Off-turn there is no `legal`, so the widest label collapses to the bare
       "bet" fallback — and the button would snap narrow the moment your turn
       ended and wide again when it came back, moving the whole row twice a
       hand. The last width computed at this table is kept and reused while the
       seat is idle, so the bar holds its place for the whole session. Keyed on
       the table, so sitting down somewhere else measures afresh. */
    const raiseWNow = Math.ceil(this.textWidth(widestRaise, raiseFont) + this.textWidth(' \u00b7 r', raiseFont)) + raisePad * 2 + 2;
    const raiseWKey = (t && t.id) || '';
    if (legal) this._raiseW = { key: raiseWKey, px: raiseWNow };
    const raiseW = (!legal && this._raiseW && this._raiseW.key === raiseWKey)
      ? this._raiseW.px
      : raiseWNow;
    vals.raiseStyle = `${actPill('ink')};display:inline-flex;align-items:center;justify-content:center;`
      + `min-width:${raiseW}px;font-variant-numeric:tabular-nums;`
      + `opacity:${myTurn ? 1 : 0.32};pointer-events:${myTurn ? 'auto' : 'none'};transition:opacity 260ms linear`
      + (tall ? ';min-width:0' : '');
    /* Money on the buttons carries its unit, once. The slider's own readout
       below says MIN / BB / MAX without repeating it. */
    // No "usdc" on the action buttons: the felt and the slider readout carry
    // the unit, and the words were what pushed this row off the screen at a
    // raise prompt on a narrow window.
    vals.callLabel = preMode ? 'Call any' : legal ? (legal.canCheck ? 'Check' : `Call ${this.amt(toCall)}`) : 'Check';
    /* Two units sat side by side on this row. `call` shows what leaves your
       stack; `betTo` is a raise-TO total — the chips already out in front this
       street plus the chips you push. With a blind or a call in front, that total
       legitimately reads higher than the stack on your plate, which is what got
       reported as a minimum raise bigger than the stack: short big blind, 1 of 12
       posted, plate reads 11 and the button opened the turn at "all-in 12". The
       amounts were right — neither label said which of the two things it was.
       So name the raise a total, and price the shove at what actually leaves the
       stack, which is the number the plate is already showing. `this.amt` is the
       plate's own formatter, so the two agree in big blinds as well as in usdg.

       Hiding or striking the button is the one thing that would be wrong here:
       over a bet you cannot cover, the shove is still legal, and it is the only
       aggressive line left. */
    vals.raiseLabel = legal
      ? (betTo >= maxTo ? `all-in ${this.amt(legal.stack)}` : `${legal.isRaise ? 'Raise to' : 'Bet'} ${this.amt(betTo)}`)
      : 'Bet';
    /* Split so the hotkey can be underlined inside the word. When the label
       does not begin with its key the letter is shown on its own instead —
       underlining the b of "bet" would name a key that does nothing. */
    /* With hotkeys off the underline goes too: an underlined letter is the
       promise that pressing it does something, and a UI that keeps advertising
       keys it has been told to ignore is lying in a small way. Pre-actions are
       clicks, not keys, so the underline goes there too. */
    const hint = st.hotkeys && !preMode;
    const key = (label, k) => (label.charAt(0).toLowerCase() === k
      ? { rest: hint ? label.slice(1) : label, style: hint ? 'text-decoration:underline;text-underline-offset:3px' : 'display:none' }
      : { rest: hint ? ` · ${label}` : label, style: hint ? 'text-decoration:underline;text-underline-offset:3px;opacity:.55' : 'display:none' });
    const ck = key(vals.callLabel, 'c');
    const rk = key(vals.raiseLabel, 'r');
    vals.callRest = ck.rest; vals.callKeyStyle = ck.style;
    vals.raiseRest = rk.rest; vals.raiseKeyStyle = rk.style;
    vals.foldKey = preMode ? '' : 'F';
    vals.foldKeyStyle = hint ? 'text-decoration:underline;text-underline-offset:3px' : '';
    vals.foldRest = preMode ? 'Check / fold' : 'old';

    /* Same furniture language as the volume disc it now sits under: ink when
       live, outlined when off, and the strike says off without a word. Hidden
       for spectators outright — no actions, no keys. */
    vals.hotkeysTitle = st.hotkeys
      ? 'Action hotkeys are on · f / c / r / a · click to turn off'
      : 'Action hotkeys are off · click to turn on';
    vals.hotkeysStyle = `display:${spectating || mini || tall ? 'none' : 'flex'};align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;flex:0 0 auto;background:${st.hotkeys ? INK : 'rgba(232,236,248,0.1)'};color:${st.hotkeys ? BG : 'rgba(232,236,248,0.086)'};border:1px solid ${st.hotkeys ? 'transparent' : 'rgba(232,236,248,0.041)'};transition:background .2s ease,color .2s ease`;
    vals.hotkeysStrike = `opacity:${st.hotkeys ? 0 : 1};transition:opacity .2s ease`;
    vals.toggleHotkeys = () => {
      const next = !st.hotkeys;
      this.setState({ hotkeys: next });
      try { localStorage.setItem('suited:hotkeys', next ? 'on' : 'off'); } catch {}
      this.toast(next ? 'Action hotkeys on · f / c / r / a' : 'Action hotkeys off', 'ok');
    };
    vals.doFold = () => {
      if (preMode) { this.sfx('ui'); this.setState((s) => ({ preAction: s.preAction === 'checkfold' ? null : 'checkfold' })); return; }
      this.act('fold');
    };
    vals.doCheckCall = () => {
      if (preMode) { this.sfx('ui'); this.setState((s) => ({ preAction: s.preAction === 'callany' ? null : 'callany' })); return; }
      this.act(legal && legal.canCheck ? 'check' : 'call');
    };
    vals.doRaise = () => {
      // Facing a bet your whole stack cannot exceed, there is no legal raise —
      // going all-in is a call, and the engine caps a call at your stack, so it
      // puts you all-in for less. Firing the raise anyway was the "illegal
      // action" a short stack hit when trying to shove over a bigger all-in.
      if (legal && !legal.canRaise) return this.act(legal.canCheck ? 'check' : 'call');
      this.act('raise', betTo);
    };
    vals.betDown = this.betDown; vals.betMove = this.betMove; vals.betUp = this.betUp;
    const bp = maxTo > minTo ? ((betTo - minTo) / (maxTo - minTo)) * 100 : 0;
    /* While dragging, the thumb must track the cursor 1:1 — a position
       transition animates every pointermove step over 80ms, so the thumb
       visibly trails the mouse. Keep the ease only for the discrete jumps the
       preset buttons make.

       `0s`, NOT `none`. These are interpolated into a per-property shorthand
       (`transition:left ${betEase}`), and `transition:left none` is not valid
       CSS — `none` is only legal as the whole value. The browser rejected the
       declaration outright, kept the last valid one, and the 80ms ease stayed
       on for the entire drag: the exact trailing this line exists to remove.
       It never once turned the ease off since it was written. */
    const betEase = st.drag === 'bet' ? '0s' : '.08s linear';
    // Monochrome slider, matching the raise button — ink track and thumb.
    vals.betFaderStyle = tall
      ? 'grid-column:2;grid-row:1 / -1;position:relative;touch-action:none;cursor:ns-resize;margin:9px 0'
      : 'position:relative;height:18px;display:flex;align-items:center;touch-action:none;cursor:ew-resize';
    vals.betTrackStyle = tall
      ? 'position:absolute;top:0;bottom:0;left:50%;width:6px;margin-left:-3px;border-radius:3px;background:rgba(232,236,248,.16)'
      : 'position:absolute;left:0;right:0;height:6px;border-radius:3px;background:rgba(0,0,0,.45)';
    vals.betFill = tall
      ? `position:absolute;bottom:0;left:50%;width:6px;margin-left:-3px;border-radius:3px;height:${bp}%;background:linear-gradient(0deg,#6d3fd4,#a78bfa);box-shadow:0 0 14px -2px rgba(139,92,246,.85);transition:height ${betEase}`
      : `position:absolute;left:0;height:6px;border-radius:3px;width:${bp}%;background:linear-gradient(90deg,#6d3fd4,#a78bfa);box-shadow:0 0 14px -2px rgba(139,92,246,.85);transition:width ${betEase}`;
    vals.betThumb = tall
      ? `position:absolute;left:50%;bottom:${bp}%;transform:translate(-50%,50%);width:20px;height:20px;border-radius:50%;background:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,.5);pointer-events:none;transition:bottom ${betEase}`
      : `position:absolute;top:50%;left:${bp}%;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:#ffffff;box-shadow:0 0 14px -3px rgba(232,236,248,0.096);pointer-events:none;transition:left ${betEase}`;
    /* The scale under the track. `betTo` is an amount; big blinds is how a
       player actually thinks about a raise, so the middle figure converts. */
    vals.betMinLabel = `MIN ${this.amt(minTo)}`;
    vals.betMaxLabel = `MAX ${this.amt(maxTo)}`;
    /* The scale's middle figure is deliberately the OTHER unit from the ends:
       the slider is where a size is chosen, and both readings of it are worth
       having at once. In dollars that is the size in blinds (as it always was);
       in blinds it is the money, which is the figure actually leaving the stack.
       `bb` arrives already converted to display units by the adapter — dividing
       by 1e6 again turned 2 big blinds into 2,000,000 of them. */
    vals.betBBLabel = st.amountUnit === 'bb'
      ? fmt(betTo)
      : (t && t.bb ? `${(betTo / t.bb).toFixed(betTo / t.bb < 10 ? 1 : 0)} BB` : '');
    // The sizing presets grey with the slider they drive.
    const outOfTurnDim = `opacity:${myTurn ? 1 : 0.32};pointer-events:${myTurn ? 'auto' : 'none'};transition:opacity 260ms linear`;
    // Narrow pills with the label stacked, so all six fit a minimised tab
    // instead of overflowing the row.
    const sizeBase = `${actPill('', 'minor')};display:flex;flex-direction:column;align-items:center;`
      // On a phone's side the six share their cluster's one row equally, so
      // they can never wrap into a second and cover the seat above.
      + `justify-content:center;line-height:1.05;gap:1px;${mini ? 'min-width:0;flex:1 1 0;padding:7px 2px' : tall ? 'min-width:0;padding:7px 4px;flex-direction:row;gap:4px;grid-column:1' : `min-width:${tight ? 34 : 42}px;flex:0 0 auto`};`
      + `${outOfTurnDim}`;
    /* A preset whose sizing is past your stack is not that sizing: the clamp
       turns it into the shove, and the row gave no sign that several buttons now
       did the one thing — short against a big pot, all four fractions collapse
       onto the all-in pill beside them. The collapsed ones are struck through
       and taken out of the pointer's way, so the shove is offered once.
       The slot loop below applies it, which is what extends it to the preflop
       opens: a 4bb open past a short stack is the same button telling the same
       lie. Trailing declarations win in an inline style, so this overrides the
       opacity and pointer-events `outOfTurnDim` already set.
       Struck means past `maxTo` only — never a sizing the band capped *up* onto
       the minimum, which is the honest answer and stays live. So `min` never
       strikes (`minTo` is itself clamped to `maxTo`), nor does all-in, which
       *is* `maxTo`, nor ⅓ pot into a pot too small to raise a third of. */
    const struck = `;text-decoration:line-through;opacity:${myTurn ? 0.42 : 0.32};pointer-events:none`;
    /* The upright panel holds three of the six, top to bottom from the most
       to the least: all-in, the last slot (full pot, or the biggest open), and
       min. Everything between them is what the slider beside them is for —
       and a fourth button would stand the panel on the seat above it. */
    const panelRow = (n) => (tall ? `;grid-row:${n}` : '');
    const panelSkip = tall ? ';display:none' : '';
    vals.sizeStyle = sizeBase + panelRow(4);
    /* All-in is the one preset that is really a decision, so it wears a
       crimson a step darker than fold rather than the steel of the sizings
       it sits beside. Built from the same base so it keeps their geometry. */
    vals.sizeAllInStyle = sizeBase.replace(/background:linear-gradient\([^)]*\)/, 'background:linear-gradient(180deg,#6d1829,#430e1b)')
      .replace(/border:1px solid rgba\(148,163,196,\.4\)/, 'border:1px solid rgba(244,63,94,.42)') + panelRow(2);
    vals.sizeSubStyle = `font-size:${tight ? 8 : 8.5}px;letter-spacing:.04em;color:${MUTED}`;

    vals.sizeMin = () => legal && this.setState({ betTo: minTo });
    vals.sizeAllIn = () => legal && this.setState({ betTo: maxTo });

    /* The four middle presets, by street.

       Postflop a bet is a fraction of the pot — that is how the street is
       thought about while it is played and how it is talked about afterwards.
       Preflop there is no pot to take a fraction of. The blinds are not a pot,
       and nobody has ever opened for ⅓ of one: heads-up, ⅓ and ½ both fall
       under the minimum raise and clamp straight back onto the `min` button
       beside them, and what the other two land on is a coincidence of the
       blinds rather than a size anyone chose. An open is a multiple of the
       big blind, so preflop the slots carry the opens.

       Into an unopened pot `min` is itself the fourth open, which is why there
       is no '2bb' pill: the minimum raise IS the 2bb open there (minRaise is
       seeded to the big blind and currentBet is the big blind, so minRaiseTo is
       exactly 2bb), so the row already reads 2 / 2.5 / 3 / 4 / 5 and a literal
       2bb button would duplicate the one beside it.

       Facing a raise the multiple is of the RAISE, not of the blind. This is
       the standard split every client configures — preflop in big blinds,
       postflop in % of pot, and a separate multiplier for re-raises — and it
       is how a 3-bet is actually quoted: 2.5x the open is the floor, 3x the
       norm in position, 3.5-4x out of it. Sized off the blind instead, every
       preset was below the minimum raise over any real open and clamped onto
       the `min` button beside them: four pills, one action.

       One expression covers both, because into an unopened pot the bet IS the
       big blind. What changes is only the ladder: opens run 2.5 / 3 / 4 / 5,
       re-raises 2.5 / 3 / 3.5 / 4, the band 3-bets are quoted in.

       The pill reads in big blinds either way — the number the raise lands on,
       not the multiplier that got there — so the unit never changes under you
       and a 3-bet over a 3bb open reads 7.5, the way it would be said out
       loud. All of them are raise-TO amounts and all clamp to the legal band,
       and the slider shows the number before it is committed. */
    const preflopSizing = !!t && t.street === 'preflop';
    // Whatever is out there to be raised — the blind, until someone raises it.
    const preBase = preflopSizing ? Math.max(t.currentBet || 0, t.bb || 0) : 0;
    const opened = preflopSizing && (t.currentBet || 0) > (t.bb || 0);
    const rawBb = (n) => snapBet(preBase * n, isTournamentTable);
    const sizeBb = (n) => clamp(rawBb(n), minTo, maxTo);
    // Big blinds, one decimal, no trailing zero — `9`, `7.5`, `22.5`.
    // Not `inBb`: that name is taken by the unit toggle earlier in this same
    // function, and a second `const` of it is a SyntaxError, not a shadow.
    const bbLabel = (v) => String(Math.round((t && t.bb ? v / t.bb : 0) * 10) / 10);
    /* Each slot carries its sizing twice: `to`, the legal amount the click sets,
       and `raw`, the same sizing before the band clamped it — the only way to
       tell a preset that was capped up onto the minimum from one that is past
       your stack. Both are thunks: these are built on every render, including
       before there is a table to size against. */
    const bbOpen = (n) => ({ label: bbLabel(rawBb(n)), sub: 'bb', to: () => sizeBb(n), raw: () => rawBb(n) });
    const potFrac = (label, f) => ({ label, sub: 'Pot', to: () => sizeTo(f), raw: () => rawTo(f) });
    const presets = preflopSizing
      ? (opened
          ? [bbOpen(2.5), bbOpen(3), bbOpen(3.5), bbOpen(4)]
          : [bbOpen(2.5), bbOpen(3), bbOpen(4), bbOpen(5)])
      : [potFrac('\u2153', 1 / 3), potFrac('\u00bd', 0.5), potFrac('\u00be', 0.75), potFrac('full', 1)];
    // Both streets fill all four slots, so every binding is always written —
    // an undefined one renders as empty and warns. Give a street fewer than
    // four presets and the empty slots need hiding again (a `display:none`
    // style), rather than being left to render as blank pills.
    ['A', 'B', 'C', 'D'].forEach((slot, i) => {
      const p = presets[i];
      vals['size' + slot + 'Label'] = p.label;
      vals['size' + slot + 'Sub'] = p.sub;
      // `legal &&` guards `raw()`: out of turn there is no band to be past.
      vals['size' + slot + 'Style'] = sizeBase + (legal && p.raw() > maxTo ? struck : '')
        + (slot === 'D' ? panelRow(3) : panelSkip);
      vals['size' + slot] = () => { if (legal) this.setState({ betTo: p.to() }); };
    });
    /* The standing top-up button is gone; busting still has a way back in.
       The server keeps accepting `topup` (the plumbing is tested and queued to
       the hand boundary), and a busted player is stood up with a 90-second
       grace built for exactly this — stand, buy back in, sit. One path instead
       of a button that sat in everyone's row for a case most hands never hit. */

    // Rail-header size, and hidden entirely for spectators — you cannot
    // stand from a seat you do not hold. Part 4 Task 4: also hidden on a
    // tournament table — freezeout has no voluntary sit-out.
    vals.sitUpStyle = `font-family:${UI};font-size:11px;letter-spacing:.02em;border-radius:999px;padding:5px 12px;white-space:nowrap;background:transparent;display:${t && !spectating && !isTournamentTable ? 'inline-flex' : 'none'};transition:background .18s ease,border-color .18s ease,color .18s ease;${st.sittingOut ? `color:${BRASS};border:1px solid rgba(139,92,246,0.5)` : `color:${PAPER_COOL};border:1px solid rgba(232,236,248,0.28)`}`;
    vals.sitUpLabel = st.sittingOut ? 'Sit down' : 'Sit up';
    vals.sitUp = () => {
      // Belt-and-suspenders alongside the display gate above: freezeout
      // never sits a seat out voluntarily, no matter what triggers the click.
      if (isTournamentTable) return;
      if (!this.adapter) return;
      if (st.sittingOut) {
        this.adapter.sitIn();
        this.setState({ sittingOut: false });
        this.sfx('seat');
        this.toast('You are dealt in next hand', 'ok');
        return;
      }
      const r = this.adapter.sitUp();
      this.setState({ sittingOut: true, preAction: null });
      this.sfx(r === 'out' ? 'ui' : 'fold');
      this.toast(r === 'out' ? 'Sitting up \u00b7 you will be skipped' : 'Hand folded \u00b7 sitting up', 'warn');
    };
    // Part 4 Task 4: hidden on a tournament table — leaving the seat is
    // elimination, not a cash-out; a tournament player detaches the felt by
    // navigating to another screen (nothing here forfeits the seat), never
    // through this control.
    vals.leaveStyle = `font-family:${UI};font-size:11px;letter-spacing:.02em;border-radius:999px;padding:5px 12px;white-space:nowrap;background:transparent;display:${t && !spectating && !isTournamentTable ? 'inline-flex' : 'none'};transition:background .18s ease,border-color .18s ease,color .18s ease;color:${RED_INK};border:1px solid rgba(148,163,196,0.5)`;
    vals.leaveTable = () => {
      // Belt-and-suspenders alongside the display gate above: this is the
      // ONLY path in the file that calls adapter.leave()/wallet.cashOut, and
      // freezeout never calls either for a tournament seat.
      if (isTournamentTable) return;
      if (!this.adapter) return;
      const amount = (seats[0] || {}).stack || 0;
      this.adapter.leave();
      this.sfx('seat');
      if (this.wallet && this.wallet.cashOut) this.wallet.cashOut({ tableId: sess ? sess.id : null, amount });
      // You may still watch a table you just stood up from — that is the only
      // route to spectating, so nobody can browse into a game they are not in.
      this.setState(
        { seated: false, sittingOut: false, screen: 'lobby' },
        () => { this.onResize(); this.syncTitle(this.state.table); },
      );
      this.toast(`Seat closed \u00b7 ${fmt(amount)} USDC back in your wallet`, 'ok');
    };
    /* Held upright the rail is shut, and its two seat controls with it — so
       they get corners of their own. Top-left is the way out: leaving the seat
       for someone who holds one, the lobby for a spectator or a tournament
       seat (which cannot be left, only walked away from). Beside the menu,
       one toggle that is "sit up" while dealt in and "sit down" while not. */
    vals.topBarOn = tall && !!t;
    const topWalks = spectating || isTournamentTable;
    vals.topLeaveLabel = topWalks ? 'Lobby' : 'Leave';
    vals.topLeave = topWalks ? this.go('lobby') : vals.leaveTable;
    vals.topSitOn = !spectating && !isTournamentTable;
    vals.topSitOut = !!st.sittingOut;

    // Not currently wired to any template control (no display binding
    // exists for it) — guarded anyway so a tournament table can never reach
    // a voluntary sit-out through it if one is added later.
    vals.toggleSitOut = () => {
      if (isTournamentTable) return;
      const next = !st.sittingOut;
      this.setState({ sittingOut: next });
      if (this.adapter) next ? this.adapter.sitOut() : this.adapter.sitIn();
      this.toast(next ? 'You sit out after this hand' : 'Back in next hand', 'ok');
    };
    /* The time-bank button is gone from the bar. The server still accrues and
       accepts the bank; nothing in this client spends it any more, which for
       now means the turn clock is simply the turn clock. */

    /* ── rail ─────────────────────────────────────────────────────── */
    /* Glides rather than snaps. Desktop collapses the width; stacked, the
       height. Either way the outer clips a fixed-size inner, so the content
       slides off the edge instead of reflowing as it goes. Stays in the tree
       at zero size, so nothing has to remember to bring the toggle back. */
    /* Stacked, the rail's height comes out of the same budget as the felt —
       a fixed 320px on a 500px window was most of the screen. Viewport-aware,
       so short windows keep the table and get a shorter log. */
    /* On a phone's side it is neither: there is no width to give up beside the
       felt and no height under it, so the rail slides over the table's right
       edge as a panel and takes nothing from the layout. */
    /* Held upright it is the menu's twin: a drawer from the right edge over
       a scrim, the full height of the screen. Stacked under the felt, as a
       narrow window has it, the log took a third of a phone's height from a
       table that needs all of it — and the menu already taught the gesture.
       Fixed, so it takes nothing from the layout; it stays in the tree shut,
       like every other form of the rail, so its toggle is never lost. */
    const railW = 'min(320px, 62vw)';
    vals.railScrim = `position:fixed;inset:0;z-index:71;background:rgba(5,8,18,0.55);opacity:${tall && st.railOpen ? 1 : 0};pointer-events:${tall && st.railOpen ? 'auto' : 'none'};transition:opacity .22s ease`;
    vals.railStyle = tall
      ? `position:fixed;z-index:72;top:0;right:0;bottom:0;width:min(330px, 88vw);display:flex;flex-direction:column;overflow:hidden;`
        + 'background:linear-gradient(180deg, rgba(26,20,60,0.98), rgba(12,17,34,0.98));border-left:1px solid rgba(167,139,250,0.3);'
        + 'box-shadow:-24px 0 60px -20px rgba(0,0,0,0.8), inset 1px 0 0 rgba(255,255,255,0.04);'
        + `transform:translateX(${st.railOpen ? '0' : '105%'});transition:transform .26s cubic-bezier(.2,.8,.2,1)`
      : mini
      // It stops 58px short of the bottom: that strip is the three decisions,
      // and a log that covered them would hide the buttons on your own turn.
      ? `position:absolute;right:0;top:0;bottom:58px;z-index:60;border-radius:0 0 0 14px;width:${st.railOpen ? railW : '0px'};display:flex;flex-direction:column;overflow:hidden;border-left:${st.railOpen ? '1px solid rgba(232,236,248,0.14)' : '0'};background:rgba(13,18,32,0.97);box-shadow:${st.railOpen ? '-18px 0 40px -18px rgba(0,0,0,0.8)' : 'none'};transition:width .3s ease`
      : c
      ? `flex:none;width:100%;overflow:hidden;max-height:${st.railOpen ? 'min(320px, 34vh)' : '0px'};border-top:${st.railOpen ? '1px solid rgba(232,236,248,0.14)' : '0'};background:transparent;transition:max-height .3s ease`
      : `flex:0 0 ${st.railOpen ? '320px' : '0px'};width:${st.railOpen ? '320px' : '0px'};display:flex;flex-direction:column;min-height:0;overflow:hidden;border-left:${st.railOpen ? '1px solid rgba(232,236,248,0.14)' : '0'};background:transparent;transition:flex-basis .3s ease,width .3s ease`;
    vals.railInner = tall
      ? 'width:100%;flex:1;display:flex;flex-direction:column;min-height:0'
      : mini
      ? `width:${railW};flex:none;display:flex;flex-direction:column;min-height:0;height:100%`
      : c
      ? `display:flex;flex-direction:column;min-height:0;max-height:min(320px, 34vh)`
      : `width:320px;flex:none;display:flex;flex-direction:column;min-height:0;height:100%`;
    // The body cedes room to the tab strip and chat input, so the input is
    // never the part the viewport cap clips away.
    vals.railBody = `flex:1;overflow-y:auto;min-height:0;max-height:${c && !mini && !tall ? 'calc(min(320px, 34vh) - 60px)' : 'none'}`;

    vals.railToggleLabel = st.railOpen ? 'Hide' : 'Show';
    vals.railOpen = !!st.railOpen;
    vals.toggleRail = () => { this.railTouched = true; this.setState((s) => ({ railOpen: !s.railOpen }), this.onResize); };
    vals.railIsLog = st.railTab === 'log';
    vals.railIsChat = st.railTab === 'chat';
    const rtab = (on) => `background:transparent;font-size:12px;padding-bottom:9px;color:${on ? PAPER_COOL : MUTED};transition:color .18s ease`;
    vals.railTabLog = rtab(st.railTab === 'log');
    vals.railTabChat = `${rtab(st.railTab === 'chat')};position:relative`;
    vals.railALog = st.railTab === 'log' ? '1' : '0';
    vals.railAChat = st.railTab === 'chat' ? '1' : '0';
    // One brass rule that slides to the active tab (rail + leaderboard share it):
    // measure the active [data-a="1"] sibling and translate the bar under it, so
    // the CSS transition animates the move. Runs each render, like chatEndRef.
    vals.slideBarRef = (el) => {
      if (!el || !el.parentNode) return;
      const row = el.parentNode;
      const on = row.querySelector('[data-a="1"]');
      if (!on) return;
      const rr = row.getBoundingClientRect(), or = on.getBoundingClientRect();
      const pl = parseFloat(getComputedStyle(row).paddingLeft) || 0;
      el.style.width = `${or.width}px`;
      el.style.transform = `translateX(${or.left - rr.left - pl}px)`;
    };
    // A dot, not a count. "There is talk you have not seen" is the whole
    // message; a number would make table chat look like an inbox.
    vals.chatDotStyle = `position:absolute;top:-1px;right:-7px;width:5px;height:5px;border-radius:50%;background:${ACC};opacity:${st.chatUnread ? 1 : 0};transition:opacity .2s ease`;
    vals.railLog = () => this.setState({ railTab: 'log' });
    vals.railChat = () => this.setState({ railTab: 'chat', chatUnread: false });

    /* ── chat ── */
    vals.chatLines = st.chat.map((m, i) => ({
      id: `c${i}-${m.at}`,
      name: m.name,
      text: m.text,
      whoStyle: `font-size:10.5px;letter-spacing:.14em;color:${m.seat === 0 ? BRASS : MUTED};text-transform:uppercase;margin-right:6px`,
    }));
    vals.chatEmptyStyle = `display:${st.chat.length ? 'none' : 'block'};font-size:11.5px;color:rgba(148,163,196,0.6);padding:4px 0`;
    // Mounted at the list's tail, so rendering the chat scrolls to its newest
    // line — including the moment the tab is opened.
    vals.chatEndRef = (el) => { if (el && st.railTab === 'chat') el.scrollIntoView({ block: 'nearest' }); };
    vals.chatInputRow = `display:${st.railTab === 'chat' ? 'flex' : 'none'};align-items:center;gap:10px;padding:10px 18px;border-top:1px solid rgba(232,236,248,0.14)`;
    vals.chatDraft = st.chatDraft;
    vals.chatInput = (e) => this.setState({ chatDraft: e.target.value });
    const chatReady = !!(this.adapter && this.adapter.sendChat && st.seated);
    vals.chatSend = () => {
      const text = (st.chatDraft || '').trim();
      if (!text) return;
      if (!chatReady) { this.toast(st.seated ? 'Chat needs a live table' : 'Take a seat to chat', 'warn'); return; }
      this.adapter.sendChat(text);
      this.setState({ chatDraft: '' });
    };
    vals.chatKeyDown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') vals.chatSend();
    };
    vals.chatSendStyle = `font-family:${UI};font-size:10px;letter-spacing:.18em;background:transparent;color:${chatReady && st.chatDraft.trim() ? BRASS : 'rgba(232,236,248,0.3)'};flex:none`;
    vals.logLines = st.log.map((l) => ({
      // The slots are filled here rather than at push time, so switching units
      // re-reads lines that were already written.
      at: l.at, text: l.amts ? l.text.replace(/\{(\d+)\}/g, (_, i) => this.amt(l.amts[+i], l.bb)) : l.text,
      style: `font-size:11px;line-height:1.45;letter-spacing:.01em;color:${l.kind === 'acc' ? BRASS : l.kind === 'win' ? WIN : l.kind === 'meta' ? PAPER_COOL : MUTED};font-weight:${l.kind === 'meta' ? 500 : 400};animation:logIn .22s ease both`,
    }));
    vals.connDotStyle = `width:7px;height:7px;border-radius:999px;background:${t && (t.connection === 'reconnecting' || t.connection === 'expired') ? BRASS : MUTED}`;

    /* ── private rooms: the join screen and the create-a-room modal ─────── */
    const roomInf = st.roomInfo;
    vals.roomName = roomInf ? (roomInf.name || st.roomSlug || 'Private room') : (st.roomSlug || 'Private room');
    vals.roomHasInfo = !!roomInf;
    vals.roomStakesLabel = roomInf ? `${usd(roomInf.sb / 1e6)} / ${usd(roomInf.bb / 1e6)}` : '';
    vals.roomBuyInLabel = roomInf ? `${usd(roomInf.minBuyIn / 1e6)} – ${usd(roomInf.maxBuyIn / 1e6)}` : '';
    vals.roomSeatedLabel = roomInf ? `${roomInf.seated}/${roomInf.maxSeats} seated` : 'Checking the room…';
    vals.roomPin = st.roomPin;
    vals.roomPinInput = (e) => this.setState({ roomPin: e.target.value.replace(/\D/g, '').slice(0, 4), roomMsg: '', roomBad: false });
    vals.roomPinKey = (e) => { if (e.key === 'Enter') this.joinRoom(); };
    vals.joinRoom = this.joinRoom;
    vals.roomJoinLabel = st.roomBusy ? 'Joining…' : 'Join room';
    vals.roomBackToLobby = this.go('lobby');
    vals.roomMsg = st.roomMsg;
    vals.roomMsgStyle = `font-size:12px;color:${st.roomBad ? RED : INK_MUT};margin-top:10px;min-height:16px`;

    vals.createRoomOn = st.createRoomOn;
    vals.openCreateRoom = this.openCreateRoom;
    vals.closeCreateRoom = this.closeCreateRoom;
    vals.crStop = (e) => e.stopPropagation();
    vals.crShowForm = !st.createdRoom;
    vals.crShowShare = !!st.createdRoom;
    vals.crName = st.crName; vals.crNameInput = (e) => this.setState({ crName: e.target.value.slice(0, 40) });
    vals.crFieldLabel = 'font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#94a3c4;margin-bottom:6px';
    vals.crSb = st.crSb; vals.crSbInput = (e) => this.setState({ crSb: e.target.value.replace(/[^0-9.]/g, '') });
    vals.crBb = st.crBb; vals.crBbInput = (e) => this.setState({ crBb: e.target.value.replace(/[^0-9.]/g, '') });
    vals.crMin = st.crMin; vals.crMinInput = (e) => this.setState({ crMin: e.target.value.replace(/[^0-9.]/g, '') });
    vals.crMax = st.crMax; vals.crMaxInput = (e) => this.setState({ crMax: e.target.value.replace(/[^0-9.]/g, '') });
    vals.crSeats = st.crSeats; vals.crSeatsInput = (e) => this.setState({ crSeats: e.target.value.replace(/[^2-6]/g, '').slice(0, 1) });
    vals.crPin = st.crPin; vals.crPinInput = (e) => this.setState({ crPin: e.target.value.replace(/\D/g, '').slice(0, 4), crMsg: '' });
    vals.createRoom = this.createRoom;
    vals.crCreateLabel = st.crBusy ? 'Creating…' : 'Create room';
    vals.crMsg = st.crMsg;
    vals.crMsgStyle = `font-size:12px;color:${st.crBad ? RED : INK_MUT};margin-top:8px;min-height:16px`;
    const madeRoom = st.createdRoom;
    vals.crShareUrl = madeRoom ? madeRoom.url : '';
    vals.crSharePin = madeRoom ? madeRoom.pin : '';
    vals.copyRoomLink = this.copyRoomLink;
    vals.crCopyLabel = st.crCopied ? 'Copied' : 'Copy link';
    vals.enterCreatedRoom = this.enterCreatedRoom;

    // Host controls: the "end the session" item + its confirm sheet, shown only
    // to the host of the private room this player is currently seated at.
    vals.menuIsHost = !!(st.hostRoom && st.session && st.session.tableId === st.hostRoom.tableId);
    vals.promptCloseRoom = this.promptCloseRoom;
    vals.closeRoomOn = st.closeRoomOn;
    vals.dismissCloseRoom = this.dismissCloseRoom;
    vals.closeRoom = this.closeRoom;
    vals.closeRoomLabel = st.roomClosing ? 'Ending…' : 'End the session';
    vals.closeRoomMsg = st.closeRoomMsg;
    vals.closeRoomMsgStyle = `font-size:12px;color:${st.closeRoomBad ? RED : INK_MUT};min-height:${st.closeRoomMsg ? 18 : 0}px`;

    return vals;
  }
}

function heroSqueezeHold(isHero, squeeze, faceUp) { return isHero && squeeze && !faceUp; }


