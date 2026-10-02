// THE MONEY SEAM, Robinhood Chain half.
//
// Everything that touches an EVM wallet or the Suited contract goes through
// here; wallet.js delegates to this module whenever /api/chain answers
// kind:'evm'. Zero dependencies on purpose — the page has no bundler, and a
// live third-party CDN inside the deposit path is a supply-chain risk the
// old base58 hand-roll never took either. The contract surface is a handful
// of FIXED ABI shapes, so the encoding is ~80 lines of padding, and every
// selector below is pinned by a gateway test against the compiled ABI
// (services/gateway/test/evm-selectors.test.ts) — change the contract and
// that test fails before this file can drift.
//
// Wallet interop is EIP-6963 (providers announce themselves; we collect)
// with window.ethereum as the legacy fallback. Signing is the provider's
// job: personal_sign for sign-in and consent messages, eth_signTypedData_v4
// for the one-popup permit deposit, eth_sendTransaction for the rest.

/* ── pinned selectors (verified against the ABI by test — do not edit) ───── */

export const FN = {
  approve: '0x095ea7b3', //            approve(address,uint256)
  deposit: '0xb6b55f25', //            deposit(uint256)
  depositWithPermit: '0x4a970be7', //  depositWithPermit(uint256,uint256,uint8,bytes32,bytes32)
  withdraw: '0xa0abad80', //           withdraw(uint256,bytes32,uint256,bytes)
  redeemRakeback: '0xdddf889c', //     redeemRakeback(uint256,bytes32,uint256,bytes)
  claimJackpot: '0x6548b7ae', //       claim(uint256,uint256,uint256,bytes) — on JackpotDistributor
  withdrawRake: '0xe90ae59c', //       withdrawRake(uint256)
  routerSweep: '0xaa60e733', //        sweep(uint256) — on RakeRouter
  balanceOf: '0x70a08231', //          balanceOf(address)
  nonces: '0x7ecebe00', //             nonces(address)
  allowance: '0xdd62ed3e', //          allowance(address,address)
  // SuitedStaking. Note `stakingWithdraw` is withdraw(uint256) on the STAKING
  // contract — a different function from the vault's four-argument withdraw
  // above, which is why it is pinned separately.
  stake: '0x7b0472f0', //              stake(uint256,uint256)
  relock: '0xb2fb30cb', //             relock(uint256,uint256)
  stakingWithdraw: '0x2e1a7d4d', //    withdraw(uint256)
  stakingClaim: '0x4e71d92d', //       claim()
  positionsOf: '0xf867d46b', //        positionsOf(address)
  positionAt: '0x99fbab88', //         positions(uint256)
  earned: '0x008cc262', //             earned(address)
};

/** Contract custom errors → words a player can act on. */
export const ERRORS = {
  '0x5bbe8622': 'That is below the minimum deposit',
  '0xd93c0665': 'Deposits are paused right now, withdrawals still work',
  '0xf4d678b8': 'Your on-chain balance is smaller than that',
  '0xa4c91367': 'That authorization expired, request a fresh one',
  '0x639089d9': 'That authorization was already used',
  '0x043ffb3f': 'The authorization did not verify, request a fresh one',
  '0x1d5bd2f3': 'The rake pool cannot cover that claim right now',
  '0x53679ed5': 'That claim is over the per-transaction ceiling',
  '0xfebe5043': 'The vault cannot cover that right now, contact support',
  '0xabca3517': 'This wallet has never deposited',
  '0x2c5211c6': 'That amount is not valid',
  '0x08a4003b': 'No exit is pending for this wallet',
  '0x53d8d5b9': 'The exit delay has not passed yet',
  // JackpotDistributor.claim (AuthExpired 0xa4c91367 shares the message above).
  '0x7cdf17ad': 'Jackpot claims are paused right now',
  '0xc2ffbec2': 'This jackpot has already been claimed',
  '0x71c8b818': 'That prize is over the per-claim ceiling',
  '0x5cd5d233': 'The claim did not verify, reopen the app for a fresh voucher',
  '0x2c0861a9': 'The jackpot pool is still being funded, try again shortly',
  // Ownable2Step. Only ever seen on the admin rake sweep, which is onlyOwner —
  // a player never calls an owner function, so this cannot surface on the felt.
  '0x118cdaa7': 'This wallet is not the contract owner',
  // RakeRouter.
  '0xf512b278': 'The router refused: this wallet is neither its keeper nor its admin',
  '0x5cce0a5c': "The vault's rake destination is not the router, sweeps are off until it is",
  '0xc1aebd41': "That is over the router's remaining ceiling for today",
  '0x7bfa4b9f': 'The router refused: this wallet is not its admin',
  // SuitedStaking. (IsPaused 0x1309a563 is its own, distinct from the vault's.)
  '0x389f7e11': 'That is below the minimum stake',
  '0xc201b252': 'That lock has not ended yet',
  '0x70d645e3': 'That position is not yours',
  '0x21a9b143': 'That lock length does not exist',
  '0x8431a15a': 'This wallet already holds the maximum number of positions',
  '0xff7ae6ab': 'A lock can only be extended, never shortened',
  '0x1309a563': 'New locks are paused right now, withdrawing still works',
};

