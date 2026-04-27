"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingDown, AlertTriangle, Package, ClipboardList, FileText } from "lucide-react";

type Drug     = { id: number; name: string; formulation: string; strength: string; reorderLevel: number };
type Batch    = { id: number; batchNumber: string; quantity: number; unit: string; price: number; expiryDate: string; drug: Drug };
type Dispense = {
  id: number; quantity: number; patientName: string; dispensedBy: string;
  notes?: string; createdAt: string; drug: Drug; inventory: { batchNumber: string };
};

const COLORS = ["#16a34a","#2563eb","#d97706","#dc2626","#7c3aed","#0891b2","#db2777","#65a30d"];

export default function ReportsPage() {
  const [drugs,     setDrugs]     = useState<Drug[]>([]);
  const [batches,   setBatches]   = useState<Batch[]>([]);
  const [dispenses, setDispenses] = useState<Dispense[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/drugs").then((r) => r.json()),
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/dispense").then((r) => r.json()),
    ]).then(([d, i, disp]) => {
      setDrugs(Array.isArray(d) ? d : []);
      setBatches(Array.isArray(i) ? i : []);
      setDispenses(Array.isArray(disp) ? disp : []);
      setLoading(false);
    });
  }, []);

  const today   = new Date();
  const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000);

  // Date-filtered dispenses
  const filtered = dispenses.filter((d) => {
    const date = new Date(d.createdAt);
    if (dateFrom && date < new Date(dateFrom)) return false;
    if (dateTo   && date > new Date(dateTo))   return false;
    return true;
  });

  // ── Stats ──
  const totalDispensed = filtered.reduce((s, d) => s + d.quantity, 0);
  const uniquePatients = new Set(filtered.map((d) => d.patientName)).size;
  const stockValue     = batches.reduce((s, b) => s + b.price * b.quantity, 0);
  const totalStock     = batches.reduce((s, b) => s + b.quantity, 0);

  // ── Stock per drug ──
  const stockPerDrug: Record<number, number> = {};
  batches.forEach((b) => { stockPerDrug[b.drug.id] = (stockPerDrug[b.drug.id] || 0) + b.quantity; });
  const lowStockDrugs = drugs.filter((d) => (stockPerDrug[d.id] ?? 0) < d.reorderLevel);

  // ── Expiry buckets ──
  const expiredBatches = batches.filter((b) => daysUntil(b.expiryDate) <= 0);
  const expiringSoon   = batches.filter((b) => { const d = daysUntil(b.expiryDate); return d > 0 && d <= 30; });
  const expiringWarn   = batches.filter((b) => { const d = daysUntil(b.expiryDate); return d > 30 && d <= 90; });
  const goodBatches    = batches.filter((b) => daysUntil(b.expiryDate) > 90);

  // ── Chart 1: Consumption by drug (bar) ──
  const consumptionMap: Record<string, number> = {};
  filtered.forEach((d) => { consumptionMap[d.drug?.name] = (consumptionMap[d.drug?.name] || 0) + d.quantity; });
  const consumptionData = Object.entries(consumptionMap)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty);

  // ── Chart 2: Dispenses over time (line) — group by date ──
  const timeMap: Record<string, number> = {};
  filtered.forEach((d) => {
    const day = new Date(d.createdAt).toLocaleDateString("en-KE", { day: "2-digit", month: "short" });
    timeMap[day] = (timeMap[day] || 0) + d.quantity;
  });
  const timeData = Object.entries(timeMap)
    .map(([date, qty]) => ({ date, qty }))
    .slice(-14); // last 14 days max

  // ── Chart 3: Stock distribution by drug (bar) ──
  const stockData = drugs
    .map((d) => ({ name: d.name, stock: stockPerDrug[d.id] ?? 0, reorder: d.reorderLevel }))
    .sort((a, b) => b.stock - a.stock);

  // ── Chart 4: Expiry risk pie ──
  const expiryPieData = [
    { name: "Expired",       value: expiredBatches.length, color: "#dc2626" },
    { name: "< 30 days",     value: expiringSoon.length,   color: "#f97316" },
    { name: "30–90 days",    value: expiringWarn.length,   color: "#d97706" },
    { name: "Good (>90d)",   value: goodBatches.length,    color: "#16a34a" },
  ].filter((d) => d.value > 0);

  // ── CSV Export ──
 const exportPDF = () => {
  const rows = filtered.map((d) => `
    <tr>
      <td>${d.drug?.name}</td>
      <td>${d.drug?.formulation}</td>
      <td>${d.patientName}</td>
      <td>${d.quantity}</td>
      <td>${d.inventory?.batchNumber ?? "—"}</td>
      <td>${d.dispensedBy}</td>
      <td>${d.notes || "—"}</td>
      <td>${new Date(d.createdAt).toLocaleDateString("en-KE")}</td>
    </tr>`).join("");

  const html = `
    <html><head><title>Dispense Report</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; font-size: 12px; }
      h1 { color: #15803d; margin-bottom: 4px; }
      p.sub { color: #6b7280; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f3f4f6; text-align: left; padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
      td { padding: 8px; border-bottom: 1px solid #f3f4f6; }
      tr:hover td { background: #f0fdf4; }
    </style></head>
    <body>
      <h1>Krrish P~Kay Pharmacy</h1>
      <p class="sub">Dispense Report — generated ${new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })}</p>
      <table>
        <thead><tr>
          <th>Drug</th><th>Form</th><th>Patient</th><th>Qty</th>
          <th>Batch</th><th>By</th><th>Notes</th><th>Date</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
};

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-sm text-gray-500">Consumption analytics, stock health and expiry risk</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date filter */}
          <label className="text-xs text-gray-400">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <label className="text-xs text-gray-400">To</label>
          <input type="date" value={dateTo}   onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="text-xs text-gray-400 hover:text-red-500 transition">Clear</button>
          )}
          {/* Export */}
         <button onClick={exportPDF}
  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition">
  <FileText size={14} /> Export PDF
</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<ClipboardList size={18} />} label="Units dispensed"  value={totalDispensed.toLocaleString()} color="green" />
        <StatCard icon={<Package       size={18} />} label="Total stock"      value={totalStock.toLocaleString()}     color="blue" />
        <StatCard icon={<TrendingDown  size={18} />} label="Unique patients"  value={uniquePatients}                  color="purple" />
        <StatCard icon={<Package       size={18} />} label="Stock value (KES)" value={stockValue.toLocaleString()}   color="teal" highlight />
      </div>

      {/* Row 1: Line chart + Bar chart */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Dispenses over time */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4 text-sm">Dispense trend (units over time)</h2>
          {timeData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Line type="monotone" dataKey="qty" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4, fill: "#16a34a" }} name="Units dispensed" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Consumption by drug */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4 text-sm">Consumption by drug (units dispensed)</h2>
          {consumptionData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={consumptionData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Bar dataKey="qty" name="Units dispensed" radius={[6, 6, 0, 0]}>
                  {consumptionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Stock levels + Expiry pie */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Stock levels vs reorder */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4 text-sm">Stock levels vs reorder level</h2>
          {stockData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stockData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="stock"   name="Current stock"  fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reorder" name="Reorder level"  fill="#fca5a5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expiry risk pie */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4 text-sm">Expiry risk breakdown (batches)</h2>
          {expiryPieData.length === 0 ? (
            <EmptyChart label="No inventory batches" />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={expiryPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" paddingAngle={3}>
                    {expiryPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {expiryPieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-600 flex-1">{d.name}</span>
                    <span className="font-semibold text-gray-800">{d.value}</span>
                  </div>
                ))}
                <p className="text-[10px] text-gray-400 pt-1">{batches.length} total batches</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Low stock table */}
      {lowStockDrugs.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2 text-sm">
            <AlertTriangle size={15} className="text-yellow-500" /> Low stock drugs
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Drug","Formulation","Current stock","Reorder level","Status"].map((h) => (
                    <th key={h} className="text-left p-3 text-gray-500 font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lowStockDrugs.map((d) => {
                  const current = stockPerDrug[d.id] ?? 0;
                  return (
                    <tr key={d.id} className="border-b border-gray-50 hover:bg-yellow-50 transition">
                      <td className="p-3 font-semibold">{d.name}</td>
                      <td className="p-3 text-gray-500">{d.formulation}</td>
                      <td className="p-3 font-bold text-red-600">{current}</td>
                      <td className="p-3 text-gray-500">{d.reorderLevel}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${current === 0 ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>
                          {current === 0 ? "Out of stock" : "Low"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full audit log */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700 text-sm">Full dispense log</h2>
          <span className="text-xs text-gray-400">{filtered.length} records</span>
        </div>
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No records in selected period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Drug","Formulation","Patient","Qty","Batch","Dispensed by","Notes","Date"].map((h) => (
                    <th key={h} className="text-left p-3 text-gray-500 font-medium text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-green-50 transition">
                    <td className="p-3 font-semibold text-gray-800">{d.drug?.name}</td>
                    <td className="p-3 text-gray-500">{d.drug?.formulation}</td>
                    <td className="p-3 text-gray-700">{d.patientName}</td>
                    <td className="p-3 font-medium text-green-700">−{d.quantity}</td>
                    <td className="p-3"><span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{d.inventory?.batchNumber ?? "—"}</span></td>
                    <td className="p-3 text-gray-500">{d.dispensedBy}</td>
                    <td className="p-3 text-gray-400 text-xs">{d.notes || "—"}</td>
                    <td className="p-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(d.createdAt).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyChart({ label = "No data in selected period" }: { label?: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-xl">
      {label}
    </div>
  );
}

function StatCard({ icon, label, value, color, highlight }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; highlight?: boolean;
}) {
  const iconColor: Record<string, string> = {
    green: "text-green-600", blue: "text-blue-600", purple: "text-purple-600", teal: "text-teal-600",
  };
  return (
    <div className={`rounded-2xl shadow p-4 md:p-5 ${highlight ? "bg-green-600 text-white" : "bg-white"}`}>
      <div className={`mb-2 ${highlight ? "text-white/80" : iconColor[color]}`}>{icon}</div>
      <p className={`text-xs mb-1 ${highlight ? "text-white/70" : "text-gray-500"}`}>{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-white" : "text-gray-800"}`}>{value}</p>
    </div>
  );
}
