/* Confirms the installed gateway env carries the supplied values exactly,
   by comparing hashes rather than printing anything secret. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = (p) => {
  const m = new Map();
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const k = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (k) m.set(k[1], k[2]);
  }
  return m;
};

const src = read(process.argv[2]);
const dst = read('C:/projects/Poker-BE/.env');
const h = (v) => createHash('sha256').update(v ?? '').digest('hex').slice(0, 12);

for (const [k, v] of src) {
  const got = dst.get(k);
  const same = got === v;
  console.log(`  ${k.padEnd(14)} ${same ? 'identical' : 'CHANGED'}   ${h(v)} -> ${h(got)}`);
}
console.log(`\nkeys in source: ${src.size}, in installed: ${dst.size}`);