/* ── tiny ABI encoding for our fixed shapes ──────────────────────────────── */

const strip0x = (h) => (h.startsWith('0x') ? h.slice(2) : h);
const word = (hex) => strip0x(hex).padStart(64, '0');
const uint = (v) => word(BigInt(v).toString(16));
const addr = (a) => word(strip0x(a).toLowerCase());

/** encode fn(...static words) */
const enc = (selector, ...words) => selector + words.join('');

/** encode fn(uint256, bytes32, uint256, bytes) — our two auth calls. */
function encWithSig(selector, amount, authId, deadline, sig) {
  const sigHex = strip0x(sig);
  const len = sigHex.length / 2;
  const padded = sigHex.padEnd(Math.ceil(len / 32) * 64, '0');
  // 4 head slots: amount, authId, deadline, offset-to-bytes (0x80)
  return selector + uint(amount) + word(authId) + uint(deadline) + uint(0x80) + uint(len) + padded;
}

/** encode JackpotDistributor.claim(uint256 amount, uint256 dayId, uint256 deadline, bytes sig).
 *  Same head/tail shape as encWithSig, but dayId is a uint256, not a bytes32. */
function encClaim(amount, dayId, deadline, sig) {
  const sigHex = strip0x(sig);
  const len = sigHex.length / 2;
  const padded = sigHex.padEnd(Math.ceil(len / 32) * 64, '0');
  return FN.claimJackpot + uint(amount) + uint(dayId) + uint(deadline) + uint(0x80) + uint(len) + padded;
}

const utf8ToHex = (s) => '0x' + [...new TextEncoder().encode(s)].map((b) => b.toString(16).padStart(2, '0')).join('');

/* ── provider discovery (EIP-6963 + legacy fallback) ─────────────────────── */

const announced = new Map(); // rdns → { info, provider }
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (e) => {
    const d = e.detail;
    if (d?.info?.rdns && d.provider) announced.set(d.info.rdns, d);
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

// Robinhood Chain is a custom Arbitrum-Orbit EVM L2. A wallet that only serves a
// fixed chain list (Phantom's EVM mode) or a non-EVM chain (TronLink is Tron)
// still announces itself over EIP-6963, but it can neither add nor transact on
// this chain — offering it is a dead end that lands the player on a wallet that
// cannot sign in. Only wallets that can reach the chain belong on the list, so
// the known-incompatible families are filtered out by rdns/name, and the legacy
// window.ethereum fallback refuses a provider one of them injected.
const INCOMPATIBLE = ['phantom', 'tronlink', 'solflare', 'backpack', 'solana', 'bitcoin'];
function usableOnRobinhood(info) {
  const hay = `${info?.rdns ?? ''} ${info?.name ?? ''}`.toLowerCase();
  return !INCOMPATIBLE.some((bad) => hay.includes(bad));
}
const incompatibleInjected = (p) => !!(p && (p.isPhantom || p.isTron || p.isTronLink));

/**
 * The connect screen's rows. Announced EVM wallets that can reach Robinhood
 * Chain, each with its real name and icon; then a legacy window.ethereum entry
 * only if nothing announced but a (compatible) provider is injected anyway.
 */
export function detectEvmProviders() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('eip6963:requestProvider'));
  const rows = [...announced.values()]
    .filter((d) => usableOnRobinhood(d.info))
    .map((d) => ({
      id: d.info.rdns,
      name: d.info.name,
      icon: d.info.icon ?? null,
      detected: true,
      provider: d.provider,
    }));
  if (!rows.length && typeof window !== 'undefined' && window.ethereum && !incompatibleInjected(window.ethereum)) {
    rows.push({ id: 'injected', name: 'Browser wallet', icon: null, detected: true, provider: window.ethereum });
  }
  return rows;
}

