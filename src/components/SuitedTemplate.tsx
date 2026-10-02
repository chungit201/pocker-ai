/* The markup for every screen. Edit it directly.
 *
 * This began life as the template DSL inside the original index.html and was
 * compiled to JSX once, by a generator that has since been retired — the port
 * is finished, nothing syncs from upstream any more, and this file is now
 * ordinary source. Earlier revisions carried a "do not edit" banner; ignore it
 * if you find one in the history.
 *
 * Two things about its shape are inherited rather than chosen, and are worth
 * knowing before you change anything:
 *
 *  • Runs of whitespace are written as explicit string literals ({"\r\n  "}).
 *    JSX trims whitespace at line boundaries and the DOM does not, and between
 *    two inline elements that whitespace is a visible word space. They are
 *    load-bearing; deleting them closes up gaps across the app.
 *  • `interp()` wraps each interpolated value in <span class="sc-interp">.
 *    That span is a flex item wherever its parent is a flex row with a `gap`,
 *    so it changes spacing. See dc-runtime.tsx.
 *
 * `v` is the flat bag of display values SuitedApp.renderVals() returns.
 */
import { Fragment } from 'react';
import { interp, css, asArray } from './dc-runtime';

import Chrome from './screens/Chrome';
import CloseRoomModal from './screens/CloseRoomModal';
import Connect from './screens/Connect';
import Docs from './screens/Docs';
import History from './screens/History';
import Backdrop from './screens/Backdrop';
import Landing from './screens/Landing';
import Leaderboard from './screens/Leaderboard';
import Lobby from './screens/Lobby';
import Profile from './screens/Profile';
import Room from './screens/Room';
import Seat from './screens/Seat';
import Settings from './screens/Settings';
import Staking from './screens/Staking';
import Table from './screens/Table';
import TableDrawer from './screens/TableDrawer';
import TournamentDetail from './screens/TournamentDetail';
import TournamentMoveOverlay from './screens/TournamentMoveOverlay';
import TournamentResult from './screens/TournamentResult';
import Tournaments from './screens/Tournaments';
import TurnPrompt from './screens/TurnPrompt';

