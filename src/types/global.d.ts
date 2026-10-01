/* Browser surfaces the DOM lib does not describe, declared once rather than
   cast at each of the ~30 call sites that touch them.
   Nothing here changes behaviour: these are the shapes the code already
   assumed when it was JavaScript. */

/** EIP-1193 — the injected wallet provider, and EIP-6963's discovery event. */
interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<any>;
  on?(event: string, handler: (...args: any[]) => void): void;
  removeListener?(event: string, handler: (...args: any[]) => void): void;
  isMetaMask?: boolean;
  [key: string]: any;
}

interface Eip6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

interface Eip6963ProviderDetail {
  info: Eip6963ProviderInfo;
  provider: Eip1193Provider;
}

interface Window {
  /** The injected wallet, when the visitor has one. Absent is the normal case. */
  ethereum?: Eip1193Provider;
  /** Safari's prefixed AudioContext — still the only one on older iOS. */
  webkitAudioContext?: typeof AudioContext;
}

/** EIP-6963 announces providers by dispatching this on window. */
interface WindowEventMap {
  'eip6963:announceProvider': CustomEvent<Eip6963ProviderDetail>;
}
