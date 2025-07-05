import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Adjust based on expected audio file size
    },
  },
  serverExternalPackages: ["@mysten/walrus", "@mysten/walrus-wasm"],
};

export default nextConfig;
