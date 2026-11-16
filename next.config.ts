import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  allowedDevOrigins: ["4pgcjs0s-3000.inc1.devtunnels.ms"],
  experimental: {
    serverActions: {
      allowedOrigins: ["4pgcjs0s-3000.inc1.devtunnels.ms"],
    },
  },
  partialPrefetching: true,
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
