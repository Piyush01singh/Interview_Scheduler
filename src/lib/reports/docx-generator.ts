import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  HeightRule,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { Candidate, InterviewEvent, InterviewPanel, InterviewSession } from "@/types/domain";
import { formatTimeInTimezone } from "@/lib/utils/format";

export interface DocxReportFilterOptions {
  universityName?: string;
  sessionId?: string;
  panelId?: string;
  programName?: string;
  profile?: string;
  attendanceStatus?: string;
}

export async function generateAttendanceDocxBlob({
  event,
  sessions,
  panels,
  candidates,
  filters = {},
}: {
  event: InterviewEvent;
  sessions: InterviewSession[];
  panels: InterviewPanel[];
  candidates: Candidate[];
  filters?: DocxReportFilterOptions;
}): Promise<Blob> {
  const universityName = filters.universityName ?? "Delhi Technological University (DTU)";

  // Filter candidates based on provided criteria
  const filteredCandidates = candidates.filter((c) => {
    if (filters.sessionId && filters.sessionId !== "all" && c.session_id !== filters.sessionId) return false;
    if (filters.panelId && filters.panelId !== "all" && c.panel_id !== filters.panelId) return false;
    if (filters.programName && filters.programName !== "all" && c.program_name !== filters.programName) return false;
    if (filters.profile && filters.profile !== "all" && c.profile !== filters.profile) return false;
    if (filters.attendanceStatus && filters.attendanceStatus !== "all" && c.attendance_status !== filters.attendanceStatus) return false;
    return true;
  });

  const totalRegistered = filteredCandidates.length;
  const presentCount = filteredCandidates.filter((c) => c.attendance_status === "present").length;
  const lateCount = filteredCandidates.filter((c) => c.attendance_status === "late").length;
  const absentCount = filteredCandidates.filter((c) => c.attendance_status === "absent").length;
  const excusedCount = filteredCandidates.filter((c) => c.attendance_status === "excused").length;
  const notCheckedInCount = filteredCandidates.filter((c) => c.attendance_status === "not_checked_in").length;

  const nowFormatted = new Date().toLocaleString("en-IN", {
    timeZone: event.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  const sessionName =
    filters.sessionId && filters.sessionId !== "all"
      ? sessions.find((s) => s.id === filters.sessionId)?.session_name ?? "Selected Session"
      : "All Event Sessions";

  const panelName =
    filters.panelId && filters.panelId !== "all"
      ? panels.find((p) => p.id === filters.panelId)?.panel_name ?? "Selected Panel"
      : "All Interview Panels";

  // Table header builder
  const createTableHeader = () => {
    return new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          shading: { fill: "1E293B", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "S.No", alignment: AlignmentType.CENTER, style: "HeaderStyle" })],
        }),
        new TableCell({
          width: { size: 16, type: WidthType.PERCENTAGE },
          shading: { fill: "1E293B", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "Reg. Number", alignment: AlignmentType.LEFT, style: "HeaderStyle" })],
        }),
        new TableCell({
          width: { size: 22, type: WidthType.PERCENTAGE },
          shading: { fill: "1E293B", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "Student Name", alignment: AlignmentType.LEFT, style: "HeaderStyle" })],
        }),
        new TableCell({
          width: { size: 16, type: WidthType.PERCENTAGE },
          shading: { fill: "1E293B", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "Program", alignment: AlignmentType.LEFT, style: "HeaderStyle" })],
        }),
        new TableCell({
          width: { size: 16, type: WidthType.PERCENTAGE },
          shading: { fill: "1E293B", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "Profile", alignment: AlignmentType.LEFT, style: "HeaderStyle" })],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: "1E293B", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "Attendance", alignment: AlignmentType.CENTER, style: "HeaderStyle" })],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          shading: { fill: "1E293B", type: ShadingType.CLEAR },
          children: [new Paragraph({ text: "Check-in Time", alignment: AlignmentType.CENTER, style: "HeaderStyle" })],
        }),
      ],
    });
  };

  const createCandidateRows = (list: Candidate[]) => {
    return list.map((c, idx) => {
      const isEven = idx % 2 === 0;
      const rowFill = isEven ? "FFFFFF" : "F8FAFC";
      const checkInStr = c.check_in_at
        ? formatTimeInTimezone(c.check_in_at, event.timezone)
        : "—";

      const attStatusLabel =
        c.attendance_status === "present"
          ? "Present"
          : c.attendance_status === "late"
          ? "Late"
          : c.attendance_status === "absent"
          ? "Absent"
          : c.attendance_status === "excused"
          ? "Excused"
          : "Not Checked In";

      return new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 6, type: WidthType.PERCENTAGE },
            shading: { fill: rowFill, type: ShadingType.CLEAR },
            children: [new Paragraph({ text: String(c.original_sequence || idx + 1), alignment: AlignmentType.CENTER })],
          }),
          new TableCell({
            width: { size: 16, type: WidthType.PERCENTAGE },
            shading: { fill: rowFill, type: ShadingType.CLEAR },
            children: [new Paragraph({ text: c.registration_number, alignment: AlignmentType.LEFT })],
          }),
          new TableCell({
            width: { size: 22, type: WidthType.PERCENTAGE },
            shading: { fill: rowFill, type: ShadingType.CLEAR },
            children: [new Paragraph({ text: c.student_name, alignment: AlignmentType.LEFT })],
          }),
          new TableCell({
            width: { size: 16, type: WidthType.PERCENTAGE },
            shading: { fill: rowFill, type: ShadingType.CLEAR },
            children: [new Paragraph({ text: c.program_name ?? "—", alignment: AlignmentType.LEFT })],
          }),
          new TableCell({
            width: { size: 16, type: WidthType.PERCENTAGE },
            shading: { fill: rowFill, type: ShadingType.CLEAR },
            children: [new Paragraph({ text: c.profile ?? "—", alignment: AlignmentType.LEFT })],
          }),
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { fill: rowFill, type: ShadingType.CLEAR },
            children: [new Paragraph({ text: attStatusLabel, alignment: AlignmentType.CENTER })],
          }),
          new TableCell({
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { fill: rowFill, type: ShadingType.CLEAR },
            children: [new Paragraph({ text: checkInStr, alignment: AlignmentType.CENTER })],
          }),
        ],
      });
    });
  };

  // Grouped candidates for subsections
  const presentList = filteredCandidates.filter((c) => c.attendance_status === "present");
  const absentList = filteredCandidates.filter((c) => c.attendance_status === "absent");
  const lateList = filteredCandidates.filter((c) => c.attendance_status === "late");
  const excusedList = filteredCandidates.filter((c) => c.attendance_status === "excused");

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "HeaderStyle",
          name: "Header Style",
          run: {
            color: "FFFFFF",
            bold: true,
            size: 20, // 10pt
            font: "Calibri",
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 in
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                text: `${universityName} — Placement Drive Attendance Report`,
                alignment: AlignmentType.RIGHT,
                style: "HeaderStyle",
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun("Generated on "),
                  new TextRun({ text: nowFormatted, bold: true }),
                  new TextRun(" | Page "),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                  new TextRun(" of "),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Title and University Header
          new Paragraph({
            text: universityName.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),
          new Paragraph({
            text: `INTERVIEW ATTENDANCE & ROSTER REPORT: ${event.event_name}`,
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),

          // Metadata block
          new Paragraph({
            children: [
              new TextRun({ text: "Event Date: ", bold: true }),
              new TextRun(`${event.interview_date} (${event.timezone})`),
              new TextRun({ text: "    |    Session: ", bold: true }),
              new TextRun(sessionName),
              new TextRun({ text: "    |    Panel: ", bold: true }),
              new TextRun(panelName),
            ],
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Generated Timestamp: ", bold: true }),
              new TextRun(nowFormatted),
              new TextRun({ text: "    |    Active Filter: ", bold: true }),
              new TextRun(
                filters.attendanceStatus && filters.attendanceStatus !== "all"
                  ? `Status = ${filters.attendanceStatus}`
                  : "Complete Event Roster"
              ),
            ],
            spacing: { after: 240 },
          }),

          // Summary KPI Strip Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({ text: "Registered", alignment: AlignmentType.CENTER }),
                      new Paragraph({
                        text: String(totalRegistered),
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: String(totalRegistered), bold: true, size: 28 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: "EFF6FF", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({ text: "Present", alignment: AlignmentType.CENTER }),
                      new Paragraph({
                        text: String(presentCount),
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: String(presentCount), bold: true, size: 28, color: "1D4ED8" })],
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: "FEF3C7", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({ text: "Late", alignment: AlignmentType.CENTER }),
                      new Paragraph({
                        text: String(lateCount),
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: String(lateCount), bold: true, size: 28, color: "B45309" })],
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: "FEE2E2", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({ text: "Absent", alignment: AlignmentType.CENTER }),
                      new Paragraph({
                        text: String(absentCount),
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: String(absentCount), bold: true, size: 28, color: "B91C1C" })],
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: "F3E8FF", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({ text: "Excused", alignment: AlignmentType.CENTER }),
                      new Paragraph({
                        text: String(excusedCount),
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: String(excusedCount), bold: true, size: 28, color: "7E22CE" })],
                      }),
                    ],
                  }),
                  new TableCell({
                    shading: { fill: "F8FAFC", type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({ text: "Not Checked In", alignment: AlignmentType.CENTER }),
                      new Paragraph({
                        text: String(notCheckedInCount),
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: String(notCheckedInCount), bold: true, size: 28, color: "64748B" })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Full Attendance Table Section
          new Paragraph({
            text: `Full Event Candidate Roster (${filteredCandidates.length} students)`,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 360, after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [createTableHeader(), ...createCandidateRows(filteredCandidates)],
          }),

          // Section 1: Present Students Breakdown
          new Paragraph({
            text: `1. Present Students (${presentList.length})`,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [createTableHeader(), ...createCandidateRows(presentList)],
          }),

          // Section 2: Absent Students Breakdown
          new Paragraph({
            text: `2. Absent Students (${absentList.length})`,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [createTableHeader(), ...createCandidateRows(absentList)],
          }),

          // Section 3: Late Students Breakdown
          new Paragraph({
            text: `3. Late Arrival Students (${lateList.length})`,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [createTableHeader(), ...createCandidateRows(lateList)],
          }),

          // Section 4: Excused Students Breakdown
          new Paragraph({
            text: `4. Excused Students (${excusedList.length})`,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [createTableHeader(), ...createCandidateRows(excusedList)],
          }),

          // Section 5: Summary Statistics & Official Sign-off
          new Paragraph({
            text: "5. Placement Cell Certification & Sign-off",
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 400, after: 180 },
          }),
          new Paragraph({
            text: "This document certifies that the above attendance roster accurately reflects candidate attendance and check-in times during the placement drive event.",
            spacing: { after: 360 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Authorized Placement Coordinator: ____________________     ", bold: true }),
              new TextRun({ text: "Dean / Head of Corporate Relations: ____________________", bold: true }),
            ],
            spacing: { before: 240, after: 120 },
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
