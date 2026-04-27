"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";

type Drug = {
  id: number;
  name: string;
  formulation: string;
  strength: string;
  reorderLevel: number;
  createdAt: string;
};

const FORMULATIONS = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Inhaler"];

const emptyForm = { name: "", formulation: "Tablet", strength: "", reorderLevel: "50" };

export default function DrugsPage() {
  const [drugs, setDrugs]         = useState<Drug[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Drug | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Drug | null>(null);
  const [deleting, setDeleting]   = useState(false);
  const [error, setError]         = useState("");

  const fetchDrugs = async () => {
    const res = await fetch("/api/drugs");
    const data = await res.json();
    setDrugs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchDrugs(); }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (d: Drug) => {
    setEditTarget(d);
    setForm({ name: d.name, formulation: d.formulation, strength: d.strength, reorderLevel: String(d.reorderLevel) });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.formulation || !form.strength) {
      setError("Name, formulation and strength are required.");
      return;
    }
    setSaving(true);
    const method = editTarget ? "PUT" : "POST";
    const body   = editTarget ? { ...form, id: editTarget.id } : form;
    const res    = await fetch("/api/drugs", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setShowModal(false); fetchDrugs(); }
    else        { setError("Failed to save. Please try again."); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch("/api/drugs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTarget.id }) });
    if (res.ok) { setDeleteTarget(null); fetchDrugs(); }
    setDeleting(false);
  };

  const filtered = drugs.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.formulation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Drugs</h1>
          <p className="text-sm text-gray-500">Manage the drug formulary</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
          <Plus size={16} /> Add drug
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search name or formulation..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <button onClick={() => setSearch(searchInput)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm transition">
          Search
        </button>
        {search && (
          <button onClick={() => { setSearch(""); setSearchInput(""); }} className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition">
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Pill size={32} className="mx-auto mb-3 opacity-30" />
            <p>No drugs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Drug name","Formulation","Strength","Reorder level","Added",""].map((h) => (
                    <th key={h} className="text-left p-3 text-gray-500 font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-green-50 transition">
                    <td className="p-3 font-semibold text-gray-800">{d.name}</td>
                    <td className="p-3"><span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{d.formulation}</span></td>
                    <td className="p-3 text-gray-600">{d.strength}</td>
                    <td className="p-3 text-gray-600">{d.reorderLevel} units</td>
                    <td className="p-3 text-gray-400 text-xs">{new Date(d.createdAt).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric"})}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-green-100 text-green-700 transition"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget(d)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal title={editTarget ? "Edit drug" : "Add new drug"} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <Field label="Drug name *">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Paracetamol" className={input} />
            </Field>
            <Field label="Formulation *">
              <select value={form.formulation} onChange={(e) => setForm({ ...form, formulation: e.target.value })} className={input}>
                {FORMULATIONS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Strength *">
              <input value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} placeholder="e.g. 500mg" className={input} />
            </Field>
            <Field label="Reorder level (units)">
              <input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} placeholder="50" className={input} />
            </Field>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-60">
                {saving ? "Saving..." : editTarget ? "Save changes" : "Add drug"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Delete drug" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
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

// ── Tiny helpers ──
const input = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400";

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Pill({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
    </svg>
  );
}
