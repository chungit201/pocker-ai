/* The landing screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 *
 * Layout: a centred hero over an "arena" — an oval table seen from above, six
 * seats on its rail and the commit card dealt in the middle, with the live
 * figures stacked either side of it like chips. It fits one screen: the column
 * is the viewport tall and only the arena flexes. The `lp-*` classes live in
 * globals.css, because the phone sizes need media queries.
 *
 * The card flip is driven from SuitedApp by four refs — `cardRef` (the card
 * that turns), `ctaRef` (the button whose proximity turns it), `sealedRef` and
 * `verifiedRef` (the status that cross-fades with it). Keep all four mounted.
 */
import { interp } from '../dc-runtime';

/* The pip, the brand mark: two halves of a lozenge. */
function Pip({ dark = '#222c47', size }: { dark?: string; size: string }) {
  return (
    <svg viewBox="0 0 72 100" style={{ display: 'block', flex: 'none', width: size, height: 'auto' }}>
      <path d="M36,0 Q22,29 0,50 Q22,71 36,100 Z" style={{ fill: dark }} />
      <path d="M36,0 Q50,29 72,50 Q50,71 36,100 Z" style={{ fill: '#8b5cf6' }} />
    </svg>
  );
}

function Diamond() {
  return (
    <svg width="8.08cqw" height="11.15cqw" viewBox="0 0 72 100" style={{ display: 'block' }}>
      <polygon points="36,0 72,50 36,100 0,50" style={{ fill: '#dfe6f8' }} />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 14 11" style={{ display: 'block', width: '11px', height: '9px', overflow: 'visible' }}>
      <polyline points="1,6 5,10 13,2" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '2' }} />
    </svg>
  );
}

const FEATURES = [
  'Shuffles committed before the deal',
  'Chips stay in your wallet',
  '5% rake, capped at 5bb',
];

/* Seats around the rail, as a share of the oval. One is "you". */
const SEATS: { x: string; y: string; you?: boolean }[] = [
  { x: '24%', y: '6%' },
  { x: '76%', y: '6%' },
  { x: '98%', y: '50%' },
  { x: '76%', y: '94%' },
  { x: '24%', y: '94%', you: true },
  { x: '2%', y: '50%' },
];

function Stat({ label, value, sub, tone }: { label: string; value: any; sub: any; tone: string }) {
  return (
    <div className="lp-stat">
      <div className="lp-stat-head">
        <span className="lp-chip" style={{ ['--chip' as any]: tone }} />
        <span className="lp-label">{label}</span>
      </div>
      <div className="lp-statval">{interp(value)}</div>
      <div className="lp-statsub">{interp(sub)}</div>
    </div>
  );
}

