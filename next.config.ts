import type { NextConfig } from 'next';

/**
 * Fully static site: `next build` pre-renders every page to plain HTML in
 * out/, which any static host (GitHub Pages, Cloudflare Pages, Netlify,
 * Vercel) can serve. There is no server at runtime.
 */
const nextConfig: NextConfig = {
  output: 'export',
  // /games/snake/ → out/games/snake/index.html, matching the canonical URLs.
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
