/* The chains this client knows how to sign on.
 *
 * The EVM one is not a chain wagmi ships — the gateway runs on Robinhood Chain
 * Testnet (46630), so it is defined here from the same values Poker-BE's
 * config.ts carries. Keep the two in step: the gateway tells the browser which
 * chain it expects via /api/chain, and a mismatch shows up as a wallet refusing
 * to switch rather than as an error anyone can read.
 */
import { defineChain } from 'viem';

const RPC = process.env.NEXT_PUBLIC_CHAIN_RPC_URL ?? 'https://rpc.testnet.chain.robinhood.com';
const EXPLORER = process.env.NEXT_PUBLIC_CHAIN_EXPLORER_URL ?? '';

export const robinhoodTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 46630),
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  ...(EXPLORER ? { blockExplorers: { default: { name: 'Explorer', url: EXPLORER } } } : {}),
  testnet: true,
});

/** Which Solana cluster to connect to. Only used for balance reads and the
 *  connection object the adapter wants — sign-in itself touches no RPC. */
export const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  ?? 'https://api.devnet.solana.com';
