/* The staking screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */


export default function Staking({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      <div className="su-stage" style={{ flex: "1", minHeight: "0", overflowY: "auto" }}>
        {"\r\n      "}
        <div ref={v.stakingRef} style={{ minHeight: "100%" }} />
        {"\r\n    "}
      </div>
      {"\r\n  "}
    </>
  );
}
