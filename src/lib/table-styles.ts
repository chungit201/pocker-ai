/* The table's skins.
 *
 * The felt's furniture — seats, cards, board, pot — sits at fixed coordinates
 * on the 1420×750 play canvas and never moves. A skin is only what is painted
 * under it: nothing at all (`classic`, the open felt edge to edge), or an oval
 * table in the landing page's manner, a lit felt inside a double-ringed rail.
 * So adding a skin is adding a row here; no geometry changes with it.
 *
 * ── the one constraint ───────────────────────────────────────────────────────
 * Every felt stays DARK. The table's text was tuned against FELT (#131a2f under
 * its light, about 0.02 relative luminance) and the muted ink on it needs 4.5:1,
 * which caps a felt's lit centre at roughly 0.028. A casino-bright green would
 * be the obvious emerald and would take the stack sizes, the hand id and the
 * red ink with it — see docs/readability.md. Check a new centre colour against
 * MUTED and RED_INK before adding it.
 */
import { FELT, FELT_DEEP } from './palette';

export type TableStyle = {
  id: string;
  name: string;
  note: string;
  /** The felt's radial, centre → mid → edge. Absent on the skin that draws no table. */
  felt?: [string, string, string];
  /** The rail itself. */
  rail?: string;
  /** `r,g,b` of the hairlines either side of the rail. */
  line?: string;
  /** `r,g,b` of the light the table throws on the ground around it. */
  glow?: string;
};

export const TABLE_STYLES: TableStyle[] = [
  { id: 'classic', name: 'Classic', note: 'The open felt, edge to edge, with nothing drawn around it.' },
  { id: 'arena', name: 'Arena', note: 'The table from the front page: violet felt inside a double-ringed rail.',
    felt: ['#2b2160', '#1a1740', '#111330'], rail: '#1a2038', line: '167,139,250', glow: '109,63,212' },
  { id: 'emerald', name: 'Emerald', note: 'A card room’s green, kept deep enough that every figure still reads.',
    felt: ['#0c3529', '#0a2a22', '#071c18'], rail: '#10261f', line: '94,214,170', glow: '22,140,104' },
  { id: 'crimson', name: 'Crimson', note: 'Wine-red felt, for a table that should feel like a final.',
    felt: ['#4a1226', '#32101e', '#1c0a12'], rail: '#2a121b', line: '244,140,160', glow: '170,36,74' },
  { id: 'ocean', name: 'Ocean', note: 'Deep blue felt under a cool rail.',
    felt: ['#0d2f4a', '#0b2238', '#081626'], rail: '#101f33', line: '110,190,250', glow: '30,110,190' },
  { id: 'obsidian', name: 'Obsidian', note: 'Charcoal felt and a gold-lined rail.',
    felt: ['#23252b', '#17181c', '#0e0f12'], rail: '#1b1a17', line: '232,198,106', glow: '150,120,50' },
];

export const DEFAULT_TABLE_STYLE = 'arena';
export const TABLE_STYLE_KEY = 'suited:table-style';

export const tableStyle = (id: unknown): TableStyle =>
  TABLE_STYLES.find((s) => s.id === id) || TABLE_STYLES.find((s) => s.id === DEFAULT_TABLE_STYLE)!;

/** The stored choice, or the default where storage is blocked or holds a skin
 *  that no longer exists. */
export function storedTableStyle(): string {
  try { return tableStyle(localStorage.getItem(TABLE_STYLE_KEY)).id; } catch { return DEFAULT_TABLE_STYLE; }
}

/* The oval, in play-canvas pixels. A stadium rather than an ellipse: its ends
   are true semicircles, and at this box they pass through all four corner
   plates (x 82 at y 210 and 520) while the flat runs carry the top seat and the
   hero's — so every seat sits on the rail, as the landing page draws it. The
   box leaves 10px of canvas for the rings outside the rail. */
const OVAL = { x: 50, y: 12, w: 1320, h: 726 };
const RAIL = 12;

const feltGradient = (s: TableStyle) =>
  `radial-gradient(62% 68% at 50% 44%, ${s.felt![0]} 0%, ${s.felt![1]} 56%, ${s.felt![2]} 100%)`;

/** The table itself, painted first in the play area so everything sits on it. */
export function tableSurfaceCss(s: TableStyle): string {
  if (!s.felt) return 'display:none';
  return `position:absolute;left:${OVAL.x}px;top:${OVAL.y}px;width:${OVAL.w}px;height:${OVAL.h}px;box-sizing:border-box;`
    + `border-radius:${OVAL.h / 2}px;pointer-events:none;z-index:0;background:${feltGradient(s)};border:${RAIL}px solid ${s.rail};`
    + `box-shadow:0 0 0 1px rgba(${s.line},0.38),0 0 0 9px rgba(8,10,18,0.9),0 0 0 10px rgba(${s.line},0.2),`
    + `inset 0 0 0 1px rgba(${s.line},0.26),inset 0 0 130px rgba(0,0,0,0.55)`;
}

/** What is behind the play area: the lit open felt, or the dark ground an oval
 *  table stands on, with the table's own colour thrown onto it. */
export function tableGroundCss(s: TableStyle): string {
  if (!s.felt) {
    return `background-color:${FELT};background-image:radial-gradient(56% 54% at 50% 44%, rgba(148,163,196,0.085), rgba(0,0,0,0.325) 100%)`;
  }
  return `background-color:${FELT_DEEP};background-image:radial-gradient(64% 62% at 50% 52%, rgba(${s.glow},0.3), rgba(${s.glow},0.08) 62%, rgba(${s.glow},0) 100%)`;
}

/** A thumbnail of the skin for the pickers: the same felt and rail, small. */
export function tableSwatchCss(s: TableStyle): string {
  const base = 'display:block;flex:none;width:48px;height:27px;box-sizing:border-box;';
  if (!s.felt) {
    return `${base}border-radius:5px;border:1px solid rgba(232,236,248,0.26);${tableGroundCss(s)}`;
  }
  return `${base}border-radius:14px;background:${feltGradient(s)};border:3px solid ${s.rail};box-shadow:0 0 0 1px rgba(${s.line},0.5)`;
}
