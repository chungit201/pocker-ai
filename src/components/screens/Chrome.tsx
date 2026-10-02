/* The chrome screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { interp, css } from '../dc-runtime';

/* Line icons for the nav, drawn on a 16px grid in currentColor so each one
   takes its tab's colour (muted idle, white when active). */
const NAV_ICONS: Record<string, string[]> = {
  table: ['M2 8a6 3.6 0 1 0 12 0a6 3.6 0 1 0 -12 0', 'M4.5 8a3.5 1.8 0 1 0 7 0a3.5 1.8 0 1 0 -7 0'],
  lobby: ['M3.2 3.6l5.2-1.4 2.6 9.6-5.2 1.4z', 'M10.4 2.6l2.8.8-2.4 9'],
  tournaments: ['M5 2.5h6v3.2a3 3 0 0 1-6 0z', 'M5 3.5H2.8a2.2 2.2 0 0 0 2.4 3.1', 'M11 3.5h2.2a2.2 2.2 0 0 1-2.4 3.1', 'M8 8.7v2.6', 'M5.5 13.5h5l-.6-2.2h-3.8z'],
  leaderboard: ['M6 13.5V5.5h4v8', 'M2 13.5V8.5h4', 'M10 13.5V10h4v3.5', 'M1.5 13.5h13'],
  staking: ['M3 5.2a5 1.9 0 1 0 10 0a5 1.9 0 1 0 -10 0', 'M3 5.2v2.8c0 1 2.2 1.9 5 1.9s5-.9 5-1.9V5.2', 'M3 8v2.8c0 1 2.2 1.9 5 1.9s5-.9 5-1.9V8'],
  history: ['M8 2.5a5.5 5.5 0 1 1-5.2 3.7', 'M2.6 2.8v3.4H6', 'M8 5v3.2l2.2 1.4'],
  settings: ['M8 5.6a2.4 2.4 0 1 0 0 4.8a2.4 2.4 0 1 0 0-4.8', 'M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1'],
  docs: ['M3 2.5h6.5l3.5 3.5v7.5H3z', 'M9.5 2.5V6H13', 'M5.5 8.5h5M5.5 11h5'],
};
export function NavIcon({ name }: { name: string }) {
  return (
    <svg className="su-nav-icon" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"
      style={{ display: 'block', flex: 'none', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      {NAV_ICONS[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

export default function Chrome({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      {/*
         The shell is fixed across every route: pip lockup, nav, account.
         The design draws it at 77px (22px padding on a 33px row). It sits at
         65px now — the bankroll left the bar for the account menu, so the row
         no longer has to be tall enough to carry a 19px figure, and the height
         it was spending on that is screen every page gets back. Hairline rule
         rather than the old dashed one; the system is hairlines, not panels.
      */}
      {"\r\n    "}
      {/*
         user-select:none because ::selection here is terracotta: a click that
         drags a pixel selects the whitespace beside a nav label and paints a
         thin accent bar next to it, which reads as a rendering glitch. The nav
         is chrome, not copy — there is nothing here worth selecting.
      */}
      {"\r\n    "}
      <div className="su-stage su-nav" style={{ position: "sticky", top: "0", zIndex: "40", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "18px", height: "60px", boxSizing: "border-box", padding: "0 clamp(16px,51px,44px)", background: "#131a2f", borderBottom: "1px solid rgba(232,236,248,0.12)", userSelect: "none", WebkitUserSelect: "none" }}>
        {"\r\n      "}
        <div className="su-nav-left" style={{ display: "flex", alignItems: "center", gap: "clamp(20px,51px,44px)", minWidth: "0" }}>
          {"\r\n        "}
          <button className="su-nav-logo" onClick={v.goLanding} style={{ display: "flex", alignItems: "center", gap: "13px", flex: "none" }}>
            {"\r\n          "}
            <svg width="16" height="22" viewBox="0 0 72 100" style={{ display: "block" }}>
              <path d="M36,0 Q22,29 0,50 Q22,71 36,100 Z" style={{ fill: "#222c47" }} />
              <path d="M36,0 Q50,29 72,50 Q50,71 36,100 Z" style={{ fill: "#8b5cf6" }} />
            </svg>
            {"\r\n          "}
            <span style={{ fontWeight: "500", fontSize: "clamp(19px,36px,22px)", letterSpacing: "-.03em", lineHeight: ".74", color: "#e8ecf8" }}>
              {"Suited"}
            </span>
            {"\r\n        "}
          </button>
          {"\r\n        "}
          {/*
             The tabs, the rule and `more` share one gap-less row, so the space
             either side of the rule is the rule's own margin and nothing else.
             Before, the logo's wide gap sat on its left and the menu group's
             gap on its right, and the two never matched.
          */}
          {"\r\n        "}
          <div style={{ display: "flex", alignItems: "center", minWidth: "0" }}>
            {"\r\n        "}
            {/*
               Every item carries the transparent border, not just the active one,
               so the row is the same height on every route and nothing shifts by
               1.5px as you navigate.
            */}
            {"\r\n        "}
            <div className="su-tabs" style={{ display: "flex", alignItems: "center", gap: "clamp(14px,35px,24px)", minWidth: "0", overflowX: "auto", fontSize: "14px" }}>
              {"\r\n          "}
              {/*
                 `table` is a place you are, not a section of the site: it shows
                 only while you have a seat (the same condition as the lobby's
                 "my table" button), rather than sitting there greyed out. The
                 rest of the row is where you GO; who you are lives behind the
                 avatar, which holds your profile and your money.
              */}
              {"\r\n          "}
              {v.hasTable ? (
                <>
                  {"\r\n            "}
                  <button onClick={v.goTable} className="su-tab" style={css(v.tabTable)}><NavIcon name="table" />{"Table"}</button>
                  {"\r\n          "}
                </>
              ) : null}
              {"\r\n          "}
              <button onClick={v.goLobby} className="su-tab" style={css(v.tabLobby)}><NavIcon name="lobby" />{"Lobby"}</button>
              {"\r\n          "}
              <button onClick={v.goTournaments} className="su-tab" style={css(v.tabTournaments)}><NavIcon name="tournaments" />{"Tournaments"}</button>
              {"\r\n          "}
              <button onClick={v.goLeader} className="su-tab" style={css(v.tabLeader)}><NavIcon name="leaderboard" />{"Leaderboard"}</button>
              {"\r\n          "}
              <button onClick={v.goStaking} className="su-tab" style={css(v.tabStaking)}><NavIcon name="staking" />{"Staking"}</button>
              {"\r\n        "}
            </div>
            {"\r\n        "}
            {/*
               Where you go, then a rule, then the site itself. Docs and settings
               are neither a place to play nor anything to do with who you are —
               settings says so itself ("kept in this browser, not the wallet you
               play with") — so they sit here rather than under a face. Nothing
               in this menu is also in that one.
                     
               OUTSIDE the tab row on purpose: that row scrolls horizontally on a
               narrow screen, and `overflow-x` clips an absolutely-positioned
               dropdown to the strip it scrolls in.
            */}
            {"\r\n        "}
            <div style={{ display: "flex", alignItems: "center", flex: "none", fontSize: "14px" }}>
              {"\r\n          "}
              {/* Symmetric by construction: one margin, both sides. */}
              {"\r\n          "}
              <span style={{ width: "1px", height: "16px", margin: "0 clamp(12px,17px,16px)", background: "rgba(232,236,248,0.18)", flex: "none" }} />
              {"\r\n          "}
              <div style={{ position: "relative", flex: "none" }}>
                {"\r\n            "}
                <button onClick={v.moreMenuToggle} className="su-tab" style={css(v.tabMore)}>
                  {"More"}
                  <svg width="9" height="6" viewBox="0 0 10 6" style={css(v.moreCaret)}>
                    <polyline points="1,1 5,5 9,1" style={{ fill: "none", stroke: "currentColor", strokeWidth: "1.5" }} />
                  </svg>
                </button>
                {"\r\n            "}
                <div style={css(v.moreMenuStyle)}>
                  {"\r\n              "}
                  <button className="su-menu-item" onClick={v.goHistory} style={{ width: "100%", textAlign: "left", padding: "11px 18px", fontSize: "14px", color: "#e8ecf8" }}>
                    <NavIcon name="history" />{"Hand history"}
                  </button>
                  {"\r\n              "}
                  <button className="su-menu-item" onClick={v.goSettings} style={{ width: "100%", textAlign: "left", padding: "11px 18px", fontSize: "14px", color: "#e8ecf8" }}>
                    <NavIcon name="settings" />{"Settings"}
                  </button>
                  {"\r\n              "}
                  <button className="su-menu-item" onClick={v.goDocsNav} style={{ width: "100%", textAlign: "left", padding: "11px 18px", fontSize: "14px", color: "#e8ecf8" }}>
                    <NavIcon name="docs" />{"Docs"}
                  </button>
                  {"\r\n            "}
                </div>
                {"\r\n          "}
              </div>
              {"\r\n        "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n      "}
        </div>
        {"\r\n      "}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: "none" }}>
          <span className="su-online"><i />{interp(v.navOnline)}</span>
          {"\r\n        "}
          {v.walletOn ? (
            <>
              {"\r\n          "}
              {/*
                 Name, then face, then everything else behind a caret. The bar used
                 to lead with the bankroll at 19px, which made the number the
                 loudest thing on every screen including the ones about it. It is
                 reference, not headline: it belongs one click away, beside the
                 address it is held against.
              */}
              {"\r\n          "}
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "8px" }}>
                {"\r\n            "}
                <button onClick={v.goProfile} style={css(v.headerNameStyle)}>
                  {interp(v.displayName)}
                </button>
                {"\r\n            "}
                <button onClick={v.walletMenuToggle} title="Account" style={{ display: "flex", alignItems: "center", gap: "6px", flex: "none" }}>
                  {"\r\n              "}
                  <span className="av" data-tier={v.headerTier} style={{ width: "32px", height: "32px", flex: "none" }}>
                    <span style={css(v.headerAvInner)} />
                  </span>
                  {"\r\n              "}
                  <svg width="10" height="6" viewBox="0 0 10 6" style={{ display: "block" }}>
                    <polyline points="1,1 5,5 9,1" style={{ fill: "none", stroke: "#94a3c4", strokeWidth: "1.5" }} />
                  </svg>
                  {"\r\n            "}
                </button>
                {"\r\n            "}
                <div style={css(v.walletMenuStyle)}>
                  {"\r\n              "}
                  {v.menuSeated ? (
                    <>
                      {"\r\n                "}
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "15px 18px 6px" }}>
                        {"\r\n                  "}
                        <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#94a3c4" }}>{"IN PLAY"}</span>
                        {"\r\n                  "}
                        <div style={{ display: "flex", alignItems: "baseline", gap: "7px" }}>
                          <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "24px", lineHeight: "1", color: "#e8ecf8" }}>
                            {interp(v.inPlayLabel)}
                          </span>
                          <span style={{ fontSize: "11px", color: "#94a3c4" }}>
                            {interp(v.inPlayUnit)}
                          </span>
                        </div>
                        {"\r\n                "}
                      </div>
                      {"\r\n              "}
                    </>
                  ) : null}
                  {"\r\n              "}
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "15px 18px 14px" }}>
                    {"\r\n                "}
                    <span style={{ fontSize: "11px", letterSpacing: ".14em", color: "#94a3c4" }}>{"BANKROLL"}</span>
                    {"\r\n                "}
                    <div style={{ display: "flex", alignItems: "baseline", gap: "7px" }}>
                      <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "18px", lineHeight: "1", color: "#94a3c4" }}>
                        {interp(v.balanceLabel)}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94a3c4" }}>{"USDG"}</span>
                    </div>
                    {"\r\n              "}
                  </div>
                  {"\r\n              "}
                  {v.menuSeatedCash ? (
                    <>
                      {"\r\n                "}
                      <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(232,236,248,0.154)" }}>
                        {"\r\n                  "}
                        <button onClick={v.sitUp} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px", width: "100%", textAlign: "left", padding: "11px 18px" }}>
                          {"\r\n                    "}
                          <span style={{ fontSize: "15px", color: "#e8ecf8" }}>
                            {interp(v.sitUpLabel)}
                          </span>
                          {"\r\n                    "}
                          <span style={{ fontSize: "12.5px", color: "#94a3c4" }}>{"Keep your seat, skip hands"}</span>
                          {"\r\n                  "}
                        </button>
                        {"\r\n                  "}
                        <button onClick={v.leaveTable} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px", width: "100%", textAlign: "left", padding: "11px 18px", borderTop: "1px solid rgba(232,236,248,0.11)" }}>
                          {"\r\n                    "}
                          <span style={{ fontSize: "15px", color: "#e5484d" }}>{"Leave the table"}</span>
                          {"\r\n                    "}
                          <span style={{ fontSize: "12.5px", color: "#94a3c4" }}>
                            {interp(v.leaveNote)}
                          </span>
                          {"\r\n                  "}
                        </button>
                        {"\r\n                "}
                      </div>
                      {"\r\n              "}
                    </>
                  ) : null}
                  {"\r\n              "}
                  {/* Host only: end the whole session, not just this seat. */}
                  {"\r\n              "}
                  {v.menuIsHost ? (
                    <>
                      {"\r\n                "}
                      <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(232,236,248,0.154)" }}>
                        {"\r\n                  "}
                        <button onClick={v.promptCloseRoom} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px", width: "100%", textAlign: "left", padding: "11px 18px" }}>
                          {"\r\n                    "}
                          <span style={{ fontSize: "15px", color: "#e5484d" }}>{"End the session"}</span>
                          {"\r\n                    "}
                          <span style={{ fontSize: "12.5px", color: "#94a3c4" }}>{"Close the room for everyone"}</span>
                          {"\r\n                  "}
                        </button>
                        {"\r\n                "}
                      </div>
                      {"\r\n              "}
                    </>
                  ) : null}
                  {"\r\n              "}
                  <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(232,236,248,0.154)", fontSize: "14px", color: "#e8ecf8" }}>
                    {"\r\n                "}
                    <button onClick={v.goDeposit} style={{ width: "100%", textAlign: "left", padding: "11px 18px" }}>{"Deposit"}</button>
                    {"\r\n                "}
                    <button onClick={v.goProfile} style={{ width: "100%", textAlign: "left", padding: "11px 18px" }}>{"Profile"}</button>
                    {"\r\n                "}
                    {/*
                       One way out, and it is the thorough one: this ends the
                       session on every device, not just in this browser. The
                       label says the everyday word and the tooltip says the
                       whole truth, rather than a menu with two exits a step
                       apart in severity and one letter apart in wording.
                    */}
                    {"\r\n                "}
                    <button onClick={v.doDisconnect} title="Ends this account's session on every device" style={{ width: "100%", textAlign: "left", padding: "11px 18px", color: "#94a3c4", borderTop: "1px solid rgba(232,236,248,0.11)" }}>
                      {"Disconnect"}
                    </button>
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </div>
                {"\r\n          "}
              </div>
              {"\r\n        "}
            </>
          ) : null}
          {"\r\n        "}
          {v.walletOff ? (
            <>
              {"\r\n          "}
              {/*
                 Height pinned to the avatar chip it replaces. The design only
                 draws the signed-in shell, and a taller button here would make
                 the row 83px signed out and 77px signed in — the one thing the
                 spec asks this bar not to do.
              */}
              {"\r\n          "}
              <button className="pill scp0 scp1" onClick={v.goConnect} style={{ display: "inline-flex", alignItems: "center", height: "32px", padding: "0 20px", borderRadius: "5px", background: "linear-gradient(180deg,#8b5cf6,#6d3fd4)", border: "1px solid rgba(255,255,255,0.165)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.27),0 1px 3px rgba(0,0,0,0.35)", color: "#f6f3ff", fontSize: "13px", fontWeight: "500" }}>
                {"Connect"}
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
