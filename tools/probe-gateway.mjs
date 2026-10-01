/* Probes a live gateway end to end: sign in, read the account, take a ws
 * ticket, open the socket, and report the first frames it sends.
 *
 * This exists because the gateway is someone else's deployment and its
 * configuration is not visible from here. Everything it reports is measured,
 * not assumed — including whether a ws ticket is even honoured, which is the
 * one step that cannot be checked with curl alone.
 *
 *   node tools/probe-gateway.mjs                      # the live gateway, direct
 *   node tools/probe-gateway.mjs http://localhost:3001 wss://api.bloomcapital.market
 *
 * The second form is the one that matters, because it is the shape the browser
 * actually runs: REST through Next's rewrite on its own origin, the socket
 * dialled straight at the gateway. The two halves take different routes by
 * necessity — a rewrite carries no WebSocket upgrade — so testing REST and ws
 * against one base would not exercise what ships.
 *
 * Reads nothing from the app. Prints no token or ticket in full.
 */
import { WebSocket } from 'ws';

const REST = (process.argv[2] ?? 'https://api.bloomcapital.market').replace(/\/$/, '');
const WS = (process.argv[3] ?? REST.replace(/^http/, 'ws')).replace(/\/$/, '');

const hide = (s) => (typeof s === 'string' && s.length > 10 ? `${s.slice(0, 6)}…(${s.length})` : s);
const trim = (s, n = 220) => (s.length > n ? `${s.slice(0, n)}…` : s);

async function call(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(REST + path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json; the raw text is the finding */ }
  return { status: res.status, json, text, headers: res.headers };
}

const results = [];
const step = (name, ok, note) => { results.push({ name, ok, note }); console.log(`${ok ? ' ok ' : 'FAIL'}  ${name}${note ? ` — ${note}` : ''}`); };

console.log(`gateway: ${REST}\n`);

/* ── what the browser reads before anyone signs in ─────────────────────────── */
const chain = await call('/api/chain');
step('/api/chain', chain.status === 200,
  chain.json?.enabled === false
    ? 'enabled:false — on-chain deposits off (CHAIN_MODE is not evm)'
    : `enabled:${chain.json?.enabled} chainId:${chain.json?.chainId} paused:${chain.json?.paused}`);

const lobby = await call('/api/lobby');
step('/api/lobby', lobby.status === 200, `${lobby.json?.tables?.length ?? 0} tables`);

/* CORS is the thing that decides whether the browser may talk to this host
   directly or must go through Next's rewrite. Measured, because a missing
   header and a wrong one fail the same way in a browser. */
const cors = chain.headers.get('access-control-allow-origin');
step('CORS on /api/chain', true, cors ? `allow-origin: ${cors}` : 'no header — browser must go through the Next rewrite');

/* ── sign in ───────────────────────────────────────────────────────────────── */
const challenge = await call('/api/auth/challenge', {
  method: 'POST',
  body: { pubkey: '0x1111111111111111111111111111111111111111', chain: 'evm' },
});
step('/api/auth/challenge', challenge.status === 200 && !!challenge.json?.message,
  challenge.json?.message ? `host in message: ${challenge.json.message.split(' ')[0]}` : trim(challenge.text, 120));

const solChallenge = await call('/api/auth/challenge', {
  method: 'POST',
  body: { pubkey: '8xwEVf8y5UBmm3b2Z5Tn5oE8nqLxnZkxvSBYkzWvxkLv', chain: 'solana' },
});
step('/api/auth/challenge (solana)', solChallenge.status === 200,
  solChallenge.status === 200
    ? `accepted — says "${(solChallenge.json?.message ?? '').match(/with your (\w+) account/)?.[1] ?? '?'} account"`
    : `rejected (${solChallenge.status}) — solana sign-in not deployed yet`);

const dev = await call('/api/auth/dev', { method: 'POST', body: {} });
step('/api/auth/dev', dev.status === 200,
  dev.status === 200 ? `guest sign-in IS open on this host — pubkey ${dev.json?.pubkey?.slice(0, 10)}…` : `closed (${dev.status})`);

const token = dev.json?.token;
if (!token) { console.log('\nno token — cannot probe the authenticated half.'); process.exit(1); }

/* ── authenticated ─────────────────────────────────────────────────────────── */
const me = await call('/api/me', { token });
step('/api/me', me.status === 200, trim(JSON.stringify(me.json), 180));

const ticket = await call('/api/ws-ticket', { method: 'POST', token });
step('/api/ws-ticket', ticket.status === 200 && !!ticket.json?.ticket, `ticket ${hide(ticket.json?.ticket)}`);

/* ── the socket ────────────────────────────────────────────────────────────── */
const table = lobby.json?.tables?.[0]?.id;
if (!ticket.json?.ticket || !table) { console.log('\nno ticket or no table — cannot open the socket.'); process.exit(1); }

const url = `${WS}/ws?table=${encodeURIComponent(table)}&ticket=${encodeURIComponent(ticket.json.ticket)}`;
console.log(`\nsocket: ${WS}/ws?table=${table}&ticket=<ẩn>`);

const frames = await new Promise((resolve) => {
  const got = [];
  const ws = new WebSocket(url);
  const done = (why) => { try { ws.close(); } catch {} resolve({ got, why }); };
  const timer = setTimeout(() => done('timeout after 8s'), 8000);
  ws.on('open', () => {
    step('ws handshake', true, 'opened');
    // The server says nothing until the client introduces itself — `attach`
    // marks the connection `hello: false` and only a `hello` frame releases the
    // table state. An open socket that stays silent is this, not a fault.
    ws.send(JSON.stringify({ t: 'hello', tableId: table }));
  });
  ws.on('message', (d) => {
    got.push(String(d));
    // Three frames is enough to know the shape; the stream never ends on its own.
    if (got.length >= 3) { clearTimeout(timer); done('three frames'); }
  });
  ws.on('error', (e) => { clearTimeout(timer); step('ws handshake', false, e.message); done('error'); });
  ws.on('close', (code, reason) => { clearTimeout(timer); done(`closed ${code} ${reason}`); });
});

step('ws frames', frames.got.length > 0, `${frames.got.length} received (${frames.why})`);
for (const f of frames.got) {
  let t = f;
  try { const j = JSON.parse(f); t = `${j.t ?? j.type ?? '?'} — ${trim(JSON.stringify(j), 160)}`; } catch {}
  console.log(`      ${trim(t, 200)}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
