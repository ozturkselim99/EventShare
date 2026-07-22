import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's webpack resolves pnpm workspace packages through the symlinked
  // source directory rather than package.json's `exports`/dist output, so
  // it needs to be told to transpile @eventshare/shared itself.
  transpilePackages: ["@eventshare/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ["*"] },
  },
};

export default nextConfig;
