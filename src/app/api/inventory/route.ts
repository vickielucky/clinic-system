import { prisma } from "@/lib/prisma";
import { requireAuth, auditLog } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const inventory = await prisma.inventory.findMany({
      include: { drug: true },
      orderBy: { expiryDate: "asc" },
    });
    return NextResponse.json(inventory);
  } catch {
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    if (!body.drugId || !body.quantity || !body.price || !body.batchNumber || !body.expiryDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const inventory = await prisma.inventory.create({
      data: {
        batchNumber: body.batchNumber,
        quantity:    Number(body.quantity),
        unit:        body.unit || "tablets",
        price:       Number(body.price),
        expiryDate:  new Date(body.expiryDate),
        supplier:    body.supplier || null,
        drugId:      Number(body.drugId),
      },
      include: { drug: true },
    });
    await auditLog({ username: auth.user.username, action: "CREATE", entity: "Inventory", entityId: inventory.id, detail: `Added batch ${inventory.batchNumber} for ${inventory.drug.name} — ${inventory.quantity} units` });
    return NextResponse.json(inventory);
  } catch {
    return NextResponse.json({ error: "Failed to add inventory" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const inventory = await prisma.inventory.update({
      where: { id: Number(body.id) },
      data: {
        batchNumber: body.batchNumber,
        quantity:    Number(body.quantity),
        unit:        body.unit,
        price:       Number(body.price),
        expiryDate:  new Date(body.expiryDate),
        supplier:    body.supplier || null,
      },
      include: { drug: true },
    });
    await auditLog({ username: auth.user.username, action: "UPDATE", entity: "Inventory", entityId: inventory.id, detail: `Updated batch ${inventory.batchNumber}` });
    return NextResponse.json(inventory);
  } catch {
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await req.json();

    // Guard: cannot delete batch that has dispense records
    const hasDispenses = await prisma.dispense.count({ where: { inventoryId: Number(id) } });
    if (hasDispenses > 0) {
      return NextResponse.json(
        { error: `Cannot delete: this batch has ${hasDispenses} dispense record(s).` },
        { status: 400 }
      );
    }

    await prisma.inventory.delete({ where: { id: Number(id) } });
    await auditLog({ username: auth.user.username, action: "DELETE", entity: "Inventory", entityId: Number(id), detail: `Deleted inventory batch ID ${id}` });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete batch" }, { status: 500 });
  }
}
