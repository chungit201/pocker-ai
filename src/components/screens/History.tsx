/* The history screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { Fragment } from 'react';
import { interp, css, asArray } from '../dc-runtime';

export default function History({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      <div className="su-page su-stage" style={{ flex: "1", paddingBottom: "60px" }}>
        {"\r\n      "}
        {/*
           Your record, and the proof rail beside it. Both read what the
           gateway actually ships: /api/me for the figures (rates are null
           below the sample floor and render as an em dash, never a zero) and
           engine/verify.js for the checks — which are three, not four.
        */}
        {"\r\n      "}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(12px,21px,18px)", alignItems: "stretch", paddingBottom: "clamp(18px,33px,26px)" }}>
          {"\r\n        "}
          <div className="gm-panel" style={{ flex: "1 1 480px", minWidth: "0", position: "relative", borderRadius: "12px", overflow: "hidden", background: "#0a0d16", border: "1px solid rgba(232,236,248,0.08)", display: "flex", flexDirection: "column" }}>
            {"\r\n          "}
            {"\r\n          "}
            <div style={{ position: "relative", padding: "clamp(22px,42px,34px)", display: "flex", flexDirection: "column", gap: "14px", flex: "1" }}>
              {"\r\n            "}
              <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"YOUR RESULTS · ALL TIME"}</span>
              {"\r\n            "}
              <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
                {"\r\n              "}
                <span style={css(`font-family:'Instrument Serif',serif;font-variant-numeric:tabular-nums;font-size:clamp(40px,82px,64px);line-height:.88;color:${v.sessNetTone ?? ''}`)}>
                  {interp(v.sessNet)}
                </span>
                {"\r\n              "}
                <span style={{ fontSize: "13px", color: "#94a3c4" }}>
                  {interp(v.sessNetSub)}
                </span>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", paddingTop: "10px" }}>
                {"\r\n              "}
                {asArray(v.sessFacts).map((f: any, $index: number) => (
                  <Fragment key={$index}>
                    {"\r\n                "}
                    <span className="gm-stat" style={{ flex: "1 1 120px", minWidth: "0", display: "flex", flexDirection: "column", gap: "3px", padding: "11px 13px", border: "1px solid rgba(232,236,248,0.12)", borderRadius: "8px", background: "rgba(0,0,0,0.175)" }}>
                      {"\r\n                  "}
                      <span style={{ fontSize: "10px", letterSpacing: ".14em", color: "#94a3c4" }}>
                        {interp(f?.k)}
                      </span>
                      {"\r\n                  "}
                      <span style={css(`font-family:'Instrument Serif',serif;font-variant-numeric:tabular-nums;font-size:21px;line-height:1;color:${f?.tone ?? ''}`)}>
                        {interp(f?.v)}
                      </span>
                      {"\r\n                  "}
                      <span style={{ fontSize: "11.5px", color: "#94a3c4" }}>
                        {interp(f?.sub)}
                      </span>
                      {"\r\n                "}
                    </span>
                    {"\r\n              "}
                  </Fragment>
                ))}
                {"\r\n            "}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n        "}
          <div className="gm-side" style={{ flex: "1 1 260px", minWidth: "0", border: "1px solid rgba(232,236,248,0.12)", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {"\r\n          "}
            <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"PROVABLY FAIR"}</span>
            {"\r\n          "}
            <span style={{ fontSize: "13px", color: "#94a3c4", lineHeight: "1.6" }}>
              {"Every hand publishes a commitment before the deal and reveals its seed after. The re-shuffle runs in your browser, the deck is rebuilt here, not fetched."}
            </span>
            {"\r\n          "}
            <div style={{ flex: "1", display: "flex", flexDirection: "column", borderTop: "1px solid rgba(232,236,248,0.1)" }}>
              {"\r\n            "}
              {asArray(v.proofChecks).map((c: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <span style={{ flex: "1", display: "flex", alignItems: "center", gap: "9px", minHeight: "34px", borderBottom: "1px solid rgba(232,236,248,0.08)", fontSize: "12.5px", color: "#94a3c4" }}>
                    {"\r\n                "}
                    <span style={css(`color:${c?.tone ?? ''};flex:none`)}>
                      {interp(c?.mark)}
                    </span>
                    {interp(c?.label)}
                    {"\r\n              "}
                  </span>
                  {"\r\n            "}
                </Fragment>
              ))}
              {"\r\n          "}
            </div>
            {"\r\n          "}
            <button className="pill scpa scp6" onClick={v.verifyAll} style={css(v.verifyAllStyle)}>
              {interp(v.verifyAllLabel)}
            </button>
            {"\r\n        "}
          </div>
          {"\r\n      "}
        </div>
        {"\r\n\r\n      "}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", paddingBottom: "10px" }}>
          {"\r\n        "}
          <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"YOUR HANDS"}</span>
          {"\r\n        "}
          <span style={{ fontSize: "12.5px", color: "#94a3c4" }}>
            {interp(v.handsNote)}
          </span>
          {"\r\n      "}
        </div>
        {"\r\n      "}
        <div style={css(v.historyCardStyle)}>
          {"\r\n        "}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr auto auto", gap: "14px", padding: "12px 20px", fontSize: "10px", letterSpacing: ".1em", color: "#94a3c4", borderBottom: "1px dashed rgba(232,236,248,0.198)" }}>
            {"\r\n          "}
            <span>{"Hand"}</span>
            <span>{"You held"}</span>
            <span>{"Board"}</span>
            <span>{"Result"}</span>
            <span />
            {"\r\n        "}
          </div>
          {"\r\n        "}
          {asArray(v.handRows).map((h: any, $index: number) => (
            <Fragment key={$index}>
              {"\r\n          "}
              <div style={{ borderBottom: "1px dashed rgba(232,236,248,0.132)" }}>
                {"\r\n            "}
                <div onClick={h?.toggle} style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr auto auto", gap: "14px", alignItems: "center", padding: "13px 20px", fontSize: "13px", cursor: "pointer" }}>
                  {"\r\n              "}
                  <span style={{ color: "#94a3c4", fontSize: "12px" }}>
                    {interp(h?.id)}
                  </span>
                  {"\r\n              "}
                  <span style={css(h?.holeStyle)}>
                    {interp(h?.hole)}
                  </span>
                  {"\r\n              "}
                  <span style={css(h?.boardStyle)}>
                    {interp(h?.board)}
                  </span>
                  {"\r\n              "}
                  <span style={css(h?.netStyle)}>
                    {interp(h?.net)}
                  </span>
                  {"\r\n              "}
                  <span style={{ fontSize: "11px", color: "#94a3c4" }}>
                    {interp(h?.caret)}
                  </span>
                  {"\r\n            "}
                </div>
                {"\r\n            "}
                <div style={css(h?.detailStyle)}>
                  {"\r\n              "}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "16px", fontSize: "11px" }}>
                    {"\r\n                "}
                    <div>
                      {"\r\n                  "}
                      <div style={{ color: "#94a3c4", marginBottom: "4px" }}>{"Commitment"}</div>
                      {"\r\n                  "}
                      <div style={{ wordBreak: "break-all", lineHeight: "1.5" }}>
                        {interp(h?.commit)}
                      </div>
                      {"\r\n                "}
                    </div>
                    {"\r\n                "}
                    <div>
                      {"\r\n                  "}
                      <div style={{ color: "#94a3c4", marginBottom: "4px" }}>{"Revealed seed"}</div>
                      {"\r\n                  "}
                      <div style={{ wordBreak: "break-all", lineHeight: "1.5" }}>
                        {interp(h?.seed)}
                      </div>
                      {"\r\n                  "}
                      {/*
                         A "signature" line used to sit here. Nothing signs a
                         hand: the gateway's HandRecord has no such field, and the
                         offline adapter was filling it with `pseudoSig()` — a
                         base58-shaped hash of the commitment. It read as a
                         cryptographic guarantee and was decoration. What does
                         hold the deal honest is the commitment above and the
                         client seeds below, both of which the browser re-checks.
                      */}
                      {"\r\n                  "}
                      <div style={{ color: "#94a3c4", margin: "10px 0 4px" }}>{"Client seeds"}</div>
                      {"\r\n                  "}
                      <div style={{ wordBreak: "break-all", lineHeight: "1.5" }}>
                        {interp(h?.clientSeeds)}
                      </div>
                      {"\r\n                "}
                    </div>
                    {"\r\n                "}
                    <div>
                      {"\r\n                  "}
                      <div style={{ color: "#94a3c4", marginBottom: "4px" }}>{"Showdown"}</div>
                      {"\r\n                  "}
                      <div style={{ lineHeight: "1.7" }}>
                        {interp(h?.summary)}
                      </div>
                      {"\r\n                "}
                    </div>
                    {"\r\n              "}
                  </div>
                  {"\r\n              "}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
                    {"\r\n                "}
                    <button className="pill-flat" onClick={h?.verify} style={{ padding: "9px 18px", borderRadius: "5px", background: "linear-gradient(180deg,#222c47,#0d1220)", color: "#b497f7", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12),0 1px 2px rgba(0,0,0,0.35)", fontSize: "12px" }}>
                      {"Re-shuffle & verify"}
                    </button>
                    {"\r\n                "}
                    <span style={css(h?.verifyHintStyle)}>
                      {interp(h?.verifyHint)}
                    </span>
                    {"\r\n              "}
                  </div>
                  {"\r\n              "}
                  <div style={css(h?.verifyResultStyle)}>
                    {"\r\n                "}
                    <span style={css(h?.verdictStyle)}>
                      {interp(h?.verdictText)}
                    </span>
                    {"\r\n                "}
                    <p style={css(h?.verdictSubStyle)}>
                      {interp(h?.verdictSub)}
                    </p>
                    {"\r\n                "}
                    <div style={css(h?.checksStyle)}>
                      {"\r\n                  "}
                      <span style={css(h?.checkCommitStyle)}>
                        {interp(h?.checkCommit)}
                      </span>
                      {"\r\n                  "}
                      <span style={css(h?.checkBoardStyle)}>
                        {interp(h?.checkBoard)}
                      </span>
                      {"\r\n                  "}
                      <span style={css(h?.checkHoleStyle)}>
                        {interp(h?.checkHole)}
                      </span>
                      {"\r\n                  "}
                      <span style={css(h?.checkSeedStyle)}>
                        {interp(h?.checkSeed)}
                      </span>
                      {"\r\n                "}
                    </div>
                    {"\r\n                "}
                    <div style={css(h?.deckLineStyle)}>
                      {interp(h?.deckLine)}
                    </div>
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </div>
                {"\r\n          "}
              </div>
              {"\r\n        "}
            </Fragment>
          ))}
          {"\r\n      "}
        </div>
        {"\r\n      "}
        <div style={css(v.historyEmptyStyle)}>
          {"\r\n        "}
          <div style={{ fontWeight: "500", letterSpacing: "-.03em", fontSize: "22px", marginBottom: "8px", color: "#e8ecf8" }}>
            {"Nothing dealt yet"}
          </div>
          {"\r\n        "}
          <div style={{ fontSize: "12px", color: "#94a3c4", marginBottom: "18px" }}>
            {"Sit down and play a hand, the receipt shows up here the moment the pot ships."}
          </div>
          {"\r\n        "}
          <button className="pill-flat" onClick={v.goTable} style={{ padding: "11px 22px", borderRadius: "5px", background: "linear-gradient(180deg,#8b5cf6,#6d3fd4)", border: "1px solid rgba(255,255,255,0.165)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.27),0 1px 3px rgba(0,0,0,0.35)", color: "#f6f3ff", fontSize: "13px" }}>
            {"To the table"}
          </button>
          {"\r\n      "}
        </div>
        {"\r\n    "}
      </div>
      {"\r\n  "}
    </>
  );
}