/** `v` is whatever renderVals() returned — a flat bag of display values. */
export default function SuitedTemplate({ v }: { v: any }) {
  return (
    <>
      {/*
         min-height on content pages, hard height on the table. The lobby or the
         hand history growing past the viewport should scroll the page; the table
         growing past it is the bug where a long hand log stretched the whole
         screen — a flex column can only make its children scroll if its own
         height is capped, and min-height is a floor, not a cap.
      */}
      <div style={css(v.rootStyle)}>
        {"\r\n  "}
        {/* The shared background. See screens/Backdrop. */}
        <Backdrop />
        {"\r\n\r\n  "}
        {/* ── nav ─────────────────────────────────────────────────────────── */}
        {"\r\n  "}
        {v.chromeOn ? <Chrome v={v} /> : null}
        {"\r\n\r\n  "}
        {/* ── landing ─────────────────────────────────────────────────────── */}
        {"\r\n  "}
        {v.isLanding ? <Landing v={v} /> : null}
        {"\r\n\r\n  "}
        {/* ── connect + buy-in ────────────────────────────────────────────── */}
        {"\r\n  "}
        {v.isConnect ? <Connect v={v} /> : null}
        {"\r\n\r\n  "}
        {/* ── take a seat: only reachable once a table has been chosen ────── */}
        {"\r\n  "}
        {v.isSeat ? <Seat v={v} /> : null}
        {"\r\n\r\n  "}
        {/* ── lobby ───────────────────────────────────────────────────────── */}
        {"\r\n  "}
        {v.isLobby ? <Lobby v={v} /> : null}
        {"\r\n\r\n  "}
        {/*
           Host confirm for ending a private room. Top-level (not inside the lobby
           block) so it overlays the table, where the host triggers it. Destructive —
           everyone is stood up and the link dies — so it takes a deliberate confirm.
        */}
        {"\r\n  "}
        {v.closeRoomOn ? <CloseRoomModal v={v} /> : null}
        {"\r\n\r\n  "}
        {/* ── a private room: info card + pin, reached by a `/<slug>` link ──── */}
        {"\r\n  "}
        {v.isRoom ? <Room v={v} /> : null}
        {"\r\n\r\n  "}
        {/* ── the table ───────────────────────────────────────────────────── */}
        {"\r\n  "}
        {v.isTable ? <Table v={v} /> : null}
        {v.isTable ? <TableDrawer v={v} /> : null}
        {"\r\n\r\n  "}
        {/* ── hand history ────────────────────────────────────────────────── */}
        {"\r\n  "}
        {v.isHistory ? <History v={v} /> : null}
        {"\r\n\r\n  "}
        {/*
           ── tournaments ───────────────────────────────────────────────────
           The next event, what it pays, your own events, and the schedule. The
           hero renders whether or not anything is open: an empty schedule is the
           state this page sits in most of the time, and it still has to say what
           a suited tournament IS.
        */}
        {"\r\n  "}
        {v.isTournaments ? <Tournaments v={v} /> : null}
        {"\r\n\r\n  "}
        {/* ── tournament detail ──────────────────────────────────────────── */}
        {"\r\n  "}
        {v.isTournamentDetail ? <TournamentDetail v={v} /> : null}
        {"\r\n\r\n  "}
        {/*
           ── tournament result ───────────────────────────────────────────────
           Part 4 Task 3 routes here on bust/win (and on resume of a busted entry
           via `routeTournamentResult`) or Task 6's "view result" list row (via
           `openResult`). The payout — if any — is already credited to the
           bankroll by the runtime at elimination: there is no claim step here,
           only an offer to withdraw what's already sitting in the balance. Below
           the money, no withdraw control is shown (nothing to withdraw).
        */}
        {"\r\n  "}
        {v.isTournamentResult ? <TournamentResult v={v} /> : null}
        {"\r\n\r\n  "}
        {/* ── docs ────────────────────────────────────────────────────────── */}
        {"\r\n  "}
        {v.isDocs ? <Docs v={v} /> : null}
        {"\r\n\r\n  "}
        {/* ── staking ─────────────────────────────────────────────────────── */}
        {"\r\n  "}
        {v.isStaking ? <Staking v={v} /> : null}
        {"\r\n\r\n  "}
        {/* ── profile ─────────────────────────────────────────────────────── */}
        {"\r\n  "}
        {v.isProfile ? <Profile v={v} /> : null}
        {"\r\n\r\n  "}
        {/*
           ── settings ─────────────────────────────────────────────────────
           Device preferences, every one of them: they live in this browser's
           localStorage, so they follow the screen you play on rather than the
           wallet you play with. Two of these already had a control on the felt
           (the volume disc, the hotkey disc) — those discs stay, because reaching
           them mid-hand should not mean leaving the table. This is where you find
           them when you are not already at one.
           One row shape throughout: what it is and what it does on the left, the
           choice on the right, hairline between.
        */}
        {"\r\n  "}
        {v.isSettings ? <Settings v={v} /> : null}
        {"\r\n\r\n  "}
        {/*
           ── leaderboard ───────────────────────────────────────────────────
           One page, not three tabs: the jackpot, the board it is drawn from, and
           the record of past draws, in that order. The prize leads because it is
           the reason to read the board at all.
        */}
        {"\r\n  "}
        {v.isLeader ? <Leaderboard v={v} /> : null}
        {"\r\n\r\n  "}
        {/* away-from-table turn prompt */}
        {"\r\n  "}
        {v.turnPromptOn ? <TurnPrompt v={v} /> : null}
        {"\r\n\r\n  "}
        {/* toasts */}
        {"\r\n  "}
        <div style={{ position: "fixed", left: "18px", bottom: "18px", zIndex: "60", display: "flex", flexDirection: "column", gap: "8px", pointerEvents: "none" }}>
          {"\r\n    "}
          {asArray(v.toasts).map((t: any, $index: number) => (
            <Fragment key={$index}>
              {"\r\n      "}
              <div style={css(t?.style)}>
                {"\r\n        "}
                <span style={css(t?.dot)} />
                {"\r\n        "}
                <span>
                  {interp(t?.text)}
                </span>
                {"\r\n      "}
              </div>
              {"\r\n    "}
            </Fragment>
          ))}
          {"\r\n  "}
        </div>
        {"\r\n\r\n  "}
        {/* achievement celebrations: the new avatar, wearing its tier motion */}
        {"\r\n  "}
        <div style={{ position: "fixed", left: "50%", top: "26px", transform: "translateX(-50%)", zIndex: "70", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", pointerEvents: "none" }}>
          {"\r\n    "}
          {asArray(v.celebrations).map((c: any, $index: number) => (
            <Fragment key={$index}>
              {"\r\n      "}
              <div style={css(c?.card)}>
                {"\r\n        "}
                <span className="av" data-tier={c?.tier} style={{ width: "46px", height: "46px", flex: "none" }}>
                  <span style={css(c?.inner)} />
                </span>
                {"\r\n        "}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", paddingRight: "6px" }}>
                  {"\r\n          "}
                  <span style={{ fontSize: "9px", letterSpacing: ".24em", color: "#a78bfa" }}>{"ACHIEVEMENT UNLOCKED"}</span>
                  {"\r\n          "}
                  <span style={{ fontSize: "15px", letterSpacing: ".01em", color: "#e8ecf8" }}>
                    {interp(c?.name)}
                  </span>
                  {"\r\n          "}
                  <span style={{ fontSize: "10px", color: "#7e8aa6" }}>{"new avatar unlocked"}</span>
                  {"\r\n        "}
                </div>
                {"\r\n      "}
              </div>
              {"\r\n    "}
            </Fragment>
          ))}
          {"\r\n  "}
        </div>
        {"\r\n\r\n  "}
        {/*
           tournament auto-seat / table-move overlay (Part 4 Task 3). A courtesy
           warn + short countdown that AUTO-advances onto the (new) table — the
           field never waits on the client, so "go now" only shortcuts the clock.
           Rendered over any screen so a move lands whether the player is on the
           felt, the detail screen, or the lobby.
        */}
        {"\r\n  "}
        {v.tMoveOverlayOn ? <TournamentMoveOverlay v={v} /> : null}
      </div>
    </>
  );
}
