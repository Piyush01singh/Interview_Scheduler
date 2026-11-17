"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, ArrowRight, Lock, Mail, Shield, ShieldCheck } from "lucide-react";
import { useLivePlatform } from "@/lib/demo/store";

export default function AdminLoginPage() {
  const router = useRouter();
  const { event, allAdmins, loginAdmin } = useLivePlatform();

  const [selectedAdminId, setSelectedAdminId] = useState(allAdmins[0]?.id ?? "");
  const [password, setPassword] = useState("••••••••");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = loginAdmin(selectedAdminId, password);
    if (!res.success) {
      setErrorMsg(res.error ?? "Authentication failed.");
      return;
    }
    router.push("/admin");
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Gateway
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Placement Admin Portal
              </h1>
              <p className="text-xs text-slate-500">{event.event_name}</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Select Administrator Identity
              </label>
              <select
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                {allAdmins.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    {adm.name} — {adm.role.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Security Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Sign In to Command Centre
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Individual Named Admin Accounts Quick Preset */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-medium text-slate-500">
              Select any role to verify individual session tracking:
            </p>
            <div className="mt-2 space-y-1.5">
              {allAdmins.map((adm) => (
                <button
                  key={adm.id}
                  type="button"
                  onClick={() => {
                    setSelectedAdminId(adm.id);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    selectedAdminId === adm.id
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="font-medium text-slate-900">{adm.name}</div>
                    <div className="text-[10px] text-slate-500">{adm.email}</div>
                  </div>
                  <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-700 uppercase">
                    {adm.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
