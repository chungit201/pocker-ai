/* The leaderboard screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { Fragment } from 'react';
import { interp, css, asArray } from '../dc-runtime';

export default function Leaderboard({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      <div className="su-page su-stage" style={{ flex: "1", paddingBottom: "120px", display: "flex", flexDirection: "column", gap: "clamp(14px,26px,22px)" }}>
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
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#8b5cf6", flex: "none", animation: "suPulse 2.2s ease-in-out infinite" }} />
                {"\r\n              "}
                <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>
                  {interp(v.jkEyebrow)}
                </span>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", flexWrap: "wrap" }}>
                {"\r\n              "}
                <span style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "clamp(46px,100px,78px)", lineHeight: ".86", color: "#e8ecf8" }}>
                  {interp(v.jkPool)}
                </span>
                {"\r\n              "}
                <span style={{ fontSize: "11px", letterSpacing: ".2em", color: "#94a3c4", marginLeft: "8px" }}>{"USDC"}</span>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <span style={{ fontSize: "clamp(14px,22px,16px)", color: "#e8ecf8", maxWidth: "44ch", textWrap: "pretty" }}>
                {interp(v.jkLine)}
              </span>
              {"\r\n            "}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 28px", marginTop: "auto", paddingTop: "12px" }}>
                {"\r\n              "}
                {asArray(v.jkFacts).map((f: any, $index: number) => (
                  <Fragment key={$index}>
                    {"\r\n                "}
                    <span style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {"\r\n                  "}
                      <span style={{ fontSize: "10px", letterSpacing: ".14em", color: "#94a3c4" }}>
                        {interp(f?.k)}
                      </span>
                      {"\r\n                  "}
                      <span style={css(`font-family:'Instrument Serif',serif;font-variant-numeric:tabular-nums;font-size:21px;color:${f?.tone ?? ''}`)}>
                        {interp(f?.v)}
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
          <div className="gm-side" style={{ flex: "1 1 280px", minWidth: "0", border: "1px solid rgba(232,236,248,0.12)", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {"\r\n          "}
            <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"YOUR TICKETS"}</span>
            {"\r\n          "}
            {v.youInDraw ? (
              <>
                {"\r\n            "}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: "1" }}>
                  {"\r\n              "}
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                    {"\r\n                "}
                    <span style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "34px", lineHeight: "1", color: "#a78bfa" }}>
                      {interp(v.youChance)}
                    </span>
                    {"\r\n                "}
                    <span style={{ fontSize: "12.5px", color: "#94a3c4" }}>{"Chance to win"}</span>
                    {"\r\n              "}
                  </div>
                  {"\r\n              "}
                  <div style={{ flex: "1", display: "flex", flexDirection: "column", borderTop: "1px solid rgba(232,236,248,0.1)" }}>
                    {"\r\n                "}
                    {asArray(v.youDrawRows).map((r: any, $index: number) => (
                      <Fragment key={$index}>
                        {"\r\n                  "}
                        <div style={{ flex: "1", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", minHeight: "38px", borderBottom: "1px solid rgba(232,236,248,0.08)" }}>
                          {"\r\n                    "}
                          <span style={{ fontSize: "12.5px", color: "#94a3c4" }}>
                            {interp(r?.k)}
                          </span>
                          {"\r\n                    "}
                          <span style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "16px", color: "#e8ecf8" }}>
                            {interp(r?.v)}
                          </span>
                          {"\r\n                  "}
                        </div>
                        {"\r\n                "}
                      </Fragment>
                    ))}
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </div>
                {"\r\n          "}
              </>
            ) : null}
            {"\r\n          "}
            {v.youOutOfDraw ? (
              <>
                {"\r\n            "}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: "1" }}>
                  {"\r\n              "}
                  <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "23px", lineHeight: "1.14", color: "#e8ecf8" }}>
                    {interp(v.youOutTitle)}
                  </span>
                  {"\r\n              "}
                  <span style={{ fontSize: "13px", color: "#94a3c4", lineHeight: "1.55" }}>
                    {interp(v.youOutLine)}
                  </span>
                  {"\r\n              "}
                  <button className="pill scpa scp6" onClick={v.youOutGo} style={css(v.youOutBtnStyle)}>
                    {interp(v.youOutBtn)}
                  </button>
                  {"\r\n            "}
                </div>
                {"\r\n          "}
              </>
            ) : null}
            {"\r\n        "}
          </div>
          {"\r\n      "}
        </div>
        {"\r\n\r\n      "}
        {/*
           The day has closed; its winner is not known yet. The draw waits for
           the first Ethereum block after midnight to finalise.
        */}
        {"\r\n      "}
        {v.jkIsDrawing ? (
          <>
            {"\r\n        "}
            <div style={css(v.jkDrawingStyle)}>
              {"\r\n          "}
              <span style={css(v.jkDrawingDotStyle)} />
              {"\r\n          "}
              <span style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: "0" }}>
                {"\r\n            "}
                <span style={css(v.jkDrawingHeadStyle)}>
                  {interp(v.jkDrawingHead)}
                </span>
                {"\r\n            "}
                <span style={css(v.jkDrawingSubStyle)}>
                  {interp(v.jkDrawingSub)}
                </span>
                {"\r\n          "}
              </span>
              {"\r\n        "}
            </div>
            {"\r\n      "}
          </>
        ) : null}
        {"\r\n\r\n      "}
        {/*
           Claim: only a winner with a live, unclaimed voucher ever sees this.
           `jkHasClaim` is the signed voucher itself, not "am I signed in".
        */}
        {"\r\n      "}
        {v.jkHasClaim ? (
          <>
            {"\r\n        "}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px", padding: "16px 20px", border: "1px solid rgba(139,92,246,0.45)", borderRadius: "12px", background: "rgba(139,92,246,0.08)" }}>
              {"\r\n          "}
              <span style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: "0", flex: "1 1 200px" }}>
                {"\r\n            "}
                <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>
                  {interp(v.jkClaimHead)}
                </span>
                {"\r\n            "}
                <span style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "30px", lineHeight: "1", color: "#e8ecf8" }}>
                  {interp(v.jkClaimAmount)}
                </span>
                {"\r\n          "}
              </span>
              {"\r\n          "}
              <button className="pill scp9 scp4" onClick={v.doClaimJackpot} style={css(v.jkClaimBtnStyle)}>
                {interp(v.jkClaimLabel)}
              </button>
              {"\r\n          "}
              <span style={css(v.jkClaimMsgStyle)}>
                {interp(v.jkClaimMsg)}
                <a href={v.jkClaimTxUrl} target="_blank" rel="noopener noreferrer" style={css(v.jkClaimTxStyle)}>{"Receipt ↗"}</a>
              </span>
              {"\r\n        "}
            </div>
            {"\r\n      "}
          </>
        ) : null}
        {"\r\n\r\n      "}
        <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
          {"\r\n        "}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "12px" }}>
            {"\r\n          "}
            <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"LEADERBOARD"}</span>
            {"\r\n          "}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              {"\r\n            "}
              <div className="su-seg" style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {"\r\n              "}
                {asArray(v.lbPeriods).map((p: any, $index: number) => (
                  <Fragment key={$index}>
                    {"\r\n                "}
                    <button className={p?.on ? "su-seg-btn su-seg-btn--on" : "su-seg-btn"} onClick={p?.pick}>
                      {"\r\n                  "}
                      {p?.on ? (
                        <>
                          <span className="su-seg-glow" />
                        </>
                      ) : null}
                      {"\r\n                  "}
                      <span style={css(`position:relative;color:${p?.ink ?? ''}`)}>
                        {interp(p?.label)}
                      </span>
                      {"\r\n                "}
                    </button>
                    {"\r\n              "}
                  </Fragment>
                ))}
                {"\r\n            "}
              </div>
              {"\r\n            "}
              {/*
                 Kept from the shipped board: the gateway takes a `stake` and
                 narrows the standings to one game.
              */}
              {"\r\n            "}
              <select className="su-select" value={v.lbStakeVal ?? ''} onChange={v.setLbStake}>
                {"\r\n              "}
                <option value="">{"All stakes"}</option>
                {"\r\n              "}
                <option value="nl2">{"1¢/2¢"}</option>
                {"\r\n              "}
                <option value="nl10">{"5¢/10¢"}</option>
                {"\r\n              "}
                <option value="nl50">{"25¢/50¢"}</option>
                {"\r\n              "}
                <option value="nl200">{"$1/$2"}</option>
                {"\r\n              "}
                <option value="nl500">{"$2/$5"}</option>
                {"\r\n              "}
                <option value="nl1000">{"$5/$10"}</option>
                {"\r\n            "}
              </select>
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n        "}
          {/*
             The four figure columns take a SHARE of the row rather than a fixed
             number of pixels, so they spread as the page gets wider instead of
             huddling against the right edge with a hundred blank pixels between
             the name and the first number. Their px floors are the old fixed
             widths, so nothing gets tighter than it already was; the name is
             still the one column that absorbs what is left. Three rows carry
             these widths (this header, the sc-for row, the pinned "you" row)
             and bb/100 carries its own in the class body, because its colour is
             signed — change one, change all four.
          */}
          {"\r\n        "}
          <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(232,236,248,0.12)" }}>
            {"\r\n          "}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", padding: "9px 0", fontSize: "10px", letterSpacing: ".14em", color: "#94a3c4", borderBottom: "1px solid rgba(232,236,248,0.08)" }}>
              {"\r\n            "}
              <span style={{ flex: "0 0 30px" }}>{"#"}</span>
              {"\r\n            "}
              <span style={{ flex: "1 1 auto", minWidth: "0" }}>{"PLAYER"}</span>
              {"\r\n            "}
              <span className="su-lb-num" style={{ flex: "0 0 12%", minWidth: "66px", textAlign: "right" }}>{"HANDS"}</span>
              {"\r\n            "}
              <span className="su-lb-num" style={{ flex: "0 0 11%", minWidth: "62px", textAlign: "right" }}>{"BB/100"}</span>
              {"\r\n            "}
              <span className="su-lb-num" style={{ flex: "0 0 13%", minWidth: "74px", textAlign: "right" }}>{"BIGGEST"}</span>
              {"\r\n            "}
              <span style={{ flex: "0 0 15%", minWidth: "96px", textAlign: "right" }}>{"NET"}</span>
              {"\r\n          "}
            </div>
            {"\r\n          "}
            {asArray(v.lbRows).map((r: any, $index: number) => (
              <Fragment key={$index}>
                {"\r\n            "}
                <div style={{ position: "relative", display: "flex", gap: "12px", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(232,236,248,0.08)" }}>
                  {"\r\n              "}
                  <span style={css(r?.mineBar)} />
                  {"\r\n              "}
                  <span style={css(`flex:0 0 30px;font-family:'Instrument Serif',serif;font-variant-numeric:tabular-nums;font-size:17px;color:${r?.rankTone ?? ''}`)}>
                    {interp(r?.rank)}
                  </span>
                  {"\r\n              "}
                  <span style={{ flex: "1 1 auto", minWidth: "96px", display: "flex", alignItems: "center", gap: "9px" }}>
                    {"\r\n                "}
                    <span className="av" data-tier={r?.avTier} style={{ width: "24px", height: "24px", flex: "none" }}>
                      <span style={css(r?.avInner)} />
                    </span>
                    {"\r\n                "}
                    <span style={css(`overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13.5px;color:${r?.nameTone ?? ''}`)}>
                      {interp(r?.name)}
                    </span>
                    {"\r\n              "}
                  </span>
                  {"\r\n              "}
                  <span className="su-lb-num" style={{ flex: "0 0 12%", minWidth: "66px", textAlign: "right", fontSize: "12.5px", color: "#94a3c4", fontVariantNumeric: "tabular-nums" }}>
                    {interp(r?.hands)}
                  </span>
                  {"\r\n              "}
                  <span className="su-lb-num" style={css(r?.bbStyle)}>
                    {interp(r?.bb100)}
                  </span>
                  {"\r\n              "}
                  <span className="su-lb-num" style={{ flex: "0 0 13%", minWidth: "74px", textAlign: "right", fontSize: "12.5px", color: "#94a3c4", fontVariantNumeric: "tabular-nums" }}>
                    {interp(r?.biggest)}
                  </span>
                  {"\r\n              "}
                  <span style={css(`flex:0 0 15%;min-width:96px;text-align:right;font-family:'Instrument Serif',serif;font-variant-numeric:tabular-nums;font-size:16px;color:${r?.netTone ?? ''}`)}>
                    {interp(r?.net)}
                  </span>
                  {"\r\n            "}
                </div>
                {"\r\n          "}
              </Fragment>
            ))}
            {"\r\n          "}
            {v.lbEmpty ? (
              <>
                {"\r\n            "}
                <div style={{ padding: "34px 4px", fontSize: "13px", color: "#94a3c4" }}>
                  {interp(v.lbEmptyText)}
                </div>
                {"\r\n          "}
              </>
            ) : null}
            {"\r\n        "}
          </div>
          {"\r\n        "}
          {v.lbHasMore ? (
            <>
              {"\r\n          "}
              <button className="pill scpa scp6" onClick={v.lbShowMore} style={{ alignSelf: "center", marginTop: "2px", padding: "10px 20px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.28)", background: "linear-gradient(180deg,rgba(148,163,196,0.05),rgba(0,0,0,0.125))", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)", color: "#e8ecf8", fontSize: "13.5px" }}>
                {interp(v.lbShowMoreLabel)}
              </button>
              {"\r\n        "}
            </>
          ) : null}
          {"\r\n        "}
          {/*
             Your own row, pinned, when you are not already visible above. The
             gateway sends it for exactly this case.
          */}
          {"\r\n        "}
          {v.lbHasYou ? (
            <>
              {"\r\n          "}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", padding: "12px 14px", border: "1px solid rgba(139,92,246,0.4)", borderLeft: "3px solid #a78bfa", borderRadius: "8px", background: "rgba(139,92,246,0.06)" }}>
                {"\r\n            "}
                <span style={{ flex: "0 0 30px", fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "17px", color: "#a78bfa" }}>
                  {interp(v.lbYouRank)}
                </span>
                {"\r\n            "}
                <span style={{ flex: "1 1 auto", minWidth: "96px", display: "flex", alignItems: "center", gap: "9px" }}>
                  {"\r\n              "}
                  <span className="av" data-tier={v.headerTier} style={{ width: "24px", height: "24px", flex: "none" }}>
                    <span style={css(v.headerAvInner)} />
                  </span>
                  {"\r\n              "}
                  <span style={{ fontSize: "13.5px", color: "#e8ecf8" }}>{"You"}</span>
                  {"\r\n            "}
                </span>
                {"\r\n            "}
                <span className="su-lb-num" style={{ flex: "0 0 12%", minWidth: "66px", textAlign: "right", fontSize: "12.5px", color: "#94a3c4", fontVariantNumeric: "tabular-nums" }}>
                  {interp(v.lbYouHands)}
                </span>
                {"\r\n            "}
                <span className="su-lb-num" style={css(v.lbYouBbStyle)}>
                  {interp(v.lbYouBb)}
                </span>
                {"\r\n            "}
                <span className="su-lb-num" style={{ flex: "0 0 13%", minWidth: "74px", textAlign: "right", fontSize: "12.5px", color: "#94a3c4", fontVariantNumeric: "tabular-nums" }}>
                  {interp(v.lbYouBest)}
                </span>
                {"\r\n            "}
                <span style={css(`flex:0 0 15%;min-width:96px;text-align:right;font-family:'Instrument Serif',serif;font-variant-numeric:tabular-nums;font-size:16px;color:${v.lbYouNetTone ?? ''}`)}>
                  {interp(v.lbYouNet)}
                </span>
                {"\r\n          "}
              </div>
              {"\r\n        "}
            </>
          ) : null}
          {"\r\n        "}
          <div style={{ display: "flex", gap: "22px", flexWrap: "wrap", fontSize: "11.5px", color: "#94a3c4", paddingTop: "2px" }}>
            {"\r\n          "}
            <span>
              {interp(v.lbPlayersLine)}
            </span>
            <span>
              {interp(v.lbHandsLine)}
            </span>
            <span>
              {interp(v.lbPoolLine)}
            </span>
            <span>
              {interp(v.lbGapLine)}
            </span>
            {"\r\n        "}
          </div>
          {"\r\n      "}
        </div>
        {"\r\n\r\n      "}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(12px,21px,18px)", alignItems: "flex-start", borderTop: "1px solid rgba(232,236,248,0.12)", paddingTop: "20px", marginTop: "6px" }}>
          {"\r\n        "}
          {/*
             Winners scroll; the biggest pots sit under them. Both are the
             record of what the pool has already paid out, so they belong in
             one column — which leaves the whole right-hand side to the rules,
             the only thing down here anybody actually has to read.
          */}
          {"\r\n        "}
          <div style={{ flex: "1 1 320px", minWidth: "0", display: "flex", flexDirection: "column", gap: "clamp(14px,26px,22px)" }}>
            {"\r\n          "}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {"\r\n            "}
              <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"RECENT WINNERS"}</span>
              {"\r\n            "}
              <div className="su-scroll" style={{ display: "flex", flexDirection: "column", maxHeight: "288px", overflowY: "auto", paddingRight: "8px", borderTop: "1px solid rgba(232,236,248,0.1)" }}>
                {"\r\n              "}
                {asArray(v.jkWinners).map((w: any, $index: number) => (
                  <Fragment key={$index}>
                    {"\r\n                "}
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", padding: "10px 0", borderBottom: "1px solid rgba(232,236,248,0.08)" }}>
                      {"\r\n                  "}
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        {"\r\n                    "}
                        <span style={{ flex: "0 0 52px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10.5px", letterSpacing: ".06em", color: "#94a3c4" }}>
                          {interp(w?.day)}
                        </span>
                        {"\r\n                    "}
                        <span className="av" data-tier={w?.avTier} style={{ width: "20px", height: "20px", flex: "none" }}>
                          <span style={css(w?.avInner)} />
                        </span>
                        {"\r\n                    "}
                        <span style={{ flex: "1 1 auto", minWidth: "50px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "13.5px", color: "#e8ecf8" }}>
                          {interp(w?.name)}
                        </span>
                        {"\r\n                    "}
                        {/*
                           The badge states what actually happened to the prize:
                           paid, still claimable, expired, or back in the pool.
                        */}
                        {"\r\n                    "}
                        <span style={css(w?.badgeStyle)}>
                          {interp(w?.badge)}
                        </span>
                        {"\r\n                    "}
                        <span style={{ flex: "0 0 62px", textAlign: "right", fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "16px", color: "#a78bfa" }}>
                          {interp(w?.prize)}
                        </span>
                        {"\r\n                  "}
                      </div>
                      {"\r\n                  "}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", alignItems: "center", paddingLeft: "62px" }}>
                        {"\r\n                    "}
                        <a href={w?.claimTx} target="_blank" rel="noopener noreferrer" style={css(w?.claimStyle)}>{"Tx ↗"}</a>
                        {"\r\n                    "}
                        <button onClick={w?.verify} style={css(w?.verifyStyle)}>
                          {interp(w?.verifyLabel)}
                        </button>
                        {"\r\n                    "}
                        <span style={css(w?.claimNoteStyle)}>
                          {interp(w?.claimNote)}
                        </span>
                        {"\r\n                  "}
                      </div>
                      {"\r\n                  "}
                      <div style={css(w?.verifyLineStyle)}>
                        {"\r\n                    "}
                        <span>
                          {interp(w?.verifyLine)}
                        </span>
                        {"\r\n                    "}
                        <a href={w?.blockUrl} target="_blank" rel="noopener noreferrer" style={css(w?.blockLinkStyle)}>
                          {interp(w?.blockLabel)}
                        </a>
                        {"\r\n                    "}
                        <span>
                          {interp(w?.verifyTail)}
                        </span>
                        {"\r\n                  "}
                      </div>
                      {"\r\n                "}
                    </div>
                    {"\r\n              "}
                  </Fragment>
                ))}
                {"\r\n              "}
                {v.jkNoWinners ? (
                  <>
                    {"\r\n                "}
                    <div style={{ padding: "16px 0", fontSize: "13px", color: "#94a3c4" }}>
                      {"No draws yet, the first pays out when the day closes"}
                    </div>
                    {"\r\n              "}
                  </>
                ) : null}
                {"\r\n            "}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n          "}
            <div style={{ flex: "1 1 260px", minWidth: "0", display: "flex", flexDirection: "column", gap: "10px" }}>
              {"\r\n            "}
              <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"BIGGEST POTS"}</span>
              {"\r\n            "}
              <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(232,236,248,0.1)" }}>
                {"\r\n              "}
                {asArray(v.jkPots).map((p: any, $index: number) => (
                  <Fragment key={$index}>
                    {"\r\n                "}
                    <div style={css(p?.row)}>
                      {"\r\n                  "}
                      <span style={css(p?.rankStyle)}>
                        {interp(p?.rank)}
                      </span>
                      {"\r\n                  "}
                      <span style={{ flex: "0 0 auto", fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "16px", color: "#e8ecf8" }}>
                        {interp(p?.pot)}
                      </span>
                      {"\r\n                  "}
                      <span style={{ flex: "1 1 auto", minWidth: "0", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "7px" }}>
                        {"\r\n                    "}
                        <span className="av" data-tier={p?.avTier} style={css(p?.avWrap)}>
                          <span style={css(p?.avInner)} />
                        </span>
                        {"\r\n                    "}
                        <span style={{ minWidth: "0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12.5px", color: "#94a3c4" }}>
                          {interp(p?.winner)}
                        </span>
                        {"\r\n                    "}
                        <span style={{ flex: "none", fontSize: "11.5px", color: "rgba(232,236,248,0.26)" }}>{"|"}</span>
                        {"\r\n                    "}
                        <span style={{ flex: "none", fontSize: "11.5px", color: "#94a3c4" }}>
                          {interp(p?.stake)}
                        </span>
                        {"\r\n                  "}
                      </span>
                      {"\r\n                "}
                    </div>
                    {"\r\n              "}
                  </Fragment>
                ))}
                {"\r\n              "}
                {v.jkNoPots ? (
                  <>
                    {"\r\n                "}
                    <div style={{ padding: "16px 0", fontSize: "13px", color: "#94a3c4" }}>{"No pots recorded yet"}</div>
                    {"\r\n              "}
                  </>
                ) : null}
                {"\r\n            "}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n        "}
          <div style={{ flex: "1.35 1 380px", minWidth: "0", display: "flex", flexDirection: "column", gap: "8px" }}>
            {"\r\n          "}
            <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"HOW THE DRAW WORKS"}</span>
            {"\r\n          "}
            <div style={{ display: "flex", flexDirection: "column", gap: "9px", borderLeft: "2px solid rgba(139,92,246,0.5)", padding: "2px 0 2px 13px" }}>
              {"\r\n            "}
              {asArray(v.drawRules).map((d: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <span style={{ fontSize: "13px", color: "#94a3c4", lineHeight: "1.6" }}>
                    {interp(d?.t)}
                  </span>
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
