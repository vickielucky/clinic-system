import { requireAuth, auditLog } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const auth = await requireAuth();
    if (!(auth instanceof NextResponse)) {
      await auditLog({ username: auth.user.username, action: "LOGOUT", entity: "User", detail: `${auth.user.fullName} logged out` });
    }
  } catch { /* ignore */ }

  const res = NextResponse.json({ success: true });
  res.cookies.set("clinic_auth", "", { path: "/", maxAge: 0 });
  res.cookies.set("clinic_user", "", { path: "/", maxAge: 0 });
  return res;
}
