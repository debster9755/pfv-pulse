import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling Prisma — it must be resolved at runtime
  // so the native query engine binary is loaded correctly by Node.js
  serverExternalPackages: ["@prisma/client", "prisma", ".prisma"],

  // Include the generated Prisma client and engine binary in Lambda bundles
  outputFileTracingIncludes: {
    "/api/*": [
      "./app/generated/prisma/**",
      "./node_modules/@prisma/client/**",
      "./node_modules/.prisma/**",
    ],
  },
};

export default nextConfig;
