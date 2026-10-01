/* The lobby screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { Fragment } from 'react';
import { interp, css, asArray } from '../dc-runtime';

export default function Lobby({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      <div className="su-page su-stage" style={{ flex: "1", paddingBottom: "clamp(24px,76px,52px)" }}>
        {"\r\n      "}
        {/*
           The hero and the pots beside it, on the staking page's system: a
           guilloché card carrying the one number that says whether there is a
           game, and a hairline panel of the pots that number produced.
        */}
        {"\r\n      "}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(12px,21px,18px)", alignItems: "stretch", paddingBottom: "clamp(20px,36px,30px)" }}>
          {"\r\n        "}
          <div style={{ flex: "1 1 520px", minWidth: "0", position: "relative", borderRadius: "12px", overflow: "hidden", background: "#0a0d16", border: "1px solid rgba(232,236,248,0.08)", display: "flex", flexDirection: "column" }}>
            {"\r\n          "}
            <div aria-hidden="true" style={css(v.heroTexStyle)} />
            {"\r\n          "}
            <div style={{ position: "absolute", inset: "0", pointerEvents: "none", background: "radial-gradient(70% 90% at 8% 20%, rgba(148,163,196,0.05), rgba(0,0,0,0.225) 100%)" }} />
            {"\r\n          "}
            <div style={{ position: "relative", padding: "clamp(22px,42px,34px)", display: "flex", flexDirection: "column", gap: "16px", flex: "1" }}>
              {"\r\n            "}
              {/*
                 People, not tables. Tables are spawned on demand, so a table
                 count describes our spawner rather than whether there is a game.
              */}
              {"\r\n            "}
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                {"\r\n              "}
                <span style={css(v.lobbyPipStyle)} />
                {"\r\n              "}
                <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>
                  {interp(v.lobbyEyebrow)}
                </span>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
                {"\r\n              "}
                <span style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "clamp(46px,97px,76px)", lineHeight: ".86", color: "#e8ecf8" }}>
                  {interp(v.lobbyBig)}
                </span>
                {"\r\n              "}
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(20px,33px,26px)", lineHeight: "1", color: "#94a3c4" }}>
                  {interp(v.lobbyBigUnit)}
                </span>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <span style={css(v.lobbyLineStyle)}>
                {interp(v.lobbyLine)}
              </span>
              {"\r\n            "}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", paddingTop: "4px" }}>
                {"\r\n              "}
                {asArray(v.lobbyFacts).map((f: any, $index: number) => (
                  <Fragment key={$index}>
                    {"\r\n                "}
                    <span style={{ flex: "1 1 130px", minWidth: "0", display: "flex", flexDirection: "column", gap: "3px", padding: "11px 13px", border: "1px solid rgba(232,236,248,0.12)", borderRadius: "8px", background: "rgba(0,0,0,0.175)" }}>
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
              {"\r\n            "}
              <div style={{ marginTop: "auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", paddingTop: "8px" }}>
                {"\r\n              "}
                {/*
                   The page's one filled action, and the only button here that
                   needs no decision made first: coming down from the highest
                   stake this bankroll can sit at, it takes the first one with a
                   game actually running and seats you at its busiest open
                   table. The seat screen it opens still names that stake before
                   any money moves. The rows below are the same door, one stake
                   at a time.
                */}
                {"\r\n              "}
                <button className="pill scp9 scp4" onClick={v.quickJoinGo} style={css(v.quickJoinStyle)}>{"quick join"}</button>
                {"\r\n              "}
                {/*
                   "create a room" alone never said what kind. Every room made
                   here is private: unlisted, reached by its link, gated by a
                   pin — so the button says so.
                */}
                {"\r\n              "}
                {/*
                   Creating a room needs a session: POST /api/rooms 401s without
                   a bearer. Offered signed out it took a room name, blinds,
                   buy-ins, seats and a pin, then threw the lot away. Signed
                   out, the connect button stands in the same slot.
                */}
                {"\r\n              "}
                {v.walletOn ? (
                  <>
                    {"\r\n                "}
                    <button className="pill scpa scp6" onClick={v.openCreateRoom} style={{ padding: "12px 20px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.28)", background: "linear-gradient(180deg,rgba(148,163,196,0.05),rgba(0,0,0,0.125))", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)", color: "#e8ecf8", fontSize: "14px", letterSpacing: ".01em" }}>
                      {"create a private room"}
                    </button>
                    {"\r\n              "}
                  </>
                ) : null}
                {"\r\n              "}
                {v.walletOff ? (
                  <>
                    {"\r\n                "}
                    <button className="pill scpa scp6" onClick={v.lobbyConnectGo} style={{ padding: "12px 20px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.28)", background: "linear-gradient(180deg,rgba(148,163,196,0.05),rgba(0,0,0,0.125))", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)", color: "#e8ecf8", fontSize: "14px", letterSpacing: ".01em" }}>
                      {"connect a wallet"}
                    </button>
                    {"\r\n              "}
                  </>
                ) : null}
                {"\r\n              "}
                <button className="pill scpa scp6" onClick={v.goTable} style={css(v.myTableStyle)}>{"my table"}</button>
                {"\r\n            "}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n        "}
          {/*
             The jackpot, not the biggest pots. Those are ranked at the foot of
             the leaderboard, and a second copy here said nothing the first one
             did not. This is the one thing on the lobby that is a reason to sit
             down NOW rather than later: it is time-boxed, and every player who
             wagers enough today is in it without doing anything. Free, too —
             /api/jackpot is already fetched on this screen.
          */}
          {"\r\n        "}
          <div style={{ flex: "1 1 280px", minWidth: "0", border: "1px solid rgba(232,236,248,0.12)", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {"\r\n          "}
            <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"TODAY'S JACKPOT"}</span>
            {"\r\n          "}
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", flexWrap: "wrap" }}>
              {"\r\n            "}
              <span style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "clamp(30px,51px,40px)", lineHeight: "1", color: "#e8ecf8" }}>
                {interp(v.lobbyJkPool)}
              </span>
              {"\r\n            "}
              <span style={{ fontSize: "10px", letterSpacing: ".2em", color: "#94a3c4" }}>{"USDG"}</span>
              {"\r\n          "}
            </div>
            {"\r\n          "}
            <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(232,236,248,0.1)" }}>
              {"\r\n            "}
              {asArray(v.lobbyJkRows).map((r: any, $index: number) => (
                <Fragment key={$index}>
                  {"\r\n              "}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "9px 0", borderBottom: "1px solid rgba(232,236,248,0.08)" }}>
                    {"\r\n                "}
                    <span style={{ fontSize: "12.5px", color: "#94a3c4" }}>
                      {interp(r?.k)}
                    </span>
                    {"\r\n                "}
                    <span style={css(`font-family:'Instrument Serif',serif;font-variant-numeric:tabular-nums;font-size:16px;color:${r?.tone ?? ''}`)}>
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
            <span style={{ fontSize: "12px", color: "#94a3c4", lineHeight: "1.55", paddingTop: "2px" }}>
              {interp(v.lobbyJkRule)}
            </span>
            {"\r\n          "}
            <button className="pill scpa scp6" onClick={v.lobbyJkGo} style={{ marginTop: "auto", padding: "10px 16px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.28)", background: "linear-gradient(180deg,rgba(148,163,196,0.05),rgba(0,0,0,0.125))", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)", color: "#e8ecf8", fontSize: "13px" }}>
              {"how the draw works"}
            </button>
            {"\r\n        "}
          </div>
          {"\r\n      "}
        </div>
        {"\r\n\r\n      "}
        {/*
           Every stake as a tile, and one way in. The grid states the ladder at
           a glance — what it costs, and whether anyone is there — and the
           button above it acts on whichever tile is lit.
                 
           A single "sit me down · <stake>" button lived at the foot of this
           page once and was removed on purpose: it acted on a stake selected
           at the top, so the thing you pressed and the thing it applied to sat
           at opposite ends of the screen. It is back because that is no longer
           true — it sits against the grid it acts on, and names the stake it
           will seat you at before you press it.
        */}
        {"\r\n      "}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "22px" }}>
          {"\r\n        "}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            {"\r\n          "}
            <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#a78bfa" }}>{"EVERY STAKE"}</span>
            {"\r\n          "}
            <span style={{ fontSize: "12.5px", color: "#94a3c4", fontVariantNumeric: "tabular-nums" }}>
              {interp(v.bankrollLine)}
            </span>
            {"\r\n        "}
          </div>
          {"\r\n        "}
          <button className={[v.joinStakeClass, "scp5 scp6"].filter(Boolean).join(' ')} onClick={v.joinStake}>
            {"\r\n          "}
            <span style={{ fontSize: "15px", color: "#e8ecf8" }}>
              {interp(v.joinStakeLabel)}
            </span>
            {"\r\n          "}
            <span style={{ fontFamily: "'Instrument Serif',serif", fontVariantNumeric: "tabular-nums", fontSize: "26px", lineHeight: "1.05", color: "#a78bfa" }}>
              {interp(v.joinStakeName)}
            </span>
            {"\r\n        "}
          </button>
          {"\r\n        "}
          <div className="su-stakes">
            {"\r\n          "}
            {asArray(v.stakeRows).map((s: any, $index: number) => (
              <Fragment key={$index}>
                {"\r\n            "}
                <button className={s?.cls} onClick={s?.pick} onDoubleClick={s?.join} aria-pressed={s?.on} title={s?.hint}>
                  {"\r\n              "}
                  <span style={css(`font-family:'Instrument Serif',serif;font-variant-numeric:tabular-nums;font-size:27px;line-height:1;color:${s?.nameTone ?? ''}`)}>
                    {interp(s?.blinds)}
                  </span>
                  {"\r\n              "}
                  <span style={css(`font-size:13px;font-variant-numeric:tabular-nums;color:${s?.buyTone ?? ''}`)}>
                    {interp(s?.buyIn)}
                  </span>
                  {"\r\n              "}
                  <span style={css(s?.playingStyle)}>
                    {interp(s?.players)}
                    <span className="su-stake-dot" />
                  </span>
                  {"\r\n            "}
                </button>
                {"\r\n          "}
              </Fragment>
            ))}
            {"\r\n        "}
          </div>
          {"\r\n      "}
        </div>
        {"\r\n\r\n      "}
        {/*
           The seat-assignment rationale used to sit here. A product that
           explains its own policy to the player invites an argument about it;
           the table list is the whole screen.
                 
           The single "sit me down · <stake>" button that used to close the page
           went with it: it acted on a stake you had selected by clicking a row,
           which meant the thing you pressed and the thing it applied to were at
           opposite ends of the screen. Each row now carries its own join.
        */}
        {"\r\n    "}
      </div>
      {"\r\n\r\n    "}
      {/*
         Create a room: a paper dialog over the lobby (rebuy-modal idiom). It
         flips from the form to a share-the-link view once the room exists.
      */}
      {"\r\n    "}
      {v.createRoomOn ? (
        <>
          {"\r\n      "}
          <div onClick={v.closeCreateRoom} style={{ position: "absolute", inset: "0", zIndex: "80", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "rgba(0,0,0,0.72)" }}>
            {"\r\n        "}
            <div onClick={v.crStop} style={{ width: "100%", maxWidth: "440px", padding: "28px", borderRadius: "12px", background: "#1a2238", color: "#e8ecf8", border: "1px solid rgba(232,236,248,0.154)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.21),0 24px 60px -20px rgba(0,0,0,0.72)", animation: "riseIn .32s cubic-bezier(.2,.9,.24,1) both" }}>
              {"\r\n\r\n          "}
              {v.crShowForm ? (
                <>
                  {"\r\n            "}
                  <div>
                    {"\r\n              "}
                    <h2 style={{ fontFamily: "'Inter Tight',system-ui,sans-serif", fontWeight: "600", letterSpacing: "-.03em", fontSize: "26px", margin: "0 0 3px" }}>
                      {"create a room"}
                    </h2>
                    {"\r\n              "}
                    <div style={{ fontSize: "12px", color: "#94a3c4", marginBottom: "20px" }}>
                      {"a private table — you share the link and the pin"}
                    </div>
                    {"\r\n\r\n              "}
                    <input value={v.crName ?? ''} onInput={v.crNameInput} placeholder="room name (optional)" maxLength={40} style={{ width: "100%", boxSizing: "border-box", padding: "11px 15px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.22)", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(232,236,248,0.176)", outline: "none", transition: "box-shadow .16s ease,border-color .16s ease", color: "#e8ecf8", font: "inherit", fontSize: "14px", caretColor: "#a78bfa", marginBottom: "16px" }} />
                    {"\r\n\r\n              "}
                    <div style={css(v.crFieldLabel)}>{"blinds — small / big ($)"}</div>
                    {"\r\n              "}
                    <div style={{ display: "flex", gap: "9px", marginBottom: "14px" }}>
                      {"\r\n                "}
                      <input value={v.crSb ?? ''} onInput={v.crSbInput} inputMode="decimal" placeholder="small blind" style={{ flex: "1", minWidth: "0", boxSizing: "border-box", padding: "11px 15px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.22)", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(232,236,248,0.176)", outline: "none", transition: "box-shadow .16s ease,border-color .16s ease", color: "#e8ecf8", font: "inherit", fontSize: "14px", caretColor: "#a78bfa" }} />
                      {"\r\n                "}
                      <input value={v.crBb ?? ''} onInput={v.crBbInput} inputMode="decimal" placeholder="big blind" style={{ flex: "1", minWidth: "0", boxSizing: "border-box", padding: "11px 15px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.22)", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(232,236,248,0.176)", outline: "none", transition: "box-shadow .16s ease,border-color .16s ease", color: "#e8ecf8", font: "inherit", fontSize: "14px", caretColor: "#a78bfa" }} />
                      {"\r\n              "}
                    </div>
                    {"\r\n\r\n              "}
                    <div style={css(v.crFieldLabel)}>{"buy-in — min / max ($)"}</div>
                    {"\r\n              "}
                    <div style={{ display: "flex", gap: "9px", marginBottom: "14px" }}>
                      {"\r\n                "}
                      <input value={v.crMin ?? ''} onInput={v.crMinInput} inputMode="decimal" placeholder="minimum" style={{ flex: "1", minWidth: "0", boxSizing: "border-box", padding: "11px 15px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.22)", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(232,236,248,0.176)", outline: "none", transition: "box-shadow .16s ease,border-color .16s ease", color: "#e8ecf8", font: "inherit", fontSize: "14px", caretColor: "#a78bfa" }} />
                      {"\r\n                "}
                      <input value={v.crMax ?? ''} onInput={v.crMaxInput} inputMode="decimal" placeholder="maximum" style={{ flex: "1", minWidth: "0", boxSizing: "border-box", padding: "11px 15px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.22)", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(232,236,248,0.176)", outline: "none", transition: "box-shadow .16s ease,border-color .16s ease", color: "#e8ecf8", font: "inherit", fontSize: "14px", caretColor: "#a78bfa" }} />
                      {"\r\n              "}
                    </div>
                    {"\r\n\r\n              "}
                    <div style={{ display: "flex", gap: "9px" }}>
                      {"\r\n                "}
                      <div style={{ flex: "1", minWidth: "0" }}>
                        {"\r\n                  "}
                        <div style={css(v.crFieldLabel)}>{"seats (2–6)"}</div>
                        {"\r\n                  "}
                        <input value={v.crSeats ?? ''} onInput={v.crSeatsInput} inputMode="numeric" placeholder="6" style={{ width: "100%", boxSizing: "border-box", padding: "11px 15px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.22)", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(232,236,248,0.176)", outline: "none", transition: "box-shadow .16s ease,border-color .16s ease", color: "#e8ecf8", font: "inherit", fontSize: "14px", caretColor: "#a78bfa" }} />
                        {"\r\n                "}
                      </div>
                      {"\r\n                "}
                      <div style={{ flex: "1", minWidth: "0" }}>
                        {"\r\n                  "}
                        <div style={css(v.crFieldLabel)}>{"4-digit pin"}</div>
                        {"\r\n                  "}
                        <input value={v.crPin ?? ''} onInput={v.crPinInput} inputMode="numeric" maxLength={4} placeholder="0000" style={{ width: "100%", boxSizing: "border-box", padding: "11px 15px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.22)", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(232,236,248,0.176)", outline: "none", transition: "box-shadow .16s ease,border-color .16s ease", color: "#e8ecf8", font: "inherit", fontSize: "14px", letterSpacing: ".3em", caretColor: "#a78bfa" }} />
                        {"\r\n                "}
                      </div>
                      {"\r\n              "}
                    </div>
                    {"\r\n\r\n              "}
                    <div style={css(v.crMsgStyle)}>
                      {interp(v.crMsg)}
                    </div>
                    {"\r\n\r\n              "}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "14px" }}>
                      {"\r\n                "}
                      <button onClick={v.closeCreateRoom} style={{ fontSize: "13px", color: "#94a3c4", background: "transparent", padding: "13px 8px" }}>
                        {"cancel"}
                      </button>
                      {"\r\n                "}
                      <button className="pill-flat" onClick={v.createRoom} style={{ flex: "1", padding: "14px", borderRadius: "5px", background: "linear-gradient(180deg,#222c47,#0d1220)", color: "#e8ecf8", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12),0 2px 4px rgba(0,0,0,0.35)", fontSize: "14px", fontWeight: "500" }}>
                        {interp(v.crCreateLabel)}
                      </button>
                      {"\r\n              "}
                    </div>
                    {"\r\n            "}
                  </div>
                  {"\r\n          "}
                </>
              ) : null}
              {"\r\n\r\n          "}
              {v.crShowShare ? (
                <>
                  {"\r\n            "}
                  <div>
                    {"\r\n              "}
                    <h2 style={{ fontFamily: "'Inter Tight',system-ui,sans-serif", fontWeight: "600", letterSpacing: "-.03em", fontSize: "26px", margin: "0 0 3px" }}>
                      {"room ready"}
                    </h2>
                    {"\r\n              "}
                    <div style={{ fontSize: "12px", color: "#94a3c4", marginBottom: "20px" }}>
                      {"send both to whoever you're playing with"}
                    </div>
                    {"\r\n\r\n              "}
                    <div style={{ padding: "16px", borderRadius: "8px", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(10,13,22,0.1)", marginBottom: "12px" }}>
                      {"\r\n                "}
                      <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "#94a3c4", marginBottom: "6px" }}>{"LINK"}</div>
                      {"\r\n                "}
                      <div style={{ fontSize: "14px", color: "#e8ecf8", wordBreak: "break-all", fontVariantNumeric: "tabular-nums" }}>
                        {interp(v.crShareUrl)}
                      </div>
                      {"\r\n              "}
                    </div>
                    {"\r\n              "}
                    <div style={{ padding: "16px", borderRadius: "8px", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(10,13,22,0.1)", marginBottom: "16px" }}>
                      {"\r\n                "}
                      <div style={{ fontSize: "10px", letterSpacing: ".16em", color: "#94a3c4", marginBottom: "6px" }}>{"PIN"}</div>
                      {"\r\n                "}
                      <div style={{ fontSize: "22px", letterSpacing: ".32em", color: "#e8ecf8", fontVariantNumeric: "tabular-nums" }}>
                        {interp(v.crSharePin)}
                      </div>
                      {"\r\n              "}
                    </div>
                    {"\r\n\r\n              "}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {"\r\n                "}
                      <button className="pill-flat" onClick={v.copyRoomLink} style={{ flex: "none", padding: "14px 20px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.198)", background: "transparent", color: "#e8ecf8", fontSize: "14px" }}>
                        {interp(v.crCopyLabel)}
                      </button>
                      {"\r\n                "}
                      <button className="pill-flat" onClick={v.enterCreatedRoom} style={{ flex: "1", padding: "14px", borderRadius: "5px", background: "linear-gradient(180deg,#222c47,#0d1220)", color: "#e8ecf8", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12),0 2px 4px rgba(0,0,0,0.35)", fontSize: "14px", fontWeight: "500" }}>
                        {"take your seat"}
                      </button>
                      {"\r\n              "}
                    </div>
                    {"\r\n            "}
                  </div>
                  {"\r\n          "}
                </>
              ) : null}
              {"\r\n\r\n        "}
            </div>
            {"\r\n      "}
          </div>
          {"\r\n    "}
        </>
      ) : null}
      {"\r\n  "}
    </>
  );
}
