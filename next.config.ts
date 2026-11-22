import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  outputFileTracingIncludes: {
    "/**": ["./sqlite-export.json"],
  },
  allowedDevOrigins: ["**.run.app", "**.devtunnels.ms", "localhost:3000", "127.0.0.1:3000"],
  experimental: {
    staleTimes: {
      dynamic: 120,
      static: 300,
    },
    serverActions: {
      allowedOrigins: ["**.run.app", "**.devtunnels.ms", "localhost:3000", "127.0.0.1:3000"],
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
