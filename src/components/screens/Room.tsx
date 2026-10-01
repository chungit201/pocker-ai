/* The room screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { interp, css } from '../dc-runtime';

export default function Room({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      <div style={{ flex: "1", display: "flex", justifyContent: "center", padding: "clamp(36px,7vw,82px) clamp(18px,3.4vw,44px) 60px" }}>
        {"\r\n      "}
        <div style={{ width: "100%", maxWidth: "430px", padding: "30px", borderRadius: "12px", background: "#1a2238", color: "#e8ecf8", border: "1px solid rgba(232,236,248,0.154)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.21),0 24px 60px -20px rgba(0,0,0,0.688)", animation: "riseIn .4s cubic-bezier(.2,.9,.24,1) both", alignSelf: "flex-start" }}>
          {"\r\n        "}
          <div style={{ fontSize: "11px", letterSpacing: ".16em", color: "#94a3c4", marginBottom: "10px" }}>
            {"PRIVATE ROOM"}
          </div>
          {"\r\n        "}
          <h2 style={{ fontFamily: "'Inter Tight',system-ui,sans-serif", fontWeight: "600", letterSpacing: "-.03em", fontSize: "28px", margin: "0 0 18px", wordBreak: "break-word" }}>
            {interp(v.roomName)}
          </h2>
          {"\r\n\r\n        "}
          {v.roomHasInfo ? (
            <>
              {"\r\n          "}
              <div style={{ padding: "16px", borderRadius: "8px", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(10,13,22,0.1)", marginBottom: "20px", fontSize: "13px", color: "#e8ecf8", lineHeight: "1.9" }}>
                {"\r\n            "}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3c4" }}>{"stakes"}</span>
                  <span>
                    {interp(v.roomStakesLabel)}
                  </span>
                </div>
                {"\r\n            "}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3c4" }}>{"buy-in"}</span>
                  <span>
                    {interp(v.roomBuyInLabel)}
                  </span>
                </div>
                {"\r\n            "}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3c4" }}>{"seats"}</span>
                  <span>
                    {interp(v.roomSeatedLabel)}
                  </span>
                </div>
                {"\r\n          "}
              </div>
              {"\r\n\r\n          "}
              <input value={v.roomPin ?? ''} onInput={v.roomPinInput} onKeyDown={v.roomPinKey} inputMode="numeric" maxLength={4} placeholder="4-digit pin" style={{ width: "100%", boxSizing: "border-box", padding: "12px 15px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.22)", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(232,236,248,0.176)", outline: "none", transition: "box-shadow .16s ease,border-color .16s ease", color: "#e8ecf8", font: "inherit", fontSize: "17px", letterSpacing: ".4em", textAlign: "center", caretColor: "#a78bfa" }} />
              {"\r\n          "}
              <button className="pill-flat" onClick={v.joinRoom} style={{ width: "100%", boxSizing: "border-box", marginTop: "12px", padding: "14px", borderRadius: "5px", background: "linear-gradient(180deg,#222c47,#0d1220)", color: "#e8ecf8", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12),0 2px 4px rgba(0,0,0,0.35)", fontSize: "14px", fontWeight: "500" }}>
                {interp(v.roomJoinLabel)}
              </button>
              {"\r\n        "}
            </>
          ) : null}
          {"\r\n\r\n        "}
          <div style={css(v.roomMsgStyle)}>
            {interp(v.roomMsg)}
          </div>
          {"\r\n        "}
          <button onClick={v.roomBackToLobby} style={{ marginTop: "14px", fontSize: "12px", color: "#94a3c4", background: "transparent" }}>
            {"back to the lobby"}
          </button>
          {"\r\n      "}
        </div>
        {"\r\n    "}
      </div>
      {"\r\n  "}
    </>
  );
}
