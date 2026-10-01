/* Wallets we can name even when the browser has none of them.
 *
 * Discovery only ever reports what is already installed — EIP-6963 for EVM, the
 * Wallet Standard for Solana — so a browser with no extension discovers nothing
 * and the connect screen had nothing to show but a sentence. This is the list
 * that fills that gap: every entry gets a row, and an undetected one sends the
 * visitor to the Chrome Web Store instead of trying to connect.
 *
 * It is a short hand-kept list rather than a generated one, on purpose:
 *
 *  • RainbowKit ships the same URLs, but half its wallet factories throw
 *    without a WalletConnect project id — MetaMask among them, which is the one
 *    that matters most — its icons are async, and Solflare is not in it at all.
 *    Importing connector machinery to read two strings is a bad trade.
 *  • The icons are the wallets' own marks, served from our own origin out of
 *    public/wallets/ and never fetched from a third party. They were extracted
 *    once by tools/extract-wallet-icons.mjs — RainbowKit bundles six of them
 *    and Solflare's own adapter the seventh — rather than drawn by hand, so
 *    nothing here is an approximation of someone's logo. Re-run that tool after
 *    a RainbowKit upgrade. A detected wallet still draws the icon it announced
 *    about itself; this is only for the ones that announced nothing, and the
 *    two-letter badge stays underneath either way.
 *
 * Every URL below was checked to return 200. They use chromewebstore.google.com
 * — the old chrome.google.com/webstore paths still redirect, but not forever.
 *
 * Chrome only. That is honest rather than lazy: the store link is useless in
 * Firefox or Safari, and `installUrl` returns null off Chrome so those browsers
 * get a row that explains the wallet exists without promising a download that
 * would not work.
 */

export interface CatalogueWallet {
  /** Matched against what discovery reports, so a detected wallet is not listed twice. */
  id: string;
  name: string;
  chain: 'evm' | 'solana';
  /** EIP-6963 rdns, where the wallet has one. The strongest match we get. */
  rdns?: string;
  chromeStore: string;
}

/** Where the extracted marks live. One file per catalogue id. */
const ICON = (id: string) => `/wallets/${id}.svg`;

export const WALLET_CATALOGUE: CatalogueWallet[] = [
  { id: 'metamask', name: 'MetaMask', chain: 'evm', rdns: 'io.metamask', chromeStore: 'https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn' },
  { id: 'rabby', name: 'Rabby Wallet', chain: 'evm', rdns: 'io.rabby', chromeStore: 'https://chromewebstore.google.com/detail/rabby-wallet/acmacodkjbdgmoleebolmdjonilkdbch' },
  { id: 'coinbase', name: 'Coinbase Wallet', chain: 'evm', rdns: 'com.coinbase.wallet', chromeStore: 'https://chromewebstore.google.com/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad' },
  { id: 'okx', name: 'OKX Wallet', chain: 'evm', rdns: 'com.okex.wallet', chromeStore: 'https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge' },

  { id: 'phantom', name: 'Phantom', chain: 'solana', rdns: 'app.phantom', chromeStore: 'https://chromewebstore.google.com/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa' },
  { id: 'solflare', name: 'Solflare', chain: 'solana', chromeStore: 'https://chromewebstore.google.com/detail/solflare-wallet/bhhhlbepdkbapadjdnnojkbgioiodbic' },
  { id: 'backpack', name: 'Backpack', chain: 'solana', rdns: 'app.backpack.mobile', chromeStore: 'https://chromewebstore.google.com/detail/backpack/aflkmfhebedbjioipglgcbcmnbpgliof' },
];

/* Names arrive spelled differently from every source: wagmi says "MetaMask",
   the Solana adapter says "Phantom", a connector id may be "io.metamask" or
   "metaMaskSDK". Reduce to letters and digits and drop a trailing "wallet", so
   "Rabby Wallet", "rabby" and "RabbyWallet" all land on the same key. */
const key = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '').replace(/wallet$/, '');

/**
 * Is this catalogue entry already present among the wallets discovery found?
 *
 * Matched on rdns first — it is the identifier wallets actually agree on — and
 * on a normalised name otherwise. Getting this wrong is visible either way: too
 * strict and MetaMask appears twice, once connectable and once as an install
 * link; too loose and an installed wallet is hidden behind a download button.
 */
export function isAlreadyFound(entry: CatalogueWallet, found: { id?: string; name?: string }[]): boolean {
  return found.some((f) => {
    if (entry.rdns && f.id && String(f.id).toLowerCase() === entry.rdns) return true;
    return key(f.name ?? '') === key(entry.name) || key(f.id ?? '') === key(entry.name);
  });
}

/**
 * The store link for a browser that can use one, or null.
 *
 * Chrome, Edge, Brave and Opera all install from the Chrome Web Store, and all
 * of them put "Chrome" in the user agent; Firefox and Safari do not, and are
 * the cases this returns null for. Server-side it is also null, which is right:
 * nothing should render a download link before we know what is asking.
 */
/** The wallet's mark, served from this origin. */
export function catalogueIcon(entry: CatalogueWallet): string {
  return ICON(entry.id);
}

export function installUrl(entry: CatalogueWallet): string | null {
  if (typeof navigator === 'undefined') return null;
  return /chrome|chromium|crios|edg\//i.test(navigator.userAgent) ? entry.chromeStore : null;
}
