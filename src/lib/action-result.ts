import type { ZodError } from "zod";

/** Uniform shape every form action returns, so the client wiring is identical. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

export function succeed<T>(data?: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

/** Flattens a Zod error into `{ field: firstMessage }` for inline display. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Turns an unexpected throw into a message safe to show a user. */
export function toErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof Error) {
    // Prisma's unique-constraint violation is the one users hit routinely.
    if ("code" in error && error.code === "P2002") return "This value is already in use.";
    if ("code" in error && error.code === "P2003") return "A linked record is missing.";
    if ("code" in error && error.code === "P2025") return "That record no longer exists.";
    return error.message || fallback;
  }
  return fallback;
}
