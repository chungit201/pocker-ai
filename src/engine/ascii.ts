// suited — ASCII furniture. Plain data + string builders so the UI can
// place them anywhere; nothing here touches the DOM.

export const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const RED = new Set(['h', 'd']);

const pad = (s, w) => {
  const gap = w - s.length;
  const l = Math.floor(gap / 2);
  return ' '.repeat(Math.max(0, l)) + s + ' '.repeat(Math.max(0, gap - l));
};

// A big ASCII playing card, 13 cols x 10 rows.
export function CARD_ART(rank, suit) {
  const g = SUIT[suit];
  const r = pad(rank, 1);
  return [
    '┌───────────┐',
    `│ ${r}       ${g} │`,
    '│           │',
    '│           │',
    `│     ${g}     │`,
    '│           │',
    '│           │',
    '│           │',
    `│ ${g}       ${r} │`,
    '└───────────┘',
  ];
}

// A labelled chip, 7 cols x 3 rows. The label is the denomination — the user
// should always be able to read what a chip is worth.
export function CHIP_ART(label) {
  const l = pad(String(label), 3);
  return [' ,---. ', `( ${l} )`, " `---' "];
}

export const CHIP_DENOMS = [1, 5, 25, 100, 500];

export function chipBreakdown(amount) {
  let left = Math.round(amount);
  const out = [];
  for (let i = CHIP_DENOMS.length - 1; i >= 0 && out.length < 4; i--) {
    const d = CHIP_DENOMS[i];
    const n = Math.floor(left / d);
    if (n > 0) { out.push({ d, n: Math.min(n, 9) }); left -= n * d; }
  }
  return out.length ? out : [{ d: 1, n: 1 }];
}

export const SPINNER = ['⠂⠂', '⠒⠂', '⠒⠒', '⠂⠒'];
export const BARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

export function spark(values, height = 8) {
  if (!values.length) return '';
  const min = Math.min(...values), max = Math.max(...values) || 1;
  const span = max - min || 1;
  return values.map((v) => BARS[Math.min(height - 1, Math.floor(((v - min) / span) * (height - 1)))]).join('');
}

export const rule = (n) => '─'.repeat(Math.max(0, n));
export const dots = (n) => '· '.repeat(Math.max(0, n));

// Deterministic scatter for the background chips + the win celebration.
export function scatter(n, seed = 7) {
  let x = seed * 2654435761 % 2147483647;
  const next = () => ((x = (x * 48271) % 2147483647) / 2147483647);
  return Array.from({ length: n }, (_, i) => ({
    key: `sc${i}`,
    label: String(CHIP_DENOMS[Math.floor(next() * CHIP_DENOMS.length)]),
    left: 2 + next() * 92,
    top: 4 + next() * 88,
    rot: -28 + next() * 56,
    scale: 0.7 + next() * 0.8,
    delay: next() * 5,
    dur: 12 + next() * 14,
    drift: -40 + next() * 80,
  }));
}
