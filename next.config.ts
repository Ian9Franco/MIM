import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SSE and API routes require server mode.
  output: "standalone",
<<<<<<< HEAD
  // ssh2 must execute through native Node resolution; Turbopack cannot bundle its crypto implementation.
=======
>>>>>>> 3605347 (🧪 Hermione: externalizo ssh2 del build Desktop)
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
