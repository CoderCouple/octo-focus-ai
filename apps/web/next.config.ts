import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@octofocus/shared", "@octofocus/diagrams"],
};

export default nextConfig;
