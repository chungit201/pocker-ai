/* The seat screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { interp, css } from '../dc-runtime';

export default function Seat({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      <div style={{ flex: "1", display: "flex", justifyContent: "center", padding: "clamp(36px,7vw,82px) clamp(18px,3.4vw,44px) 60px" }}>
        {"\r\n      "}
        <div style={{ width: "100%", maxWidth: "620px", display: "flex", flexDirection: "column", gap: "clamp(24px,3vw,34px)", animation: "riseIn .4s cubic-bezier(.2,.9,.24,1) both" }}>
          {"\r\n\r\n        "}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "32px", paddingBottom: "22px", borderBottom: "1px solid rgba(232,236,248,0.16)" }}>
            {"\r\n          "}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "0" }}>
              {"\r\n            "}
              <div style={{ fontSize: "clamp(30px,4.4vw,42px)", fontWeight: "400", letterSpacing: "-.035em", lineHeight: "1", color: "#e8ecf8" }}>
                {"Take a seat"}
              </div>
              {"\r\n            "}
              <div style={{ fontSize: "13px", letterSpacing: ".02em", color: "#94a3c4" }}>
                {interp(v.buyTableLabel)}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n          "}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flex: "none" }}>
              {"\r\n            "}
              <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"Bankroll"}</span>
              {"\r\n            "}
              <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "30px", fontVariantNumeric: "tabular-nums", lineHeight: "1", color: "#e8ecf8" }}>
                {interp(v.bankrollLabel)}
              </span>
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n\r\n        "}
          <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
            {"\r\n          "}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px" }}>
              {"\r\n            "}
              <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                {"\r\n              "}
                <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"You bring"}</span>
                {"\r\n              "}
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                  {"\r\n                "}
                  <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(34px,5vw,44px)", fontVariantNumeric: "tabular-nums", lineHeight: "1", color: "#e8ecf8" }}>
                    {interp(v.sitAmountLabel)}
                  </span>
                  {"\r\n                "}
                  <span style={{ fontSize: "12px", letterSpacing: ".14em", color: "#94a3c4" }}>{"USDC"}</span>
                  {"\r\n              "}
                </div>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              {/*
                 Big blinds, because a stack only means something against them.
                 Stated once, beside the figure, never repeated below.
              */}
              {"\r\n            "}
              <span style={{ fontSize: "13px", fontVariantNumeric: "tabular-nums", color: "#94a3c4" }}>
                {interp(v.sitBbLabel)}
              </span>
              {"\r\n          "}
            </div>
            {"\r\n\r\n          "}
            <div className="fader" draggable="false" onPointerDown={v.buyDown} onPointerMove={v.buyMove} onPointerUp={v.buyUp} onPointerCancel={v.buyUp} style={css(v.buyTrackStyle)}>
              {"\r\n            "}
              <div style={{ position: "absolute", left: "0", right: "0", height: "2px", background: "rgba(232,236,248,0.16)" }} />
              {"\r\n            "}
              <div style={css(v.buyFillStyle)} />
              {"\r\n            "}
              <div style={css(v.buyThumbStyle)} />
              {"\r\n          "}
            </div>
            {"\r\n\r\n          "}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", letterSpacing: ".02em", color: "#94a3c4", fontVariantNumeric: "tabular-nums", marginTop: "-14px" }}>
              {"\r\n            "}
              <span>
                {interp(v.sitMinLabel)}
                {" minimum"}
              </span>
              <span>
                {interp(v.sitMaxLabel)}
                {" maximum"}
              </span>
              {"\r\n          "}
            </div>
            {"\r\n\r\n          "}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {"\r\n            "}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "17px 0", borderBottom: "1px solid rgba(232,236,248,0.1)" }}>
                {"\r\n              "}
                <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"Table allows"}</span>
                {"\r\n              "}
                <span style={{ fontSize: "16px", fontVariantNumeric: "tabular-nums", color: "#94a3c4" }}>
                  {interp(v.tableRangeLabel)}
                </span>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "17px 0", borderBottom: "1px solid rgba(232,236,248,0.1)" }}>
                {"\r\n              "}
                <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"Left in bankroll"}</span>
                {"\r\n              "}
                <span style={{ fontSize: "16px", fontVariantNumeric: "tabular-nums", color: "#94a3c4" }}>
                  {interp(v.sitLeftLabel)}
                </span>
                {"\r\n            "}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n\r\n        "}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center", marginTop: "6px" }}>
            {"\r\n          "}
            <button className="pill-flat" onClick={v.takeSeat} style={css(v.sitBtnStyle)}>
              {interp(v.sitBtnLabel)}
              {"\r\n            "}
              <svg width="11" height="15" viewBox="0 0 72 100" style={css(v.sitBtnPipStyle)}>
                {/* currentColor, so the pip follows the button's label instead
                    of being pinned to a surface colour. It was #131a2f — the
                    felt — which read as a hole once the button became violet. */}
                <path d="M36,0 Q22,29 0,50 Q22,71 36,100 Z" style={{ fill: "currentColor" }} />
                <path d="M36,0 Q50,29 72,50 Q50,71 36,100 Z" style={{ fill: "#8b5cf6" }} />
              </svg>
              {"\r\n          "}
            </button>
            {"\r\n          "}
            <button onClick={v.goLobby} style={{ fontSize: "12px", letterSpacing: ".06em", color: "#94a3c4" }}>
              {"Back to lobby"}
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
