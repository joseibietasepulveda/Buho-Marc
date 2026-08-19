import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep local output separate from a stale synced build directory.
  distDir: ".next-local",
};

export default nextConfig;
