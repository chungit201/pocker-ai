# suited — Next.js port

The suited.club poker client, moved from a single 665 KB `index.html` onto
Next.js 16 and TypeScript.

The gateway is a separate project and is not touched by any of this:
**`C:\projects\Poker-BE`** — Node, TypeScript, Postgres, one stateful actor per
table. It serves no frontend (its `webRoot` points at a directory that does not
exist), which is exactly the split this port assumes.

## What this replaced

The original was one HTML file that did everything at run time in the browser:

| Was | Now |
|---|---|
| `support.js` — a 71 KB runtime parsing the page with `DOMParser` on every load | compiled to JSX once, at port time |
| `vendor/babel.min.js` — 3 MB, transpiling the app in the browser | the Next build |
| a template DSL (`{{ }}`, `<sc-if>`, `<sc-for>`, `style-hover`) | JSX |
| `class Component extends DCLogic` | `React.Component` |
| `engine/*.js` on `window.SUITED` | `src/engine/*.ts`, imported |

Nothing was redesigned. The port is deliberately literal: inline styles, the
single large class component, and every variable name are as they were, so the
result can be diffed against the original rather than taken on trust.

## Running it

Two processes. The gateway first — it owns port 3000:

```bash
npm install
npm run dev                   # http://localhost:3001
```

That is all that is needed: `.env.local` points at the **deployed gateway**,
`https://api.bloomcapital.market`, so there is no local backend and no Postgres
to stand up. Wallet sign-in, the lobby, sitting down and the socket all work
against it — verified with `node tools/probe-live.mjs`, which signs with a real
key. Read **[docs/gateway.md](docs/gateway.md)** before relying on it: Solana
sign-in is refused, on-chain deposits are off, and four endpoints the UI calls
do not exist there.

To run the gateway locally instead — the same code, `C:\projects\Poker-BE` —
point `NEXT_PUBLIC_SUITED_WS` and `SUITED_BACKEND` at `localhost:3000` and:

```bash
cd C:\projects\Poker-BE
npm install
npm start                     # needs Postgres on postgres://localhost/suited
```

`Poker-BE/.env` is installed and ready. It needs a database — `createdb suited`
against `postgres://localhost/suited`, which is the default — and note `BOTS=0`
in it: a table will not deal until **two** real players are seated, so test with
a second browser profile or an incognito window (two tabs in one profile share
an account, since the session lives in localStorage). The same two-player rule
applies to the deployed gateway.

Sound is 21 generated clips in `public/sounds/`, committed and lazily loaded —
see **[docs/sound.md](docs/sound.md)** before changing one, and note that
nothing makes a noise unless you are seated at a table.

For the **offline demo** — bots in the browser, a local RNG, no gateway at all —
set `NEXT_PUBLIC_SUITED_SERVER=offline` and restart. It is also the only place
the table can be exercised at all now that the deployed gateway has stopped
funding new accounts. Note the URL router
deliberately no-ops offline, so every path renders the landing page and you
navigate by clicking; that is the original behaviour, not a port bug.

### How the two are wired

REST reaches the gateway through a rewrite in `next.config.ts`, so `/api` is
same-origin. That is not a convenience — the gateway sends no CORS headers at
all, so a direct cross-origin call would simply fail.

A rewrite carries no WebSocket upgrade, so the socket is dialled straight at the
gateway via `NEXT_PUBLIC_SUITED_WS`. WebSocket is not subject to CORS, so that
needs nothing from the gateway either. Poker-BE accepts only a single-use 30 s
ticket on the socket — the bearer-token fallback was removed — and the client
already asks for one at `POST /api/ws-ticket` before dialling, which goes
through the rewrite and authenticates normally.

Two properties of that proxy were measured rather than assumed
(`tools/echo-gateway.mjs` is the stand-in used to check them):

