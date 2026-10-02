/* The table's menu. On the felt the nav bar is gone (every pixel of height
 * goes to the game); this is what replaces it: one small button in the top
 * right that slides a drawer in from the right edge, carrying the account,
 * the seat actions, and everywhere the nav bar used to go.
 *
 * The button lives in the side rail's header, beside sit up and leave (see
 * Table.tsx), and asks for the drawer with a `suited:menu` window event. The
 * floating button here only shows while the rail is closed, so the menu is
 * always one tap away without ever sitting on top of the rail's controls.
 *
 * Open/closed is local state: it means nothing outside this screen, and
 * leaving the table unmounts the drawer, which is also what closes it.
 */
import { useEffect, useState } from 'react';
import { interp, css } from '../dc-runtime';
import { NavIcon } from './Chrome';

/** Opens the table drawer from anywhere on the table screen. */
export const openTableMenu = () => window.dispatchEvent(new Event('suited:menu'));

export default function TableDrawer({ v, floating = true }: { v: any; floating?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onMenu = () => setOpen((o) => !o);
    window.addEventListener('suited:menu', onMenu);
    return () => window.removeEventListener('suited:menu', onMenu);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Every item closes the drawer before it acts, so a navigation never
  // leaves a drawer hanging over the next screen's first frame.
  const act = (fn: any) => (e: any) => { setOpen(false); if (fn) fn(e); };

  // Off the table the drawer is the phone's nav, so a seat you hold is the
  // first place it offers to go — as the tab row does on a wide screen.
  const nav: [string, string, any][] = [
    ...(!floating && v.hasTable ? [['table', 'Table', v.goTable] as [string, string, any]] : []),
    ['lobby', 'Lobby', v.goLobby],
    ['tournaments', 'Tournaments', v.goTournaments],
    ['leaderboard', 'Leaderboard', v.goLeader],
    ['staking', 'Staking', v.goStaking],
    ['history', 'Hand history', v.goHistory],
    ['settings', 'Settings', v.goSettings],
    ['docs', 'Docs', v.goDocsNav],
  ];

  return (
    <>
      {floating ? (
        <button
          className={'td-toggle' + (open || v.railOpen ? ' td-toggle--open' : '')}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M3 5h12M3 9h12M3 13h12" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }} />
          </svg>
        </button>
      ) : null}

      <div className={'td-scrim' + (open ? ' td-scrim--open' : '')} onClick={() => setOpen(false)} aria-hidden="true" />

      <aside className={'td-panel' + (open ? ' td-panel--open' : '')} aria-hidden={!open} inert={!open || undefined}>
        <div className="td-head">
          <button className="td-brand" onClick={act(v.goLanding)}>
            <svg width="13" height="18" viewBox="0 0 72 100" style={{ display: 'block' }}>
              <path d="M36,0 Q22,29 0,50 Q22,71 36,100 Z" style={{ fill: '#222c47' }} />
              <path d="M36,0 Q50,29 72,50 Q50,71 36,100 Z" style={{ fill: '#8b5cf6' }} />
            </svg>
            <span>Suited</span>
          </button>
          <button className="td-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }} />
            </svg>
          </button>
        </div>

        <div className="td-body">
          {/* who you are and what you hold */}
          {v.walletOn ? (
            <div className="td-card">
              <button className="td-me" onClick={act(v.goProfile)}>
                <span className="av" data-tier={v.headerTier} style={{ width: '38px', height: '38px', flex: 'none' }}>
                  <span style={css(v.headerAvInner)} />
                </span>
                <span className="td-me-name">{interp(v.displayName)}</span>
              </button>
              {v.menuSeated ? (
                <div className="td-kv">
                  <span>In play</span>
                  <b>{interp(v.inPlayLabel)} <small>{interp(v.inPlayUnit)}</small></b>
                </div>
              ) : null}
              <div className="td-kv">
                <span>Bankroll</span>
                <b>{interp(v.balanceLabel)} <small>USDG</small></b>
              </div>
            </div>
          ) : (
            <button className="pill scp0 scp1 td-connect" onClick={act(v.goConnect)}
              style={{ background: 'linear-gradient(180deg,#8b5cf6,#6d3fd4)' }}>
              Connect a wallet
            </button>
          )}

          {/* the seat, while you have one */}
          {v.menuSeatedCash || v.menuIsHost ? (
            <div className="td-group">
              <div className="td-label">This table</div>
              {v.menuSeatedCash ? (
                <>
                  <button className="td-item td-item--two" onClick={act(v.sitUp)}>
                    <span>{interp(v.sitUpLabel)}</span>
                    <small>Keep your seat, skip hands</small>
                  </button>
                  <button className="td-item td-item--two td-item--danger" onClick={act(v.leaveTable)}>
                    <span>Leave the table</span>
                    <small>{interp(v.leaveNote)}</small>
                  </button>
                </>
              ) : null}
              {v.menuIsHost ? (
                <button className="td-item td-item--two td-item--danger" onClick={act(v.promptCloseRoom)}>
                  <span>End the session</span>
                  <small>Close the room for everyone</small>
                </button>
              ) : null}
            </div>
          ) : null}

          {/* The skin, picked where it can be seen: the drawer stays open, so
              each tap repaints the table behind the scrim. Only on the table —
              off it there is nothing behind the scrim to repaint, and the two
              pickers live in Settings. */}
          {floating ? (
          <>
          <div className="td-group">
            <div className="td-label">Table style</div>
            <div className="td-styles">
              {(v.tableStyles || []).map((s: any) => (
                <button key={s.id} onClick={s.pick} aria-pressed={s.on} style={css(s.btn)}>
                  <span style={css(s.swatch)} />
                  {interp(s.name)}
                </button>
              ))}
            </div>
          </div>

          <div className="td-group">
            <div className="td-label">Card back</div>
            <div className="td-styles">
              {(v.cardBacks || []).map((b: any) => (
                <button key={b.id} onClick={b.pick} aria-pressed={b.on} style={css(b.btn)}>
                  <span style={css(b.swatch)} />
                  {interp(b.name)}
                </button>
              ))}
            </div>
          </div>
          </>
          ) : null}

          <div className="td-group">
            <div className="td-label">Go to</div>
            {nav.map(([icon, label, go]) => (
              <button key={icon} className="td-item" onClick={act(go)}>
                <NavIcon name={icon} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {v.walletOn ? (
            <div className="td-group">
              <div className="td-label">Account</div>
              <button className="td-item" onClick={act(v.goDeposit)}><span>Deposit</span></button>
              <button className="td-item" onClick={act(v.goProfile)}><span>Profile</span></button>
              <button className="td-item td-item--muted" onClick={act(v.doDisconnect)} title="Ends this account's session on every device">
                <span>Disconnect</span>
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
