import type { NextConfig } from "next";

const pkg = require("./package.json") as { version: string };

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // SSE and API routes require server mode.
  output: "standalone",
  // ssh2 must execute through native Node resolution; Turbopack cannot bundle its crypto implementation.
  serverExternalPackages: ["ssh2"],
  images: {
    unoptimized: true,
  },
  outputFileTracingExcludes: {
    '*': [
      'dist/**/*',
      '.git/**/*',
      'D:/.mine/source/**/*',
    ],
  },
};

export default nextConfig;
