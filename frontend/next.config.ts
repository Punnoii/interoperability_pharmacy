import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone build for the docker image; keep these native/server-only deps out of the bundler so prisma + bcrypt load at runtime
  output: 'standalone',
  serverExternalPackages: ['bcryptjs', 'jsonwebtoken', '@prisma/client', 'prisma'],
};
export default nextConfig;

