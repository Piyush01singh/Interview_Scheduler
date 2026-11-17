import {
  ActiveInterviewRecord,
  CalculatedCandidateSchedule,
  Candidate,
  EventStatus,
  InterviewPanel,
  InterviewSession,
  PanelScheduleSnapshot,
  QueueSortStrategy,
} from "@/types/domain";

function addMinutes(isoOrDate: string | Date, minutes: number): Date {
  const base = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Date(base.getTime() + minutes * 60_000);
}

function diffMinutes(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / 60_000);
}

function isCandidateInactive(c: Candidate): boolean {
  if (c.interview_status === "skipped") return true;
  if ((c.interview_status as string) === "absent" || (c.interview_status as string) === "skipped") return true;
  if (c.attendance_status === "absent" || c.attendance_status === "excused") return true;
  return false;
}

function isCandidateWaiting(c: Candidate): boolean {
  if (isCandidateInactive(c)) return false;
  if (c.interview_status === "completed" || c.interview_status === "in_progress") return false;
  return (
    c.interview_status === "waiting" ||
    (c.interview_status as string) === "present" ||
    (c.interview_status as string) === "late"
  );
}

/**
 * Computes the static baseline original slots for a panel within a session.
 * Never overwritten by live delays so both admin and student can compare against original slot.
 */
export function computeBaselineSlots(
  candidates: Candidate[],
  sessionStartAt: string
): Map<string, { originalStartAt: string; originalEndAt: string }> {
  const sorted = [...candidates].sort((a, b) => a.queue_position - b.queue_position);
  let cursor = new Date(sessionStartAt);
  const map = new Map<string, { originalStartAt: string; originalEndAt: string }>();

  for (const c of sorted) {
    const start = new Date(cursor);
    const end = addMinutes(start, c.estimated_duration_minutes);
    map.set(c.id, {
      originalStartAt: start.toISOString(),
      originalEndAt: end.toISOString(),
    });
    cursor = end;
  }
  return map;
}

export interface CalculatePanelScheduleInput {
  session: InterviewSession;
  panel: InterviewPanel;
  eventStatus: EventStatus;
  candidates: Candidate[];
  activeRecord: ActiveInterviewRecord | null;
  now?: Date;
}

/**
 * Pure, deterministic live ETA engine for a single (Session, Panel) pair.
 * Handles early completion, active interview extension, overdue flag without fabricating
 * fake finish times, absent/skipped filtering, and future session start clamping.
 */
