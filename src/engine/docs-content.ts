// Front-facing documentation content + pure helpers.
// No DOM references live in this module: it is imported both by the browser
// renderer (docs-render.js) and by the vitest suite under Node.
import { TOKEN_CA, TOKEN_SUPPLY } from './token';

const BLOCK_FIELDS = {
  heading: (b) => typeof b.text === 'string' && (b.level === 2 || b.level === 3),
  para: (b) => typeof b.text === 'string',
  list: (b) => Array.isArray(b.items) && b.items.every((i) => typeof i === 'string'),
  table: (b) => Array.isArray(b.headers) && Array.isArray(b.rows)
    && b.rows.every((r) => Array.isArray(r) && r.length === b.headers.length),
  keyvals: (b) => Array.isArray(b.rows)
    && b.rows.every((r) => typeof r.term === 'string' && typeof r.def === 'string'),
  callout: (b) => (b.tone === 'note' || b.tone === 'key') && typeof b.text === 'string',
  code: (b) => typeof b.text === 'string',
  steps: (b) => Array.isArray(b.items) && b.items.every((i) => typeof i === 'string'),
  // The address is checked here, not just rendered: a docs page whose whole
  // point is "go check this yourself" must not be able to ship a typo'd
  // contract that links a reader to the wrong address — or to nothing.
  addresses: (b) => Array.isArray(b.rows) && b.rows.length > 0 && b.rows.every((r) =>
    typeof r.name === 'string' && /^0x[0-9a-fA-F]{40}$/.test(r.address ?? '')
    && (r.note === undefined || typeof r.note === 'string')
    // `source` is the verified source, rendered as its own link, so it has to be
    // an absolute https URL — a relative one would resolve against /docs.
    && (r.source === undefined || /^https:\/\/[^\s]+$/.test(r.source))),
};

// Inline grammar: **bold**, `code`, [label](href). Longest-leading-match scan.
export function parseInline(text) {
  const out = [];
  let i = 0, plain = '';
  const flush = () => { if (plain) { out.push({ t: 'text', v: plain }); plain = ''; } };
  while (i < text.length) {
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end > -1) { flush(); out.push({ t: 'strong', v: text.slice(i + 2, end) }); i = end + 2; continue; }
    }
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > -1) { flush(); out.push({ t: 'code', v: text.slice(i + 1, end) }); i = end + 1; continue; }
    }
    if (text[i] === '[') {
      const close = text.indexOf('](', i);
      const paren = close > -1 ? text.indexOf(')', close + 2) : -1;
      if (close > -1 && paren > -1) {
        const label = text.slice(i + 1, close);
        const href = text.slice(close + 2, paren);
        // `/docs/…` is a doc page, `http(s)://` an outside link, and a single
        // lowercase segment is a page of this app (`/staking`). Anything else —
        // `javascript:`, a protocol-relative host, a path with a `..` in it —
        // is left as literal text rather than turned into an anchor.
        const ok = href.startsWith('/docs/') || href.startsWith('http://')
          || href.startsWith('https://') || /^\/[a-z][a-z0-9-]*$/.test(href);
        if (ok) { flush(); out.push({ t: 'link', v: label, href }); i = paren + 1; continue; }
      }
    }
    plain += text[i]; i += 1;
  }
  flush();
  return out;
}

export function allSlugs(docs = DOCS) {
  const s = new Set();
  for (const g of docs) for (const sec of g.sections) s.add(sec.id);
  return s;
}

export function tocGroups(docs = DOCS) {
  return docs.map((g) => ({ group: g.group, sections: g.sections.map((s) => ({ id: s.id, title: s.title })) }));
}

export function validateDocs(docs = DOCS) {
  const errors = [];
  const seen = new Set();
  const slugs = allSlugs(docs);
  const inlineText = (b) => {
    if (b.type === 'para' || b.type === 'callout') return [b.text];
    if (b.type === 'list' || b.type === 'steps') return b.items;
    if (b.type === 'keyvals') return b.rows.flatMap((r) => [r.term, r.def]);
    if (b.type === 'table') return [...b.headers, ...b.rows.flat()];
    if (b.type === 'addresses') return b.rows.map((r) => r.note ?? '');
    return [];
  };
  for (const g of docs) {
    for (const sec of g.sections) {
      if (!/^[a-z0-9-]+$/.test(sec.id)) errors.push(`bad slug "${sec.id}" (group ${g.group})`);
      if (seen.has(sec.id)) errors.push(`duplicate slug "${sec.id}"`);
      seen.add(sec.id);
      for (const b of sec.blocks) {
        const check = BLOCK_FIELDS[b.type];
        if (!check) { errors.push(`unknown block type "${b.type}" in ${sec.id}`); continue; }
        if (!check(b)) { errors.push(`malformed ${b.type} block in ${sec.id}`); continue; }
        for (const text of inlineText(b)) {
          for (const tok of parseInline(text)) {
            // `**bold [link](/docs/x)**` swallows the link: the bold scan wins
            // the leading match and everything inside it stays literal. It
            // renders as raw brackets, which is silent and ugly, so it is an
            // error rather than a surprise.
            if (tok.t === 'strong' && tok.v.includes('](')) {
              errors.push(`link inside bold in ${sec.id}: "${tok.v}"`);
            }
            if (tok.t === 'link' && tok.href.startsWith('/docs/')) {
              const slug = tok.href.slice('/docs/'.length);
              if (!slugs.has(slug)) errors.push(`broken internal link "/docs/${slug}" in ${sec.id}`);
            }
          }
        }
      }
    }
  }
  return errors;
}

/**
 * Chain-specific words the docs need. Suited runs on Robinhood Chain; the docs
 * carry {placeholders} the renderer fills from here so a wording change lands
 * in one place. Kept as a small word bank (not inlined) so the fill step and
 * its test stay simple.
 */
export const CHAIN_WORDS = {
  evm: {
    chain: 'Robinhood Chain',
    token: 'USDC',
    wallets: '**MetaMask** and **Rabby**',
    walletQ: 'an EVM wallet like **MetaMask** or **Rabby**',
    entropy: 'a future Ethereum block hash',
    /* The $SUITED contract address, from the one place it is written down
       (token.js). A docs page whose whole argument is "go and check" must not
       print a placeholder that looks like an address, so until the mint exists
       this says so plainly — and the token section swaps its contract line for
       one that does not claim the token is live. */
    ca: TOKEN_CA || 'not published yet',
    supply: TOKEN_SUPPLY,
  },
};

let activeWords = CHAIN_WORDS.evm;
/** Called by the app when /api/chain resolves. Robinhood Chain is the only era. */
export function setDocsChain(kind) {
  activeWords = CHAIN_WORDS[kind] ?? CHAIN_WORDS.evm;
}
/** Fill {placeholders} in a doc string from the active era's words. */
export function fillChainWords(text) {
  return String(text).replace(/\{(chain|token|wallets|walletQ|entropy|ca|supply)\}/g, (_, k) => activeWords[k] ?? '');
}

