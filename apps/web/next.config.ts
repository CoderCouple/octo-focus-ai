import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@octo/shared", "@octo/diagrams"],
};

export default nextConfig;
