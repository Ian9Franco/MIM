import path from "path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Hub lives in apps/hub but secrets live in the monorepo root .env.local
loadEnvConfig(path.resolve(__dirname, "../.."));

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
