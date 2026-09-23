import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "/*": ["node_modules/better-sqlite3/**/*"],
  },
};

export default nextConfig;
