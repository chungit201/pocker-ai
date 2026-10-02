/* The turn prompt screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { interp, css } from '../dc-runtime';

export default function TurnPrompt({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      <div style={{ position: "fixed", left: "0", right: "0", bottom: "22px", zIndex: "70", display: "flex", justifyContent: "center", padding: "0 16px", pointerEvents: "none" }}>
        {"\r\n      "}
        <button className="pill-flat" onClick={v.goTable} style={css(v.turnPromptBtn)}>
          {"\r\n        "}
          <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {"\r\n          "}
            <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: "#222c47", animation: "seatPulse 1.1s ease-in-out infinite" }} />
            {"\r\n          "}
            <span style={{ fontFamily: "'Inter Tight',system-ui,sans-serif", fontWeight: "600", letterSpacing: "-.03em", fontSize: "17px" }}>
              {"Your turn"}
            </span>
            {"\r\n        "}
          </span>
          {"\r\n        "}
          <span style={{ width: "1px", height: "24px", background: "rgba(232,236,248,0.042)" }} />
          {"\r\n        "}
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1px" }}>
            {"\r\n          "}
            <span style={{ fontSize: "12px", fontWeight: "500" }}>
              {interp(v.turnPromptSub)}
            </span>
            {"\r\n          "}
            <span style={{ fontSize: "10px", opacity: ".75" }}>
              {"Back to "}
              {interp(v.tableName)}
              {" >"}
            </span>
            {"\r\n        "}
          </span>
          {"\r\n        "}
          <span style={css(v.turnPromptTrack)}>
            <span style={css(v.turnPromptFill)} />
          </span>
          {"\r\n      "}
        </button>
        {"\r\n    "}
      </div>
      {"\r\n  "}
    </>
  );
}
