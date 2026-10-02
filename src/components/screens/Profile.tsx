/* The profile screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { Fragment } from 'react';
import { interp, css, asArray } from '../dc-runtime';

export default function Profile({ v }: { v: any }) {
  /* A reload: the session is there, the identity behind it is still being
     read. The header's own shape, pulsing, so the page does not jump when the
     real one lands — and a way out if the read never comes back. */
  if (v.profilePending) {
    const bar = (w: string, h: string) => ({ width: w, height: h, borderRadius: "6px", background: "rgba(232,236,248,0.10)" });
    return (
      <div className="su-page su-stage" aria-busy="true" style={{ flex: "1", paddingBottom: "clamp(24px,76px,52px)", display: "flex", flexDirection: "column", gap: "clamp(28px,60px,44px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px", paddingBottom: "26px", borderBottom: "1px solid rgba(232,236,248,0.16)", animation: v.profileRetryOn ? "none" : "suPulse 1.4s ease-in-out infinite" }}>
          <div style={{ flex: "none", width: "72px", height: "72px", borderRadius: "50%", background: "rgba(232,236,248,0.10)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: "0" }}>
            <div style={bar("220px", "30px")} />
            <div style={bar("140px", "11px")} />
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px", fontSize: "13px", color: "#94a3c4" }}>
          {interp(v.profilePendingNote)}
          {v.profileRetryOn ? (
            <button className="pill-flat" onClick={v.profileRetry} style={{ padding: "8px 18px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.28)", fontSize: "12px", color: "#e8ecf8" }}>
              {"Try again"}
            </button>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <>
      {"\r\n    "}
      <div className="su-page su-stage" style={{ flex: "1", paddingBottom: "clamp(24px,76px,52px)", display: "flex", flexDirection: "column", gap: "clamp(28px,60px,44px)" }}>
        {"\r\n\r\n      "}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "48px", paddingBottom: "26px", borderBottom: "1px solid rgba(232,236,248,0.16)" }}>
          {"\r\n        "}
          <div style={{ display: "flex", alignItems: "center", gap: "24px", minWidth: "0" }}>
            {"\r\n          "}
            {/*
               The face is the picker. Eight avatars laid out permanently took a
               whole column of this page to make a choice most players make once
               — so they live behind the thing they change.
            */}
            {"\r\n          "}
            <div style={{ position: "relative", flex: "none" }}>
              {"\r\n            "}
              <button onClick={v.avatarMenuToggle} title="Change avatar" style={css(v.avatarDiscStyle)}>
                {"\r\n              "}
                <span className="av" data-tier={v.heroTier} style={{ width: "100%", height: "100%" }}>
                  <span style={css(v.heroAvInner)} />
                </span>
                {"\r\n              "}
                <span style={css(v.avatarCaretStyle)}>
                  {"\r\n                "}
                  <svg width="9" height="6" viewBox="0 0 8 5">
                    <polygon points="0,0 8,0 4,5" style={{ fill: "#8b5cf6" }} />
                  </svg>
                  {"\r\n              "}
                </span>
                {"\r\n            "}
              </button>
              {"\r\n            "}
              <div style={css(v.avatarMenuStyle)}>
                {"\r\n              "}
                <div style={{ padding: "14px 16px 10px", fontSize: "10px", letterSpacing: ".2em" }}>
                  {"\r\n                "}
                  <span style={{ color: "#a78bfa" }}>{"AVATAR"}</span>
                  {"\r\n              "}
                </div>
                {"\r\n              "}
                {/*
                   342 = 5 discs of 54 + four 10px gaps + the padding. Three
                   shelves, each under a full-width label that breaks the
                   flex-wrap row: the free portraits, the prestige set (its tag
                   is the level that unlocks it), then what was earned at the
                   table. 14px between rows leaves the tag room to hang.
                */}
                {"\r\n              "}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 10px", padding: "0 16px 18px", width: "342px", maxHeight: "344px", overflowY: "auto", boxSizing: "border-box" }}>
                  {([
                    ["PORTRAITS", "", v.avatarsFree],
                    ["PRESTIGE", v.avatarsPrestigeNote, v.avatarsPrestige],
                    ["EARNED", "", v.avatarsEarned],
                  ] as [string, string, any][]).map(([label, note, cells]) => (
                    <Fragment key={label}>
                      <div style={css(v.avatarGroupLabel)}>
                        <span>{label}</span>
                        <span style={{ color: "#94a3c4" }}>{interp(note)}</span>
                      </div>
                      {asArray(cells).map((a: any, $index: number) => (
                        <button key={$index} onClick={a?.pick} title={a?.title} style={css(a?.style)}>
                          <span className="av" data-tier={a?.tier} style={css(a?.discStyle)}>
                            <span style={css(a?.inner)} />
                          </span>
                          <span style={css(a?.badgeStyle)}>{interp(a?.badge)}</span>
                        </button>
                      ))}
                    </Fragment>
                  ))}
                </div>
                {"\r\n            "}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n          "}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "0" }}>
              {"\r\n            "}
              {/*
                 Your own name, so it says it can be changed. The pencil appears
                 on hover rather than sitting there permanently: it is an
                 affordance, not a button worth reserving space for.
              */}
              {"\r\n            "}
              <div onMouseEnter={v.nickHoverOn} onMouseLeave={v.nickHoverOff} style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "0" }}>
                {"\r\n              "}
                {v.nickIdle ? (
                  <>
                    {"\r\n                "}
                    <button onClick={v.nickEdit} title="Change your nickname" style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "0", textAlign: "left" }}>
                      {"\r\n                  "}
                      <span style={{ fontSize: "clamp(22px,51px,34px)", letterSpacing: ".02em", color: "#e8ecf8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {interp(v.displayName)}
                      </span>
                      {"\r\n                  "}
                      <svg style={css(v.nickPencilStyle)} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {"\r\n                    "}
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        {"\r\n                  "}
                      </svg>
                      {"\r\n                "}
                    </button>
                    {"\r\n              "}
                  </>
                ) : null}
                {"\r\n              "}
                {v.nickEditing ? (
                  <>
                    {"\r\n                "}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", minWidth: "0" }}>
                      {"\r\n                  "}
                      <input value={v.nickDraft ?? ''} onInput={v.nickInput} onKeyDown={v.nickKey} ref={v.nickRef} placeholder="Pick a handle" maxLength={16} style={{ flex: "0 1 260px", minWidth: "0", border: "0", borderBottom: "1.5px solid rgba(139,92,246,0.6)", padding: "2px 0 6px", background: "transparent", fontSize: "clamp(20px,45px,30px)", letterSpacing: ".02em", color: "#e8ecf8", caretColor: "#a78bfa" }} />
                      {"\r\n                  "}
                      <button onClick={v.nickSave} style={{ fontSize: "11px", letterSpacing: ".16em", color: "#a78bfa" }}>{"SAVE"}</button>
                      {"\r\n                  "}
                      <button onClick={v.nickCancel} style={{ fontSize: "11px", letterSpacing: ".16em", color: "#94a3c4" }}>
                        {"CANCEL"}
                      </button>
                      {"\r\n                "}
                    </div>
                    {"\r\n              "}
                  </>
                ) : null}
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px", fontSize: "11px", letterSpacing: ".22em", color: "#94a3c4" }}>
                {"\r\n              "}
                <span>
                  {"LEVEL "}
                  {interp(v.xpLevel)}
                  {" · "}
                  {interp(v.xpTitleCaps)}
                </span>
                <span style={{ opacity: ".4" }}>{"·"}</span>
                <span>
                  {interp(v.rbRateCaps)}
                </span>
                {"\r\n              "}
                <span style={css(v.nickMsgStyle)}>
                  {interp(v.nickMsg)}
                </span>
                {"\r\n            "}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n\r\n        "}
          {/*
             The header's open right side, earning its keep: the player's rarest
             earned avatars, click-to-expand into the full catalog (easiest→
             hardest). Nothing earned yet? It teases the easiest ones still
             locked — so the space always says what there is to chase.
          */}
          {"\r\n        "}
          <div style={{ position: "relative", flex: "none" }}>
            {"\r\n          "}
            <button onClick={v.achMenuToggle} title="See all achievements" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "9px", cursor: "pointer", background: "none", border: "0", padding: "0" }}>
              {"\r\n            "}
              <span style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "10px", letterSpacing: ".24em", color: "#a78bfa" }}>
                {"\r\n              "}
                {interp(v.achShowcaseLabel)}
                {"\r\n              "}
                <span style={css(v.achCaretStyle)}>
                  <svg width="9" height="6" viewBox="0 0 8 5">
                    <polygon points="0,0 8,0 4,5" style={{ fill: "#8b5cf6" }} />
                  </svg>
                </span>
                {"\r\n            "}
              </span>
              {"\r\n            "}
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {"\r\n              "}
                {asArray(v.showcaseAch).map((a: any, $index: number) => (
                  <Fragment key={$index}>
                    {"\r\n                "}
                    <span className="av" title={a?.title} data-tier={a?.tier} style={css(a?.wrap)}>
                      <span style={css(a?.inner)} />
                    </span>
                    {"\r\n              "}
                  </Fragment>
                ))}
                {"\r\n            "}
              </span>
              {"\r\n          "}
            </button>
            {"\r\n          "}
            <div onClick={v.achMenuStop} style={css(v.achMenuStyle)}>
              {"\r\n            "}
              <div style={{ padding: "14px 18px 10px", fontSize: "10px", letterSpacing: ".2em", color: "#a78bfa" }}>
                {"ACHIEVEMENTS"}
              </div>
              {"\r\n            "}
              {/*
                 Grouped by set (a full-width label breaks the flex-wrap row), and
                 ordered easiest→hardest within each set. Four flat sc-for blocks
                 rather than a nested loop, which this runtime has never had to do.
              */}
              {"\r\n            "}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", padding: "0 18px 18px", width: "344px", maxHeight: "344px", overflowY: "auto", boxSizing: "border-box" }}>
                {"\r\n              "}
                <div style={css(v.achGroupLabel)}>{"LEVELS"}</div>
                {"\r\n              "}
                {asArray(v.achLevels).map((a: any, $index: number) => (
                  <Fragment key={$index}>
                    {"\r\n                "}
                    <div title={a?.title} style={css(a?.wrap)}>
                      {"\r\n                  "}
                      <span className="av" data-tier={a?.tier} style={{ width: "60px", height: "60px" }}>
                        <span style={css(a?.inner)} />
                      </span>
                      {"\r\n                  "}
                      <span style={{ fontSize: "10px", letterSpacing: ".05em", color: "#5b6684", textAlign: "center" }}>
                        {interp(a?.name)}
                      </span>
                      {"\r\n                  "}
                      <span style={{ fontSize: "9px", lineHeight: "1.3", color: "#94a3c4", textAlign: "center" }}>
                        {interp(a?.tell)}
                      </span>
                      {"\r\n                "}
                    </div>
                    {"\r\n              "}
                  </Fragment>
                ))}
                {"\r\n              "}
                <div style={css(v.achGroupLabel)}>{"POTS"}</div>
                {"\r\n              "}
                {asArray(v.achPots).map((a: any, $index: number) => (
                  <Fragment key={$index}>
                    {"\r\n                "}
                    <div title={a?.title} style={css(a?.wrap)}>
                      {"\r\n                  "}
                      <span className="av" data-tier={a?.tier} style={{ width: "60px", height: "60px" }}>
                        <span style={css(a?.inner)} />
                      </span>
                      {"\r\n                  "}
                      <span style={{ fontSize: "10px", letterSpacing: ".05em", color: "#5b6684", textAlign: "center" }}>
                        {interp(a?.name)}
                      </span>
                      {"\r\n                  "}
                      <span style={{ fontSize: "9px", lineHeight: "1.3", color: "#94a3c4", textAlign: "center" }}>
                        {interp(a?.tell)}
                      </span>
                      {"\r\n                "}
                    </div>
                    {"\r\n              "}
                  </Fragment>
                ))}
                {"\r\n              "}
                <div style={css(v.achGroupLabel)}>{"HANDS"}</div>
                {"\r\n              "}
                {asArray(v.achHands).map((a: any, $index: number) => (
                  <Fragment key={$index}>
                    {"\r\n                "}
                    <div title={a?.title} style={css(a?.wrap)}>
                      {"\r\n                  "}
                      <span className="av" data-tier={a?.tier} style={{ width: "60px", height: "60px" }}>
                        <span style={css(a?.inner)} />
                      </span>
                      {"\r\n                  "}
                      <span style={{ fontSize: "10px", letterSpacing: ".05em", color: "#5b6684", textAlign: "center" }}>
                        {interp(a?.name)}
                      </span>
                      {"\r\n                  "}
                      <span style={{ fontSize: "9px", lineHeight: "1.3", color: "#94a3c4", textAlign: "center" }}>
                        {interp(a?.tell)}
                      </span>
                      {"\r\n                "}
                    </div>
                    {"\r\n              "}
                  </Fragment>
                ))}
                {"\r\n              "}
                <div style={css(v.achGroupLabel)}>{"FEATS"}</div>
                {"\r\n              "}
                {asArray(v.achFeats).map((a: any, $index: number) => (
                  <Fragment key={$index}>
                    {"\r\n                "}
                    <div title={a?.title} style={css(a?.wrap)}>
                      {"\r\n                  "}
                      <span className="av" data-tier={a?.tier} style={{ width: "60px", height: "60px" }}>
                        <span style={css(a?.inner)} />
                      </span>
                      {"\r\n                  "}
                      <span style={{ fontSize: "10px", letterSpacing: ".05em", color: "#5b6684", textAlign: "center" }}>
                        {interp(a?.name)}
                      </span>
                      {"\r\n                  "}
                      <span style={{ fontSize: "9px", lineHeight: "1.3", color: "#94a3c4", textAlign: "center" }}>
                        {interp(a?.tell)}
                      </span>
                      {"\r\n                "}
                    </div>
                    {"\r\n              "}
                  </Fragment>
                ))}
                {"\r\n              "}
                <div style={css(v.achGroupLabel)}>{"LEGACY"}</div>
                {"\r\n              "}
                {asArray(v.achLegacy).map((a: any, $index: number) => (
                  <Fragment key={$index}>
                    {"\r\n                "}
                    <div title={a?.title} style={css(a?.wrap)}>
                      {"\r\n                  "}
                      <span className="av" data-tier={a?.tier} style={{ width: "60px", height: "60px" }}>
                        <span style={css(a?.inner)} />
                      </span>
                      {"\r\n                  "}
                      <span style={{ fontSize: "10px", letterSpacing: ".05em", color: "#5b6684", textAlign: "center" }}>
                        {interp(a?.name)}
                      </span>
                      {"\r\n                  "}
                      <span style={{ fontSize: "9px", lineHeight: "1.3", color: "#94a3c4", textAlign: "center" }}>
                        {interp(a?.tell)}
                      </span>
                      {"\r\n                "}
                    </div>
                    {"\r\n              "}
                  </Fragment>
                ))}
                {"\r\n            "}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n      "}
        </div>
        {"\r\n\r\n      "}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {"\r\n        "}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "16px", fontSize: "11px", letterSpacing: ".24em", color: "#a78bfa" }}>
            {"\r\n          "}
            <span>
              {"LEVEL "}
              {interp(v.xpLevel)}
              {" N/A "}
              {interp(v.xpTitleCaps)}
            </span>
            <span style={{ color: "#94a3c4" }}>
              {interp(v.xpNextCaps)}
            </span>
            {"\r\n        "}
          </div>
          {"\r\n        "}
          <div style={{ position: "relative", height: "2px", background: "rgba(232,236,248,0.14)" }}>
            {"\r\n          "}
            <div style={css(v.xpFill)} />
            {"\r\n        "}
          </div>
          {"\r\n        "}
          <div style={{ fontSize: "12.5px", fontVariantNumeric: "tabular-nums", color: "#94a3c4" }}>
            {interp(v.xpWagered)}
            {" USDC wagered"}
          </div>
          {"\r\n      "}
        </div>
        {"\r\n\r\n      "}
        {/*
           Money, one row: what you hold on the left, what you are owed on the
           right, divided by a hairline rather than stacked with a screen of
           air between them. The figures dropped a size — 46px was a headline
           for a page that had nothing else to say; this page now does.
        */}
        {"\r\n      "}
        <div className="su-you-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)", gap: "clamp(28px,60px,56px)", alignItems: "start" }}>
          {"\r\n\r\n        "}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px", minWidth: "0" }}>
            {"\r\n          "}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "12px", paddingBottom: "12px", borderBottom: "1px solid rgba(232,236,248,0.16)" }}>
              {"\r\n            "}
              <div style={{ display: "flex", alignItems: "baseline", gap: "14px" }}>
                {"\r\n              "}
                <span style={{ fontSize: "11px", letterSpacing: ".24em", color: "#a78bfa" }}>{"BANKROLL"}</span>
                {"\r\n              "}
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  {"\r\n                "}
                  <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(26px,42px,32px)", fontVariantNumeric: "tabular-nums", lineHeight: "1", color: "#e8ecf8" }}>
                    {interp(v.fundBankroll)}
                  </span>
                  {"\r\n                "}
                  <span style={{ fontSize: "11px", letterSpacing: ".2em", color: "#94a3c4" }}>{"USDC"}</span>
                  {"\r\n              "}
                </div>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <span style={{ fontSize: "12px", fontVariantNumeric: "tabular-nums", color: "#94a3c4" }}>
                {interp(v.fundWalletNote)}
              </span>
              {"\r\n          "}
            </div>
            {"\r\n          "}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
              {"\r\n            "}
              <div className="field-felt" style={{ flex: "1 1 150px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", border: "1px solid rgba(232,236,248,0.24)", borderRadius: "5px", background: "rgba(0,0,0,0.15)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.325)", padding: "10px 16px" }}>
                {"\r\n              "}
                <input value={v.fundDraft ?? ''} onInput={v.fundInput} placeholder="25.00" inputMode="decimal" style={{ flex: "1", minWidth: "0", border: "0", background: "transparent", fontSize: "15px", fontVariantNumeric: "tabular-nums", color: "#e8ecf8", caretColor: "#a78bfa" }} />
                {"\r\n              "}
                <span style={{ fontSize: "10px", letterSpacing: ".2em", color: "#94a3c4", flex: "none" }}>{"USDC"}</span>
                {"\r\n            "}
              </div>
              {"\r\n            "}
              <button className="pill-flat" onClick={v.fundDeposit} style={css(v.fundDepositStyle)}>{"Deposit"}</button>
              {"\r\n            "}
              <button className="pill-flat" onClick={v.fundWithdraw} style={css(v.fundWithdrawStyle)}>{"Withdraw"}</button>
              {"\r\n          "}
            </div>
            {"\r\n          "}
            <div style={css(v.fundNoteStyle)}>
              {interp(v.fundNote)}
              <a href={v.fundTxUrl} target="_blank" rel="noopener noreferrer" style={css(v.fundTxStyle)}>{"Receipt ↗"}</a>
            </div>
            {"\r\n        "}
          </div>
          {"\r\n\r\n        "}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px", minWidth: "0" }}>
            {"\r\n          "}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "12px", paddingBottom: "12px", borderBottom: "1px solid rgba(232,236,248,0.16)" }}>
              {"\r\n            "}
              <div style={{ display: "flex", alignItems: "baseline", gap: "14px" }}>
                {"\r\n              "}
                <span style={{ fontSize: "11px", letterSpacing: ".24em", color: "#a78bfa" }}>{"RAKEBACK"}</span>
                {"\r\n              "}
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  {"\r\n                "}
                  <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(26px,42px,32px)", fontVariantNumeric: "tabular-nums", lineHeight: "1", color: "#22d3ee" }}>
                    {interp(v.rbClaimable)}
                  </span>
                  {"\r\n                "}
                  <span style={{ fontSize: "11px", letterSpacing: ".2em", color: "#94a3c4" }}>{"USDC"}</span>
                  {"\r\n              "}
                </div>
                {"\r\n            "}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n          "}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              {"\r\n            "}
              <span style={{ flex: "1 1 160px", fontSize: "12px", lineHeight: "1.5", color: "#94a3c4" }}>
                {interp(v.rbNote)}
                <a href={v.rbTxUrl} target="_blank" rel="noopener noreferrer" style={css(v.rbTxStyle)}>{"Receipt ↗"}</a>
              </span>
              {"\r\n            "}
              <button className="pill-flat" onClick={v.rbClaim} style={css(v.rbBtnStyle)}>
                {interp(v.rbBtnLabel)}
              </button>
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n\r\n      "}
        </div>
        {"\r\n\r\n      "}
        {/*
           Every deposit and withdrawal, newest first. Only a Solana session
           has one — the gateway keeps no such list for anything else — so the
           whole block is absent rather than empty everywhere else.
        */}
        {v.fundHistOn ? (
          <div style={{ display: "flex", flexDirection: "column", minWidth: "0" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", paddingBottom: "12px", borderBottom: "1px solid rgba(232,236,248,0.16)" }}>
              <span style={{ fontSize: "11px", letterSpacing: ".24em", color: "#a78bfa" }}>{"DEPOSITS & WITHDRAWALS"}</span>
              {v.fundHistMoreOn ? (
                <button onClick={v.fundHistMore} style={{ fontSize: "11px", letterSpacing: ".16em", color: "#94a3c4" }}>
                  {interp(v.fundHistMoreLabel)}
                </button>
              ) : null}
            </div>
            {asArray(v.fundHistRows).map((r: any, $index: number) => (
              <div key={$index} style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "6px 16px", padding: "13px 0", borderBottom: "1px solid rgba(232,236,248,0.08)" }}>
                <span style={{ flex: "0 0 84px", fontSize: "11px", letterSpacing: ".16em", color: "#94a3c4", textTransform: "uppercase" }}>
                  {interp(r?.kind)}
                </span>
                <span style={css(r?.amountStyle)}>
                  {interp(r?.amount)}
                </span>
                <span style={css(r?.statusStyle)}>
                  {interp(r?.status)}
                </span>
                <span style={{ flex: "0 0 140px", fontSize: "12px", fontVariantNumeric: "tabular-nums", color: "#94a3c4" }}>
                  {interp(r?.when)}
                </span>
                <a href={r?.txUrl} target="_blank" rel="noopener noreferrer" style={css(r?.txStyle)}>{"Receipt ↗"}</a>
              </div>
            ))}
            <div style={css(v.fundHistNoteStyle)}>
              {interp(v.fundHistNote)}
            </div>
          </div>
        ) : null}
        {"\r\n\r\n      "}
        <div className="su-you-stats"style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", borderTop: "1px solid rgba(232,236,248,0.16)" }}>
          {"\r\n        "}
          {asArray(v.statTiles).map((s: any, $index: number) => (
            <Fragment key={$index}>
              {"\r\n          "}
              <div style={css(s?.cellStyle)}>
                {"\r\n            "}
                <span style={{ fontSize: "10.5px", letterSpacing: ".26em", color: "#a78bfa" }}>
                  {interp(s?.label)}
                </span>
                {"\r\n            "}
                <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(26px,3.4vw,34px)", fontVariantNumeric: "tabular-nums", lineHeight: "1", color: "#e8ecf8" }}>
                  {interp(s?.value)}
                </span>
                {"\r\n            "}
                <span style={{ fontSize: "14px", fontWeight: "300", color: "#94a3c4" }}>
                  {interp(s?.note)}
                </span>
                {"\r\n          "}
              </div>
              {"\r\n        "}
            </Fragment>
          ))}
          {"\r\n      "}
        </div>
        {"\r\n\r\n    "}
      </div>
      {"\r\n  "}
    </>
  );
}