export function evmProviderFor(id) {
  if (id === 'injected') return window.ethereum ?? null;
  return announced.get(id)?.provider ?? (window.ethereum ?? null);
}

/* ── the flows ───────────────────────────────────────────────────────────── */

const CHAIN_NAMES = { 46630: 'Robinhood Chain Testnet', 4663: 'Robinhood Chain' };

/** Make sure the wallet is on our chain, adding it first when unknown. */
export async function ensureChain(provider, info) {
  const hexId = '0x' + Number(info.chainId).toString(16);
  const current = await provider.request({ method: 'eth_chainId' });
  if (current === hexId) return;
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] });
  } catch (err) {
    // 4902: the wallet has never heard of this chain — teach it, then switch.
    // MetaMask Mobile and some bridges wrap it in -32603 with the real code
    // nested; match all the documented shapes.
    const unknown = err?.code === 4902
      || err?.data?.originalError?.code === 4902
      || /unrecognized chain|4902/i.test(String(err?.message ?? ''));
    if (!unknown) throw err;
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: hexId,
        chainName: CHAIN_NAMES[info.chainId] ?? `Chain ${info.chainId}`,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: [info.rpcUrl],
        ...(info.explorerUrl ? { blockExplorerUrls: [info.explorerUrl] } : {}),
      }],
    });
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexId }] });
  }
}

/** eth_requestAccounts → the wallet's active address (lowercase). */
export async function evmRequestAddress(provider) {
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  if (!accounts?.length) throw new Error('the wallet returned no accounts');
  return String(accounts[0]).toLowerCase();
}

/** personal_sign of a server-built message; returns the 0x signature. */
export function evmSignMessage(provider, address, message) {
  return provider.request({ method: 'personal_sign', params: [utf8ToHex(message), address] });
}

/**
 * Watch for the wallet changing under us. An account switch invalidates the
 * session (it belongs to the old key); a chain switch just gates money
 * actions until the player switches back.
 */
export function watchEvmProvider(provider, { onAccountsChanged, onChainChanged }) {
  if (!provider?.on) return () => {};
  const acct = (accounts) => onAccountsChanged(accounts?.[0] ? String(accounts[0]).toLowerCase() : null);
  const chain = (id) => onChainChanged(parseInt(String(id), 16));
  provider.on('accountsChanged', acct);
  provider.on('chainChanged', chain);
  return () => {
    provider.removeListener?.('accountsChanged', acct);
    provider.removeListener?.('chainChanged', chain);
  };
}

/** eth_call against the advertised public RPC (read-only, no wallet). */
async function rpcCall(info, to, data) {
  const res = await fetch(info.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
  });
  const out = await res.json();
  if (out.error) throw new Error(out.error.message ?? 'rpc error');
  return out.result;
}

/** The wallet's token balance, in micro units — the "ready to deposit" line. */
export async function evmTokenBalance(info, address) {
  const result = await rpcCall(info, info.token, enc(FN.balanceOf, addr(address)));
  return BigInt(result ?? '0x0');
}

