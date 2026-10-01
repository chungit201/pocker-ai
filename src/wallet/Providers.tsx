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
import { useMemo, type ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';

import '@rainbow-me/rainbowkit/styles.css';
import { robinhoodTestnet, SOLANA_RPC } from './chains';
import WalletBridge from './WalletBridge';

/* WalletConnect needs a project id. Without one RainbowKit still offers every
   injected and Coinbase wallet, so the common path works out of the box and
   only the QR-code path is missing — which is the right default for a project
   that has not registered yet. */
const WC_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? '';

const wagmiConfig = WC_ID
  ? getDefaultConfig({
      appName: 'suited',
      projectId: WC_ID,
      chains: [robinhoodTestnet],
      ssr: false,
    })
  : createConfig({
      chains: [robinhoodTestnet],
      // Spelled out rather than left to the default: without a WalletConnect id
      // the injected connector is the only way in, and it is worth being able
      // to see that in the file rather than inferring it.
      connectors: [injected()],
      transports: { [robinhoodTestnet.id]: http() },
    });

const queryClient = new QueryClient();

export default function WalletProviders({ children }: { children: ReactNode }) {
  // No adapters: Wallet Standard discovery fills the list. Memoised because the
  // provider treats a new array as a new wallet set and re-runs discovery.
  const solanaWallets = useMemo(() => [], []);

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
          <ConnectionProvider endpoint={SOLANA_RPC}>
            <WalletProvider wallets={solanaWallets} autoConnect={false}>
              <WalletBridge />
              {children}
            </WalletProvider>
          </ConnectionProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
