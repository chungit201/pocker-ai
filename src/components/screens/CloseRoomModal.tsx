/* The close room modal screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { interp, css } from '../dc-runtime';

export default function CloseRoomModal({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      <div onClick={v.dismissCloseRoom} style={{ position: "absolute", inset: "0", zIndex: "90", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "rgba(0,0,0,0.72)" }}>
        {"\r\n      "}
        <div onClick={v.crStop} style={{ width: "100%", maxWidth: "420px", padding: "30px", borderRadius: "12px", background: "#1a2238", color: "#e8ecf8", border: "1px solid rgba(232,236,248,0.154)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.21),0 24px 60px -20px rgba(0,0,0,0.72)", animation: "riseIn .32s cubic-bezier(.2,.9,.24,1) both" }}>
          {"\r\n        "}
          <h2 style={{ fontFamily: "'Inter Tight',system-ui,sans-serif", fontWeight: "600", letterSpacing: "-.03em", fontSize: "24px", margin: "0 0 8px" }}>
            {"End the session?"}
          </h2>
          {"\r\n        "}
          <div style={{ fontSize: "13px", lineHeight: "1.6", color: "#94a3c4", marginBottom: "22px" }}>
            {"Every player is stood up and their chips return to their bankroll, and the room link stops working. This can't be undone."}
          </div>
          {"\r\n        "}
          <div style={css(v.closeRoomMsgStyle)}>
            {interp(v.closeRoomMsg)}
          </div>
          {"\r\n        "}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "6px" }}>
            {"\r\n          "}
            <button onClick={v.dismissCloseRoom} style={{ fontSize: "13px", color: "#94a3c4", background: "transparent", padding: "13px 8px" }}>
              {"Cancel"}
            </button>
            {"\r\n          "}
            <button className="pill-flat" onClick={v.closeRoom} style={{ flex: "1", padding: "14px", borderRadius: "5px", background: "#e5484d", color: "#e8ecf8", fontSize: "14px", fontWeight: "500" }}>
              {interp(v.closeRoomLabel)}
            </button>
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
