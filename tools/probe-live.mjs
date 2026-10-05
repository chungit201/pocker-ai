/* Signs in to the REAL gateway with a REAL signature, in a real browser.
 *
 * tools/probe-wallet.mjs proves the browser half only: it signs with
 * 0x11…11 and the echo gateway accepts anything. That leaves the one question
 * that matters unanswered — would a genuine wallet actually get in? Here the
 * injected provider holds a freshly generated secp256k1 key and signs with
 * viem, so `/api/auth/verify` runs its own `verifyMessage` against it and the
 * session is only minted if the cryptography checks out.
 *
 * The key is generated per run and never leaves this process. It is a throwaway
 * identity on a play-money gateway, not a credential.
 *
 *   node tools/probe-live.mjs                        # against localhost:3001
 *   node tools/probe-live.mjs http://localhost:3001
 *
 * Needs `npm run dev` with .env.local pointing at the deployed gateway.
 */
import { chromium } from 'playwright';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

/* The seat screen and the table need a signed-in session, so the standalone
   contrast audit — which walks the nav from a cold landing page — can never
   reach them. This probe signs in, so it carries the audit the last two steps.
   The "take your seat" button was dark-on-dark for exactly as long as nothing
   measured it. */
import { AUDIT, describe } from './lib/contrast.mjs';

const url = process.argv[2] ?? 'http://localhost:3001';
const account = privateKeyToAccount(generatePrivateKey());
console.log(`gateway via: ${url}`);
console.log(`signing as:  ${account.address}\n`);

const results = [];
const step = (name, ok, note) => {
  results.push({ name, ok });
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${name}${note ? ` — ${note}` : ''}`);
};
/* Not every check is about our code. A step that cannot run because the
   gateway's configuration changed is reported and not counted — a red run that
   means "someone else turned the faucet off" trains people to ignore red. */
const skip = (name, why) => console.log(`SKIP  ${name} — ${why}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });

