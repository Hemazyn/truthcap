import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This checkout can sit inside a directory that has its own lockfile; pin the
  // workspace root so Turbopack only watches and traces this project.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
