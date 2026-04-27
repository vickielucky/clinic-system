"use client";

import { useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#F5F7FA]">
        <Topbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <Sidebar open={sidebarOpen} />
        <main
          className={`pt-16 transition-all duration-300 min-h-screen ${
            sidebarOpen ? "ml-64" : "ml-16"
          }`}
        >
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </body>
    </html>
  );
}
