import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevents Next.js from bundling Prisma — lets Node.js resolve the native
  // query engine binary from node_modules at Lambda runtime
  serverExternalPackages: ["@prisma/client", ".prisma"],
};

export default nextConfig;
