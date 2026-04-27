
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  Menu, Bell, AlertCircle, AlertTriangle,
  CheckCircle2, Info, Loader2, X, CheckCheck,
} from "lucide-react";
import Link from "next/link";

type NotifType = "error" | "warning" | "success" | "info";
type Notification = { id: string; type: NotifType; title: string; message: string; timestamp: string };
type NotifCounts  = { total: number; errors: number; warnings: number; success: number };
type CurrentUser  = { id: number; username: string; fullName: string; role: string };

const READ_KEY = "clinic_read_notifs";
function getReadIds(): Set<string> { try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); } catch { return new Set(); } }
function saveReadIds(ids: Set<string>) { localStorage.setItem(READ_KEY, JSON.stringify([...ids])); }

export default function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const router = useRouter();
  const [showNotif,     setShowNotif]     = useState(false);
  const [showProfile,   setShowProfile]   = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [counts,        setCounts]        = useState<NotifCounts>({ total: 0, errors: 0, warnings: 0, success: 0 });
  const [readIds,       setReadIds]       = useState<Set<string>>(new Set());
  const [loadingNotif,  setLoadingNotif]  = useState(false);
  const [showReadToo,   setShowReadToo]   = useState(false);
  const [currentUser,   setCurrentUser]   = useState<CurrentUser | null>(null);

  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Fetch current user
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.ok ? r.json() : null).then((u) => { if (u) setCurrentUser(u); });
  }, []);

  useEffect(() => { setReadIds(getReadIds()); }, []);

  const fetchNotifications = async () => {
    setLoadingNotif(true);
    try {
      const res  = await fetch("/api/notifications");
      const data = await res.json();
      if (data.notifications) { setNotifications(data.notifications); setCounts(data.counts); }
    } catch { /* ignore */ }
    setLoadingNotif(false);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead    = (id: string) => { const n = new Set(readIds).add(id); setReadIds(n); saveReadIds(n); };
  const markAllRead = () => { const n = new Set(notifications.map((x) => x.id)); setReadIds(n); saveReadIds(n); };
  const clearRead   = () => { const n = new Set<string>(); setReadIds(n); saveReadIds(n); };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const unread    = notifications.filter((n) => !readIds.has(n.id));
  const readList  = notifications.filter((n) =>  readIds.has(n.id));
  const displayed = showReadToo ? notifications : unread;

  const unreadCounts = {
    errors:   unread.filter((n) => n.type === "error").length,
    warnings: unread.filter((n) => n.type === "warning").length,
    success:  unread.filter((n) => n.type === "success").length,
    total:    unread.length,
  };

  const badgeBg =
    unreadCounts.errors   > 0 ? "bg-red-500"    :
    unreadCounts.warnings > 0 ? "bg-yellow-400" :
    unreadCounts.success  > 0 ? "bg-green-500"  : "";

  const initials = currentUser
    ? currentUser.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "AD";

  return (
    <header className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 z-50 h-16 flex items-center justify-between px-4 md:px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-2 rounded-lg hover:bg-gray-100 transition">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
        
          <span className="hidden md:block font-bold text-green-700 text-base">Krrish P~Kay Pharmacy</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">

        {/* Bell */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }} className="p-2 rounded-lg hover:bg-gray-100 transition relative">
            <Bell size={20} />
            {unreadCounts.total > 0 && (
              <span className={`absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full text-white text-[9px] font-bold flex items-center justify-center ${badgeBg}`}>
                {unreadCounts.total > 99 ? "99+" : unreadCounts.total}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-14 w-80 bg-white shadow-2xl rounded-2xl border border-gray-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800 text-sm">Notifications</p>
                  {loadingNotif && <Loader2 size={13} className="animate-spin text-gray-400" />}
                </div>
                <div className="flex items-center gap-2">
                  {unread.length > 0 && (
                    <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] text-green-600 hover:text-green-700 font-medium">
                      <CheckCheck size={12} /> All read
                    </button>
                  )}
                  <button onClick={fetchNotifications} className="text-[11px] text-gray-400 hover:text-gray-600">Refresh</button>
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50">
                <div className="flex gap-1.5 flex-wrap">
                  {unreadCounts.errors   > 0 && <SPill color="red"    label={`${unreadCounts.errors} urgent`} />}
                  {unreadCounts.warnings > 0 && <SPill color="yellow" label={`${unreadCounts.warnings} warning${unreadCounts.warnings > 1 ? "s" : ""}`} />}
                  {unreadCounts.success  > 0 && <SPill color="green"  label={`${unreadCounts.success} new`} />}
                  {unread.length === 0        && <span className="text-xs text-gray-400">All caught up</span>}
                </div>
                {readList.length > 0 && (
                  <button onClick={() => setShowReadToo(!showReadToo)} className="text-[11px] text-gray-400 hover:text-gray-600 shrink-0">
                    {showReadToo ? "Hide read" : `+${readList.length} read`}
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {displayed.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-sm">
                    <CheckCircle2 size={24} className="mx-auto mb-2 opacity-40" />
                    {notifications.length === 0 ? "All clear" : "No unread notifications"}
                  </div>
                ) : displayed.map((n) => (
                  <NotifItem key={n.id} notif={n} isRead={readIds.has(n.id)} onMarkRead={() => markRead(n.id)} />
                ))}
              </div>

              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <Link href="/reports" onClick={() => setShowNotif(false)} className="text-xs text-green-600 hover:underline font-medium">
                  View full report →
                </Link>
                {readList.length > 0 && (
                  <button onClick={clearRead} className="text-[11px] text-gray-400 hover:text-red-500 transition">Clear read</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition">
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs shrink-0">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-700 leading-tight">{currentUser?.fullName ?? "Admin"}</p>
              <p className="text-xs text-gray-400 leading-tight">{currentUser?.role ?? "Staff"}</p>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-48 bg-white shadow-xl rounded-xl border border-gray-100 p-1 text-sm z-50">
              <div className="px-3 py-2 border-b border-gray-100 mb-1">
                <p className="font-semibold text-gray-800 text-xs">{currentUser?.fullName}</p>
                <p className="text-gray-400 text-xs">@{currentUser?.username}</p>
              </div>
              <Link href="/settings" onClick={() => setShowProfile(false)}
                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg text-gray-700">
                <UserIcon /> Profile & Settings
              </Link>
              <div className="my-1 border-t border-gray-100" />
              <button onClick={handleLogout} className="w-full flex items-center gap-2 p-2 hover:bg-red-50 rounded-lg text-red-600">
                <LogoutIcon /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NotifItem({ notif, isRead, onMarkRead }: { notif: Notification; isRead: boolean; onMarkRead: () => void }) {
  const cfg: Record<NotifType, { icon: React.ReactNode; bg: string; titleColor: string }> = {
    error:   { icon: <AlertCircle   size={14} className="text-red-500    shrink-0 mt-0.5" />, bg: "hover:bg-red-50",    titleColor: "text-red-700"   },
    warning: { icon: <AlertTriangle size={14} className="text-yellow-500 shrink-0 mt-0.5" />, bg: "hover:bg-yellow-50", titleColor: "text-yellow-800" },
    success: { icon: <CheckCircle2  size={14} className="text-green-500  shrink-0 mt-0.5" />, bg: "hover:bg-green-50",  titleColor: "text-green-800"  },
    info:    { icon: <Info          size={14} className="text-blue-500   shrink-0 mt-0.5" />, bg: "hover:bg-blue-50",   titleColor: "text-blue-800"   },
  };
  const { icon, bg, titleColor } = cfg[notif.type];
  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), d = Math.floor(diff/86400000);
    if (m < 1) return "just now"; if (m < 60) return `${m}m ago`; if (h < 24) return `${h}h ago`; return `${d}d ago`;
  };
  return (
    <div className={`flex gap-3 px-4 py-3 transition group ${isRead ? "opacity-50 bg-gray-50" : bg}`}>
      {icon}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold leading-snug ${isRead ? "text-gray-500" : titleColor}`}>{notif.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{notif.message}</p>
        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.timestamp)}</p>
      </div>
      {!isRead && (
        <button onClick={onMarkRead} className="opacity-0 group-hover:opacity-100 transition p-1 rounded-lg hover:bg-white shrink-0 mt-0.5" title="Mark as read">
          <X size={12} className="text-gray-400 hover:text-gray-600" />
        </button>
      )}
    </div>
  );
}

function SPill({ color, label }: { color: string; label: string }) {
  const cls: Record<string, string> = { red: "bg-red-100 text-red-600", yellow: "bg-yellow-100 text-yellow-700", green: "bg-green-100 text-green-700" };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls[color]}`}>{label}</span>;
}

function UserIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function LogoutIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}

