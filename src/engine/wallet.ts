// ══════════════════════════════════════════════════════════════════════════
// suited — THE MONEY SEAM.
//
// Everything that touches a wallet or the on-chain program goes through here.
// `engine/adapter.js` owns gameplay; this file owns identity and funds. The UI
// imports nothing else for either concern.
//
//   const w = createMockWallet()                    // demo
//   const w = createServerWallet({ endpoint })      // production
//
//   await w.connect('metamask')    → { address, label }
//   w.disconnect()
//   w.state()                      → { address, label, balance, avatar, wagered }
//   await w.buyIn({ tableId, amount })   → { sig }        deposits to the table
//   await w.cashOut({ tableId })         → { sig, amount } closes the seat out
//   w.addWagered(n)                → local xp accounting (volume, not luck)
//   w.setAvatar(i)
//   w.subscribe(fn)                → fn(state); returns unsubscribe
//
// The frontend never computes a balance itself: it renders w.state().balance and
// waits for the next publish. That is the property that makes the swap painless.
// ══════════════════════════════════════════════════════════════════════════

import {
  detectEvmProviders, ensureChain, evmChainTime, evmClaimJackpot, evmDeposit, evmErc20Balance, evmExplorerAddress, evmExplorerTx,
  evmProviderFor, evmRelock, evmRouterSweep, evmStake, evmStakeAllowance, evmStakingClaim, evmStakingEarned,
  evmStakingPosition, evmStakingPositions, evmStakingWithdraw,
  evmRedeemRakeback, evmRequestAddress, evmSignMessage, evmTokenBalance, evmWithdraw, evmWithdrawRake,
  explainEvmError,
  watchEvmProvider,
} from './wallet-evm';

/* The two chains the browser can sign on. Both are reached through a handle a
   component inside the React providers publishes — see src/wallet/bridge.ts
   for why it has to work that way. */
import { bridge, requireEvm, requireSolana } from '@/wallet/bridge';
import { WALLET_CATALOGUE, isAlreadyFound, installUrl, catalogueIcon, isMobileBrowser, mobileOpenUrl } from './wallet-catalogue';

// Re-exported so the page and the staking renderer can build explorer links
// without importing the EVM layer directly — and, more to the point, without
// any of them spelling the explorer's domain. Both take the `/api/chain` body
// (what the page keeps as `state.chain`) and return null when the deployment
// names no explorer, which is how every local and test build runs.
export { evmExplorerAddress as explorerAddress, evmExplorerTx as explorerTx };

/**
 * What the connect screen offers, asked at the moment of asking.
 *
 * Extensions inject late, so this is a function rather than a constant: called
 * on render, it is right by the time anyone reads it.
 *
 * One row per wallet, on both chains, from whatever the browser announced —
 * EIP-6963 for EVM, the Wallet Standard for Solana. Then every wallet in
 * `WALLET_CATALOGUE` that was NOT announced, carrying an `install` link rather
 * than a way to connect. So the list is never empty: a browser with no
 * extension at all still sees the wallets it could have and where to get them,
 * instead of a sentence telling it to go and find one.
 *
 * `detected` is what separates the two, and every visual difference on the row
 * hangs off it.
 */
export function detectProviders() {
  /* `icon` for a detected wallet is whatever it announced about itself — a data
     URI from EIP-6963's `info.icon` or from the Solana adapter. For a catalogue
     row it is a path under /wallets/, which this app serves itself. Null only
     where a detected wallet announced nothing, and the connect screen falls
     back to the two letters in `short`. Either way nothing is fetched from a
     third party. */
  const rows: { id: string; label: string; short: string; icon: string | null; detected: boolean; install?: string | null; open?: string | null; wc?: boolean }[] = [];

  let solana: { name: string; icon: string; ready: boolean }[] = [];
  try { solana = bridge.solana?.wallets() ?? []; } catch { /* providers not mounted */ }
  for (const w of solana.filter((w) => w.ready)) {
    rows.push({
      id: `solana:${w.name}`,
      label: w.name,
      short: w.name.slice(0, 2).toLowerCase(),
      // WalletConnect wears the same mark on both chains (public/wallets/),
      // not the one its Solana adapter happens to ship.
      icon: w.name === 'WalletConnect' ? '/wallets/walletconnect.png' : (w.icon || null),
      detected: true,
      /* Not a wallet in this browser but the way to one elsewhere: it is
         always "there", so the connect screen says what it does rather than
         that it was detected. */
      wc: w.name === 'WalletConnect',
    });
  }

  /* One row per EVM wallet the browser announced, the same as Solana gets.
     An earlier version collapsed all of them into a single row that opened
     RainbowKit's picker — and labelled that row with whichever wallet happened
     to be discovered first, so someone running MetaMask and Rabby was shown
     "rabby wallet" and no sign the other existed. The picker still has a row of
     its own below, because WalletConnect and Coinbase are not announced by the
     browser and cannot be listed here. */
  let evm: { id: string; name: string; icon: string | null }[] = [];
  try { evm = bridge.evm?.wallets() ?? []; } catch { /* providers not mounted */ }

  for (const w of evm) {
    rows.push({
      id: `evm:${w.id}`,
      label: w.name,
      short: w.name.slice(0, 2).toLowerCase(),
      icon: w.icon,
      detected: true,
      wc: w.id === 'walletConnect',
    });
  }

  /* There is still no catch-all row opening RainbowKit's picker — a row that
     stands for "something else" was removed on purpose and is not coming back.
     What follows is the opposite of that: each row names one wallet and does
     one thing. An undetected row cannot connect, and does not pretend to; it
     carries an `install` link and the connect screen renders it as a download
     rather than a sign-in.

     Already-installed wallets are filtered out so nothing is listed twice —
     see `isAlreadyFound` for why that match is on rdns before name. */
  /* Per chain, because a wallet can be present on one and not the other: an
     older MetaMask announces itself for EVM only, and matching its EVM row
     against the Solana catalogue would hide the Solana row that says so. */
  const found = rows.map((r) => ({
    chain: r.id.startsWith('solana:') ? 'solana' : 'evm',
    id: r.id.replace(/^(evm|solana):/, ''),
    name: r.label.replace(/\s·\s(evm|solana)$/, ''),
  }));
  const phone = isMobileBrowser();
  for (const entry of WALLET_CATALOGUE) {
    if (isAlreadyFound(entry, found.filter((f) => f.chain === entry.chain))) continue;
    /* On a phone the row's job changes: there is nothing to install into this
       browser, so it reopens the site inside the wallet's app instead (see
       `mobile` in the catalogue). A wallet whose app cannot do that has no
       way in from here at all, and a row that can only apologise is left out. */
    const open = mobileOpenUrl(entry);
    if (phone && !open) continue;
    rows.push({
      id: entry.chain === 'solana' ? `solana:${entry.name}` : `evm:${entry.id}`,
      label: entry.name,
      short: entry.name.slice(0, 2).toLowerCase(),
      // The wallet's own mark from public/wallets/. Same-origin, so nothing is
      // fetched from a third party; the two letters stay underneath in case the
      // file is ever missing.
      icon: catalogueIcon(entry),
      detected: false,
      /* Null off Chrome, where the store link would not work. The row still
         appears — knowing the wallet exists is worth something — but it offers
         no download it cannot honour. */
      install: installUrl(entry),
      open,
    });
  }

  return rows;
}