- **`Authorization` survives the rewrite**, so signed calls still authenticate.
- **Next does not add `x-forwarded-for`, but it does pass one through.** The
  gateway rate-limits per client IP (api 300/min, auth 30/min, ws-connect
  30/min), so in production put both behind one reverse proxy that sets that
  header and start the gateway with `TRUST_PROXY=1`. Without it every player
  shares one bucket. Locally it changes nothing — every client is 127.0.0.1.

## Layout

```
src/app/[[...slug]]/page.tsx     one catch-all route — the app is its own router
src/app/layout.tsx               fonts and the stylesheet
src/app/globals.css              the sheet, the theme tokens, hover rules
src/components/SuitedApp.tsx     the application — state, wiring, renderVals()
src/components/SuitedTemplate.tsx  the screen index: which screen renders when
src/components/screens/          one file per screen (19)
src/components/SuitedClient.tsx  mounts the app in its own React root — see below
src/components/dc-runtime.tsx    three behaviours the compiled JSX depends on
src/wallet/                      wagmi + RainbowKit + Solana, and the bridge
                                 that reaches a class component from hooks
src/lib/palette.ts               the theme, as the app's code sees it
src/engine/                      the 16 engine modules, as TypeScript
src/config.ts                    the switches that used to be <script> tags
tools/                           checks and probes — no build step
```

**There is no code generation.** Everything under `src/` is ordinary source;
edit it directly. The port was done by a set of generators that read
`../Poker-AI/index.html`, and those have been deleted — the port is finished,
nothing syncs from upstream, and keeping a build step that overwrites source was
costing more than it returned. If you find a "generated — do not edit" banner in
the history, it no longer applies.

### Shape

`SuitedTemplate.tsx` is a 240-line index: one line per screen, each gated by the
condition that decides whether it renders. The screens themselves are in
`screens/`, from 19 lines (Staking, which is a mount point for an imperative
renderer) to 928 (Table).

`SuitedApp.tsx` is still one large class component. That is deliberate and is
the next thing to look at if it bothers you — but measure first: `renderVals()`
is 3 400 lines declaring 234 locals, 68 of which are read in more than one
section. Splitting it means threading those 68 through function boundaries,
which is a real refactor with real regression risk, not an extraction. The
screen split was worth doing because each screen was already self-contained;
this one is not, yet.

Both splits so far were checked with `tools/snapshot.mjs`, which records the
exact DOM of nine screens and diffs it. Use it for any refactor here:

```bash
node tools/snapshot.mjs before
# …change things…
node tools/snapshot.mjs after      # diffs against before.json
```

## Wallets

A player can sign in with an EVM wallet (wagmi + RainbowKit) or a Solana one
(the Wallet Standard, through `@solana/wallet-adapter-react`). Both run the
gateway's three-step handshake and differ only in who signs.

**The EVM half works against Poker-BE as it stands. The Solana half does not —
the gateway cannot verify an ed25519 signature yet.** `docs/wallet-sign-in.md`
is the contract for that work, and explains the wiring, including why the
providers have to live inside the app's nested React root.

```bash
node tools/echo-gateway.mjs    # :3000
node tools/probe-wallet.mjs    # drives both sign-ins against fake wallets
```

## The theme

The original was felt green with cream paper plates and brass for live state.
It is now near-black navy with dark glass panels, violet for the one filled
action and for live state, cyan for the win, rose for act-now.

The palette lives in two places that must agree: `src/lib/palette.ts`, which is
what the inline styles are built from, and the `--su-*` tokens at the bottom of
`globals.css`, which the CSS rules name. Change one, check the other.

It was applied by a map of **(role, colour) → colour**, not colour → colour, and
that distinction is the reason the theme holds together. Ten colours in this app
do two opposite jobs: `#eae6dc` was a light panel as a `background` and light
text as a `color`, and inverting the UI sends those two in opposite directions.

The mapper itself is gone with the rest of the generators, but what it had to
learn is still true of the code, and is worth knowing before changing a colour.
Four cases, each found by something going visibly wrong:

- **Palette constants** (`const FELT = '#103a2e'`) have no CSS property to read a
  role from, and `renderVals` builds most of the app out of them. Mapped by name.
