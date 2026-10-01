/* The $SUITED mint address — the one place it is written down.
 *
 * Empty until the token launches, and everything that mentions the token reads
 * it from here and hides itself while it is empty: the landing page's "buy on
 * fomo" button and the copyable address under the hero cards, and the contract
 * line in the docs page's token section. Publishing the mint is one edit, to
 * the line below, and nothing else.
 *
 * The supply is fixed at the mint and is not an input anywhere — the jackpot's
 * holder thresholds read `totalSupply()` off chain (see holder-draw.ts). It
 * lives here only so the docs page can state it.
 */

/** The mint address, once there is one. Empty string means "not launched". */
export const TOKEN_CA = '0x448168B7C3736FB55C552dCe72D5f1F5B30d77Cb';

/** Fixed at the mint: one billion, the number the docs page prints. */
export const TOKEN_SUPPLY = '1,000,000,000';
