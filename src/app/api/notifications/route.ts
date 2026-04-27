import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const now     = new Date();
    const in30    = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const last24h = new Date(now.getTime() -  1 * 24 * 60 * 60 * 1000);

    const [expiredBatches, expiringBatches, allDrugs, recentStock] = await Promise.all([
      prisma.inventory.findMany({ where: { expiryDate: { lt: now }, quantity: { gt: 0 } }, include: { drug: true }, orderBy: { expiryDate: "asc" } }),
      prisma.inventory.findMany({ where: { expiryDate: { gte: now, lte: in30 }, quantity: { gt: 0 } }, include: { drug: true }, orderBy: { expiryDate: "asc" } }),
      prisma.drug.findMany({ include: { inventories: true } }),
      prisma.inventory.findMany({ where: { createdAt: { gte: last24h } }, include: { drug: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

    const lowStockDrugs = allDrugs
      .map((d) => ({ id: d.id, name: d.name, reorderLevel: d.reorderLevel, totalStock: d.inventories.reduce((s, i) => s + i.quantity, 0) }))
      .filter((d) => d.totalStock < d.reorderLevel);

    type NotifType = "error" | "warning" | "success" | "info";
    const notifications: { id: string; type: NotifType; title: string; message: string; timestamp: Date }[] = [];

    if (expiredBatches.length > 0) {
      notifications.push({ id: "expired-summary", type: "error",
        title: `${expiredBatches.length} expired batch${expiredBatches.length > 1 ? "es" : ""}`,
        message: expiredBatches.slice(0,3).map((b) => `${b.drug.name} (${b.batchNumber})`).join(", ") + (expiredBatches.length > 3 ? ` +${expiredBatches.length-3} more` : ""),
        timestamp: expiredBatches[0].expiryDate });
    }

    if (expiringBatches.length > 3) {
      notifications.push({ id: "expiring-summary", type: "warning",
        title: `${expiringBatches.length} batches expiring within 30 days`,
        message: expiringBatches.slice(0,3).map((b) => { const d = Math.ceil((b.expiryDate.getTime()-now.getTime())/86400000); return `${b.drug.name} in ${d}d`; }).join(", ") + ` +${expiringBatches.length-3} more`,
        timestamp: expiringBatches[0].expiryDate });
    } else {
      expiringBatches.forEach((b) => {
        const days = Math.ceil((b.expiryDate.getTime()-now.getTime())/86400000);
        notifications.push({ id: `expiring-${b.id}`, type: "warning", title: `${b.drug.name} expiring in ${days} day${days===1?"":"s"}`, message: `Batch ${b.batchNumber} — ${b.quantity} units left`, timestamp: b.expiryDate });
      });
    }

    lowStockDrugs.forEach((d) => {
      notifications.push({ id: `lowstock-${d.id}`, type: d.totalStock===0?"error":"warning",
        title: d.totalStock===0 ? `${d.name} is out of stock` : `${d.name} stock is low`,
        message: `${d.totalStock} units remaining — reorder at ${d.reorderLevel}`, timestamp: now });
    });

    recentStock.forEach((b) => {
      notifications.push({ id: `newstock-${b.id}`, type: "success", title: `Stock added: ${b.drug.name}`, message: `${b.quantity} ${b.unit} — batch ${b.batchNumber}`, timestamp: b.createdAt });
    });

    return NextResponse.json({ notifications, counts: { total: notifications.length, errors: notifications.filter(n=>n.type==="error").length, warnings: notifications.filter(n=>n.type==="warning").length, success: notifications.filter(n=>n.type==="success").length } });
  } catch (error) {
    console.error("NOTIFICATIONS ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
