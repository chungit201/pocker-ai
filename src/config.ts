/* The two switches that used to be <script> tags in index.html.
 *
 * The original page shipped with `window.SUITED_SERVER = null`, which put it in
 * offline demo mode: bots in the browser, a local RNG, no backend. The gateway
 * stripped that line on the way out, so the same file served from the server
 * talked to the server. Env vars carry that decision now, because a Next build
 * has no line to strip.
 *
 * The tri-state is deliberate and is read in engine terms by serverUrl():
 *
 *   undefined  no opinion — use the page's own origin, which is the
 *              single-origin deployment and the default here.
 *   null       explicitly offline: bots in the browser, no network.
 *   "https://…"  a gateway on another origin.
 */
const RAW = process.env.NEXT_PUBLIC_SUITED_SERVER;

export const SUITED_SERVER: string | null | undefined =
  RAW === undefined || RAW === '' ? undefined : RAW === 'null' || RAW === 'offline' ? null : RAW;

/** Forces the local bot table even when a gateway is configured. */
export const SUITED_OFFLINE = process.env.NEXT_PUBLIC_SUITED_OFFLINE === '1';
