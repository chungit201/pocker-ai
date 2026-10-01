'use client';

import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import SuitedApp from './SuitedApp';
import WalletProviders from '@/wallet/Providers';

/* Mounts the app in its own React root, the way support.js did.
 *
 * This is not ceremony — it is the one structural thing Next changes that the
 * app can feel. React delegates events at its ROOT CONTAINER, and the old
 * runtime's container was the <div id="dc-root"> it created inside <body>.
 * Next's App Router renders <html> and <body> itself, so its container is the
 * document — the very node this app adds a click listener to in order to close
 * the account, avatar, achievements and `more` menus.
 *
 * Seventeen handlers call e.stopPropagation() to keep their own click away
 * from that listener, and the comment on the first one says so outright:
 * "stopPropagation, or the document listener that closes it would fire on the
 * very click that opened it". stopPropagation stops an event travelling UP the
 * tree; it does nothing about a second listener on the SAME node. Under Next's
 * document-level container both are on the document, so every menu opened and
 * shut again on the same click — the `more` menu never appeared at all.
 *
 * Rendering into a nested root puts the delegation back below the document, so
 * all seventeen work exactly as they did and not one line of app logic had to
 * be rewritten to suit the host. The app uses no context, which is the usual
 * reason to avoid a nested root.
 *
 * The app renders in the browser only, which is why this is an effect rather
 * than JSX: every screen derives from a WebSocket, a wallet and a felt measured
 * with a ResizeObserver, so there is no first paint worth producing on the
 * server. The original page had no server rendering either.
 */
/* One root per container element, for the lifetime of that element.
   React's development double-invoke runs mount → cleanup → mount against the
   same div, and calling createRoot on a container twice is an error, so the
   root is kept and reused rather than torn down and rebuilt. */
const ROOTS = new WeakMap<Element, Root>();

export default function SuitedClient() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let root = ROOTS.get(el);
    if (!root) {
      root = createRoot(el);
      ROOTS.set(el, root);
    }
    /* The wallet providers go INSIDE this root, not around it on the page.
       React context does not cross a root boundary, so providers mounted
       outside would be invisible to everything in here — the hooks in
       wallet/Bridge.tsx would find no wagmi config and nothing would connect. */
    root.render(
      <WalletProviders>
        <SuitedApp />
      </WalletProviders>,
    );

    // Emptying the root rather than unmounting it still runs the app's
    // componentWillUnmount — which is where it gives back its listeners,
    // timers, adapter, wallet subscription and audio context — while leaving
    // the container's root intact for the remount that follows.
    return () => { root!.render(<></>); };
  }, []);

  return <div ref={host} className="dc-mount" />;
}
