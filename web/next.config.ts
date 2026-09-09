import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  /* config options here */
  experimental: {
    // Allows transpiling shared code from parent directory if imported
    externalDir: true,
  },
};

export default nextConfig;