export function calculatePanelSchedule({
  session,
  panel,
  eventStatus,
  candidates,
  activeRecord,
  now = new Date(),
}: CalculatePanelScheduleInput): PanelScheduleSnapshot {
  const isPaused =
    eventStatus === "paused" ||
    session.session_status === "paused" ||
    panel.panel_status === "paused";

  const panelCandidates = candidates
    .filter((c) => c.session_id === session.id && c.panel_id === panel.id)
    .sort((a, b) => a.queue_position - b.queue_position);

  const baselineMap = computeBaselineSlots(panelCandidates, session.session_start_at);
  const sessionStart = new Date(session.session_start_at);

  const activeCandidateRaw =
    panelCandidates.find((c) => c.interview_status === "in_progress") ?? null;

  let activeScheduled: CalculatedCandidateSchedule | null = null;
  let hasOverdueInterview = false;
  let cursorTime: Date;

  if (activeCandidateRaw) {
    const baseline = baselineMap.get(activeCandidateRaw.id) ?? {
      originalStartAt: session.session_start_at,
      originalEndAt: addMinutes(sessionStart, activeCandidateRaw.estimated_duration_minutes).toISOString(),
    };

    const actualStart = activeRecord?.started_at
      ? new Date(activeRecord.started_at)
      : activeCandidateRaw.expected_start_at
      ? new Date(activeCandidateRaw.expected_start_at)
      : now;

    const projectedEnd = activeRecord?.expected_end_at
      ? new Date(activeRecord.expected_end_at)
      : activeCandidateRaw.expected_end_at
      ? new Date(activeCandidateRaw.expected_end_at)
      : addMinutes(actualStart, activeCandidateRaw.estimated_duration_minutes);

    const overdueMins = diffMinutes(now, projectedEnd);
    const isOverdue = !isPaused && overdueMins > 0;
    if (isOverdue) {
      hasOverdueInterview = true;
    }

    // If overdue, downstream queue cannot start before `now`
    cursorTime = projectedEnd.getTime() < now.getTime() ? new Date(now) : new Date(projectedEnd);

    const delayMinutes = diffMinutes(actualStart, new Date(baseline.originalStartAt));

    activeScheduled = {
      candidate: activeCandidateRaw,
      originalStartAt: activeCandidateRaw.original_slot_start_at ?? baseline.originalStartAt,
      originalEndAt: activeCandidateRaw.original_slot_end_at ?? baseline.originalEndAt,
      expectedStartAt: actualStart.toISOString(),
      expectedEndAt: projectedEnd.toISOString(),
      liveQueuePosition: 0,
      candidatesAhead: 0,
      estimatedWaitMinutes: 0,
      delayMinutes,
      isOverdue,
      overdueMinutes: Math.max(0, overdueMins),
      isProvisional: isPaused || isOverdue,
      scheduleState: "in_progress",
    };
  } else {
    // No active interview: next candidate starts at max(sessionStart, now)
    cursorTime = sessionStart.getTime() > now.getTime() ? new Date(sessionStart) : new Date(now);
  }

  const results: CalculatedCandidateSchedule[] = [];
  let waitingIndex = 0;

  for (const c of panelCandidates) {
    const baseline = baselineMap.get(c.id) ?? {
      originalStartAt: session.session_start_at,
      originalEndAt: addMinutes(sessionStart, c.estimated_duration_minutes).toISOString(),
    };
    const origStartStr = c.original_slot_start_at ?? baseline.originalStartAt;
    const origEndStr = c.original_slot_end_at ?? baseline.originalEndAt;

    if (c.interview_status === "in_progress" && activeScheduled) {
      results.push(activeScheduled);
      continue;
    }

    if (c.interview_status === "completed") {
      results.push({
        candidate: c,
        originalStartAt: origStartStr,
        originalEndAt: origEndStr,
        expectedStartAt: c.expected_start_at,
        expectedEndAt: c.expected_end_at,
        liveQueuePosition: null,
        candidatesAhead: 0,
        estimatedWaitMinutes: 0,
        delayMinutes: c.expected_start_at
          ? diffMinutes(new Date(c.expected_start_at), new Date(origStartStr))
          : 0,
        isOverdue: false,
        overdueMinutes: 0,
        isProvisional: false,
        scheduleState: "completed",
      });
      continue;
    }

    if (isCandidateInactive(c)) {
      results.push({
        candidate: c,
        originalStartAt: origStartStr,
        originalEndAt: origEndStr,
        expectedStartAt: null,
        expectedEndAt: null,
        liveQueuePosition: null,
        candidatesAhead: 0,
        estimatedWaitMinutes: 0,
        delayMinutes: 0,
        isOverdue: false,
        overdueMinutes: 0,
        isProvisional: false,
        scheduleState: "inactive",
      });
      continue;
    }

    if (isCandidateWaiting(c)) {
      waitingIndex += 1;
      const expectedStart = new Date(cursorTime);
      const expectedEnd = addMinutes(expectedStart, c.estimated_duration_minutes);
      cursorTime = expectedEnd;

      const candidatesAhead = waitingIndex - 1 + (activeScheduled ? 1 : 0);
      const waitMins = Math.max(0, diffMinutes(expectedStart, now));
      const delayMinutes = diffMinutes(expectedStart, new Date(origStartStr));
      const isProvisional = isPaused || hasOverdueInterview;

      let scheduleState: CalculatedCandidateSchedule["scheduleState"] = "upcoming";
      if (c.called_at && (!c.expected_start_at || new Date(c.called_at).getTime() > now.getTime() - 15 * 60_000)) {
        scheduleState = "called";
      } else if (candidatesAhead <= 1 || waitMins <= 20) {
        scheduleState = "approaching";
      } else if (delayMinutes >= 10) {
        scheduleState = "delayed";
      }

      results.push({
        candidate: c,
        originalStartAt: origStartStr,
        originalEndAt: origEndStr,
        expectedStartAt: expectedStart.toISOString(),
        expectedEndAt: expectedEnd.toISOString(),
        liveQueuePosition: waitingIndex,
        candidatesAhead,
        estimatedWaitMinutes: waitMins,
        delayMinutes,
        isOverdue: false,
        overdueMinutes: 0,
        isProvisional,
        scheduleState,
      });
    }
  }

  return {
    panelId: panel.id,
    sessionId: session.id,
    activeCandidate: activeScheduled,
    queue: results,
    isPaused,
    hasOverdueInterview,
    computedAt: now.toISOString(),
  };
}

/**
 * Sorts unlocked waiting candidates according to the selected strategy
 * while locking completed and in-progress candidates in place.
 */
export function sortPanelCandidates(
  candidates: Candidate[],
  strategy: QueueSortStrategy
): Candidate[] {
  const locked = candidates
    .filter((c) => c.interview_status === "completed" || c.interview_status === "in_progress")
    .sort((a, b) => a.queue_position - b.queue_position);

  const unlocked = candidates.filter(
    (c) => c.interview_status !== "completed" && c.interview_status !== "in_progress"
  );

  const sortedUnlocked = [...unlocked].sort((a, b) => {
    switch (strategy) {
      case "original_sequence":
        return a.original_sequence - b.original_sequence;
      case "student_name":
        return a.student_name.localeCompare(b.student_name);
      case "registration_number":
        return a.registration_number.localeCompare(b.registration_number, undefined, {
          numeric: true,
        });
      case "priority":
        if (b.priority_level !== a.priority_level) {
          return b.priority_level - a.priority_level;
        }
        return a.original_sequence - b.original_sequence;
      case "profile": {
        const pA = a.profile ?? "zzz";
        const pB = b.profile ?? "zzz";
        const cmp = pA.localeCompare(pB);
        return cmp !== 0 ? cmp : a.original_sequence - b.original_sequence;
      }
      case "program": {
        const prA = a.program_name ?? "zzz";
        const prB = b.program_name ?? "zzz";
        const cmp = prA.localeCompare(prB);
        return cmp !== 0 ? cmp : a.original_sequence - b.original_sequence;
      }
      case "attendance": {
        const score = (c: Candidate) => {
          if (c.attendance_status === "present") return 1;
          if (c.attendance_status === "late") return 2;
          if (c.attendance_status === "not_checked_in") return 3;
          return 4;
        };
        const diff = score(a) - score(b);
        return diff !== 0 ? diff : a.queue_position - b.queue_position;
      }
      case "manual":
      default:
        return a.queue_position - b.queue_position;
    }
  });

  const combined = [...locked, ...sortedUnlocked];
  return combined.map((c, idx) => ({
    ...c,
    queue_position: idx + 1,
  }));
}
