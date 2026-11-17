export type EventStatus = "draft" | "published" | "paused" | "completed";
export type SessionStatus = "scheduled" | "active" | "paused" | "completed";
export type PanelStatus = "idle" | "active" | "paused" | "offline";

export type AttendanceStatus =
  | "not_checked_in"
  | "present"
  | "late"
  | "absent"
  | "excused";

export type InterviewStatus =
  | "waiting"
  | "in_progress"
  | "completed"
  | "skipped";

export type StudentReadinessStatus =
  | "not_ready"
  | "arrived"
  | "ready"
  | "needs_assistance";

export type AdminRole = "owner" | "admin" | "panel_manager" | "attendance_operator";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  assigned_panel_id?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
}

export type QueueSortStrategy =
  | "original_sequence"
  | "student_name"
  | "registration_number"
  | "priority"
  | "profile"
  | "program"
  | "attendance"
  | "manual";

export interface InterviewEvent {
  id: string;
  event_name: string;
  interview_date: string; // YYYY-MM-DD
  timezone: string; // e.g., "Asia/Kolkata"
  event_status: EventStatus;
  default_duration_minutes: number;
  schedule_revision: number;
  created_at: string;
  updated_at: string;
}

export interface InterviewSession {
  id: string;
  event_id: string;
  session_name: string;
  session_start_at: string; // ISO timestamp
  default_interview_duration: number;
  session_status: SessionStatus;
}

export interface InterviewPanel {
  id: string;
  event_id: string;
  panel_name: string;
  room_name: string | null;
  interviewer_name: string | null;
  panel_status: PanelStatus;
  assigned_staff_id?: string | null;
}

export interface Candidate {
  id: string;
  event_id: string;
  session_id: string;
  panel_id: string;
  registration_number: string;
  student_name: string;
  program_name: string | null;
  profile: string | null;
  original_sequence: number;
  queue_position: number;
  priority_level: number;
  estimated_duration_minutes: number;
  attendance_status: AttendanceStatus;
  check_in_at: string | null;
  attendance_marked_by?: string | null;
  attendance_correction_reason?: string | null;
  interview_status: InterviewStatus;
  original_slot_start_at: string | null;
  original_slot_end_at: string | null;
  expected_start_at: string | null;
  expected_end_at: string | null;
  access_pin_preview?: string; // Only shown on initial export in admin wizard
  readiness_status?: StudentReadinessStatus;
  called_at?: string | null;
  call_panel_id?: string | null;
  call_count?: number;
}

export interface ActiveInterviewRecord {
  id: string;
  candidate_id: string;
  panel_id: string;
  started_at: string;
  completed_at: string | null;
  planned_duration_minutes: number;
  actual_duration_minutes: number | null;
  expected_end_at: string;
  notes?: string | null;
}

export interface CalculatedCandidateSchedule {
  candidate: Candidate;
  originalStartAt: string;
  originalEndAt: string;
  expectedStartAt: string | null;
  expectedEndAt: string | null;
  liveQueuePosition: number | null;
  candidatesAhead: number;
  estimatedWaitMinutes: number;
  delayMinutes: number; // positive = delayed, negative = running early, 0 = on time
  isOverdue: boolean;
  overdueMinutes: number;
  isProvisional: boolean;
  scheduleState: "upcoming" | "approaching" | "in_progress" | "delayed" | "completed" | "inactive" | "called";
}

export interface PanelScheduleSnapshot {
  panelId: string;
  sessionId: string;
  activeCandidate: CalculatedCandidateSchedule | null;
  queue: CalculatedCandidateSchedule[];
  isPaused: boolean;
  hasOverdueInterview: boolean;
  computedAt: string;
}

export interface AuditLogEntry {
  id: string;
  event_id: string;
  actor_id?: string | null;
  actor_label: string;
  action: string;
  target_type: string;
  target_id: string | null;
  previous_value?: string | null;
  new_value?: string | null;
  reason?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BroadcastNotification {
  id: string;
  event_id: string;
  type: "schedule_updated" | "candidate_called" | "event_paused" | "event_resumed" | "announcement";
  title: string;
  message: string;
  target_candidate_id?: string | null;
  target_panel_id?: string | null;
  created_at: string;
}
