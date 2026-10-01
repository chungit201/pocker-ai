/* The landing screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { interp } from '../dc-runtime';

export default function Landing({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      {/*
         NOT `su-stage`, and that is the whole point of this comment.
         Wearing it scales the page up on a big display, which is wanted — but
         this column is sized in vh and zoom multiplies a vh-derived height, so
         the content became 106vh and the page grew a scrollbar. That breaks
         the invariant three lines down. Making this screen scale needs its
         sizes converted to px first (so the composition has a fixed intrinsic
         height for zoom to act on) AND a separate type scale for phones, since
         below 940px zoom is 1 and this hero's maxima are hero-sized. One class
         is not enough; measured 71px of overflow at 1920x1080, 134px at 1440p.
      */}
      {"\r\n    "}
      <div className="su-stage" style={{ position: "relative", flex: "1", minHeight: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {"\r\n      "}
        {/*
           One light source over the felt, per the redesign. The ASCII field is
           retired (its canvases are gone, so it never boots); the ground is felt
           now and the page carries its own light.
        */}
        {"\r\n      "}
        <div style={{ position: "absolute", inset: "0", pointerEvents: "none", zIndex: "0", background: "radial-gradient(60% 58% at 62% 36%, rgba(148,163,196,0.08), rgba(0,0,0,0.3) 100%)" }} />
        {"\r\n      "}
        {/*
           One screen, no scroll. The column is exactly the viewport tall, the
           masthead and ledger take what they need, and the hero absorbs the
           rest — so the vertical rhythm is in vh and only the hero flexes.
        */}
        {"\r\n      "}
        <div style={{ position: "relative", zIndex: "1", flex: "1", minHeight: "0", width: "100%", maxWidth: "1360px", margin: "0 auto", display: "flex", flexDirection: "column", padding: "clamp(16px,22px,40px) clamp(20px,91px,120px) clamp(16px,60px,70px)" }}>
          {"\r\n\r\n        "}
          {/* masthead: the pip lockup, on a rule */}
          {"\r\n        "}
          <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "48px", paddingBottom: "clamp(11px,17px,26px)", borderBottom: "1px solid rgba(232,236,248,0.18)" }}>
            {"\r\n          "}
            <button onClick={v.goLanding} style={{ display: "flex", alignItems: "center", gap: "clamp(10px,21px,18px)" }}>
              {"\r\n            "}
              <svg width="26" height="36" viewBox="0 0 72 100" style={{ display: "block", flex: "none", width: "clamp(18px,22px,26px)", height: "auto" }}>
                <path d="M36,0 Q22,29 0,50 Q22,71 36,100 Z" style={{ fill: "#222c47" }} />
                <path d="M36,0 Q50,29 72,50 Q50,71 36,100 Z" style={{ fill: "#8b5cf6" }} />
              </svg>
              {"\r\n            "}
              <span style={{ fontWeight: "500", fontSize: "clamp(24px,29px,34px)", letterSpacing: "-.03em", lineHeight: ".74", color: "#e8ecf8" }}>
                {"suited"}
              </span>
              {"\r\n          "}
            </button>
            {"\r\n          "}
            <div style={{ display: "flex", alignItems: "center", gap: "clamp(14px,33px,28px)" }}>
              {"\r\n            "}
              <a className="scp2" href="/docs" onClick={v.goDocsNav} style={{ fontSize: "clamp(12px,14px,15px)", fontWeight: "300", color: "#e8ecf8", borderBottom: "1px solid rgba(232,236,248,0.34)", textDecoration: "none" }}>
                {"docs"}
              </a>
              {"\r\n            "}
              {/* ▼▼ EDIT THESE LINKS — X and discord destinations (change the hrefs) ▼▼ */}
              {"\r\n            "}
              <a className="scp2" href="https://x.com/suitedclub" target="_blank" rel="noopener noreferrer" style={{ fontSize: "clamp(12px,14px,15px)", fontWeight: "300", color: "#e8ecf8", borderBottom: "1px solid rgba(232,236,248,0.34)", textDecoration: "none" }}>
                {"x"}
              </a>
              {"\r\n            "}
              <a className="scp2" href="https://discord.gg/FQtbNNTVF8" target="_blank" rel="noopener noreferrer" style={{ fontSize: "clamp(12px,14px,15px)", fontWeight: "300", color: "#e8ecf8", borderBottom: "1px solid rgba(232,236,248,0.34)", textDecoration: "none" }}>
                {"discord"}
              </a>
              {"\r\n            "}
              {/* ▲▲ EDIT THESE LINKS ▲▲ */}
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n\r\n        "}
          {/*
             hero. flex:1 so it takes whatever the masthead and ledger leave,
             and min-height:0 so it yields rather than pushing the page taller.
             Type is capped on both axes — a short, wide window is the case
             that overflows, and vw alone cannot see it.
          */}
          {"\r\n        "}
          <div className="su-hero-row" style={{ flex: "1", minHeight: "0", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            {"\r\n\r\n          "}
            <div style={{ flex: "1 1 460px", minWidth: "min(100%,300px)", maxWidth: "760px", display: "flex", flexDirection: "column", gap: "clamp(11px,18px,30px)" }}>
              {"\r\n            "}
              <h1 className="su-hero-title" style={{ fontWeight: "400", letterSpacing: "-.035em", lineHeight: "1.06", margin: "0", textWrap: "pretty", color: "#e8ecf8" }}>
                {"no-limit hold'em that settles in a block."}
              </h1>
              {"\r\n            "}
              <p className="su-hero-sub" style={{ fontWeight: "300", lineHeight: "1.5", color: "#94a3c4", maxWidth: "600px", margin: "0", textWrap: "pretty" }}>
                {"six seats, real chips, provable shuffles."}
              </p>
              {"\r\n\r\n            "}
              <div style={{ display: "flex", flexDirection: "column", gap: "clamp(7px,13px,16px)" }}>
                {"\r\n              "}
                <div style={{ display: "flex", alignItems: "baseline", gap: "18px" }}>
                  <span style={{ width: "16px", height: "1px", background: "#8b5cf6", flex: "none", position: "relative", top: "-6px" }} />
                  <span className="su-hero-bullet" style={{ fontWeight: "300", color: "#e8ecf8" }}>
                    {"every shuffle committed before the deal, revealed after the hand"}
                  </span>
                </div>
                {"\r\n              "}
                <div style={{ display: "flex", alignItems: "baseline", gap: "18px" }}>
                  <span style={{ width: "16px", height: "1px", background: "#8b5cf6", flex: "none", position: "relative", top: "-6px" }} />
                  <span className="su-hero-bullet" style={{ fontWeight: "300", color: "#e8ecf8" }}>
                    {"chips are yours between hands — never a house account"}
                  </span>
                </div>
                {"\r\n              "}
                <div style={{ display: "flex", alignItems: "baseline", gap: "18px" }}>
                  <span style={{ width: "16px", height: "1px", background: "#8b5cf6", flex: "none", position: "relative", top: "-6px" }} />
                  <span className="su-hero-bullet" style={{ fontWeight: "300", color: "#e8ecf8" }}>
                    {"5% rake, capped at 5bb — no flop, no drop"}
                  </span>
                </div>
                {"\r\n            "}
              </div>
              {"\r\n\r\n            "}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "clamp(16px,36px,32px)", marginTop: "clamp(0px,7px,10px)" }}>
                {"\r\n              "}
                <button className="pill scp3 scp4" ref={v.ctaRef} onClick={v.goLobby} style={{ display: "inline-flex", alignItems: "center", background: "linear-gradient(180deg,#8b5cf6,#6d3fd4)", color: "#f6f3ff", fontSize: "clamp(14px,19px,19px)", fontWeight: "500", letterSpacing: "-.01em", padding: "clamp(11px,16px,17px) clamp(22px,36px,32px)", borderRadius: "5px", border: "1px solid rgba(255,255,255,0.165)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.285),0 0 34px -10px rgba(232,236,248,0.102),0 3px 6px rgba(0,0,0,0.375)" }}>
                  {"play now"}
                </button>
                {"\r\n              "}
                {/*
                   Both this and the address under the cards appear only once
                   `TOKEN_CA` in engine/token.js is set. Until then there is
                   nothing to buy and no address to show, and a button that
                   leads nowhere is worse than no button.
                */}
                {"\r\n              "}
                {v.caOn ? (
                  <>
                    {"\r\n                "}
                    <a className="pill scp5 scp6" href={v.caBuyHref} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "10px", color: "#e8ecf8", fontSize: "clamp(14px,19px,19px)", fontWeight: "500", letterSpacing: "-.01em", padding: "clamp(11px,16px,17px) clamp(22px,36px,32px)", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.041)", background: "linear-gradient(180deg,rgba(148,163,196,0.05),rgba(0,0,0,0.125))", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)", textDecoration: "none" }}>
                      {"buy on fomo"}
                    </a>
                    {"\r\n              "}
                  </>
                ) : null}
                {"\r\n            "}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n\r\n          "}
            {/*
               The stage is a query container, so every measurement inside is a
               share of its width and the whole arrangement scales as one piece.
               The design is drawn at 520px, so 1px there is 0.1923cqw here.
               Sized by height now, because height is the scarce axis.
            */}
            {"\r\n          "}
            <div className="su-art" style={{ flex: "0 1 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(10px,15px,28px)" }}>
              {"\r\n            "}
              <div style={{ position: "relative", containerType: "inline-size", height: "clamp(132px,38vh,392px)", maxWidth: "min(520px,86vw)", aspectRatio: "520/392" }}>
                {"\r\n\r\n              "}
                <div style={{ position: "absolute", left: "3.46cqw", top: "6.54cqw", width: "43.08cqw", height: "60.38cqw", borderRadius: "2.12cqw", background: "#0d1220", transform: "rotate(-6deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {"\r\n                "}
                  <div style={{ position: "absolute", inset: "2.12cqw", borderRadius: "1.35cqw", border: "1px solid rgba(232,236,248,0.22)" }} />
                  {"\r\n                "}
                  <svg width="8.08cqw" height="11.15cqw" viewBox="0 0 72 100" style={{ display: "block" }}>
                    <polygon points="36,0 72,50 36,100 0,50" style={{ fill: "#dfe6f8" }} />
                  </svg>
                  {"\r\n                "}
                  <div style={{ position: "absolute", left: "0", right: "0", bottom: "5cqw", textAlign: "center", fontSize: "2.12cqw", letterSpacing: ".06em", color: "rgba(232,236,248,0.5)" }}>
                    {interp(v.commitBack)}
                  </div>
                  {"\r\n              "}
                </div>
                {"\r\n\r\n              "}
                <div style={{ position: "absolute", right: "2.69cqw", top: "12.69cqw", width: "43.08cqw", height: "60.38cqw", perspective: "288.46cqw", transform: "rotate(4deg)" }}>
                  {"\r\n                "}
                  <div ref={v.cardRef} style={{ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d", willChange: "transform" }}>
                    {"\r\n\r\n                  "}
                    <div style={{ position: "absolute", inset: "0", borderRadius: "2.12cqw", background: "#0d1220", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", boxShadow: "0 3.46cqw 8.46cqw rgba(232,236,248,0.176)" }}>
                      {"\r\n                    "}
                      <div style={{ position: "absolute", inset: "2.12cqw", borderRadius: "1.35cqw", border: "1px solid rgba(232,236,248,0.2)" }} />
                      {"\r\n                    "}
                      <div style={{ position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {"\r\n                      "}
                        <svg width="8.08cqw" height="11.15cqw" viewBox="0 0 72 100" style={{ display: "block" }}>
                          <polygon points="36,0 72,50 36,100 0,50" style={{ fill: "#dfe6f8" }} />
                        </svg>
                        {"\r\n                    "}
                      </div>
                      {"\r\n                    "}
                      <div style={{ position: "absolute", left: "0", right: "0", bottom: "5cqw", textAlign: "center", fontSize: "2.12cqw", letterSpacing: ".06em", color: "rgba(232,236,248,0.5)" }}>
                        {interp(v.commitFront)}
                      </div>
                      {"\r\n                  "}
                    </div>
                    {"\r\n\r\n                  "}
                    <div style={{ position: "absolute", inset: "0", borderRadius: "2.12cqw", background: "#f2f5ff", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", boxShadow: "0 3.46cqw 8.46cqw rgba(0,0,0,0.375)" }}>
                      {"\r\n                    "}
                      <div style={{ position: "absolute", left: "3.85cqw", top: "3.46cqw", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.35cqw" }}>
                        {"\r\n                      "}
                        <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "7.3cqw", lineHeight: ".72", color: "#101828" }}>
                          {"A"}
                        </span>
                        {"\r\n                      "}
                        <svg width="2.69cqw" height="3.65cqw" viewBox="0 0 72 100" style={{ display: "block" }}>
                          <path d="M36,0 Q22,29 0,50 Q22,71 36,100 Z" style={{ fill: "#101828" }} />
                          <path d="M36,0 Q50,29 72,50 Q50,71 36,100 Z" style={{ fill: "#8b5cf6" }} />
                        </svg>
                        {"\r\n                    "}
                      </div>
                      {"\r\n                    "}
                      <div style={{ position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {"\r\n                      "}
                        <svg width="15.77cqw" height="21.92cqw" viewBox="0 0 72 100" style={{ display: "block" }}>
                          <path d="M36,0 Q22,29 0,50 Q22,71 36,100 Z" style={{ fill: "#101828" }} />
                          <path d="M36,0 Q50,29 72,50 Q50,71 36,100 Z" style={{ fill: "#8b5cf6" }} />
                        </svg>
                        {"\r\n                    "}
                      </div>
                      {"\r\n                    "}
                      <div style={{ position: "absolute", right: "3.85cqw", bottom: "3.46cqw", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.35cqw", transform: "rotate(180deg)" }}>
                        {"\r\n                      "}
                        <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "7.3cqw", lineHeight: ".72", color: "#101828" }}>
                          {"A"}
                        </span>
                        {"\r\n                      "}
                        <svg width="2.69cqw" height="3.65cqw" viewBox="0 0 72 100" style={{ display: "block" }}>
                          <path d="M36,0 Q22,29 0,50 Q22,71 36,100 Z" style={{ fill: "#101828" }} />
                          <path d="M36,0 Q50,29 72,50 Q50,71 36,100 Z" style={{ fill: "#8b5cf6" }} />
                        </svg>
                        {"\r\n                    "}
                      </div>
                      {"\r\n                  "}
                    </div>
                    {"\r\n\r\n                "}
                  </div>
                  {"\r\n              "}
                </div>
                {"\r\n\r\n            "}
              </div>
              {"\r\n            "}
              {/*
                 The strip lines up on its text baseline, not on box centres. The
                 rule and the tick sit .3115em above it — where Inter Tight
                 centres its own dashes and middle dot — so they are level with
                 the "·" in the commitment and the "-" in "on-chain". Centred on
                 the line box they landed one to two device pixels high.
              */}
              {"\r\n            "}
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "baseline", gap: "clamp(10px,21px,18px)", padding: "clamp(6px,8px,10px) 22px", fontSize: "clamp(11px,13px,13px)", color: "#94a3c4" }}>
                {"\r\n              "}
                <span>
                  {interp(v.commitStrip)}
                </span>
                {"\r\n              "}
                {/*
                   The rule is an underline under two em spaces (.su-rule),
                   clipped to 22px, so the text painter draws it from the same
                   baseline as the glyphs beside it. A box is placed from the
                   layout baseline, which can sit a device pixel off the painted
                   one. The offset is that .3115em, plus half the 1px line to
                   centre it, plus an eighth of a pixel so an engine that floors
                   the position (WebKit) lands on the same row as one that
                   rounds it (Blink).
                */}
                {"\r\n              "}
                <span className="su-rule" style={{ width: "22px", overflow: "clip", whiteSpace: "pre", textDecorationLine: "underline", textDecorationThickness: "1px", textDecorationColor: "rgba(148,163,196,0.5)", textUnderlineOffset: "calc(-.3115em - .625px)" }} />
                {"\r\n              "}
                {/*
                   "sealed" stays in flow, so this box is one line of the strip's
                   type and carries its baseline. "verified" lies over it for
                   the cross-fade.
                */}
                {"\r\n              "}
                <span style={{ position: "relative", display: "block", width: "186px" }}>
                  {"\r\n                "}
                  <span ref={v.sealedRef} style={{ display: "block", whiteSpace: "nowrap" }}>{"sealed · not yet dealt"}</span>
                  {"\r\n                "}
                  {/*
                     The tick is sized in em so it scales with the type, and drawn
                     so its ink is centred .3115em above its bottom edge, which
                     sits on the baseline. The point runs just past the box.
                  */}
                  {"\r\n                "}
                  <span ref={v.verifiedRef} style={{ position: "absolute", left: "0", top: "0", bottom: "0", display: "flex", alignItems: "baseline", gap: "8px", whiteSpace: "nowrap", color: "#a78bfa", opacity: "0" }}>
                    {"\r\n                  "}
                    <svg width="12" height="10" viewBox="0 0 14 11" style={{ display: "block", flex: "none", width: ".923em", height: ".769em", overflow: "visible" }}>
                      <polyline points="1,6.255 5,10.255 13,2.255" style={{ fill: "none", stroke: "#a78bfa", strokeWidth: "2" }} />
                    </svg>
                    {"verified on-chain\r\n                "}
                  </span>
                  {"\r\n              "}
                </span>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              {v.caOn ? (
                <>
                  {"\r\n            "}
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "10px", padding: "clamp(6px,8px,10px) 22px" }}>
                    {"\r\n              "}
                    <span className="su-copytext" style={{ fontSize: "clamp(12px,14px,14px)", color: "#e8ecf8", letterSpacing: ".02em", wordBreak: "break-all" }}>
                      {interp(v.ca)}
                    </span>
                    {"\r\n              "}
                    <button className="pill scp7 scp8" type="button" data-copy-line data-label="copy" style={{ flex: "none", background: "linear-gradient(180deg,rgba(139,92,246,0.07),rgba(0,0,0,0.075))", color: "#a78bfa", fontSize: "clamp(11px,13px,13px)", fontWeight: "500", padding: "6px 14px", minWidth: "92px", boxSizing: "border-box", textAlign: "center", borderRadius: "5px", border: "1px solid rgba(139,92,246,0.5)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)", cursor: "pointer" }}>
                      {"copy"}
                    </button>
                    {"\r\n            "}
                  </div>
                  {"\r\n            "}
                </>
              ) : null}
              {"\r\n          "}
            </div>
            {"\r\n\r\n        "}
          </div>
          {"\r\n\r\n        "}
          {/*
             The wash fades in above the rule so the field trails off rather
             than stopping at a line. Small type over moving ASCII is the one
             place the background stops being texture.
          */}
          {"\r\n        "}
          <div className="su-hero-stats" style={{ flex: "none", position: "relative" }}>
            {"\r\n        "}
            {/*
               the ledger. three columns, never wrapped, so the rules always read
               as rules; the type carries the narrowing instead.
            */}
            {"\r\n        "}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", borderTop: "1px solid rgba(232,236,248,0.2)" }}>
              {"\r\n          "}
              <div className="su-hero-statcol" style={{ display: "flex", flexDirection: "column", gap: "clamp(5px,9px,14px)" }}>
                {"\r\n            "}
                <div className="su-hero-label" style={{ color: "#a78bfa" }}>{"hands dealt"}</div>
                {"\r\n            "}
                <div className="su-hero-stat" style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", lineHeight: "1", color: "#e8ecf8" }}>
                  {interp(v.statHands)}
                </div>
                {"\r\n            "}
                <div className="su-hero-statsub" style={{ fontWeight: "300", color: "#94a3c4" }}>
                  {interp(v.statHandsSub)}
                </div>
                {"\r\n          "}
              </div>
              {"\r\n          "}
              <div className="su-hero-statcol su-hero-statcol--div" style={{ display: "flex", flexDirection: "column", gap: "clamp(5px,9px,14px)", borderLeft: "1px solid rgba(232,236,248,0.14)" }}>
                {"\r\n            "}
                <div className="su-hero-label" style={{ color: "#a78bfa" }}>{"usdg in play"}</div>
                {"\r\n            "}
                <div className="su-hero-stat" style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", lineHeight: "1", color: "#e8ecf8" }}>
                  {interp(v.statInPlay)}
                </div>
                {"\r\n            "}
                <div className="su-hero-statsub" style={{ fontWeight: "300", color: "#94a3c4" }}>
                  {interp(v.statTablesSub)}
                </div>
                {"\r\n          "}
              </div>
              {"\r\n          "}
              <div className="su-hero-statcol su-hero-statcol--last" style={{ display: "flex", flexDirection: "column", gap: "clamp(5px,9px,14px)", borderLeft: "1px solid rgba(232,236,248,0.14)" }}>
                {"\r\n            "}
                <div className="su-hero-label" style={{ color: "#a78bfa" }}>{"jackpot"}</div>
                {"\r\n            "}
                <div className="su-hero-stat" style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", lineHeight: "1", color: "#e8ecf8" }}>
                  {interp(v.statJackpot)}
                </div>
                {"\r\n            "}
                <div className="su-hero-statsub" style={{ fontWeight: "300", color: "#94a3c4" }}>
                  {interp(v.statJackpotSub)}
                </div>
                {"\r\n          "}
              </div>
              {"\r\n        "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n      "}
        </div>
        {"\r\n    "}
      </div>
      {"\r\n  "}
    </>
  );
}