/** Send a transaction from the player's wallet and wait for its receipt. */
/**
 * Gas for a call whose cost depends on WHEN it runs, with room to spare.
 *
 * The staking contract's gas moves between the moment a wallet estimates and
 * the block the transaction lands in: its storage writes cost ~20,000 more
 * going zero → non-zero than non-zero → non-zero, and whether a slot is zero
 * depends on time. The anvil rehearsal hit exactly this — claim, then stake a
 * few seconds later: the estimate saw the staker's accrued reward at zero, the
 * block saw it non-zero, and the stake ran out of gas with the limit spent to
 * the unit.
 *
 * So estimate it ourselves and add a margin that covers a few of those writes.
 * A limit above the need costs nothing — gas USED is what is paid — and a
 * failed estimate falls through to the wallet's own, which then shows the
 * wallet's own error rather than ours.
 */
async function withGasMargin(info, tx) {
  try {
    const res = await fetch(info.rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'eth_estimateGas',
        params: [{ from: tx.from, to: tx.to, data: tx.data }],
      }),
    });
    const out = await res.json();
    if (out.error || !out.result) return tx;
    const est = BigInt(out.result);
    return { ...tx, gas: '0x' + (est + est / 4n + 60_000n).toString(16) };
  } catch {
    return tx;
  }
}

/**
 * Wrap a caller's progress callback so a staking action can say which prompt a
 * person is actually waiting on — the wallet, or the chain.
 *
 * Reporting is never allowed to break the transaction: a throwing callback is
 * swallowed, and no callback at all is the common case.
 */
function track(onStep) {
  return (key, status) => {
    if (!onStep) return;
    try { onStep(key, status); } catch { /* the page's problem, not the chain's */ }
  };
}

/** The wallet refused, rather than the chain. EIP-1193 says 4001; wallets that
 *  do not set a code say so in the message, which `chainMessage` already reads
 *  for the same words further down. */
function rejected(err) {
  return err?.code === 4001 || /user rejected|user denied|denied|rejected the request/i.test(String(err?.message ?? ''));
}

async function sendAndWait(provider, info, tx, { gasMargin = false, onSent = null } = {}) {
  if (gasMargin) tx = await withGasMargin(info, tx);
  const hash = await provider.request({ method: 'eth_sendTransaction', params: [tx] });
  // Signed and broadcast. Everything after this is waiting on the chain, which
  // is a different kind of waiting from waiting on a person — a page that says
  // so can stop telling someone to check a wallet they have already used.
  if (onSent) { try { onSent(hash); } catch { /* a progress report never fails a send */ } }
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(info.rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt', params: [hash] }),
      });
      const rcpt = (await res.json()).result;
      if (rcpt) {
        if (rcpt.status !== '0x1') {
          // Out of gas says "try again" where a real revert says "you cannot" —
          // and a limit spent to the unit is how out-of-gas looks in a receipt.
          const spent = tx.gas && rcpt.gasUsed && BigInt(rcpt.gasUsed) >= BigInt(tx.gas);
          throw new Error(spent
            ? 'the transaction ran out of gas on-chain — nothing moved; try it again'
            : 'the transaction reverted on-chain');
        }
        return hash;
      }
    } catch (err) {
      // A reverted receipt is an answer; a transient RPC blip is not — the
      // transaction is in flight and one 502 must not report it as failed.
      if (/reverted on-chain|ran out of gas/.test(String(err?.message))) throw err;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('the transaction did not confirm in time — check the explorer');
}

/**
 * Deposit: one popup when the token supports permit (sign typed data, then a
 * single depositWithPermit transaction), two otherwise (approve, deposit).
 * A permit that fails for ANY reason falls back to the two-step path — the
 * front-run griefing defense is in the contract, and the allowance route
 * always works.
 */
