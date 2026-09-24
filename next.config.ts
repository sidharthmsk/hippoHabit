import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "/*": ["node_modules/better-sqlite3/**/*"],
  },
  experimental: {
    serverActions: {
      // Backups are uploaded through a server action. Years of history for
      // many habits is several MB of JSON; the 1 MB default is too small.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