export default function Landing({ v }: { v: any }) {
  return (
    <div className="su-stage lp">

      <div className="lp-wrap">
        <header className="lp-top">
          <button onClick={v.goLanding} className="lp-brand">
            <Pip size="20px" />
            <span>Suited</span>
          </button>
          <nav className="lp-nav">
            <a className="lp-navlink" href="/docs" onClick={v.goDocsNav}>Docs</a>
            {/* ▼▼ EDIT THESE LINKS — X and discord destinations (change the hrefs) ▼▼ */}
            <a className="lp-navlink" href="https://x.com/suitedclub" target="_blank" rel="noopener noreferrer">X</a>
            <a className="lp-navlink" href="https://discord.gg/FQtbNNTVF8" target="_blank" rel="noopener noreferrer">Discord</a>
            {/* ▲▲ EDIT THESE LINKS ▲▲ */}
          </nav>
          <button className="lp-launch" onClick={v.goLobby}>{'Open lobby'}</button>
        </header>

        <section className="lp-hero">
          <div className="lp-eyebrow">
            <span className="lp-dot" />
            {'Live on chain · 6-max no-limit'}
          </div>
          <h1 className="lp-title">
            {"No-limit hold'em that "}
            <em>{'settles in a block.'}</em>
          </h1>
          <p className="lp-sub">{'Six seats, real chips, provable shuffles.'}</p>
          <div className="lp-ctas">
            <button className="lp-cta" ref={v.ctaRef} onClick={v.goLobby}>
              {'Play now'}
              <svg viewBox="0 0 16 16" style={{ width: '16px', height: '16px', display: 'block' }}>
                <path d="M3 8h9M8.5 4l4 4-4 4" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }} />
              </svg>
            </button>
            {/*
               Both this and the address under the table appear only once
               `TOKEN_CA` in engine/token.js is set. Until then there is
               nothing to buy and no address to show.
            */}
            {v.caOn ? (
              <a className="lp-ghost" href={v.caBuyHref} target="_blank" rel="noopener noreferrer">{'Buy on Fomo'}</a>
            ) : null}
          </div>
          <ul className="lp-features">
            {FEATURES.map((f) => (
              <li key={f}><Check />{f}</li>
            ))}
          </ul>
        </section>

        {/*
           The arena. On a narrow screen the oval moves above the figures and
           takes the full width; the figures become tiles under it.
        */}
        <section className="lp-arena">
          <div className="lp-side lp-side--l">
            <Stat label="Hands dealt" value={v.statHands} sub={v.statHandsSub} tone="#8b5cf6" />
            <Stat label="USDC in play" value={v.statInPlay} sub={v.statTablesSub} tone="#94a3c4" />
          </div>

          <div className="lp-table">
            <div className="lp-felt">
              {SEATS.map((s, i) => (
                <span key={i} className={'lp-seat' + (s.you ? ' lp-seat--you' : '')} style={{ left: s.x, top: s.y }}>
                  {s.you ? 'You' : ''}
                </span>
              ))}

              <div className="lp-felt-inner">
                <span className="lp-status">
                  <span ref={v.sealedRef} className="lp-status-sealed">
                    <span className="lp-lock" />
                    {'Sealed · not yet dealt'}
                  </span>
                  <span ref={v.verifiedRef} className="lp-status-verified" style={{ opacity: 0 }}>
                    <Check />
                    {'Verified on-chain'}
                  </span>
                </span>

                {/* Query container drawn at 520px: 1px there is 0.1923cqw. */}
                <div className="lp-cards">
                  <div style={{ position: 'absolute', left: '3.46cqw', top: '6.54cqw', width: '43.08cqw', height: '60.38cqw', borderRadius: '2.12cqw', background: '#0d1220', transform: 'rotate(-6deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3cqw 7cqw rgba(0,0,0,0.5)' }}>
                    <div style={{ position: 'absolute', inset: '2.12cqw', borderRadius: '1.35cqw', border: '1px solid rgba(232,236,248,0.22)' }} />
                    <Diamond />
                    <div className="lp-cardcommit">{interp(v.commitBack)}</div>
                  </div>

                  <div style={{ position: 'absolute', right: '2.69cqw', top: '12.69cqw', width: '43.08cqw', height: '60.38cqw', perspective: '288.46cqw', transform: 'rotate(4deg)' }}>
                    <div ref={v.cardRef} style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', willChange: 'transform' }}>
                      <div style={{ position: 'absolute', inset: '0', borderRadius: '2.12cqw', background: '#0d1220', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', boxShadow: '0 3.46cqw 8.46cqw rgba(139,92,246,0.25)' }}>
                        <div style={{ position: 'absolute', inset: '2.12cqw', borderRadius: '1.35cqw', border: '1px solid rgba(232,236,248,0.2)' }} />
                        <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Diamond />
                        </div>
                        <div className="lp-cardcommit">{interp(v.commitFront)}</div>
                      </div>

                      <div style={{ position: 'absolute', inset: '0', borderRadius: '2.12cqw', background: '#f2f5ff', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)', boxShadow: '0 3.46cqw 8.46cqw rgba(0,0,0,0.375)' }}>
                        <div style={{ position: 'absolute', left: '3.85cqw', top: '3.46cqw', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.35cqw' }}>
                          <span className="lp-rank">{'A'}</span>
                          <Pip dark="#101828" size="2.69cqw" />
                        </div>
                        <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Pip dark="#101828" size="15.77cqw" />
                        </div>
                        <div style={{ position: 'absolute', right: '3.85cqw', bottom: '3.46cqw', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.35cqw', transform: 'rotate(180deg)' }}>
                          <span className="lp-rank">{'A'}</span>
                          <Pip dark="#101828" size="2.69cqw" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <span className="lp-mono lp-commit">{interp(v.commitStrip)}</span>
              </div>
            </div>
          </div>

          <div className="lp-side lp-side--r">
            <Stat label="Jackpot" value={v.statJackpot} sub={v.statJackpotSub} tone="#e8c66a" />
            {v.caOn ? (
              <div className="lp-ca">
                <span className="lp-label">{'Token'}</span>
                <span className="lp-mono su-copytext">{interp(v.ca)}</span>
                <button className="lp-copy" type="button" data-copy-line data-label="Copy">{'Copy'}</button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
