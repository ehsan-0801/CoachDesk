import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

function createClient() {
  return new PrismaClient({
    // Prisma 7 talks to Postgres through a driver adapter. `pg` pools for us,
    // and the Neon pooled URL keeps serverless connection counts sane.
    adapter: new PrismaPg({ connectionString, max: 10 }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/**
 * Next dev reloads modules on every edit; without this cache each reload would
 * open a fresh pool and exhaust Neon's connection limit within minutes.
 */
const globalForPrisma = globalThis as unknown as { __coachdeskPrisma?: PrismaClient };

export const db = globalForPrisma.__coachdeskPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.__coachdeskPrisma = db;

export type Db = typeof db;
