


import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Simple in-memory rate limiter: max 5 attempts per IP per 15 minutes
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now  = Date.now();
  const data = attempts.get(ip);
  if (!data || now > data.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (data.count >= 5) return false;
  data.count++;
  return true;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many login attempts. Please wait 15 minutes." }, { status: 429 });
    }

    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    attempts.delete(ip);
    await auditLog({ userId: user.id, username: user.username, action: "LOGIN", entity: "User", detail: `${user.fullName} logged in` });

    const payload = JSON.stringify({ id: user.id, username: user.username, fullName: user.fullName, role: user.role });

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role },
    });

    // Both cookies are now httpOnly — not readable by JS
    res.cookies.set("clinic_auth", "true", { httpOnly: true, path: "/", maxAge: 86400, sameSite: "lax" });
    res.cookies.set("clinic_user", payload,  { httpOnly: true, path: "/", maxAge: 86400, sameSite: "lax" });

    return res;
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}


