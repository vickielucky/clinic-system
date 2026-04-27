
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(auth.user);
}
