"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Search, AlertTriangle } from "lucide-react";

type Drug = { id: number; name: string; formulation: string; strength: string };
type Batch = {
  id: number;
  batchNumber: string;
  quantity: number;
  unit: string;
  price: number;
  expiryDate: string;
  supplier?: string;
  receivedAt: string;
  drug: Drug;
};

const UNITS = ["tablets","capsules","sachets","bags","vials","ampoules","bottles","tubes"];
const input = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400";
const emptyForm = { drugId: "", batchNumber: "", quantity: "", unit: "tablets", price: "", expiryDate: "", supplier: "" };

export default function InventoryPage() {
  const [batches, setBatches]     = useState<Batch[]>([]);
  const [drugs, setDrugs]         = useState<Drug[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearchState]  = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterExpiry, setFilterExpiry] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Batch | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState("");

  const today = new Date();

  const fetchAll = async () => {
    const [inv, drg] = await Promise.all([
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/drugs").then((r) => r.json()),
    ]);
    setBatches(Array.isArray(inv) ? inv : []);
    setDrugs(Array.isArray(drg) ? drg : []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const daysUntil = (d: string) =>
    Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000);

  const expiryStatus = (d: string) => {
    const days = daysUntil(d);
    if (days <= 0)  return { label: "Expired",       color: "red" };
    if (days <= 30) return { label: `${days}d left`,  color: "red" };
    if (days <= 90) return { label: `${days}d left`,  color: "yellow" };
    return           { label: `${days}d left`,         color: "green" };
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (b: Batch) => {
    setEditTarget(b);
    setForm({
      drugId:      String(b.drug.id),
      batchNumber: b.batchNumber,
      quantity:    String(b.quantity),
      unit:        b.unit,
      price:       String(b.price),
      expiryDate:  b.expiryDate.slice(0, 10),
      supplier:    b.supplier || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.drugId || !form.batchNumber || !form.quantity || !form.price || !form.expiryDate) {
      setError("Drug, batch number, quantity, price and expiry date are required.");
      return;
    }
    setSaving(true);
    const method = editTarget ? "PUT" : "POST";
    const body   = editTarget
      ? { ...form, id: editTarget.id, drugId: Number(form.drugId), quantity: Number(form.quantity), price: Number(form.price) }
      : { ...form, drugId: Number(form.drugId), quantity: Number(form.quantity), price: Number(form.price) };

    const res = await fetch("/api/inventory", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { setShowModal(false); fetchAll(); }
    else        { setError("Failed to save. Please try again."); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch("/api/inventory", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTarget.id }) });
    if (res.ok) { setDeleteTarget(null); fetchAll(); }
    setDeleting(false);
  };

  const filtered = batches.filter((b) => {
    const matchSearch = b.drug.name.toLowerCase().includes(search.toLowerCase()) ||
      b.batchNumber.toLowerCase().includes(search.toLowerCase());
    const days = daysUntil(b.expiryDate);
    const matchExpiry =
      filterExpiry === "all"      ? true :
      filterExpiry === "expired"  ? days <= 0 :
      filterExpiry === "soon"     ? days > 0 && days <= 30 :
      filterExpiry === "warn"     ? days > 30 && days <= 90 :
      days > 90;
    return matchSearch && matchExpiry;
  });

  const badgeColors: Record<string, string> = {
    red:    "bg-red-100 text-red-600",
    yellow: "bg-yellow-100 text-yellow-700",
    green:  "bg-green-100 text-green-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
          <p className="text-sm text-gray-500">Batch-level stock with expiry tracking</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
          <Plus size={16} /> Add stock
        </button>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "All",           val: "all",     count: batches.length },
          { label: "Expired",       val: "expired", count: batches.filter((b) => daysUntil(b.expiryDate) <= 0).length },
          { label: "Expiring soon", val: "soon",    count: batches.filter((b) => { const d = daysUntil(b.expiryDate); return d > 0 && d <= 30; }).length },
          { label: "Warning",       val: "warn",    count: batches.filter((b) => { const d = daysUntil(b.expiryDate); return d > 30 && d <= 90; }).length },
          { label: "Good",          val: "good",    count: batches.filter((b) => daysUntil(b.expiryDate) > 90).length },
        ].map(({ label, val, count }) => (
          <button
            key={val}
            onClick={() => setFilterExpiry(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
              filterExpiry === val
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-green-400"
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search drug or batch..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearchState(searchInput)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <button onClick={() => setSearchState(searchInput)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm transition">Search</button>
        {search && <button onClick={() => { setSearchState(""); setSearchInput(""); }} className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition">Clear</button>}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <AlertTriangle size={32} className="mx-auto mb-3 opacity-30" />
            <p>No batches found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Drug","Batch no.","Qty","Unit","Price (KES)","Expiry","Days left","Supplier","Received",""].map((h) => (
                    <th key={h} className="text-left p-3 text-gray-500 font-medium text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const st = expiryStatus(b.expiryDate);
                  return (
                    <tr key={b.id} className={`border-b border-gray-50 hover:bg-green-50 transition ${st.color === "red" ? "bg-red-50/40" : ""}`}>
                      <td className="p-3 font-semibold text-gray-800 whitespace-nowrap">{b.drug.name}</td>
                      <td className="p-3"><span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{b.batchNumber}</span></td>
                      <td className="p-3 font-semibold">{b.quantity}</td>
                      <td className="p-3 text-gray-500">{b.unit}</td>
                      <td className="p-3 text-gray-600">{b.price.toLocaleString()}</td>
                      <td className="p-3 text-gray-500 whitespace-nowrap">
                        {new Date(b.expiryDate).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColors[st.color]}`}>{st.label}</span>
                      </td>
                      <td className="p-3 text-gray-500">{b.supplier || "—"}</td>
                      <td className="p-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(b.receivedAt).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-green-100 text-green-700 transition"><Pencil size={14} /></button>
                          <button onClick={() => setDeleteTarget(b)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal title={editTarget ? "Edit batch" : "Add stock batch"} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <Field label="Drug *">
              <select value={form.drugId} onChange={(e) => setForm({ ...form, drugId: e.target.value })} className={input} disabled={!!editTarget}>
                <option value="">Select drug...</option>
                {drugs.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.formulation})</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Batch number *">
                <input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} placeholder="e.g. PCM-001" className={input} />
              </Field>
              <Field label="Quantity *">
                <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="100" className={input} />
              </Field>
              <Field label="Unit">
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={input}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Price per unit (KES) *">
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="50" className={input} />
              </Field>
            </div>
            <Field label="Expiry date *">
              <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className={input} />
            </Field>
            <Field label="Supplier (optional)">
              <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="e.g. Cosmos Ltd" className={input} />
            </Field>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-60">
                {saving ? "Saving..." : editTarget ? "Save changes" : "Add batch"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Delete batch" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-gray-600 mb-6">
            Delete batch <strong>{deleteTarget.batchNumber}</strong> of <strong>{deleteTarget.drug.name}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-60">
              {deleting ? "Deleting..." : "Yes, delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
