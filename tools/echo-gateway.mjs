/* A stand-in for the gateway, so the browser side can be exercised without
 * Postgres.
 *
 * It answers the endpoints the page calls on boot, and — the reason it exists
 * in this shape — the three-step sign-in: challenge, sign, verify. The
 * signature is NOT verified here. That is the gateway's job and the whole point
 * of the handshake; what this proves is the browser half, which is the half
 * that was written: that a wallet is reached, a message of the right shape is
 * put in front of a person, and whatever they sign comes back in the right
 * field.
 *
 * It also records every request, so `GET /__seen` shows what the Next rewrite
 * actually forwarded — which is how the Authorization and x-forwarded-for
 * questions were settled.
 */
import http from 'node:http';
import { randomBytes } from 'node:crypto';

const port = Number(process.env.PORT ?? 3000);
const seen = [];
const nonces = new Map();          // nonce -> { pubkey, chain, exp }
const sessions = new Map();        // token -> { pubkey, chain }

/* What the page reads before it will offer a wallet at all. `mode: 'evm'` is
   what the real gateway reports today; the Solana rows come from the browser's
   own Wallet Standard discovery and do not depend on this. */
const CHAIN = {
  kind: 'evm',
  mode: 'evm',
  chainId: Number(process.env.CHAIN_ID ?? 46630),
  rpcUrl: process.env.CHAIN_RPC_URL ?? 'https://rpc.testnet.chain.robinhood.com',
  explorerUrl: '',
  vault: '0x0000000000000000000000000000000000000000',
  token: '0x0000000000000000000000000000000000000000',
  paused: true,
  minDeposit: 0,
};

const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve) => {
  let s = '';
  req.on('data', (d) => { s += d; });
  req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch { resolve({}); } });
});

/* The sign-in message, in the layout Poker-BE's auth.ts builds. Reproduced so
   what the wallet shows a person here is what it would show them for real. */
function challengeMessage(domain, address, nonce, chain) {
  return [
    `${domain} wants you to sign in with your ${chain === 'solana' ? 'Solana' : 'Ethereum'} account:`,
    address,
    '',
    'Sign in to suited. This signature costs nothing and moves no funds.',
    '',
    `URI: http://${domain}`,
    'Version: 1',
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join('\n');
}

http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const p = url.pathname;
  seen.push({
    method: req.method, path: p,
    authorization: req.headers.authorization ?? null,
    xff: req.headers['x-forwarded-for'] ?? null,
    host: req.headers.host ?? null,
    origin: req.headers.origin ?? null,
  });

  if (p === '/__seen') return json(res, 200, seen);
  if (p === '/__sessions') return json(res, 200, [...sessions.entries()].map(([t, s]) => ({ token: t.slice(0, 8) + '…', ...s })));

  /* ── sign-in ─────────────────────────────────────────────────────────── */
  if (p === '/api/auth/challenge' && req.method === 'POST') {
    const { pubkey, chain = 'evm' } = await readBody(req);
    if (!pubkey) return json(res, 400, { error: 'pubkey is required' });
    const nonce = randomBytes(16).toString('hex');
    nonces.set(nonce, { pubkey, chain, exp: Date.now() + 5 * 60_000 });
    const domain = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:3001';
    console.log(`  challenge  ${chain.padEnd(6)} ${String(pubkey).slice(0, 14)}…`);
    return json(res, 200, { nonce, message: challengeMessage(domain, pubkey, nonce, chain) });
  }

  if (p === '/api/auth/verify' && req.method === 'POST') {
    const { pubkey, nonce, signature, chain = 'evm' } = await readBody(req);
    const n = nonces.get(nonce);
    nonces.delete(nonce);
    if (!n || n.exp < Date.now()) return json(res, 400, { error: 'that challenge has expired' });
    if (n.pubkey !== pubkey) return json(res, 400, { error: 'that challenge was issued for another address' });
    if (!signature) return json(res, 400, { error: 'no signature' });
    /* NOT verified — see the note at the top. The real gateway checks
       secp256k1 for evm and must check ed25519 for solana. */
    const token = randomBytes(24).toString('base64url');
    sessions.set(token, { pubkey, chain });
    console.log(`  verify     ${chain.padEnd(6)} ${String(pubkey).slice(0, 14)}…  sig ${String(signature).slice(0, 12)}… (NOT checked)`);
    return json(res, 200, { token, pubkey });
  }

  if (p === '/api/auth/dev' && req.method === 'POST') {
    const token = randomBytes(24).toString('base64url');
    const pubkey = '0x' + randomBytes(20).toString('hex');
    sessions.set(token, { pubkey, chain: 'guest' });
    return json(res, 200, { token, pubkey });
  }

  if (p === '/api/auth/revoke') return json(res, 200, { ok: true });

  /* ── what the page reads once it has a session ───────────────────────── */
  const auth = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  const me = sessions.get(auth);

  if (p === '/api/me') {
    if (!me) return json(res, 401, { error: 'unauthenticated' });
    return json(res, 200, {
      pubkey: me.pubkey, nickname: null, avatar: 'index-as',
      balance: 1000e6, wagered: 0, handsPlayed: 0, level: { level: 0, title: 'fish' },
      achievements: [], chain: me.chain,
    });
  }

  const BODIES = {
    '/api/chain': CHAIN,
    '/api/tables': { tables: [] },
    '/api/lobby': { tables: [], playersOnline: 0 },
    /* `handsThisWeek` is what the lobby's headline figure reads; without it the
       page renders "NaN hands today", which looks like a product bug and is
       only an incomplete mock. */
    '/api/stats': { handsDealt: 0, handsThisWeek: 0, usdgInPlay: 0, inPlay: 0, jackpot: 0, playersOnline: 0 },
    '/api/tournaments': { tournaments: [] },
    '/api/jackpot': { jackpot: 0, entrants: 0, days: [] },
    '/api/jackpot/voucher': { voucher: null },
    '/api/leaderboard': { players: 0, rows: [] },
    '/api/staking': { positions: [], days: [] },
    '/api/ws-ticket': { ticket: randomBytes(12).toString('base64url') },
  };
  if (BODIES[p]) return json(res, 200, BODIES[p]);

  return json(res, 404, { error: 'not found' });
}).listen(port, () => {
  console.log(`echo gateway on :${port}`);
  console.log('  signatures are accepted without being checked — see the note in this file');
});
