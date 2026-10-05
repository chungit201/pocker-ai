/* Does the victory cue play only for the player who won the pot?
 *
 * It used to play on every award — `snd(big ? 'bigwin' : 'potwin')` ran
 * unconditionally — so an opponent dragging a pot sounded exactly like
 * dragging it yourself. Reading the fix is not the same as seeing it, so this
 * watches actual hands and records, per award, who won and what was played.
 *
 * Which sample is playing cannot be read from the app — the sound object is
 * private and the buffers are anonymous — so three things are patched before
 * the page loads, in this order:
 *
 *   fetch              remembers which ArrayBuffer came from which clip
 *   decodeAudioData    carries that name onto the decoded AudioBuffer
 *   createBufferSource records the name when something is actually started
 *
 * Tagging through fetch rather than by file size matters: potwin and badbeat
 * are both 1.6s and come back as byte-identical lengths, so size cannot tell
 * them apart and duration cannot either.
 *
 * Needs the OFFLINE demo, which is the only place hands can be played now:
 *   NEXT_PUBLIC_SUITED_SERVER=offline npx next dev -p 3001
 */
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:3001';
const HANDS = Number(process.argv[3] ?? 14);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });

await page.addInitScript(() => {
  window.__played = [];
  const names = new WeakMap();

  const realFetch = window.fetch;
  window.fetch = async (...a) => {
    const res = await realFetch(...a);
    const m = /\/sounds\/([a-zA-Z]+)\.mp3$/.exec(String(a[0]?.url ?? a[0]));
    if (!m) return res;
    // Tag the buffer this response will become, so decode can name it.
    const buf = await res.clone().arrayBuffer();
    names.set(buf, m[1]);
    return new Response(buf, { status: res.status, headers: res.headers });
  };

  const AC = window.AudioContext || window.webkitAudioContext;
  const realDecode = AC.prototype.decodeAudioData;
  AC.prototype.decodeAudioData = function (data, ...rest) {
    const guess = names.get(data);
    const p = realDecode.call(this, data, ...rest);
    return p.then((audio) => { if (guess) names.set(audio, guess); return audio; });
  };

  const realCreate = AC.prototype.createBufferSource;
  AC.prototype.createBufferSource = function () {
    const src = realCreate.call(this);
    const realStart = src.start.bind(src);
    src.start = (...s) => {
      const n = src.buffer ? names.get(src.buffer) : null;
      if (n) window.__played.push({ name: n, at: Date.now() });
      return realStart(...s);
    };
    return src;
  };
});

const click = async (label, wait = 2000) => {
  const el = page.locator(`button:has-text("${label}")`).first();
  if (!(await el.count())) return false;
  await el.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(wait);
  return true;
};

await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await click('play now', 2200);
await click('join', 3000) || await click('quick join', 3000);
const row = page.locator('button').filter({ hasText: /DETECTED/ }).first();
if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(3500); }
await click('lobby', 2500);
await click('join', 3500) || await click('quick join', 3500);
if (!await click('take your seat', 5000)) {
  console.error('could not take a seat — run this against the offline demo');
  await browser.close();
  process.exit(1);
}

/* The callout names the winner while it is up: "… to you" or "… to <name>".
   Polled rather than awaited, because it is only on screen for ~2s. */
const WIN_CUES = new Set(['win', 'potwin', 'bigwin']);
const awards = [];
let lastSeen = '';

console.log(`watching for ${HANDS} awards…\n`);
for (let i = 0; i < 900 && awards.length < HANDS; i++) {
  const shot = await page.evaluate(() => {
    const body = document.body.innerText.replace(/\s+/g, ' ');
    const m = /(?:Takes it down|[A-Za-z ]+?)\s(?:Split · )?[\d.,]+\s*(?:USDC|chips|bb)?\s*to\s([^\s]+)/.exec(body);
    const played = window.__played.splice(0);
    return { winner: m ? m[1] : null, played, body: body.slice(0, 0) };
  });
  // Cues fired since the last look, attributed to the callout showing now.
  if (shot.winner && shot.winner !== lastSeen) {
    lastSeen = shot.winner;
    const cues = shot.played.filter((p) => WIN_CUES.has(p.name)).map((p) => p.name);
    awards.push({ winner: shot.winner, cues });
    console.log(`  pot to ${shot.winner.padEnd(14)} ${cues.length ? `played: ${cues.join(' ')}` : 'no victory cue'}`);
  } else if (shot.played.length) {
    // Cues that landed between callouts belong to whatever the last one was.
    const cues = shot.played.filter((p) => WIN_CUES.has(p.name)).map((p) => p.name);
    if (cues.length && awards.length) awards[awards.length - 1].cues.push(...cues);
  }
  await page.waitForTimeout(250);
}

const mine = awards.filter((a) => /^you/i.test(a.winner));
const theirs = awards.filter((a) => !/^you/i.test(a.winner));
const wrong = theirs.filter((a) => a.cues.length);
const missed = mine.filter((a) => !a.cues.length);

console.log(`\n${awards.length} award(s): ${mine.length} yours, ${theirs.length} someone else's`);
let bad = 0;
if (!awards.length) { console.log('FAIL  no awards observed — nothing was tested'); bad++; }
else {
  const ok = wrong.length === 0;
  console.log(`${ok ? ' ok ' : 'FAIL'}  the victory cue is only for the winner`
    + (ok ? ` — ${theirs.length} opponent win(s), none of them played one`
          : ` — ${wrong.length} opponent win(s) played: ${[...new Set(wrong.flatMap((a) => a.cues))].join(' ')}`));
  if (!ok) bad++;
  if (mine.length) {
    const heard = mine.length - missed.length;
    console.log(`${missed.length ? 'FAIL' : ' ok '}  your own wins still play one — ${heard}/${mine.length}`);
    if (missed.length) bad++;
  } else {
    console.log('SKIP  you won no pots in this run, so the positive case is untested');
  }
}

await browser.close();
process.exit(bad ? 1 : 0);
