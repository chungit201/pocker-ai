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
      <div style={{ position: "relative", flex: "1", minHeight: "0", display: "flex", background: "#1a2238" }}>
        {"\r\n      "}
        <nav ref={v.docsNavRef} style={{ flex: "none", width: "264px", overflowY: "auto", padding: "12px 10px 48px", borderRight: "1px solid rgba(232,236,248,0.132)" }} />
        {"\r\n      "}
        <div ref={v.docsScrollRef} style={{ flex: "1", minHeight: "0", overflowY: "auto" }}>
          {"\r\n        "}
          <div ref={v.docsBodyRef} style={{ maxWidth: "70ch", margin: "0 auto", padding: "36px 40px 140px" }} />
          {"\r\n      "}
        </div>
        {"\r\n    "}
      </div>
      {"\r\n  "}
    </>
  );
}
