import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { assertRuntimeEnvironment } from "./src/lib/env/runtime-env";

assertRuntimeEnvironment();

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  reactStrictMode: true,
};

export default nextConfig;
