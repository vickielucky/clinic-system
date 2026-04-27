"use client";

import { useEffect, useState } from "react";
import { Shield, ChevronLeft, ChevronRight, Search } from "lucide-react";

type Log = {
  id: number; username: string; action: string;
  entity: string; entityId?: number; detail?: string; createdAt: string;
};

const ACTION_COLORS: Record<string, string> = {
  CREATE:   "bg-green-100 text-green-700",
  UPDATE:   "bg-blue-100 text-blue-700",
  DELETE:   "bg-red-100 text-red-600",
  DISPENSE: "bg-purple-100 text-purple-700",
  LOGIN:    "bg-gray-100 text-gray-600",
  LOGOUT:   "bg-gray-100 text-gray-500",
};

export default function AuditPage() {
  const [logs,    setLogs]    = useState<Log[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [action,  setAction]  = useState("");
  const [entity,  setEntity]  = useState("");
  const [user,    setUser]    = useState("");
  const [userInput, setUserInput] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (action) params.set("action", action);
    if (entity) params.set("entity", entity);
    if (user)   params.set("user",   user);
    const res  = await fetch(`/api/audit?${params}`);
    const data = await res.json();
    setLogs(data.logs  || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, action, entity, user]);

  const timeAgo = (ts: string) => {
    const diff  = Date.now() - new Date(ts).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);
    if (mins  <  1) return "just now";
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield size={22} className="text-green-600" /> Audit Log
          </h1>
          <p className="text-sm text-gray-500">Full activity trail — every action by every user</p>
        </div>
        <span className="text-sm text-gray-400">{total.toLocaleString()} total records</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
          <option value="">All actions</option>
          {["CREATE","UPDATE","DELETE","DISPENSE","LOGIN","LOGOUT"].map((a) => <option key={a}>{a}</option>)}
        </select>
        <select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
          <option value="">All entities</option>
          {["Drug","Inventory","Dispense","User"].map((e) => <option key={e}>{e}</option>)}
        </select>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Filter by user..." value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setUser(userInput); setPage(1); } }}
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400 w-44" />
          </div>
          <button onClick={() => { setUser(userInput); setPage(1); }}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl text-sm transition">
            Search
          </button>
          {(action || entity || user) && (
            <button onClick={() => { setAction(""); setEntity(""); setUser(""); setUserInput(""); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No audit records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Time","User","Action","Entity","Detail"].map((h) => (
                    <th key={h} className="text-left p-3 text-gray-500 font-medium text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="p-3 text-gray-400 text-xs whitespace-nowrap">
                      <p className="text-gray-700 font-medium">{new Date(log.createdAt).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      <p>{new Date(log.createdAt).toLocaleTimeString("en-KE")} · {timeAgo(log.createdAt)}</p>
                    </td>
                    <td className="p-3 font-medium text-gray-800">{log.username}</td>
                    <td className="p-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{log.entity}{log.entityId ? ` #${log.entityId}` : ""}</td>
                    <td className="p-3 text-gray-600 max-w-xs truncate">{log.detail || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">Page {page} of {pages} · {total} records</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page === 1}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              const pg = page <= 3 ? i+1 : page-2+i;
              if (pg < 1 || pg > pages) return null;
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${pg === page ? "bg-green-600 text-white" : "border border-gray-200 hover:bg-gray-50 text-gray-600"}`}>
                  {pg}
                </button>
              );
            })}
            <button onClick={() => setPage((p) => Math.min(pages, p+1))} disabled={page === pages}
              className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
