import { describe, expect, it } from "vitest";
import {
  calculatePanelSchedule,
  computeBaselineSlots,
  sortPanelCandidates,
} from "../engine";
import {
  parseExcelTimeCell,
  validateAndTransformRows,
} from "../../importer/spreadsheet-parser";
import { Candidate, InterviewPanel, InterviewSession } from "@/types/domain";

const baseSession: InterviewSession = {
  id: "sess-9am",
  event_id: "evt-1",
  session_name: "Morning Cohort (9:00 AM)",
  session_start_at: "2026-11-20T03:30:00.000Z", // 09:00 AM IST
  default_interview_duration: 30,
  session_status: "active",
};

const basePanel: InterviewPanel = {
  id: "panel-1",
  event_id: "evt-1",
  panel_name: "Panel 1",
  room_name: "Block A - 101",
  interviewer_name: "Dr. Sharma",
  panel_status: "active",
};

function makeCandidate(overrides: Partial<Candidate>): Candidate {
  return {
    id: "cand-1",
    event_id: "evt-1",
    session_id: "sess-9am",
    panel_id: "panel-1",
    registration_number: "12201001",
    student_name: "Aayush",
    program_name: "B.Tech CSE",
    profile: "React JS Developer",
    original_sequence: 1,
    queue_position: 1,
    priority_level: 0,
    estimated_duration_minutes: 30,
    attendance_status: "not_checked_in",
    check_in_at: null,
    interview_status: "waiting",
    original_slot_start_at: null,
    original_slot_end_at: null,
    expected_start_at: null,
    expected_end_at: null,
    ...overrides,
  };
}