export async function evmDeposit(provider, info, address, amountMicro) {
  let sent = false;
  if (info.permit) {
    try {
      const deadline = Math.floor(Date.now() / 1000) + 1200;
      const nonce = BigInt(await rpcCall(info, info.token, enc(FN.nonces, addr(address))));
      const typed = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' }, { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' }, { name: 'verifyingContract', type: 'address' },
          ],
          Permit: [
            { name: 'owner', type: 'address' }, { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' }, { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
        },
        primaryType: 'Permit',
        domain: {
          name: info.permit.name, version: info.permit.version,
          chainId: info.chainId, verifyingContract: info.token,
        },
        message: {
          owner: address, spender: info.contract,
          value: String(amountMicro), nonce: String(nonce), deadline: String(deadline),
        },
      };
      const sig = strip0x(await provider.request({
        method: 'eth_signTypedData_v4', params: [address, JSON.stringify(typed)],
      }));
      const r = '0x' + sig.slice(0, 64);
      const s = '0x' + sig.slice(64, 128);
      const v = parseInt(sig.slice(128, 130), 16);
      const data = FN.depositWithPermit + uint(amountMicro) + uint(deadline) + uint(v) + word(r) + word(s);
      /* `sent` is the whole point of this flag: everything below the broadcast
         inside `sendAndWait` — the 120-second receipt wait especially — throws
         AFTER the money has left. Falling back from there signs a second, full
         deposit, so a slow RPC turns one deposit into two. */
      return await sendAndWait(provider, info, { from: address, to: info.contract, data },
        { onSent: () => { sent = true; } });
    } catch (err) {
      /* Falling back is only safe while the money has demonstrably not moved.
         Three post-broadcast outcomes reach here, and they are not alike:
         a revert and an out-of-gas both mean the chain rejected it and nothing
         changed, so the approve route is still the right answer; a receipt that
         never landed inside two minutes means the transaction is IN FLIGHT and
         may yet confirm. Retrying that one signs a second full deposit and the
         player pays twice. `sendAndWait` already distinguishes them by message
         — the same two strings it rethrows on inside its own poll loop. */
      const settled = /reverted on-chain|ran out of gas/.test(String(err?.message ?? ''));
      if (sent && !settled) throw err;
      /* A cancelled signature is a cancelled deposit, not a reason to ask for
         an approval instead. Without this, dismissing the permit popup
         immediately produces a second popup for a route the player did not
         choose. */
      if (rejected(err)) throw err;
      console.warn('[wallet-evm] permit path failed before anything moved; falling back to approve + deposit', err);
    }
  }
  // Two-step: approve exactly the amount, then deposit it.
  await sendAndWait(provider, info, {
    from: address, to: info.token, data: enc(FN.approve, addr(info.contract), uint(amountMicro)),
  });
  return await sendAndWait(provider, info, {
    from: address, to: info.contract, data: enc(FN.deposit, uint(amountMicro)),
  });
}

/**
 * Execute a settler authorization the gateway prepared: the player's own
 * transaction, paid to their own address. Returns the tx hash for the
 * best-effort notify — the gateway's watchers settle it either way.
 */
export function evmWithdraw(provider, info, address, { amount, authId, deadline, signature }) {
  return sendAndWait(provider, info, {
    from: address, to: info.contract,
    data: encWithSig(FN.withdraw, amount, authId, deadline, signature),
  });
}

export function evmRedeemRakeback(provider, info, address, { amount, authId, deadline, signature }) {
  return sendAndWait(provider, info, {
    from: address, to: info.contract,
    data: encWithSig(FN.redeemRakeback, amount, authId, deadline, signature),
  });
}

/**
 * Claim a daily jackpot from the standalone JackpotDistributor — a separate
 * contract, never Suited. The gateway signs the voucher; the winner's own
 * transaction pulls exactly `amount` to their wallet. Returns the tx hash so the
 * caller can report it (and the recent-winners page can link it for everyone).
 */
export function evmClaimJackpot(provider, info, address, { amount, dayId, deadline, signature }, distributor) {
  return sendAndWait(provider, info, {
    from: address, to: distributor,
    data: encClaim(amount, dayId, deadline, signature),
  });
}

