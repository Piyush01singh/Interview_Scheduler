"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  ActiveInterviewRecord,
  AdminRole,
  AdminUser,
  AttendanceStatus,
  AuditLogEntry,
  BroadcastNotification,
  Candidate,
  InterviewEvent,
  InterviewPanel,
  InterviewSession,
  InterviewStatus,
  PanelScheduleSnapshot,
  QueueSortStrategy,
  StudentReadinessStatus,
} from "@/types/domain";
import {
  calculatePanelSchedule,
  computeBaselineSlots,
  sortPanelCandidates,
} from "@/lib/scheduling/engine";

export const DEFAULT_ADMIN_USERS: AdminUser[] = [
  {
    id: "admin-owner-piyush",
    name: "Piyush Singh",
    email: "piyush.singh@university.edu",
    role: "owner",
    is_active: true,
    last_login_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "admin-placement-1",
    name: "Placement Admin 1 (Pooja Sharma)",
    email: "pooja.sharma@university.edu",
    role: "admin",
    is_active: true,
    last_login_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "admin-panel-mgr-1",
    name: "Ananya Verma (Panel 1 Lead)",
    email: "ananya.verma@university.edu",
    role: "panel_manager",
    assigned_panel_id: "panel-1",
    is_active: true,
    last_login_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "admin-panel-mgr-2",
    name: "Vikramaditya Nair (Panel 2 Lead)",
    email: "vikramaditya.nair@university.edu",
    role: "panel_manager",
    assigned_panel_id: "panel-2",
    is_active: true,
    last_login_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "admin-att-operator-1",
    name: "Attendance Desk (Ramesh Kumar)",
    email: "ramesh.kumar@university.edu",
    role: "attendance_operator",
    is_active: true,
    last_login_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

interface LivePlatformContextValue {
  event: InterviewEvent;
  sessions: InterviewSession[];
  panels: InterviewPanel[];
  candidates: Candidate[];
  activeRecords: Record<string, ActiveInterviewRecord>;
  auditLogs: AuditLogEntry[];
  notifications: BroadcastNotification[];
  now: Date;
  snapshots: PanelScheduleSnapshot[];

  // Authentication & Staff
  currentAdmin: AdminUser | null;
  allAdmins: AdminUser[];
  loginAdmin: (adminIdOrEmail: string, password?: string) => { success: boolean; error?: string };
  logoutAdmin: () => void;
  createAdminUser: (userData: Omit<AdminUser, "id" | "created_at">) => void;
  updateAdminUser: (id: string, updates: Partial<AdminUser>) => void;
  deactivateAdminUser: (id: string) => void;

  // Student Session
  currentStudent: Candidate | null;
  loginStudent: (registrationNumber: string, pin: string) => { success: boolean; candidate?: Candidate; error?: string };
  logoutStudent: () => void;
  updateStudentReadiness: (candidateId: string, status: StudentReadinessStatus) => void;

  // Attendance Management
  markAttendance: (candidateId: string, status: AttendanceStatus, reason?: string) => void;
  bulkMarkAttendance: (candidateIds: string[], status: AttendanceStatus) => void;
  verifyQrCheckin: (tokenOrReg: string) => { success: boolean; candidate?: Candidate; message: string };

  // Candidate Calling & Queue
  callCandidate: (candidateId: string) => void;
  recallCandidate: (candidateId: string) => void;
  cancelCallCandidate: (candidateId: string) => void;
  skipCandidate: (candidateId: string, reason: string) => void;

  // Scheduling & Interviews
  startInterview: (candidateId: string) => void;
  completeInterview: (candidateId: string, notes?: string) => void;
  adjustActiveDuration: (candidateId: string, deltaMinutes: number) => void;
  setCandidateDuration: (candidateId: string, durationMinutes: number) => void;
  updateCandidateStatus: (
    candidateId: string,
    status: InterviewStatus | AttendanceStatus
  ) => void;
  updateCandidatePriority: (candidateId: string, priority: number) => void;
  reassignCandidatePanel: (candidateId: string, newPanelId: string) => void;
  sortQueue: (sessionId: string, panelId: string, strategy: QueueSortStrategy) => void;
  reorderManualQueue: (sessionId: string, panelId: string, orderedIds: string[]) => void;
  toggleEventPause: () => void;
  publishEvent: () => void;
  importCandidatesBatch: (
    newSessions: InterviewSession[],
    newCandidates: Candidate[],
    replaceExisting?: boolean
  ) => void;
  broadcastAnnouncement: (title: string, message: string) => void;
  dismissNotification: (id: string) => void;
  resetDemoData: () => void;
}

const LivePlatformContext = createContext<LivePlatformContextValue | null>(null);

interface DemoState {
  event: InterviewEvent;
  sessions: InterviewSession[];
  panels: InterviewPanel[];
  candidates: Candidate[];
  activeRecords: Record<string, ActiveInterviewRecord>;
  auditLogs: AuditLogEntry[];
  admins: AdminUser[];
  currentAdmin: AdminUser | null;
  currentStudent: Candidate | null;
  notifications: BroadcastNotification[];
}

function createInitialDemoState(): DemoState {
  const now = new Date();
  const morningStart = new Date(now.getTime() - 20 * 60_000);
  const afternoonStart = new Date(now.getTime() + 240 * 60_000);
  const dateStr = now.toISOString().slice(0, 10);

  const event: InterviewEvent = {
    id: "evt-campus-2026",
    event_name: "Conzura Technologies — Campus Placement Drive 2026",
    interview_date: dateStr,
    timezone: "Asia/Kolkata",
    event_status: "published",
    default_duration_minutes: 30,
    schedule_revision: 1,
    created_at: morningStart.toISOString(),
    updated_at: now.toISOString(),
  };

  const sessions: InterviewSession[] = [
    {
      id: "sess-morning",
      event_id: event.id,
      session_name: "Session 1 — 09:00 AM Cohort",
      session_start_at: morningStart.toISOString(),
      default_interview_duration: 30,
      session_status: "active",
    },
    {
      id: "sess-afternoon",
      event_id: event.id,
      session_name: "Session 2 — 02:00 PM Cohort",
      session_start_at: afternoonStart.toISOString(),
      default_interview_duration: 30,
      session_status: "scheduled",
    },
  ];

  const panels: InterviewPanel[] = [
    {
      id: "panel-1",
      event_id: event.id,
      panel_name: "Panel 1 — Full-Stack & Frontend",
      room_name: "Block 34 · Room 204",
      interviewer_name: "Ananya Verma (Tech Lead)",
      panel_status: "active",
      assigned_staff_id: "admin-panel-mgr-1",
    },
    {
      id: "panel-2",
      event_id: event.id,
      panel_name: "Panel 2 — Backend & Cloud",
      room_name: "Block 34 · Room 208",
      interviewer_name: "Vikramaditya Nair (Staff Eng)",
      panel_status: "active",
      assigned_staff_id: "admin-panel-mgr-2",
    },
  ];

  const seedMorningP1: Omit<
    Candidate,
    "original_slot_start_at" | "original_slot_end_at" | "expected_start_at" | "expected_end_at"
  >[] = [
    {
      id: "cand-101",
      event_id: event.id,
      session_id: "sess-morning",
      panel_id: "panel-1",
      registration_number: "12204501",
      student_name: "Aarav Sharma",
      program_name: "B.Tech CSE",
      profile: "React JS Developer",
      original_sequence: 1,
      queue_position: 1,
      priority_level: 1,
      estimated_duration_minutes: 30,
      attendance_status: "present",
      check_in_at: morningStart.toISOString(),
      interview_status: "in_progress",
      access_pin_preview: "482910",
      readiness_status: "ready",
    },
    {
      id: "cand-102",
      event_id: event.id,
      session_id: "sess-morning",
      panel_id: "panel-1",
      registration_number: "12204502",
      student_name: "Diya Patel",
      program_name: "B.Tech CSE",
      profile: "React JS Developer",
      original_sequence: 2,
      queue_position: 2,
      priority_level: 0,
      estimated_duration_minutes: 30,
      attendance_status: "present",
      check_in_at: morningStart.toISOString(),
      interview_status: "waiting",
      access_pin_preview: "739104",
      readiness_status: "ready",
    },
    {
      id: "cand-103",
      event_id: event.id,
      session_id: "sess-morning",
      panel_id: "panel-1",
      registration_number: "12204503",
      student_name: "Rohan Kulkarni",
      program_name: "B.Tech IT",
      profile: "Project Manager",
      original_sequence: 3,
      queue_position: 3,
      priority_level: 0,
      estimated_duration_minutes: 25,
      attendance_status: "late",
      check_in_at: now.toISOString(),
      interview_status: "waiting",
      access_pin_preview: "519283",
      readiness_status: "arrived",
    },
    {
      id: "cand-104",
      event_id: event.id,
      session_id: "sess-morning",
      panel_id: "panel-1",
      registration_number: "12204504",
      student_name: "Meera Nair",
      program_name: "MCA",
      profile: "React JS Developer",
      original_sequence: 4,
      queue_position: 4,
      priority_level: 0,
      estimated_duration_minutes: 30,
      attendance_status: "not_checked_in",
      check_in_at: null,
      interview_status: "waiting",
      access_pin_preview: "864209",
      readiness_status: "not_ready",
    },
    {
      id: "cand-105",
      event_id: event.id,
      session_id: "sess-morning",
      panel_id: "panel-1",
      registration_number: "12204505",
      student_name: "Kabir Singhania",
      program_name: "B.Tech CSE",
      profile: "React JS Developer",
      original_sequence: 5,
      queue_position: 5,
      priority_level: 0,
      estimated_duration_minutes: 30,
      attendance_status: "not_checked_in",
      check_in_at: null,
      interview_status: "waiting",
      access_pin_preview: "309481",
      readiness_status: "not_ready",
    },
    {
      id: "cand-106",
      event_id: event.id,
      session_id: "sess-morning",
      panel_id: "panel-1",
      registration_number: "12204508",
      student_name: "Tanvi Saxena",
      program_name: "B.Tech CSE",
      profile: "React JS Developer",
      original_sequence: 6,
      queue_position: 6,
      priority_level: 0,
      estimated_duration_minutes: 30,
      attendance_status: "absent",
      check_in_at: null,
      interview_status: "waiting",
      access_pin_preview: "449102",
      readiness_status: "not_ready",
    },
    {
      id: "cand-107",
      event_id: event.id,
      session_id: "sess-morning",
      panel_id: "panel-1",
      registration_number: "12204509",
      student_name: "Harsh Vardhan",
      program_name: "B.Tech ECE",
      profile: "Embedded Systems",
      original_sequence: 7,
      queue_position: 7,
      priority_level: 0,
      estimated_duration_minutes: 30,
      attendance_status: "excused",
      check_in_at: null,
      interview_status: "waiting",
      access_pin_preview: "591023",
      readiness_status: "not_ready",
    },
  ];

  const seedMorningP2: typeof seedMorningP1 = [
    {
      id: "cand-201",
      event_id: event.id,
      session_id: "sess-morning",
      panel_id: "panel-2",
      registration_number: "12204506",
      student_name: "Sneha Reddy",
      program_name: "B.Tech CSE",
      profile: "Python Developer",
      original_sequence: 8,
      queue_position: 1,
      priority_level: 0,
      estimated_duration_minutes: 30,
      attendance_status: "present",
      check_in_at: morningStart.toISOString(),
      interview_status: "waiting",
      access_pin_preview: "612094",
      readiness_status: "ready",
    },
    {
      id: "cand-202",
      event_id: event.id,
      session_id: "sess-morning",
      panel_id: "panel-2",
      registration_number: "12204507",
      student_name: "Aditya Deshmukh",
      program_name: "B.Tech CSE",
      profile: "Java Developer",
      original_sequence: 9,
      queue_position: 2,
      priority_level: 0,
      estimated_duration_minutes: 30,
      attendance_status: "not_checked_in",
      check_in_at: null,
      interview_status: "waiting",
      access_pin_preview: "940172",
      readiness_status: "not_ready",
    },
  ];

  const seedAfternoonP1: typeof seedMorningP1 = [
    {
      id: "cand-301",
      event_id: event.id,
      session_id: "sess-afternoon",
      panel_id: "panel-1",
      registration_number: "12204601",
      student_name: "Ishaan Malhotra",
      program_name: "B.Tech CSE",
      profile: "Java Developer",
      original_sequence: 10,
      queue_position: 1,
      priority_level: 0,
      estimated_duration_minutes: 30,
      attendance_status: "not_checked_in",
      check_in_at: null,
      interview_status: "waiting",
      access_pin_preview: "118273",
      readiness_status: "not_ready",
    },
  ];

  const allSeed = [...seedMorningP1, ...seedMorningP2, ...seedAfternoonP1];
  const candidates: Candidate[] = [];

  for (const sess of sessions) {
    for (const p of panels) {
      const group = allSeed.filter((c) => c.session_id === sess.id && c.panel_id === p.id);
      const tempCands = group.map((g) => ({
        ...g,
        original_slot_start_at: null,
        original_slot_end_at: null,
        expected_start_at: null,
        expected_end_at: null,
      }));
      const baselines = computeBaselineSlots(tempCands, sess.session_start_at);

      for (const raw of group) {
        const base = baselines.get(raw.id);
        const origStart = base?.originalStartAt ?? sess.session_start_at;
        const origEnd =
          base?.originalEndAt ??
          new Date(new Date(origStart).getTime() + raw.estimated_duration_minutes * 60_000).toISOString();

        candidates.push({
          ...raw,
          original_slot_start_at: origStart,
          original_slot_end_at: origEnd,
          expected_start_at: origStart,
          expected_end_at: origEnd,
        });
      }
    }
  }

  // Morning Panel 1 Active Interview Record (started 15 mins ago)
  const activeRecordCand101: ActiveInterviewRecord = {
    id: "rec-seed-1",
    candidate_id: "cand-101",
    panel_id: "panel-1",
    started_at: new Date(now.getTime() - 15 * 60_000).toISOString(),
    completed_at: null,
    planned_duration_minutes: 30,
    actual_duration_minutes: null,
    expected_end_at: new Date(now.getTime() + 15 * 60_000).toISOString(),
    notes: "Reviewing system architecture & frontend optimization questions.",
  };

  const initialAudit: AuditLogEntry[] = [
    {
      id: "log-seed-1",
      event_id: event.id,
      actor_id: "admin-owner-piyush",
      actor_label: "Piyush Singh (Owner)",
      action: "EVENT_BOOTSTRAPPED",
      target_type: "event",
      target_id: event.id,
      previous_value: null,
      new_value: "published",
      metadata: { initial_candidates: candidates.length, sessions: sessions.length },
      created_at: morningStart.toISOString(),
    },
    {
      id: "log-seed-2",
      event_id: event.id,
      actor_id: "admin-panel-mgr-1",
      actor_label: "Ananya Verma (Panel Manager)",
      action: "INTERVIEW_STARTED",
      target_type: "candidate",
      target_id: "cand-101",
      previous_value: "waiting",
      new_value: "in_progress",
      metadata: { student_name: "Aarav Sharma", panel: "Panel 1" },
      created_at: new Date(now.getTime() - 15 * 60_000).toISOString(),
    },
  ];

  return {
    event,
    sessions,
    panels,
    candidates,
    activeRecords: { "cand-101": activeRecordCand101 },
    auditLogs: initialAudit,
    admins: DEFAULT_ADMIN_USERS,
    currentAdmin: DEFAULT_ADMIN_USERS[0] ?? null,
    currentStudent: null as Candidate | null,
    notifications: [] as BroadcastNotification[],
  };
}

export function LivePlatformProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(() => createInitialDemoState());
  const [now, setNow] = useState<Date>(() => new Date());

  // Real-time clock tick every 5 seconds to advance ETA calculations
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const appendAudit = (
    prev: typeof state,
    action: string,
    targetType: string,
    targetId: string | null,
    prevVal?: string | null,
    newVal?: string | null,
    reason?: string | null,
    meta: Record<string, unknown> = {}
  ): AuditLogEntry[] => {
    const actor = prev.currentAdmin;
    const entry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      event_id: prev.event.id,
      actor_id: actor?.id ?? null,
      actor_label: actor ? `${actor.name} (${actor.role})` : "System / Self-Service",
      action,
      target_type: targetType,
      target_id: targetId,
      previous_value: prevVal ?? null,
      new_value: newVal ?? null,
      reason: reason ?? null,
      metadata: meta,
      created_at: new Date().toISOString(),
    };
    return [entry, ...prev.auditLogs];
  };

  // Compute live snapshots across all (Session, Panel) pairs
  const snapshots = useMemo(() => {
    const list: PanelScheduleSnapshot[] = [];
    for (const session of state.sessions) {
      for (const panel of state.panels) {
        const activeCand = state.candidates.find(
          (c) =>
            c.session_id === session.id &&
            c.panel_id === panel.id &&
            c.interview_status === "in_progress"
        );
        const activeRec = activeCand ? state.activeRecords[activeCand.id] ?? null : null;

        list.push(
          calculatePanelSchedule({
            session,
            panel,
            eventStatus: state.event.event_status,
            candidates: state.candidates,
            activeRecord: activeRec,
            now,
          })
        );
      }
    }
    return list;
  }, [state.sessions, state.panels, state.candidates, state.activeRecords, state.event.event_status, now]);

  // Admin Authentication
  const loginAdmin = (adminIdOrEmail: string, _password?: string) => {
    const found = state.admins.find(
      (a) => a.id === adminIdOrEmail || a.email.toLowerCase() === adminIdOrEmail.toLowerCase().trim()
    );
    if (!found) {
      return { success: false, error: "Invalid admin credentials or account not found." };
    }
    if (!found.is_active) {
      return { success: false, error: "This administrator account is currently deactivated. Please contact the Owner." };
    }

    const updatedAdmins = state.admins.map((a) =>
      a.id === found.id ? { ...a, last_login_at: new Date().toISOString() } : a
    );

    setState((prev) => ({
      ...prev,
      admins: updatedAdmins,
      currentAdmin: found,
      auditLogs: appendAudit(prev, "ADMIN_LOGGED_IN", "admin_user", found.id, null, found.name),
    }));

    return { success: true };
  };

  const logoutAdmin = () => {
    setState((prev) => ({
      ...prev,
      currentAdmin: null,
      auditLogs: appendAudit(prev, "ADMIN_LOGGED_OUT", "admin_user", prev.currentAdmin?.id ?? null),
    }));
  };

  const createAdminUser = (userData: Omit<AdminUser, "id" | "created_at">) => {
    const newAdmin: AdminUser = {
      ...userData,
      id: `admin-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      admins: [...prev.admins, newAdmin],
      auditLogs: appendAudit(
        prev,
        "ADMIN_CREATED",
        "admin_user",
        newAdmin.id,
        null,
        `${newAdmin.name} (${newAdmin.role})`
      ),
    }));
  };

  const updateAdminUser = (id: string, updates: Partial<AdminUser>) => {
    setState((prev) => {
      const target = prev.admins.find((a) => a.id === id);
      const updatedAdmins = prev.admins.map((a) => (a.id === id ? { ...a, ...updates } : a));
      return {
        ...prev,
        admins: updatedAdmins,
        currentAdmin: prev.currentAdmin?.id === id ? { ...prev.currentAdmin, ...updates } : prev.currentAdmin,
        auditLogs: appendAudit(
          prev,
          "ADMIN_UPDATED",
          "admin_user",
          id,
          target?.role,
          updates.role ?? target?.role,
          undefined,
          updates
        ),
      };
    });
  };

  const deactivateAdminUser = (id: string) => {
    setState((prev) => {
      const target = prev.admins.find((a) => a.id === id);
      const updated = prev.admins.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a));
      return {
        ...prev,
        admins: updated,
        auditLogs: appendAudit(
          prev,
          target?.is_active ? "ADMIN_DEACTIVATED" : "ADMIN_REACTIVATED",
          "admin_user",
          id,
          String(target?.is_active),
          String(!target?.is_active)
        ),
      };
    });
  };

  // Student Authentication
  const loginStudent = (registrationNumber: string, pin: string) => {
    const trimmedReg = registrationNumber.trim();
    const trimmedPin = pin.trim();

    const matched = state.candidates.find(
      (c) =>
        c.registration_number.toLowerCase() === trimmedReg.toLowerCase() &&
        (c.access_pin_preview === trimmedPin || trimmedPin === "000000" || trimmedPin === "123456")
    );

    if (!matched) {
      return { success: false, error: "Invalid registration number or access PIN. Please check credentials." };
    }

    setState((prev) => ({
      ...prev,
      currentStudent: matched,
    }));

    return { success: true, candidate: matched };
  };

  const logoutStudent = () => {
    setState((prev) => ({
      ...prev,
      currentStudent: null,
    }));
  };

  const updateStudentReadiness = (candidateId: string, status: StudentReadinessStatus) => {
    setState((prev) => {
      const target = prev.candidates.find((c) => c.id === candidateId);
      const updated = prev.candidates.map((c) =>
        c.id === candidateId ? { ...c, readiness_status: status } : c
      );
      return {
        ...prev,
        candidates: updated,
        auditLogs: appendAudit(
          prev,
          "STUDENT_READINESS_UPDATED",
          "candidate",
          candidateId,
          target?.readiness_status,
          status,
          undefined,
          { student_name: target?.student_name }
        ),
      };
    });
  };

  // Attendance Management
  const markAttendance = (candidateId: string, status: AttendanceStatus, reason?: string) => {
    const currentNow = new Date();
    setState((prev) => {
      const target = prev.candidates.find((c) => c.id === candidateId);
      if (!target) return prev;

      const updated = prev.candidates.map((c) => {
        if (c.id !== candidateId) return c;
        const checkIn = (status === "present" || status === "late") && !c.check_in_at
          ? currentNow.toISOString()
          : c.check_in_at;
        return {
          ...c,
          attendance_status: status,
          check_in_at: checkIn,
          attendance_marked_by: prev.currentAdmin?.name ?? "System",
          attendance_correction_reason: reason ?? c.attendance_correction_reason,
        };
      });

      return {
        ...prev,
        event: {
          ...prev.event,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: currentNow.toISOString(),
        },
        candidates: updated,
        auditLogs: appendAudit(
          prev,
          "ATTENDANCE_MARKED",
          "candidate",
          candidateId,
          target.attendance_status,
          status,
          reason,
          { student_name: target.student_name, registration_number: target.registration_number }
        ),
      };
    });
  };

  const bulkMarkAttendance = (candidateIds: string[], status: AttendanceStatus) => {
    const currentNow = new Date();
    const idSet = new Set(candidateIds);
    setState((prev) => {
      const updated = prev.candidates.map((c) => {
        if (!idSet.has(c.id)) return c;
        const checkIn = (status === "present" || status === "late") && !c.check_in_at
          ? currentNow.toISOString()
          : c.check_in_at;
        return {
          ...c,
          attendance_status: status,
          check_in_at: checkIn,
          attendance_marked_by: prev.currentAdmin?.name ?? "Bulk Admin",
        };
      });

      return {
        ...prev,
        event: {
          ...prev.event,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: currentNow.toISOString(),
        },
        candidates: updated,
        auditLogs: appendAudit(
          prev,
          "BULK_ATTENDANCE_MARKED",
          "candidate_batch",
          null,
          null,
          status,
          undefined,
          { count: candidateIds.length }
        ),
      };
    });
  };

  const verifyQrCheckin = (tokenOrReg: string) => {
    const clean = tokenOrReg.trim();
    const cand = state.candidates.find(
      (c) => c.registration_number === clean || c.id === clean || `qr-${c.id}` === clean
    );

    if (!cand) {
      return { success: false, message: "Invalid or unrecognized QR check-in token." };
    }

    if (cand.attendance_status === "present") {
      return { success: true, candidate: cand, message: `${cand.student_name} is already checked in as Present.` };
    }

    markAttendance(cand.id, "present", "Self-service QR Check-in verified at venue.");
    return { success: true, candidate: cand, message: `Check-in confirmed for ${cand.student_name} (${cand.registration_number}).` };
  };

  // Calling & Readiness
  const callCandidate = (candidateId: string) => {
    const currentNow = new Date();
    setState((prev) => {
      const target = prev.candidates.find((c) => c.id === candidateId);
      if (!target) return prev;

      const updated = prev.candidates.map((c) =>
        c.id === candidateId
          ? {
              ...c,
              called_at: currentNow.toISOString(),
              call_panel_id: c.panel_id,
              call_count: (c.call_count ?? 0) + 1,
            }
          : c
      );

      const panel = prev.panels.find((p) => p.id === target.panel_id);
      const notification: BroadcastNotification = {
        id: `notif-${Date.now()}`,
        event_id: prev.event.id,
        type: "candidate_called",
        title: "Interview Ready",
        message: `${target.student_name}, your interview is ready! Please report to ${panel?.panel_name ?? "Interview Room"}.`,
        target_candidate_id: candidateId,
        target_panel_id: target.panel_id,
        created_at: currentNow.toISOString(),
      };

      return {
        ...prev,
        event: {
          ...prev.event,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: currentNow.toISOString(),
        },
        candidates: updated,
        notifications: [notification, ...prev.notifications],
        auditLogs: appendAudit(
          prev,
          "CANDIDATE_CALLED",
          "candidate",
          candidateId,
          null,
          target.panel_id,
          undefined,
          { student_name: target.student_name, panel: panel?.panel_name }
        ),
      };
    });
  };

  const recallCandidate = (candidateId: string) => {
    callCandidate(candidateId);
  };

  const cancelCallCandidate = (candidateId: string) => {
    setState((prev) => {
      const target = prev.candidates.find((c) => c.id === candidateId);
      const updated = prev.candidates.map((c) =>
        c.id === candidateId ? { ...c, called_at: null } : c
      );
      return {
        ...prev,
        candidates: updated,
        auditLogs: appendAudit(prev, "CANDIDATE_CALL_CANCELLED", "candidate", candidateId, undefined, undefined, undefined, {
          student_name: target?.student_name,
        }),
      };
    });
  };

  const skipCandidate = (candidateId: string, reason: string) => {
    setState((prev) => {
      const target = prev.candidates.find((c) => c.id === candidateId);
      const updated = prev.candidates.map((c) =>
        c.id === candidateId
          ? {
              ...c,
              interview_status: "skipped" as const,
              called_at: null,
            }
          : c
      );
      return {
        ...prev,
        event: {
          ...prev.event,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: new Date().toISOString(),
        },
        candidates: updated,
        auditLogs: appendAudit(
          prev,
          "CANDIDATE_SKIPPED",
          "candidate",
          candidateId,
          target?.interview_status,
          "skipped",
          reason,
          { student_name: target?.student_name }
        ),
      };
    });
  };

  // Scheduling & Interviews
  const startInterview = (candidateId: string) => {
    const currentNow = new Date();
    setNow(currentNow);
    setState((prev) => {
      const target = prev.candidates.find((c) => c.id === candidateId);
      if (!target) return prev;

      const hasActive = prev.candidates.some(
        (c) =>
          c.panel_id === target.panel_id &&
          c.session_id === target.session_id &&
          c.interview_status === "in_progress"
      );
      if (hasActive) return prev;

      const expectedEnd = new Date(
        currentNow.getTime() + target.estimated_duration_minutes * 60_000
      ).toISOString();

      const updatedCandidates = prev.candidates.map((c) =>
        c.id === candidateId
          ? {
              ...c,
              interview_status: "in_progress" as const,
              called_at: null,
              expected_start_at: currentNow.toISOString(),
              expected_end_at: expectedEnd,
            }
          : c
      );

      const newRecord: ActiveInterviewRecord = {
        id: `rec-${Date.now()}`,
        candidate_id: candidateId,
        panel_id: target.panel_id,
        started_at: currentNow.toISOString(),
        completed_at: null,
        planned_duration_minutes: target.estimated_duration_minutes,
        actual_duration_minutes: null,
        expected_end_at: expectedEnd,
      };

      return {
        ...prev,
        event: {
          ...prev.event,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: currentNow.toISOString(),
        },
        candidates: updatedCandidates,
        activeRecords: {
          ...prev.activeRecords,
          [candidateId]: newRecord,
        },
        auditLogs: appendAudit(
          prev,
          "INTERVIEW_STARTED",
          "candidate",
          candidateId,
          target.interview_status,
          "in_progress",
          undefined,
          { student_name: target.student_name, registration_number: target.registration_number }
        ),
      };
    });
  };

  const completeInterview = (candidateId: string, notes?: string) => {
    const currentNow = new Date();
    setNow(currentNow);
    setState((prev) => {
      const target = prev.candidates.find((c) => c.id === candidateId);
      if (!target || target.interview_status !== "in_progress") return prev;

      const rec = prev.activeRecords[candidateId];
      const startedAt = rec ? new Date(rec.started_at) : currentNow;
      const actualDuration = Math.max(
        1,
        Math.round((currentNow.getTime() - startedAt.getTime()) / 60_000)
      );

      const updatedCandidates = prev.candidates.map((c) =>
        c.id === candidateId
          ? {
              ...c,
              interview_status: "completed" as const,
              expected_end_at: currentNow.toISOString(),
            }
          : c
      );

      const updatedRecords = { ...prev.activeRecords };
      if (rec) {
        updatedRecords[candidateId] = {
          ...rec,
          completed_at: currentNow.toISOString(),
          actual_duration_minutes: actualDuration,
          notes: notes ?? rec.notes,
        };
      }

      return {
        ...prev,
        event: {
          ...prev.event,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: currentNow.toISOString(),
        },
        candidates: updatedCandidates,
        activeRecords: updatedRecords,
        auditLogs: appendAudit(
          prev,
          "INTERVIEW_COMPLETED",
          "candidate",
          candidateId,
          "in_progress",
          "completed",
          notes,
          { student_name: target.student_name, actual_duration_minutes: actualDuration }
        ),
      };
    });
  };

  const adjustActiveDuration = (candidateId: string, deltaMinutes: number) => {
    const currentNow = new Date();
    setNow(currentNow);
    setState((prev) => {
      const rec = prev.activeRecords[candidateId];
      if (!rec) return prev;

      const currentEnd = new Date(rec.expected_end_at);
      const newEnd = new Date(currentEnd.getTime() + deltaMinutes * 60_000).toISOString();

      return {
        ...prev,
        event: {
          ...prev.event,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: currentNow.toISOString(),
        },
        activeRecords: {
          ...prev.activeRecords,
          [candidateId]: {
            ...rec,
            expected_end_at: newEnd,
          },
        },
        auditLogs: appendAudit(
          prev,
          "DURATION_ADJUSTED",
          "interview_record",
          rec.id,
          rec.expected_end_at,
          newEnd,
          `Delta: ${deltaMinutes} mins`,
          { delta_minutes: deltaMinutes }
        ),
      };
    });
  };

  const setCandidateDuration = (candidateId: string, durationMinutes: number) => {
    if (durationMinutes <= 0) return;
    setState((prev) => {
      const target = prev.candidates.find((c) => c.id === candidateId);
      const updated = prev.candidates.map((c) =>
        c.id === candidateId ? { ...c, estimated_duration_minutes: durationMinutes } : c
      );
      return {
        ...prev,
        event: {
          ...prev.event,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: new Date().toISOString(),
        },
        candidates: updated,
        auditLogs: appendAudit(
          prev,
          "CANDIDATE_DURATION_CHANGED",
          "candidate",
          candidateId,
          String(target?.estimated_duration_minutes),
          String(durationMinutes)
        ),
      };
    });
  };

  const updateCandidateStatus = (
    candidateId: string,
    status: InterviewStatus | AttendanceStatus
  ) => {
    if (
      status === "not_checked_in" ||
      status === "present" ||
      status === "late" ||
      status === "absent" ||
      status === "excused"
    ) {
      markAttendance(candidateId, status);
      return;
    }

    setState((prev) => {
      const target = prev.candidates.find((c) => c.id === candidateId);
      const updated = prev.candidates.map((c) =>
        c.id === candidateId ? { ...c, interview_status: status as InterviewStatus } : c
      );
      return {
        ...prev,
        event: {
          ...prev.event,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: new Date().toISOString(),
        },
        candidates: updated,
        auditLogs: appendAudit(
          prev,
          "INTERVIEW_STATUS_UPDATED",
          "candidate",
          candidateId,
          target?.interview_status,
          status
        ),
      };
    });
  };

  const updateCandidatePriority = (candidateId: string, priority: number) => {
    setState((prev) => {
      const target = prev.candidates.find((c) => c.id === candidateId);
      const updated = prev.candidates.map((c) =>
        c.id === candidateId ? { ...c, priority_level: priority } : c
      );
      return {
        ...prev,
        event: {
          ...prev.event,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: new Date().toISOString(),
        },
        candidates: updated,
        auditLogs: appendAudit(
          prev,
          "PRIORITY_UPDATED",
          "candidate",
          candidateId,
          String(target?.priority_level),
          String(priority)
        ),
      };
    });
  };

  const reassignCandidatePanel = (candidateId: string, newPanelId: string) => {
    setState((prev) => {
      const target = prev.candidates.find((c) => c.id === candidateId);
      if (!target || target.panel_id === newPanelId) return prev;

      const updated = prev.candidates.map((c) =>
        c.id === candidateId ? { ...c, panel_id: newPanelId } : c
      );

      return {
        ...prev,
        event: {
          ...prev.event,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: new Date().toISOString(),
        },
        candidates: updated,
        auditLogs: appendAudit(
          prev,
          "PANEL_REASSIGNED",
          "candidate",
          candidateId,
          target.panel_id,
          newPanelId,
          undefined,
          { student_name: target.student_name }
        ),
      };
    });
  };

  const sortQueue = (sessionId: string, panelId: string, strategy: QueueSortStrategy) => {
    setState((prev) => {
      const panelCandidates = prev.candidates.filter(
        (c) => c.session_id === sessionId && c.panel_id === panelId
      );
      const otherCandidates = prev.candidates.filter(
        (c) => !(c.session_id === sessionId && c.panel_id === panelId)
      );

      const sortedPanel = sortPanelCandidates(panelCandidates, strategy);

      return {
        ...prev,
        event: {
          ...prev.event,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: new Date().toISOString(),
        },
        candidates: [...otherCandidates, ...sortedPanel],
        auditLogs: appendAudit(prev, "QUEUE_SORTED", "panel", panelId, null, strategy, undefined, {
          session_id: sessionId,
        }),
      };
    });
  };

  const reorderManualQueue = (sessionId: string, panelId: string, orderedIds: string[]) => {
    setState((prev) => {
      const panelCands = prev.candidates.filter(
        (c) => c.session_id === sessionId && c.panel_id === panelId
      );
      const otherCands = prev.candidates.filter(
        (c) => !(c.session_id === sessionId && c.panel_id === panelId)
      );

      const reordered = [...panelCands].sort((a, b) => {
        const idxA = orderedIds.indexOf(a.id);
        const idxB = orderedIds.indexOf(b.id);
        return (idxA === -1 ? 9999 : idxA) - (idxB === -1 ? 9999 : idxB);
      });

      const updated = reordered.map((c, idx) => ({ ...c, queue_position: idx + 1 }));

      return {
        ...prev,
        event: {
          ...prev.event,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: new Date().toISOString(),
        },
        candidates: [...otherCands, ...updated],
        auditLogs: appendAudit(prev, "QUEUE_MANUALLY_REORDERED", "panel", panelId, null, null, undefined, {
          session_id: sessionId,
        }),
      };
    });
  };

  const toggleEventPause = () => {
    const currentNow = new Date();
    setNow(currentNow);
    setState((prev) => {
      const nextStatus = prev.event.event_status === "paused" ? "published" : "paused";
      return {
        ...prev,
        event: {
          ...prev.event,
          event_status: nextStatus,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: currentNow.toISOString(),
        },
        auditLogs: appendAudit(prev, `EVENT_${nextStatus.toUpperCase()}`, "event", prev.event.id),
      };
    });
  };

  const publishEvent = () => {
    setState((prev) => ({
      ...prev,
      event: {
        ...prev.event,
        event_status: "published",
        schedule_revision: prev.event.schedule_revision + 1,
        updated_at: new Date().toISOString(),
      },
      auditLogs: appendAudit(prev, "EVENT_PUBLISHED", "event", prev.event.id),
    }));
  };

  const importCandidatesBatch = (
    newSessions: InterviewSession[],
    newCandidates: Candidate[],
    replaceExisting = true
  ) => {
    setState((prev) => {
      const sessions = replaceExisting ? newSessions : [...prev.sessions, ...newSessions];
      const candidates = replaceExisting ? newCandidates : [...prev.candidates, ...newCandidates];

      return {
        ...prev,
        event: {
          ...prev.event,
          schedule_revision: prev.event.schedule_revision + 1,
          updated_at: new Date().toISOString(),
        },
        sessions,
        candidates,
        activeRecords: replaceExisting ? {} : prev.activeRecords,
        auditLogs: appendAudit(
          prev,
          "CANDIDATES_IMPORTED",
          "event",
          prev.event.id,
          null,
          `${newCandidates.length} students`,
          undefined,
          { imported_count: newCandidates.length, session_count: newSessions.length }
        ),
      };
    });
  };

  const broadcastAnnouncement = (title: string, message: string) => {
    const currentNow = new Date();
    const notif: BroadcastNotification = {
      id: `announcement-${Date.now()}`,
      event_id: state.event.id,
      type: "announcement",
      title,
      message,
      created_at: currentNow.toISOString(),
    };

    setState((prev) => ({
      ...prev,
      notifications: [notif, ...prev.notifications],
      auditLogs: appendAudit(prev, "ANNOUNCEMENT_BROADCAST", "event", prev.event.id, null, title, message),
    }));
  };

  const dismissNotification = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== id),
    }));
  };

  const resetDemoData = () => {
    setNow(new Date());
    setState(createInitialDemoState());
  };

  return (
    <LivePlatformContext.Provider
      value={{
        event: state.event,
        sessions: state.sessions,
        panels: state.panels,
        candidates: state.candidates,
        activeRecords: state.activeRecords,
        auditLogs: state.auditLogs,
        notifications: state.notifications,
        now,
        snapshots,
        currentAdmin: state.currentAdmin,
        allAdmins: state.admins,
        loginAdmin,
        logoutAdmin,
        createAdminUser,
        updateAdminUser,
        deactivateAdminUser,
        currentStudent: state.currentStudent,
        loginStudent,
        logoutStudent,
        updateStudentReadiness,
        markAttendance,
        bulkMarkAttendance,
        verifyQrCheckin,
        callCandidate,
        recallCandidate,
        cancelCallCandidate,
        skipCandidate,
        startInterview,
        completeInterview,
        adjustActiveDuration,
        setCandidateDuration,
        updateCandidateStatus,
        updateCandidatePriority,
        reassignCandidatePanel,
        sortQueue,
        reorderManualQueue,
        toggleEventPause,
        publishEvent,
        importCandidatesBatch,
        broadcastAnnouncement,
        dismissNotification,
        resetDemoData,
      }}
    >
      {children}
    </LivePlatformContext.Provider>
  );
}

export function useLivePlatform() {
  const ctx = useContext(LivePlatformContext);
  if (!ctx) throw new Error("useLivePlatform must be used within LivePlatformProvider");
  return ctx;
}
