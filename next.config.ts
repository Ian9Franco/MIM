import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No "output: export" — SSE and API routes require server mode.
  // Tauri reads from the Next.js dev server (nextDevUrl in tauri.conf.json).
  output: "standalone",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
