# Wallet sign-in, two chains

The browser can now sign in with an EVM wallet or a Solana one.

**Both halves are live.** Against the deployed gateway a real secp256k1
signature is accepted by `/api/auth/verify` and a real ed25519 one by
`/api/auth/sol/verify`; each mints a session that survives a reload. Verified
by `tools/probe-live.mjs` and `tools/probe-reload-solana.mjs`, which sign with
keys generated per run rather than with placeholder bytes.

Solana landed on its own endpoints — `/api/auth/sol/challenge` and
`/api/auth/sol/verify` — rather than on the `chain` parameter this file
originally specified. That route still exists and still answers 400 to a base58
key, which for a while read as "Solana is not deployed" when what it actually
meant was "you are asking the EVM endpoint". See [gateway.md](gateway.md).

## What the browser does

Both chains follow the same three steps, which are the gateway's own, and
differ only in who signs and how an address and a signature are spelled.

```
POST /api/auth/challenge   { pubkey, chain }        → { nonce, message }
   …the wallet shows `message` to the player and signs it…
POST /api/auth/verify      { pubkey, nonce, signature, chain }  → { token, pubkey }
```

`chain` is new. It is `'evm'` or `'solana'`. A gateway that does not read it
behaves exactly as before, because the EVM payload is otherwise unchanged —
which is why nothing had to be coordinated to ship the EVM half.

| | EVM | Solana |
|---|---|---|
| `pubkey` | `0x…` checksummed, 20 bytes | base58, 32 bytes |
| signature | `0x…` hex, 65 bytes (secp256k1) | base58, 64 bytes (ed25519) |
| signing call | `personal_sign` | `signMessage` (Wallet Standard) |
| verified with | `viem.verifyMessage` | ed25519 over the raw UTF-8 message |

## What the gateway must add

`Poker-BE/src/auth.ts` today assumes EVM throughout: `challengeWithMessage`
rejects anything that is not an address with `isAddr`, and `verify` calls
`viem.verifyMessage`. Both need a branch on `chain`.

For Solana, the signature is over the **raw UTF-8 bytes of the message** — not
a hash, and with no prefix of the kind `personal_sign` adds. Verification is:

```ts
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const ok = nacl.sign.detached.verify(
  new TextEncoder().encode(message),
  bs58.decode(signature),
  bs58.decode(pubkey),
);
```

Two things to get right, because both are quiet failures:

- **The account id.** `accounts.id` is an EVM address today. A base58 Solana key
  is a different shape and the same player on two chains is two accounts unless
  something says otherwise. Simplest is to keep them separate and let the key
  itself carry the chain; anything else is a product decision, not a technical
  one.
- **The sign-in message.** `PUBLIC_HOST` goes into it so a wallet can show who
  is asking. The EIP-4361 layout says "Ethereum account"; Solana's equivalent
  (SIWS) says "Solana account". The browser sends `chain` with the challenge
  precisely so the gateway can word it correctly — a Phantom user told they are
  signing into an Ethereum account will reasonably refuse.

## How it is wired in the browser

The app is a class component inside its own React root, and every wallet library
here is hooks and context. So:

```
SuitedClient            creates the nested root
└─ WalletProviders      wagmi + RainbowKit + Solana adapter  (src/wallet/Providers.tsx)
   ├─ WalletBridge      holds the hooks, publishes an imperative handle
   └─ SuitedApp         calls that handle from engine/wallet.ts
```

The providers must be **inside** that root. React context does not cross a root
boundary, so mounting them on the page outside would leave the hooks with no
config and nothing would connect. `SuitedClient.tsx` says the same thing at the
point where it matters.

`src/wallet/bridge.ts` is a module singleton, which is usually a smell. Here it
is the only thing that crosses the hooks/class boundary, and it is written
exactly once per mount by the component that owns the hooks.

### The connect screen

The chain is chosen first, with a two-tab picker above the list: **ethereum**
and **solana**. That ordering is deliberate — the two sign in with different key
types against different verifiers, so which chain you are on is a real choice
and not a property of the wallet you happen to click. Picking it first also
means the list below only ever holds wallets that can finish the sign-in you
have started.

The tab carries a small dot when a wallet for that chain is actually installed,
so the choice is informed before it is made. `connectChain` stays null until the
player touches the picker; until then the screen resolves it to a chain that has
a wallet, preferring EVM when both or neither do. Someone running only Phantom
therefore does not land on an empty Ethereum list, and the common case — one
wallet, one chain — needs no interaction at all.

A chain with nothing installed shows a line above the list explaining that the
rows below are downloads rather than sign-ins. The list itself is never empty —
see the catalogue, below.

Within a chain, every wallet the browser announced gets its own row, on both
sides: wagmi discovers EIP-6963 announcements by itself, so a browser with
MetaMask and Rabby yields two rows, and the Solana adapter does the same through
the Wallet Standard.

**There is no catch-all row** opening RainbowKit's picker. Every row names one
wallet and does one thing. Setting `NEXT_PUBLIC_WALLETCONNECT_ID` adds
WalletConnect and Coinbase as rows of their own — they are wagmi connectors like
any other — which is the way to restore phone wallets without reintroducing a
row that stands for "something else".

### Wallets the browser does not have

Discovery only ever reports what is installed, so a browser with no extension
used to reach a screen holding a single sentence telling it to go and find one.
Now `src/engine/wallet-catalogue.ts` fills the rest of the list: every wallet it
names that was *not* announced gets a row marked **INSTALL**, which opens that
wallet's Chrome Web Store page in a new tab instead of trying to connect. Four
EVM wallets, three Solana ones; every URL checked to return 200.

Three things about it worth knowing:

