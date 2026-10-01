import SuitedClient from '@/components/SuitedClient';

/* One catch-all route for the whole site.
 *
 * The app is its own router: `parseRoute` reads location.pathname on boot and
 * on Back/Forward, and `syncUrl` pushes the path each screen owns. It claims
 * paths Next could not enumerate anyway — a private room is the bare `/<slug>`
 * of a link someone was sent — so every path renders the same client app and
 * the app decides what that path means. */
export const dynamic = 'force-static';

export default function Page() {
  return <SuitedClient />;
}
