import type { Metadata, Viewport } from 'next';
import './globals.css';

/* The original <helmet> is reproduced here as closely as Next allows.
 *
 * Google Fonts stays a stylesheet <link> rather than next/font. Several hundred
 * inline styles name the families literally ("Inter Tight", "JetBrains Mono"),
 * so the hashed family name next/font generates would match none of them — the
 * page would silently fall back to system-ui everywhere. Instrument Serif is
 * self-hosted from /public/fonts and declared by @font-face in globals.css,
 * exactly as it was, because it carries every money figure on the felt and must
 * not depend on a CDN being reachable. */
export const metadata: Metadata = {
  title: 'Suited · onchain hold’em',
  description: 'Onchain no-limit hold’em. Provably fair, settled on chain.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        {/* The avatar tier rings. Served from /public so the sheet and the SVGs
            it points at keep the same relative paths they had before. */}
        <link rel="stylesheet" href="/avatars/tiers.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
