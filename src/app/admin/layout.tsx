"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  LogOut,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Users,
} from "lucide-react";
import { useLivePlatform } from "@/lib/demo/store";

const NAV_ITEMS = [
  { href: "/admin", label: "Live Command Centre", icon: LayoutDashboard },
  { href: "/admin/attendance", label: "Attendance Desk & QR", icon: UserCheck },
  { href: "/admin/import", label: "Import Excel / CSV", icon: FileSpreadsheet },
  { href: "/admin/reports", label: "Reports (.DOCX & CSV)", icon: BarChart3 },
  { href: "/admin/staff", label: "Staff & Permissions", icon: ShieldCheck },
  { href: "/admin/activity", label: "Audit Trail", icon: History },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { event, currentAdmin, allAdmins, loginAdmin, logoutAdmin, toggleEventPause, resetDemoData } = useLivePlatform();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Persistent Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900 tracking-tight">Interview Schedule</div>
            <div className="text-[11px] font-medium text-slate-500">Placement Command v2.0</div>
          </div>
        </div>

        {/* Current Authenticated Admin Pill */}
        <div className="border-b border-slate-100 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Active Operator
            </span>
            <span className="rounded bg-indigo-100 px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
              {currentAdmin?.role ?? "Guest"}
            </span>
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-900 truncate">
            {currentAdmin?.name ?? "Not Signed In"}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <select
              value={currentAdmin?.id ?? ""}
              onChange={(e) => loginAdmin(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 focus:outline-none"
            >
              {allAdmins.map((adm) => (
                <option key={adm.id} value={adm.id}>
                  Switch: {adm.name.split(" ")[0]} ({adm.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 space-y-2">
          <Link
            href="/student"
            target="_blank"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            <Smartphone className="h-3.5 w-3.5" />
            Open Student Live View ↗
          </Link>
          <button
            onClick={resetDemoData}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Sandbox Data
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                {event.event_name}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  event.event_status === "paused"
                    ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
                    : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    event.event_status === "paused" ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
                  }`}
                />
                {event.event_status === "paused" ? "Queue Paused" : "Live Sync Active"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {event.interview_date} · {event.timezone} · Rev #{event.schedule_revision}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex lg:hidden gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-2 py-1 text-xs font-medium ${
                    pathname === item.href
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {item.label.split(" ")[0]}
                </Link>
              ))}
            </div>

            <button
              onClick={toggleEventPause}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                event.event_status === "paused"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              {event.event_status === "paused" ? (
                <>
                  <PlayCircle className="h-3.5 w-3.5" />
                  Resume Queue
                </>
              ) : (
                <>
                  <PauseCircle className="h-3.5 w-3.5" />
                  Pause Queue
                </>
              )}
            </button>

            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-400" />
              Sign Out
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
