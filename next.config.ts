import type { NextConfig } from 'next';

/* The gateway is its own project — C:\projects\Poker-BE — and stays its own
   Node process: it owns the WebSocket upgrade and one stateful actor per table,
   and neither fits a Next route handler. Next serves the UI and nothing else.
 *
 * REST goes through this rewrite, so the browser sees a same-origin /api and
 * the gateway needs no CORS — which matters, because it sends no CORS headers
 * at all. The WebSocket cannot be rewritten (a rewrite carries no upgrade), so
 * the client dials the gateway directly via NEXT_PUBLIC_SUITED_WS; WebSocket is
 * not subject to CORS, so that one cross-origin call needs no server change
 * either.
 *
 * Two things about this proxy, both measured rather than assumed:
 *
 *  • Authorization survives it, so every signed call still authenticates.
 *  • Next does NOT add x-forwarded-for, but it does pass one through. The
 *    gateway rate-limits per client IP, so in production put both behind one
 *    reverse proxy that sets that header and run the gateway with
 *    TRUST_PROXY=1 — otherwise every player shares one bucket. Locally it makes
 *    no difference; every client is 127.0.0.1 either way. */
const BACKEND = process.env.SUITED_BACKEND ?? 'http://localhost:3000';

const nextConfig: NextConfig = {

  /* A self-contained server (.next/standalone) so the Docker image carries only
     what runs: no node_modules tree, and `node server.js` to start it. */
  output: 'standalone',

  /* The dev overlay's button sits bottom-left, which is exactly where the
     table's action bar puts FOLD — it covers the control a player reaches for
     under a clock. Off, so what you see while developing is what ships. */
  devIndicators: false,

  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND}/api/:path*` },
      { source: '/dev/:path*', destination: `${BACKEND}/dev/:path*` },
    ];
  },
};

export default nextConfig;
