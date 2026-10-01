/* Watches one live table over the socket and reports what actually happens.
 *
 * Answers a question the sit-and-leave probe raised but could not settle: does
 * this gateway deal hands? A seat that leaves while dealt in cannot be cashed
 * out until the hand is booked — `leaveSeat` in Poker-BE defers it — so a probe
 * that left and found its chips still gone was observing a hand in flight, not
 * a bug. This watches without sitting down, so it disturbs nothing.
 *
 *   node tools/watch-table.mjs            # first table in the lobby, 30s
 *   node tools/watch-table.mjs 60         # 60s
 */
import { WebSocket } from 'ws';

const REST = 'https://api.bloomcapital.market';
const seconds = Number(process.argv[2] ?? 30);

const post = (p, body, token) => fetch(REST + p, {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body ?? {}),
}).then((r) => r.json());

const lobby = await (await fetch(`${REST}/api/lobby`)).json();
const busiest = [...(lobby.tables ?? [])].sort((a, b) => (b.seated ?? 0) - (a.seated ?? 0))[0];
console.log('lobby seats: ' + (lobby.tables ?? []).map((t) => `${t.name} ${t.seated}/${t.maxSeats}`).join(' · '));
if (!busiest) { console.log('no tables'); process.exit(1); }

const { token } = await post('/api/auth/dev');
const { ticket } = await post('/api/ws-ticket', null, token);
console.log(`\nwatching "${busiest.name}" (${busiest.seated}/${busiest.maxSeats} seated) for ${seconds}s — not sitting down\n`);

const ws = new WebSocket(`${REST.replace(/^http/, 'ws')}/ws?table=${encodeURIComponent(busiest.id)}&ticket=${encodeURIComponent(ticket)}`);
const counts = new Map();
let hands = 0, lastPhase = null;

ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', tableId: busiest.id })));
ws.on('message', (d) => {
  let m;
  try { m = JSON.parse(String(d)); } catch { return; }
  counts.set(m.t, (counts.get(m.t) ?? 0) + 1);
  const st = m.state ?? m;
  if (st && typeof st.phase === 'string' && st.phase !== lastPhase) {
    lastPhase = st.phase;
    const seated = (st.seats ?? []).filter((s) => s && !s.empty).length;
    console.log(`  phase=${st.phase.padEnd(9)} hand#${st.handNo ?? '?'}  seated=${seated}  pot=${st.pot ?? 0}  board=${(st.board ?? []).length}`);
    if (st.phase !== 'idle') hands = Math.max(hands, st.handNo ?? 0);
  }
});
ws.on('error', (e) => console.log(`socket error: ${e.message}`));

await new Promise((r) => setTimeout(r, seconds * 1000));
try { ws.close(); } catch { /* already gone */ }

console.log(`\nframes: ${[...counts].map(([k, n]) => `${k}×${n}`).join(' ')}`);
console.log(hands > 0
  ? `hands observed: yes — highest hand number seen was ${hands}`
  : 'hands observed: none. Every table sat idle for the whole window, which is what an empty gateway looks like.');
