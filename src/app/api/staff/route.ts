import { prisma } from "@/lib/prisma";
import { requireAuth, auditLog } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, fullName: true, role: true, email: true, phone: true, licenseNo: true, isActive: true, createdAt: true },
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { username, password, fullName, role, email, phone, licenseNo } = body;

    if (!username || !password || !fullName) return NextResponse.json({ error: "Username, password and full name required" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return NextResponse.json({ error: "Username already taken" }, { status: 409 });

    const hashed = await bcrypt.hash(password, 10);
    const user   = await prisma.user.create({
      data: { username, password: hashed, fullName, role: role || "Pharmacist", email, phone, licenseNo },
      select: { id: true, username: true, fullName: true, role: true, email: true, isActive: true, createdAt: true },
    });

    await auditLog({ username: auth.user.username, action: "CREATE", entity: "User", entityId: user.id, detail: `Created staff account: ${fullName} (${role})` });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { id, isActive, role, fullName, email, phone, licenseNo } = body;
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        ...(isActive  !== undefined && { isActive }),
        ...(role      !== undefined && { role }),
        ...(fullName  !== undefined && { fullName }),
        ...(email     !== undefined && { email }),
        ...(phone     !== undefined && { phone }),
        ...(licenseNo !== undefined && { licenseNo }),
      },
      select: { id: true, username: true, fullName: true, role: true, isActive: true },
    });
    await auditLog({ username: auth.user.username, action: "UPDATE", entity: "User", entityId: Number(id), detail: `Updated staff: ${user.fullName}` });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await req.json();
    if (Number(id) === auth.user.id) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    const user = await prisma.user.delete({ where: { id: Number(id) } });
    await auditLog({ username: auth.user.username, action: "DELETE", entity: "User", entityId: Number(id), detail: `Deleted staff account: ${user.fullName}` });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