/**
 * Sweep collected rake out of the Suited contract. `onlyOwner`, and the
 * destination is NOT a parameter — the contract pays `rakeDestination` and
 * nothing else, so there is no address to get wrong here. The gateway holds
 * the settler key and cannot make this call; it is signed in the operator's
 * own browser with the owner wallet.
 */
export function evmWithdrawRake(provider, info, address, amount, contract) {
  return sendAndWait(provider, info, {
    from: address, to: contract,
    data: enc(FN.withdrawRake, uint(amount)),
  });
}

/** Map a raw provider/rpc error to words a player can act on. */
/* ── staking ──────────────────────────────────────────────────────────────
   The staking contract holds $SUITED and pays USDC. Every call here is the
   player's own wallet acting on their own position — there is no gateway in
   the path, no authorization to fetch, and nothing the house signs. A lock is
   between the staker and the contract. */

/** Read a staker's open position ids. Returns [] for a wallet with none. */
export async function evmStakingPositions(info, staking, address) {
  const result = await rpcCall(info, staking, enc(FN.positionsOf, addr(address)));
  const body = strip0x(result || '0x');
  if (body.length < 128) return [];
  // head: offset (0x20), then length, then the ids.
  const len = Number(BigInt('0x' + body.slice(64, 128)));
  const ids = [];
  for (let i = 0; i < len; i++) {
    ids.push(BigInt('0x' + body.slice(128 + i * 64, 192 + i * 64)));
  }
  return ids;
}

/** One position: who owns it, when the lock ends, which tier, how much. */
export async function evmStakingPosition(info, staking, id) {
  const result = await rpcCall(info, staking, enc(FN.positionAt, uint(id)));
  const body = strip0x(result || '0x');
  if (body.length < 384) return null;
  const at = (i) => body.slice(i * 64, (i + 1) * 64);
  return {
    id,
    owner: '0x' + at(0).slice(24),
    lockEnd: Number(BigInt('0x' + at(1))),
    tier: Number(BigInt('0x' + at(2))),
    amount: BigInt('0x' + at(3)),
    weight: BigInt('0x' + at(4)),
  };
}

/**
 * The chain's own clock — the latest block's timestamp, in seconds.
 *
 * A lock ends when `block.timestamp` passes it, not when the staker's laptop
 * says so. Judging it by `Date.now()` offers "withdraw" a few seconds early to
 * anyone whose clock runs ahead of the chain (the transaction then reverts
 * with StillLocked), and gets it wholly wrong for anyone whose clock is simply
 * set wrong. Null when the read fails — callers fall back to the wall clock.
 */
export async function evmChainTime(info) {
  try {
    const res = await fetch(info.rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBlockByNumber', params: ['latest', false] }),
    });
    const out = await res.json();
    return out.result && out.result.timestamp ? Number(BigInt(out.result.timestamp)) : null;
  } catch {
    return null;
  }
}

/** USDC earned across every position, claimable now. */
export async function evmStakingEarned(info, staking, address) {
  const result = await rpcCall(info, staking, enc(FN.earned, addr(address)));
  return BigInt(result ?? '0x0');
}

/** How much of the stake token the staking contract may already pull. */
export async function evmStakeAllowance(info, stakeToken, owner, staking) {
  const result = await rpcCall(info, stakeToken, enc(FN.allowance, addr(owner), addr(staking)));
  return BigInt(result ?? '0x0');
}

/** The wallet's balance of an arbitrary ERC20 — the stake token, here. */
export async function evmErc20Balance(info, token, address) {
  const result = await rpcCall(info, token, enc(FN.balanceOf, addr(address)));
  return BigInt(result ?? '0x0');
}

/**
 * Lock `amount` of the stake token for `tier`. Two popups when the contract
 * has no allowance yet, one when it does — approve once for a large amount and
 * every later stake is a single transaction. The contract PULLS inside `stake`,
 * so the approval has to land first.
 */
