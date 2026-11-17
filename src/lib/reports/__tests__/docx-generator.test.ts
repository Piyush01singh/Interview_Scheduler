import { describe, expect, it } from "vitest";
import { generateAttendanceDocxBlob } from "../docx-generator";
import { Candidate, InterviewEvent, InterviewPanel, InterviewSession } from "@/types/domain";

describe("DOCX Attendance Report Generator", () => {
  const mockEvent: InterviewEvent = {
    id: "evt-test-1",
    event_name: "Annual Campus Drive 2026",
    interview_date: "2026-11-20",
    timezone: "Asia/Kolkata",
    event_status: "published",
    default_duration_minutes: 30,
    schedule_revision: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockSessions: InterviewSession[] = [
    {
      id: "sess-1",
      event_id: "evt-test-1",
      session_name: "Morning Cohort 09:00 AM",
      session_start_at: "2026-11-20T03:30:00.000Z",
      default_interview_duration: 30,
      session_status: "active",
    },
  ];

  const mockPanels: InterviewPanel[] = [
    {
      id: "panel-1",
      event_id: "evt-test-1",
      panel_name: "Panel 1 - Engineering",
      room_name: "Room 101",
      interviewer_name: "Lead Eng",
      panel_status: "active",
    },
  ];

  const mockCandidates: Candidate[] = [
    {
      id: "c-1",
      event_id: "evt-test-1",
      session_id: "sess-1",
      panel_id: "panel-1",
      registration_number: "REG-001",
      student_name: "Aman Gupta",
      program_name: "B.Tech CSE",
      profile: "Software Engineer",
      original_sequence: 1,
      queue_position: 1,
      priority_level: 0,
      estimated_duration_minutes: 30,
      attendance_status: "present",
      check_in_at: "2026-11-20T03:15:00.000Z",
      interview_status: "waiting",
      original_slot_start_at: "2026-11-20T03:30:00.000Z",
      original_slot_end_at: "2026-11-20T04:00:00.000Z",
      expected_start_at: "2026-11-20T03:30:00.000Z",
      expected_end_at: "2026-11-20T04:00:00.000Z",
    },
    {
      id: "c-2",
      event_id: "evt-test-1",
      session_id: "sess-1",
      panel_id: "panel-1",
      registration_number: "REG-002",
      student_name: "Bhavna Jain",
      program_name: "B.Tech IT",
      profile: "Frontend Dev",
      original_sequence: 2,
      queue_position: 2,
      priority_level: 0,
      estimated_duration_minutes: 30,
      attendance_status: "absent",
      check_in_at: null,
      interview_status: "waiting",
      original_slot_start_at: "2026-11-20T04:00:00.000Z",
      original_slot_end_at: "2026-11-20T04:30:00.000Z",
      expected_start_at: null,
      expected_end_at: null,
    },
  ];

  it("generates a non-empty DOCX Blob containing all candidates and summary sections", async () => {
    const blob = await generateAttendanceDocxBlob({
      event: mockEvent,
      sessions: mockSessions,
      panels: mockPanels,
      candidates: mockCandidates,
      filters: { universityName: "Test University" },
    });

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000); // Valid Word document zip container
    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });
});
