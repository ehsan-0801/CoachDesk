"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, succeed, toErrorMessage, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { APP_MODULES, ROLE_DEFAULT_PERMISSIONS, permissionMapToRows, type PermissionMap } from "@/lib/rbac";
import type { AppModule } from "@/lib/types";
import { apiPermission, hashPassword } from "@/server/auth";
import { db } from "@/server/db";

const userSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["admin", "manager", "staff"]),
  phone: z.string().trim().max(20).optional().nullable(),
  password: z.string().min(8, "At least 8 characters").optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});

export async function createUser(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await apiPermission("users", "create");

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    phone: formData.get("phone") || null,
    password: formData.get("password"),
    isActive: formData.get("isActive") !== "off",
  });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  if (!parsed.data.password) return fail("A password is required.", { password: "Required" });

  try {
    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        phone: parsed.data.phone || null,
        isActive: parsed.data.isActive,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });

    // Seed the matrix from the role's defaults so a new account is immediately
    // usable, rather than landing on a permission-denied screen.
    await db.userPermission.createMany({
      data: permissionMapToRows(user.id, ROLE_DEFAULT_PERMISSIONS[parsed.data.role]),
    });

    revalidatePath("/users");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function updateUser(
  id: number,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await apiPermission("users", "update");

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    phone: formData.get("phone") || null,
    password: formData.get("password"),
    isActive: formData.get("isActive") !== "off",
  });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));

  try {
    await db.user.update({
      where: { id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        phone: parsed.data.phone || null,
        isActive: parsed.data.isActive,
        // An empty password field means "leave it alone", not "clear it".
        ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {}),
      },
    });

    revalidatePath("/users");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

export async function deleteUser(id: number): Promise<ActionResult> {
  const actor = await apiPermission("users", "delete");
  // Removing your own account would lock you straight out of the app.
  if (actor.id === id) return fail("You cannot remove your own account.");

  try {
    const admins = await db.user.count({ where: { role: "admin", isActive: true } });
    const target = await db.user.findUnique({ where: { id }, select: { role: true } });
    // The app is unusable without at least one admin to manage permissions.
    if (target?.role === "admin" && admins <= 1) {
      return fail("This is the last admin account.");
    }

    await db.user.delete({ where: { id } });
    revalidatePath("/users");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

/** Replaces a user's whole module matrix in one write. */
export async function updatePermissions(userId: number, map: PermissionMap): Promise<ActionResult> {
  await apiPermission("users", "update");

  const validModules = new Set<string>(APP_MODULES);
  const clean: PermissionMap = {};
  for (const [module, actions] of Object.entries(map)) {
    if (validModules.has(module)) clean[module as AppModule] = actions;
  }

  try {
    await db.$transaction([
      db.userPermission.deleteMany({ where: { userId } }),
      db.userPermission.createMany({ data: permissionMapToRows(userId, clean) }),
    ]);
    revalidatePath("/users");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(20).optional().nullable(),
  currentPassword: z.string().optional().or(z.literal("")),
  newPassword: z.string().min(8, "At least 8 characters").optional().or(z.literal("")),
});

export async function updateProfile(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { apiUser, verifyPassword } = await import("@/server/auth");
  const actor = await apiUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || null,
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));

  try {
    const data: { name: string; phone: string | null; passwordHash?: string } = {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
    };

    if (parsed.data.newPassword) {
      const record = await db.user.findUnique({ where: { id: actor.id } });
      // Changing a password requires proving you know the current one, so a
      // borrowed session cannot lock the real owner out.
      if (!record || !(await verifyPassword(parsed.data.currentPassword ?? "", record.passwordHash))) {
        return fail("Current password is incorrect.", { currentPassword: "Incorrect" });
      }
      data.passwordHash = await hashPassword(parsed.data.newPassword);
    }

    await db.user.update({ where: { id: actor.id }, data });
    revalidatePath("/profile");
    return succeed();
  } catch (error) {
    return fail(toErrorMessage(error));
  }
}
