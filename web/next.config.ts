import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Allows transpiling shared code from parent directory if imported
    externalDir: true,
  },
};

export default nextConfig;
