/* The ground behind every screen: an aurora, a grid floor rolling toward the
 * viewer and suit pips rising through it. Styles are the `lp-*` background
 * rules in globals.css.
 *
 * Decorative and inert: aria-hidden, no pointer events, nothing reads it.
 * Mounted once in SuitedTemplate rather than per screen, so the motion carries
 * on across navigation instead of restarting.
 */

const SUITS = ['♠', '♥', '♦', '♣'];
/* Fixed, not random, so the server and client render the same markup. */
const PIPS = [
  { x: '6%', s: '28px', d: '19s', delay: '-2s', r: '40deg' },
  { x: '14%', s: '18px', d: '24s', delay: '-11s', r: '-60deg' },
  { x: '23%', s: '36px', d: '28s', delay: '-6s', r: '25deg' },
  { x: '34%', s: '16px', d: '21s', delay: '-15s', r: '-30deg' },
  { x: '47%', s: '24px', d: '26s', delay: '-9s', r: '55deg' },
  { x: '58%', s: '20px', d: '22s', delay: '-18s', r: '-45deg' },
  { x: '67%', s: '32px', d: '30s', delay: '-4s', r: '35deg' },
  { x: '76%', s: '18px', d: '20s', delay: '-13s', r: '-50deg' },
  { x: '85%', s: '26px', d: '25s', delay: '-7s', r: '60deg' },
  { x: '93%', s: '22px', d: '23s', delay: '-16s', r: '-35deg' },
];

export default function Backdrop() {
  return (
    <div className="felt-bg" aria-hidden="true">
      <div className="lp-aurora lp-aurora--a" />
      <div className="lp-aurora lp-aurora--b" />
      <div className="lp-aurora lp-aurora--c" />
      <div className="lp-grid"><div className="lp-grid-plane" /></div>
      {PIPS.map((p, i) => (
        <span
          key={i}
          className={'lp-pip' + (i % 2 ? ' lp-pip--light' : '')}
          style={{ ['--x' as any]: p.x, ['--s' as any]: p.s, ['--d' as any]: p.d, ['--delay' as any]: p.delay, ['--r' as any]: p.r }}
        >
          {SUITS[i % 4]}
        </span>
      ))}
      <div className="lp-vignette" />
    </div>
  );
}
