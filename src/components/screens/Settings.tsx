/* The settings screen.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns. The gate
 * that decides whether this renders at all stays in SuitedTemplate, so this
 * file is only ever the markup.
 */
import { Fragment } from 'react';
import { interp, css, asArray } from '../dc-runtime';

export default function Settings({ v }: { v: any }) {
  return (
    <>
      {"\r\n    "}
      <div className="su-page su-stage" style={{ flex: "1", paddingBottom: "60px" }}>
        {"\r\n      "}
        <h1 style={{ fontWeight: "500", letterSpacing: "-.03em", fontSize: "38px", margin: "0 0 4px", color: "#e8ecf8" }}>
          {"Settings"}
        </h1>
        {"\r\n      "}
        <p style={{ fontSize: "12px", color: "#94a3c4", margin: "0 0 26px" }}>
          {"Kept in this browser, they follow the screen you play on, not the wallet you play with."}
        </p>
        {"\r\n\r\n      "}
        <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(232,236,248,0.16)" }}>
          {"\r\n\r\n        "}
          <div style={css(v.setRow)}>
            {"\r\n          "}
            <div style={css(v.setText)}>
              {"\r\n            "}
              <div style={css(v.setLabel)}>{"AMOUNTS"}</div>
              {"\r\n            "}
              <div style={css(v.setNote)}>
                {interp(v.unitNote)}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n          "}
            <div style={css(v.setSeg)}>
              {"\r\n            "}
              <button className="scph" onClick={v.unitUsd} style={css(v.unitUsdStyle)}>{"Dollars"}</button>
              {"\r\n            "}
              <button className="scph" onClick={v.unitBb} style={css(v.unitBbStyle)}>{"Big blinds"}</button>
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n\r\n        "}
          <div style={css(v.setRow)}>
            {"\r\n          "}
            <div style={css(v.setText)}>
              {"\r\n            "}
              <div style={css(v.setLabel)}>{"ACTION HOTKEYS"}</div>
              {"\r\n            "}
              <div style={css(v.setNote)}>
                {interp(v.hotkeysNote)}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n          "}
            <div style={css(v.setSeg)}>
              {"\r\n            "}
              <button className="scph" onClick={v.hotkeysOn} style={css(v.hotkeysOnStyle)}>{"On"}</button>
              {"\r\n            "}
              <button className="scph" onClick={v.hotkeysOff} style={css(v.hotkeysOffStyle)}>{"Off"}</button>
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n\r\n        "}
          <div style={css(v.setRow)}>
            {"\r\n          "}
            <div style={css(v.setText)}>
              {"\r\n            "}
              <div style={css(v.setLabel)}>{"SOUND"}</div>
              {"\r\n            "}
              <div style={css(v.setNote)}>
                {interp(v.soundNote)}
              </div>
              {"\r\n          "}
            </div>
            {"\r\n          "}
            <div style={css(v.setSeg)}>
              {"\r\n            "}
              <button className="scph" onClick={v.soundOn} style={css(v.soundOnStyle)}>{"On"}</button>
              {"\r\n            "}
              <button className="scph" onClick={v.soundOff} style={css(v.soundOffStyle)}>{"Off"}</button>
              {"\r\n          "}
            </div>
            {"\r\n        "}
          </div>
          {"\r\n\r\n      "}
        </div>
        {"\r\n\r\n      "}
        {/*
           The preview is the argument for the setting: the same three figures
           from a real $1/$2 hand, written the way the felt is about to write
           them. Switching above rewrites it under the pointer.
        */}
        {"\r\n      "}
        <div style={{ marginTop: "34px", padding: "22px 24px", borderRadius: "12px", border: "1px solid rgba(232,236,248,0.16)", background: "rgba(0,0,0,0.15)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}>
          {"\r\n        "}
          <div style={{ fontSize: "10.5px", letterSpacing: ".26em", color: "#a78bfa", marginBottom: "16px" }}>
            {"AT $1/$2, THIS READS"}
          </div>
          {"\r\n        "}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "20px" }}>
            {"\r\n          "}
            {asArray(v.unitPreview).map((p: any, $index: number) => (
              <Fragment key={$index}>
                {"\r\n            "}
                <div style={{ display: "flex", flexDirection: "column", gap: "7px", minWidth: "0" }}>
                  {"\r\n              "}
                  <span style={{ fontSize: "11px", letterSpacing: ".2em", color: "#94a3c4" }}>
                    {interp(p?.label)}
                  </span>
                  {"\r\n              "}
                  <span style={{ fontFamily: "'Instrument Serif',serif", fontSize: "clamp(22px,39px,28px)", lineHeight: "1", fontVariantNumeric: "tabular-nums", color: "#e8ecf8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {interp(p?.value)}
                  </span>
                  {"\r\n            "}
                </div>
                {"\r\n          "}
              </Fragment>
            ))}
            {"\r\n        "}
          </div>
          {"\r\n      "}
        </div>
        {"\r\n\r\n    "}
      </div>
      {"\r\n  "}
    </>
  );
}