- **Colours that are not written as colours.** The lobby's stake ladder
  interpolates white → brass as raw rgb triples, so no scanner sees it; it was
  the one gold thing left in a violet UI.
- **Style-attribute selectors.** The stylesheet reaches some buttons through
  `[style*="rgb(42, 39, 37)"]` — the browser's spelling of an inline colour,
  spaces and all. Rewriting those as ordinary colours killed six hover rules.
  They are mapped through the same table and printed the browser's way, and the
  colours they depend on are pinned so every copy agrees.
- **Card faces, and what is drawn on them.** A card is not a panel. `PAPER` was
  both, so it was split in two; the landing's hero cards needed the
  container-query unit as a signal, since they share their colour with ten
  modals. The marks matter as much as the surfaces: the rank is dark because the
  face is light, the back's diamond is light because the back is dark, and the
  ordinary rules inverted both — the rank came out near-white on a white card.
  `tools/probe-card-contrast.mjs` measures this from the DOM rather than from a
  screenshot, because the landing's face only flips into view on pointer
  proximity and a headless run never triggers it.
- **Surface names doing text jobs.** `BG`, `FELT` and `PAPER` are all named for
  surfaces, and all three are mostly used as `color:` — nine of `FELT`'s eleven
  uses, and twenty of `PAPER`'s once the stat tiles' `tone:` is counted. Themed
  as surfaces they turned the toast's text the colour of the toast, four button
  labels to 3.35:1, and the em-dash placeholder on three screens to 1.23:1. Each
  is now two constants in `src/lib/palette.ts` — the surface, and the text it was
  also being asked to be. Do not collapse them back.

### Finding these

`tools/audit-contrast.mjs` walks the rendered DOM on seven screens, resolves
each text node's real background — climbing past transparent ancestors, and
averaging gradient stops, since nearly every filled control here is a gradient —
and reports anything under the WCAG threshold. It currently reports zero.

It exists because this class of bug is invisible to a screenshot and to the eye:
the first three were found by the user pointing at them. Run it after any change
to the theme.

### Two screens that theme themselves

Staking and docs are not built from the template at all — they are rendered
imperatively by `src/engine/staking-render.ts` and `docs-render.ts`, each
carrying its own palette near the top of the file. Changing the theme means
editing about twenty named constants in each; they do not read
`src/lib/palette.ts`.

The depth-and-light layer — glows, bevels, the lift on a stake tile — is the
last block of `globals.css`. It changes no geometry, which is why the screens
still match the original structurally.

### The table's action bar

The one screen where controls are pressed under a clock. The original was a row
of hairline outline pills in which only colour separated a fold from a raise,
and the three decisions looked like the five sizing presets beside them. It is
now a tray of solid colour-coded plates — crimson fold, steel check/call, violet
for the aggressive action, a darker crimson for all-in — with the wagered figure
set large above a real slider.

Everything routes through one `actPill` in `renderVals`, so the plates are a
single recipe rather than nine style strings. All-in has a style of its own
because it shared `sizeStyle` with `min` and is a decision, not a sizing.

`tools/felt.mjs` plays the demo onto the table and waits for the hero's turn
before photographing it; `tools/shot-actionbar.mjs` crops the bar at 2x and
`tools/probe-actionbar.mjs` reads the computed style off each button.

## Checking it

Nothing here is a unit test. They are all small Playwright scripts that drive
the real app and assert something about what it renders — which is the only
useful question for a UI assembled this way.

