'use client';

/* Fills the singleton in bridge.ts from inside the providers.
 *
 * Renders nothing. Its whole job is to hold the hooks — which can only be
 * called from a component — and hand the app an imperative handle it can call
 * from a class method.
 *
 * The promises here resolve on a wallet connecting and reject when the person
 * closes the dialog. That distinction matters: the connect screen shows
 * "approving…" until one or the other lands, and a dialog closed with no answer
 * would otherwise leave it there forever.
 */
import { useEffect, useRef } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { VersionedTransaction } from '@solana/web3.js';

import { bridge, describeWalletError } from './bridge';

/** Resolves when `read()` returns a value, or rejects on `timeoutMs`. */
function waitFor<T>(read: () => T | null | undefined, timeoutMs: number, onTimeout: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const v = read();
      if (v != null) return resolve(v);
      if (Date.now() - started > timeoutMs) return reject(new Error(onTimeout));
      setTimeout(tick, 120);
    };
    tick();
  });
}

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const bytesToB64 = (bytes: Uint8Array) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};

/** A wagmi connector as the connect screen wants it. */
const row = (c: { id: string; name: string; icon?: string; type?: string }) => ({
  id: c.id,
  name: c.name,
  // WalletConnect's connector announces no icon of its own; its mark is served
  // from this origin, the same file the Solana row uses (engine/wallet.ts).
  icon: c.type === 'walletConnect' ? '/wallets/walletconnect.png' : (c.icon ?? null),
  ready: true,
});

