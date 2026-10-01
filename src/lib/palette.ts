/* The theme, as the app's code sees it.
 *
 * Most of this app styles itself with inline styles built in
 * SuitedApp.renderVals(), so these constants — not the stylesheet — are where
 * the colour of the running product actually comes from. globals.css carries
 * the same palette as `--su-*` custom properties for the handful of rules
 * written in CSS; change one and you usually want the other.
 *
 * ── the one rule worth knowing ───────────────────────────────────────────────
 * Several constants below look redundant and are not: CARD_FACE has the same
 * job-description as PAPER, ON_FILL and PAPER_INK look like the surfaces they
 * are named after. They are split because a colour that is a SURFACE in one
 * place and a MARK in another cannot be themed as one value — invert the UI and
 * one of the two becomes invisible. That is not hypothetical: collapsing them
 * is what made the toast's text the same navy as the toast, the card rank
 * near-white on a white card, and the em-dash placeholder vanish on three
 * screens. Keep them apart, and run tools/audit-contrast.mjs after any change.
 */

/* ── surfaces ─────────────────────────────────────────────────────────────── */
export const FELT = '#131a2f';        // the table
export const FELT_DEEP = '#0a0d16';   // the ground behind everything
export const PAPER = '#1a2238';       // a raised plate: menus, modals, panels

/* ── marks ────────────────────────────────────────────────────────────────── */
export const PAPER_COOL = '#e8ecf8';  // primary text
export const MUTED = '#94a3c4';       // secondary text
export const INK = '#e8ecf8';         // text on a plate — the plate is dark now
export const INK_MUT = '#94a3c4';
export const FELT_INK = PAPER_COOL;

/** A playing card's face. Shares PAPER's description, not its job: PAPER is a
 *  UI surface and follows the theme; a card stays a light card. */
export const CARD_FACE = '#f2f5ff';

/** The one filled action per view, and its label. Was INK — a near-black fill,
 *  the loudest thing on a cream panel and nothing at all on a dark one. */
export const CTA = '#8b5cf6';
export const CTA_INK = '#f6f3ff';

/** Text sitting ON a filled surface: a toast, the turn prompt, a selected pill.
 *  The original spelled all three with a surface constant. */
export const ON_FILL = '#f6f3ff';

/** Paper-coloured TEXT, as opposed to a paper-coloured surface. Every stat
 *  tile's figure passes it as `tone`. */
export const PAPER_INK = '#e8ecf8';

/* ── state ────────────────────────────────────────────────────────────────── */
export const BRASS = '#a78bfa';       // live state: the acting ring, a live value
/** Act now — the turn clock and the acting seat. Deliberately not BRASS: brass
 *  marked both whose turn it is and who won, and the two collided. */
export const CLARET = '#f43f5e';
export const RED = '#e5484d';
/** Red as TEXT on a dark surface, as opposed to RED the fill. Same split as
 *  ON_FILL and PAPER_INK above, and for the same reason: RED reads fine as a
 *  block of colour but only 4.41:1 as 11px type on the felt. */
export const RED_INK = '#f06a6e';
export const WIN = '#22d3ee';
export const LOSS = '#f0a8b4';

/* ── type ─────────────────────────────────────────────────────────────────── */
export const SERIF = "'Instrument Serif', Georgia, serif";
export const UI = "'Inter Tight', system-ui, sans-serif";
export const MONO = UI;
export const DISP = "'Inter Tight', system-ui, sans-serif";
export const EASE = 'cubic-bezier(.2,.9,.24,1)';

/* ── compounds ────────────────────────────────────────────────────────────── */
export const FELT_LIGHT = 'radial-gradient(58% 56% at 50% 40%, rgba(148,163,196,0.075), rgba(0,0,0,0.3) 100%)';

/** Cards carry their edge as a shadow, not a border. At showdown the winning
 *  hand lifts into a brighter, lit state — the crown moment. */
export const FLAT_CARD = '0 8px 20px rgba(0,0,0,0.425)';
export const LIT_CARD = `0 0 0 2px ${BRASS}, 0 0 34px 8px rgba(139,92,246,0.55), 0 12px 26px rgba(0,0,0,0.525)`;
/** Hearts and diamonds, as ink on a card. It was an alias of RED, which is a
 *  fill colour and came to 3.59:1 against CARD_FACE — the same "faint card"
 *  complaint the rank text drew once already, one layer along. A real deck's
 *  red is deeper than a UI's alert red; this is 5.4:1 and still unmistakably
 *  the red suit. */
export const RED_CARD = '#c8102e';

/** Every "go and read this on the chain" link: the receipt beside a deposit, a
 *  withdrawal, a rakeback redemption, a jackpot claim. One style, so they are
 *  recognisably the same offer wherever they appear. The domain is never
 *  written here — it comes from /api/chain's `explorerUrl`. */
export const RECEIPT_LINK = `margin-left:8px;color:${BRASS};text-decoration:none;`
  + 'border-bottom:1px solid rgba(139,92,246,0.35);white-space:nowrap';

export const SIGILS = [BRASS, MUTED, '#7d4cf0', '#94a3c4', INK_MUT];

/* ── legacy aliases ───────────────────────────────────────────────────────── */
/* From the palette before this one. Retired screen by screen; nothing new
   should reach for them. BG is the trap — it is named for a background and is
   mostly used as a text colour, which is why ON_FILL exists. */
export const BG = PAPER;
export const SURF = PAPER_COOL;
export const ACC = BRASS;
export const ACC2 = MUTED;
export const MUT = INK_MUT;
export const DIM = 'rgba(232,236,248,0.176)';