| | |
|---|---|
| `node tools/verify.mjs` | every screen renders, no console errors |
| `node tools/audit-contrast.mjs` | no unreadable text on any screen |
| `node tools/snapshot.mjs before` / `after` | the DOM before and after a refactor, diffed |
| `node tools/probe-card-contrast.mjs` | a card's rank and pips are readable against its face |
| `node tools/probe-attr.mjs` | the `[style*="…"]` hover rules still match something |
| `node tools/felt.mjs` | plays the demo onto the table and photographs it |
| `node tools/echo-gateway.mjs` | stands in for Poker-BE on :3000, no Postgres needed |
| `node tools/probe-wallet.mjs` | signs in on both chains against fake wallets |
| `node tools/probe-solana-connect.mjs` | a Solana wallet that fails on demand; is the reason readable? |
| `node tools/probe-waiting-panel.mjs` | "Waiting for others" shows at an empty table and nowhere else |
| `node tools/shots.mjs` · `shot-actionbar` · `shot-hero-card` | screenshots, for looking at a change |
| `node tools/read-env.mjs <file>` · `check-be-env` | read or verify the gateway's env without printing secrets |

Run `verify` and `audit-contrast` after any visual change, and `snapshot` around
any refactor. The three unreadable-text bugs that reached the user were all
invisible to a screenshot; `audit-contrast` is what catches them now.

The port was originally held to a DOM diff against the original single-file app,
which it passed on ten screens with zero structural differences, including the
imperatively-rendered staking page. That check depended on the upstream repo and
went with the generators; `snapshot.mjs` is its replacement and compares the app
against itself across a change.

`probe-attr` is worth keeping in mind: the stylesheet reaches a few buttons by
matching the browser's serialisation of their inline style, which is fragile by
construction. Six of seven selectors match; the one that does not was already
dead in the original.

**Not yet checked against the real gateway.** The machine this was ported on has
neither Postgres nor Docker, and standing one up was left to the backend side,
so everything above was verified in offline demo mode plus the proxy checks.

Still unexercised, and worth doing first when a database exists:

- the WebSocket itself — dealing, seating, the turn clock, money;
- sign-in, where `PUBLIC_HOST` in `Poker-BE/.env` was changed to `localhost:3001`
  so the wallet names the origin the page actually came from;
- the ticket handshake. Poker-BE accepts only a ticket on the socket, and the
  client's old fallback — the bearer token in the URL — is now a dead end: if
  `POST /api/ws-ticket` ever fails, the socket gets an unreadable 401 instead of
  a useful error. Worth tightening once it has been seen working.

## Three things that are not 1:1

Each is a deliberate decision, not a slip.

**The app mounts in its own React root** (`SuitedClient.tsx`). React delegates
events at its root container. The old runtime's container was the
`<div id="dc-root">` it created inside `<body>`; Next's App Router renders
`<html>` and `<body>` itself, so its container is the *document* — the same node
this app adds a click listener to in order to close its menus. Seventeen
handlers call `stopPropagation()` to keep their click away from that listener,
and `stopPropagation` does not stop a second listener on the same node. Without
the nested root every menu opened and closed on one click. With it, all
seventeen work untouched.

**`createSound()` gained a `destroy()`.** `componentWillUnmount` has always
called `this.sound.destroy()` — "release the audio context outright" — but it
was never written, so the call threw. Nothing noticed, because under the old
runtime the app mounted once and never unmounted. React's development
double-mount made an unmount happen, and with it the crash.

**Strictness is off** in `tsconfig.json` (`strict`, `noImplicitAny`). 340 KB of
engine and 7 000 lines of app logic came across from untyped JavaScript as they
were; `src/engine/verify.ts` is a byte-for-byte counterpart of the server's
`fair.ts`, and a retype-while-porting is how two commit-reveal implementations
quietly stop agreeing. Earn the flags back per module. That is the whole
remaining debt.

## Known, pre-existing

Two faults were found in the original while checking this port. Neither was
introduced here, and neither is fixed here:

- **The original's offline demo no longer boots.** `support.js` pins SRI hashes
  for `vendor/react*.js` and the vendored files no longer match them, so React
  never loads and the page stops at `<x-dc>`. The comparison scripts strip those
  hashes in the browser, for the test run only, to have something to compare
  against.
- **An SVG path is built without a leading `M`**, logging
  `Expected moveto path command` on the lobby. Both builds do it identically.