export const DOCS = [
  { group: 'Getting started', sections: [
    { id: 'what-is-suited', title: 'What Suited is', blocks: [
      { type: 'para', text: "Suited is six-max no-limit hold'em played for real {token} on {chain}." },
      { type: 'list', items: [
        'Every shuffle is committed before the deal and revealed after the hand, so you can re-deal any hand in your browser and check it.',
        "Chips are yours between hands, your bankroll is backed by an on-chain vault, and you can always withdraw it yourself.",
        'Rake is 5%, capped at 5 big blinds, and uncontested pots are never raked.',
      ] },
    ] },
    { id: 'connecting-a-wallet', title: 'Connecting a wallet', blocks: [
      { type: 'para', text: "Suited doesn't have accounts, passwords, or a signup form. You connect a wallet, and that wallet is your identity at the table." },
      { type: 'para', text: "Any EVM wallet that announces itself to your browser works, {wallets}, for example, as an extension or through a wallet app's built-in browser. Wallets built for other chains, or locked to a fixed chain list, can't reach {chain}, so the connect screen filters them out and lists only wallets that can actually play." },
      { type: 'para', text: "Signing in asks for one signature, a challenge that proves you hold the private key for that wallet. It doesn't move any funds and doesn't approve a transaction. Nothing leaves your wallet until you deposit, which is a separate, explicit step." },
      { type: 'callout', tone: 'note', text: "Your wallet is the only thing that identifies you. There's no username or email tied to your seat, whoever holds the key holds the account." },
    ] },
    { id: 'depositing', title: 'Depositing', blocks: [
      { type: 'para', text: "You keep one bankroll, and it funds every table. Sitting down at a table doesn't move money on-chain, it's an off-chain reservation of chips from that same balance, so you can leave one table and sit at another without depositing again." },
      { type: 'para', text: 'Getting funds into that bankroll is a single on-chain transaction.' },
      { type: 'steps', items: [
        'Choose an amount and Suited proposes a deposit transaction.',
        'You review and sign it in your wallet, the site can only propose the transaction, not forge it or sign on your behalf.',
        'Once the transaction confirms on-chain, Suited watches for that event and credits your balance.',
      ] },
      { type: 'para', text: 'The minimum deposit is **$1**: the deposit screen always shows the current minimum.' },
    ] },
    { id: 'bankroll-and-cashing-out', title: 'Bankroll and cashing out', blocks: [
      { type: 'para', text: 'Your bankroll is the balance behind every table you sit at, deposits add to it, and results at the table adjust it as you play.' },
      { type: 'para', text: 'You can withdraw whenever you have no chips in play, that is, whenever you\'re not currently seated with an active stack at a table. The amount you can withdraw is reconciled against your real on-chain balance, so what you request is always backed by what Suited actually holds for you.' },
    ] },
  ] },
  { group: 'Fairness & security', sections: [
    { id: 'provably-fair-shuffle', title: 'The provably fair shuffle', blocks: [
      { type: 'para', text: 'Every hand at Suited is shuffled with a commit–reveal scheme:' },
      { type: 'steps', items: [
        'Before the deal, the server publishes a **commitment**: a cryptographic hash of a secret seed, for that hand.',
        'In a short window before the cards come out, your client automatically adds a random seed of its own, as does every other seated player.',
        'The deck is shuffled from the combination of all of them, the committed server seed plus every client seed.',
        'After the hand, the server reveals its seed, and the client seeds it mixed in, **to the players who were dealt into that hand**: so any of them can recompute the whole shuffle. It is not broadcast to the table, because the seed re-derives every card, including the ones that were folded and never shown.',
      ] },
      { type: 'para', text: "Your browser keeps the commitment it saw published for each hand while you were at the table, and checks the revealed seed against **that** rather than against a commitment handed back alongside it. Otherwise both halves of the promise would arrive from the same place at the same moment." },
      { type: 'para', text: "Because the server commits before it has seen any client seed, it cannot pick the deck, and because your seed is in the mix, neither can anyone else. No single party, Suited included, chooses the order alone." },
      
      { type: 'callout', tone: 'key', text: "You don't have to trust us. The commitment is locked in before the deal, so the deck can't be re-chosen after the fact to favor an outcome, and the reveal means the claim isn't just \"trust us,\" it's something you can recompute yourself." },
      { type: 'heading', level: 3, text: 'Verify a hand' },
      { type: 'para', text: 'Your last five hundred hands stay checkable. Older ones age out of the record, and with them the seed that would re-deal them.' },
      { type: 'steps', items: [
        'Open the hand in your history.',
        '**Re-shuffle & verify** fetches that hand\'s revealed seed, rebuilds all fifty-two cards in your browser, and checks them against the published commitment, the board that was dealt, and every hole card that was shown down. For hands you just played, it also confirms the seed your client contributed is in the revealed mix.',
        'The seed is fetched rather than broadcast, and only for hands you were dealt into. It re-derives the whole deck, so anyone holding it could read cards that were folded and never shown, which is why it is never sent to the table at large.',
        "Suited's server runs the same check independently. A hand that verifies can count toward a verified achievement.",
      ] },
      { type: 'heading', level: 3, text: 'The commitment' },
      { type: 'para', text: "The commitment published before the deal is a single hash, tied to the hand it belongs to so it can't be reused elsewhere:" },
      { type: 'code', text: 'commit = SHA256("suited/commit/v1" ‖ serverSeed ‖ handNo)' },
      { type: 'para', text: "`‖` is concatenation. `handNo` binds the commitment to one specific hand, and `serverSeed` is the value the server reveals afterward, everything you need to recompute `commit` and confirm it matches." },
    ] },
    { id: 'custody-and-your-money', title: 'Custody and your money', blocks: [
      { type: 'para', text: "Suited plays fast because table results are tracked off-chain, hand by hand. But custody of your money doesn't depend on that off-chain system, it lives on-chain, in a vault bound by rules Suited can't break." },
      { type: 'heading', level: 3, text: 'The ledger' },
      { type: 'para', text: "Every hand settles into a double-entry ledger as one balanced entry, each seat's net result, plus the rake. After every single hand, Suited asserts that the ledger balances: whatever left one stack landed somewhere else, another stack, the pot, or the rake, with nothing created and nothing lost. That check runs on every hand, not as a periodic audit." },
      { type: 'heading', level: 3, text: 'The vault' },
      { type: 'para', text: "The {token} behind your bankroll sits in an on-chain vault, not in a database Suited controls outright. The ledger's state is periodically checkpointed to that vault, a signed record of what every player is owed." },
      { type: 'para', text: "The operator (Suited's settler) cannot create value or take more than the rake. A checkpoint only lands on-chain if the contract accepts it: entries must sum to zero net of rake, no balance can go negative, the rake taken per checkpoint is capped, and the vault must stay fully collateralised, anything else is rejected." },
      { type: 'para', text: "Suited's only revenue from the ledger is the rake, see [Rake](/docs/rake) for exactly how it's taken." },
    ] },
    { id: 'contracts', title: 'Contracts', blocks: [
      { type: 'para', text: "Everything Suited holds for you sits in contracts on {chain}. Their addresses are below. Every deposit, every withdrawal, every settlement checkpoint, every jackpot payout and every dollar of revenue that reaches stakers is a public transaction against one of them, and the balances they hold are public too, you don't have to take Suited's word for any of it." },
      { type: 'para', text: "The code is published too, not just the addresses. Sourcify recompiles the source and checks the result byte for byte against what is actually deployed; every contract Suited wrote comes back an **exact match**, on the creation and the runtime bytecode alike. So the code you read is the code that runs. Each one below links to its own source." },
      { type: 'heading', level: 3, text: 'The contracts' },
      { type: 'addresses', rows: [
        { name: 'Vault', address: '0x156473aD685321B310c8F7c88936f49bc79E3C33',
          source: 'https://repo.sourcify.dev/4663/0x156473aD685321B310c8F7c88936f49bc79E3C33',
          note: 'Holds every deposit. Your bankroll is a balance in this contract, and it is the only place player money lives on chain. Deposits, withdrawals and every settlement checkpoint run through it.' },
        { name: 'Staking', address: '0x107196ac38aCDd7080B52Fa497873159E07D18dC',
          source: 'https://repo.sourcify.dev/4663/0x107196ac38aCDd7080B52Fa497873159E07D18dC',
          note: 'Holds locked $SUITED and the {token} handed to it to pay [stakers](/docs/staking). Rewards are pulled in as they are announced, so it can never promise money it does not already hold. Only a position\'s own wallet can withdraw it, and only once the lock has ended, pausing stops new locks, never a withdrawal or a claim.' },
        { name: 'Jackpot distributor', address: '0x026A09f9c505a3A5cE7060a6DeE23826a2BF2a5d',
          source: 'https://repo.sourcify.dev/4663/0x026A09f9c505a3A5cE7060a6DeE23826a2BF2a5d',
          note: 'Pays [jackpot](/docs/the-jackpot) winners. It keeps its own separate bankroll and pays a winner straight to their wallet against a signed voucher for one specific day and amount. It holds no player balances and cannot touch the vault.' },
        { name: 'Creator-fee claimer', address: '0xeEd5b0Bd71b514Eca311F96cDf5570a5e58419f1',
          source: 'https://repo.sourcify.dev/4663/0xeEd5b0Bd71b514Eca311F96cDf5570a5e58419f1',
          note: 'Collects the $SUITED creator fee out of the launchpad\'s fee escrow. Whoever holds that role holds every future fee, so the role is held by this contract rather than by a wallet: it can only forward what it claims to one address fixed when it was deployed. Claiming is permissionless, anyone can trigger it, because the money can go nowhere else.' },
        { name: 'Creator-fee splitter', address: '0xf893bD8957DB937626224A23d7096890CA4B877b',
          source: 'https://repo.sourcify.dev/4663/0xf893bD8957DB937626224A23d7096890CA4B877b',
          note: 'Splits the creator fee in the same transaction that pulls it in, in shares fixed when it was deployed: **20% house, 30% jackpot, 20% stakers, 20% tournaments, 10% buyback**, and that last share is [bought back and burnt](/docs/buyback-and-burn) the same day. The stakers\' share goes first, and the call checks the staking contract took exactly its share; if it cannot be paid, nothing moves at all.' },
        { name: 'Rake router', address: '0x5A89a7a1f1c6D51d789822B3bEb4b0ef17165aD3',
          source: 'https://repo.sourcify.dev/4663/0x5A89a7a1f1c6D51d789822B3bEb4b0ef17165aD3',
          note: 'The vault\'s rake exit. It is both the vault\'s owner and the one address the vault may send rake to, so every dollar of [rake](/docs/rake) that leaves is split as it lands: **12% to stakers, the rest to the house**. The key that triggers a sweep can do nothing else, it cannot pick a destination, cannot pause the vault, and cannot reach player funds.' },
        { name: 'USDC, Global Dollar', address: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
          note: 'The money itself. USDC is a dollar stablecoin issued by Global Dollar, not by Suited, Suited neither mints it nor controls it, and the vault simply holds it.' },
      ] },
      { type: 'heading', level: 3, text: 'The keys' },
      { type: 'para', text: 'Two keys can send instructions to the vault, and the contract, not Suited, is what bounds them. The **settler** is the game server\'s key: it signs settlement checkpoints and withdrawal authorisations, and it can move balances only in steps that sum to zero net of rake, never minting value or overdrawing the vault. The **owner** is the administrative key: it can rotate the settler, adjust the deposit minimum and the rake cap, pause deposits and settlement, and sweep collected rake. It cannot move a player balance, and pausing never stops a withdrawal.' },
      { type: 'para', text: 'Both are readable straight off the contract, `settler()` and `owner()`, so you never have to take this page\'s word for which keys hold those roles.' },
      { type: 'heading', level: 3, text: 'Fixed by the contract' },
      { type: 'keyvals', rows: [
        { term: 'Chain', def: '{chain}, chain ID `4663`.' },
        { term: 'Minimum deposit', def: '`1.00 USDC`.' },
        { term: 'Rake per checkpoint', def: '`500.00 USDC` at most. One settlement call can book no more than this, so a single bad call cannot drain the rake pool.' },
      ] },
      { type: 'callout', tone: 'key', title: 'The vault has to cover what it owes', text: "After every checkpoint the contract asserts that its own {token} balance is at least the sum of all player balances plus uncollected rake, and rejects the checkpoint outright if it isn't. Both sides of that are public: the vault's balance, and the liabilities it reports. See [Custody and your money](/docs/custody-and-your-money) for how settlement works." },
    ] },
    { id: 'rake', title: 'Rake', blocks: [
      { type: 'para', text: 'Suited takes a rake only from pots that are actually contested, following one rule: **5% of the pot, capped at 5 big blinds**.' },
      { type: 'keyvals', rows: [
        { term: 'No flop, no drop', def: "If the hand ends before the flop, the pot isn't raked at all." },
        { term: 'Uncontested pots', def: "If everyone else folds and one player takes the pot, it's never raked, whether or not there was a flop." },
        { term: 'Same rate at every stake', def: "The cap is set in big blinds, not dollars, so the effective rate is identical whether you're at a micro-stakes table or a high-stakes one." },
        { term: 'Rounding', def: "Rake is always **floored**, never rounded up, you never pay a cent more than the 5%-or-5-BB rule allows." },
      ] },
      { type: 'para', text: 'For a pot that does get raked, the amount taken is whichever is smaller: 5% of the pot, or 5 big blinds. At a $0.50/$1 table, for example:' },
      { type: 'table', headers: ['Pot size', '5% of pot', 'Cap (5 BB)', 'Rake taken'], rows: [
        ['$20', '$1.00', '$5.00', '$1.00'],
        ['$200', '$10.00', '$5.00', '$5.00'],
      ] },
      { type: 'para', text: 'What is taken does not all stay with the house. [Rakeback](/docs/rakeback) is paid back to the players who generated it first, and **12%** of what is left goes to [stakers](/docs/staking).' },
    ] },
  ] },
  { group: 'Rewards & progression', sections: [
    { id: 'the-suited-token', title: 'The $SUITED token', blocks: [
      { type: 'para', text: "**$SUITED** is the token the room is built around. You do not need to hold any of it to play, every table is priced in {token}, and a player who never touches $SUITED is not at a disadvantage at the table." },
      { type: 'para', text: 'What it does is give the room a second source of income, and hand most of that income back to the people who use it.' },

      { type: 'heading', level: 3, text: 'Two streams, not one' },
      { type: 'keyvals', rows: [
        { term: 'The room earns rake', def: 'Every raked pot takes 5%, capped at 5 big blinds, and never on a pot that saw no flop. That money pays [rakeback](/docs/rakeback) first, and 12% of what is left goes to stakers.' },
        { term: 'The token earns creator fees', def: 'Every trade of $SUITED pays a creator fee, in {token}, whether or not the trader has ever opened Suited. That money never touches a table, it is split five ways, below.' },
      ] },
      { type: 'callout', tone: 'note', text: 'The two are independent. A quiet week at the tables does not stop creator fees arriving, and a quiet week of trading does not stop rake.' },

      { type: 'heading', level: 3, text: 'Where a creator fee goes' },
      { type: 'para', text: 'The split happens **on chain**, in one transaction, in the contract itself, not in a script somebody has to remember to run:' },
      { type: 'table', headers: ['Share', 'Goes to', 'What it does'], rows: [
        ['30%', 'The jackpot', 'Funds the [daily draw](/docs/the-jackpot) every player is eligible for.'],
        ['20%', 'Stakers', 'Paid to anyone with $SUITED [locked](/docs/staking), spread over the following seven days.'],
        ['20%', 'Tournaments', 'Adds to prize pools, so an event can pay more than its entries collected.'],
        ['20%', 'The house', 'Runs the thing: servers, gas, the people.'],
        ['10%', 'Buyback and burn', 'Buys $SUITED on the open market and [burns it](/docs/buyback-and-burn), every day, all of it.'],
      ] },
      { type: 'para', text: '**80% of every creator fee leaves the house**: to players, to stakers, to tournament prize pools, or into the burn.' },

      { type: 'heading', level: 3, text: 'How players and holders pay each other' },
      { type: 'para', text: 'The two sides are not in competition for the same pot, which is the usual arrangement and the reason it usually fails. Here each one funds the other:' },
      { type: 'list', items: [
        'Players generate **rake**, and 12% of the net goes to stakers. More hands dealt, more paid to people holding the token.',
        'Trading generates **creator fees**, and half of every one of them goes straight back to players: 30% to the jackpot, 20% to tournament prize pools. More trading, bigger prizes, at no cost to anyone at a table.',
        'The **burn** takes 10% off the top and removes it from supply permanently, so the float shrinks as the room is used.',
      ] },
      { type: 'callout', tone: 'key', title: 'Holding alone earns no staking rewards', text: 'A balance sitting in your wallet is not a position. Staking rewards are paid on **locked** stake, by weight, see [staking](/docs/staking) for the ladder, the multipliers and what the contract can and cannot do with your tokens. A large enough balance does enter [the jackpot](/docs/the-jackpot) draw on its own, and staking it counts it 1.5×.' },

      { type: 'heading', level: 3, text: 'The contract' },
      /* Both sentences are true of their own moment, and which one shows is
         decided by `TOKEN_CA` in token.js — the same one edit that reveals the
         landing page's address and buy link. Nothing here is swapped by hand. */
      TOKEN_CA
        ? { type: 'para', text: '$SUITED is deployed on {chain}. Its address is **{ca}**, and the total supply is **{supply}**, fixed at the mint.' }
        : { type: 'para', text: '$SUITED has not launched yet, so none of the above is paying out yet, the split, the burn and the staking rewards all begin with the first creator fee. When it launches it will be deployed on {chain}, with a total supply of **{supply}** fixed at the mint, and its address will appear here and on the landing page.' },
      { type: 'callout', tone: 'note', text: "Nothing on this page is a promise of a return. Every figure above is a share of money that has actually arrived, if no fees arrive, the shares of nothing are nothing. What is fixed is the split, and it is fixed in a contract you can read rather than in a sentence here." },
    ] },
    { id: 'rakeback', title: 'Rakeback', blocks: [
      { type: 'para', text: "A share of the [rake](/docs/rake) you generate comes back to you. The share scales with your **lifetime volume wagered**: the more you've played, the higher your tier, and the higher tier applies to every hand going forward." },
      { type: 'table', headers: ['Lifetime wagered', 'Rakeback'], rows: [
        ['$0', '10%'],
        ['$50', '12%'],
        ['$200', '14%'],
        ['$600', '16%'],
        ['$1,800', '18%'],
        ['$5,000', '20%'],
        ['$12,000', '21%'],
        ['$25,000', '22%'],
        ['$50,000', '24%'],
        ['$100,000', '26%'],
        ['$160,000', '28%'],
        ['$250,000', '30%'],
      ] },
      { type: 'para', text: "Rakeback accrues automatically as you play, there's nothing to opt into. It builds up as a balance you can **claim** to your wallet at any time, once it reaches the minimum claim of **$0.05**." },
    ] },
    { id: 'staking', title: 'Staking', blocks: [
      { type: 'para', text: "Lock **$SUITED** for a fixed length of time and earn a share of what the room and the token actually make, paid in {token}. Nothing is minted for it: every cent paid to stakers is revenue that came in first. The whole thing lives in one contract, and [the staking page](/staking) shows its address and reads every figure on it straight off the chain." },
      { type: 'heading', level: 3, text: 'The ladder' },
      { type: 'para', text: 'You choose how long to lock. Longer locks earn a bigger **multiplier**:' },
      { type: 'table', headers: ['Lock', 'Multiplier'], rows: [
        ['3 days', '1×'],
        ['7 days', '1.2×'],
        ['14 days', '1.6×'],
        ['30 days', '2.6×'],
      ] },
      { type: 'para', text: 'Your **weight** is your stake times that multiplier, and the reward pool is divided by weight, every second. The multiplier decides your share of the pool, it never adds to the pool. If everyone locks for 30 days, everyone still splits exactly the same money.' },
      { type: 'callout', tone: 'note', text: 'There is no minimum. A single token is a valid position, it simply earns one token’s worth of weight. The ladder itself is fixed when the contract is deployed and cannot be changed afterwards.' },
      { type: 'heading', level: 3, text: 'Where the rewards come from' },
      { type: 'keyvals', rows: [
        { term: 'Net rake: 12%', def: "The room's take from the tables, after [rakeback](/docs/rakeback) has been paid out. Because rakeback comes out first, that 12% works out at **8.4%–10.8%** of gross [rake](/docs/rake), depending on how much rakeback the tables are paying. It is swept once a day, at midnight New York, and split on chain in the same transaction that moves it." },
        { term: 'Creator fees: 20%', def: 'A share of the trading fees the $SUITED token itself earns. It arrives already in {token}, there is no swap, no bridge and no claim between the trade and the reward. Another 10% of the same fees goes to the [buyback and burn](/docs/buyback-and-burn).' },
      ] },
      { type: 'para', text: "Each payment is **spread evenly over the following seven days** rather than handed out in a lump: rewards stream to stakers by the second, so a position opened an hour ago has earned an hour's worth." },
      { type: 'heading', level: 3, text: 'Claiming, unlocking, extending' },
      { type: 'keyvals', rows: [
        { term: 'Claim any time', def: 'Rewards are claimable while your stake is still locked, your principal is untouched by a claim. One claim pays everything you have earned across every position you hold.' },
        { term: 'No early exit', def: 'A lock runs to its end. There is no fee to leave early because there is no way to leave early.' },
        { term: 'Unlocks land at midnight', def: 'Every unlock is rounded **up to the next 00:00 UTC**, so a 30-day lock taken at lunchtime ends at midnight 30 days later, never mid-afternoon.' },
        { term: 'Extend, never shorten', def: 'You can re-commit a position at any time, to the same length or a longer one. Relocking restarts the clock **from now**: it does not add to the old end, and the contract refuses anything that would finish earlier than the lock already does. Holding 2.6× means being locked a full 30 days from today, every day.' },
        { term: 'When a lock ends', def: 'It stops earning immediately and its weight leaves the pool. Rewards earned up to that moment are kept and stay claimable. Withdraw the tokens, or relock from now.' },
        { term: 'No top-ups', def: 'A position is fixed at the amount you locked. Staking more opens a second position, up to **32** per wallet.' },
      ] },
      { type: 'heading', level: 3, text: 'What the contract cannot do' },
      { type: 'list', items: [
        'Suited **cannot move, unlock or take your stake**. Only the wallet that owns a position can withdraw it, and only once its lock has ended.',
        '**Withdrawing and claiming are never pausable.** New locks can be paused; getting your money out cannot.',
        'Rewards are **pulled in before they are owed**: a payment cannot be announced that the contract does not already hold.',
        'The owner cannot withdraw either token, and ownership cannot be renounced into a dead address.',
      ] },
      { type: 'heading', level: 3, text: 'About the APR you see' },
      { type: 'para', text: "The rate on the staking page is **trailing**: what was really paid in over the days behind us, annualised. It is a record, not a forecast, and it moves with two things, how much revenue comes in, and how much weight is staked against you. Your own stake is part of that: lock a large share of the pool and the rate you see includes your own dilution." },
      { type: 'callout', tone: 'key', title: 'Nothing here is a projection', text: 'Until at least two days of payments exist there is no trailing rate, so the page shows none rather than annualise a single day and call it a yield. Every figure on it, what is locked, what has been paid, what you can claim, is a read from the contract.' },
    ] },
    { id: 'buyback-and-burn', title: 'Buyback and burn', blocks: [
      { type: 'para', text: "**10% of every creator fee** the $SUITED token earns is set aside to buy $SUITED back and burn it. None of it is kept, banked or timed: the rule is that all of it is spent, every day, and every token bought is destroyed." },
      { type: 'heading', level: 3, text: 'How a day runs' },
      { type: 'steps', items: [
        "Creator fees are split as they arrive, and the buyback's share lands in the buyback wallet, a few dollars at a time, all day.",
        "At **midnight New York**, the keeper reads that wallet. Whatever it holds is that day's buyback, and all of it gets spent.",
        "It is spent in **15 separate buys spread over 15 minutes**, not one lump, the same money moves the price less in fifteen pieces than in one.",
        'Every token each buy brings in is **burnt as soon as it lands**, before the next buy.',
      ] },
      { type: 'keyvals', rows: [
        { term: 'All of it, every day', def: "The day's buyback is the wallet's balance at midnight, and the run spends exactly that, the page shows each day's amount beside what was spent, so a shortfall would be visible, not hidden. Fees that arrive while the fifteen minutes are running belong to the next day." },
        { term: 'Never at any price', def: "Each buy is priced moments before it is sent, and refuses to fill more than 3% worse than that price. A buy that would is cancelled, and its share moves into the buys still to come, so the day is still fully spent, just not at a bad price. If a whole day cannot be spent, what is left is carried into the next day's buyback, and shown as carried." },
        { term: 'Burnt, not held', def: 'Bought tokens go to the token\'s own burn function where it has one, lowering the total supply, or otherwise to the dead address `0x…dEaD`, where no one can ever move them.' },
      ] },
      { type: 'callout', tone: 'key', title: 'Every burn is a transaction you can open', text: "The staking page lists each day's buyback with all fifteen buys and fifteen burns, and every one links to the transaction on the explorer. The running total of $SUITED burnt is the sum of those transactions, not a figure we keep." },
    ] },
    { id: 'xp-and-levels', title: 'XP and levels', blocks: [
      { type: 'para', text: "Your level is driven by the same number as rakeback: lifetime volume wagered. There's no separate XP grind, you level up simply by playing." },
      { type: 'code', text: 'level = floor((volume / 56) ^ (1/2.2))' },
      { type: 'para', text: 'A few reference points for how that curve feels in practice:' },
      { type: 'table', headers: ['Level', 'Lifetime volume'], rows: [
        ['30', '≈ $100k'],
        ['50', '≈ $307k'],
        ['75', '≈ $747k'],
        ['100', '≈ $1.4m'],
      ] },
      { type: 'para', text: 'Levels carry titles as you climb:' },
      { type: 'table', headers: ['Level', 'Title'], rows: [
        ['0', 'Fish'],
        ['5', 'Grinder'],
        ['10', 'Reg'],
        ['15', 'Shark'],
        ['20', 'River rat'],
        ['25', 'Crusher'],
        ['30', 'Whale'],
        ['40', 'Legend'],
        ['50', 'Mythic'],
      ] },
      { type: 'callout', tone: 'note', text: "Levels are cosmetic, they don't change how you're dealt or how rake works. Their only mechanical effect is gating a handful of level achievements." },
    ] },
    { id: 'achievements', title: 'Achievements', blocks: [
      { type: 'para', text: 'Achievements track what you\'ve done at the table. Each one you unlock also becomes an equippable avatar, alongside sixteen portrait avatars that are always available regardless of progress, and a prestige portrait for each level title that unlocks when you reach it.' },
      { type: 'table', headers: ['Achievement', 'Unlock condition'], rows: [
        ['First blood', 'Win 1 pot'],
        ['Century', 'Win 100 pots'],
        ['Heater', 'Win 5 pots in a row'],
        ['On the button', 'Play 10,000 hands'],
        ['Reg', 'Reach level 10'],
        ['River rat', 'Reach level 20'],
        ['Whale', 'Reach level 30'],
        ['Legend', 'Reach level 40'],
        ['Day one', "Be one of the first 77 accounts"],
        ['Boat', 'Make 25 full houses at showdown'],
        ['Quads', 'Make four of a kind at showdown'],
        ['Straight flush', 'Make a straight flush at showdown'],
        ['The wheel', 'Make a 5-high straight at showdown'],
        ['Royal', 'Make a royal flush at showdown'],
        ['Jackpot', 'Win a daily jackpot draw'],
        ['Regular', 'Play 25 sessions'],
        ['Seven-deuce', 'Win a showdown holding 7-2 offsuit'],
        ['All in', 'Win an all-in of 200 big blinds or more'],
        ['Suited', 'Make 50 flushes from suited hole cards'],
        ['Five bills', 'Win 25 pots of $500 or more'],
        ['Cooler', 'Lose 25 pots as a bad beat'],
        ['The nuts', 'Win 25 pots holding the nuts at showdown'],
        ['Verified', "Have 100 of your self-checked hands re-verified"],
      ] },
    ] },
    { id: 'leaderboard', title: 'Leaderboard', blocks: [
      { type: 'para', text: 'The leaderboard ranks players by **profit**: net winnings, not volume, with ties broken by whoever wagered more.' },
      { type: 'list', items: [
        'Three windows: **daily**, which resets at 00:00 UTC with the jackpot draw, **weekly**, which resets Sunday at 00:00 UTC, and **all-time**.',
        'Filterable by stake, so you can compare against players at your own level.',
        "You need **5 hands** in the window to appear on the board.",
        "Whether or not you're ranked, you always see your own row.",
      ] },
    ] },
    { id: 'the-jackpot', title: 'The jackpot', blocks: [
      { type: 'para', text: 'A **daily** prize pool, funded from **creator fees**: a share of the trading fees on the Suited token, the same source that pays [stakers](/docs/staking). The jackpot grows with the token, not out of your rake; it rolls into a standalone on-chain contract, and the pool you see is that contract\'s real balance.' },
      { type: 'heading', level: 3, text: 'Two ways in' },
      { type: 'para', text: "**Play.** You earn tickets from your volume that day, the more you play, the more tickets you hold, though deliberately less than proportionally, so a hundred times the volume doesn't buy a hundred times the tickets. A per-player cap keeps any one player from dominating the draw, and a small daily volume floor is required to enter." },
      { type: 'para', text: "**Hold $SUITED.** Holding at least **0.1%** of the token's supply puts your wallet in the same draw, for the same prize, without playing a hand. What counts is the **lowest** you held across the whole UTC day, wallet and staked together, so tokens bought during a day count from the next one, and selling for an hour counts against the day. Staked tokens count **1.5×**, and reach full weight sooner (0.35% staked, against 0.5% held; below full weight a holding counts a third). Holders share at most **18%** of the draw between them, and no holder is ever likelier to win than the best-placed player. The jackpot page shows the thresholds the draw is using." },
      { type: 'para', text: "Contracts are never drawn, the staking contract holding everyone's stake, the trading pool, any other, because a contract could not claim the prize. Neither are Suited's own wallets." },
      { type: 'heading', level: 3, text: 'How the winner is drawn' },
      { type: 'para', text: "The draw carries the same guarantee as [the shuffle](/docs/provably-fair-shuffle): nothing that decides it is chosen by Suited after the fact, and all of it is published." },
      { type: 'steps', items: [
        'When the day opens, a **commitment** is published: the hash of a secret seed. The seed cannot change after that without breaking the hash.',
        "At 00:00 UTC the day closes and the entries are fixed, every player's volume, every holder's lowest balance.",
        "The randomness mixes the seed with {entropy}, precisely, **the first Ethereum block at or after the close**, taken once it is finalised, about a quarter of an hour later. The block is fixed by that rule, so there is no moment to choose: a draw run later lands on the same block.",
        'The seed is revealed and the whole draw is published: every entry, its inputs and its chance, in the order the draw walked them. Waiting for that block to finalise takes about a quarter of an hour, so the jackpot page says "drawing…" for a few minutes after midnight.',
      ] },
      { type: 'code', text: 'commit = SHA256("suited/draw/v1" ‖ seed ‖ day)\nrandom = first 7 bytes of SHA256("suited/draw/v1" ‖ seed ‖ day ‖ blockhash) ÷ 2^56\nwinner = subtract each ticket\'s chance from random × the total, in order; the one that reaches zero wins' },
      { type: 'heading', level: 3, text: 'Check a draw' },
      { type: 'para', text: "Every recent winner on the leaderboard's jackpot page has a **verify** link. It re-runs that day's draw in your browser, a second implementation of the draw, not the server checking itself, and confirms that the seed matches the commitment, the randomness follows from the seed and the block, every entry's chance follows from its published inputs, and the walk lands on the winner. It links the Ethereum block too: check on any block explorer that its hash is the one used, and that it is the first block after 00:00 UTC." },
      { type: 'para', text: "The full record is public at `/api/jackpot/draw?day=YYYY-MM-DD`. Entrants appear under a per-day hash of their address rather than the address itself, so the list can be checked without becoming a directory of who plays; signed in, the check finds your own entry and shows the chance you had." },
      { type: 'heading', level: 3, text: 'Claiming your prize' },
      { type: 'para', text: "The prize is paid **on chain, straight to your own wallet**. Suited never moves it for you. When you win, a **Claim** button appears on the leaderboard's jackpot page, and signing in anywhere on the site tells you a prize is waiting; one tap submits your own transaction to the jackpot contract, and the USDC lands in your wallet." },
      { type: 'para', text: "You have **24 hours** from the draw to claim, a day's prize is settled within a day. Until then it is held for you, out of the pool anyone else can win. Unclaimed, it goes back into the pool and is added to a later draw. A day that closes with nobody in the draw keeps its pool the same way: it rolls into the next day's." },
      { type: 'callout', tone: 'key', title: 'Yours to take, and visible to everyone', text: "The jackpot lives in its own contract, separate from the vault that holds player balances. Suited signs a voucher naming you and the exact amount; the contract pays that and nothing more, once. Every claim's transaction is linked on the recent-winners page, so a paid jackpot is something anyone can verify on chain, not a number we assert." },
    ] },
  ] },
  { group: 'Playing', sections: [
    { id: 'how-a-hand-works', title: 'How a hand works', blocks: [
      { type: 'para', text: "Every table at Suited plays six-max no-limit hold'em, up to six players, no limit on how much you can bet at any point in the hand." },
      { type: 'heading', level: 3, text: 'Blinds and streets' },
      { type: 'para', text: "Two players post forced bets before any cards are dealt: the **small blind** and the **big blind**, seated immediately left of the dealer button. The button, and the blinds with it, moves one seat clockwise after every hand, so the cost of playing is shared evenly around the table over time." },
      { type: 'keyvals', rows: [
        { term: 'Preflop', def: 'Each player is dealt two private hole cards, then betting starts with the player left of the big blind.' },
        { term: 'Flop', def: 'Three community cards are dealt face up, shared by everyone still in the hand.' },
        { term: 'Turn', def: 'A fourth community card is dealt, followed by another round of betting.' },
        { term: 'River', def: 'The fifth and final community card is dealt, followed by the last round of betting.' },
        { term: 'Showdown', def: 'Players still in the hand reveal their cards, and the best five-card hand, any combination of hole cards and community cards, takes the pot.' },
      ] },
      { type: 'heading', level: 3, text: 'Hand rankings' },
      { type: 'para', text: 'From strongest to weakest:' },
      { type: 'list', ordered: true, items: [
        'Royal flush',
        'Straight flush',
        'Four of a kind',
        'Full house',
        'Flush',
        'Straight',
        'Three of a kind',
        'Two pair',
        'Pair',
        'High card',
      ] },
    ] },
    { id: 'cash-games', title: 'Cash games', blocks: [
      { type: 'para', text: "Cash games are the core of Suited: sit down with real money, play as long as you like, and leave whenever you like. Every chip on the table is worth exactly its dollar value." },
      { type: 'heading', level: 3, text: 'Stakes' },
      { type: 'para', text: 'Six stakes run at all times, each with its own buy-in range:' },
      { type: 'table', headers: ['Stakes', 'Small / big blind', 'Buy-in range'], rows: [
        ['1¢ / 2¢', '$0.01 / $0.02', '$0.40 – $2'],
        ['5¢ / 10¢', '$0.05 / $0.10', '$2 – $10'],
        ['25¢ / 50¢', '$0.25 / $0.50', '$10 – $50'],
        ['$1 / $2', '$1 / $2', '$50 – $200'],
        ['$2 / $5', '$2 / $5', '$100 – $500'],
        ['$5 / $10', '$5 / $10', '$200 – $1,000'],
      ] },
      { type: 'para', text: 'Buy-ins top out at **100 big blinds** everywhere and start at **20**: $1/$2 is the one exception, starting a little deeper at $50. You choose how deep to sit within that range when you take a seat. If you bust, you can rebuy right at the table without giving up your seat, any amount within the buy-in range, and the chips go live at the start of the next hand, never mid-hand.' },
      { type: 'heading', level: 3, text: 'Leaving and coming back' },
      { type: 'list', items: [
        "**Sit up**: keep your seat, skip hands. You're dealt out until you sit back down, so a short break never costs you your spot.",
        '**Sit down**: rejoin the action.',
        '**Leave**: give up your seat. Your chips return to your bankroll at the next hand boundary, not mid-hand.',
      ] },
      { type: 'heading', level: 3, text: 'Anti-ratholing' },
      { type: 'para', text: "At the two highest stakes, $2/$5 and $5/$10, leaving with chips still in front of you means that returning to that same stake within the hour requires bringing back at least what you left with. It's the rule that stops a big stack from being played down to a short one, cashed out, and sat back down short." },
      { type: 'callout', tone: 'note', text: "Busting isn't ratholing. If you lose your stack, you're free to sit back down at any size within the buy-in range." },
    ] },
    { id: 'at-the-table', title: 'At the table', blocks: [
      { type: 'para', text: "Once you're seated, a small set of actions and table tools carry you through every hand." },
      { type: 'heading', level: 3, text: 'Actions' },
      { type: 'list', items: [
        '**Fold**: give up the hand and any claim to the pot.',
        '**Check**: pass the action without betting, when no one has bet before you this street.',
        '**Call**: match the current bet.',
        "**Raise**: bet more than the current amount. The number you enter is the **total** you're betting this street, not the amount you're adding on top of the call.",
        '**All-in**: bet every chip you have left.',
      ] },
      { type: 'para', text: "Pre-actions let you act before it's your turn, check/fold and call-any are both available out of turn, so you don't have to sit through a street you already know your play for." },
      { type: 'heading', level: 3, text: 'Time' },
      { type: 'para', text: "Each action runs against a clock, a little shorter preflop, a little longer once there's a board to think about. If the clock runs out, your hand is checked when checking is free and folded otherwise." },
      { type: 'heading', level: 3, text: 'Side pots and all-ins' },
      { type: 'para', text: "When a player is all-in for less than others are betting, the extra chips from the deeper stacks form a **side pot** that the all-in player can't win. Once everyone left is all-in with no more betting possible, the hand runs out immediately, cards are shown as soon as betting closes rather than held back to the end. Any bet that goes uncalled is returned to whoever made it." },
      { type: 'heading', level: 3, text: 'Chat, spectating, and reconnecting' },
      { type: 'para', text: "Table chat is open to seated players and flood-limited, so it can't be used to spam the table. If you stand up from a table, you can keep watching it, spectators see the community cards and the action, never hole cards, and can't chat. A spectator is also never sent a hand's revealed seed, which is what would let them rebuild the deck and read what was folded." },
      { type: 'para', text: "If your connection drops, you have about **thirty seconds** to get back before the seat is released and your chips are returned to your balance, nothing is lost, but the seat is gone. And **the hand does not wait**: a turn that begins while you are away gets about a second before the table acts for you, checking if checking is free and folding if it is not. Miss two hands and you come back sitting out, ready to rejoin the next deal rather than already in it." },
    ] },
    { id: 'private-rooms', title: 'Private rooms', blocks: [
      { type: 'para', text: 'Private rooms let you set up a table for a specific group instead of playing off the public stakes list.' },
      { type: 'list', items: [
        '**2–6 seats**',
        '**Custom stakes**: set whatever small and big blind you want',
        '**Custom buy-in range**: set your own minimum and maximum, not tied to the 20–100 big blinds of the public stakes',
        '**Pin-gated share link**: only people with the link and the PIN can join',
      ] },
      { type: 'para', text: 'A room that sits empty for around twenty minutes closes itself.' },
      { type: 'para', text: "Everything else about a private room works like any public table: the same [provably fair shuffle](/docs/provably-fair-shuffle), the same [rake](/docs/rake), and the same actions and time banks described in [At the table](/docs/at-the-table)." },
    ] },
  ] },
  { group: 'Tournaments', sections: [
    { id: 'how-tournaments-work', title: 'How tournaments work', blocks: [
      { type: 'para', text: "Tournaments run as **freezeouts**: no re-entry, no rebuys, no add-ons. Bust, and you're out for good." },
      { type: 'heading', level: 3, text: 'Registering' },
      { type: 'para', text: "You register by signing a message. Entry is a **buy-in plus a fee**, both paid from your bankroll. If you change your mind, you can unregister for a full refund any time while registration is still open." },
      { type: 'para', text: "If the tournament doesn't reach its minimum number of entrants by start time, it's cancelled and everyone is refunded, buy-in and fee both." },
      { type: 'heading', level: 3, text: 'Stacks and blinds' },
      { type: 'para', text: "Everyone starts with an equal stack. From there, blinds rise on a fixed timer through a set ladder, with **antes** joining partway up to keep pots growing as the field thins. Turn timers run a touch longer than at a cash table, giving you a bit more room to think as the blinds climb." },
      { type: 'para', text: "The cards and betting themselves work exactly as described in [How a hand works](/docs/how-a-hand-works), a tournament changes the stakes and the clock, not the rules of a hand." },
    ] },
    { id: 'multi-table-play', title: 'Multi-table play', blocks: [
      { type: 'para', text: "A tournament with enough entrants runs across several tables at once, and Suited keeps the field organized as it shrinks." },
      { type: 'keyvals', rows: [
        { term: 'Balancing', def: 'As players bust, seats empty unevenly across tables. Suited moves players between tables to keep them balanced, so no table plays shorthanded while another stays full.' },
        { term: 'Breaking', def: "When a table can no longer be kept balanced, it **breaks**: its remaining players are redistributed to the other tables still running." },
        { term: 'The bubble', def: "Near the money, the tournament plays **hand-for-hand**: every table plays exactly one hand, then waits for the others to finish before dealing the next. That keeps bust order fair across tables right at the point it matters most." },
        { term: 'Final table', def: "Once the field fits at a single table, seats are redrawn and play continues from there, through to heads-up, and a winner." },
      ] },
    ] },
    { id: 'prizes-and-payouts', title: 'Prizes and payouts', blocks: [
      { type: 'para', text: "The prize pool is **fixed the moment registration closes**: every buy-in that came in, plus any added money, and nothing added or taken away after that point." },
      { type: 'para', text: "Payouts follow a published place structure that pays a share of places, not just first. A typical six-place structure splits the pool like this:" },
      { type: 'table', headers: ['Place', 'Share of prize pool'], rows: [
        ['1st', '40%'],
        ['2nd', '24%'],
        ['3rd', '16%'],
        ['4th', '10%'],
        ['5th', '6%'],
        ['6th', '4%'],
      ] },
      { type: 'callout', tone: 'key', text: "You're paid the moment you finish in the money. Winnings land in your [bankroll](/docs/bankroll-and-cashing-out) automatically, there's no claim step to remember." },
    ] },
  ] },
  { group: 'Reference', sections: [
    { id: 'faq', title: 'FAQ', blocks: [
      { type: 'keyvals', rows: [
        { term: 'Do I need a wallet?', def: "Yes. Suited connects to {walletQ}, there's no account or password to create. See [Connecting a wallet](/docs/connecting-a-wallet)." },
        { term: 'Is it fair?', def: 'Every hand is shuffled with a commit–reveal scheme you can re-deal and check yourself, hand by hand. See [The provably fair shuffle](/docs/provably-fair-shuffle).' },
        { term: 'Where are my funds? Is my money safe?', def: "Your funds sit in an on-chain vault with rules Suited can't break: it can't mint value and it can't take more than the rake. Every checkpoint that moves balances has to sum to zero net of rake and leave the vault fully collateralised, or the contract rejects it. See [Custody and your money](/docs/custody-and-your-money)." },
        { term: "What's the rake?", def: '**5% of the pot, capped at 5 big blinds**: uncontested pots, and hands that end before the flop, are never raked. See [Rake](/docs/rake).' },
        { term: 'How do I cash out?', def: "Withdraw from your bankroll any time you're not seated with an active stack. See [Bankroll and cashing out](/docs/bankroll-and-cashing-out)." },
        { term: 'What stakes can I play?', def: 'Six stakes run at all times, from 1¢/2¢ up to $5/$10. See [Cash games](/docs/cash-games).' },
        { term: 'How do tournaments pay?', def: "A published place structure pays a share of places, not just first, and winnings land in your bankroll automatically the moment you finish in the money. See [Prizes and payouts](/docs/prizes-and-payouts)." },
        { term: 'How does rakeback work?', def: 'A share of the rake you generate comes back to you automatically, scaling with your lifetime volume wagered, and you can claim it to your wallet at any time. See [Rakeback](/docs/rakeback).' },
      ] },
    ] },
    { id: 'glossary', title: 'Glossary', blocks: [
      { type: 'heading', level: 3, text: 'Poker terms' },
      { type: 'keyvals', rows: [
        { term: 'Blind', def: "A forced bet posted before any cards are dealt, so there's always something to play for. See [How a hand works](/docs/how-a-hand-works)." },
        { term: 'Button', def: 'The dealer position, which moves one seat clockwise after every hand. See [How a hand works](/docs/how-a-hand-works).' },
        { term: 'Pot', def: 'The chips at stake in a hand, everything bet and called, waiting to be won.' },
        { term: 'All-in', def: 'Betting every chip you have left. See [At the table](/docs/at-the-table).' },
        { term: 'Side pot', def: "A separate pot formed when a player is all-in for less than others are still betting, the all-in player can't win it. See [At the table](/docs/at-the-table)." },
        { term: 'Showdown', def: 'Revealing cards after the river so the best hand can be found and the pot awarded. See [How a hand works](/docs/how-a-hand-works).' },
        { term: 'VPIP', def: 'Voluntarily put in pot, the share of hands a player chooses to enter.' },
        { term: 'PFR', def: 'Preflop raise, the share of hands a player raises before the flop.' },
        { term: 'WTSD', def: 'Went to showdown, the share of hands a player takes all the way to showdown.' },
        { term: 'The nuts', def: 'The best possible hand given the cards on board.' },
        { term: 'Bad beat', def: 'Losing a hand after being a heavy favorite, usually to a lucky final card.' },
      ] },
      { type: 'heading', level: 3, text: 'Suited terms' },
      { type: 'keyvals', rows: [
        { term: 'Bankroll', def: 'Your single balance behind every table, deposits add to it, and results at the table adjust it. See [Bankroll and cashing out](/docs/bankroll-and-cashing-out).' },
        { term: 'Rake', def: "Suited's cut of a contested pot: 5%, capped at 5 big blinds. See [Rake](/docs/rake)." },
        { term: 'Rakeback', def: 'A share of your rake paid back to you, scaling with your lifetime volume wagered. See [Rakeback](/docs/rakeback).' },
        { term: 'Commit–reveal', def: "The scheme behind the shuffle: a hash of a secret seed is published before the hand, and the seed behind it is revealed after, so anyone can recompute the shuffle and check it. See [The provably fair shuffle](/docs/provably-fair-shuffle)." },
        { term: 'Client seed', def: "Randomness your client adds to a hand's shuffle automatically, alongside the server's committed seed, so no single party picks the deck alone. See [The provably fair shuffle](/docs/provably-fair-shuffle)." },
        { term: 'Freezeout', def: "A tournament format with no re-entry, no rebuys, and no add-ons, bust, and you're out for good. See [How tournaments work](/docs/how-tournaments-work)." },
        { term: 'Hand-for-hand', def: 'Near the bubble, every table plays exactly one hand, then waits for the others to finish before dealing the next. See [Multi-table play](/docs/multi-table-play).' },
        { term: 'The bubble', def: 'The stretch right before the money, where the tournament plays hand-for-hand to keep bust order fair across tables. See [Multi-table play](/docs/multi-table-play).' },
      ] },
    ] },
  ] },
];
