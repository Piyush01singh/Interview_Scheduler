"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, ArrowRight, Lock, Smartphone } from "lucide-react";
import { useLivePlatform } from "@/lib/demo/store";

export default function StudentLoginPage() {
  const router = useRouter();
  const { event, candidates, loginStudent } = useLivePlatform();

  const [regInput, setRegInput] = useState("12204502");
  const [pinInput, setPinInput] = useState("739104");
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const res = loginStudent(regInput, pinInput);
    if (!res.success) {
      setAuthError(res.error ?? "Invalid registration number or access PIN.");
      return;
    }

    router.push("/student");
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
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Student Placement Portal
              </h1>
              <p className="text-xs text-slate-500">{event.event_name}</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                University Registration Number
              </label>
              <input
                type="text"
                required
                value={regInput}
                onChange={(e) => setRegInput(e.target.value)}
                placeholder="e.g. 12204502"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                6-Digit Access PIN
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••••"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {authError && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Sign In to Live Tracker
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Sandbox Preset */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-medium text-slate-400">
              Demo Candidate Accounts (Click to auto-fill):
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {candidates.slice(0, 4).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setRegInput(c.registration_number);
                    setPinInput(c.access_pin_preview ?? "000000");
                  }}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                >
                  {c.student_name.split(" ")[0]} ({c.registration_number})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
