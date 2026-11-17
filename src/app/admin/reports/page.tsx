"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Layers,
  Users,
} from "lucide-react";
import { useLivePlatform } from "@/lib/demo/store";
import { formatTimeInTimezone } from "@/lib/utils/format";
import { generateAttendanceDocxBlob } from "@/lib/reports/docx-generator";

export default function AdminReportsPage() {
  const { event, sessions, panels, candidates, snapshots, auditLogs } = useLivePlatform();

  const [filterSessionId, setFilterSessionId] = useState<string>("all");
  const [filterPanelId, setFilterPanelId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [universityName, setUniversityName] = useState("Delhi Technological University (DTU)");
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);

  // Distinct academic programs
  const programs = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => {
      if (c.program_name) set.add(c.program_name);
    });
    return Array.from(set);
  }, [candidates]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const total = candidates.length;
    const present = candidates.filter((c) => c.attendance_status === "present").length;
    const late = candidates.filter((c) => c.attendance_status === "late").length;
    const absent = candidates.filter((c) => c.attendance_status === "absent").length;
    const excused = candidates.filter((c) => c.attendance_status === "excused").length;
    const completed = candidates.filter((c) => c.interview_status === "completed").length;
    const waiting = candidates.filter((c) => c.interview_status === "waiting" && c.attendance_status !== "absent").length;

    return { total, present, late, absent, excused, completed, waiting };
  }, [candidates]);

  // Panel-wise performance calculations
  const panelPerformance = useMemo(() => {
    return panels.map((panel) => {
      const panelCands = candidates.filter((c) => c.panel_id === panel.id);
      const completedCands = panelCands.filter((c) => c.interview_status === "completed");
      const waitingCands = panelCands.filter((c) => c.interview_status === "waiting" && c.attendance_status !== "absent");
      const activeCand = panelCands.find((c) => c.interview_status === "in_progress");

      return {
        panel,
        total: panelCands.length,
        completed: completedCands.length,
        waiting: waitingCands.length,
        hasActive: Boolean(activeCand),
        activeStudent: activeCand?.student_name ?? "Idle",
      };
    });
  }, [panels, candidates]);

  // Export DOCX Report
  const handleExportDocx = async (isFiltered: boolean) => {
    try {
      setIsGeneratingDocx(true);
      const blob = await generateAttendanceDocxBlob({
        event,
        sessions,
        panels,
        candidates,
        filters: isFiltered
          ? {
              universityName,
              sessionId: filterSessionId,
              panelId: filterPanelId,
              programName: filterProgram,
              attendanceStatus: filterStatus,
            }
          : { universityName },
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = isFiltered
        ? `interview-attendance-filtered-${event.interview_date}.docx`
        : `official-event-attendance-report-${event.interview_date}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DOCX Generation failed:", err);
      alert("Failed to generate DOCX document. Check console logs.");
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  // Export CSV Schedule
  const exportCsv = () => {
    const header = [
      "S.No",
      "Registration Number",
      "Student Name",
      "Program",
      "Profile",
      "Session",
      "Panel",
      "Attendance Status",
      "Check-in Time",
      "Interview Status",
      "Original Slot",
      "Live Expected Time",
      "Delay (Mins)",
      "Access PIN",
    ];

    const rows = candidates.map((c) => {
      const session = sessions.find((s) => s.id === c.session_id);
      const panel = panels.find((p) => p.id === c.panel_id);
      const snap = snapshots.find(
        (s) => s.sessionId === c.session_id && s.panelId === c.panel_id
      );
      const item = snap?.queue.find((q) => q.candidate.id === c.id);

      return [
        c.original_sequence,
        c.registration_number,
        `"${c.student_name}"`,
        `"${c.program_name ?? ""}"`,
        `"${c.profile ?? ""}"`,
        `"${session?.session_name ?? ""}"`,
        `"${panel?.panel_name ?? ""}"`,
        c.attendance_status,
        c.check_in_at ? formatTimeInTimezone(c.check_in_at, event.timezone) : "",
        c.interview_status,
        formatTimeInTimezone(item?.originalStartAt ?? c.original_slot_start_at, event.timezone),
        formatTimeInTimezone(item?.expectedStartAt ?? c.expected_start_at, event.timezone),
        item?.delayMinutes ?? 0,
        c.access_pin_preview ?? "",
      ].join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-schedule-report-${event.interview_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header and Download Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Official Reports, Word (.DOCX) Generation & Analytics
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Generate printable, certified Microsoft Word .docx attendance dossiers and raw CSV cohorts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportDocx(false)}
            disabled={isGeneratingDocx}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            {isGeneratingDocx ? "Building .DOCX..." : "Generate Official Attendance Report (.DOCX)"}
          </button>

          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <MetricCard label="Total Registered" value={stats.total} accent="text-slate-900" />
        <MetricCard label="Venue Present" value={stats.present} accent="text-emerald-700" />
        <MetricCard label="Late Arrivals" value={stats.late} accent="text-amber-700" />
        <MetricCard label="No-Shows (Absent)" value={stats.absent} accent="text-rose-700" />
        <MetricCard label="Interviews Completed" value={stats.completed} accent="text-indigo-700" />
        <MetricCard label="Active in Queue" value={stats.waiting} accent="text-slate-700" />
      </div>

      {/* Filtered Report Configuration Box */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Filter className="h-4 w-4 text-slate-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Custom Report Filter & Certification Settings
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              University Name on Header
            </label>
            <input
              type="text"
              value={universityName}
              onChange={(e) => setUniversityName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Session Filter
            </label>
            <select
              value={filterSessionId}
              onChange={(e) => setFilterSessionId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              <option value="all">All Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.session_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Panel Filter
            </label>
            <select
              value={filterPanelId}
              onChange={(e) => setFilterPanelId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              <option value="all">All Panels</option>
              {panels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.panel_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Attendance Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              <option value="all">All Candidates (Present + Absent)</option>
              <option value="present">Present Only</option>
              <option value="late">Late Only</option>
              <option value="absent">Absent Only</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => handleExportDocx(true)}
            disabled={isGeneratingDocx}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            <FileDown className="h-3.5 w-3.5" />
            Generate Filtered .DOCX Report
          </button>
        </div>
      </div>

      {/* Panel-wise Performance Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            Interview Panel Real-Time Performance & Durations
          </span>
          <span className="text-[11px] text-slate-500">{panels.length} Active Interview Rooms</span>
        </div>

        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 pl-4 pr-3">Panel & Room</th>
              <th className="px-3 py-3">Interviewer</th>
              <th className="px-3 py-3">Active Candidate</th>
              <th className="px-3 py-3">Completed</th>
              <th className="px-3 py-3">Remaining</th>
              <th className="py-3 pl-3 pr-4 text-right">Completion Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {panelPerformance.map(({ panel, total, completed, waiting, hasActive, activeStudent }) => {
              const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <tr key={panel.id} className="hover:bg-slate-50/60">
                  <td className="py-3 pl-4 pr-3">
                    <div className="font-semibold text-slate-900">{panel.panel_name}</div>
                    <div className="text-slate-500 text-[11px]">{panel.room_name ?? "—"}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{panel.interviewer_name ?? "Assigned Staff"}</td>
                  <td className="px-3 py-3">
                    {hasActive ? (
                      <span className="inline-flex items-center gap-1 font-medium text-indigo-700">
                        <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                        {activeStudent}
                      </span>
                    ) : (
                      <span className="text-slate-400">Idle / Ready</span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-semibold text-emerald-700">{completed}</td>
                  <td className="px-3 py-3 font-semibold text-slate-700">{waiting}</td>
                  <td className="py-3 pl-3 pr-4 text-right">
                    <span className="font-mono font-medium text-slate-900">{rate}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent = "text-slate-900",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tracking-tight ${accent}`}>{value}</div>
    </div>
  );
}
