'use client';

/* Every wallet provider the app needs, in one wrapper.
 *
 * This must be mounted INSIDE the nested React root that SuitedClient creates,
 * not around it. React context does not cross a root boundary, so providers on
 * the page outside would be invisible to the app — the hooks in Bridge.tsx
 * would throw and nothing would connect. See the note in SuitedClient.tsx about
 * why that nested root exists at all.
 *
 * Solana deliberately ships no wallet list. Every current wallet — Phantom,
 * Solflare, Backpack — announces itself through the Wallet Standard, and
 * `@solana/wallet-adapter-react` picks those up on its own. The alternative,
 * @solana/wallet-adapter-wallets, drags in a Stellar SDK whose postinstall runs
 * yarn, which fails outright on a machine without it.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WalletAdapterNetwork, type Adapter } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';

import '@rainbow-me/rainbowkit/styles.css';
import { robinhoodTestnet, SOLANA_RPC } from './chains';
import WalletBridge from './WalletBridge';

/* WalletConnect: the way in for a wallet that is not in this browser — a phone
   wallet paired by QR code from a desktop, or, on the phone itself, an app the
   page hands off to and comes back from without leaving the ordinary browser.

   The project id (dashboard.reown.com) is a constant on purpose. It is not a
   secret — it rides in every visitor's browser and is checked against the
   domains allowed on that dashboard — and keeping it here means a build
   cannot lose WalletConnect to a missing variable. The variable still wins
   where it is set, for a deployment that has a project of its own. */
const WC_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || '3cde48e58e1d13223ac7b847f5764e69';

/* What the wallet shows the person it is asking to approve us. Read at call
   time, not at import: this module is also evaluated on the server, where
   there is no `location`. */
const wcMetadata = () => {
  const origin = typeof location === 'undefined' ? '' : location.origin;
  return {
    name: 'Suited',
    description: 'Onchain hold’em',
    url: origin,
    icons: origin ? [`${origin}/favicon.ico`] : [],
  };
};

/* One connector per way in, spelled out rather than taken from RainbowKit's
   default list. That list is built for RainbowKit's own picker: half of it is
   WalletConnect wallets that only work with its QR screen in front of them,
   and this app's connect screen calls connectors directly — a row for one of
   those would spin and time out. `showQrModal` is what makes the plain
   WalletConnect connector self-sufficient: it brings its own dialog, a QR code
   on a desktop and the list of wallet apps on a phone. */
const wagmiConfig = createConfig({
  chains: [robinhoodTestnet],
  connectors: [
    injected(),
    walletConnect({ projectId: WC_ID, showQrModal: true, metadata: wcMetadata() }),
  ],
  transports: { [robinhoodTestnet.id]: http() },
});

/* A WalletConnect session names one Solana chain, and the adapter knows two:
   mainnet and devnet. A devnet RPC asks for devnet; anything else — testnet
   included, for which it has no id — asks for mainnet, the one chain every
   wallet answers to. Signing a message is the same on all of them, and a
   transaction is sent by this page to the gateway's own RPC whichever chain
   the session was opened on. */
const WC_SOLANA_NETWORK = /devnet/i.test(SOLANA_RPC) ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet;

const queryClient = new QueryClient();

/* The Solana half, a component of its own so that loading the WalletConnect
   adapter re-renders only this and not the EVM providers above it. That is
   not tidiness: wagmi's hydration runs its reconnect on every render of its
   provider, so a re-render from here, mid sign-in, re-entered the connector
   bookkeeping and the account vanished from under the bridge — the row said
   "connector already connected" and nothing signed in. Kept below WagmiProvider,
   a state change here cannot reach it. */
function SolanaProviders({ children }: { children: ReactNode }) {
  /* Installed wallets need no adapter — Wallet Standard discovery fills the
     list. WalletConnect is the one that does, and it is loaded here rather
     than imported: it brings its dialog's whole UI kit with it, which has no
     business in the first paint or on the server. Held in state so the array
     is stable — the provider treats a new array as a new wallet set and
     re-runs discovery. Constructing the adapter opens nothing; the relay is
     only dialled when somebody picks the row. */
  const [solanaWallets, setSolanaWallets] = useState<Adapter[]>([]);
  useEffect(() => {
    let gone = false;
    /* Which chain the session asks for follows the gateway, not this build:
       it is the gateway's cluster the transactions are for, and it says which
       at /api/sol/config. The RPC-derived guess above stands in when that
       cannot be read — the offline demo, a gateway without Solana. */
    const network = fetch('/api/sol/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => (c && c.cluster
        ? (c.cluster === 'devnet' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet)
        : WC_SOLANA_NETWORK))
      .catch(() => WC_SOLANA_NETWORK);
    Promise.all([import('@walletconnect/solana-adapter'), network])
      .then(([{ WalletConnectWalletAdapter }, chain]) => {
        if (gone) return;
        /* The prefix is load-bearing. WalletConnect keeps one core per page in
           a global named after it, and the EVM connector above — an older
           release of the same library, initialised first — owns the unnamed
           one. Left to share it, this adapter's newer client calls a method
           that core does not have and the pairing dies before a QR code is
           drawn. A name of its own gives it its own core, and keeps the two
           chains' sessions in separate storage besides. */
        setSolanaWallets([new WalletConnectWalletAdapter({
          network: chain,
          options: { projectId: WC_ID, metadata: wcMetadata(), customStoragePrefix: 'suited-solana' },
        })]);
      })
      .catch(() => { /* no WalletConnect row; every other way in still works */ });
    return () => { gone = true; };
  }, []);

  return (
    <ConnectionProvider endpoint={SOLANA_RPC}>
      <WalletProvider wallets={solanaWallets} autoConnect={false}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default function WalletProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#8b5cf6',
            accentColorForeground: '#f6f3ff',
            borderRadius: 'medium',
          })}
          modalSize="compact"
        >
          <SolanaProviders>
            <WalletBridge />
            {children}
          </SolanaProviders>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
