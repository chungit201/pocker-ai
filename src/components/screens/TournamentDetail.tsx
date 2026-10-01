/* The tournament detail screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { Fragment } from 'react';
import { interp, css, asArray } from '../dc-runtime';

export default function TournamentDetail({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      <div style={{ flex: "1", maxWidth: "760px", width: "100%", margin: "0 auto", padding: "32px 20px 60px" }}>
        {"\r\n      "}
        <button onClick={v.goTournaments} style={{ border: "0", background: "none", padding: "0", marginBottom: "18px", fontSize: "11px", letterSpacing: ".16em", color: "#94a3c4", cursor: "pointer" }}>
          {"‹ back to tournaments"}
        </button>
        {"\r\n      "}
        <div style={css(v.tournamentErrorStyle)}>
          {interp(v.tournamentError)}
        </div>
        {"\r\n      "}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "14px", marginBottom: "6px" }}>
          {"\r\n        "}
          <h1 style={{ fontWeight: "500", letterSpacing: "-.03em", fontSize: "32px", margin: "0", color: "#e8ecf8" }}>
            {interp(v.tdName)}
          </h1>
          {"\r\n        "}
          <span style={{ fontSize: "11px", letterSpacing: ".16em", color: "#a78bfa" }}>
            {interp(v.tdStateLabel)}
          </span>
          {"\r\n      "}
        </div>
        {"\r\n      "}
        <div style={{ marginBottom: "20px" }}>
          {"\r\n        "}
          <div style={{ display: "flex", alignItems: "baseline", gap: "11px", flexWrap: "wrap" }}>
            {"\r\n          "}
            <span style={{ fontFamily: "'Instrument Serif',Georgia,serif", fontSize: "40px", lineHeight: ".9", color: "#a78bfa", fontVariantNumeric: "tabular-nums" }}>
              {interp(v.tdPoolLabel)}
            </span>
            {"\r\n          "}
            <span style={{ fontSize: "11px", letterSpacing: ".14em", textTransform: "uppercase", color: "#94a3c4" }}>
              {"prize pool"}
            </span>
            {"\r\n        "}
          </div>
          {"\r\n        "}
          <div style={{ display: "flex", gap: "9px", marginTop: "10px", flexWrap: "wrap" }}>
            {"\r\n          "}
            <span style={css(v.tdGtdChipStyle)}>
              {interp(v.tdGtdLabel)}
            </span>
            {"\r\n          "}
            <span style={css(v.tdCeilChipStyle)}>
              {interp(v.tdMaxPoolLabel)}
            </span>
            {"\r\n        "}
          </div>
          {"\r\n        "}
          <div style={css(v.tdPoolBarStyle)}>
            <div style={css(v.tdPoolFillStyle)} />
          </div>
          {"\r\n      "}
        </div>
        {"\r\n      "}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "22px", fontSize: "12px", color: "#94a3c4", marginBottom: "26px" }}>
          {"\r\n        "}
          <span>
            {interp(v.tdEntrantsLabel)}
            {" entrants"}
          </span>
          {"\r\n        "}
          <span style={css(v.tdInvitesStyle)}>
            {interp(v.tdInvitesLabel)}
          </span>
          {"\r\n        "}
          <span style={css(v.tdCountdownStyle)}>
            {interp(v.tdCountdown)}
          </span>
          {"\r\n      "}
        </div>
        {"\r\n\r\n      "}
        <div style={{ borderRadius: "12px", background: "#1a2238", color: "#e8ecf8", border: "1px solid rgba(232,236,248,0.154)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.21),0 2px 6px rgba(0,0,0,0.375)", padding: "20px 22px", marginBottom: "20px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          {"\r\n        "}
          <div style={{ fontSize: "13px" }}>
            {interp(v.tdYouStatus)}
          </div>
          {"\r\n        "}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {"\r\n          "}
            <button className="pill-flat" onClick={v.tdSeatAction?.onClick} style={css(v.tdSeatAction?.style)}>
              {interp(v.tdSeatAction?.label)}
            </button>
            {"\r\n          "}
            <button className="pill-flat" onClick={v.tdRegisterAction?.onClick} style={css(v.tdRegisterAction?.style)}>
              {interp(v.tdRegisterAction?.label)}
            </button>
            {"\r\n        "}
          </div>
          {"\r\n      "}
        </div>
        {"\r\n\r\n      "}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {"\r\n        "}
          <div style={{ borderRadius: "12px", background: "#1a2238", color: "#e8ecf8", border: "1px solid rgba(232,236,248,0.154)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.21),0 2px 6px rgba(0,0,0,0.375)", overflow: "hidden" }}>
            {"\r\n          "}
            <div style={{ padding: "12px 18px", fontSize: "10px", letterSpacing: ".1em", color: "#94a3c4", borderBottom: "1px dashed rgba(232,236,248,0.198)" }}>
              {"payouts"}
            </div>
            {"\r\n          "}
            <div style={{ maxHeight: "280px", overflowY: "auto" }}>
              {"\r\n            "}
              {asArray(v.tdPayoutRows).map((pr: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "12px", padding: "9px 18px", fontSize: "12.5px", borderBottom: "1px dashed rgba(232,236,248,0.11)" }}>
                    {"\r\n                "}
                    <span>
                      {interp(pr?.place)}
                    </span>
                    <span style={{ color: "#94a3c4" }}>
                      {interp(pr?.pctLabel)}
                    </span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {interp(pr?.amountLabel)}
                    </span>
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </Fragment>
              ))}
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n        "}
          <div style={{ borderRadius: "12px", background: "#1a2238", color: "#e8ecf8", border: "1px solid rgba(232,236,248,0.154)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.21),0 2px 6px rgba(0,0,0,0.375)", overflow: "hidden" }}>
            {"\r\n          "}
            <div style={{ padding: "12px 18px", fontSize: "10px", letterSpacing: ".1em", color: "#94a3c4", borderBottom: "1px dashed rgba(232,236,248,0.198)" }}>
              {"blinds"}
            </div>
            {"\r\n          "}
            <div style={{ maxHeight: "280px", overflowY: "auto" }}>
              {"\r\n            "}
              {asArray(v.tdBlindRows).map((br: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <div style={css(br?.rowStyle)}>
                    {"\r\n                "}
                    <span>
                      {interp(br?.levelLabel)}
                    </span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {interp(br?.blindsLabel)}
                    </span>
                    <span style={{ fontVariantNumeric: "tabular-nums", color: "#94a3c4" }}>
                      {interp(br?.anteLabel)}
                    </span>
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </Fragment>
              ))}
              {"\r\n          "}
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