export function createMockWallet(seed: any = {}) {
  let st: any = {
    address: null, label: null,
    balance: seed.balance ?? 2480.5,
    avatar: seed.avatar ?? 1,
    wagered: seed.wagered ?? 18400,
    seat: null,
  };
  let subs = [];
  const publish = () => subs.forEach((f) => f({ ...st }));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const sig = () => {
    const hex = '0123456789abcdef';
    let x = (Date.now() ^ 0x9e3779b9) >>> 0, out = '0x';
    for (let i = 0; i < 64; i++) { x = Math.imul(x ^ (x >>> 15), 0x2545f491) >>> 0; out += hex[x % 16]; }
    return out;
  };

  // A stand-in wallet address for the no-server local demo (never on chain).
  const DEMO_ADDR = '0xd39a0f2c7b1e4a6d8f05e27df61790dfd2c94100';

  return {
    kind: 'mock',
    state: () => ({ ...st }),
    subscribe(fn) { subs.push(fn); fn({ ...st }); return () => { subs = subs.filter((f) => f !== fn); }; },
    async connect(provider) {
      await wait(1100);                       // stands in for the approve dialog
      st = { ...st, address: DEMO_ADDR, label: provider };
      publish();
      return { address: st.address, label: st.label };
    },
    disconnect() { st = { ...st, address: null, label: null }; publish(); },
    async buyIn({ tableId, amount }) {
      await wait(260);                        // stands in for confirmation
      st = { ...st, balance: Math.max(0, st.balance - amount), seat: { tableId, amount } };
      publish();
      return { sig: sig() };
    },
    async cashOut({ tableId, amount }) {
      await wait(260);
      st = { ...st, balance: st.balance + (amount || 0), seat: null };
      publish();
      return { sig: sig(), amount };
    },
    addWagered(n) { if (n > 0) { st = { ...st, wagered: st.wagered + n }; publish(); } },
    setAvatar(i) { st = { ...st, avatar: i }; publish(); },
  };
}

/* ── server-backed wallet ──────────────────────────────────────────────────
   Identity and balances against the gateway. Same surface as the mock, so the
   views are untouched.

   Two ways in:
     • a real EVM wallet — connect, sign a nonce, get a session, then fund the
       bankroll with real deposits/withdrawals against the escrow contract.
     • 'guest' — a throwaway server-side identity with a faucet balance, so a
       group can be playing each other without anyone installing anything.

   Balances here are the gateway's ledger, reconciled against the chain.       */

