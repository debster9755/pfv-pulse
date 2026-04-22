import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Keep Prisma out of the webpack/turbopack bundle so Node.js resolves
  // the native query engine binary at runtime
  serverExternalPackages: ["@prisma/client", "prisma", ".prisma"],

  // Explicitly include the Prisma engine binary in every API Lambda bundle.
  // Vercel's file tracer misses .node files in custom output directories.
  outputFileTracingIncludes: {
    "/api/*": [
      path.join("app", "generated", "prisma", "**"),
    ],
  },
};

export default nextConfig;
