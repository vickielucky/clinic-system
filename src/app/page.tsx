"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, TrendingDown, Package, Pill, ClipboardList, Clock } from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, Tooltip, AreaChart, Area,
} from "recharts";

type Drug     = { id: number; name: string; formulation: string; strength: string; reorderLevel: number };
type Inventory = { id: number; batchNumber: string; quantity: number; unit: string; price: number; expiryDate: string; drug: Drug };
type Dispense  = { id: number; quantity: number; patientName: string; dispensedBy: string; createdAt: string; drug: Drug; inventory: { batchNumber: string } };

export default function DashboardPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [drugs,     setDrugs]     = useState<Drug[]>([]);
  const [dispenses, setDispenses] = useState<Dispense[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/drugs").then((r) => r.json()),
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/dispense").then((r) => r.json()),
    ]).then(([d, i, disp]) => {
      setDrugs(Array.isArray(d) ? d : []);
      setInventory(Array.isArray(i) ? i : []);
      setDispenses(Array.isArray(disp) ? disp : []);
      setLoading(false);
    });
  }, []);

  const today = new Date();

  const totalStock = inventory.reduce((s, i) => s + i.quantity, 0);

  const expiringBatches = inventory
    .filter((i) => { const d = Math.ceil((new Date(i.expiryDate).getTime() - today.getTime()) / 86400000); return d > 0 && d <= 30; })
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const expiredBatches = inventory.filter((i) => new Date(i.expiryDate) < today);

  const stockPerDrug: Record<number, number> = {};
  inventory.forEach((i) => { stockPerDrug[i.drug.id] = (stockPerDrug[i.drug.id] || 0) + i.quantity; });
  const lowStockDrugs = drugs.filter((d) => (stockPerDrug[d.id] ?? 0) < d.reorderLevel);

  const grouped = Object.values(
    inventory.reduce((acc: Record<number, Inventory & { totalQty: number }>, item) => {
      const key = item.drug.id;
      if (!acc[key]) acc[key] = { ...item, totalQty: 0 };
      acc[key].totalQty += item.quantity;
      return acc;
    }, {})
  ).filter((item) => search ? item.drug.name.toLowerCase().includes(search.toLowerCase()) : true);

  const recentDispenses = dispenses.slice(0, 5);

  // ── Sparkline data ──

  // Dispenses per day (last 7 days)
  const dispenseTrend = Array.from({ length: 7 }, (_, i) => {
    const d   = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      day: d.toLocaleDateString("en-KE", { weekday: "short" }),
      qty: dispenses.filter((x) => x.createdAt.slice(0, 10) === key).reduce((s, x) => s + x.quantity, 0),
    };
  });

  // Stock levels per drug (top 7)
  const stockSparkline = drugs.slice(0, 7).map((d) => ({
    name: d.name,
    stock: stockPerDrug[d.id] ?? 0,
  }));

  // Expiry buckets for mini pie-like bars
  const expiryBuckets = [
    { label: "Expired",  value: expiredBatches.length,                                                                              color: "#dc2626" },
    { label: "<30d",     value: expiringBatches.length,                                                                             color: "#f97316" },
    { label: "30-90d",   value: inventory.filter((b) => { const d = Math.ceil((new Date(b.expiryDate).getTime() - today.getTime()) / 86400000); return d > 30 && d <= 90; }).length, color: "#d97706" },
    { label: "Good",     value: inventory.filter((b) => Math.ceil((new Date(b.expiryDate).getTime() - today.getTime()) / 86400000) > 90).length, color: "#16a34a" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-green-400">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Welcome back, Admin —{" "}
          {today.toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stat cards with sparklines */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* Total drugs */}
        <StatCard icon={<Pill size={18} />} label="Total drugs" value={drugs.length} color="green">
          <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={stockSparkline} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Area type="monotone" dataKey="stock" stroke="#16a34a" fill="#dcfce7" strokeWidth={1.5} dot={false} />
              <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "8px", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} formatter={(v) => [v, "stock"]} />
            </AreaChart>
          </ResponsiveContainer>
        </StatCard>

        {/* Total stock */}
        <StatCard icon={<Package size={18} />} label="Total stock" value={totalStock.toLocaleString()} color="blue" highlight>
          <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={dispenseTrend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Area type="monotone" dataKey="qty" stroke="rgba(255,255,255,0.8)" fill="rgba(255,255,255,0.2)" strokeWidth={1.5} dot={false} />
              <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "8px", border: "none" }} formatter={(v) => [v, "dispensed"]} />
            </AreaChart>
          </ResponsiveContainer>
        </StatCard>

        {/* Expiring */}
        <StatCard icon={<AlertTriangle size={18} />} label="Expiring ≤30 days" value={expiringBatches.length} color="yellow">
          <div className="flex items-end gap-1 h-10">
            {expiryBuckets.map((b) => (
              <div key={b.label} className="flex flex-col items-center gap-0.5 flex-1">
                <div className="w-full rounded-sm" style={{ height: `${Math.max(4, (b.value / Math.max(1, inventory.length)) * 32)}px`, background: b.color }} />
                <span className="text-[8px] text-gray-400">{b.label}</span>
              </div>
            ))}
          </div>
        </StatCard>

        {/* Low stock */}
        <StatCard icon={<TrendingDown size={18} />} label="Low stock alerts" value={lowStockDrugs.length} color="red">
          <ResponsiveContainer width="100%" height={40}>
            <LineChart data={dispenseTrend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Line type="monotone" dataKey="qty" stroke="#dc2626" strokeWidth={1.5} dot={false} />
              <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "8px", border: "none" }} formatter={(v) => [v, "dispensed"]} />
            </LineChart>
          </ResponsiveContainer>
        </StatCard>
      </div>

      {/* Alerts row */}
      {(expiringBatches.length > 0 || lowStockDrugs.length > 0 || expiredBatches.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">

          {(expiringBatches.length > 0 || expiredBatches.length > 0) && (
            <AlertCard title="Expiry alerts" icon={<Clock size={16} className="text-yellow-600" />} badgeColor="yellow" count={expiringBatches.length + expiredBatches.length}>
              <table className="w-full text-xs">
                <thead><tr className="text-gray-400 border-b">
                  <th className="text-left py-1.5">Drug</th><th className="text-left py-1.5">Batch</th>
                  <th className="text-left py-1.5">Expiry</th><th className="text-left py-1.5">Status</th>
                </tr></thead>
                <tbody>
                  {[...expiredBatches, ...expiringBatches].slice(0, 5).map((b) => {
                    const days = Math.ceil((new Date(b.expiryDate).getTime() - today.getTime()) / 86400000);
                    const ec   = days <= 0 ? "red" : "yellow";
                    return (
                      <tr key={b.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{b.drug.name}</td>
                        <td className="py-2 text-gray-500">{b.batchNumber}</td>
                        <td className="py-2 text-gray-500">{new Date(b.expiryDate).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td className="py-2"><Badge color={ec}>{days <= 0 ? "Expired" : `${days}d`}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </AlertCard>
          )}

          {lowStockDrugs.length > 0 && (
            <AlertCard title="Low stock warnings" icon={<TrendingDown size={16} className="text-red-500" />} badgeColor="red" count={lowStockDrugs.length}>
              <table className="w-full text-xs">
                <thead><tr className="text-gray-400 border-b">
                  <th className="text-left py-1.5">Drug</th><th className="text-left py-1.5">Current</th>
                  <th className="text-left py-1.5">Reorder at</th><th className="text-left py-1.5">Status</th>
                </tr></thead>
                <tbody>
                  {lowStockDrugs.map((d) => {
                    const current = stockPerDrug[d.id] ?? 0;
                    return (
                      <tr key={d.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{d.name}</td>
                        <td className="py-2 text-gray-500">{current}</td>
                        <td className="py-2 text-gray-500">{d.reorderLevel}</td>
                        <td className="py-2"><Badge color={current === 0 ? "red" : "yellow"}>{current === 0 ? "Out" : "Low"}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </AlertCard>
          )}
        </div>
      )}

      {/* Stock overview + Recent dispenses */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Stock overview</h2>
            <div className="flex gap-2">
              <input placeholder="Search drug..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                className="border border-gray-200 text-sm px-3 py-1.5 rounded-lg w-36 focus:outline-none focus:ring-2 focus:ring-green-400" />
              <button onClick={() => setSearch(searchInput)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg transition">
                Search
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Drug","Form","Qty","Unit","Price"].map((h) => (
                    <th key={h} className="text-left p-2.5 text-gray-500 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-6 text-gray-400 text-sm">No drugs found</td></tr>
                ) : grouped.map((item) => {
                  const isLow = (stockPerDrug[item.drug.id] ?? 0) < item.drug.reorderLevel;
                  return (
                    <tr key={item.drug.id} className={`border-b hover:bg-green-50 transition ${isLow ? "bg-red-50/40" : ""}`}>
                      <td className="p-2.5 font-medium">{item.drug.name}</td>
                      <td className="p-2.5 text-gray-500 text-xs">{item.drug.formulation}</td>
                      <td className="p-2.5 font-semibold">{item.totalQty}</td>
                      <td className="p-2.5 text-gray-500 text-xs">{item.unit}</td>
                      <td className="p-2.5 text-gray-500 text-xs">KES {item.price}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Recent dispenses</h2>
            <a href="/dispense" className="text-xs text-green-600 hover:underline">View all →</a>
          </div>
          {recentDispenses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No dispenses yet</p>
          ) : (
            <div className="space-y-3">
              {recentDispenses.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-green-50 transition">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.drug?.name}</p>
                    <p className="text-xs text-gray-400">{d.patientName} · {d.inventory?.batchNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-700">−{d.quantity} units</p>
                    <p className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Small components ── */
function StatCard({ icon, label, value, color, highlight, children }: {
  icon: React.ReactNode; label: string; value: string | number;
  color: string; highlight?: boolean; children?: React.ReactNode;
}) {
  const iconColor: Record<string, string> = { green: "text-green-600", blue: "text-blue-600", yellow: "text-yellow-500", red: "text-red-500" };
  return (
    <div className={`rounded-2xl shadow p-4 md:p-5 ${highlight ? "bg-blue-600 text-white" : "bg-white"}`}>
      <div className={`mb-1 ${highlight ? "text-white/80" : iconColor[color]}`}>{icon}</div>
      <p className={`text-xs mb-0.5 ${highlight ? "text-white/70" : "text-gray-500"}`}>{label}</p>
      <p className={`text-2xl font-bold mb-2 ${highlight ? "text-white" : "text-gray-800"}`}>{value}</p>
      {children}
    </div>
  );
}

function AlertCard({ title, icon, badgeColor, count, children }: {
  title: string; icon: React.ReactNode; badgeColor: "yellow"|"red"; count: number; children: React.ReactNode;
}) {
  const badge = { yellow: "bg-yellow-100 text-yellow-700", red: "bg-red-100 text-red-600" };
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">{icon}<h2 className="font-semibold text-gray-700">{title}</h2></div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge[badgeColor]}`}>{count}</span>
      </div>
      {children}
    </div>
  );
}

function Badge({ color, children }: { color: "red"|"yellow"|"green"; children: React.ReactNode }) {
  const cls = { red: "bg-red-100 text-red-600", yellow: "bg-yellow-100 text-yellow-700", green: "bg-green-100 text-green-700" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[color]}`}>{children}</span>;
}
