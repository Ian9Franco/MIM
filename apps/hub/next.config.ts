import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Monorepo: next is hoisted to the repo root (npm workspaces).
    root: path.resolve(__dirname, "../.."),
  },
  /* config options here */
  experimental: {
    // Allows transpiling shared code from parent directory if imported
    externalDir: true,
  },
};

export default nextConfig;
