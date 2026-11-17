"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  Filter,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useLivePlatform } from "@/lib/demo/store";
import { formatTimeInTimezone } from "@/lib/utils/format";
import { AttendanceStatus, Candidate } from "@/types/domain";

export default function AttendanceManagementPage() {
  const {
    event,
    sessions,
    panels,
    candidates,
    currentAdmin,
    markAttendance,
    bulkMarkAttendance,
    verifyQrCheckin,
  } = useLivePlatform();

  const [selectedSessionId, setSelectedSessionId] = useState<string>("all");
  const [selectedPanelId, setSelectedPanelId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [qrInput, setQrInput] = useState("");
  const [qrMessage, setQrMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Correction Modal State
  const [correctionCandidate, setCorrectionCandidate] = useState<Candidate | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<AttendanceStatus>("present");
  const [correctionReason, setCorrectionReason] = useState("");

  // Unique program options
  const programs = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => {
      if (c.program_name) set.add(c.program_name);
    });
    return Array.from(set);
  }, [candidates]);

  // Attendance metrics
  const stats = useMemo(() => {
    const total = candidates.length;
    const present = candidates.filter((c) => c.attendance_status === "present").length;
    const late = candidates.filter((c) => c.attendance_status === "late").length;
    const notCheckedIn = candidates.filter((c) => c.attendance_status === "not_checked_in").length;
    const absent = candidates.filter((c) => c.attendance_status === "absent").length;
    const excused = candidates.filter((c) => c.attendance_status === "excused").length;
    return { total, present, late, notCheckedIn, absent, excused };
  }, [candidates]);

  // Filtered candidate roster
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (selectedSessionId !== "all" && c.session_id !== selectedSessionId) return false;
      if (selectedPanelId !== "all" && c.panel_id !== selectedPanelId) return false;
      if (selectedStatus !== "all" && c.attendance_status !== selectedStatus) return false;
      if (selectedProgram !== "all" && c.program_name !== selectedProgram) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.student_name.toLowerCase().includes(q);
        const matchesReg = c.registration_number.toLowerCase().includes(q);
        const matchesProfile = (c.profile ?? "").toLowerCase().includes(q);
        if (!matchesName && !matchesReg && !matchesProfile) return false;
      }

      return true;
    });
  }, [candidates, selectedSessionId, selectedPanelId, selectedStatus, selectedProgram, searchQuery]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCandidateIds(filteredCandidates.map((c) => c.id));
    } else {
      setSelectedCandidateIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkAction = (status: AttendanceStatus) => {
    if (selectedCandidateIds.length === 0) return;
    bulkMarkAttendance(selectedCandidateIds, status);
    setSelectedCandidateIds([]);
  };

  const handleQrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    const res = verifyQrCheckin(qrInput.trim());
    setQrMessage({ text: res.message, isError: !res.success });
    setQrInput("");
    setTimeout(() => setQrMessage(null), 5000);
  };

  const openCorrectionModal = (cand: Candidate) => {
    setCorrectionCandidate(cand);
    setCorrectionStatus(cand.attendance_status);
    setCorrectionReason("");
  };

  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionCandidate) return;
    if (!correctionReason.trim()) {
      alert("Please provide an audit reason for modifying attendance status.");
      return;
    }
    markAttendance(correctionCandidate.id, correctionStatus, correctionReason.trim());
    setCorrectionCandidate(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header & Quick Venue QR Scanner Banner */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Venue Attendance & Gate Check-in Desk
              </h1>
              <p className="text-xs text-slate-600">
                Track candidate venue arrivals, perform instant QR scans, handle no-shows, and record official attendance.
              </p>
            </div>
            <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              Operator: {currentAdmin?.name ?? "Attendance Officer"}
            </span>
          </div>

          {/* Quick Attendance KPI Counters */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total</div>
              <div className="text-xl font-bold text-slate-900">{stats.total}</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Present</div>
              <div className="text-xl font-bold text-emerald-800">{stats.present}</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Late</div>
              <div className="text-xl font-bold text-amber-800">{stats.late}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Unchecked</div>
              <div className="text-xl font-bold text-slate-700">{stats.notCheckedIn}</div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">Absent</div>
              <div className="text-xl font-bold text-rose-800">{stats.absent}</div>
            </div>
            <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-2.5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-700">Excused</div>
              <div className="text-xl font-bold text-purple-800">{stats.excused}</div>
            </div>
          </div>
        </div>

        {/* QR Scanner / Fast Reg Verification Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <QrCode className="h-4 w-4 text-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Rapid QR Check-in Terminal
            </h2>
          </div>
          <form onSubmit={handleQrSubmit} className="mt-3 space-y-2.5">
            <label className="block text-[11px] font-medium text-slate-600">
              Scan student pass barcode or type Registration Number:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 12204502 or qr-cand-102"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Verify
              </button>
            </div>
            {qrMessage && (
              <div
                className={`rounded-lg p-2 text-xs font-medium ${
                  qrMessage.isError
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                {qrMessage.text}
              </div>
            )}
            <p className="text-[10px] text-slate-400">
              Supports barcode scanners, event HMAC QR tokens, and manual registration numbers.
            </p>
          </form>
        </div>
      </div>

      {/* Filter and Bulk Action Bar */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, reg no, profile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-900 focus:outline-none"
            >
              <option value="all">All Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.session_name}
                </option>
              ))}
            </select>

            <select
              value={selectedPanelId}
              onChange={(e) => setSelectedPanelId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-900 focus:outline-none"
            >
              <option value="all">All Panels</option>
              {panels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.panel_name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-900 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="not_checked_in">Not Checked In</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
            </select>

            {programs.length > 0 && (
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-900 focus:outline-none"
              >
                <option value="all">All Academic Programs</option>
                {programs.map((prog) => (
                  <option key={prog} value={prog}>
                    {prog}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Bulk Action Controls */}
          {selectedCandidateIds.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-indigo-50/80 p-1.5 border border-indigo-200">
              <span className="text-xs font-semibold text-indigo-900 pl-1">
                {selectedCandidateIds.length} Selected:
              </span>
              <button
                onClick={() => handleBulkAction("present")}
                className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
              >
                Mark Present
              </button>
              <button
                onClick={() => handleBulkAction("late")}
                className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700"
              >
                Mark Late
              </button>
              <button
                onClick={() => handleBulkAction("absent")}
                className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700"
              >
                Mark Absent
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Candidate Attendance Roster Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            Attendance Records ({filteredCandidates.length})
          </span>
          <span className="text-[11px] text-slate-500">
            Absent students are automatically excluded from the pending interview queue.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 pl-4 pr-2 w-8">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      filteredCandidates.length > 0 &&
                      selectedCandidateIds.length === filteredCandidates.length
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-3 py-3">S.No</th>
                <th className="px-3 py-3">Candidate</th>
                <th className="px-3 py-3">Program / Profile</th>
                <th className="px-3 py-3">Session & Panel</th>
                <th className="px-3 py-3">Attendance Status</th>
                <th className="px-3 py-3">Check-in Timestamp</th>
                <th className="px-3 py-3">Marked By / Audit Reason</th>
                <th className="py-3 pl-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCandidates.map((c, idx) => {
                const isSelected = selectedCandidateIds.includes(c.id);
                const session = sessions.find((s) => s.id === c.session_id);
                const panel = panels.find((p) => p.id === c.panel_id);

                return (
                  <tr
                    key={c.id}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-indigo-50/50"
                        : c.attendance_status === "absent"
                        ? "bg-rose-50/20"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="py-3 pl-4 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(c.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-3 font-mono font-medium text-slate-600">
                      #{c.original_sequence || idx + 1}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-900">{c.student_name}</div>
                      <div className="font-mono text-slate-500">{c.registration_number}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-800">{c.profile ?? "Unspecified"}</div>
                      <div className="text-slate-500">{c.program_name ?? "—"}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-slate-800">{session?.session_name.split("—")[0]?.trim()}</div>
                      <div className="text-slate-500">{panel?.panel_name.split("—")[0]?.trim()}</div>
                    </td>
                    <td className="px-3 py-3">
                      <AttendanceStatusBadge status={c.attendance_status} />
                    </td>
                    <td className="px-3 py-3 font-mono text-slate-600">
                      {c.check_in_at ? formatTimeInTimezone(c.check_in_at, event.timezone) : "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <div>{c.attendance_marked_by ?? "Automatic"}</div>
                      {c.attendance_correction_reason && (
                        <div className="text-[10px] text-amber-700 italic">
                          &ldquo;{c.attendance_correction_reason}&rdquo;
                        </div>
                      )}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {c.attendance_status !== "present" && (
                          <button
                            onClick={() => markAttendance(c.id, "present")}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            Present
                          </button>
                        )}
                        {c.attendance_status !== "absent" && (
                          <button
                            onClick={() => markAttendance(c.id, "absent", "Marked absent by coordinator")}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                          >
                            Absent
                          </button>
                        )}
                        <button
                          onClick={() => openCorrectionModal(c)}
                          title="Correct with audit reason"
                          className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Correction Modal */}
      {correctionCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Edit3 className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Correct Attendance for {correctionCandidate.student_name}
              </h3>
            </div>
            <form onSubmit={handleSaveCorrection} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  New Attendance Status
                </label>
                <select
                  value={correctionStatus}
                  onChange={(e) => setCorrectionStatus(e.target.value as AttendanceStatus)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="not_checked_in">Not Checked In</option>
                  <option value="absent">Absent</option>
                  <option value="excused">Excused</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Mandatory Correction Reason (Audit Trail)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Student arrived at venue after transit delay; confirmed ID in person."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectionCandidate(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Save & Log Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const styles: Record<AttendanceStatus, string> = {
    present: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    late: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
    not_checked_in: "bg-slate-100 text-slate-600",
    absent: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
    excused: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20",
  };
  const labels: Record<AttendanceStatus, string> = {
    present: "Present",
    late: "Late",
    not_checked_in: "Not Checked In",
    absent: "Absent",
    excused: "Excused",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
