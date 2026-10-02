# The deployed gateway

`https://api.bloomcapital.market`, with the socket at
`wss://api.bloomcapital.market/ws?table=<id>&ticket=<ticket>`.

Everything below is measured, not assumed — the gateway is someone else's
deployment and its configuration is not visible from this repo. Re-run the two
probes after any change on their side:

```bash
node tools/probe-gateway.mjs      # the gateway alone: REST, auth, ws handshake
node tools/probe-live.mjs         # through the app, with a real signature
node tools/watch-table.mjs        # spectate a table; does it deal hands?
```

## How it is wired

```
browser ──/api──▶ Next (3001) ──rewrite──▶ api.bloomcapital.market
   └────────────── wss ──────────────────▶ api.bloomcapital.market/ws
```

REST goes through the rewrite in `next.config.ts` because **the gateway sends no
CORS headers at all** — not a permissive set, none. A direct cross-origin
`fetch` from the browser is therefore blocked outright, and the rewrite is what
makes `/api` same-origin. This is a requirement, not a preference.

The socket does not and cannot follow it: a Next rewrite carries no WebSocket
upgrade. It is dialled straight at `wss://…`, which needs nothing from the
gateway, because WebSocket is not subject to CORS. So the two halves take
different routes by necessity — which is why `tools/probe-gateway.mjs` takes a
REST base and a WebSocket base separately. Testing both against one origin would
not be testing what ships.

`.env.local`:

```
NEXT_PUBLIC_SUITED_SERVER=            # blank: use this page's own origin
NEXT_PUBLIC_SUITED_WS=wss://api.bloomcapital.market
SUITED_BACKEND=https://api.bloomcapital.market
```

## What works

Verified end to end, in a real browser, with a real secp256k1 key generated per
run so the gateway's own `verifyMessage` has something genuine to check:

- `/api/auth/challenge` → `/api/auth/verify` **accepts a real signature** and
  mints a session. Wallet sign-in is live.
- The session persists under `suited:session` and spends against `/api/me`.
- `/api/ws-ticket` issues a ticket, and a ticket minted *through the rewrite* is
  honoured by the socket — which is the step that proves the split routing.
- Sitting down works: the buy-in leaves the bankroll, the felt comes up, and
  leaving returns the chips.
- The lobby's six stake rows match the gateway's ten tables exactly.

### The socket says nothing until you say hello

An opened socket that sends no frames is not a fault. `attach` marks the
connection `hello: false` and holds everything back until the client sends
`{ t: 'hello' }`; only then do `sync`, `chat:history` and `balance` arrive.
`src/engine/remote.ts` does this on open. It cost an hour of looking at a
healthy silent socket, so it is written down.

## What does not work

**Solana sign-in is rejected.** `/api/auth/challenge` with `chain: 'solana'`
returns **400**. The browser half is built and tested; the gateway half is not
deployed. `docs/wallet-sign-in.md` is the contract for it. Until that lands, the
Solana tab on the connect screen can discover a wallet and get a signature out
of it, and the gateway will refuse the result.

**On-chain deposits are off.** `/api/chain` returns `{"enabled":false}`, which in
`Poker-BE/src/api.ts` means exactly one thing: `config.chain.mode !== 'evm'`.
The deployment is in faucet mode, so balances are play money — a new account
arrives with 1,000 USDC — and there is no vault, no token and no deposit or
withdrawal. Note this is independent of sign-in: wallet login works regardless,
because it authenticates an address rather than moving funds. The two were easy
to conflate and are not related.

**Guest sign-in is open.** `POST /api/auth/dev` mints a session with no
signature at all. That is `ALLOW_GUEST=1`, which is a development setting; on a
public host anyone can take an identity and its faucet balance without a wallet.
Worth raising with the backend team — it is their configuration, not ours.

**Five endpoints the frontend calls do not exist** — they are not routes in
`Poker-BE/src/api.ts` at all:

| path | screen it feeds |
|---|---|
| `/api/stats` | the lobby's hands/in-play/dealt counters |
| `/api/jackpot`, `/api/jackpot/voucher` | today's jackpot, the claim button |
| `/api/leaderboard` | the leaderboard screen |
| `/api/tournaments` | the tournaments screen |
| `/api/staking` | the staking screen |

The app degrades correctly: every one of those panels shows an em-dash rather
than breaking, and `probe-live.mjs` prints the list so a page of em-dashes is
never mistaken for a healthy one. But four items in the nav lead to screens the
backend cannot fill, which is a product gap rather than a bug.

`tools/verify.mjs` holds the same list as `KNOWN_404` and matches it against the
**request URL**, not the console message. That distinction found `/api/staking`,
which the first four had missed: Chrome's text for a failed fetch is "Failed to
load resource: the server responded with a status of 404" and names no URL, so
a filter written against that string silences every 404 the app can ever hit —
including a real one.

`/api/nickname` and `/api/faucet` answer 404 to a GET; they are POST-only and
this is expected. `/api/hands` answers 401 unauthenticated, which is also
correct.

## Rate limits

The gateway limits per client IP — api 300/min, auth 30/min, ws-connect 30/min.
Behind the rewrite it sees whichever address the request arrives from, so in
production Next and the gateway want one reverse proxy in front setting
`x-forwarded-for` (Next passes it through but does not add it) and the gateway
started with `TRUST_PROXY=1`. Without that every player shares one bucket.

## Hands are dealt, and bots deal them

`node tools/watch-table.mjs` joins the busiest table as a spectator and reports
what it sees. It found `marsh` on hand **#9**, so this deployment runs bots: one
real player is enough for a game, which is why a probe that sits down is dealt
into hands within seconds.

That explains two things that first looked like faults:

- **Leaving does not always cash out immediately.** A seat dealt into a hand in
  flight keeps its chips in the pot until the hand is booked — `leaveSeat` in
  `Poker-BE/src/actor.ts` defers it — and a dropped socket's seat is only
  released after a ~30s grace. `probe-live.mjs` therefore closes the browser
  first and then polls `/api/me` from Node, because polling from inside the page
  holds the socket open and the grace timer never starts.
- **The buy-in does not come back whole.** Blinds are posted while seated, so a
  sit-and-leave settles a little up or down. Across three runs the throwaway
  account came back $1 down, $1 up, and $1 down — which is settlement working,
  not chips going missing. The probe prints the net rather than only asserting
  the balance rose, so this stays visible.

### What is still unverified

Two *human* clients at one table. Everything above is one browser against bots,
so hand-to-hand play between two real sessions — and anything that depends on
seat ordering between them — has not been exercised.
