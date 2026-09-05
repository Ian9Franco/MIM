import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    ] }];
  },
  turbopack: {
    root: __dirname,
  },
  /* config options here */
  experimental: {
    // Allows transpiling shared code from parent directory if imported
    externalDir: true,
  },
};

export default nextConfig;
