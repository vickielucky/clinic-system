import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

/**
 * Call at the top of any API route handler.
 * Returns { user } if authenticated, or a 401 NextResponse if not.
 *
 * Usage:
 *   const auth = await requireAuth();
 *   if (auth instanceof NextResponse) return auth;
 *   // auth.user is now available
 */
export async function requireAuth() {
  const cookieStore = await cookies();
  const authCookie  = cookieStore.get("clinic_auth")?.value;
  const userCookie  = cookieStore.get("clinic_user")?.value;

  if (authCookie !== "true" || !userCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = JSON.parse(userCookie);
    return { user };
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * Log an action to the AuditLog table.
 * Call after any successful write operation.
 */
export async function auditLog({
  userId,
  username,
  action,
  entity,
  entityId,
  detail,
}: {
  userId?:  number;
  username: string;
  action:   "CREATE" | "UPDATE" | "DELETE" | "DISPENSE" | "LOGIN" | "LOGOUT";
  entity:   string;
  entityId?: number;
  detail?:  string;
}) {
  try {
    await prisma.auditLog.create({
      data: { userId, username, action, entity, entityId, detail },
    });
  } catch (e) {
    // Never let audit logging crash the main request
    console.error("Audit log error:", e);
  }
}
