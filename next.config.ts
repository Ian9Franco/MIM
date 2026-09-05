import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SSE and API routes require server mode.
  output: "standalone",
  images: {
    unoptimized: true,
  },
  outputFileTracingExcludes: {
    '*': [
      'dist/**/*',
      '.git/**/*',
      'D:/.mine/source/**/*',
      'D:/.MIM/source/**/*',
      '**/.mim-index/**/*',
      '**/mim-settings.json',
    ],
  },
};

export default nextConfig;
