"use client";

import { useEffect, useState } from "react";
import { ClipboardList, CheckCircle2, Search, FileText } from "lucide-react";

type Drug = { id: number; name: string; formulation: string; strength: string };
type Batch = { id: number; batchNumber: string; quantity: number; expiryDate: string };
type Dispense = {
  id: number;
  quantity: number;
  patientName: string;
  dispensedBy: string;
  notes?: string;
  createdAt: string;
  drug: Drug;
  inventory: { batchNumber: string };
};

const input = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400";

export default function DispensePage() {
  const [drugs, setDrugs]       = useState<Drug[]>([]);
  const [history, setHistory]   = useState<Dispense[]>([]);
  const [batches, setBatches]   = useState<Batch[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Form state
  const [drugId, setDrugId]           = useState("");
  const [quantity, setQuantity]       = useState("");
  const [patientName, setPatientName] = useState("");
  const [dispensedBy, setDispensedBy] = useState("Admin");
  const [notes, setNotes]             = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [success, setSuccess]         = useState("");
  const [error, setError]             = useState("");

  // FEFO preview — earliest batch for selected drug
  const today = new Date();
  const fefoPreview = batches
    .filter((b) => b.quantity > 0 && new Date(b.expiryDate) > today)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0];

  const totalAvailable = batches
    .filter((b) => b.quantity > 0 && new Date(b.expiryDate) > today)
    .reduce((s, b) => s + b.quantity, 0);

  const fetchAll = async () => {
    const [drg, hist] = await Promise.all([
      fetch("/api/drugs").then((r) => r.json()),
      fetch("/api/dispense").then((r) => r.json()),
    ]);
    setDrugs(Array.isArray(drg) ? drg : []);
    setHistory(Array.isArray(hist) ? hist : []);
    setLoading(false);
  };

  const fetchBatches = async (id: string) => {
    if (!id) { setBatches([]); return; }
    const res  = await fetch("/api/inventory");
    const data = await res.json();
    setBatches(Array.isArray(data) ? data.filter((b: any) => b.drug.id === Number(id)) : []);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDrugChange = (id: string) => {
    setDrugId(id);
    setError("");
    setSuccess("");
    fetchBatches(id);
  };

  const handleDispense = async () => {
    setError("");
    setSuccess("");
    if (!drugId || !quantity || !patientName) {
      setError("Drug, quantity and patient name are required.");
      return;
    }
    if (Number(quantity) > totalAvailable) {
      setError(`Only ${totalAvailable} units available in valid (non-expired) batches.`);
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/dispense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drugId: Number(drugId), quantity: Number(quantity), patientName, dispensedBy, notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Dispense failed.");
    } else {
      const drug = drugs.find((d) => d.id === Number(drugId));
      setSuccess(`Dispensed ${quantity} units of ${drug?.name} to ${patientName}.`);
      setDrugId(""); setQuantity(""); setPatientName(""); setNotes(""); setBatches([]);
      fetchAll();
    }
    setSubmitting(false);
  };

  const printReceipt = (d: Dispense) => {
  const html = `
    <html><head><title>Receipt</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; max-width: 400px; margin: auto; font-size: 13px; }
      .header { text-align: center; margin-bottom: 20px; }
      .header h1 { color: #15803d; font-size: 18px; margin: 0; }
      .header p { color: #6b7280; font-size: 11px; margin: 4px 0 0; }
      .divider { border: none; border-top: 1px dashed #d1d5db; margin: 16px 0; }
      .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
      .label { color: #6b7280; }
      .value { font-weight: 600; text-align: right; }
      .footer { text-align: center; color: #9ca3af; font-size: 11px; margin-top: 24px; }
    </style></head>
    <body>
      <div class="header">
        <h1>Krrish P~Kay Pharmacy</h1>
        <p>Dispensing Receipt</p>
      </div>
      <hr class="divider"/>
      <div class="row"><span class="label">Patient</span><span class="value">${d.patientName}</span></div>
      <div class="row"><span class="label">Drug</span><span class="value">${d.drug?.name} (${d.drug?.formulation})</span></div>
      <div class="row"><span class="label">Strength</span><span class="value">${d.drug?.strength}</span></div>
      <div class="row"><span class="label">Quantity</span><span class="value">${d.quantity} units</span></div>
      <div class="row"><span class="label">Batch no.</span><span class="value">${d.inventory?.batchNumber ?? "—"}</span></div>
      <div class="row"><span class="label">Dispensed by</span><span class="value">${d.dispensedBy}</span></div>
      ${d.notes ? `<div class="row"><span class="label">Notes</span><span class="value">${d.notes}</span></div>` : ""}
      <hr class="divider"/>
      <div class="row"><span class="label">Date</span><span class="value">${new Date(d.createdAt).toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })}</span></div>
      <div class="row"><span class="label">Time</span><span class="value">${new Date(d.createdAt).toLocaleTimeString("en-KE")}</span></div>
      <div class="footer">Thank you — keep this receipt for your records.</div>
    </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
};

  const filtered = history.filter((d) =>
    d.drug?.name.toLowerCase().includes(search.toLowerCase()) ||
    d.patientName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dispense</h1>
        <p className="text-sm text-gray-500">Automatically uses earliest-expiring batch first (FEFO)</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">

        {/* Dispense form */}
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <ClipboardList size={16} className="text-green-600" /> New dispense
          </h2>

          {/* Drug select */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Drug *</label>
            <select value={drugId} onChange={(e) => handleDrugChange(e.target.value)} className={input}>
              <option value="">Select drug...</option>
              {drugs.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.formulation} {d.strength})</option>)}
            </select>
          </div>

          {/* FEFO info box */}
          {drugId && (
            <div className={`rounded-xl p-3 text-sm border ${
              fefoPreview
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {fefoPreview ? (
                <>
                  <p className="font-medium">FEFO batch: <span className="font-bold">{fefoPreview.batchNumber}</span></p>
                  <p className="text-xs mt-0.5 opacity-80">
                    Expires {new Date(fefoPreview.expiryDate).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                    {" "}· {fefoPreview.quantity} units in this batch · {totalAvailable} total available
                  </p>
                </>
              ) : (
                <p className="font-medium">No valid stock available for this drug.</p>
              )}
            </div>
          )}

          {/* Quantity */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantity *</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 10" className={input} />
            {drugId && totalAvailable > 0 && (
              <p className="text-xs text-gray-400">{totalAvailable} units available</p>
            )}
          </div>

          {/* Patient name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Patient name *</label>
            <input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="e.g. Mary Wanjiku" className={input} />
          </div>

          {/* Dispensed by */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dispensed by</label>
            <input value={dispensedBy} onChange={(e) => setDispensedBy(e.target.value)} placeholder="Clinician name" className={input} />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Prescription notes..." className={input} />
          </div>

          {error   && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <CheckCircle2 size={15} /> {success}
            </div>
          )}

          <button
            onClick={handleDispense}
            disabled={submitting || !fefoPreview}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Dispensing..." : "Dispense drug"}
          </button>
        </div>

        {/* Batch breakdown for selected drug */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold text-gray-700 mb-4">
            {drugId ? `Batches for ${drugs.find((d) => d.id === Number(drugId))?.name ?? ""}` : "Select a drug to see batches"}
          </h2>

          {!drugId ? (
            <p className="text-sm text-gray-400 text-center py-8">No drug selected</p>
          ) : batches.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No stock found</p>
          ) : (
            <div className="space-y-2">
              {batches
                .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                .map((b, i) => {
                  const days = Math.ceil((new Date(b.expiryDate).getTime() - today.getTime()) / 86400000);
                  const expired = days <= 0;
                  const soon    = days > 0 && days <= 30;
                  return (
                    <div key={b.id} className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                      expired ? "bg-red-50 border-red-200" :
                      soon    ? "bg-yellow-50 border-yellow-200" :
                               "bg-gray-50 border-gray-100"
                    }`}>
                      <div>
                        <p className="font-medium text-gray-800 flex items-center gap-1.5">
                          {i === 0 && !expired && <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded-full">FEFO</span>}
                          {b.batchNumber}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Exp: {new Date(b.expiryDate).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800">{b.quantity} units</p>
                        <p className={`text-xs ${expired ? "text-red-500" : soon ? "text-yellow-600" : "text-gray-400"}`}>
                          {expired ? "Expired" : `${days}d left`}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Dispense history */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-gray-700">Dispense history</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search drug or patient..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 w-48"
              />
            </div>
            <button onClick={() => setSearch(searchInput)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl text-sm transition">Search</button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No dispense records found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                 {["Drug","Patient","Qty","Batch used","Dispensed by","Notes","Date",""].map((h) => (
                    <th key={h} className="text-left p-3 text-gray-500 font-medium text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-green-50 transition">
                    <td className="p-3 font-semibold text-gray-800">{d.drug?.name}</td>
                    <td className="p-3 text-gray-700">{d.patientName}</td>
                    <td className="p-3 font-medium text-green-700">−{d.quantity}</td>
                    <td className="p-3"><span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{d.inventory?.batchNumber ?? "—"}</span></td>
                    <td className="p-3 text-gray-500">{d.dispensedBy}</td>
                    <td className="p-3 text-gray-400 text-xs">{d.notes || "—"}</td>
                    <td className="p-3 text-gray-400 text-xs whitespace-nowrap">
  {new Date(d.createdAt).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
</td>
<td className="p-3">
  <button onClick={() => printReceipt(d)}
    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium transition">
    <FileText size={12} /> Receipt
  </button>
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
