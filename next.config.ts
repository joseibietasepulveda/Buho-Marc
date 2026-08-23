import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep local output separate from a stale synced build directory.
  // Vercel's Next.js runtime expects the conventional `.next` directory.
  distDir: process.env.VERCEL ? ".next" : ".next-local",
  output: "standalone",
  // The local preview is opened from 127.0.0.1 by the desktop browser.
  // Allow its dev assets to hydrate so navigation and forms are interactive.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
