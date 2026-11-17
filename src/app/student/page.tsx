"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  HelpCircle,
  Lock,
  LogOut,
  MapPin,
  PhoneCall,
  QrCode,
  Radio,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useLivePlatform } from "@/lib/demo/store";
import { formatTimeInTimezone } from "@/lib/utils/format";
import { Candidate, StudentReadinessStatus } from "@/types/domain";

export default function StudentPortalPage() {
  const {
    event,
    sessions,
    panels,
    candidates,
    snapshots,
    now,
    currentStudent,
    loginStudent,
    logoutStudent,
    updateStudentReadiness,
    notifications,
  } = useLivePlatform();

  const [regInput, setRegInput] = useState("12204502");
  const [pinInput, setPinInput] = useState("739104");
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = loginStudent(regInput, pinInput);
    if (!res.success) {
      setAuthError(res.error ?? "Invalid registration number or access PIN.");
    }
  };

  const studentSchedule = useMemo(() => {
    if (!currentStudent) return null;
    for (const snap of snapshots) {
      const found = snap.queue.find((q) => q.candidate.id === currentStudent.id);
      if (found) {
        const session = sessions.find((s) => s.id === snap.sessionId);
        const panel = panels.find((p) => p.id === snap.panelId);
        return { item: found, snapshot: snap, session, panel };
      }
    }
    return null;
  }, [currentStudent, snapshots, sessions, panels]);

  // If not logged in, render Student Login Portal
  if (!currentStudent || !studentSchedule) {
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
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  Candidate Live Interview Tracker
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
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Access Live Station Tracker
              </button>
            </form>

            {/* Quick Candidate Preset Selector for Fast Verification */}
            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="text-[11px] font-medium text-slate-400">
                Sandbox Candidate Quick Select:
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

  const { item, snapshot, session, panel } = studentSchedule;
  const cand = item.candidate;
  const isCalled = Boolean(cand.called_at);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Student Navigation Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-2xs">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 tracking-tight">
                Live Placement Tracker
              </div>
              <div className="text-[10px] text-slate-500">Auto-syncing every 5s · No refresh needed</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
              {cand.registration_number}
            </span>
            <button
              onClick={logoutStudent}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-3 w-3" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        {/* Urgent Live Calling Alert (Triggers when Admin Calls Candidate) */}
        {isCalled && (
          <div className="rounded-2xl border-2 border-rose-500 bg-rose-50 p-5 shadow-lg animate-bounce">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
                <PhoneCall className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <span className="rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-900">
                  ACTION REQUIRED
                </span>
                <h2 className="mt-1 text-base font-bold text-rose-950">
                  Your Interview is Ready!
                </h2>
                <p className="mt-1 text-xs text-rose-800 leading-relaxed">
                  Please proceed immediately to <strong>{panel?.panel_name}</strong> (Room: <strong>{panel?.room_name ?? "Assigned Cabin"}</strong>).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Global Broadcast Announcements (if any) */}
        {notifications.length > 0 && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
            <div className="flex items-center gap-2 text-indigo-900 font-semibold text-xs">
              <Bell className="h-4 w-4" />
              Event Announcement: {notifications[0]?.title}
            </div>
            <p className="mt-1 text-xs text-indigo-800">{notifications[0]?.message}</p>
          </div>
        )}

        {/* Candidate Profile Summary Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Candidate Dossier
              </span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {cand.student_name}
              </h1>
              <p className="mt-0.5 text-xs text-slate-600">
                {cand.program_name ?? "Undergraduate"} · Profile:{" "}
                <strong className="text-slate-800">{cand.profile ?? "Standard Track"}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <AttendanceBadge status={cand.attendance_status} />
              <InterviewStatusBadge status={cand.interview_status} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs sm:grid-cols-3">
            <div>
              <span className="text-slate-500">Cohort Session:</span>
              <div className="font-semibold text-slate-900">{session?.session_name}</div>
            </div>
            <div>
              <span className="text-slate-500">Assigned Panel:</span>
              <div className="font-semibold text-slate-900">{panel?.panel_name}</div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-slate-500">Room Location:</span>
              <div className="font-semibold text-slate-900">{panel?.room_name ?? "Main Hall"}</div>
            </div>
          </div>
        </div>

        {/* TRAIN-GRADE LIVE ETA STATION BOARD */}
        <div className="rounded-3xl border border-slate-900 bg-slate-900 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Expected Interview Time (Live ETA)
              </span>
            </div>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              {item.delayMinutes === 0
                ? "On Schedule"
                : item.delayMinutes < 0
                ? `${Math.abs(item.delayMinutes)}m Ahead of Schedule`
                : `${item.delayMinutes}m Delayed`}
            </span>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center text-center">
            <div className="font-mono text-5xl font-black tracking-tight text-white sm:text-6xl">
              {item.expectedStartAt
                ? formatTimeInTimezone(item.expectedStartAt, event.timezone)
                : "—"}
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <span>Original Baseline Slot:</span>
              <span className="font-mono text-slate-300">
                {formatTimeInTimezone(item.originalStartAt, event.timezone)}
              </span>
            </div>
          </div>

          {/* Queue Distance Metrics Strip */}
          <div className="mt-8 grid grid-cols-3 gap-2 rounded-2xl bg-slate-800/80 p-4 text-center">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Queue Position
              </div>
              <div className="mt-1 text-2xl font-bold text-white">
                {item.liveQueuePosition !== null ? `#${item.liveQueuePosition}` : "NOW"}
              </div>
            </div>

            <div className="border-x border-slate-700/60 px-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Ahead of You
              </div>
              <div className="mt-1 text-2xl font-bold text-emerald-400">
                {item.candidatesAhead} {item.candidatesAhead === 1 ? "student" : "students"}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Est. Waiting
              </div>
              <div className="mt-1 text-2xl font-bold text-indigo-300">
                {item.estimatedWaitMinutes}m
              </div>
            </div>
          </div>
        </div>

        {/* CANDIDATE READINESS TOGGLES (Requirement 10) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <UserCheck className="h-4 w-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Student Readiness Signal
            </h2>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Let the placement team know when you have physically arrived at the waiting area:
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={() => updateStudentReadiness(cand.id, "arrived")}
              className={`rounded-xl border p-3 text-center transition-all ${
                cand.readiness_status === "arrived"
                  ? "border-sky-500 bg-sky-50 text-sky-900 font-semibold shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="text-sm font-semibold">I&apos;ve Arrived</div>
              <div className="text-[10px] text-slate-500 mt-0.5">At waiting lounge</div>
            </button>

            <button
              onClick={() => updateStudentReadiness(cand.id, "ready")}
              className={`rounded-xl border p-3 text-center transition-all ${
                cand.readiness_status === "ready"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="text-sm font-semibold">I&apos;m Ready</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Prepared for panel</div>
            </button>

            <button
              onClick={() => updateStudentReadiness(cand.id, "needs_assistance")}
              className={`rounded-xl border p-3 text-center transition-all ${
                cand.readiness_status === "needs_assistance"
                  ? "border-amber-500 bg-amber-50 text-amber-900 font-semibold shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <div className="text-sm font-semibold">Need Help</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Contact Helpdesk</div>
            </button>
          </div>
        </div>

        {/* VENUE QR GATE PASS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 p-2 border border-slate-200">
            <QrCode className="h-16 w-16 text-slate-800" />
          </div>
          <div>
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              VENUE CHECK-IN PASS
            </span>
            <h3 className="mt-1 text-sm font-bold text-slate-900">
              Pass Token: {cand.registration_number}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Present this code at the attendance desk upon entering the placement building to register your arrival.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function AttendanceBadge({ status }: { status: Candidate["attendance_status"] }) {
  const styles: Record<Candidate["attendance_status"], string> = {
    present: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    late: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
    not_checked_in: "bg-slate-100 text-slate-600",
    absent: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
    excused: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20",
  };
  const labels: Record<Candidate["attendance_status"], string> = {
    present: "Present at Venue",
    late: "Late Arrival",
    not_checked_in: "Not Checked In",
    absent: "Marked Absent",
    excused: "Excused",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function InterviewStatusBadge({ status }: { status: Candidate["interview_status"] }) {
  const styles: Record<Candidate["interview_status"], string> = {
    waiting: "bg-slate-100 text-slate-700",
    in_progress: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20",
    completed: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    skipped: "bg-slate-100 text-slate-400",
  };
  const labels: Record<Candidate["interview_status"], string> = {
    waiting: "In Queue",
    in_progress: "Interview In Progress",
    completed: "Interview Completed",
    skipped: "Skipped",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
