import { prisma } from "@/lib/prisma";
import { requireAuth, auditLog } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await prisma.dispense.findMany({
      include: { drug: true, inventory: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch dispenses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { drugId, quantity, patientName, notes } = body;
    const dispensedBy = auth.user.fullName; // always use logged-in user's name

    if (!drugId || !quantity || !patientName) {
      return NextResponse.json({ error: "drugId, quantity and patientName are required" }, { status: 400 });
    }

    const qty = Number(quantity);

    // FEFO: earliest expiry first, only valid stock
    const batches = await prisma.inventory.findMany({
      where: { drugId: Number(drugId), quantity: { gt: 0 }, expiryDate: { gt: new Date() } },
      orderBy: { expiryDate: "asc" },
    });

    const totalAvailable = batches.reduce((s, b) => s + b.quantity, 0);
    if (totalAvailable < qty) {
      return NextResponse.json(
        { error: `Not enough stock. Only ${totalAvailable} units available.` },
        { status: 400 }
      );
    }

    let remaining = qty;
    const records = [];

    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, batch.quantity);

      await prisma.inventory.update({
        where: { id: batch.id },
        data:  { quantity: batch.quantity - take },
      });

      const record = await prisma.dispense.create({
        data: { drugId: Number(drugId), inventoryId: batch.id, quantity: take, patientName, dispensedBy, notes: notes || null },
        include: { drug: true, inventory: true },
      });

      records.push(record);
      remaining -= take;
    }

    const drug = await prisma.drug.findUnique({ where: { id: Number(drugId) } });
    await auditLog({ username: auth.user.username, action: "DISPENSE", entity: "Dispense", detail: `Dispensed ${qty} units of ${drug?.name} to ${patientName}` });

    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Dispense failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await req.json();

    // Restore stock before deleting
    const dispense = await prisma.dispense.findUnique({
      where: { id: Number(id) }, include: { drug: true, inventory: true },
    });
    if (!dispense) return NextResponse.json({ error: "Record not found" }, { status: 404 });

    await prisma.inventory.update({
      where: { id: dispense.inventoryId },
      data:  { quantity: { increment: dispense.quantity } },
    });

    await prisma.dispense.delete({ where: { id: Number(id) } });
    await auditLog({ username: auth.user.username, action: "DELETE", entity: "Dispense", entityId: Number(id), detail: `Voided dispense of ${dispense.quantity} ${dispense.drug.name} to ${dispense.patientName} — stock restored` });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to void dispense" }, { status: 500 });
  }
}
