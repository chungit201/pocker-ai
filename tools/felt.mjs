/* Drives the offline demo all the way onto the felt and photographs it.
 *
 * The table was the one screen the port could never be checked against,
 * because every earlier attempt stopped at the connect screen. The reason was
 * mundane: the mock wallet's connect() waits 1 100 ms to stand in for the
 * approve dialog, and the probes were waiting 900. With a long enough pause the
 * demo seats itself and deals against bots, no wallet extension involved.
 *
 *   node tools/felt.mjs [url] [out.png]
 */
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:3001';
const out = process.argv[3] ?? 'tools/out/screen-felt.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

// the original needs its SRI unpinned to boot at all
await page.route('**/support.js', async (route) => {
  const res = await route.fetch();
  const body = (await res.text()).replace(/"sha384-[A-Za-z0-9+/=]+"/g, '""');
  await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-length': undefined } });
});

const visible = () => page.evaluate(() =>
  [...document.querySelectorAll('button, a')]
    .filter((e) => e.offsetParent !== null)
    .map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 44))
    .filter(Boolean));

const click = async (label, wait = 900) => {
  const el = page.locator(`button:has-text("${label}")`).first();
  if (!(await el.count())) {
    // Self-diagnosing: a step that cannot be found prints the way out instead
    // of leaving you to guess which screen the walk is stuck on.
    console.log(`  no "${label}" here. Available: ${[...new Set(await visible())].join(' | ')}`);
    return false;
  }
  await el.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(wait);
  return true;
};

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await click('play now');
await click('join $0.01');
await click('browser wallet', 2600);   // the mock approve dialog takes 1 100 ms
await click('choose a table', 1200);   // connect lands on the funding step first
await click('quick join', 1500);       // seats at whichever stake the lobby has selected
await click('take your seat', 4000);   // then the deal animates in

/* Wait for the hero's turn before photographing the bar.
 *
 * Out of turn the whole sizing half of the row is at 0.32 opacity and the three
 * decisions read as the pre-actions ("check / fold", "call any"), so a
 * screenshot taken while a bot is thinking says nothing about how the controls
 * look when they matter. The demo deals against bots, so this is just a matter
 * of waiting for the action to come round. */
const myTurn = async () => page.evaluate(() =>
  // The felt's own status line says so, and says it in one place. Reading the
  // button labels instead was the obvious thing and the wrong one: the hotkey
  // is underlined inside the word, so the text node is not simply "fold".
  /your action/i.test(document.body.innerText || ''));

let turn = false;
for (let i = 0; i < 60 && !turn; i++) {
  turn = await myTurn();
  if (!turn) await page.waitForTimeout(1000);
}
console.log(turn ? "the hero's turn — capturing the live bar" : 'never got the action; capturing out of turn');
await page.waitForTimeout(400);

const where = await page.evaluate(() => {
  const t = (document.body.innerText || '').replace(/\s+/g, ' ');
  return {
    onFelt: /fold|check|call|raise|all in/i.test(t),
    text: t.slice(0, 120),
    elements: document.getElementById('dc-root')?.querySelectorAll('*').length ?? 0,
  };
});

console.log(`elements: ${where.elements}   looks like the felt: ${where.onFelt}`);
console.log(`text: ${where.text}…`);
for (const e of [...new Set(errors)].filter((e) => !/AudioContext|autoplay|moveto path/i.test(e)).slice(0, 5)) {
  console.log(`  error: ${e.slice(0, 160)}`);
}

await page.screenshot({ path: out });
// and a tight crop of the action bar, which is what the redesign is about
await page.screenshot({ path: out.replace(/\.png$/, '-actionbar.png'), clip: { x: 0, y: 660, width: 1512, height: 240 } });
console.log(`\nwrote ${out} and ${out.replace(/\.png$/, '-actionbar.png')}`);

await browser.close();
