/* What a card slot is allowed to show.
 *
 * A security boundary, not a formatting helper: `packages/engine/src/project.ts`
 * withholds every card a viewer has not earned before it leaves the gateway,
 * and this keeps the same promise once it arrives. Hiding a face with CSS is
 * presentation, not concealment — the glyph would still be in the document.
 *
 * The caller supplies `visible`, because the two kinds of slot do not share a
 * predicate: a hole card is visible when it is face-up (the hero's flip, an
 * opponent's showdown), a board card when it has arrived. An opponent's card
 * ARRIVES face-down, so arrival is the wrong question to ask about one.
 */
import { RANKS } from './poker';

export const SUITG = { s: '♠', h: '♥', d: '♦', c: '♣' };

/**
 * A rank as a person reads it on a card: the ten prints as "10", not "T".
 *
 * `RANKS` is one character per rank because it is an identity, not a label —
 * card ids are two characters (`Ts`), `parseCard` recovers the rank with
 * `RANKS.indexOf(id[0])`, and the deck, the crown-highlight id set and the
 * gateway's wire format all depend on that. So the ten is widened here, at the
 * point of display, and nowhere else.
 *
 * Deliberately NOT applied to `holeLabel` in poker.ts. "TT" and "AKo" are
 * starting-hand notation, where T is the convention everywhere the game is
 * written down; "1010" would be wrong rather than friendlier.
 */
export const rankLabel = (r: number): string => (RANKS[r] === 'T' ? '10' : RANKS[r]);

const NOTHING = { rank: '', suit: '', red: false, shown: false };

/**
 * @param {{r:number,s:string}|null} cid  the card in this slot, or null if empty
 * @param {boolean} visible               is this slot actually showing its face
 */
export function cardFace(cid, visible) {
  if (!cid || !visible) return { ...NOTHING };
  // A card nobody holds has no face. `>= 0` rather than `< 0` so an absent or
  // NaN rank fails closed too — the withheld card's rank is -1.
  if (!(cid.r >= 0)) return { ...NOTHING };
  return {
    rank: rankLabel(cid.r),
    suit: SUITG[cid.s],
    red: cid.s === 'h' || cid.s === 'd',
    shown: true,
  };
}
