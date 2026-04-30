import type { NextConfig } from "next";

import { assertRuntimeEnvironment } from "./src/lib/env/runtime-env";

assertRuntimeEnvironment();

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
