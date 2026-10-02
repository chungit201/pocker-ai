/* The tournaments screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { Fragment } from 'react';
import { interp, css, asArray } from '../dc-runtime';

export default function Tournaments({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      <div className="su-page su-stage" style={{ flex: "1", paddingBottom: "120px", display: "flex", flexDirection: "column", gap: "clamp(14px,26px,22px)" }}>
        {"\r\n      "}
        <div style={css(v.tournamentErrorStyle)}>
          {interp(v.tournamentError)}
        </div>
        {"\r\n\r\n      "}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(12px,21px,18px)", alignItems: "stretch" }}>
          {"\r\n        "}
          <div className="gm-panel" style={{ flex: "1 1 520px", minWidth: "0", position: "relative", borderRadius: "12px", overflow: "hidden", background: "#0a0d16", border: "1px solid rgba(232,236,248,0.08)", display: "flex", flexDirection: "column" }}>
            {"\r\n          "}
            {"\r\n          "}
            <div style={{ position: "relative", padding: "clamp(22px,42px,34px)", display: "flex", flexDirection: "column", gap: "14px", flex: "1" }}>
              {"\r\n            "}
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                {"\r\n              "}
                <span style={css(v.featPipStyle)} />
                {"\r\n              "}
                <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>
                  {interp(v.featEyebrow)}
                </span>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <h1 style={{ margin: "0", fontFamily: "'Instrument Serif',serif", fontWeight: "400", fontSize: "clamp(30px,60px,46px)", lineHeight: "1.04", letterSpacing: "-.015em", color: "#e8ecf8" }}>
                {interp(v.featName)}
              </h1>
              {"\r\n            "}
              <div style={css(v.featClockStyle)}>
                {"\r\n              "}
                <span style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "clamp(30px,51px,40px)", lineHeight: "1", color: "#a78bfa" }}>
                  {interp(v.featCountdown)}
                </span>
                {"\r\n              "}
                <span style={{ fontSize: "13px", color: "#94a3c4" }}>
                  {interp(v.featStartLine)}
                </span>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <span style={css(v.featBlurbStyle)}>
                {interp(v.featBlurb)}
              </span>
              {"\r\n            "}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 26px", paddingTop: "2px" }}>
                {"\r\n              "}
                {asArray(v.featFacts).map((f: any, $index: number) => (
                  <Fragment key={$index}>
                    {"\r\n                "}
                    <span style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {"\r\n                  "}
                      <span style={{ fontSize: "10px", letterSpacing: ".14em", color: "#94a3c4" }}>
                        {interp(f?.k)}
                      </span>
                      {"\r\n                  "}
                      <span style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "19px", color: "#e8ecf8" }}>
                        {interp(f?.v)}
                      </span>
                      {"\r\n                "}
                    </span>
                    {"\r\n              "}
                  </Fragment>
                ))}
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "7px", paddingTop: "14px" }}>
                {"\r\n              "}
                <span style={{ fontSize: "10px", letterSpacing: ".14em", color: "#94a3c4" }}>
                  {interp(v.featBlindsLabel)}
                </span>
                {"\r\n              "}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {"\r\n                "}
                  {asArray(v.featBlinds).map((b: any, $index: number) => (
                    <Fragment key={$index}>
                      {"\r\n                  "}
                      <span style={css(`padding:5px 10px;border:1px solid rgba(232,236,248,0.16);border-radius:5px;font-family:'JetBrains Mono',monospace;font-size:11px;color:${b?.tone ?? ''};font-variant-numeric:tabular-nums`)}>
                        {interp(b?.label)}
                      </span>
                      {"\r\n                "}
                    </Fragment>
                  ))}
                  {"\r\n              "}
                </div>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", paddingTop: "14px" }}>
                {"\r\n              "}
                <button className="pill scpg scp4" onClick={v.featAction} style={css(v.featActionStyle)}>
                  {interp(v.featActionLabel)}
                </button>
                {"\r\n              "}
                <button className="pill scpa scp6" onClick={v.featOpen} style={css(v.featOpenStyle)}>{"The full structure"}</button>
                {"\r\n              "}
                <span style={{ fontSize: "12px", color: "#94a3c4", flex: "1 1 200px", minWidth: "0", lineHeight: "1.45" }}>
                  {interp(v.featNote)}
                </span>
                {"\r\n            "}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n        "}
          <div style={css(v.featStructureStyle)}>
            {"\r\n          "}
            <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"THE STRUCTURE"}</span>
            {"\r\n          "}
            <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(232,236,248,0.1)" }}>
              {"\r\n            "}
              {asArray(v.featStructure).map((r: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", padding: "8px 0", borderBottom: "1px solid rgba(232,236,248,0.08)" }}>
                    {"\r\n                "}
                    <span style={{ fontSize: "12.5px", color: "#94a3c4" }}>
                      {interp(r?.k)}
                    </span>
                    {"\r\n                "}
                    <span style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "16px", color: "#e8ecf8", textAlign: "right" }}>
                      {interp(r?.v)}
                    </span>
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </Fragment>
              ))}
              {"\r\n          "}
            </div>
            {"\r\n          "}
            <div style={css(v.featPaysStyle)}>
              {"\r\n            "}
              <span style={{ fontSize: "10px", letterSpacing: ".14em", color: "#94a3c4" }}>{"PAYS"}</span>
              {"\r\n            "}
              {asArray(v.featPayouts).map((p: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px" }}>
                    {"\r\n                "}
                    <span style={{ fontSize: "12.5px", color: "#94a3c4" }}>
                      {interp(p?.place)}
                    </span>
                    {"\r\n                "}
                    <span style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "16px", color: "#a78bfa" }}>
                      {interp(p?.amount)}
                    </span>
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </Fragment>
              ))}
              {"\r\n          "}
            </div>
            {"\r\n          "}
            <span style={{ marginTop: "auto", paddingTop: "8px", fontSize: "11.5px", color: "#94a3c4", lineHeight: "1.5" }}>
              {interp(v.featPoolNote)}
            </span>
            {"\r\n        "}
          </div>
          {"\r\n      "}
        </div>
        {"\r\n\r\n      "}
        {/*
           Your own events, from /api/tournaments/mine — the only place a
           RUNNING or FINISHED event reaches this page at all.
        */}
        {"\r\n      "}
        {v.hasMine ? (
          <>
            {"\r\n        "}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {"\r\n          "}
              <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"YOUR EVENTS"}</span>
              {"\r\n          "}
              {asArray(v.tMineRows).map((m: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n            "}
                  <div className="row-a" onClick={m?.open} style={css(`display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:14px 18px;border:1px solid ${m?.border ?? ''};border-radius:8px;cursor:pointer`)}>
                    {"\r\n              "}
                    <span style={{ flex: "1 1 180px", minWidth: "0", display: "flex", flexDirection: "column", gap: "3px" }}>
                      {"\r\n                "}
                      <span style={{ fontSize: "15px", color: "#e8ecf8" }}>
                        {interp(m?.name)}
                      </span>
                      {"\r\n                "}
                      <span style={css(`font-size:12.5px;color:${m?.tone ?? ''}`)}>
                        {interp(m?.statusLabel)}
                      </span>
                      {"\r\n              "}
                    </span>
                    {"\r\n              "}
                    <span style={css(m?.metaStyle)}>
                      {"\r\n                "}
                      <span style={{ fontSize: "10px", letterSpacing: ".14em", color: "#94a3c4" }}>
                        {interp(m?.metaK)}
                      </span>
                      {"\r\n                "}
                      <span style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "17px", color: "#e8ecf8" }}>
                        {interp(m?.metaV)}
                      </span>
                      {"\r\n              "}
                    </span>
                    {"\r\n              "}
                    <button className="pill scpa scp6" onClick={m?.action} style={css(m?.actionStyle)}>
                      {interp(m?.actionLabel)}
                    </button>
                    {"\r\n            "}
                  </div>
                  {"\r\n          "}
                </Fragment>
              ))}
              {"\r\n        "}
            </div>
            {"\r\n      "}
          </>
        ) : null}
        {"\r\n\r\n      "}
        <div style={css(v.scheduleStyle)}>
          {"\r\n        "}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            {"\r\n          "}
            <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"THE SCHEDULE"}</span>
            {"\r\n          "}
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {"\r\n            "}
              {asArray(v.tFilters).map((f: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <button className="chip" onClick={f?.pick} style={{ position: "relative", padding: "5px 10px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.18)", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", letterSpacing: ".08em", color: "#94a3c4", transition: "border-color .16s ease,color .16s ease" }}>
                    {"\r\n                "}
                    {f?.on ? (
                      <>
                        <span style={{ position: "absolute", inset: "-1px", borderRadius: "5px", background: "rgba(139,92,246,0.14)", border: "1px solid rgba(139,92,246,0.5)" }} />
                      </>
                    ) : null}
                    {"\r\n                "}
                    <span style={css(`position:relative;color:${f?.ink ?? ''}`)}>
                      {interp(f?.label)}
                    </span>
                    {"\r\n              "}
                  </button>
                  {"\r\n            "}
                </Fragment>
              ))}
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n        "}
          {/*
             Shares of the row, not fixed pixels, on the leaderboard's system:
             two tables of the same construction sit one tab apart, so they
             spread the same way. Px floors are the old widths, and the event
             name is still the only column that absorbs what is left, which is
             what `.su-t-num`'s phone collapse rests on. Both rows carry these
             widths — change one, change the other.
          */}
          {"\r\n        "}
          <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(232,236,248,0.12)" }}>
            {"\r\n          "}
            <div style={{ display: "flex", gap: "14px", alignItems: "center", padding: "9px 0", fontSize: "10px", letterSpacing: ".14em", color: "#94a3c4", borderBottom: "1px solid rgba(232,236,248,0.08)" }}>
              {"\r\n            "}
              <span style={{ flex: "1 1 200px", minWidth: "0" }}>{"EVENT"}</span>
              {"\r\n            "}
              <span className="su-t-num" style={{ flex: "0 0 12%", minWidth: "96px", textAlign: "right" }}>{"BUY-IN"}</span>
              {"\r\n            "}
              <span className="su-t-num" style={{ flex: "0 0 11%", minWidth: "104px", textAlign: "right" }}>{"FIELD"}</span>
              {"\r\n            "}
              <span className="su-t-num" style={{ flex: "0 0 13%", minWidth: "104px", textAlign: "right" }}>{"POOL"}</span>
              {"\r\n            "}
              <span style={{ flex: "0 0 14%", minWidth: "116px" }} />
              {"\r\n          "}
            </div>
            {"\r\n          "}
            {asArray(v.tournamentRows).map((t: any, $index: number) => (
              <Fragment key={$index}>
                {"\r\n            "}
                <div className="row-a" onClick={t?.open} style={{ display: "flex", gap: "14px", alignItems: "center", padding: "13px 0", borderBottom: "1px solid rgba(232,236,248,0.08)", cursor: "pointer" }}>
                  {"\r\n              "}
                  <span style={{ flex: "1 1 200px", minWidth: "0", display: "flex", flexDirection: "column", gap: "3px" }}>
                    {"\r\n                "}
                    <span style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "0" }}>
                      {"\r\n                  "}
                      <span style={css(`width:6px;height:6px;border-radius:50%;flex:none;background:${t?.dot ?? ''}`)} />
                      {"\r\n                  "}
                      <span style={{ fontSize: "14.5px", color: "#e8ecf8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {interp(t?.name)}
                      </span>
                      {"\r\n                "}
                    </span>
                    {"\r\n                "}
                    <span style={css(`font-size:12px;color:${t?.whenTone ?? ''};font-variant-numeric:tabular-nums`)}>
                      {interp(t?.when)}
                    </span>
                    {"\r\n                "}
                    <span style={css(t?.invitesStyle)}>
                      {interp(t?.invitesLabel)}
                    </span>
                    {"\r\n              "}
                  </span>
                  {"\r\n              "}
                  <span className="su-t-num" style={{ flex: "0 0 12%", minWidth: "96px", textAlign: "right", fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "16px", color: "#e8ecf8" }}>
                    {interp(t?.buyInLabel)}
                  </span>
                  {"\r\n              "}
                  <span className="su-t-num" style={{ flex: "0 0 11%", minWidth: "104px", textAlign: "right", fontSize: "13px", color: "#94a3c4", fontVariantNumeric: "tabular-nums" }}>
                    {interp(t?.entrantsLabel)}
                  </span>
                  {"\r\n              "}
                  <span className="su-t-num" style={{ flex: "0 0 13%", minWidth: "104px", textAlign: "right", fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "16px", color: "#a78bfa" }}>
                    {interp(t?.pool)}
                  </span>
                  {"\r\n              "}
                  <span style={{ flex: "0 0 14%", minWidth: "116px", display: "flex", justifyContent: "flex-end" }}>
                    {"\r\n                "}
                    <button className="pill scpa scp6" onClick={t?.action} style={css(t?.actionStyle)}>
                      {interp(t?.actionLabel)}
                    </button>
                    {"\r\n              "}
                  </span>
                  {"\r\n            "}
                </div>
                {"\r\n          "}
              </Fragment>
            ))}
            {"\r\n          "}
            {v.tournamentsEmpty ? (
              <>
                {"\r\n            "}
                <div style={{ padding: "26px 4px", fontSize: "13px", color: "#94a3c4" }}>
                  {interp(v.tournamentsEmptyText)}
                </div>
                {"\r\n          "}
              </>
            ) : null}
            {"\r\n        "}
          </div>
          {"\r\n        "}
          <span style={{ fontSize: "11.5px", color: "#94a3c4", paddingTop: "4px" }}>
            {"Buy-ins move from your bankroll into escrow on registration, refundable until registration closes."}
          </span>
          {"\r\n      "}
        </div>
        {"\r\n    "}
      </div>
      {"\r\n  "}
    </>
  );
}