- **Nothing polls for the result.** The extension lands, the page is reloaded or
  refocused, and the row turns DETECTED on the next render — which works only
  because `detectProviders()` is a function called at render rather than a
  constant computed once.
- **Chrome only.** `installUrl()` returns null in Firefox and Safari, where a
  Chrome Web Store link is useless. Those browsers still get the row — knowing
  the wallet exists is worth something — but it says NOT FOUND and offers no
  download it cannot honour.
- **Install rows carry the wallet's own mark**, from `public/wallets/*.svg`,
  served by this app. Nothing is fetched from a third party and no logo is drawn
  by hand: `tools/extract-wallet-icons.mjs` pulled six of them out of
  RainbowKit's bundled copies and the seventh out of Solflare's own adapter,
  which is installed transiently for that run and is not a dependency. Re-run it
  after a RainbowKit upgrade — the icons live in content-hashed chunks, which is
  why they are extracted and checked in rather than imported.

  The two-letter badge stays underneath. These are files now, not data URIs the
  wallet handed over, so a wrong path renders a blank disc and throws nothing —
  `probe-wallet.mjs` fails on any `<img>` with `naturalWidth` 0 for exactly that
  reason.

An installed wallet must not also appear as a download. `isAlreadyFound()`
matches on EIP-6963 rdns first and a normalised name otherwise — "Rabby Wallet",
"rabby" and "io.rabby" all collapse to one key. Both failure modes look
plausible on screen (MetaMask twice, or MetaMask hidden behind a download
button), so `probe-wallet.mjs` injects a wallet announcing itself as MetaMask —
which the catalogue also lists — and asserts exactly one row, DETECTED.

Two things this arrangement has already got wrong once, both now asserted by
`tools/probe-wallet.mjs`:

- An earlier version collapsed all EVM wallets into one picker row and labelled
  it with whichever wallet was discovered first. Someone running MetaMask and
  Rabby saw "rabby wallet · evm" and no sign the other existed — the row said it
  was one wallet while behaving as a menu of all of them. The probe injects two
  EIP-6963 wallets so that cannot come back unnoticed.
- wagmi always supplies a generic `injected` connector whether or not anything
  is installed. Listed unconditionally it puts a row on the screen that cannot
  connect; it is kept only when it is the sole way in — an older wallet that
  sets `window.ethereum` without announcing itself — and dropped otherwise.
  `--no-evm` and `--no-solana` exercise the empty states that result.

Each row carries the wallet's **own icon**, taken from what it announced about
itself — EIP-6963's `info.icon` for EVM, the adapter's `icon` for Solana. Both
are data URIs, so nothing is fetched and there is no logo to keep updated as
wallets rebrand. The two-letter badge stays underneath rather than being
replaced: a wallet that announced no icon, or whose data URI fails to decode,
still leaves a legible mark instead of an empty disc.

Solana wallets are discovered through the Wallet Standard; no wallet list is
configured and none should be. The kitchen-sink
`@solana/wallet-adapter-wallets` is deliberately **not** installed: it drags in
a Stellar SDK whose postinstall runs `yarn`, which fails outright on a machine
without it.

## Testing it

Two probes, and the difference between them is the point.

**Against the real gateway, with a real signature** — no setup beyond
`npm run dev`, since `.env.local` already points there:

```bash
node tools/probe-live.mjs
```

It generates a secp256k1 key per run, injects an EIP-1193 provider that signs
with it, and drives the whole flow: sign in, read the lobby, sit down, leave.
Because the signature is genuine, a 200 from `/api/auth/verify` means the
gateway ran its own `verifyMessage` and was satisfied — which is the one thing
the echo gateway can never tell you. The key is a throwaway on a play-money
deployment, and the probe gives the seat and the chips back when it finishes.

**Against the echo gateway, for the wallet plumbing** — this one needs
`SUITED_BACKEND` and `NEXT_PUBLIC_SUITED_WS` pointed back at `localhost:3000`,
otherwise its fake `0x11…11` signature is sent to the real gateway and rightly
refused:

```bash
node tools/echo-gateway.mjs      # :3000 — answers challenge/verify
npm run dev                      # :3001 with NEXT_PUBLIC_SUITED_SERVER blank
node tools/probe-wallet.mjs
```

It is still the one that covers the parts the live probe cannot: two EVM wallets
at once, the Solana sign-in the real gateway refuses, the chain picker, the
empty states and the icons.

The probe injects a fake EIP-1193 wallet and a fake Wallet Standard wallet, then
drives both sign-ins and reports what reached the gateway. Both currently mint a
session. It also checks the chain picker filters the list, and that each row's
icon actually decoded — an `<img>` with `naturalWidth` 0 is in the DOM and
invisible, which is the difference worth catching.

`--no-solana` leaves the Solana mock out, which is the common real case and the
only way to see the empty state for a chain.

**The echo gateway does not verify signatures** and says so in its own header.
What the probe proves is the browser half: a wallet is reached, a message of the
right shape is put in front of it, and what it signs is posted in the right
field. Whether a signature is *valid* is the gateway's job, and for Solana that
code does not exist yet.

### A note on the mock

Getting a fake Solana wallet discovered took three attempts, and each failure is
worth knowing about because a real wallet could hit the same rules:

- `standard:connect` and `standard:events` alone are not enough.
  wallet-adapter filters out any wallet without `solana:signTransaction` or
  `solana:signAndSendTransaction`, even though sign-in never sends a
  transaction.
- That feature must carry `supportedTransactionVersions`.
  `StandardWalletAdapter`'s constructor reads `.length` off it, so a wallet
  without it throws **before the adapter exists** — and nothing upstream catches
  that, so the whole page goes blank. Worth remembering if a user ever reports a
  white screen with an unusual wallet installed.
