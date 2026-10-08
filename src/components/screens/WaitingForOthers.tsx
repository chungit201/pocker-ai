/* "Waiting for others" — the panel on the felt when you are the only one here.
 *
 * `v` is the bag of display values SuitedApp.renderVals() returns, and the gate
 * that decides whether this renders at all is `waitOn` there, so this file is
 * only ever the markup.
 *
 * It lives INSIDE the scaled play area (see `playArea` in Table.tsx) rather
 * than over the whole screen, so it sits on the felt and scales with it — the
 * seats, the stakes and the way out all stay visible and usable around it. A
 * full-screen modal would say "the table is unavailable", which is the opposite
 * of what is true: the table is fine and open, there is simply nobody in it.
 */
import { interp, css } from '../dc-runtime';

export default function WaitingForOthers({ v }: { v: any }) {
  return (
    <div style={css(v.waitWrap)}>
      <div style={css(v.waitPanel)}>
        <div style={css(v.waitTitleRow)}>
          <span style={css(v.waitDot)} />
          <span style={css(v.waitTitleStyle)}>{interp(v.waitTitle)}</span>
        </div>
        <div style={css(v.waitSubStyle)}>{interp(v.waitSub)}</div>
        <div style={css(v.waitCols)}>
          <div style={css(v.waitCol)}>
            <div style={css(v.waitLeadStyle)}>{interp(v.waitShareLead)}</div>
            <button className="pill-flat" onClick={v.waitCopy} style={css(v.waitCopyStyle)}>
              {interp(v.waitCopyLabel)}
            </button>
          </div>
          <div style={css(v.waitOrWrap)}>
            <span style={css(v.waitOrRule)} />
            <span style={css(v.waitOrText)}>{"OR"}</span>
            <span style={css(v.waitOrRule)} />
          </div>
          <div style={css(v.waitCol)}>
            <div style={css(v.waitLeadStyle)}>{interp(v.waitFindLead)}</div>
            <button className="pill-flat" onClick={v.waitFind} style={css(v.waitFindStyle)}>
              {interp(v.waitFindLabel)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
