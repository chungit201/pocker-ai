# Readability, and the bug that keeps coming back

The port inherited a cream-on-dark-ink design and was rethemed to dark. One
failure mode has now produced **nine** separate invisible-text bugs, and it is
always the same shape:

> a colour that was a dark **mark** on a light plate is reused as a dark
> **surface** (or the reverse), and the text ends up the colour of the thing
> behind it.

`src/lib/palette.ts` splits the constants that play both roles — `CARD_FACE`
from `PAPER`, `ON_FILL` and `PAPER_INK` from the surfaces they are named after,
and now `RED_INK` from `RED` and a real value for `RED_CARD`. Anything that is
*text* must come from a text constant. That is the whole rule.

## What measures it

```bash
node tools/audit-contrast.mjs     # the signed-out screens
node tools/probe-live.mjs         # the seat screen and the felt
```

Both call the same `AUDIT` from `tools/lib/contrast.mjs`: it walks the rendered
DOM, resolves each text node's real background (climbing past transparent
ancestors, and averaging gradient stops, since nearly every filled control here
is a gradient), and reports anything under the WCAG threshold.

**The split matters.** `audit-contrast.mjs` walks the nav from a cold landing
page, so it can only ever see screens a signed-out visitor can reach. The seat
screen and the table need a session, and for months nothing measured them — the
"take your seat" button was `background:PAPER; color:FELT`, two dark surfaces,
and it shipped that way until someone looked at it. `probe-live.mjs` signs in
with a real key, so it carries the audit those last two steps.

A screen that no tool can reach is a screen where this bug lives indefinitely.
If you add one, add it to whichever of the two can get there.

## Found by measuring, not by eye

Everything below was invisible or near-invisible in the shipped UI, and all but
the first three were found by the audit rather than reported:

| | ratio | what it was |
|---|---|---|
| card rank | — | reported by a user |
| toast | ~1:1 | reported by a user |
| "take your seat" | — | reported by a user: `PAPER` fill, `FELT` text |
| dealer button "D" | 1.09:1 | `PAPER` disc, `FELT` letter |
| winner's seat plate | 2.04:1 | light text left on the bright violet win fill |
| turn clock, last 4s | 1.52:1 | violet text on the crimson urgency fill |
| log timestamps | 2.69:1 | `MUTED` at 0.5 alpha |
| "02 deposit" | 3.3:1 | `MUTED` at 0.6 alpha; step 1 beside it was not dimmed |
| ♥ ♦ on a card | 3.59:1 | `RED_CARD` was an alias of `RED`, a fill colour |
| active chain tab | 3.09:1 | its own gradient, a stop lighter than the standard one |
| "raise to …" | 4.12:1 | same — the most-pressed control in the app |
| hand id on felt | 4.36:1 | `MUTED` at 0.7 alpha |
| "leave" | 4.41:1 | `RED`, a fill colour, used as 11px type |

Two of them — the winner's plate and the urgent clock — only appear while a hand
is being played, which is why `probe-live.mjs` sits at a real table against the
gateway's bots rather than stopping at an empty felt.

## Two notes on fixing

- **A control with two background states needs two text colours.** The turn
  clock is grey when resting and crimson in the last four seconds; one colour
  cannot clear the floor on both. The same goes for the seat plate, which turns
  bright violet on a win.
- **Check the fill before darkening the text.** `CLARET` is too bright for white
  to pass at 10.5px (3.67:1), so the urgent clock went dark-on-red instead.
  Where the fill is ours to choose, moving it to the app's standard
  `linear-gradient(180deg,#8b5cf6,#6d3fd4)` fixed both the chain tab and the
  raise button without touching their labels.
