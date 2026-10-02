/* The seam between hook-land and the app.
 *
 * SuitedApp is a class component, and it lives in its own React root — so it
 * can neither call hooks nor read context from the page around it. wagmi,
 * RainbowKit and the Solana wallet adapter are all hooks and context.
 *
 * So a component inside the providers (see Bridge.tsx) publishes an imperative
 * handle here, and the engine's wallet layer calls it. A module singleton is
 * usually a smell; here it is the only thing that crosses the boundary, and it
 * is written exactly once per mount by a component that owns the hooks.
 *
 * Everything returns a promise and may reject: a wallet dialog is a person
 * deciding, and "they closed it" has to travel back as a normal failure.
 */

export type SolanaWalletRow = {
  /** The adapter's own name — 'Phantom', 'Solflare'. Used to select it. */
  name: string;
  icon: string;
  /** Installed and ready, as opposed to merely known about. */
  ready: boolean;
};

export type EvmWalletRow = {
  /** wagmi's connector id. Pass it back to `connect`. */
  id: string;
  name: string;
  icon: string | null;
  /** Announced by the browser right now, as opposed to merely offered. */
  ready: boolean;
};

export type EvmBridge = {
  /** Every EVM wallet wagmi can see. wagmi discovers EIP-6963 announcements on
   *  its own, so a browser with MetaMask and Rabby yields two entries. */
  wallets(): EvmWalletRow[];
  /** Connect. With a connector id, goes straight to that wallet; without one,
   *  opens RainbowKit's picker — which is where WalletConnect and Coinbase
   *  live. Resolves to an address, rejects if the person backs out. */
  connect(connectorId?: string): Promise<string>;
  /** personal_sign, in the account currently connected. */
  signMessage(message: string): Promise<string>;
  /** The EIP-1193 provider behind the active connector, so the money paths in
   *  engine/wallet-evm.ts keep working unchanged. */
  getProvider(): Promise<unknown>;
  address(): string | null;
  disconnect(): Promise<void>;
};

export type SolanaBridge = {
  /** Wallets the Wallet Standard has announced in this browser. */
  wallets(): SolanaWalletRow[];
  /** Select and connect one by name. Resolves to a base58 address. */
  connect(walletName: string): Promise<string>;
  /** signMessage, returned base58-encoded — which is how the gateway will
   *  receive it and how Solana tooling conventionally writes signatures. */
  signMessage(message: string): Promise<string>;
  /** Sign a transaction the gateway built (base64 wire format) and hand back
   *  the signed one, also base64. The wallet asks the person to approve it;
   *  sending it is the caller's job. */
  signTransaction(base64: string): Promise<string>;
  address(): string | null;
  disconnect(): Promise<void>;
};

const notReady = (what: string) => () => {
  throw new Error(`${what} is not ready yet — the wallet providers have not mounted`);
};

export const bridge: { evm: EvmBridge | null; solana: SolanaBridge | null } = {
  evm: null,
  solana: null,
};

/** Throws a readable error rather than `undefined is not a function` when
 *  something asks for a chain whose providers failed to mount. */
export function requireEvm(): EvmBridge {
  if (!bridge.evm) notReady('the EVM wallet')();
  return bridge.evm!;
}

export function requireSolana(): SolanaBridge {
  if (!bridge.solana) notReady('the Solana wallet')();
  return bridge.solana!;
}
