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
  /**
   * On a phone: the wallet app's own "open this page in my browser" link.
   *
   * A phone has no extensions, so a mobile browser discovers no wallet and
   * never will. What every one of these apps does have is a browser of its
   * own, in which the wallet IS injected — so the way in is to reopen this
   * page there, where the ordinary connect works as it does on a desktop.
   * `url` is the page to open and `origin` who is asking; each is the app's
   * documented universal link, so a phone without the app lands on its
   * install page instead of a dead scheme. Absent where the app has no such
   * link at all (Rabby), and that wallet is simply not offered on a phone.
   */
  mobile?: (url: string, origin: string) => string;
}

/** Where the extracted marks live. One file per catalogue id. */
const ICON = (id: string) => `/wallets/${id}.svg`;

const enc = encodeURIComponent;

/* The store pages and app links of the wallets that sign on BOTH chains — one
   extension, one app, listed once per chain below. */
const METAMASK_STORE = 'https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn';
const OKX_STORE = 'https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge';
// Takes the address bare, with no scheme: link.metamask.io/dapp/example.com/path
const metamaskApp = (url: string) => `https://link.metamask.io/dapp/${url.replace(/^https?:\/\//, '')}`;
// OKX's universal link wraps its own scheme, so both layers are encoded.
const okxApp = (url: string) => `https://www.okx.com/download?deeplink=${enc(`okx://wallet/dapp/url?dappUrl=${enc(url)}`)}`;

export const WALLET_CATALOGUE: CatalogueWallet[] = [
  { id: 'metamask', name: 'MetaMask', chain: 'evm', rdns: 'io.metamask', chromeStore: METAMASK_STORE, mobile: metamaskApp },
  { id: 'rabby', name: 'Rabby Wallet', chain: 'evm', rdns: 'io.rabby', chromeStore: 'https://chromewebstore.google.com/detail/rabby-wallet/acmacodkjbdgmoleebolmdjonilkdbch' },
  {
    id: 'coinbase', name: 'Coinbase Wallet', chain: 'evm', rdns: 'com.coinbase.wallet',
    chromeStore: 'https://chromewebstore.google.com/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad',
    mobile: (url) => `https://go.cb-w.com/dapp?cb_url=${enc(url)}`,
  },
  { id: 'okx', name: 'OKX Wallet', chain: 'evm', rdns: 'com.okex.wallet', chromeStore: OKX_STORE, mobile: okxApp },

  /* Solana, in the order the connect screen lists them. `name` is what each
     one announces over the Wallet Standard, which is what a detected wallet is
     matched on — so an installed one is never also offered as a download. */
  {
    id: 'phantom', name: 'Phantom', chain: 'solana', rdns: 'app.phantom',
    chromeStore: 'https://chromewebstore.google.com/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa',
    mobile: (url, origin) => `https://phantom.app/ul/browse/${enc(url)}?ref=${enc(origin)}`,
  },
  {
    id: 'binance', name: 'Binance Wallet', chain: 'solana',
    chromeStore: 'https://chromewebstore.google.com/detail/binance-wallet/cadiboklkpojfamcoggejbbdjcoiljjk',
    /* The one app here with no documented "open this page" link — its only
       published deep link is the WalletConnect pairing. So this is the
       wallet's own page, which opens the app (or its download) and leaves the
       visitor to reach this site from the app's browser themselves. */
    mobile: () => 'https://www.binance.com/en/web3wallet',
  },
  {
    id: 'bitget', name: 'Bitget Wallet', chain: 'solana',
    chromeStore: 'https://chromewebstore.google.com/detail/bitget-wallet/jiidiaalihmmhddjgbnbgdfflelocpak',
    mobile: (url) => `https://bkcode.vip?action=dapp&url=${enc(url)}`,
  },
  { id: 'metamask', name: 'MetaMask', chain: 'solana', chromeStore: METAMASK_STORE, mobile: metamaskApp },
  { id: 'okx', name: 'OKX Wallet', chain: 'solana', chromeStore: OKX_STORE, mobile: okxApp },
  {
    id: 'solflare', name: 'Solflare', chain: 'solana',
    chromeStore: 'https://chromewebstore.google.com/detail/solflare-wallet/bhhhlbepdkbapadjdnnojkbgioiodbic',
    mobile: (url, origin) => `https://solflare.com/ul/v1/browse/${enc(url)}?ref=${enc(origin)}`,
  },
  {
    id: 'backpack', name: 'Backpack', chain: 'solana', rdns: 'app.backpack.mobile',
    chromeStore: 'https://chromewebstore.google.com/detail/backpack/aflkmfhebedbjioipglgcbcmnbpgliof',
    mobile: (url, origin) => `https://backpack.app/ul/v1/browse/${enc(url)}?ref=${enc(origin)}`,
  },
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
  // Chrome on a phone says "Chrome" too, and installs nothing from that store.
  if (isMobileBrowser()) return null;
  return /chrome|chromium|crios|edg\//i.test(navigator.userAgent) ? entry.chromeStore : null;
}

/**
 * A phone or a tablet — a browser that cannot hold a wallet extension.
 *
 * iPadOS calls itself a Mac in the user agent; the touch points give it away.
 * False server-side, like `installUrl`: nothing renders a link before we know
 * what is asking.
 */
export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /android|iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * The link that reopens this site inside the wallet's own app, or null — off a
 * phone, or for a wallet whose app has no such link.
 *
 * It opens the connect screen rather than whatever page this is: the visitor
 * arrives in a browser that has never seen them, and signing in is the one
 * thing they came across to do.
 */
export function mobileOpenUrl(entry: CatalogueWallet): string | null {
  if (!entry.mobile || !isMobileBrowser() || typeof location === 'undefined') return null;
  return entry.mobile(`${location.origin}/connect`, location.origin);
}
