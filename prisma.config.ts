import "dotenv/config";
import path from "node:path";

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct connection: the pooled URL goes through
    // pgbouncer, which cannot run DDL in the way Migrate expects.
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
