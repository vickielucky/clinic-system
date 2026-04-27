import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page    = Number(searchParams.get("page")  || 1);
  const limit   = Number(searchParams.get("limit") || 25);
  const action  = searchParams.get("action") || undefined;
  const entity  = searchParams.get("entity") || undefined;
  const user    = searchParams.get("user")   || undefined;

  try {
    const where = {
      ...(action && { action }),
      ...(entity && { entity }),
      ...(user   && { username: { contains: user, mode: "insensitive" as const } }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:  (page - 1) * limit,
        take:  limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