export function createServerWallet({ endpoint, onSession = (_token?: any, _address?: any) => {}, storageKey = 'suited:session', scope = null }: any = {}) {
  /* `st` is a bag that grows: `evmProviderId` is only ever present once an EVM
     wallet has signed in, and a guest session never has one. Typed as the union
     of everything it might carry, TS would still have to be told at each of the
     eleven read sites that the field is optional — so it is `any` here and the
     shape is documented by the literal, as it was in JavaScript. */
  let st: any = { address: null, label: null, balance: 0, walletBalance: null, avatar: 'index-as', achievements: [], level: { level: 0, title: 'Fish' }, wagered: 0, seat: null };
  let token = null;
  let subs = [];
  const publish = () => subs.forEach((f) => f({ ...st }));

  /* ── session persistence ─────────────────────────────────────────────────
     The token is this identity's only handle to its bankroll and its seat. A
     page refresh throws away every in-memory value, so without keeping it a
     reload comes back a stranger: the gateway holds a dropped player's seat for
     a short grace keyed by pubkey, but a freshly minted guest token is a
     different pubkey — so the player lands in the lobby while their chips sit in
     a seat they can no longer reach. Persisting the token across a reload is
     what lets the reconnect present the same pubkey and drop back into the seat.

     localStorage, so the session is "remember me": it survives a refresh, a tab
     close and a browser restart — a returning player is still signed in, the way
     other sites behave. It is not open-ended: the server token carries a 12h TTL
     and `tokenLive` below drops a stored one the moment it is past expiry, so a
     stale credential is never presented. disconnect() clears it, which is the
     explicit sign-out. Every access is guarded: storage can be absent or throw
     (private mode, embedded webviews), and a wallet that cannot read it must
     still run. */
  const store = () => {
    try { return globalThis.localStorage || null; } catch { return null; }
  };
  const persist = () => {
    const s = store();
    if (!s) return;
    try {
      if (token) s.setItem(storageKey, JSON.stringify({ t: token, l: st.label, e: st.evmProviderId ?? null }));
      else s.removeItem(storageKey);
    } catch { /* full or blocked — the session simply won't survive a reload */ }
    // Every token write already funnels through here — sign-in, the faucet
    // identity, dropSession — which makes this the one hook that cannot be
    // forgotten by a later caller that sets `token` and persists it.
    armExpiry();
  };
  // A token past its expiry would only fail the WebSocket upgrade and leave the
  // page stuck reconnecting, so it is treated as absent. The payload is the
  // base64url half before the dot — `{ pubkey, exp }`; the MAC is the server's
  // to check. We read exp only, to avoid handing a dead token to the router.
  const tokenExp = (t) => {
    try {
      const payload = String(t).split('.')[0];
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return typeof json.exp === 'number' ? json.exp : null;
    } catch {
      return null;
    }
  };
  const tokenLive = (t) => {
    const exp = tokenExp(t);
    return exp != null && exp > Date.now();
  };
  /** Whose session IS this? Read from the token itself — st.address may not
   *  be populated yet when the resume runs, and comparing against an empty
   *  field is how a valid session gets dropped on every reload. */
  const tokenPubkey = (t) => {
    try {
      const payload = String(t).split('.')[0];
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).pubkey ?? null;
    } catch {
      return null;
    }
  };
  /** One place a session dies, shared by disconnect, the account watcher and
   *  the resume — never through a possibly-unbound \`this\`. */
  const dropSession = () => {
    stopEvmWatch?.();
    token = null;
    persist();
    st = { ...st, address: null, label: null, evmProviderId: null, chain: null, balance: 0, walletBalance: null };
    publish();
    forgetWallet();
  };

  /* Signing out used to end only OUR session; the wallet's own connection to
     the page lived on. Harmless with an extension, which the next sign-in
     simply asks again — but a WalletConnect pairing is a live session with
     one particular app, and the library also remembers that app as "the
     wallet" for this site. So on a phone, sign out of Binance and the next
     tap on WalletConnect did not offer a list at all: the old session was
     still there, and every request deep-linked straight back into Binance.
     Ending the session and forgetting the choice is what makes the next
     sign-in a fresh one, with the wallet picked again. */
  const forgetWallet = () => {
    try { bridge.solana?.disconnect().catch(() => {}); } catch { /* not mounted */ }
    try { bridge.evm?.disconnect().catch(() => {}); } catch { /* not mounted */ }
    const s = store();
    if (!s) return;
    try {
      // WalletConnect's own note of which app to deep-link, and AppKit's
      // memory of the last wallet: both are what re-opened Binance unasked.
      for (const k of [
        'WALLETCONNECT_DEEPLINK_CHOICE',
        '@appkit/recent_wallets', '@appkit/wallet_id', '@appkit/wallet_name', '@appkit/solana_wallet',
        '@appkit/connections', '@appkit/connection_status', '@appkit/connected_namespaces',
      ]) s.removeItem(k);
    } catch { /* storage blocked — the session was still ended above */ }
  };

  /* `tokenLive` above only ever runs on the boot resume, so a 12h TTL that
     elapses while the page just sits there was never noticed by anything: the
     header kept rendering a signed-in address over a session the gateway had
     already stopped honouring, and the table's reconnect ground against a 401
     it cannot see. The token states its own expiry, so schedule it — and route
     through dropSession(), which is already the one place a session dies. */
  let expiryTimer = null;
  const armExpiry = () => {
    clearTimeout(expiryTimer);
    expiryTimer = null;
    if (!token) return;
    const exp = tokenExp(token);
    if (exp == null) return;            // unreadable — the server still judges it
    const ms = exp - Date.now();
    if (ms <= 0) { dropSession(); return; }
    // setTimeout saturates (and fires immediately) past ~24.8 days. A 12h TTL
    // never comes close, but a hand-issued long-lived token would, and a
    // session that retires itself on sight is worse than one that waits.
    if (ms > 2 ** 31 - 1) return;
    expiryTimer = setTimeout(() => { expiryTimer = null; dropSession(); }, ms);
  };

  // Adopt any saved session synchronously, so token() is already populated by
  // the time the first route resolves on boot. address/balance are filled in by
  // the refresh() the app fires next; an expired or unreadable token is cleared.
  (() => {
    const s = store();
    if (!s) return;
    let saved = null;
    try { saved = s.getItem(storageKey); } catch { return; }
    if (!saved) return;
    try {
      const { t, l, e } = JSON.parse(saved);
      if (t && tokenLive(t)) { token = t; st = { ...st, label: l || 'guest', evmProviderId: e ?? null }; }
      else { try { s.removeItem(storageKey); } catch { /* ignore */ } }
    } catch {
      try { s.removeItem(storageKey); } catch { /* ignore */ }
    }
    // This branch adopts a token by reading, never by persisting, so it is the
    // one write persist() does not cover — and the one that matters most: a
    // resumed session is exactly the one whose expiry is already ticking.
    armExpiry();
  })();

  const api = async (path, opts: any = {}) => {
    const res = await fetch(`${endpoint}${path}`, {
      ...opts,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
    const body = await res.json().catch(() => ({}));
    /* A 401 on a call we signed means this session is over — not that the
       request was malformed. Callers could not tell the difference before:
       every failure arrived as the same bare Error, so a dead session showed up
       as "unauthorised" in a toast while the header still displayed the
       address and nothing retired the token. It is dropped here, at the one
       place every signed call passes through.

       `/api/auth/**` is excluded on purpose: that is the sign-in flow itself,
       where a 401 means "this signature did not verify" and there is no
       session to end. Guarded on `token` too — without one, a 401 just means
       sign in, which is not news. */
    if (res.status === 401 && token && !path.startsWith('/api/auth/')) {
      dropSession();
      // Callers switch on `.code` to tell a dead session from a rejected call.
      const err: any = new Error(body.error || 'your session expired \u2014 sign in again');
      err.code = 'session_expired';
      throw err;
    }
    if (!res.ok) throw new Error(body.error || `${path} failed (${res.status})`);
    return body;
  };

  /**
   * The connected wallet's own token balance — funds available *to* deposit,
   * as opposed to the bankroll, which is what the program already holds.
   *
   * Without this the deposit page shows "bankroll 0" to somebody holding 500
   * USDC and looks broken. They are different numbers and both belong on screen.
   */
  async function walletTokens() {
    const info = await chainInfo().catch(() => null);
    if (!info || !info.enabled || !st.address) return null;
    if (info.kind === 'solana') {
      try {
        const cfg = await solConfig();
        const r = await solRpc(cfg, 'getTokenAccountsByOwner', [st.address, { mint: cfg.mint }, { encoding: 'jsonParsed' }]);
        return (r.value || []).reduce((n, a) => n + Number(a.account.data.parsed.info.tokenAmount.uiAmount || 0), 0);
      } catch {
        return null;
      }
    }
    if (info.kind === 'evm') {
      try {
        return Number(await evmTokenBalance(info, st.address)) / 1e6;
      } catch {
        return null;
      }
    }
    return null;
  }

  async function refresh() {
    const me = await api('/api/me');
    st = {
      ...st, balance: me.balance / 1e6, address: me.pubkey, label: st.label || 'guest',
      // Cosmetics + progress, rehydrated from the server so a reload keeps them
      // and the picker knows what is unlocked.
      avatar: me.avatar || st.avatar || 'index-as',
      achievements: (me.achievements || []).map((a) => a.code),
      level: me.level || st.level,
    };
    publish();
    // Best-effort: a wallet balance we cannot read must not block the bankroll.
    refreshWallet();
    return st;
  }

  /* Re-read what the wallet holds, on chain.

     Kept separate from `refresh` and awaitable, because the two figures settle
     at different times and the caller sometimes has to wait for this one. A
     deposit credits the bankroll as soon as the gateway's indexer sees the
     event, which is well before an RPC read of the wallet reflects the tokens
     leaving it. `refresh` fires this and moves on, so anything that polls the
     bankroll to completion — a deposit, a withdrawal — must then await this
     once more, or the wallet figure stays at whatever it was before the
     transfer and the page shows money the player no longer has. */
  async function refreshWallet() {
    const walletBalance = await walletTokens().catch(() => null);
    if (walletBalance !== null && walletBalance !== st.walletBalance) {
      st = { ...st, walletBalance };
      publish();
    }
    return st.walletBalance;
  }

  /* One read after a transfer is not enough: the RPC can answer with the
     pre-transfer balance for several seconds, and publishing that figure is
     what kept the page showing money the player had just moved. Poll until
     the figure leaves its pre-transfer value, then stop — a transfer that
     really moved tokens must change it, so "unchanged" means "not yet".
     Bounded, because an RPC that never catches up must not hang the caller:
     the last read stands and the next refresh corrects it. */
  async function settleWallet(before) {
    for (let i = 0; i < 10; i++) {
      const now = await refreshWallet();
      if (now !== null && now !== before) return now;
      await new Promise((r) => setTimeout(r, 600));
    }
    return st.walletBalance;
  }

  /* ── funding ─────────────────────────────────────────────────────────────
     One bankroll, funded on-chain, that every table draws from. Sitting down
     costs no transaction at all — it is a reservation against a balance the
     contract already guarantees.

     The wallet builds and signs its own deposit/withdraw transaction against
     the escrow contract; the gateway only prepares the amount (and, for a
     withdrawal, a one-time signed authorization) and watches the chain for the
     result — it can never move funds on its own.                             */

  let chainCache = null;
  let providerRef = null;

  /**
   * Re-attach the wallet extension after a reload, silently.
   *
   * A restored session brings back the token but not the live provider handle —
   * that only exists while a page is open — so `providerRef` starts null and the
   * next deposit or withdrawal would have to reconnect first. An EVM wallet that
   * already trusts the site answers `eth_accounts` without a prompt, so this
   * re-establishes the handle for a returning wallet user and stays silent for
   * everyone else: a guest session (no provider), a revoked approval, or no
   * extension at all. Any failure is swallowed.
   */
  async function resumeProvider() {
    if (!token || !st.label || st.label === 'guest') return;
    const info = await chainInfo().catch(() => null);
    if (info?.kind === 'evm') {
      const provider = evmProviderFor(st.evmProviderId ?? st.label ?? 'injected');
      if (!provider) return;
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        const addr = accounts?.[0] ? String(accounts[0]).toLowerCase() : null;
        providerRef = provider;
        // The TOKEN says whose session this is; st.address may still be empty
        // while /api/me is in flight, and racing it must not cost a session.
        const owner = tokenPubkey(token);
        if (addr && owner && addr !== owner) {
          // The wallet's active account is not the session's key — the page
          // can no longer speak for the session. Drop it.
          dropSession();
          return;
        }
        if (addr) startEvmWatch(provider);
      } catch { /* not trusted / user must reconnect explicitly — stays silent */ }
      return;
    }
  }

  let stopEvmWatch = null;
  function startEvmWatch(provider) {
    stopEvmWatch?.();
    stopEvmWatch = watchEvmProvider(provider, {
      onAccountsChanged: (addr) => {
        // The session belongs to the OLD key. Anything else would let the new
        // account act with the old account's money.
        const owner = tokenPubkey(token) ?? st.address;
        if (addr !== owner) dropSession();
      },
      onChainChanged: () => {
        // Money actions re-run ensureChain themselves; just let the UI know.
        publish();
      },
    });
  }

  /**
   * Wrap a sent transaction's hash as a receipt: the hash, plus where to go and
   * read it. The staking actions used to hand back a bare hash, which left the
   * page with nothing to link; every action that moves money now returns the
   * same `{ signature, explorer }` shape, and `explorer` is null on a build
   * with no explorer configured.
   */
  function receipt(info, hash) {
    return { signature: hash, explorer: evmExplorerTx(info, hash) };
  }

  /* ── Solana funding ───────────────────────────────────────────────────────
     A Solana wallet funds the bankroll through the gateway's /api/sol/*, which
     is a different shape from the EVM contract path above: the gateway builds
     the transaction, the wallet only signs it, and the gateway's scanner credits
     the bankroll once the transfer is final. Nothing here touches the EVM code. */
  const isSolAddress = (a) => !!a && !String(a).startsWith('0x');
  /** A Solana session is one whose key is not a 0x address. Read from the token
   *  as well as `st`, so a reload (which keeps only the token) still knows. */
  const isSolSession = () => st.chain === 'solana' || (!!token && isSolAddress(tokenPubkey(token)));
  let solCfg = null;
  async function solConfig() {
    if (!solCfg) solCfg = await api('/api/sol/config');
    return solCfg;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const solExplorerTx = (cfg, sig) =>
    `https://explorer.solana.com/tx/${sig}${cfg.cluster && cfg.cluster !== 'mainnet-beta' ? `?cluster=${cfg.cluster}` : ''}`;

  /** One JSON-RPC call to the cluster the gateway named for browsers. */
  async function solRpc(cfg, method, params) {
    const res = await fetch(cfg.rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const out = await res.json().catch(() => ({}));
    if (out.error) throw new Error(out.error.message || 'the Solana network refused that');
    return out.result;
  }

  /** The Solana wallet that signed in, connected and still the same account.
   *  The wallet adapter does not reconnect by itself after a reload. */
  async function solWallet() {
    const sol = requireSolana();
    if (sol.address() !== st.address) {
      await sol.connect(st.label);
      if (sol.address() !== st.address) {
        throw new Error('switch your wallet back to the account you signed in with');
      }
    }
    return sol;
  }

  /** Sign what the gateway built, then send it to the network. Returns the signature. */
  async function solSignAndSend(cfg, base64) {
    const sol = await solWallet();
    const signed = await sol.signTransaction(base64);
    try {
      return await solRpc(cfg, 'sendTransaction', [signed, { encoding: 'base64', preflightCommitment: 'confirmed' }]);
    } catch (err) {
      const m = String((err && err.message) || err);
      if (/no record of a prior credit|insufficient lamports|insufficient funds for fee/i.test(m)) {
        // Name the cluster: SOL held on devnet is invisible to a testnet RPC,
        // and "no SOL" to somebody looking at 5 SOL in their wallet reads as a bug.
        const where = cfg.cluster || 'this cluster';
        throw new Error(`this wallet has no SOL on Solana ${where} to pay the network fee — SOL on another cluster does not count; get some ${where} SOL first`);
      }
      throw err;
    }
  }

  /** Wait until the network reports the transaction at `level`, or give up. */
  async function solConfirm(cfg, signature, level = 'confirmed', ms = 60_000) {
    const rank = { processed: 1, confirmed: 2, finalized: 3 };
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const r = await solRpc(cfg, 'getSignatureStatuses', [[signature]]).catch(() => null);
      const s = r && r.value && r.value[0];
      if (s && s.err) throw new Error('the transaction failed on the network');
      if (s && rank[s.confirmationStatus] >= rank[level]) return;
      await sleep(1500);
    }
    throw new Error('the network is slow to confirm that transaction — check again in a minute');
  }

  /** A request the gateway queued answers 202 {jobId}; wait for its result. */
  async function solJob(jobId, ms = 90_000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const j = await api(`/api/sol/jobs/${jobId}`);
      if (j.status === 'done') return j.result;
      if (j.status === 'failed') throw new Error(j.error || 'that request failed');
      await sleep(1000);
    }
    throw new Error('the server is busy — try again in a moment');
  }

  /** Create the wallet's token account if it has none. It is the wallet that
   *  pays the rent, so this is a transaction the person has to approve. */
  async function solEnsureTokenAccount(cfg) {
    const r = await api('/api/sol/token-account', { method: 'POST' });
    if (!r.transaction) return;
    const sig = await solSignAndSend(cfg, r.transaction);
    await solConfirm(cfg, sig, 'finalized');
  }

  async function chainInfo() {
    if (isSolSession()) {
      const c = await solConfig().catch(() => null);
      if (c && c.enabled) {
        return {
          enabled: true, kind: 'solana', symbol: c.symbol, cluster: c.cluster, mint: c.mint,
          minDeposit: c.minDeposit, minWithdraw: c.minWithdraw, faucet: !!c.faucet, paused: c.paused,
        };
      }
    }
    if (!chainCache) {
      chainCache = await api('/api/chain');
    }
    return chainCache;
  }

  return {
    kind: 'server',
    state: () => ({ ...st }),
    token: () => token,
    subscribe(fn) {
      subs.push(fn);
      fn({ ...st });
      return () => {
        subs = subs.filter((f) => f !== fn);
      };
    },

    async connect(name) {
      const info = await chainInfo().catch(() => null);
      // A transient /api/chain failure at the moment of a wallet click must
      // fail LOUDLY, not fall through to the guest path with an rdns id
      // nothing there understands.
      if (!info && name !== 'guest') {
        throw new Error('the server is unreachable right now — try again in a moment');
      }

      /* ── the two real chains ──────────────────────────────────────────────
         Both follow the same three steps the gateway defines — ask for a
         challenge, sign it, hand back the signature — and differ only in who
         does the signing and how an address and a signature are spelled. The
         `chain` field is what lets the gateway pick a verifier; an EVM-only
         gateway ignores it and the EVM path is unchanged from before. */
      if (name.startsWith('solana:')) {
        const walletName = name.slice('solana:'.length);
        const sol = requireSolana();
        const address = await sol.connect(walletName);
        const challenge = await api('/api/auth/sol/challenge', {
          method: 'POST',
          body: JSON.stringify({ pubkey: address, chain: 'solana' }),
        });
        const signature = await sol.signMessage(challenge.message);
        const out = await api('/api/auth/sol/verify', {
          method: 'POST',
          body: JSON.stringify({
            pubkey: address, nonce: challenge.nonce, signature, chain: 'solana',
            ...(scope ? { scope } : {}),
          }),
        });
        token = out.token;
        st = { ...st, address: out.pubkey ?? address, label: walletName, chain: 'solana' };
        persist();
        onSession(token, st.address);
        await refresh();
        return { address: st.address, label: walletName, balance: st.balance };
      }

      /* RainbowKit's picker, which covers injected wallets, Coinbase and —
         given a WalletConnect project id — every phone wallet. The connector's
         own EIP-1193 provider is kept in `providerRef` so the deposit and
         withdrawal paths below, which are written against that interface, work
         through it unchanged. */
      if (name === 'evm' || name.startsWith('evm:')) {
        const evm = requireEvm();
        // `evm:<connector>` goes straight to that wallet; a bare `evm` opens
        // the picker, which is where WalletConnect and Coinbase live.
        const connector = name.startsWith('evm:') ? name.slice('evm:'.length) : undefined;
        const address = await evm.connect(connector);
        providerRef = await evm.getProvider();
        try { if (info) await ensureChain(providerRef, info); } catch { /* deposit re-runs it */ }
        const challenge = await api('/api/auth/challenge', {
          method: 'POST',
          body: JSON.stringify({ pubkey: address, chain: 'evm' }),
        });
        const signature = await evm.signMessage(challenge.message);
        const out = await api('/api/auth/verify', {
          method: 'POST',
          body: JSON.stringify({
            pubkey: address, nonce: challenge.nonce, signature, chain: 'evm',
            ...(scope ? { scope } : {}),
          }),
        });
        token = out.token;
        st = { ...st, address: out.pubkey ?? address, label: 'wallet', evmProviderId: 'evm', chain: 'evm' };
        persist();
        onSession(token, st.address);
        startEvmWatch(providerRef);
        await refresh();
        return { address: st.address, label: 'wallet', balance: st.balance };
      }
      if (info?.kind === 'evm' && name !== 'guest') {
        const provider = evmProviderFor(name);
        if (!provider) throw new Error('no EVM wallet found — install MetaMask or Rabby');
        providerRef = provider;
        const address = await evmRequestAddress(provider);
        // Teach the wallet our chain while we have their attention; sign-in
        // itself is chain-agnostic, so a refusal here must not block it.
        try { await ensureChain(provider, info); } catch { /* deposit re-runs it */ }
        const challenge = await api('/api/auth/challenge', { method: 'POST', body: JSON.stringify({ pubkey: address }) });
        const signature = await evmSignMessage(provider, address, challenge.message);
        const out = await api('/api/auth/verify', {
          method: 'POST',
          body: JSON.stringify({ pubkey: address, nonce: challenge.nonce, signature, ...(scope ? { scope } : {}) }),
        });
        token = out.token;
        st = { ...st, address: out.pubkey ?? address, label: name, evmProviderId: name };
        persist();
        onSession(token, st.address);
        startEvmWatch(provider);
        await refresh();
        // The bankroll `refresh` just loaded, handed back directly: the app
        // routes on it straight away, before its own state has caught up.
        return { address: st.address, label: name, balance: st.balance };
      }
      // No wallet extension (or explicitly guest): take a faucet identity.
      if (name === 'guest') {
        const out = await api('/api/auth/dev', { method: 'POST', body: JSON.stringify({ name: 'guest' }) });
        token = out.token;
        st = { ...st, address: out.pubkey, label: 'guest' };
        persist();
        onSession(token, out.pubkey);
        await refresh();
        return { address: st.address, label: st.label, balance: st.balance };
      }
    },

    /**
     * Drop the session. EVM wallet extensions expose no disconnect(), so this
     * just clears our token and provider handle; the extension keeps its own
     * site-approval, which a fresh connect() re-uses.
     */
    disconnect() {
      dropSession();
    },

    /** "Sign out everywhere": the server bumps this account's session epoch,
     *  killing every outstanding token — this one included — then the local
     *  session drops. The answer to a link you wish you hadn't clicked. */
    async revokeAllSessions() {
      try {
        await api('/api/auth/revoke', { method: 'POST' });
      } finally {
        dropSession();
      }
    },

    /** The seat is created by the game socket; this reserves the funds view. */
    async buyIn({ tableId, amount }) {
      st = { ...st, seat: { tableId, amount } };
      publish();
      return { sig: null, pending: true };
    },
    async cashOut({ tableId }) {
      st = { ...st, seat: null };
      publish();
      const after = await refresh().catch(() => st);
      return { sig: null, amount: after.balance };
    },

    /* ── staking ──────────────────────────────────────────────────────────
       $SUITED locked in SuitedStaking, paying USDC. None of this touches the
       gateway: the contract holds the stake and pays the reward, so every call
       below is the player's own wallet against a contract address the page
       read from /api/staking. The gateway cannot stake, cannot withdraw and
       cannot stop either one. */

    /** Everything the staking page needs about THIS wallet. Reads only. */
    async stakingMine(staking, stakeToken) {
      const info = await chainInfo();
      if (!info.enabled || info.kind !== 'evm' || !st.address || !staking) return null;
      const ids = await evmStakingPositions(info, staking, st.address);
      const positions = (await Promise.all(ids.map((id) => evmStakingPosition(info, staking, id))))
        .filter(Boolean)
        // The contract's `positions` mapping is global, so a cleared id reads
        // back as the zero address; only rows this wallet actually owns count.
        .filter((p) => p.owner.toLowerCase() === st.address.toLowerCase())
        .sort((a, b) => a.lockEnd - b.lockEnd);
      const [earned, balance, allowance, chainTime] = await Promise.all([
        evmStakingEarned(info, staking, st.address),
        stakeToken ? evmErc20Balance(info, stakeToken, st.address) : Promise.resolve(null),
        stakeToken ? evmStakeAllowance(info, stakeToken, st.address, staking) : Promise.resolve(0n),
        evmChainTime(info),
      ]);
      // `now` is the CHAIN's clock, in ms — what decides whether a lock has
      // ended (see evmChainTime). Null leaves the page on the wall clock.
      return {
        address: st.address, positions, earned, balance, allowance,
        now: chainTime === null ? null : chainTime * 1000,
      };
    },

    /** Lock `amountBase` (the stake token's own base units) for `tier`.
     *  `onStep(key, status)` reports which prompt is live — see evmStake. */
    async stake(staking, stakeToken, amountBase, tier, onStep) {
      const info = await chainInfo();
      const provider = providerRef || evmProviderFor(st.evmProviderId ?? st.label ?? 'injected');
      if (!provider) throw new Error('connect a wallet to stake');
      await ensureChain(provider, info);
      try {
        return receipt(info, await evmStake(provider, info, st.address, {
          staking, stakeToken, amount: amountBase, tier, onStep,
        }));
      } catch (err) {
        const why = explainEvmError(err);
        throw why ? new Error(why) : err;
      }
    },

    /** Extend one position into a longer tier. Never shortens. */
    async relock(staking, id, tier, onStep) {
      const info = await chainInfo();
      const provider = providerRef || evmProviderFor(st.evmProviderId ?? st.label ?? 'injected');
      if (!provider) throw new Error('connect a wallet to extend a lock');
      await ensureChain(provider, info);
      try {
        return receipt(info, await evmRelock(provider, info, st.address, { staking, id, tier, onStep }));
      } catch (err) {
        const why = explainEvmError(err);
        throw why ? new Error(why) : err;
      }
    },

    /** Take a finished position's principal back. */
    async unstake(staking, id, onStep) {
      const info = await chainInfo();
      const provider = providerRef || evmProviderFor(st.evmProviderId ?? st.label ?? 'injected');
      if (!provider) throw new Error('connect a wallet to withdraw');
      await ensureChain(provider, info);
      try {
        return receipt(info, await evmStakingWithdraw(provider, info, st.address, { staking, id, onStep }));
      } catch (err) {
        const why = explainEvmError(err);
        throw why ? new Error(why) : err;
      }
    },

    /** Collect every position's USDC in one transaction. */
    async claimStakingRewards(staking, onStep) {
      const info = await chainInfo();
      const provider = providerRef || evmProviderFor(st.evmProviderId ?? st.label ?? 'injected');
      if (!provider) throw new Error('connect a wallet to claim');
      await ensureChain(provider, info);
      try {
        return receipt(info, await evmStakingClaim(provider, info, st.address, { staking, onStep }));
      } catch (err) {
        const why = explainEvmError(err);
        throw why ? new Error(why) : err;
      }
    },

    /** `{ enabled, minDeposit, mint, programId }` — drives the deposit screen. */
    chainInfo,
    walletTokens,

    /**
     * Fund the bankroll. `amount` is in display USDC; the on-chain minimum
     * (`minDeposit`, $1 as deployed) is checked here for a fast error and again
     * by the program, which is what actually enforces it.
     */
    async deposit(amount) {
      const info = await chainInfo();
      if (!info.enabled) throw new Error('deposits are not enabled on this server');
      const micro = Math.round(amount * 1e6);
      if (micro < info.minDeposit) {
        throw new Error(`minimum deposit is ${info.minDeposit / 1e6} USDC`);
      }
      if (info.kind === 'solana') {
        const cfg = await solConfig();
        const walletBefore = st.walletBalance;
        // The gateway opens a request and builds the transaction for it. When its
        // queue is busy it answers 202 first, and the transaction comes after.
        let dep = await api('/api/sol/deposits', { method: 'POST', body: JSON.stringify({ amount: micro }) });
        if (!dep.transaction) {
          const made = await solJob(dep.jobId);
          dep = await api(`/api/sol/deposits/${made.id}/transaction`, { method: 'POST' });
        }
        const signature = await solSignAndSend(cfg, dep.transaction);
        // The gateway credits the bankroll once the transfer is final (about
        // fifteen seconds). Telling it the signature only lets it look sooner.
        let credited = false;
        for (let i = 0; i < 60 && !credited; i++) {
          await sleep(2000);
          if (i % 4 === 1) api(`/api/sol/deposits/${dep.id}/submit`, { method: 'POST', body: JSON.stringify({ signature }) }).catch(() => {});
          const v = await api(`/api/sol/deposits/${dep.id}`).catch(() => null);
          if (!v) continue;
          if (v.status === 'credited') credited = true;
          else if (v.status === 'expired' || v.status === 'failed') {
            throw new Error('that deposit was not credited in time — if the transfer went through, support can match it from the signature ' + signature);
          }
        }
        await refresh().catch(() => {});
        await settleWallet(walletBefore);
        if (!credited) throw new Error('deposit sent, still confirming — your bankroll updates by itself in a minute');
        return { signature, balance: st.balance, explorer: solExplorerTx(cfg, signature) };
      }
      // A wrong-token deposit is the single most confusing failure on this
      // page: the wallet holds "USDC", the site wants "USDC", and the chain
      // rejects it because they are different mints. Name both.
      if (info.mint || info.kind === 'evm') {
        const holding = await walletTokens().catch(() => null);
        if (holding === 0) {
          const tokenId = info.mint ?? info.token;
          throw new Error(
            `No ${tokenId.slice(0, 6)}…${tokenId.slice(-4)} in this wallet, `
            + 'only that exact token is accepted',
          );
        }
      }
      const walletBefore = st.walletBalance;
      if (info.kind === 'evm') {
        const provider = providerRef || evmProviderFor(st.evmProviderId ?? st.label ?? 'injected');
        if (!provider) throw new Error('connect a wallet to deposit');
        await ensureChain(provider, info);
        let hash;
        try {
          hash = await evmDeposit(provider, info, st.address, micro);
        } catch (err) {
          const why = explainEvmError(err);
          throw why ? new Error(why) : err;
        }
        const balBefore = st.balance;
        for (let i = 0; i < 40; i++) {
          await refresh().catch(() => {});
          if (st.balance > balBefore) break;
          await new Promise((r) => setTimeout(r, 500));
        }
        await settleWallet(walletBefore);
        return { signature: hash, balance: st.balance, explorer: evmExplorerTx(info, hash) };
      }
    },

    /**
     * Withdraw to the connected wallet. The gateway co-signs only when the
     * player has no chips on a table; it answers 409 otherwise, which the UI
     * shows as-is.
     */
    /** Raw chain errors are not an error message. */
    _explain(err) {
      const evm = explainEvmError(err);
      if (evm) return new Error(evm);
      const m = String((err && err.message) || err);
      if (/WrongMint|0x1775|wrong mint/i.test(m)) {
        return new Error('that token is not the one this table program accepts');
      }
      return err;
    },

    async withdraw(amount) {
      const info = await chainInfo();
      if (!info.enabled) throw new Error('withdrawals are not enabled on this server');
      const micro = Math.round(amount * 1e6);
      const walletBefore = st.walletBalance;
      if (info.kind === 'solana') {
        const cfg = await solConfig();
        if (micro < info.minWithdraw) throw new Error(`minimum withdrawal is ${info.minWithdraw / 1e6} ${info.symbol}`);
        // Pays out to this wallet's own token account, which must exist.
        await solEnsureTokenAccount(cfg);
        let w = await api('/api/sol/withdrawals', { method: 'POST', body: JSON.stringify({ amount: micro }) });
        if (!w.id) w = await solJob(w.jobId);
        // The gateway's worker sends it; wait for the transfer to land.
        let last = w;
        for (let i = 0; i < 60; i++) {
          if (last.status === 'review') {
            await refresh().catch(() => {});
            throw new Error('that withdrawal is larger than the automatic limit and is waiting for approval');
          }
          if (last.status === 'confirmed') break;
          if (last.status === 'failed' || last.status === 'rejected') {
            await refresh().catch(() => {});
            throw new Error('the withdrawal could not be sent, so your balance was returned');
          }
          await sleep(2000);
          const list = await api('/api/sol/withdrawals').catch(() => null);
          last = (list && list.withdrawals.find((x) => x.id === w.id)) || last;
        }
        await refresh().catch(() => {});
        await settleWallet(walletBefore);
        if (last.status !== 'confirmed') throw new Error('withdrawal requested, still sending — it lands in your wallet shortly');
        return { signature: last.signature, balance: st.balance, explorer: last.signature ? solExplorerTx(cfg, last.signature) : null };
      }
      if (info.kind === 'evm') {
        const provider = providerRef || evmProviderFor(st.evmProviderId ?? st.label ?? 'injected');
        if (!provider) throw new Error('connect a wallet to withdraw');
        await ensureChain(provider, info);
        // The gateway attests "no chips in play" with a one-time signed
        // authorization; this wallet submits its own transaction and is paid
        // as the sender. Notify afterwards so the debit is immediate — the
        // gateway's watchers settle it from chain evidence either way.
        const prep = await api('/api/withdraw/prepare', { method: 'POST', body: JSON.stringify({ amount: micro }) });
        let hash;
        try {
          hash = await evmWithdraw(provider, info, st.address, {
            amount: micro, authId: prep.authId, deadline: prep.deadline, signature: prep.signature,
          });
        } catch (err) {
          const why = explainEvmError(err);
          throw why ? new Error(why) : err;
        }
        try {
          await api('/api/withdraw/submit', { method: 'POST', body: JSON.stringify({ authId: prep.authId, txHash: hash }) });
        } catch (err) {
          console.warn('[withdraw] the gateway was not told; its balance will lag until it reconciles', err);
        }
        await refresh().catch(() => {});
        await settleWallet(walletBefore);
        return { signature: hash, balance: st.balance, explorer: evmExplorerTx(info, hash) };
      }
    },

    /**
     * Redeem accrued rakeback straight to the connected wallet, in one signed
     * transaction. Mirrors `withdraw`: the gateway prepares a settler-co-signed
     * `redeem_rakeback`, the wallet signs and broadcasts, then we tell the
     * gateway the signature so it settles the off-chain `rakeback:` balance by
     * exactly what the chain moved — never a figure from here.
     */
    async redeemRakeback() {
      const info = await chainInfo();
      if (info.enabled && info.kind === 'evm') {
        const provider = providerRef || evmProviderFor(st.evmProviderId ?? st.label ?? 'injected');
        if (!provider) throw new Error('connect a wallet to claim');
        await ensureChain(provider, info);
        const prep = await api('/api/rakeback/prepare', { method: 'POST', body: JSON.stringify({}) });
        let hash;
        try {
          hash = await evmRedeemRakeback(provider, info, st.address, {
            amount: prep.amount, authId: prep.authId, deadline: prep.deadline, signature: prep.signature,
          });
        } catch (err) {
          const why = explainEvmError(err);
          throw why ? new Error(why) : err;
        }
        const out = await api('/api/rakeback/submit', { method: 'POST', body: JSON.stringify({ authId: prep.authId, txHash: hash }) })
          .catch(() => ({ redeemed: prep.amount, rakeback: null }));
        await refresh().catch(() => {});
        return { signature: hash, redeemed: out.redeemed ?? prep.amount, explorer: evmExplorerTx(info, hash) };
      }
      /* Everywhere else — a Solana session, a guest — rakeback is a ledger
         balance the gateway moves into the bankroll on request (Poker-BE,
         rule-rakeback §3.3): no transaction to sign, no receipt to link, and
         the money is in the bankroll at once. The gateway answers 400 below
         the minimum and locks the account row, so a double click cannot be
         paid twice. `toBankroll` tells the page which of the two happened. */
      const out = await api('/api/rakeback/claim', { method: 'POST' });
      if (typeof out.balance === 'number') { st = { ...st, balance: out.balance / 1e6 }; publish(); }
      await refresh().catch(() => {});
      return { signature: null, redeemed: out.claimed ?? 0, explorer: null, toBankroll: true };
    },

    /** This wallet's own claimable jackpot voucher (the most recent unclaimed
     *  win), or null. Drives whether the Claim button shows. */
    async jackpotVoucher() {
      const res = await api('/api/jackpot/voucher').catch(() => null);
      return (res && res.enabled && res.vouchers && res.vouchers[0]) || null;
    },

    /**
     * Claim a won daily jackpot to the connected wallet. The gateway signs a
     * voucher naming this address and the exact amount; the wallet submits its
     * own transaction to the standalone JackpotDistributor (never Suited). The
     * claim tx is reported back so the recent-winners page can link it for all —
     * verified there from the chain's own Claimed receipt, so a lost notify only
     * delays the link, never the money.
     */
    async claimJackpot() {
      const info = await chainInfo();
      if (!info.enabled) throw new Error('jackpot claims are not enabled on this server');
      if (info.kind !== 'evm') return null;
      const provider = providerRef || evmProviderFor(st.evmProviderId ?? st.label ?? 'injected');
      if (!provider) throw new Error('connect a wallet to claim');
      await ensureChain(provider, info);
      const res = await api('/api/jackpot/voucher');
      const v = res && res.enabled && res.vouchers && res.vouchers[0];
      if (!v) throw new Error('no jackpot to claim');
      let hash;
      try {
        hash = await evmClaimJackpot(provider, info, st.address, {
          amount: v.amount, dayId: v.dayId, deadline: v.deadline, signature: v.signature,
        }, res.distributor);
      } catch (err) {
        const why = explainEvmError(err);
        throw why ? new Error(why) : err;
      }
      try {
        await api('/api/jackpot/claimed', { method: 'POST', body: JSON.stringify({ txHash: hash }) });
      } catch (err) {
        console.warn('[jackpot] the gateway was not told about the claim; the link will lag', err);
      }
      await refresh().catch(() => {});
      return { signature: hash, explorer: evmExplorerTx(info, hash), amount: Number(v.amount) / 1e6 };
    },

    /**
     * Sweep collected rake out of the Suited contract to its pinned
     * `rakeDestination`. Admin-only in practice — `withdrawRake` is `onlyOwner`,
     * so this reverts for anyone else, and the connected wallet must BE the
     * owner key (the admin panel warns before it lets you try).
     *
     * Lives here rather than in the admin bundle because that bundle loads as a
     * blob module and cannot resolve module specifiers — it gets the wallet
     * handle through `mount(root, ctx)` instead and calls this.
     *
     * `amount` is micro-USDC, as a string or bigint. Caller decides the figure;
     * the contract enforces `amount <= rakeCollected`, and the panel clamps it
     * to what is safe to take without stranding accrued rakeback.
     */
    async sweepRake(amount, router) {
      const info = await chainInfo();
      if (!info.enabled || info.kind !== 'evm') throw new Error('no EVM deployment to sweep');
      const provider = providerRef || evmProviderFor(st.evmProviderId ?? st.label ?? 'injected');
      if (!provider) throw new Error('connect a wallet to sweep');
      await ensureChain(provider, info);
      let hash;
      try {
        // With a router owning the vault, `withdrawRake` belongs to the router
        // and a human calling it reverts. `router.sweep` moves the same money
        // and splits it — the stakers are paid by a hand sweep exactly as they
        // are by the daily one.
        hash = router
          ? await evmRouterSweep(provider, info, st.address, amount, router)
          : await evmWithdrawRake(provider, info, st.address, amount, info.contract);
      } catch (err) {
        const why = explainEvmError(err);
        throw why ? new Error(why) : err;
      }
      return { signature: hash, explorer: evmExplorerTx(info, hash) };
    },

    /**
     * This account's deposits and withdrawals, newest first, for the profile.
     *
     * Solana only — `/api/sol/deposits` and `/api/sol/withdrawals` are the only
     * history the gateway keeps, and both 404 with Solana switched off — so any
     * other session answers null and the profile shows no history section at
     * all. Each list is the gateway's newest 50 with no paging; that is its
     * limit, not ours.
     *
     * Amounts come back in display units, like every other figure this file
     * hands out, and `explorer` is built here so the page never spells the
     * explorer's domain.
     */
    async fundingHistory() {
      if (!token || !isSolSession()) return null;
      const cfg = await solConfig();
      if (!cfg || !cfg.enabled) return null;
      const [d, w] = await Promise.all([api('/api/sol/deposits'), api('/api/sol/withdrawals')]);
      // Epoch ms or an ISO string — `Date` reads both; anything else sorts last.
      const when = (t) => { const n = t == null ? NaN : new Date(t).getTime(); return Number.isFinite(n) ? n : 0; };
      const row = (kind, x) => ({
        kind,
        id: `${kind}:${x.id}`,
        // A deposit carries what was asked for (`amount`) and what the bankroll
        // actually gained (`credited`, null until it lands). The second is the
        // money that moved, so it wins when there is one.
        amount: Number(x.credited ?? x.amount ?? 0) / 1e6,
        status: String(x.status || ''),
        signature: x.signature || null,
        explorer: x.signature ? solExplorerTx(cfg, x.signature) : null,
        at: when(x.finishedAt ?? x.creditedAt ?? x.createdAt),
      });
      return [
        /* Every click on Deposit opens a request, paid or not. One that expired
           with no transfer behind it moved no money and is not history; one
           that carries a signature is kept, because that is the row support
           would need to match a transfer that was never credited. */
        ...((d && d.deposits) || []).filter((x) => x.status !== 'expired' || x.signature).map((x) => row('deposit', x)),
        ...((w && w.withdrawals) || []).map((x) => row('withdraw', x)),
      ].sort((a, b) => b.at - a.at);
    },

    /** Re-read the on-chain wallet balance. The funding screen calls this on
        open, so a balance that changed elsewhere is not shown stale. */
    refreshWallet,

    /** Silently re-attach the wallet extension after a reload (see
        `resumeProvider`). No-op for a guest session or a wallet that is gone. */
    resumeWallet: resumeProvider,

    /** Called by the adapter when the server pushes a new balance. */
    setBalance(balance) {
      st = { ...st, balance };
      publish();
    },
    async faucet() {
      if (isSolSession()) {
        // Test tokens minted on chain into this wallet (not the bankroll); deposit
        // them to play. The wallet needs its token account first.
        const cfg = await solConfig();
        const walletBefore = st.walletBalance;
        await solEnsureTokenAccount(cfg);
        await api('/api/sol/faucet', { method: 'POST' });
        await settleWallet(walletBefore);
        return st.balance;
      }
      const out = await api('/api/faucet', { method: 'POST' });
      st = { ...st, balance: out.balance / 1e6 };
      publish();
      return st.balance;
    },
    refresh,
    addWagered(n) {
      if (n > 0) {
        st = { ...st, wagered: st.wagered + n };
        publish();
      }
    },
    async setAvatar(id) {
      const before = st.avatar;
      st = { ...st, avatar: id };  // optimistic — reflect the pick immediately
      publish();
      /* Persist server-side. The gateway is the judge of what this account may
         wear — an unearned achievement or a prestige portrait above its level
         comes back 403 with the reason — so a refusal puts the old face back
         and is thrown for the picker to show. */
      try {
        await api('/api/avatar', { method: 'POST', body: JSON.stringify({ id }) });
      } catch (e) {
        st = { ...st, avatar: before };
        publish();
        throw e;
      }
    },

    /**
     * Sign an arbitrary server-issued message with the connected wallet and
     * return the signature. Used by the tournament register/unregister flow —
     * the same signing path the sign-in uses, surfaced so callers can authorise
     * a specific action. Throws for a guest identity (no key).
     */
    async signMessage(message) {
      const info = await chainInfo().catch(() => null);
      if (info?.kind === 'evm') {
        const provider = providerRef || evmProviderFor(st.evmProviderId ?? st.label ?? 'injected');
        if (!provider) throw new Error('connect a signing wallet to continue');
        return evmSignMessage(provider, st.address, message);
      }
      throw new Error('connect a signing wallet to continue');
    },
  };
}
