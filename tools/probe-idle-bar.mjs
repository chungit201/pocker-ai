/* Does the action bar stay put before a hand starts?
 *
 * The three decision plates used to be hidden while the table sat idle, so the
 * row emptied out and refilled itself at the first deal. They stay now and go
 * inert instead. This watches the bar from the moment the table mounts and
 * reports what it found in each phase.
 *
 * Run against the OFFLINE demo, which is the only place the idle state is
 * reliably reachable: the deployed gateway no longer funds new accounts (its
 * faucet answers "no faucet here"), so a fresh identity cannot sit down at all.
 *
 *   NEXT_PUBLIC_SUITED_SERVER=offline npx next dev -p 3001
 *   node tools/probe-idle-bar.mjs
 */
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:3001';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });

const results = [];
const step = (name, ok, note) => { results.push({ name, ok }); console.log(`${ok ? ' ok ' : 'FAIL'}  ${name}${note ? ` — ${note}` : ''}`); };

const click = async (label, wait = 1600) => {
  const el = page.locator(`button:has-text("${label}")`).first();
  if (!(await el.count())) return false;
  await el.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(wait);
  return true;
};

/** The three decision plates, with whether each is on screen and whether it is inert. */
const readBar = () => page.evaluate(() => {
  /* Anchored on POSITION, not on labels. The plates' text changes with the
     state — "Fold" becomes "Check / fold" in pre-action mode, "Bet" becomes
     "Raise to 12" — so a label regex quietly stops matching exactly when the
     state changes, which is the state under test. Everything in the bottom
     strip of the window is the action bar. */
  const h = window.innerHeight;
  const plates = [...document.querySelectorAll('button')]
    .map((b) => ({ b, r: b.getBoundingClientRect() }))
    /* The drawer menu also opens into this strip, and its items are not action
       controls — listing them would make an empty bar look full. */
    .filter(({ b, r }) => r.top > h - 140 && r.width > 2 && r.height > 2
      && !/^(lobby|tournaments|leaderboard|staking|hand history|settings|docs|deposit|profile|disconnect)$/i.test((b.textContent ?? '').trim()))
    .map(({ b, r }) => {
      const cs = getComputedStyle(b);
      // Opacity is inherited from the wrapper that dims the whole cluster, so
      // the ancestor chain has to be walked rather than the button alone.
      let faded = false, through = cs.pointerEvents === 'none';
      for (let n = b; n && n !== document.body; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (+s.opacity < 0.5) faded = true;
        if (s.pointerEvents === 'none') through = true;
      }
      return {
        label: (b.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 22),
        shown: cs.visibility !== 'hidden',
        inert: faded || through,
      };
    });
  const body = document.body.innerText.replace(/\s+/g, ' ');
  /* `turnTitle` is the app's own word for the state and the only read on it
     from out here. Two of its values mean no hand is under way — the table
     state has not arrived ("Connecting…"), or it has and there are not two
     live seats ("Waiting · 1 of 2 to deal"). "Dealing" is a hand in progress
     and is deliberately NOT one of them. */
  const title = (body.match(/(Connecting…|Waiting · \d of 2 to deal|Your action|Hand complete|Dealing|[A-Za-z0-9.…]+ thinking)/) ?? [])[1] ?? '?';
  return { plates, phase: title, idle: /^(Connecting…|Waiting · \d of 2)/.test(title) };
});

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await click('play now', 2200);
await click('join', 3000) || await click('quick join', 3000);
// Offline routes through the connect screen; the wallet is a mock that connects
// to whatever is clicked, after a 1100ms stand-in for the approve dialog.
const row = page.locator('button').filter({ hasText: /DETECTED/ }).first();
if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(3500); }
await click('lobby', 2500);
await click('join', 3500) || await click('quick join', 3500);

/* Sample fast from the instant the seat is taken: the idle window before the
   first deal is short, and a one-shot check a second later lands mid-hand. */
/* Offline deals the instant the table mounts, so the idle window is shorter
   than one sample. Throttling the CPU stretches the work between mounting the
   adapter and the first deal — it does not slow wall-clock timers, so this only
   widens a window that is real, it does not invent one. */
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });

const seat = page.locator('button:has-text("take your seat")').first();
if (await seat.count()) await seat.click({ timeout: 5000 }).catch(() => {});
const seen = [];
for (let i = 0; i < 120; i++) {
  const bar = await readBar();
  if (bar.plates.length) seen.push(bar);
  await page.waitForTimeout(50);
}

const idleFrames = seen.filter((s) => s.idle);
const liveFrames = seen.filter((s) => !s.idle);
console.log(`sampled ${seen.length} frame(s): ${idleFrames.length} idle, ${liveFrames.length} in a hand\n`);
/* Every distinct shape the bar took, not just the last one. The pre-action
   labels ("Check / fold", "Call any") only appear while another player is on
   the clock and the hero is still in the hand, which is a handful of frames in
   a run — reporting only the final frame hides whether that mode still works
   at all. */
const shapes = new Map();
for (const f of seen) {
  const sig = `${f.idle ? 'IDLE' : 'hand'}  "${f.phase}": ${f.plates.map((p) => `${p.label}${p.inert ? '[inert]' : ''}`).join(' | ')}`;
  shapes.set(sig, (shapes.get(sig) ?? 0) + 1);
}
for (const [sig, n] of shapes) console.log(`  ×${String(n).padStart(3)}  ${sig}`);
console.log('');

if (!idleFrames.length) {
  /* Not a failure — an environment fact, and one worth printing rather than
     hiding behind a green run. The idle table is currently unreachable: the
     deployed gateway stopped funding new accounts (`/api/faucet` answers "no
     faucet here" and `/api/chain` is `enabled:false`, so there is no deposit
     either), and the offline demo seats bots and deals before the first sample
     lands. The assertions below run the moment either of those changes. */
  console.log('SKIP  no idle frame reachable in this environment — nothing asserted about the idle bar');
  console.log('      (live gateway: a fresh account has no chips and cannot sit)');
  console.log('      (offline demo: bots are seated and the hand is dealt on mount)');
} else {
  const f = idleFrames[idleFrames.length - 1];
  const shown = f.plates.filter((p) => p.shown);
  step('idle bar keeps its plates', shown.length >= 3,
    `${shown.length} shown while "${f.phase}": ${shown.map((p) => p.label).join(' / ') || '(none)'}`);
  /* Present-and-live would be worse than hidden: it invites a click that
     cannot do anything and gives no reason why. */
  step('idle plates are inert', shown.length > 0 && shown.every((p) => p.inert),
    shown.every((p) => p.inert) ? 'all dimmed and click-through'
      : `clickable with no hand: ${shown.filter((p) => !p.inert).map((p) => p.label).join(' / ')}`);
  /* Before a hand exists there is nothing to queue against, so the plates must
     not offer to arm a pre-action. */
  const pre = shown.filter((p) => /check \/ fold|call any/i.test(p.label));
  step('idle bar offers no pre-action', pre.length === 0,
    pre.length ? `naming a decision for a hand not yet dealt: ${pre.map((p) => p.label).join(' / ')}` : 'plain fold / check / bet');
  await page.screenshot({ path: 'tools/out/idle-bar.png' });
}

if (liveFrames.length) {
  const f = liveFrames[liveFrames.length - 1];
  const shown = f.plates.filter((p) => p.shown);
  step('plates come alive once a hand runs', shown.length >= 3,
    `${shown.length} shown while "${f.phase}": ${shown.map((p) => p.label).join(' / ')}`);
  await page.screenshot({ path: 'tools/out/live-bar.png' });
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
