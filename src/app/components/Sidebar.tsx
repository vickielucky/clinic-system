"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Pill, Boxes, ClipboardList, FileText, Shield,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, text: "Dashboard", href: "/"          },
  { icon: Pill,            text: "Drugs",     href: "/drugs"     },
  { icon: Boxes,           text: "Inventory", href: "/inventory" },
  { icon: ClipboardList,   text: "Dispense",  href: "/dispense"  },
  { icon: FileText,        text: "Reports",   href: "/reports"   },
  { icon: Shield,          text: "Audit Log", href: "/audit"     },
];

export default function Sidebar({ open }: { open: boolean }) {
  const pathname = usePathname();

  return (
    <aside className={`${open ? "w-64" : "w-16"} bg-green-700 text-white fixed top-16 left-0 h-[calc(100vh-4rem)] transition-all duration-300 z-40 flex flex-col`}>
      <nav className="mt-4 flex flex-col gap-1 px-2 flex-1">
        {navItems.map(({ icon: Icon, text, href }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                isActive ? "bg-red-600 shadow-md font-semibold" : "hover:bg-green-600"
              }`}>
              <Icon size={20} className="shrink-0" />
              {open && <span className="text-sm whitespace-nowrap">{text}</span>}
            </Link>
          );
        })}
      </nav>

      {open && <SidebarUser />
      }
    </aside>
  );
  function SidebarUser() {
  const [user, setUser] = useState<{ fullName: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((u) => { if (u) setUser(u); });
  }, []);

  const initials = user
    ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "AD";

  return (
    <div className="p-4 border-t border-green-600">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center text-green-900 font-bold text-sm shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-sm font-medium">{user?.fullName ?? "..."}</p>
          <p className="text-xs text-green-300">{user?.role ?? ""}</p>
        </div>
      </div>
    </div>
  );
}
}
