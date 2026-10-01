/* Prints an env file with anything that looks like a credential masked, so a
   config can be reviewed without its secrets landing in a log or transcript. */
import { readFileSync } from 'node:fs';

const SECRET = /SECRET|PASSWORD|PRIVATE|MNEMONIC|APIKEY|API_KEY/i;
const src = readFileSync(process.argv[2], 'utf8');

for (const line of src.split(/\r?\n/)) {
  const m = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (!m) { if (line.trim()) console.log('  ' + line.trim()); continue; }
  const [, k, v] = m;
  const masked = SECRET.test(k) && v ? `${v.slice(0, 4)}…  (${v.length} chars, masked)` : v;
  console.log(`  ${k.padEnd(20)} = ${masked}`);
}
