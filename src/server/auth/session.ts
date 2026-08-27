import "server-only";

import { randomBytes } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";

import { rowsToPermissionMap, type SessionUser } from "@/lib/rbac";
import { db } from "@/server/db";

export const SESSION_COOKIE = "coachdesk_session";

const MAX_AGE_DAYS = Number(process.env.SESSION_MAX_AGE_DAYS ?? 7);
const MAX_AGE_SECONDS = MAX_AGE_DAYS * 24 * 60 * 60;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return new TextEncoder().encode(secret);
}

/** The cookie carries only a signed session id — never the user's permissions,
 *  so revoking access takes effect on the next request rather than at expiry. */
async function signSessionId(sessionId: string) {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_DAYS}d`)
    .sign(secretKey());
}

async function readSessionId(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return typeof payload.sid === "string" ? payload.sid : null;
  } catch {
    return null;
  }
}

export async function createSession(userId: number, meta?: { userAgent?: string; ipAddress?: string }) {
  const sessionId = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);

  await db.session.create({
    data: {
      id: sessionId,
      userId,
      expiresAt,
      userAgent: meta?.userAgent?.slice(0, 500),
      ipAddress: meta?.ipAddress?.slice(0, 64),
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSessionId(sessionId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  // Opportunistic cleanup keeps the table from growing without a cron job.
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  return sessionId;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const sessionId = await readSessionId(token);
    if (sessionId) await db.session.deleteMany({ where: { id: sessionId } });
  }
  jar.delete(SESSION_COOKIE);
}

/**
 * Resolves the current user from the session cookie. Cached per request so a
 * page and its nested layouts share one round trip.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sessionId = await readSessionId(token);
  if (!sessionId) return null;

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: { include: { permissions: true } } },
  });

  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  if (!session.user.isActive) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    permissions: rowsToPermissionMap(session.user.permissions),
  };
});
