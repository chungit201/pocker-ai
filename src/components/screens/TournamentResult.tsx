/* The tournament result screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { interp, css } from '../dc-runtime';

export default function TournamentResult({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      <div style={{ flex: "1", maxWidth: "520px", width: "100%", margin: "0 auto", padding: "64px 20px 60px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {"\r\n      "}
        <div style={{ fontSize: "10px", letterSpacing: ".24em", color: "#a78bfa", marginBottom: "14px" }}>
          {interp(v.trEyebrow)}
        </div>
        {"\r\n      "}
        <h1 style={{ fontWeight: "500", letterSpacing: "-.03em", fontSize: "34px", margin: "0 0 12px", color: "#e8ecf8" }}>
          {interp(v.trName)}
        </h1>
        {"\r\n      "}
        {/*
           A distinct headline for 1st — everyone else just reads their finish
           in the sentence below.
        */}
        {"\r\n      "}
        {v.trIsWinner ? (
          <>
            {"\r\n        "}
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "28px", color: "#a78bfa", marginBottom: "2px" }}>
              {"You won"}
            </div>
            {"\r\n      "}
          </>
        ) : null}
        {"\r\n      "}
        <div style={{ fontSize: "16px", color: "#e8ecf8", marginBottom: "6px" }}>
          {interp(v.trFinishLabel)}
        </div>
        {"\r\n      "}
        <div style={css(v.trPayoutStyle)}>
          {interp(v.trPayoutLabel)}
        </div>
        {"\r\n\r\n      "}
        {/*
           Withdraw, only in the money. Same amount field + action as the
           profile funding card — `fundDraft`/`fundInput`/`fundNote`, driven
           through the one existing `fundMove('withdraw')` → wallet.withdraw
           pipeline. Pre-filled with the payout on arrival; editable like any
           other withdrawal.
        */}
        {"\r\n      "}
        {v.trShowWithdraw ? (
          <>
            {"\r\n        "}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "12px", margin: "10px 0 2px", width: "100%" }}>
              {"\r\n          "}
              <div className="field-felt" style={{ flex: "1 1 150px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", border: "1px solid rgba(232,236,248,0.24)", borderRadius: "5px", background: "rgba(0,0,0,0.15)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.325)", padding: "10px 16px" }}>
                {"\r\n            "}
                <input value={v.fundDraft ?? ''} onInput={v.fundInput} placeholder="25.00" inputMode="decimal" style={{ flex: "1", minWidth: "0", border: "0", background: "transparent", fontSize: "15px", fontVariantNumeric: "tabular-nums", color: "#e8ecf8", caretColor: "#a78bfa" }} />
                {"\r\n            "}
                <span style={{ fontSize: "10px", letterSpacing: ".2em", color: "#94a3c4", flex: "none" }}>{"USDG"}</span>
                {"\r\n          "}
              </div>
              {"\r\n          "}
              <button className="pill-flat" onClick={v.trWithdrawAction} style={css(v.fundWithdrawStyle)}>{"Withdraw"}</button>
              {"\r\n        "}
            </div>
            {"\r\n        "}
            <div style={css(v.fundNoteStyle)}>
              {interp(v.fundNote)}
              <a href={v.fundTxUrl} target="_blank" rel="noopener noreferrer" style={css(v.fundTxStyle)}>{"Receipt ↗"}</a>
            </div>
            {"\r\n      "}
          </>
        ) : null}
        {"\r\n\r\n      "}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "22px", marginTop: "32px" }}>
          {"\r\n        "}
          <button className="pill-flat" onClick={v.goTournaments} style={{ padding: "12px 26px", borderRadius: "5px", border: "1px solid rgba(255,255,255,0.165)", background: "linear-gradient(180deg,#8b5cf6,#6d3fd4)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.27),0 1px 3px rgba(0,0,0,0.35)", color: "#f6f3ff", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}>
            {"Back to tournaments"}
          </button>
          {"\r\n        "}
          {v.trHasDetail ? (
            <>
              {"\r\n          "}
              <button onClick={v.trViewDetail} style={{ border: "0", background: "none", padding: "0", fontSize: "12px", letterSpacing: ".08em", color: "#94a3c4", cursor: "pointer", textDecoration: "underline" }}>
                {"View tournament"}
              </button>
              {"\r\n        "}
            </>
          ) : null}
          {"\r\n      "}
        </div>
        {"\r\n    "}
      </div>
      {"\r\n  "}
    </>
  );
}
