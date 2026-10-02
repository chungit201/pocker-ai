/* The tournament move overlay screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { interp, css } from '../dc-runtime';

export default function TournamentMoveOverlay({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      <div style={css(v.tMoveBackdrop)}>
        {"\r\n      "}
        <div style={{ width: "100%", maxWidth: "400px", padding: "34px 30px", borderRadius: "12px", background: "#1a2238", color: "#e8ecf8", border: "1px solid rgba(232,236,248,0.154)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.21),0 24px 60px -20px rgba(0,0,0,0.72)", animation: "riseIn .32s cubic-bezier(.2,.9,.24,1) both", textAlign: "center" }}>
          {"\r\n        "}
          <div style={{ fontSize: "10px", letterSpacing: ".24em", color: "#94a3c4", marginBottom: "12px" }}>
            {"TOURNAMENT"}
          </div>
          {"\r\n        "}
          <h2 style={{ fontFamily: "'Inter Tight',system-ui,sans-serif", fontWeight: "600", letterSpacing: "-.03em", fontSize: "25px", margin: "0 0 8px" }}>
            {interp(v.tMoveOverlayTitle)}
          </h2>
          {"\r\n        "}
          <div style={{ fontSize: "13px", color: "#94a3c4", marginBottom: "24px" }}>
            {interp(v.tMoveOverlaySub)}
          </div>
          {"\r\n        "}
          <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "32px", lineHeight: "1", color: "#e8ecf8", fontVariantNumeric: "tabular-nums", marginBottom: "24px" }}>
            {interp(v.tMoveOverlayCountdown)}
          </div>
          {"\r\n        "}
          <button className="pill-flat" onClick={v.tMoveOverlayGo} style={{ width: "100%", padding: "13px", borderRadius: "5px", border: "none", background: "linear-gradient(180deg,#222c47,#0d1220)", color: "#e8ecf8", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12),0 2px 4px rgba(0,0,0,0.35)", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
            {"Go now"}
          </button>
          {"\r\n      "}
        </div>
        {"\r\n    "}
      </div>
      {"\r\n  "}
    </>
  );
}
