"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSession, destroySession, verifyPassword } from "@/server/auth";
import { db } from "@/server/db";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export type LoginState = { error?: "invalid" | "disabled" | "validation" } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "validation" };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  // The same generic answer for "no such user" and "wrong password", so the
  // form cannot be used to enumerate which email addresses have accounts.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "invalid" };
  }
  if (!user.isActive) return { error: "disabled" };

  const headerList = await headers();
  await createSession(user.id, {
    userAgent: headerList.get("user-agent") ?? undefined,
    ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
