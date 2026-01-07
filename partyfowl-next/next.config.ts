import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow other local devices to load internal Next.js assets during development.
  allowedDevOrigins: ["192.168.1.30"],
};

export default nextConfig;