export default function WalletBridge() {
  const account = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();
  const solana = useWallet();

  /* The hooks re-run on every render; the handle must read the LATEST values,
     so it closes over a ref rather than over the render's own bindings. */
  const latest = useRef({ account, connectors, connectAsync, disconnectAsync, signMessageAsync, openConnectModal, solana });
  latest.current = { account, connectors, connectAsync, disconnectAsync, signMessageAsync, openConnectModal, solana };

  /** Whether a Solana connect sequence is already waiting on the wallet. */
  const solConnecting = useRef(false);

  useEffect(() => {
    bridge.evm = {
      wallets() {
        /* wagmi discovers EIP-6963 announcements by itself, so this is one
           entry per wallet the browser actually has — not a hardcoded list —
           followed by WalletConnect, which is not a wallet in this browser at
           all but the way to one that is somewhere else.
         *
         * The generic `injected` connector is the awkward one. wagmi always
         * provides it, whether or not anything is installed, and it duplicates
         * any wallet that announced itself properly. It is kept only when it is
         * the sole way in — an older wallet that sets window.ethereum without
         * announcing over EIP-6963 — and dropped otherwise. Listing it
         * unconditionally would put a row on the connect screen that cannot
         * connect, which is worse than an empty list that says so. */
        const all = latest.current.connectors;
        // WalletConnect is set apart first: it is always there, so counting it
        // as a "named" wallet would hide the injected fallback from the very
        // browser that needs it.
        const wc = all.filter((c) => c.type === 'walletConnect');
        const named = all.filter((c) => c.id !== 'injected' && c.type !== 'walletConnect');
        const hasInjected = typeof window !== 'undefined' && !!(window as { ethereum?: unknown }).ethereum;
        const local = named.length ? named : hasInjected ? all.filter((c) => c.id === 'injected') : [];
        return [...local, ...wc].map(row);
      },
      async connect(connectorId) {
        const l = latest.current;
        if (l.account.address) return l.account.address;

        if (connectorId) {
          const c = l.connectors.find((x) => x.id === connectorId);
          if (!c) throw new Error('that wallet is no longer available');
          await l.connectAsync({ connector: c });
          return waitFor(() => latest.current.account.address, 60_000, 'the wallet did not connect');
        }

        if (!l.openConnectModal) throw new Error('the wallet picker is unavailable');
        l.openConnectModal();
        // Two minutes: long enough for a hardware wallet or a phone QR scan,
        // short enough that an abandoned dialog does not hang the screen.
        return waitFor(() => latest.current.account.address, 120_000, 'no wallet was connected');
      },
      async signMessage(message) {
        const l = latest.current;
        // The account is passed explicitly: wagmi's types require it, and being
        // explicit also means the signature can only ever come from the address
        // the gateway issued the challenge for.
        if (!l.account.address) throw new Error('no wallet is connected');
        return l.signMessageAsync({ account: l.account.address, message });
      },
      async getProvider() {
        const l = latest.current;
        const c = l.account.connector;
        if (!c?.getProvider) throw new Error('this wallet exposes no provider');
        return c.getProvider();
      },
      address: () => latest.current.account.address ?? null,
      async disconnect() { await latest.current.disconnectAsync(); },
    };

    bridge.solana = {
      wallets() {
        return latest.current.solana.wallets.map((w) => ({
          name: w.adapter.name,
          icon: w.adapter.icon,
          // 'Installed' and 'Loadable' both mean it can be used right now.
          ready: w.readyState === 'Installed' || w.readyState === 'Loadable',
        }));
      },
      async connect(walletName) {
        const l = latest.current.solana;
        const found = l.wallets.find((w) => w.adapter.name === walletName);
        if (!found) throw new Error(`${walletName} is not available in this browser`);
        if (l.publicKey && l.wallet?.adapter.name === walletName) return l.publicKey.toBase58();

        /* One attempt at a time, for the whole sequence and not just the
           adapter's own `connect`.
         *
         * A wallet extension holds ONE pending approval per page, and a second
         * request arriving while the first is still open is a case several of
         * them answer with a generic internal error rather than a queue — which
         * is one of the ways "Unexpected error" is produced. The adapter's own
         * guard (`isConnectingRef` in WalletProviderBase.handleConnect) does
         * not cover this: it makes the second `connect()` resolve immediately
         * WITHOUT connecting, so the second caller would fall through to the
         * 120s wait below and sit there until it timed out. The row on the
         * connect screen is clickable throughout, so this is a click away. */
        if (solConnecting.current) throw new Error('a wallet connection is already waiting for approval');
        solConnecting.current = true;
        try {
          l.select(found.adapter.name as never);
          // `select` only sets which wallet; connecting is a separate step and
          // the adapter has to re-render before it will take it.
          await waitFor(() => (latest.current.solana.wallet?.adapter.name === walletName ? true : null), 5_000,
            'the wallet did not become selectable');
          try {
            await latest.current.solana.connect();
          } catch (e) {
            /* The adapter hands up a WalletError whose message is the wallet's
               own and whose CAUSE is the only part that says anything useful.
               Without this the report is "WalletConnectionError: Unexpected
               error" and there is nowhere to go from it. */
            const err = new Error(`${walletName} refused to connect: ${describeWalletError(e)}`);
            (err as { cause?: unknown }).cause = e;
            throw err;
          }
          const key = await waitFor(() => latest.current.solana.publicKey, 120_000, 'no wallet was connected');
          return key.toBase58();
        } finally {
          solConnecting.current = false;
        }
      },
      async signMessage(message) {
        const l = latest.current.solana;
        if (!l.signMessage) throw new Error('this wallet cannot sign messages');
        const sig = await l.signMessage(new TextEncoder().encode(message));
        return bs58.encode(sig);
      },
      async signTransaction(base64) {
        const l = latest.current.solana;
        if (!l.signTransaction) throw new Error('this wallet cannot sign transactions');
        const signed = await l.signTransaction(VersionedTransaction.deserialize(b64ToBytes(base64)));
        return bytesToB64(signed.serialize());
      },
      address: () => latest.current.solana.publicKey?.toBase58() ?? null,
      async disconnect() { await latest.current.solana.disconnect(); },
    };

    return () => { bridge.evm = null; bridge.solana = null; };
  }, []);

  /* Which Solana wallets the Wallet Standard has announced, reported once per
     change. Solana discovery is entirely out of this app's hands — a wallet
     either announces itself or it does not — so when the connect screen shows
     no Solana row this is the only way to tell "none installed" from "the
     adapter never saw it". Development only. */
  const seen = solana.wallets.map((w) => `${w.adapter.name} (${w.readyState})`).join(', ');
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    console.info(`[wallet] solana wallets: ${seen || 'none announced'}`);
  }, [seen]);

  return null;
}
