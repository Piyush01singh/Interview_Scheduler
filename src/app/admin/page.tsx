"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Bell,
  CheckCircle2,
  Clock,
  GripVertical,
  Megaphone,
  PhoneCall,
  Play,
  RotateCcw,
  Search,
  SkipForward,
  Square,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useLivePlatform } from "@/lib/demo/store";
import { formatTimeInTimezone } from "@/lib/utils/format";
import { AttendanceStatus, Candidate, InterviewStatus, QueueSortStrategy, StudentReadinessStatus } from "@/types/domain";

export default function AdminCommandCentrePage() {
  const {
    event,
    sessions,
    panels,
    candidates,
    activeRecords,
    snapshots,
    now,
    currentAdmin,
    startInterview,
    completeInterview,
    adjustActiveDuration,
    setCandidateDuration,
    markAttendance,
    updateCandidateStatus,
    callCandidate,
    recallCandidate,
    cancelCallCandidate,
    skipCandidate,
    updateCandidatePriority,
    reassignCandidatePanel,
    sortQueue,
    reorderManualQueue,
    broadcastAnnouncement,
  } = useLivePlatform();

  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id ?? "");
  const [selectedPanelId, setSelectedPanelId] = useState<string>(panels[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [attendanceFilter, setAttendanceFilter] = useState<string>("all");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Announcement modal state
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");

  const activeSessionId = sessions.some((s) => s.id === selectedSessionId)
    ? selectedSessionId
    : sessions[0]?.id ?? "";
  const activePanelId = panels.some((p) => p.id === selectedPanelId)
    ? selectedPanelId
    : panels[0]?.id ?? "";

  const currentSnapshot = useMemo(
    () =>
      snapshots.find(
        (s) => s.sessionId === activeSessionId && s.panelId === activePanelId
      ) ?? null,
    [snapshots, activeSessionId, activePanelId]
  );

  // Event-wide KPIs with clean separation of attendance and interview progress
  const kpis = useMemo(() => {
    const total = candidates.length;
    const waiting = candidates.filter((c) => c.interview_status === "waiting" && c.attendance_status !== "absent").length;
    const present = candidates.filter((c) => c.attendance_status === "present").length;
    const inProgress = candidates.filter((c) => c.interview_status === "in_progress").length;
    const completed = candidates.filter((c) => c.interview_status === "completed").length;
    const absent = candidates.filter(
      (c) => c.attendance_status === "absent" || c.interview_status === "skipped"
    ).length;

    let delayed = 0;
    for (const snap of snapshots) {
      for (const item of snap.queue) {
        if (item.liveQueuePosition !== null && item.delayMinutes >= 10) {
          delayed++;
        }
      }
    }

    return { total, waiting, present, inProgress, completed, absent, delayed };
  }, [candidates, snapshots]);

  const filteredQueue = useMemo(() => {
    if (!currentSnapshot) return [];
    return currentSnapshot.queue.filter((item) => {
      const c = item.candidate;
      const matchesSearch =
        !searchQuery.trim() ||
        c.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.profile ?? "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || c.interview_status === statusFilter;

      const matchesAttendance =
        attendanceFilter === "all" || c.attendance_status === attendanceFilter;

      return matchesSearch && matchesStatus && matchesAttendance;
    });
  }, [currentSnapshot, searchQuery, statusFilter, attendanceFilter]);

  const activeCand = currentSnapshot?.activeCandidate ?? null;
  const activeRec = activeCand ? activeRecords[activeCand.candidate.id] : null;
  const elapsedMinutes = activeRec
    ? Math.max(0, Math.round((now.getTime() - new Date(activeRec.started_at).getTime()) / 60_000))
    : 0;
  const remainingMinutes = activeRec
    ? Math.round((new Date(activeRec.expected_end_at).getTime() - now.getTime()) / 60_000)
    : 0;

  const handleSortChange = (strategy: QueueSortStrategy) => {
    if (!activeSessionId || !activePanelId) return;
    sortQueue(activeSessionId, activePanelId, strategy);
  };

  const handleDropReorder = (targetCandidateId: string) => {
    if (!draggedId || draggedId === targetCandidateId || !currentSnapshot) return;
    const ids = currentSnapshot.queue.map((q) => q.candidate.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetCandidateId);
    if (fromIdx === -1 || toIdx === -1) return;

    const targetStatus = currentSnapshot.queue[toIdx]?.candidate.interview_status;
    if (targetStatus === "completed" || targetStatus === "in_progress") return;

    const nextIds = [...ids];
    const [moved] = nextIds.splice(fromIdx, 1);
    if (moved) {
      nextIds.splice(toIdx, 0, moved);
      reorderManualQueue(activeSessionId, activePanelId, nextIds);
    }
    setDraggedId(null);
  };

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementMessage.trim()) return;
    broadcastAnnouncement(announcementTitle.trim(), announcementMessage.trim());
    setAnnouncementTitle("");
    setAnnouncementMessage("");
    setShowAnnouncementModal(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Action Bar with Operator Identity & Emergency Announcement */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                Placement Live Command Console
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                Admin: {currentAdmin?.name ?? "Piyush Singh (Owner)"}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live deterministic ETA propagation with train-grade station tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Megaphone className="h-3.5 w-3.5 text-indigo-600" />
            Broadcast Announcement
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <KpiCard label="Total Registered" value={kpis.total} />
        <KpiCard label="Waiting in Queue" value={kpis.waiting} />
        <KpiCard label="Present at Venue" value={kpis.present} accent="text-sky-700" />
        <KpiCard label="In Progress" value={kpis.inProgress} accent="text-indigo-700" />
        <KpiCard label="Completed" value={kpis.completed} accent="text-emerald-700" />
        <KpiCard label="Absent / Skipped" value={kpis.absent} accent="text-slate-500" />
        <KpiCard
          label="Delayed (>10m)"
          value={kpis.delayed}
          accent={kpis.delayed > 0 ? "text-amber-700" : "text-slate-900"}
        />
      </div>

      {/* Session & Panel Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Cohort Session
            </label>
            <select
              value={activeSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.session_name} ({formatTimeInTimezone(s.session_start_at, event.timezone)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Interview Panel
            </label>
            <select
              value={activePanelId}
              onChange={(e) => setSelectedPanelId(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              {panels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.panel_name} {p.room_name ? `(${p.room_name})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">Sort Waiting Queue:</span>
          <select
            defaultValue="manual"
            onChange={(e) => handleSortChange(e.target.value as QueueSortStrategy)}
            className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none"
          >
            <option value="manual">Current Queue Order</option>
            <option value="attendance">Attendance Status (Present First)</option>
            <option value="original_sequence">Original S.No. Sequence</option>
            <option value="priority">Priority Level (High → Low)</option>
            <option value="student_name">Alphabetical (Name)</option>
            <option value="registration_number">Registration Number</option>
            <option value="profile">Job Profile</option>
            <option value="program">Academic Program</option>
          </select>
        </div>
      </div>

      {/* Active Interview Spotlight Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <h2 className="text-sm font-semibold text-slate-900">
              Currently Running Interview
            </h2>
          </div>
          {activeCand?.isOverdue && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
              <AlertTriangle className="h-3.5 w-3.5" />
              Overrun by {activeCand.overdueMinutes} min — Downstream ETAs marked provisional
            </span>
          )}
        </div>

        {activeCand ? (
          <div className="mt-4 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xl font-semibold text-slate-900">
                  {activeCand.candidate.student_name}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700">
                  {activeCand.candidate.registration_number}
                </span>
                {activeCand.candidate.profile && (
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {activeCand.candidate.profile}
                  </span>
                )}
                <AttendanceBadge status={activeCand.candidate.attendance_status} />
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                <span>
                  Started:{" "}
                  <strong className="text-slate-900">
                    {formatTimeInTimezone(activeCand.expectedStartAt, event.timezone)}
                  </strong>
                </span>
                <span>
                  Expected Finish:{" "}
                  <strong className="text-slate-900">
                    {formatTimeInTimezone(activeCand.expectedEndAt, event.timezone)}
                  </strong>
                </span>
                <span>
                  Elapsed: <strong className="text-slate-900">{elapsedMinutes}m</strong>
                </span>
                <span>
                  {remainingMinutes >= 0 ? (
                    <>
                      Remaining: <strong className="text-emerald-700">{remainingMinutes}m</strong>
                    </>
                  ) : (
                    <>
                      Overdue:{" "}
                      <strong className="text-rose-700">{Math.abs(remainingMinutes)}m</strong>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  onClick={() => adjustActiveDuration(activeCand.candidate.id, -5)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white hover:shadow-xs"
                >
                  -5m
                </button>
                <button
                  onClick={() => adjustActiveDuration(activeCand.candidate.id, 5)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white hover:shadow-xs"
                >
                  +5m
                </button>
                <button
                  onClick={() => adjustActiveDuration(activeCand.candidate.id, 10)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white hover:shadow-xs"
                >
                  +10m
                </button>
                <button
                  onClick={() => adjustActiveDuration(activeCand.candidate.id, 15)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white hover:shadow-xs"
                >
                  +15m
                </button>
              </div>

              <button
                onClick={() => completeInterview(activeCand.candidate.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete Interview
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5">
            <div className="text-sm text-slate-600">
              No interview is currently active on this panel. Call the next candidate or click{" "}
              <strong className="text-slate-900">Start</strong> to begin.
            </div>
          </div>
        )}
      </div>

      {/* Live Candidate Queue Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">
              Live Panel Queue ({filteredQueue.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, reg no, profile..."
                className="rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-slate-900 focus:outline-none"
            >
              <option value="all">All Interview Statuses</option>
              <option value="waiting">Waiting</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="skipped">Skipped</option>
            </select>

            <select
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-slate-900 focus:outline-none"
            >
              <option value="all">All Attendance</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="not_checked_in">Not Checked In</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 pl-4 pr-2">Pos</th>
                <th className="px-3 py-3">Candidate & Readiness</th>
                <th className="px-3 py-3">Profile / Program</th>
                <th className="px-3 py-3">Attendance</th>
                <th className="px-3 py-3">Interview Status</th>
                <th className="px-3 py-3">Original Slot</th>
                <th className="px-3 py-3">Live Expected ETA</th>
                <th className="px-3 py-3">Est. Dur</th>
                <th className="px-3 py-3">PIN</th>
                <th className="py-3 pl-3 pr-4 text-right">Calling & Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQueue.map((item) => {
                const c = item.candidate;
                const isLocked =
                  c.interview_status === "completed" || c.interview_status === "in_progress";

                return (
                  <tr
                    key={c.id}
                    draggable={!isLocked}
                    onDragStart={() => setDraggedId(c.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropReorder(c.id)}
                    className={`transition-colors ${
                      c.interview_status === "in_progress"
                        ? "bg-indigo-50/40"
                        : c.interview_status === "completed"
                        ? "bg-slate-50/50 text-slate-500"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-3 pl-4 pr-2 font-mono text-xs font-medium text-slate-600">
                      <div className="flex items-center gap-1.5">
                        {!isLocked && (
                          <GripVertical className="h-3.5 w-3.5 cursor-grab text-slate-300 hover:text-slate-500" />
                        )}
                        <span>
                          {item.liveQueuePosition !== null
                            ? `#${item.liveQueuePosition}`
                            : c.interview_status === "in_progress"
                            ? "NOW"
                            : "—"}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900 flex items-center gap-1.5">
                        {c.student_name}
                        {c.priority_level > 0 && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            P{c.priority_level}
                          </span>
                        )}
                        {c.called_at && (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 animate-pulse">
                            <PhoneCall className="h-2.5 w-2.5" />
                            CALLED
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-slate-500 flex items-center gap-2">
                        <span>{c.registration_number} · S.No #{c.original_sequence}</span>
                        {c.readiness_status && <ReadinessBadge status={c.readiness_status} />}
                      </div>
                    </td>

                    <td className="px-3 py-3 text-xs">
                      <div className="font-medium text-slate-700">
                        {c.profile ?? "Unspecified"}
                      </div>
                      <div className="text-slate-500">{c.program_name ?? "—"}</div>
                    </td>

                    <td className="px-3 py-3">
                      <AttendanceBadge status={c.attendance_status} />
                    </td>

                    <td className="px-3 py-3">
                      <InterviewStatusBadge status={c.interview_status} />
                    </td>

                    <td className="px-3 py-3 font-mono text-xs text-slate-500">
                      {formatTimeInTimezone(item.originalStartAt, event.timezone)}
                    </td>

                    <td className="px-3 py-3">
                      {item.expectedStartAt ? (
                        <div>
                          <div className="font-mono text-xs font-semibold text-slate-900">
                            {formatTimeInTimezone(item.expectedStartAt, event.timezone)}
                            {item.isProvisional && (
                              <span
                                title="Provisional due to active interview overrun or paused queue"
                                className="ml-1 text-amber-600"
                              >
                                *
                              </span>
                            )}
                          </div>
                          <DelayTag delayMinutes={item.delayMinutes} />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      {!isLocked ? (
                        <select
                          value={c.estimated_duration_minutes}
                          onChange={(e) =>
                            setCandidateDuration(c.id, Number(e.target.value))
                          }
                          className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs font-medium text-slate-700"
                        >
                          {[15, 20, 25, 30, 40, 45, 60].map((m) => (
                            <option key={m} value={m}>
                              {m}m
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-600">
                          {c.estimated_duration_minutes}m
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3 font-mono text-xs text-slate-500">
                      {c.access_pin_preview ?? "••••••"}
                    </td>

                    <td className="py-3 pl-3 pr-4 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        {c.interview_status === "waiting" && (
                          <>
                            {/* Call candidate button */}
                            {!c.called_at ? (
                              <button
                                onClick={() => callCandidate(c.id)}
                                title="Call candidate to panel room"
                                className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                              >
                                <PhoneCall className="h-3 w-3" />
                                Call
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => recallCandidate(c.id)}
                                  title="Repeat audio/in-app call"
                                  className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                >
                                  Recall
                                </button>
                                <button
                                  onClick={() => cancelCallCandidate(c.id)}
                                  title="Cancel call"
                                  className="rounded-md border border-slate-200 px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100"
                                >
                                  ×
                                </button>
                              </div>
                            )}

                            {/* Start interview button */}
                            <button
                              onClick={() => startInterview(c.id)}
                              disabled={Boolean(activeCand)}
                              title={
                                activeCand
                                  ? "Complete currently active interview first"
                                  : "Start Interview"
                              }
                              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Play className="h-3 w-3" />
                              Start
                            </button>

                            {/* Attendance quick-toggle */}
                            {c.attendance_status !== "present" && (
                              <button
                                onClick={() => markAttendance(c.id, "present")}
                                title="Mark Present"
                                className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {c.attendance_status !== "absent" && (
                              <button
                                onClick={() => markAttendance(c.id, "absent", "No-show at panel call")}
                                title="Mark Absent"
                                className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                              >
                                <UserX className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Skip button */}
                            <button
                              onClick={() => skipCandidate(c.id, "Skipped by panel coordinator")}
                              title="Skip Candidate"
                              className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            >
                              <SkipForward className="h-3.5 w-3.5" />
                            </button>

                            {/* Priority toggle */}
                            <button
                              onClick={() =>
                                updateCandidatePriority(c.id, c.priority_level > 0 ? 0 : 1)
                              }
                              title="Toggle Priority Boost"
                              className={`rounded-md border px-2 py-1 text-[11px] font-medium ${
                                c.priority_level > 0
                                  ? "border-amber-300 bg-amber-50 text-amber-800"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {c.priority_level > 0 ? "P1" : "+P"}
                            </button>

                            {panels.length > 1 && (
                              <select
                                value={c.panel_id}
                                onChange={(e) => reassignCandidatePanel(c.id, e.target.value)}
                                title="Reassign to another panel"
                                className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-600"
                              >
                                {panels.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.panel_name.split("—")[0]?.trim()}
                                  </option>
                                ))}
                              </select>
                            )}
                          </>
                        )}

                        {c.interview_status === "in_progress" && (
                          <button
                            onClick={() => completeInterview(c.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            <Square className="h-3 w-3" />
                            Complete
                          </button>
                        )}

                        {(c.interview_status === "skipped" || c.attendance_status === "absent") && (
                          <button
                            onClick={() => {
                              markAttendance(c.id, "present", "Reinstated by operator");
                              updateCandidateStatus(c.id, "waiting");
                            }}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Reinstate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Megaphone className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-semibold text-slate-900">
                Broadcast Emergency Announcement
              </h3>
            </div>
            <form onSubmit={handleSendAnnouncement} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Announcement Headline
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Panel 2 Relocated to Room 210"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Message Details (broadcast to all 10k student devices)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Please proceed to Block 34 Room 210 if assigned to Panel 2."
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Broadcast to All Students
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent = "text-slate-900",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight ${accent}`}>{value}</div>
    </div>
  );
}

function AttendanceBadge({ status }: { status: AttendanceStatus }) {
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

function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  const styles: Record<InterviewStatus, string> = {
    waiting: "bg-slate-100 text-slate-700",
    in_progress: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20",
    completed: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    skipped: "bg-slate-100 text-slate-400",
  };
  const labels: Record<InterviewStatus, string> = {
    waiting: "Waiting",
    in_progress: "In Progress",
    completed: "Completed",
    skipped: "Skipped",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function ReadinessBadge({ status }: { status: StudentReadinessStatus }) {
  if (status === "ready") {
    return (
      <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        Ready
      </span>
    );
  }
  if (status === "arrived") {
    return (
      <span className="rounded bg-sky-50 px-1.5 py-0.2 text-[10px] font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
        Arrived
      </span>
    );
  }
  if (status === "needs_assistance") {
    return (
      <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
        Needs Help
      </span>
    );
  }
  return null;
}

function DelayTag({ delayMinutes }: { delayMinutes: number }) {
  if (Math.abs(delayMinutes) < 2) {
    return <span className="text-[11px] text-emerald-600">On schedule</span>;
  }
  if (delayMinutes < 0) {
    return (
      <span className="text-[11px] font-medium text-emerald-700">
        {Math.abs(delayMinutes)}m early
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium text-amber-700">
      +{delayMinutes}m delayed
    </span>
  );
}
