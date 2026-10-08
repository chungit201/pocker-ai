/* The docs screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */


export default function Docs({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      {/*
         `su-stage` is the whole of the alignment fix, and its absence was the
         whole of the bug. Everything off the felt is laid out on a fixed
         1512x850 canvas and fitted to the window by `--su-scale`, applied as
         `zoom` through this class — and this screen was the only one that did
         not wear it. On a 2000px window that put the header at zoom 1.201 and
         the docs at 1.0: two different drawings side by side, where nothing on
         one could line up with anything on the other however the insides were
         tuned.

         The padding is the header's own, written the same way (.su-nav in
         Chrome.tsx), so the contents rail starts on the same vertical as the
         wordmark. It was flush to the window edge before — 44px left of where
         the header begins — which is the part that reads as "lệch".
      */}
      {"\r\n    "}
      <div className="su-stage su-docs" style={{ position: "relative", flex: "1", minHeight: "0", display: "flex", boxSizing: "border-box", padding: "0 clamp(16px,51px,44px)", background: "#1a2238" }}>
        {"\r\n      "}
        {/* Below 940px the rail becomes a drawer and this is what opens it.
            Hidden above that breakpoint, where the rail is simply always
            there — so the button never appears beside the thing it toggles. */}
        {"\r\n      "}
        <button className="su-docs-toggle" onClick={v.docsNavToggle} aria-expanded={v.docsNavExpanded}>
          <span className="su-docs-toggle-mark" aria-hidden="true" />
          {v.docsNavLabel}
        </button>
        {"\r\n      "}
        <nav ref={v.docsNavRef} className={v.docsNavClass} style={{ flex: "none", width: "248px", overflowY: "auto", padding: "12px 20px 48px 0", borderRight: "1px solid rgba(232,236,248,0.132)" }} />
        {"\r\n      "}
        <div ref={v.docsScrollRef} className="su-docs-main" style={{ flex: "1", minHeight: "0", overflowY: "auto" }}>
          {"\r\n        "}
          {/* A wide column, centred in what is left after the rail.
         *
              A `ch` measure was the original mistake: 70–78ch of this body size
              is only 550–660px, so on anything wider than a laptop the prose
              became a ribbon with half the window empty beside it. Centring
              THAT was the second mistake — a narrow column centred in a wide
              space just moves the emptiness into the middle of the page, and
              opened a moat between the contents and the first word as wide as
              the rail itself.
         *
              Width first, then centring. At 860px against a 248px rail the
              margins either side come out even and modest instead of being
              the loudest thing on the screen. */}
          {"\r\n        "}
          <div ref={v.docsBodyRef} className="su-docs-body" style={{ maxWidth: "860px", margin: "0 auto", padding: "36px 44px 140px" }} />
          {"\r\n      "}
        </div>
        {"\r\n    "}
      </div>
      {"\r\n  "}
    </>
  );
}
