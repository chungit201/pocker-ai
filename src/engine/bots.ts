// suited — opponent policy. Delete this file when real players arrive; the
// adapter only needs `decide()` to return a legal action and a think time.

import { equity, holeLabel } from './poker';

export const PERSONAS = {
  nit: { open: 0.62, call: 0.06, aggro: 0.18, bluff: 0.03, speed: 1.15, label: 'tight' },
  reg: { open: 0.55, call: 0.03, aggro: 0.34, bluff: 0.09, speed: 1.0, label: 'solid' },
  lag: { open: 0.47, call: -0.02, aggro: 0.52, bluff: 0.2, speed: 0.8, label: 'loose' },
  station: { open: 0.68, call: -0.06, aggro: 0.1, bluff: 0.04, speed: 1.35, label: 'sticky' },
  maniac: { open: 0.4, call: -0.05, aggro: 0.7, bluff: 0.34, speed: 0.62, label: 'wild' },
};

export function decide(state, i, legal, rng) {
  const s = state.seats[i];
  const p = PERSONAS[s.style] || PERSONAS.reg;
  const opps = Math.max(1, state.seats.filter((o) => o.hole.length && !o.folded && o.idx !== i).length);
  const pot = state.pot + state.bets;
  const eq = equity(s.hole, state.board, Math.min(opps, 3), rng, state.board.length ? 90 : 130);
  const toCall = legal.toCall;
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
  const preflop = state.street === 'preflop';
  const label = preflop ? holeLabel(s.hole) : null;

  // marginal spots take longer — that hesitation is most of what makes a bot
  // feel human, so it lives here rather than in the UI. Never instant: a snap
  // action reads as a machine, not an opponent.
  const tension = 1 - Math.abs(eq - Math.max(potOdds, 0.4)) * 1.6;
  let think = (980 + rng() * 1150 + Math.max(0, tension) * 1500) * p.speed;
  if (preflop && eq < 0.3) think *= 0.78;
  think = Math.min(5200, Math.max(820, think));

  const raiseTo = (frac) => {
    const target = state.currentBet > 0
      ? Math.round(state.currentBet * (2.2 + frac * 1.6) + pot * frac * 0.5)
      : Math.round(pot * (0.45 + frac * 0.55));
    return Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, Math.max(target, legal.minRaiseTo)));
  };

  const wantRaise = eq > (preflop ? p.open + 0.14 : 0.58 + (1 - p.aggro) * 0.16);
  const bluff = rng() < p.bluff && eq < 0.42 && (legal.canCheck || toCall <= pot * 0.35);

  if (wantRaise && legal.canRaise && rng() < 0.35 + p.aggro) {
    return { action: { type: 'raise', to: raiseTo(Math.min(1, eq)) }, think, eq, label };
  }
  if (bluff && legal.canRaise && rng() < 0.6) {
    return { action: { type: 'raise', to: raiseTo(0.4) }, think: think * 0.8, eq, label, bluffing: true };
  }
  if (legal.canCheck) return { action: { type: 'check' }, think: think * 0.75, eq, label };
  if (eq >= potOdds + p.call && (preflop ? eq > 0.28 : eq > 0.22)) {
    return { action: { type: 'call' }, think, eq, label };
  }
  if (toCall <= state.bb && eq > 0.2 && rng() < 0.5) return { action: { type: 'call' }, think, eq, label };
  return { action: { type: 'fold' }, think, eq, label };
}
