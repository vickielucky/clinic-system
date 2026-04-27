import { prisma } from "@/lib/prisma";
import { requireAuth, auditLog } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const drugs = await prisma.drug.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(drugs);
  } catch {
    return NextResponse.json({ error: "Failed to fetch drugs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const drug = await prisma.drug.create({
      data: {
        name:         body.name,
        formulation:  body.formulation,
        strength:     body.strength,
        reorderLevel: body.reorderLevel ? Number(body.reorderLevel) : 50,
      },
    });
    await auditLog({ username: auth.user.username, action: "CREATE", entity: "Drug", entityId: drug.id, detail: `Added drug: ${drug.name}` });
    return NextResponse.json(drug);
  } catch {
    return NextResponse.json({ error: "Failed to create drug" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const drug = await prisma.drug.update({
      where: { id: Number(body.id) },
      data: {
        name:         body.name,
        formulation:  body.formulation,
        strength:     body.strength,
        reorderLevel: body.reorderLevel ? Number(body.reorderLevel) : 50,
      },
    });
    await auditLog({ username: auth.user.username, action: "UPDATE", entity: "Drug", entityId: drug.id, detail: `Updated drug: ${drug.name}` });
    return NextResponse.json(drug);
  } catch {
    return NextResponse.json({ error: "Failed to update drug" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await req.json();

    // Guard: check for linked inventory or dispenses
    const hasInventory = await prisma.inventory.count({ where: { drugId: Number(id) } });
    const hasDispenses = await prisma.dispense.count({ where: { drugId: Number(id) } });

    if (hasInventory > 0 || hasDispenses > 0) {
      return NextResponse.json(
        { error: `Cannot delete: this drug has ${hasInventory} inventory batch(es) and ${hasDispenses} dispense record(s). Remove them first.` },
        { status: 400 }
      );
    }

    const drug = await prisma.drug.delete({ where: { id: Number(id) } });
    await auditLog({ username: auth.user.username, action: "DELETE", entity: "Drug", entityId: Number(id), detail: `Deleted drug: ${drug.name}` });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete drug" }, { status: 500 });
  }
}
