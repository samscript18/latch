import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
loadEnvConfig(repositoryRoot, process.env.NODE_ENV !== "production");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@latch/shared"],
};

export default nextConfig;
