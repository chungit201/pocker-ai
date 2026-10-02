/* The connect screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { Fragment } from 'react';
import { interp, css, asArray } from '../dc-runtime';

export default function Connect({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      <div style={{ flex: "1", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "clamp(32px,6vw,72px) clamp(18px,3.4vw,44px) 60px" }}>
        {"\r\n      "}
        <div style={{ width: "100%", maxWidth: "660px", display: "flex", flexDirection: "column", gap: "clamp(24px,3.4vw,38px)", animation: "riseIn .4s cubic-bezier(.2,.9,.24,1) both" }}>
          {"\r\n        "}
          <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: "11.5px", letterSpacing: ".2em" }}>
            {"\r\n          "}
            <span style={css(v.step1Style)}>{"01 Wallet"}</span>
            {"\r\n          "}
            <span style={{ flex: "1", height: "1px", background: "rgba(232,236,248,0.2)" }} />
            {"\r\n          "}
            <span style={css(v.step2Style)}>{"02 Deposit"}</span>
            {"\r\n        "}
          </div>
          {"\r\n\r\n        "}
          {v.connectStep0 ? (
            <>
              {"\r\n          "}
              <div style={{ display: "flex", flexDirection: "column", gap: "clamp(24px,3.4vw,38px)" }}>
                {"\r\n            "}
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {"\r\n              "}
                  <h2 style={{ fontSize: "clamp(30px,4.4vw,42px)", fontWeight: "400", letterSpacing: "-.035em", lineHeight: "1", margin: "0", color: "#e8ecf8" }}>
                    {"Connect a wallet"}
                  </h2>
                  {"\r\n              "}
                  <p style={{ fontSize: "clamp(15px,1.8vw,18px)", fontWeight: "300", lineHeight: "1.55", color: "#94a3c4", maxWidth: "560px", margin: "0", textWrap: "pretty" }}>
                    {"We never take custody. Buy-ins move to the table program, and your seat closes out to your balance the moment you stand up, withdraw to your wallet whenever you like."}
                  </p>
                  {"\r\n            "}
                </div>
                {"\r\n\r\n            "}
                {/*
                   Hairline rows rather than pills on a sand plate. Detection is
                   asked of `window` at render rather than assumed, so a row that
                   says DETECTED is one that will actually connect.
                */}
                {"\r\n            "}
                {/* Which chain, before which wallet. The two sign in with
                    different key types against different verifiers, so this is
                    a real choice rather than a filter — and making it first
                    means the list below only ever holds wallets that can
                    complete the sign-in you are starting. */}
                <div style={css(v.chainTabsStyle)}>
                  {asArray(v.chainTabs).map((t: any, $index: number) => (
                    <Fragment key={$index}>
                      <button onClick={t?.pick} style={css(t?.style)}>
                        {interp(t?.label)}
                        <span style={css(t?.dot)} />
                      </button>
                    </Fragment>
                  ))}
                </div>
                {"\r\n            "}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {"\r\n              "}
                  {v.chainEmpty ? <div style={css(v.chainEmptyStyle)}>{interp(v.chainEmptyNote)}</div> : null}
                  {asArray(v.walletRows).map((w: any, $index: number) => (
                    <Fragment key={$index}>
                      {"\r\n                "}
                      <button onClick={w?.pick} style={css(w?.rowStyle)}>
                        {"\r\n                  "}
                        <span style={css(w?.badgeStyle)}>
                          {interp(w?.short)}
                          {/* The wallet's own icon, laid over the two letters
                              rather than instead of them: a wallet that
                              announced none, or whose data URI fails to
                              decode, still leaves a legible mark. */}
                          {w?.icon ? <img src={w.icon} alt="" aria-hidden="true" style={css(w?.iconStyle)} /> : null}
                        </span>
                        {"\r\n                  "}
                        <span style={css(w?.nameStyle)}>
                          {interp(w?.label)}
                        </span>
                        {"\r\n                  "}
                        <span style={css(w?.stateStyle)}>
                          {"\r\n                    "}
                          <span style={css(w?.dotStyle)} />
                          {interp(w?.state)}
                          {"\r\n                  "}
                        </span>
                        {"\r\n                "}
                      </button>
                      {"\r\n              "}
                    </Fragment>
                  ))}
                  {"\r\n            "}
                </div>
                {"\r\n\r\n            "}
                <div style={css(v.approveStyle)}>
                  {"\r\n              "}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", letterSpacing: ".06em", color: "#94a3c4" }}>
                    {"\r\n                "}
                    <span>
                      {interp(v.approveLabel)}
                    </span>
                    {"\r\n                "}
                    <span style={{ color: "#a78bfa" }}>{"Waiting"}</span>
                    {"\r\n              "}
                  </div>
                  {"\r\n              "}
                  <div style={{ position: "relative", height: "2px", background: "rgba(232,236,248,0.14)", overflow: "hidden" }}>
                    {"\r\n                "}
                    <div style={{ position: "absolute", left: "0", top: "0", height: "2px", width: "38%", background: "#8b5cf6", animation: "scan 1.05s ease-in-out infinite" }} />
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </div>
                {"\r\n          "}
              </div>
              {"\r\n        "}
            </>
          ) : null}
          {"\r\n\r\n        "}
          {v.connectStep1 ? (
            <>
              {"\r\n          "}
              <div style={{ padding: "26px", borderRadius: "12px", background: "#1a2238", color: "#e8ecf8", border: "1px solid rgba(232,236,248,0.154)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.21),0 2px 6px rgba(0,0,0,0.375)" }}>
                {"\r\n            "}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "20px" }}>
                  {"\r\n              "}
                  <div>
                    {"\r\n                "}
                    <h2 style={{ fontFamily: "'Inter Tight',system-ui,sans-serif", fontWeight: "600", letterSpacing: "-.03em", fontSize: "27px", margin: "0 0 2px" }}>
                      {"Add funds"}
                    </h2>
                    {"\r\n                "}
                    <div style={{ fontSize: "11px", color: "#94a3c4" }}>{"One bankroll funds every table"}</div>
                    {"\r\n              "}
                  </div>
                  {"\r\n              "}
                  <div style={{ textAlign: "right" }}>
                    {"\r\n                "}
                    <div style={{ fontSize: "11px", color: "#94a3c4" }}>
                      {interp(v.walletName)}
                    </div>
                    {"\r\n                "}
                    <div style={{ fontSize: "12px" }}>
                      {interp(v.walletShort)}
                    </div>
                    {"\r\n              "}
                  </div>
                  {"\r\n            "}
                </div>
                {"\r\n            "}
                <div style={{ fontSize: "11px", color: "#94a3c4" }}>{"Your bankroll"}</div>
                {"\r\n            "}
                <div style={{ display: "flex", alignItems: "baseline", gap: "9px", marginBottom: "4px" }}>
                  {"\r\n              "}
                  <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "44px", lineHeight: "1", color: "#e8ecf8" }}>
                    {interp(v.bankrollLabel)}
                  </span>
                  {"\r\n              "}
                  <span style={{ fontSize: "12px", color: "#94a3c4" }}>{"USDG"}</span>
                  {"\r\n            "}
                </div>
                {"\r\n            "}
                <div style={{ fontSize: "11px", color: "#94a3c4", marginBottom: "18px" }}>
                  {interp(v.walletAvailLabel)}
                </div>
                {"\r\n\r\n            "}
                {/*
                   sign-up name: seats show real identities, so ask once here.
                   Skippable; the row is gone the moment a name is saved.
                */}
                {"\r\n            "}
                {v.signupNickOn ? (
                  <>
                    {"\r\n              "}
                    <div style={{ padding: "16px", borderRadius: "8px", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(10,13,22,0.1)", marginBottom: "18px" }}>
                      {"\r\n                "}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {"\r\n                  "}
                        <span style={{ fontSize: "12px", color: "#94a3c4", whiteSpace: "nowrap" }}>{"Table name"}</span>
                        {"\r\n                  "}
                        <input value={v.snDraft ?? ''} onInput={v.snInput} onKeyDown={v.snKey} placeholder="Riverrat" maxLength={16} style={{ flex: "1", minWidth: "0", padding: "9px 14px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.22)", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(232,236,248,0.176)", outline: "none", transition: "box-shadow .16s ease,border-color .16s ease", color: "#e8ecf8", font: "inherit", fontSize: "13px", caretColor: "#a78bfa" }} />
                        {"\r\n                  "}
                        <button className="pill-flat" onClick={v.snSave} style={{ flex: "0 0 auto", padding: "9px 20px", borderRadius: "5px", background: "linear-gradient(180deg,#222c47,#0d1220)", color: "#b497f7", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12),0 1px 2px rgba(0,0,0,0.35)", fontSize: "12px" }}>
                          {"Save"}
                        </button>
                        {"\r\n                "}
                      </div>
                      {"\r\n                "}
                      <div style={css(v.snMsgStyle)}>
                        {interp(v.snMsg)}
                      </div>
                      {"\r\n              "}
                    </div>
                    {"\r\n            "}
                  </>
                ) : null}
                {"\r\n\r\n            "}
                {/*
                   deposit: one balance funds every table, so this is the only
                   place money enters. Sitting down draws from it for free.
                */}
                {"\r\n            "}
                {v.depositOn ? (
                  <>
                    {"\r\n              "}
                    <div style={{ padding: "16px", borderRadius: "8px", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(10,13,22,0.1)", marginBottom: "18px" }}>
                      {"\r\n                "}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                        {"\r\n                  "}
                        <span style={{ fontSize: "12px", color: "#94a3c4" }}>{"Deposit"}</span>
                        {"\r\n                  "}
                        <input value={v.depositDraft ?? ''} onInput={v.depositInput} placeholder="25" inputMode="decimal" style={{ flex: "1", minWidth: "0", padding: "9px 14px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.22)", background: "#222c47", boxShadow: "inset 0 1px 2px rgba(232,236,248,0.176)", outline: "none", transition: "box-shadow .16s ease,border-color .16s ease", color: "#e8ecf8", font: "inherit", fontSize: "13px", caretColor: "#a78bfa" }} />
                        {"\r\n                  "}
                        <span style={{ fontSize: "12px", color: "#94a3c4" }}>{"USDG"}</span>
                        {"\r\n                "}
                      </div>
                      {"\r\n                "}
                      <div style={{ display: "flex", gap: "7px", marginBottom: "11px" }}>
                        {"\r\n                  "}
                        <button className="pill-flat" onClick={v.dep25} style={{ flex: "1", padding: "8px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.176)", fontSize: "12px" }}>
                          {"25"}
                        </button>
                        {"\r\n                  "}
                        <button className="pill-flat" onClick={v.dep50} style={{ flex: "1", padding: "8px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.176)", fontSize: "12px" }}>
                          {"50"}
                        </button>
                        {"\r\n                  "}
                        <button className="pill-flat" onClick={v.dep100} style={{ flex: "1", padding: "8px", borderRadius: "5px", border: "1px solid rgba(232,236,248,0.176)", fontSize: "12px" }}>
                          {"100"}
                        </button>
                        {"\r\n                "}
                      </div>
                      {"\r\n                "}
                      <button className="pill-flat" onClick={v.doDeposit} style={css(v.depositBtnStyle)}>
                        {interp(v.depositBtnLabel)}
                      </button>
                      {"\r\n                "}
                      <div style={{ fontSize: "10px", color: "#94a3c4", marginTop: "8px" }}>
                        {interp(v.depositNote)}
                      </div>
                      {"\r\n              "}
                    </div>
                    {"\r\n            "}
                  </>
                ) : null}
                {"\r\n\r\n            "}
                {v.faucetOn ? (
                  <>
                    {"\r\n              "}
                    <button className="pill-flat" onClick={v.doFaucet} style={{ width: "100%", padding: "11px", borderRadius: "5px", border: "1px dashed rgba(232,236,248,0.28)", fontSize: "12px", marginBottom: "18px" }}>
                      {"Get test USDG"}
                    </button>
                    {"\r\n            "}
                  </>
                ) : null}
                {"\r\n\r\n            "}
                <button className="pill-flat" onClick={v.goLobby} style={css(v.toLobbyStyle)}>
                  {interp(v.toLobbyLabel)}
                </button>
                {"\r\n            "}
                <button onClick={v.backToWallet} style={{ width: "100%", padding: "11px", fontSize: "12px", color: "#94a3c4" }}>
                  {"Use a different wallet"}
                </button>
                {"\r\n          "}
              </div>
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
