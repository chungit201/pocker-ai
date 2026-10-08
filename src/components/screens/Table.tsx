/* The table screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { Fragment } from 'react';
import { interp, css, asArray } from '../dc-runtime';
import { openTableMenu } from './TableDrawer';
import WaitingForOthers from './WaitingForOthers';

export default function Table({ v }: { v: any }) {
  return (
    <>
      {/*
         The upright table's two corner controls (see `topBarOn`): the way out
         on the left, and the sit-up / sit-down toggle beside the menu button
         TableDrawer floats in the right corner.
      */}
      {v.topBarOn ? (
        <>
          <button className="tb-top tb-top--leave" onClick={v.topLeave}>
            <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M8 4H4.5v12H8M12 6.5l3.5 3.5-3.5 3.5M15.5 10H8" style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" }} />
            </svg>
            {interp(v.topLeaveLabel)}
          </button>
          {v.topSitOn ? (
            <button className={"tb-top tb-top--sit" + (v.topSitOut ? " tb-top--on" : "")} onClick={v.sitUp} aria-pressed={!!v.topSitOut} aria-label={v.sitUpLabel} title={v.sitUpLabel}>
              {/* A chair. Struck through while the seat is sitting out. */}
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M6 3v8.5h8.5M6 11.5V17M14.5 11.5V17" style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" }} />
                {v.topSitOut ? (
                  <path d="M3.5 16.5l13-13" style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" }} />
                ) : null}
              </svg>
            </button>
          ) : null}
        </>
      ) : null}
      {"\r\n    "}
      <div style={css(v.tableShell)}>
        {"\r\n      "}
        {/*
           Tournament HUD (Part 4 Task 4). A compact single row — level &
           blinds, the clock to the next level, the field remaining, the next
           pay jump, the pool, and the hero's own stack & table rank — plus a
           contextual pause strip underneath when the table carries a
           runtime pauseReason. Absolute over the top of the felt/rail row so
           it spans the full width regardless of the compact/desktop split
           below; shown only on a tournament table (`isTournamentTable`,
           freezeout — no rebuy/sit-out/leave/top-up gated off elsewhere).
        */}
        {"\r\n      "}
        {v.isTournamentTable ? (
          <>
            {"\r\n        "}
            <div style={css(v.tHudWrapStyle)}>
              {"\r\n          "}
              <div style={css(v.tHudBarStyle)}>
                {"\r\n            "}
                <span style={css(v.tHudLevelStyle)}>
                  {interp(v.tHudLevel)}
                </span>
                {"\r\n            "}
                <span style={css(v.tHudDotStyle)} />
                {"\r\n            "}
                <span style={css(v.tHudClockStyle)}>
                  {interp(v.tHudClock)}
                </span>
                {"\r\n            "}
                <span style={css(v.tHudDotStyle)} />
                {"\r\n            "}
                <span style={css(v.tHudMetaStyle)}>
                  {interp(v.tHudRemaining)}
                </span>
                {"\r\n            "}
                <span style={css(v.tHudDotStyle)} />
                {"\r\n            "}
                <span style={css(v.tHudMetaStyle)}>
                  {interp(v.tHudNextPay)}
                </span>
                {"\r\n            "}
                <span style={css(v.tHudDotStyle)} />
                {"\r\n            "}
                <span style={css(v.tHudMetaStyle)}>
                  {"Pool "}
                  {interp(v.tHudPool)}
                </span>
                {"\r\n            "}
                <span style={css(v.tHudSpacerStyle)} />
                {"\r\n            "}
                <span style={css(v.tHudStackStyle)}>
                  {interp(v.tHudStack)}
                </span>
                {"\r\n            "}
                <span style={css(v.tHudRankStyle)}>
                  {interp(v.tHudRank)}
                </span>
                {"\r\n          "}
              </div>
              {"\r\n          "}
              <div style={css(v.tHudPauseStyle)}>
                {interp(v.tHudPauseLabel)}
              </div>
              {"\r\n        "}
            </div>
            {"\r\n      "}
          </>
        ) : null}
        {"\r\n\r\n      "}
        {/*
           Busted: a funding modal over the felt. Paper card from the deposit
           step, slider from take-a-seat, so buying back in reads as the same
           act as sitting down. Absolute over the shell; the felt keeps playing
           behind the scrim for everyone still holding chips. Dismiss folds it
           into the "buy back in" pill down in the action row.
        */}
        {"\r\n      "}
        {v.rebuyModalOn ? (
          <>
            {"\r\n        "}
            <div style={css(v.rebuyBackdrop)}>
              {"\r\n          "}
              <div onClick={v.rebuyStop} style={{ width: "100%", maxWidth: "430px", padding: "30px", borderRadius: "12px", background: "#1a2238", color: "#e8ecf8", border: "1px solid rgba(232,236,248,0.154)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.21),0 24px 60px -20px rgba(0,0,0,0.72)", animation: "riseIn .32s cubic-bezier(.2,.9,.24,1) both" }}>
                {"\r\n            "}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "22px" }}>
                  {"\r\n              "}
                  <div>
                    {"\r\n                "}
                    <h2 style={{ fontFamily: "'Inter Tight',system-ui,sans-serif", fontWeight: "600", letterSpacing: "-.03em", fontSize: "26px", margin: "0 0 3px" }}>
                      {"Out of chips"}
                    </h2>
                    {"\r\n                "}
                    <div style={{ fontSize: "12px", color: "#94a3c4" }}>{"Buy back in, you're dealt the next hand"}</div>
                    {"\r\n              "}
                  </div>
                  {"\r\n              "}
                  <div style={{ textAlign: "right", flex: "none" }}>
                    {"\r\n                "}
                    <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "#94a3c4" }}>{"BANKROLL"}</div>
                    {"\r\n                "}
                    <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "23px", lineHeight: "1.1", color: "#e8ecf8" }}>
                      {interp(v.rebuyBankrollLabel)}
                    </div>
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </div>
                {"\r\n\r\n            "}
                {v.rebuyCanAfford ? (
                  <>
                    {"\r\n              "}
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      {"\r\n                "}
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "16px" }}>
                        {"\r\n                  "}
                        <div style={{ display: "flex", alignItems: "baseline", gap: "9px" }}>
                          {"\r\n                    "}
                          <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "42px", lineHeight: "1", color: "#e8ecf8" }}>
                            {interp(v.rebuyAmountLabel)}
                          </span>
                          {"\r\n                    "}
                          <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#94a3c4" }}>{"USDC"}</span>
                          {"\r\n                  "}
                        </div>
                        {"\r\n                  "}
                        <span style={{ fontSize: "12px", color: "#94a3c4" }}>
                          {interp(v.rebuyBbLabel)}
                        </span>
                        {"\r\n                "}
                      </div>
                      {"\r\n\r\n                "}
                      <div className="fader" draggable="false" onPointerDown={v.rebuyDown} onPointerMove={v.rebuyMove} onPointerUp={v.rebuyUp} onPointerCancel={v.rebuyUp} style={css(v.rebuyTrackStyle)}>
                        {"\r\n                  "}
                        <div style={{ position: "absolute", left: "0", right: "0", height: "2px", background: "rgba(232,236,248,0.176)" }} />
                        {"\r\n                  "}
                        <div style={css(v.rebuyFill)} />
                        {"\r\n                  "}
                        <div style={css(v.rebuyThumb)} />
                        {"\r\n                "}
                      </div>
                      {"\r\n\r\n                "}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#94a3c4", fontVariantNumeric: "tabular-nums", marginTop: "-8px" }}>
                        {"\r\n                  "}
                        <span>
                          {interp(v.rebuyMinLabel)}
                          {" minimum"}
                        </span>
                        <span>
                          {interp(v.rebuyMaxLabel)}
                          {" maximum"}
                        </span>
                        {"\r\n                "}
                      </div>
                      {"\r\n\r\n                "}
                      <button className="pill-flat" onClick={v.doRebuy} style={css(v.rebuyBtnStyle)}>
                        {interp(v.rebuyBtnLabel)}
                      </button>
                      {"\r\n              "}
                    </div>
                    {"\r\n            "}
                  </>
                ) : null}
                {"\r\n\r\n            "}
                {v.rebuyCantAfford ? (
                  <>
                    {"\r\n              "}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {"\r\n                "}
                      <div style={{ fontSize: "13px", lineHeight: "1.55", color: "#94a3c4" }}>
                        {interp(v.rebuyNeedLabel)}
                      </div>
                      {"\r\n                "}
                      <button className="pill-flat" onClick={v.rebuyDeposit} style={css(v.rebuyDepositStyle)}>{"Add funds"}</button>
                      {"\r\n              "}
                    </div>
                    {"\r\n            "}
                  </>
                ) : null}
                {"\r\n\r\n            "}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "18px" }}>
                  {"\r\n              "}
                  <button onClick={v.rebuyDismiss} style={{ fontSize: "12px", color: "#94a3c4", background: "transparent" }}>
                    {"Watch instead"}
                  </button>
                  {"\r\n              "}
                  <button onClick={v.leaveTable} style={{ fontSize: "12px", color: "#e5484d", background: "transparent" }}>
                    {"Leave the table"}
                  </button>
                  {"\r\n            "}
                </div>
                {"\r\n          "}
              </div>
              {"\r\n        "}
            </div>
            {"\r\n      "}
          </>
        ) : null}
        {"\r\n\r\n      "}
        {/* the felt's column: see `feltCol` for why its min-height:0 matters */}
        {"\r\n      "}
        <div style={css(v.feltCol)}>
          {"\r\n\r\n        "}
          <div ref={v.feltRef} style={css(v.stageBox)}>
            {"\r\n          "}
            {/*
               The play area is a fixed 1420×750 design canvas, scaled as one
               unit to fit the felt. Everything inside is a literal canvas
               coordinate, so the geometry the redesign verified holds at every
               window size. The felt's lit centre lives on the container behind
               it; the furniture and reconnect scrim sit outside it, at true
               size, so they never shrink with the table.
            */}
            {"\r\n          "}
            <div style={css(v.playArea)}>
              {/* the table's skin: an oval under everything, or nothing (lib/table-styles) */}
              <div style={css(v.tableSurface)} />
              {"\r\n\r\n            "}
              {/* what is happening, top-left; the street, top-right */}
              {"\r\n            "}
              <div style={css(v.feltStatusStyle)}>
                {"\r\n              "}
                <span style={css(v.turnDotStyle)} />
                {"\r\n              "}
                <span style={{ color: "#e8ecf8" }}>
                  {interp(v.turnTitle)}
                </span>
                {"\r\n              "}
                <span style={css(v.secsStyle)}>
                  {interp(v.secsLabel)}
                </span>
                {"\r\n              "}
                <span style={css(v.handIdSep)}>{"·"}</span>
                {"\r\n              "}
                <span style={css(v.handIdOnFelt)}>
                  {interp(v.handIdLabel)}
                </span>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <div style={css(v.streetStyle)}>
                {"\r\n              "}
                <span style={css(v.streetDotStyle)} />
                {interp(v.streetLabel)}
                {"\r\n            "}
              </div>
              {"\r\n\r\n            "}
              {/*
                 the board's own frame: a single stroked path with a real gap in
                 the top edge, the wordmark sitting in the gap (typeface only, no
                 felt-coloured patch), five slots inside it
              */}
              {"\r\n            "}
              <div style={css(v.boardFrameStyle)}>
                {"\r\n              "}
                <svg width="472" height="168" viewBox="0 0 472 168" style={{ position: "absolute", inset: "0", display: "block", overflow: "visible" }}>
                  {"\r\n                "}
                  <path d="M 168 0 H 20 A 20 20 0 0 0 0 20 V 148 A 20 20 0 0 0 20 168 H 452 A 20 20 0 0 0 472 148 V 20 A 20 20 0 0 0 452 0 H 304" style={css(v.boardStroke)} />
                  {"\r\n              "}
                </svg>
                {"\r\n              "}
                <span style={css(v.boardMarkStyle)}>
                  {interp(v.boardMark)}
                </span>
                {"\r\n              "}
                <div style={css(v.boardSlotsRow)}>
                  {"\r\n                "}
                  {asArray(v.boardSlots).map((b: any, $index: number) => (
                    <Fragment key={$index}>
                      {"\r\n                  "}
                      <div style={css(b?.style)} />
                      {"\r\n                "}
                    </Fragment>
                  ))}
                  {"\r\n              "}
                </div>
                {"\r\n            "}
              </div>
              {"\r\n\r\n            "}
              {/*
                 cards: 12 hole slots + 5 board slots, fixed order so identity
                 never shifts, each dealt from the centre to its place
              */}
              {"\r\n            "}
              {asArray(v.cards).map((c: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <div style={css(c?.wrap)}>
                    {"\r\n                "}
                    <div style={css(c?.inner)}>
                      {"\r\n                  "}
                      <div style={css(c?.back)} />
                      {"\r\n                  "}
                      <div style={css(c?.face)}>
                        {"\r\n                    "}
                        <span style={css(c?.cornerA)}>
                          {interp(c?.rank)}
                        </span>
                        {"\r\n                    "}
                        <span style={css(c?.cornerB)}>
                          {interp(c?.suit)}
                        </span>
                        {"\r\n                  "}
                      </div>
                      {"\r\n                "}
                    </div>
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </Fragment>
              ))}
              {"\r\n\r\n            "}
              {/* the pot: chip columns squared together, then the figure */}
              {"\r\n            "}
              <div style={css(v.potStyle)}>
                {"\r\n              "}
                <div style={css(v.potChipsWrap)}>
                  {"\r\n                "}
                  {asArray(v.potChips).map((ch: any, $index: number) => (
                    <Fragment key={$index}>
                      {"\r\n                  "}
                      <span style={css(ch?.style)} />
                      {"\r\n                "}
                    </Fragment>
                  ))}
                  {"\r\n              "}
                </div>
                {"\r\n              "}
                <div style={css(v.potReadStyle)}>
                  {"\r\n                "}
                  <span style={css(v.potAmountStyle)}>
                    {interp(v.potLabel)}
                  </span>
                  {"\r\n                "}
                  <span style={css(v.potUnitStyle)}>{"Pot"}</span>
                  {"\r\n              "}
                </div>
                {"\r\n            "}
              </div>
              {"\r\n\r\n            "}
              {/* pot ship: the pot's own chips shoved to the winner at showdown */}
              {"\r\n            "}
              {asArray(v.shipChips).map((d: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <span style={css(d?.style)} />
                  {"\r\n            "}
                </Fragment>
              ))}
              {"\r\n\r\n            "}
              {/* a bet is a dark pill under the nameplate, held for the street */}
              {"\r\n            "}
              {asArray(v.betPills).map((p: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <div style={css(p?.style)}>
                    {"\r\n                "}
                    <span style={css(p?.labelStyle)}>
                      {interp(p?.label)}
                    </span>
                    {"\r\n                "}
                    <span style={css(p?.amountStyle)}>
                      {interp(p?.amount)}
                    </span>
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </Fragment>
              ))}
              {"\r\n\r\n            "}
              {/*
                 the acting seat's timer traces the plate itself, top centre
                 clockwise, rather than sitting inside it
              */}
              {"\r\n            "}
              {asArray(v.seatRings).map((r: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <div style={css(r?.wrap)}>
                    {"\r\n                "}
                    <svg width={r?.w} height={r?.h} viewBox={`0 0 ${r?.w} ${r?.h}`} style={{ display: "block", overflow: "visible" }}>
                      {"\r\n                  "}
                      <path d={r?.path} style={css(r?.track)} />
                      {"\r\n                  "}
                      <path d={r?.path} style={css(r?.sweep)} />
                      {"\r\n                "}
                    </svg>
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </Fragment>
              ))}
              {"\r\n\r\n            "}
              {asArray(v.seatCells).map((s: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <div style={css(s?.plate)}>
                    {"\r\n                "}
                    <div style={css(s?.sigil)}>
                      {"\r\n                  "}
                      <span style={css(s?.sigilGlyph)}>
                        {interp(s?.tag)}
                      </span>
                      {"\r\n                  "}
                      <svg style={css(s?.sigilPip)} width="6" height="9" viewBox="0 0 72 100">
                        <path d="M36,0 Q22,29 0,50 Q22,71 36,100 Z" style={{ fill: "#1a2238" }} />
                        <path d="M36,0 Q50,29 72,50 Q50,71 36,100 Z" style={{ fill: "#8b5cf6" }} />
                      </svg>
                      {"\r\n                  "}
                      <span className="av" data-tier={s?.avTier} style={css(s?.avWrap)}>
                        <span style={css(s?.avInner)} />
                      </span>
                      {"\r\n                "}
                    </div>
                    {"\r\n                "}
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "0" }}>
                      {"\r\n                  "}
                      <span style={css(s?.nameStyle)}>
                        {interp(s?.name)}
                      </span>
                      {"\r\n                  "}
                      <span style={css(s?.subStyle)}>
                        {interp(s?.sub)}
                      </span>
                      {"\r\n                "}
                    </div>
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </Fragment>
              ))}
              {"\r\n\r\n            "}
              {asArray(v.seatMarkers).map((m: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <div style={css(m?.style)}>
                    {interp(m?.label)}
                  </div>
                  {"\r\n            "}
                </Fragment>
              ))}
              {"\r\n\r\n            "}
              {/*
                 Showdown. The felt darkens, a warm light rises under the winning
                 hand, a slow sheen crosses it, and the result sits on top.
              */}
              {"\r\n            "}
              <div style={css(v.dimStyle)} />
              {"\r\n            "}
              <div style={css(v.glowStyle)} />
              {"\r\n            "}
              {/* A crown drops onto each winner's plate: the seat is the hero. */}
              {"\r\n            "}
              {asArray(v.seatCrowns).map((c: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <div style={css(c?.style)}>
                    {"\r\n                "}
                    <div style={{ animation: "crownDrop .55s cubic-bezier(.2,1.35,.4,1) both" }}>
                      {"\r\n                  "}
                      <svg width="46" height="33" viewBox="0 0 38 27" style={{ display: "block", filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.688))" }}>
                        {"\r\n                    "}
                        <path d="M3 25 L2 8 L11 15 L19 3 L27 15 L36 8 L35 25 Z" fill="#a78bfa" stroke="#b194f6" strokeWidth="1.4" strokeLinejoin="round" />
                        {"\r\n                    "}
                        <circle cx="19" cy="3" r="2.6" fill="#b497f7" />
                        {"\r\n                    "}
                        <circle cx="2.6" cy="8" r="2.1" fill="#b497f7" />
                        {"\r\n                    "}
                        <circle cx="35.4" cy="8" r="2.1" fill="#b497f7" />
                        {"\r\n                  "}
                      </svg>
                      {"\r\n                "}
                    </div>
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </Fragment>
              ))}
              {"\r\n            "}
              <div style={css(v.calloutStyle)}>
                {"\r\n              "}
                <div style={css(v.calloutInner)}>
                  {"\r\n                "}
                  <span style={css(v.calloutNameStyle)}>
                    {interp(v.calloutText)}
                  </span>
                  {"\r\n                "}
                  <span style={css(v.calloutAmtStyle)}>
                    {interp(v.calloutAmount)}
                  </span>
                  {"\r\n              "}
                </div>
                {"\r\n            "}
              </div>
              {"\r\n\r\n            "}
              <div style={css(v.confettiLayer)}>
                {"\r\n              "}
                {asArray(v.confetti).map((c: any, $index: number) => (
                  <Fragment key={$index}>
                    {"\r\n                "}
                    <div style={css(c?.wrap)}>
                      <span style={css(c?.inner)} />
                    </div>
                    {"\r\n              "}
                  </Fragment>
                ))}
                {"\r\n            "}
              </div>
              {"\r\n\r\n            "}
              {/*
                 "nobody else is here yet" — inside the play area, so it sits on
                 the felt and scales with it. Last in the stack and above the
                 board, but below the reconnect scrim: a dropped socket is the
                 more urgent thing to say, and both can be true at once.
              */}
              {"\r\n            "}
              {v.waitOn ? <WaitingForOthers v={v} /> : null}
              {"\r\n          "}
            </div>
            {"\r\n\r\n          "}
            {/*
               reconnect scrim, over the whole felt and at true size. Doubles as
               the session-expired prompt: an expired token cannot be retried, so
               there the scanning bar and the "nothing is lost" reassurance both
               go, and the button signs in rather than resuming.
            */}
            {"\r\n          "}
            <div style={css(v.reconnectStyle)}>
              {"\r\n            "}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
                {"\r\n              "}
                <div style={{ fontWeight: "500", letterSpacing: "-.02em", fontSize: "24px", color: "#e8ecf8" }}>
                  {interp(v.reconnTitle)}
                </div>
                {"\r\n              "}
                <div style={css(v.reconnBarStyle)}>
                  {"\r\n                "}
                  <div style={{ position: "absolute", inset: "0", width: "32%", borderRadius: "999px", background: "#8b5cf6", animation: "scan 1.1s ease-in-out infinite" }} />
                  {"\r\n              "}
                </div>
                {"\r\n              "}
                <div style={{ fontSize: "11px", color: "#94a3c4" }}>
                  {interp(v.reconnNote)}
                </div>
                {"\r\n              "}
                <button className="pill-flat" onClick={v.restore} style={{ padding: "9px 20px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.28)", fontSize: "12px", color: "#e8ecf8", background: "transparent" }}>
                  {interp(v.reconnBtn)}
                </button>
                {"\r\n            "}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n\r\n          "}
            {/*
               Furniture corner: the volume disc and the hotkey disc, one quiet
               column clear of the felt's edge, at true size.
            */}
            {"\r\n          "}
            <div style={css(v.volWrap)}>
              {"\r\n            "}
              <div style={css(v.sndMeterStyle)}>
                {"\r\n              "}
                <div style={css(v.sndMeterFill)} />
                {"\r\n              "}
                <div style={css(v.sndMeterMark)}>
                  {interp(v.volPct)}
                </div>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <button onPointerDown={v.volDown} onPointerMove={v.volMove} onPointerUp={v.volUp} onPointerCancel={v.volUp} title="Click to mute · hold and drag up or down for volume" style={css(v.sndBtnStyle)}>
                {"\r\n              "}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" style={css(v.sndGlyphStyle)}>
                  {"\r\n                "}
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  {"\r\n                "}
                  <path style={css(v.sndWave1)} d="M15.5 8.5a5 5 0 0 1 0 7" />
                  {"\r\n                "}
                  <path style={css(v.sndWave2)} d="M19 4.9a10 10 0 0 1 0 14.2" />
                  {"\r\n                "}
                  <line style={css(v.sndMute1)} x1="16.5" y1="9.5" x2="21.5" y2="14.5" />
                  {"\r\n                "}
                  <line style={css(v.sndMute2)} x1="21.5" y1="9.5" x2="16.5" y2="14.5" />
                  {"\r\n              "}
                </svg>
                {"\r\n            "}
              </button>
              {"\r\n            "}
              <button onClick={v.toggleHotkeys} title={v.hotkeysTitle} style={css(v.hotkeysStyle)}>
                {"\r\n              "}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {"\r\n                "}
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  {"\r\n                "}
                  <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" />
                  {"\r\n                "}
                  <line style={css(v.hotkeysStrike)} x1="4" y1="20" x2="20" y2="4" />
                  {"\r\n              "}
                </svg>
                {"\r\n            "}
              </button>
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n\r\n        "}
          {/*
             action bar: one row that never appears or disappears, so the felt
             above it never moves. Out of turn the same three buttons become
             the pre-actions — fold arms check/fold, call arms call any — which
             is what every desktop client does with this row, and the reason it
             can be permanent without being dead weight.
          */}
          {"\r\n        "}
          <div style={css(v.actionBar)}>
            {"\r\n          "}
            <div style={css(v.heroControls)}>
              {"\r\n            "}
              {/*
                 The hotkey is underlined in the word itself rather than
                 trailed after it. Where the label does not start with its key
                 — "bet" on the r key — the letter is shown separately, so the
                 underline never points at the wrong character.
              */}
              {"\r\n            "}
              {/* Two groups that are `display:contents` — one row, as ever —
                  except on a phone's side, where they become the two clusters
                  over the felt's bottom corners (see `decisionGroup`). */}
              <div style={css(v.decisionGroup)}>
              <button className="pill scpb scp6" onClick={v.doFold} style={css(v.foldStyle)}>
                <span style={css(v.foldDotStyle)} />
                <span style={css(v.foldKeyStyle)}>
                  {interp(v.foldKey)}
                </span>
                {interp(v.foldRest)}
              </button>
              {"\r\n            "}
              <button className="pill scpc scp6" onClick={v.doCheckCall} style={css(v.callStyle)}>
                <span style={css(v.callDotStyle)} />
                <span style={css(v.callKeyStyle)}>{"C"}</span>
                {interp(v.callRest)}
              </button>
              {"\r\n            "}
              <button className="pill pill-ink scpd scpe" onClick={v.doRaise} style={css(v.raiseStyle)}>
                <span style={css(v.raiseKeyStyle)}>{"R"}</span>
                {interp(v.raiseRest)}
              </button>
              </div>
              <div style={css(v.sizingGroup)}>
              {"\r\n            "}
              {/*
                 Slider carrying its floor, current size in big blinds, and
                 ceiling — the numbers stay a scale, the buttons stay actions.
              */}
              {"\r\n            "}
              <div style={css(v.betBlockStyle)}>
                {"\r\n              "}
                <div className="fader" draggable="false" onPointerDown={v.betDown} onPointerMove={v.betMove} onPointerUp={v.betUp} onPointerCancel={v.betUp} style={css(v.betFaderStyle)}>
                  {"\r\n                "}
                  <div style={css(v.betTrackStyle)} />
                  {"\r\n                "}
                  <div style={css(v.betFill)} />
                  {"\r\n                "}
                  <div style={css(v.betThumb)} />
                  {"\r\n              "}
                </div>
                {"\r\n              "}
                {/*
                   nowrap throughout: squeezed, the scale should compress or clip
                   its middle figure, never fold each label into a column.
                */}
                {"\r\n              "}
                <div style={css(v.betScaleStyle)}>
                  {"\r\n                "}
                  <span style={css(v.betEndStyle)}>
                    {interp(v.betMinLabel)}
                  </span>
                  <span style={css(v.betReadoutStyle)}>
                    {interp(v.betBBLabel)}
                  </span>
                  <span style={css(v.betEndStyle)}>
                    {interp(v.betMaxLabel)}
                  </span>
                  {"\r\n              "}
                </div>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              {/*
                 Compact presets: label stacked so each is a narrow pill rather
                 than a word-wide one, which is what let the row overflow a
                 minimised tab. All move the slider; the amount is always seen
                 before it is committed.
              */}
              {"\r\n            "}
              <button className="pill scpf scp8" onClick={v.sizeMin} style={css(v.sizeStyle)}>
                <span>{"Min"}</span>
              </button>
              {"\r\n            "}
              {/*
                 Four slots, not four fixed sizes: postflop they are fractions
                 of the pot, preflop they are big-blind opens. Four either way,
                 so the row is the same width on every street and never reflows
                 at the flop.
              */}
              {"\r\n            "}
              <button className="pill scpf scp8" onClick={v.sizeA} style={css(v.sizeAStyle)}>
                <span>
                  {interp(v.sizeALabel)}
                </span>
                <span style={css(v.sizeSubStyle)}>
                  {interp(v.sizeASub)}
                </span>
              </button>
              {"\r\n            "}
              <button className="pill scpf scp8" onClick={v.sizeB} style={css(v.sizeBStyle)}>
                <span>
                  {interp(v.sizeBLabel)}
                </span>
                <span style={css(v.sizeSubStyle)}>
                  {interp(v.sizeBSub)}
                </span>
              </button>
              {"\r\n            "}
              <button className="pill scpf scp8" onClick={v.sizeC} style={css(v.sizeCStyle)}>
                <span>
                  {interp(v.sizeCLabel)}
                </span>
                <span style={css(v.sizeSubStyle)}>
                  {interp(v.sizeCSub)}
                </span>
              </button>
              {"\r\n            "}
              <button className="pill scpf scp8" onClick={v.sizeD} style={css(v.sizeDStyle)}>
                <span>
                  {interp(v.sizeDLabel)}
                </span>
                <span style={css(v.sizeSubStyle)}>
                  {interp(v.sizeDSub)}
                </span>
              </button>
              {"\r\n            "}
              <button className="pill scpf scp8" onClick={v.sizeAllIn} style={css(v.sizeAllInStyle)}>
                <span>{"All"}</span>
                <span style={css(v.sizeSubStyle)}>{"In"}</span>
              </button>
              </div>
              {"\r\n          "}
            </div>
            {"\r\n\r\n          "}
            <div style={css(v.specControls)}>
              {"\r\n            "}
              <span style={{ fontSize: "11px", color: "#94a3c4" }}>
                {interp(v.specNote)}
              </span>
              {"\r\n            "}
              <button className="pill-flat" onClick={v.sitHere} style={{ flex: "0 0 auto", padding: "11px 20px", borderRadius: "5px", background: "linear-gradient(180deg,#8b5cf6,#6d3fd4)", border: "1px solid rgba(255,255,255,0.165)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.27),0 1px 3px rgba(0,0,0,0.35)", color: "#f6f3ff", fontSize: "13px", fontWeight: "500", whiteSpace: "nowrap" }}>
                {"Take this seat"}
              </button>
              {"\r\n          "}
            </div>
            {"\r\n\r\n          "}
            {/*
               Busted and watching: the funding modal was dismissed, so the row
               carries only a pill that brings it back — never a half-built form
               in a hand the hero has no chips for.
            */}
            {"\r\n          "}
            <div style={css(v.rebuyBarStyle)}>
              {"\r\n            "}
              <button className="pill-flat" onClick={v.rebuyReopen} style={{ flex: "0 0 auto", padding: "11px 22px", borderRadius: "5px", background: "linear-gradient(180deg,#8b5cf6,#6d3fd4)", border: "1px solid rgba(255,255,255,0.165)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.27),0 1px 3px rgba(0,0,0,0.35)", color: "#f6f3ff", fontSize: "13px", fontWeight: "500", whiteSpace: "nowrap" }}>
                {interp(v.rebuyPillLabel)}
              </button>
              {"\r\n            "}
              <span style={{ fontSize: "11px", color: "#94a3c4", whiteSpace: "nowrap" }}>{"Out of chips"}</span>
              {"\r\n          "}
            </div>
            {"\r\n\r\n        "}
          </div>
          {"\r\n      "}
        </div>
        {"\r\n\r\n      "}
        {/*
           Reopen the rail. Lives outside it because the rail's own toggle
           slides away with it. The arrow points inward — pull the log back.
        */}
        {"\r\n      "}
        <button onClick={v.toggleRail} style={css(v.railShowTab)}>
          {"\r\n        "}
          <svg width="9" height="12" viewBox="0 0 72 100" style={{ display: "block" }}>
            <polygon points="36,0 36,100 0,50" style={{ fill: "#222b44" }} />
          </svg>
          {"\r\n        "}
          <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: "10px", letterSpacing: ".18em", color: "#94a3c4" }}>
            {"LOG"}
          </span>
          {"\r\n      "}
        </button>
        {"\r\n\r\n      "}
        {/*
           terminal rail. Right-anchored on the felt: no fill, a hairline left
           border, light ink. It glides in and out — the outer collapses its
           width while an inner pinned to 320px clips, so the content slides off
           the edge cleanly.
        */}
        {"\r\n      "}
        {/* Behind the rail when it is a drawer (the upright table); inert otherwise. */}
        <div style={css(v.railScrim)} onClick={v.toggleRail} aria-hidden="true" />
        <div style={css(v.railStyle)}>
          {"\r\n       "}
          <div style={css(v.railInner)}>
            {"\r\n        "}
            <div className="tb-railhead">
              <span style={css(v.connDotStyle)} />
              <div className="tb-railname">
                <span>{interp(v.tableName)}</span>
                <small>{interp(v.tableStakes)}</small>
              </div>
              {/* The table menu (it replaces the nav bar here) and collapse sit
                  beside the name; the seat actions get their own row below, so
                  nothing has to squeeze the name to fit. */}
              <div className="tb-railbtns">
                <button className="tb-icon" onClick={openTableMenu} aria-label="Menu" title="Menu">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" }} />
                  </svg>
                </button>
                <button className="tb-icon" onClick={v.toggleRail} aria-label={v.railToggleLabel + " panel"} title={v.railToggleLabel + " panel"}>
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M3.5 3l4 4-4 4M7.5 3l4 4-4 4" style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }} />
                  </svg>
                </button>
              </div>
              <div className="tb-railacts">
                <button className="pill-flat tb-btn" onClick={v.sitUp} style={css(v.sitUpStyle)}>
                  {interp(v.sitUpLabel)}
                </button>
                <button className="pill-flat tb-btn" onClick={v.leaveTable} style={css(v.leaveStyle)}>{interp(v.leaveLabel)}</button>
              </div>
              {"\r\n        "}
            </div>
            {"\r\n        "}
            <div style={{ position: "relative", display: "flex", gap: "20px", padding: "0 18px 10px", fontSize: "12px", borderBottom: "1px solid rgba(232,236,248,0.14)" }}>
              {"\r\n          "}
              <button onClick={v.railLog} data-a={v.railALog} style={css(v.railTabLog)}>{"Log"}</button>
              {"\r\n          "}
              <button onClick={v.railChat} data-a={v.railAChat} style={css(v.railTabChat)}>
                {"Chat"}
                <span style={css(v.chatDotStyle)} />
              </button>
              {"\r\n          "}
              <span ref={v.slideBarRef} style={{ position: "absolute", bottom: "-1px", left: "0", height: "2px", background: "#8b5cf6", boxShadow: "0 0 10px 0 rgba(139,92,246,0.7)", transition: "transform .22s cubic-bezier(.2,.9,.24,1),width .22s cubic-bezier(.2,.9,.24,1)", pointerEvents: "none" }} />
              {"\r\n        "}
            </div>
            {"\r\n\r\n        "}
            <div style={css(v.railBody)}>
              {"\r\n          "}
              {v.railIsLog ? (
                <>
                  {"\r\n            "}
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", padding: "12px 18px" }}>
                    {"\r\n              "}
                    {asArray(v.logLines).map((l: any, $index: number) => (
                      <Fragment key={$index}>
                        {"\r\n                "}
                        <div style={css(l?.style)}>
                          {/* MUTED at full strength. At 0.5 alpha the timestamp
                              read 2.69:1 — the hand log is the record you go
                              back to when a hand is in dispute. */}
                          <span style={{ color: "#94a3c4", marginRight: "8px" }}>
                            {interp(l?.at)}
                          </span>
                          {interp(l?.text)}
                        </div>
                        {"\r\n              "}
                      </Fragment>
                    ))}
                    {"\r\n            "}
                  </div>
                  {"\r\n          "}
                </>
              ) : null}
              {"\r\n          "}
              {v.railIsChat ? (
                <>
                  {"\r\n            "}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px 18px" }}>
                    {"\r\n              "}
                    <div style={css(v.chatEmptyStyle)}>{"Table talk stays at the table, say hi"}</div>
                    {"\r\n              "}
                    {asArray(v.chatLines).map((m: any, $index: number) => (
                      <Fragment key={$index}>
                        {"\r\n                "}
                        <div style={{ fontSize: "12px", lineHeight: "1.45", overflowWrap: "anywhere" }}>
                          {"\r\n                  "}
                          <span style={css(m?.whoStyle)}>
                            {interp(m?.name)}
                          </span>
                          {"\r\n                  "}
                          <span style={{ color: "#e8ecf8" }}>
                            {" "}
                            {interp(m?.text)}
                          </span>
                          {"\r\n                "}
                        </div>
                        {"\r\n              "}
                      </Fragment>
                    ))}
                    {"\r\n              "}
                    <div ref={v.chatEndRef} />
                    {"\r\n            "}
                  </div>
                  {"\r\n          "}
                </>
              ) : null}
              {"\r\n        "}
            </div>
            {"\r\n\r\n        "}
            {/*
               Pinned under the scroll, so the box to type in never scrolls away
               with the conversation it belongs to.
            */}
            {"\r\n        "}
            <div style={css(v.chatInputRow)}>
              {"\r\n          "}
              <input value={v.chatDraft ?? ''} onInput={v.chatInput} onKeyDown={v.chatKeyDown} placeholder="Say something" maxLength={240} style={{ flex: "1", minWidth: "0", border: "0", background: "transparent", outline: "none", fontFamily: "'Inter Tight',system-ui,sans-serif", fontSize: "12.5px", color: "#e8ecf8", caretColor: "#a78bfa" }} />
              {"\r\n          "}
              <button className="pill-flat" onClick={v.chatSend} style={css(v.chatSendStyle)}>{"SEND"}</button>
              {"\r\n        "}
            </div>
            {"\r\n       "}
          </div>
          {"\r\n      "}
        </div>
        {"\r\n    "}
      </div>
      {"\r\n  "}
    </>
  );
}
