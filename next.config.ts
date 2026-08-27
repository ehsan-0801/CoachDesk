import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: import.meta.dirname,
  serverExternalPackages: ["bcryptjs", "@prisma/client", "@prisma/adapter-pg"],
  experimental: {
    // Enables `forbidden()` / `unauthorized()` and their route-level boundaries,
    // which is how RBAC failures render inside the shell instead of as a 404.
    authInterrupts: true,
  },
};

export default nextConfig;