describe("Live Scheduling Engine", () => {
  it("Scenario 1: Early interview completion moves downstream ETAs forward by 15 minutes", () => {
    const c1 = makeCandidate({
      id: "c1",
      student_name: "Aayush",
      queue_position: 1,
      interview_status: "completed",
      attendance_status: "present",
      original_slot_start_at: "2026-11-20T03:30:00.000Z",
      original_slot_end_at: "2026-11-20T04:00:00.000Z",
      expected_start_at: "2026-11-20T03:30:00.000Z",
      expected_end_at: "2026-11-20T03:45:00.000Z", // Finished at 9:15 AM IST
    });
    const c2 = makeCandidate({
      id: "c2",
      registration_number: "12201002",
      student_name: "Rahul",
      queue_position: 2,
      original_slot_start_at: "2026-11-20T04:00:00.000Z",
      original_slot_end_at: "2026-11-20T04:30:00.000Z",
    });
    const c3 = makeCandidate({
      id: "c3",
      registration_number: "12201003",
      student_name: "Priya",
      queue_position: 3,
      original_slot_start_at: "2026-11-20T04:30:00.000Z",
      original_slot_end_at: "2026-11-20T05:00:00.000Z",
    });

    const snapshot = calculatePanelSchedule({
      session: baseSession,
      panel: basePanel,
      eventStatus: "published",
      candidates: [c1, c2, c3],
      activeRecord: null,
      now: new Date("2026-11-20T03:45:00.000Z"), // 9:15 AM IST
    });

    const rahul = snapshot.queue.find((q) => q.candidate.id === "c2")!;
    const priya = snapshot.queue.find((q) => q.candidate.id === "c3")!;

    expect(rahul.expectedStartAt).toBe("2026-11-20T03:45:00.000Z");
    expect(rahul.expectedEndAt).toBe("2026-11-20T04:15:00.000Z");
    expect(rahul.delayMinutes).toBe(-15);
    expect(priya.expectedStartAt).toBe("2026-11-20T04:15:00.000Z");
  });

  it("Scenario 2: Overdue active interview marks downstream queue as provisional without fabricating finish time", () => {
    const c1 = makeCandidate({
      id: "c1",
      queue_position: 1,
      interview_status: "in_progress",
      attendance_status: "present",
      original_slot_start_at: "2026-11-20T03:30:00.000Z",
      original_slot_end_at: "2026-11-20T04:00:00.000Z",
      expected_start_at: "2026-11-20T03:30:00.000Z",
      expected_end_at: "2026-11-20T04:00:00.000Z",
    });
    const c2 = makeCandidate({
      id: "c2",
      queue_position: 2,
      original_slot_start_at: "2026-11-20T04:00:00.000Z",
      original_slot_end_at: "2026-11-20T04:30:00.000Z",
    });

    const now = new Date("2026-11-20T04:10:00.000Z"); // 10 mins past 04:00 expected end
    const snapshot = calculatePanelSchedule({
      session: baseSession,
      panel: basePanel,
      eventStatus: "published",
      candidates: [c1, c2],
      activeRecord: {
        id: "rec-1",
        candidate_id: "c1",
        panel_id: "panel-1",
        started_at: "2026-11-20T03:30:00.000Z",
        completed_at: null,
        planned_duration_minutes: 30,
        actual_duration_minutes: null,
        expected_end_at: "2026-11-20T04:00:00.000Z",
      },
      now,
    });

    expect(snapshot.hasOverdueInterview).toBe(true);
    expect(snapshot.activeCandidate?.isOverdue).toBe(true);
    expect(snapshot.activeCandidate?.overdueMinutes).toBe(10);
    const nextCand = snapshot.queue.find((q) => q.candidate.id === "c2")!;
    expect(nextCand.isProvisional).toBe(true);
    expect(new Date(nextCand.expectedStartAt!).getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it("Scenario 3: Absent candidate is excluded from active queue and downstream starts immediately", () => {
    const c1 = makeCandidate({
      id: "c1",
      student_name: "Absent Student",
      queue_position: 1,
      attendance_status: "absent",
      interview_status: "waiting",
      original_slot_start_at: "2026-11-20T03:30:00.000Z",
      original_slot_end_at: "2026-11-20T04:00:00.000Z",
    });
    const c2 = makeCandidate({
      id: "c2",
      student_name: "Present Student",
      queue_position: 2,
      attendance_status: "present",
      interview_status: "waiting",
      original_slot_start_at: "2026-11-20T04:00:00.000Z",
      original_slot_end_at: "2026-11-20T04:30:00.000Z",
    });

    const snapshot = calculatePanelSchedule({
      session: baseSession,
      panel: basePanel,
      eventStatus: "published",
      candidates: [c1, c2],
      activeRecord: null,
      now: new Date("2026-11-20T03:30:00.000Z"),
    });

    const absentEntry = snapshot.queue.find((q) => q.candidate.id === "c1")!;
    const presentEntry = snapshot.queue.find((q) => q.candidate.id === "c2")!;

    expect(absentEntry.scheduleState).toBe("inactive");
    expect(absentEntry.expectedStartAt).toBeNull();
    expect(absentEntry.liveQueuePosition).toBeNull();

    // Present student takes position 1 and starts at 09:00 AM (03:30 UTC) instead of 09:30
    expect(presentEntry.liveQueuePosition).toBe(1);
    expect(presentEntry.expectedStartAt).toBe("2026-11-20T03:30:00.000Z");
  });

  it("Scenario 4: Reinstating an absent candidate puts them back in live queue", () => {
    const c1 = makeCandidate({
      id: "c1",
      student_name: "Late Return Student",
      queue_position: 1,
      attendance_status: "late",
      interview_status: "waiting",
      original_slot_start_at: "2026-11-20T03:30:00.000Z",
      original_slot_end_at: "2026-11-20T04:00:00.000Z",
    });

    const snapshot = calculatePanelSchedule({
      session: baseSession,
      panel: basePanel,
      eventStatus: "published",
      candidates: [c1],
      activeRecord: null,
      now: new Date("2026-11-20T03:30:00.000Z"),
    });

    const entry = snapshot.queue.find((q) => q.candidate.id === "c1")!;
    expect(entry.scheduleState).toBe("approaching");
    expect(entry.liveQueuePosition).toBe(1);
    expect(entry.expectedStartAt).toBe("2026-11-20T03:30:00.000Z");
  });

  it("Scenario 5: Excel parser converts fractional times (0.375 -> 09:00 AM, 0.583333 -> 02:00 PM) and validates duplicates", () => {
    expect(parseExcelTimeCell(0.375).label).toBe("09:00 AM");
    expect(parseExcelTimeCell(0.583333).label).toBe("02:00 PM");

    const summary = validateAndTransformRows(
      [
        {
          "S.No.": 1,
          RegistrationNumber: 12204512,
          StudentName: "Rishabh Ladha",
          Program: "B.Tech CSE",
          Time: 0.375,
          Profile: "React JS Developer",
        },
        {
          "S.No.": 2,
          RegistrationNumber: "12204512",
          StudentName: "Duplicate Entry",
          Program: "B.Tech CSE",
          Time: 0.583333,
          Profile: "--",
        },
      ],
      {
        serialNumber: "S.No.",
        registrationNumber: "RegistrationNumber",
        studentName: "StudentName",
        programName: "Program",
        sessionTime: "Time",
        profile: "Profile",
      }
    );

    expect(summary.totalRows).toBe(2);
    expect(summary.validRows).toBe(1);
    expect(summary.duplicateRegCount).toBe(1);
    expect(summary.rows[0]?.registrationNumber).toBe("12204512");
    expect(summary.rows[1]?.profile).toBeNull();
  });

  it("Scenario 6: Queue sorting locks completed/in_progress candidates while sorting remaining queue", () => {
    const c1 = makeCandidate({ id: "c1", student_name: "Zoya", queue_position: 1, interview_status: "completed" });
    const c2 = makeCandidate({ id: "c2", student_name: "Mohan", queue_position: 2, interview_status: "waiting" });
    const c3 = makeCandidate({ id: "c3", student_name: "Aarav", queue_position: 3, interview_status: "waiting" });

    const sorted = sortPanelCandidates([c1, c2, c3], "student_name");
    expect(sorted.map((c) => c.id)).toEqual(["c1", "c3", "c2"]);
  });

  it("Scenario 7: Attendance sorting prioritizes Present/Late candidates over Not Checked In", () => {
    const c1 = makeCandidate({ id: "c1", queue_position: 1, attendance_status: "not_checked_in" });
    const c2 = makeCandidate({ id: "c2", queue_position: 2, attendance_status: "present" });
    const c3 = makeCandidate({ id: "c3", queue_position: 3, attendance_status: "late" });

    const sorted = sortPanelCandidates([c1, c2, c3], "attendance");
    expect(sorted.map((c) => c.id)).toEqual(["c2", "c3", "c1"]);
  });
});