const errors = [];
page.on('pageerror', (e) => errors.push(`UNCAUGHT ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

/* Every /api call the page makes, so the sign-in can be reported as what
   actually crossed the wire rather than as what the screen seems to show. */
const calls = [];
page.on('response', async (r) => {
  const u = new URL(r.url());
  if (u.pathname.startsWith('/api/')) calls.push({ path: u.pathname, status: r.status() });
});

/* The provider signs for real. personal_sign hands over the message hex-encoded
   and viem's signMessage expects either a string or { raw }, so the raw bytes
   are passed through untouched — re-decoding to UTF-8 would corrupt anything
   non-ASCII and produce a signature for a different message than the gateway
   hashed. */
await page.exposeFunction('__probeSign', async (hexMessage) =>
  account.signMessage({ message: { raw: hexMessage } }));

await page.addInitScript(({ address }) => {
  const provider = {
    isMetaMask: true,
    _events: {},
    async request({ method, params }) {
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts': return [address];
        case 'eth_chainId': return '0xb626';            // 46630
        case 'net_version': return '46630';
        // params are [messageHex, address] for personal_sign.
        case 'personal_sign': return window.__probeSign(params[0]);
        case 'wallet_switchEthereumChain': return null;
        default: return null;
      }
    },
    on(ev, fn) { (this._events[ev] ??= []).push(fn); },
    removeListener() {},
  };
  window.ethereum = provider;
  const icon = 'data:image/svg+xml;base64,' + btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#f6851b"/></svg>');
  const w = { info: { uuid: 'live-0001', name: 'Live Probe', icon, rdns: 'probe.live' }, provider };
  const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze(w) }));
  window.addEventListener('eip6963:requestProvider', announce);
  announce();
}, { address: account.address });

const click = async (label, wait = 1400) => {
  const el = page.locator(`button:has-text("${label}")`).first();
  if (!(await el.count())) return false;
  await el.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(wait);
  return true;
};
const bodyText = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

/* ── the lobby, before anyone signs in ─────────────────────────────────────── */
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

await click('play now', 2200);
const lobby = await bodyText();
/* The lobby groups by stake, not by table: ten tables on the gateway become six
   stake rows. So the thing to check is not that "river bend" is on screen —
   it never is — but that every distinct blind level the gateway serves has a
   row, at the right money. That is what catches a lobby rendering stale
   hardcoded stakes while the gateway serves different ones.

   Amounts are integer minor units at 6 decimals, which is where $0.01 comes
   from for sb=10000. */
const live = await page.evaluate(async () => {
  const j = await (await fetch('/api/lobby')).json();
  return (j.tables ?? []).map((t) => ({ name: t.name, sb: t.sb, bb: t.bb }));
});
const money = (n) => {
  const v = n / 1e6;
  return `$${v % 1 === 0 ? v : v.toFixed(2)}`;
};
const stakes = [...new Set(live.map((t) => `${money(t.sb)}/${money(t.bb)}`))];
step('lobby reaches the gateway', live.length > 0,
  `${live.length} tables over ${stakes.length} stakes: ${live.slice(0, 3).map((t) => t.name).join(', ')}…`);
const missing = stakes.filter((s) => !lobby.includes(s));
step('every gateway stake has a row', missing.length === 0,
  missing.length ? `not on screen: ${missing.join(', ')}` : stakes.join(' '));

/* Endpoints this deployment does not implement. The screen degrades to an
   em-dash rather than breaking, which is the right behaviour — but a run that
   silently showed "—" everywhere would otherwise look like a healthy page. */
const absent = [...new Set(calls.filter((c) => c.status === 404).map((c) => c.path))];
if (absent.length) console.log(`      note: gateway has no ${absent.join(', ')} — those panels show "—"`);

/* ── sign in for real ──────────────────────────────────────────────────────── */
await click('connect a wallet', 1800);
/* The chain comes from the tab, not from the row label — rows are "<name>
   <STATE>" and carry no chain suffix. So: pick ethereum, then take a row that
   says DETECTED, which is the only state that can actually sign in. INSTALL,
   OPEN APP and QR · APP all lead somewhere else. */
/* Substring matches, not anchored ones. The tab carries an empty dot <span>
   and the rows a badge, so their text content picks up whitespace that an
   `^…$` regex fails on — which is how this probe came to report "no EVM
   wallet" against a screen that was showing one. */
const ethTab = page.locator('button:has-text("Ethereum")').first();
if (await ethTab.count()) { await ethTab.click().catch(() => {}); await page.waitForTimeout(900); }
const evmRow = page.locator('button').filter({ hasText: /DETECTED/ }).first();
step('wallet row offered', (await evmRow.count()) > 0,
  (await evmRow.count()) ? (await evmRow.innerText()).replace(/\s+/g, ' ').trim() : 'the connect screen listed no EVM wallet');
if (await evmRow.count()) { await evmRow.click().catch(() => {}); await page.waitForTimeout(6000); }

const challenge = calls.find((c) => c.path === '/api/auth/challenge');
const verify = calls.find((c) => c.path === '/api/auth/verify');
step('/api/auth/challenge', challenge?.status === 200, `status ${challenge?.status ?? 'never called'}`);
/* This is the whole point of the file: a 200 here means the deployed gateway
   ran verifyMessage over a signature this process produced and accepted it. */
step('/api/auth/verify accepts a real signature', verify?.status === 200,
  verify ? `status ${verify.status}` : 'never called');

/* The session is persisted under `suited:session` as { t, l, e } — the token,
   the wallet's label, and the EVM provider id — so that a reload comes back as
   the same pubkey and can reclaim a held seat. Read it back and spend it, which
   proves the stored form is actually usable and not merely present. */
const me = await page.evaluate(() => {
  const raw = localStorage.getItem('suited:session');
  if (!raw) return null;
  const t = JSON.parse(raw).t;
  return t ? fetch('/api/me', { headers: { authorization: `Bearer ${t}` } }).then((r) => r.json()).catch(() => null) : null;
});
step('stored session is usable', !!me?.pubkey,
  me?.pubkey ? `/api/me returns ${me.pubkey.slice(0, 10)}… balance ${me.balance}` : 'no suited:session in localStorage');
if (me?.pubkey) {
  step('signed in as the key that signed', me.pubkey.toLowerCase() === account.address.toLowerCase(),
    me.pubkey.toLowerCase() === account.address.toLowerCase() ? 'addresses match' : `gateway says ${me.pubkey}`);
}

/* ── sit at a table and let the socket run ─────────────────────────────────── */
/* A fresh identity needs chips to sit, and this deployment no longer hands any
   out: `/api/faucet` answers "no faucet here" and `/api/chain` is
   `enabled:false`, so there is no deposit route either. Everything below is
   therefore skipped rather than failed — it is the gateway's configuration that
   changed, not the browser. */
const funded = (me?.balance ?? 0) > 0;
if (!funded) {
  skip('sitting down, the felt, and the cash-out', 'this account has no chips and the gateway has no faucet');
  console.log('      the seat, socket-sync, card-rank and readability checks below all need a seat.');
}
if (funded) {
await click('play now', 2000);
const joined = await click('join', 5000) || await click('sit', 5000);
const table = await bodyText();
step('a table screen opened', joined && /fold|check|call|waiting|seat/i.test(table),
  joined ? 'table UI present' : 'no join button on the lobby');

// The buy-in screen, before the seat is taken and it goes away.
const seatBad = await page.evaluate(AUDIT);
step('seat screen is readable', seatBad.length === 0,
  seatBad.length ? `${seatBad.length} unreadable` : 'every label clears WCAG');
for (const b of seatBad.slice(0, 6)) console.log(`      ${describe(b)}`);

/* "connecting…" is what the table shows while the socket is dialling; still
   seeing it after five seconds means the socket never delivered a sync. */
await page.waitForTimeout(4000);
const stillDialling = /connecting/i.test(await bodyText());
step('socket delivered a sync', !stillDialling, stillDialling ? 'the table is still on "connecting…"' : 'table state arrived');
await page.screenshot({ path: 'tools/out/live-buyin.png' });

/* Actually sit. Everything above could pass against a gateway that accepts a
   socket and refuses every action; this is the first step that asks it to move
   money and commit state, and the first that exercises `sit` over the socket
   rather than REST.

   This writes to a shared deployment, so the seat is given back at the end. */
const sat = await click('take your seat', 6000);
const felt = await bodyText();
step('seated at a live table', sat && !/take a seat/i.test(felt),
  sat ? (/(waiting|fold|check|call|all[- ]?in|sit out)/i.test(felt) ? 'the felt is up' : 'sat, but the felt shows no table controls') : 'no "take your seat" button');
await page.screenshot({ path: 'tools/out/live-table.png' });

/* Before a hand starts the three decision plates stay on screen, disabled —
   they used to vanish and come back, which read as the controls breaking
   rather than as the table being between hands. Checked as "present AND
   inert", because present-and-live would be worse than hidden: it would invite
   a click that cannot do anything. */
const bar = await page.evaluate(() => {
  const plates = [...document.querySelectorAll('button')]
    .filter((b) => /^(fold|check|call|bet|raise to|all-in|check \/ fold|call any)/i.test((b.textContent ?? '').replace(/\s+/g, ' ').trim()))
    .map((b) => {
      const cs = getComputedStyle(b);
      const r = b.getBoundingClientRect();
      return {
        label: (b.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 18),
        shown: r.width > 2 && r.height > 2 && cs.visibility !== 'hidden',
        inert: cs.pointerEvents === 'none' || +cs.opacity < 0.5,
      };
    });
  const body = document.body.innerText.replace(/\s+/g, ' ');
  return { plates, waiting: /waiting|dealing|1 of 2/i.test(body) };
});
const shown = bar.plates.filter((p) => p.shown);
if (bar.waiting) {
  step('idle table keeps its action plates, disabled', shown.length >= 3 && shown.every((p) => p.inert),
    shown.length < 3 ? `only ${shown.length} plate(s) on screen while waiting`
      : shown.every((p) => p.inert) ? `${shown.length} shown, all inert: ${shown.map((p) => p.label).join(' / ')}`
      : `live while no hand is running: ${shown.filter((p) => !p.inert).map((p) => p.label).join(' / ')}`);
} else {
  console.log(`      (a hand was running — idle-bar check skipped; ${shown.length} plate(s): ${shown.map((p) => p.label).join(' / ')})`);
}

/* The ten prints as "10", not "T" — and "10" is roughly twice the width of
   every other rank, so the check is both that it says the right thing and that
   it still fits inside the card. Which ranks get dealt is luck, so this reports
   what it saw rather than demanding a ten; the failure cases are what matter. */
const ranks = await page.evaluate(() => {
  const out = [];
  /* The corner glyph is the absolutely-positioned element; its text sits one
     level down inside interp()'s <span class="sc-interp">, so matching on a
     childless element finds the span and the position filter then rejects it.
     Read textContent off the positioned element instead. */
  for (const el of document.querySelectorAll('div,span')) {
    if (getComputedStyle(el).position !== 'absolute') continue;
    const t = (el.textContent ?? '').trim();
    if (!/^(10|[2-9TJQKA])$/.test(t)) continue;
    const card = el.parentElement?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!card || r.width < 2) continue;
    out.push({ t, overflows: r.right > card.right + 0.5 || r.left < card.left - 0.5 });
  }
  return out;
});
const sawT = ranks.filter((r) => r.t === 'T');
const overflow = ranks.filter((r) => r.overflows);
step('card ranks print as 10, not T', sawT.length === 0 && overflow.length === 0,
  sawT.length ? `${sawT.length} card(s) still showing "T"`
    : overflow.length ? `${overflow.length} rank glyph(s) overflow the card edge`
    : `${ranks.length} rank glyph(s) on screen: ${[...new Set(ranks.map((r) => r.t))].sort().join(' ') || 'none dealt this run'}`);

// And the felt itself — the one screen a player spends all their time on.
const feltBad = await page.evaluate(AUDIT);
step('table screen is readable', feltBad.length === 0,
  feltBad.length ? `${feltBad.length} unreadable` : 'every label clears WCAG');
for (const b of feltBad.slice(0, 6)) console.log(`      ${describe(b)}`);

/* The gateway debits the buy-in from the bankroll on a successful sit, so the
   balance moving is the proof that the seat is real on their side and not just
   drawn on ours. */
const after = await page.evaluate(() => {
  const raw = localStorage.getItem('suited:session');
  if (!raw) return null;
  return fetch('/api/me', { headers: { authorization: `Bearer ${JSON.parse(raw).t}` } }).then((r) => r.json()).catch(() => null);
});
step('buy-in left the bankroll', !!after && after.balance < (me?.balance ?? 0),
  after ? `${me?.balance} → ${after.balance}` : 'could not re-read /api/me');

/* Give the seat back, and check the chips came with it. Without this every run
   of this probe parks a throwaway identity and its buy-in on one of the
   gateway's ten tables. Matched exactly: the control is labelled "leave", and a
   substring match also hits "leaderboard" in the nav. */
const leave = page.locator('button').filter({ hasText: /^leave$/i }).first();
const left = (await leave.count()) > 0;
if (left) await leave.click().catch(() => {});

/* Clicking leave does not always cash out, and that is correct: a seat dealt
   into a hand in flight keeps its chips in the pot until the hand is booked —
   `leaveSeat` in Poker-BE/src/actor.ts defers it — and bots are on at this
   deployment, so a hand usually IS running. On top of that, the seat of a
   dropped socket is only released after a ~30s grace.
 *
 * So the check waits past both, and does it from Node after the browser is
 * gone: polling from inside the page would hold the socket open and keep the
 * grace timer from ever starting. An earlier 10s in-page poll failed two runs
 * in three and the gateway was behaving perfectly each time. */
const token = await page.evaluate(() => {
  const raw = localStorage.getItem('suited:session');
  return raw ? JSON.parse(raw).t : null;
});
await page.screenshot({ path: 'tools/out/live-left.png' });
await browser.close();

const readMe = () => fetch(`${url}/api/me`, { headers: { authorization: `Bearer ${token}` } })
  .then((r) => r.json()).catch(() => null);

let back = null;
for (let i = 0; i < 24 && token; i++) {
  back = await readMe();
  if (back && back.balance > (after?.balance ?? 0)) break;
  await new Promise((r) => setTimeout(r, 2500));
}
/* The net is printed, not just the direction — a sit-and-leave comes back short
   by whatever the blinds cost while seated, and a check that only asserted "the
   balance went up" would hide that the account played hands at all. */
const net = back && me ? back.balance - me.balance : null;
step('seat released and chips returned', left && !!back && back.balance > (after?.balance ?? 0),
  left ? `balance ${after?.balance} → ${back?.balance}  (net ${net > 0 ? '+' : ''}${net} vs before sitting — blinds posted while seated)`
       : 'no "leave" control — the seat is held until the gateway times it out');
} else {
  // The funded branch closes the browser itself, before polling for the
  // cash-out; this branch has nothing to wait for.
  await page.screenshot({ path: 'tools/out/live-nofunds.png' });
  await browser.close();
}
console.log('\nscreenshot: tools/out/live-table.png');
console.log(`/api calls: ${calls.map((c) => `${c.path}→${c.status}`).join(' ')}`);

const noisy = errors.filter((e) => !/moveto|Failed to load resource/i.test(e));
if (noisy.length) console.log(`\nconsole errors:\n  ${noisy.slice(0, 6).join('\n  ')}`);

// The browser is already closed — the cash-out poll above needs the socket gone
// before the gateway will start its grace timer.
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
