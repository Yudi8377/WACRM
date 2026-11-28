import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const appRoot = path.dirname(fileURLToPath(import.meta.url));
const hasLocalNodeModules = fs.existsSync(path.join(appRoot, "node_modules"));

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  allowedDevOrigins: ["*.e2b.app", "localhost", "127.0.0.1"],
  ...(hasLocalNodeModules
    ? {
        outputFileTracingRoot: appRoot,
        turbopack: {
          root: appRoot,
        },
      }
    : {}),
  images: {
    unoptimized: true,
  },
  async headers() {
    const baseHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      { key: "Referrer-Policy", value: "no-referrer" },
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(self), usb=(self), serial=(self), geolocation=()",
      },
    ];

    if (isProd) {
      baseHeaders.push(
        { key: "X-Frame-Options", value: "DENY" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      );
    }

    return [
      {
        source: "/(.*)",
        headers: baseHeaders,
      },
      {
        source: "/api/licenses/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