export async function evmStake(provider, info, address, { staking, stakeToken, amount, tier, onStep }) {
  const step = track(onStep);
  const have = await evmStakeAllowance(info, stakeToken, address, staking);
  if (have < BigInt(amount)) {
    step('approve', 'wallet');
    await sendAndWait(provider, info, {
      from: address, to: stakeToken,
      data: enc(FN.approve, addr(staking), uint(2n ** 255n)),
    }, { gasMargin: true, onSent: () => step('approve', 'confirming') });
    step('approve', 'done');
  } else {
    // Already approved — the page drops the row rather than ticking off a
    // prompt that never appeared.
    step('approve', 'skipped');
  }
  step('stake', 'wallet');
  const hash = await sendAndWait(provider, info, {
    from: address, to: staking,
    data: enc(FN.stake, uint(amount), uint(tier)),
  }, { gasMargin: true, onSent: () => step('stake', 'confirming') });
  step('stake', 'done');
  return hash;
}

/** Extend a position into `tier`. Never shortens: the contract refuses. */
export async function evmRelock(provider, info, address, { staking, id, tier, onStep }) {
  const step = track(onStep);
  step('relock', 'wallet');
  const hash = await sendAndWait(provider, info, {
    from: address, to: staking, data: enc(FN.relock, uint(id), uint(tier)),
  }, { gasMargin: true, onSent: () => step('relock', 'confirming') });
  step('relock', 'done');
  return hash;
}

/** Take a finished position's principal back. Never pausable. */
export async function evmStakingWithdraw(provider, info, address, { staking, id, onStep }) {
  const step = track(onStep);
  step('withdraw', 'wallet');
  const hash = await sendAndWait(provider, info, {
    from: address, to: staking, data: enc(FN.stakingWithdraw, uint(id)),
  }, { gasMargin: true, onSent: () => step('withdraw', 'confirming') });
  step('withdraw', 'done');
  return hash;
}

/** Collect every position's USDC in one transaction. */
export async function evmStakingClaim(provider, info, address, { staking, onStep }) {
  const step = track(onStep);
  step('claim', 'wallet');
  const hash = await sendAndWait(provider, info, {
    from: address, to: staking, data: enc(FN.stakingClaim),
  }, { gasMargin: true, onSent: () => step('claim', 'confirming') });
  step('claim', 'done');
  return hash;
}

/**
 * Sweep rake through the RakeRouter, as its admin.
 *
 * Once the router owns the vault, `withdrawRake` is the ROUTER's to call and a
 * human calling it reverts. The same money moves through `router.sweep`, which
 * is keeper-or-admin — and unlike the raw withdrawal it splits what it takes,
 * so an operator sweeping by hand pays the stakers their share exactly as the
 * daily keeper would.
 */
export function evmRouterSweep(provider, info, address, amount, router) {
  return sendAndWait(provider, info, {
    from: address, to: router, data: enc(FN.routerSweep, uint(amount)),
  });
}

export function explainEvmError(err) {
  const raw = String(err?.data?.data ?? err?.data ?? err?.message ?? err ?? '');
  for (const [selector, message] of Object.entries(ERRORS)) {
    if (raw.includes(strip0x(selector))) return message;
  }
  if (/user rejected|denied/i.test(raw)) return 'The wallet rejected the request';
  if (/insufficient funds/i.test(raw)) return 'Not enough ETH for gas, visit the faucet';
  return null;
}

/** The explorer link for a transaction, when the deployment names one. */
export function evmExplorerTx(info, hash) {
  return info && info.explorerUrl && hash
    ? `${info.explorerUrl.replace(/\/$/, '')}/tx/${hash}`
    : null;
}

/**
 * The explorer link for an address — a contract or a wallet.
 *
 * The counterpart of `evmExplorerTx`, and null under exactly the same
 * conditions: a deployment with no `SUITED_EXPLORER_URL` (every local build and
 * every test) has nowhere to send anyone, and the caller shows plain text
 * instead of a link that goes nowhere. Nothing in the app may spell the
 * explorer's domain itself.
 */
export function evmExplorerAddress(info, address) {
  return info && info.explorerUrl && address
    ? `${info.explorerUrl.replace(/\/$/, '')}/address/${address}`
    : null;
}
