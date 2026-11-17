"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  Wand2,
} from "lucide-react";
import {
  autoDetectColumnMapping,
  ColumnMapping,
  extractSheetRows,
  ImportValidationSummary,
  parseWorkbookBuffer,
  validateAndTransformRows,
} from "@/lib/importer/spreadsheet-parser";
import { useLivePlatform } from "@/lib/demo/store";
import { computeBaselineSlots } from "@/lib/scheduling/engine";
import { Candidate, InterviewSession } from "@/types/domain";

export default function ImportWizardPage() {
  const router = useRouter();
  const { event, panels, importCandidatesBatch } = useLivePlatform();

  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    serialNumber: "",
    registrationNumber: "",
    studentName: "",
    programName: "",
    sessionTime: "",
    profile: "",
  });
  const [validation, setValidation] = useState<ImportValidationSummary | null>(null);
  const [eventDate, setEventDate] = useState<string>(event.interview_date);
  const [defaultDuration, setDefaultDuration] = useState<number>(30);

  const handleFileUpload = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const parsed = parseWorkbookBuffer(buffer);
    setWorkbook(parsed.workbook);
    setFileName(file.name);
    setSheetNames(parsed.sheetNames);

    const firstSheet = parsed.sheetNames[0] ?? "";
    setSelectedSheet(firstSheet);
    loadSheet(parsed.workbook, firstSheet, 0);
  };

  const loadSheet = (wb: XLSX.WorkBook, sheet: string, headerIdx: number) => {
    const extracted = extractSheetRows(wb, sheet, headerIdx);
    setHeaders(extracted.headers);
    setRawRows(extracted.rawRows);
    const detected = autoDetectColumnMapping(extracted.headers);
    setMapping(detected);
    setValidation(validateAndTransformRows(extracted.rawRows, detected));
  };

  const handleMappingChange = (field: keyof ColumnMapping, col: string) => {
    const updated = { ...mapping, [field]: col };
    setMapping(updated);
    setValidation(validateAndTransformRows(rawRows, updated));
  };

  const loadSampleConzuraDataset = () => {
    // Generates an anonymized Conzura-style spreadsheet in-memory with fractional Excel times
    const sampleRows = [
      { "S.No.": 1, RegistrationNumber: 12209001, StudentName: "Ananya Sharma", Program: "B.Tech CSE", Time: 0.375, Profile: "React JS Developer" },
      { "S.No.": 2, RegistrationNumber: 12209002, StudentName: "Harshvardhan Rao", Program: "B.Tech CSE", Time: 0.375, Profile: "Python Developer" },
      { "S.No.": 3, RegistrationNumber: 12209003, StudentName: "Nandini Gupta", Program: "B.Tech IT", Time: 0.375, Profile: "Java Developer" },
      { "S.No.": 4, RegistrationNumber: 12209004, StudentName: "Siddharth Menon", Program: "MCA", Time: 0.375, Profile: "--" },
      { "S.No.": 5, RegistrationNumber: 12209005, StudentName: "Ritika Bansal", Program: "B.Tech CSE", Time: 0.583333, Profile: "Project Manager" },
      { "S.No.": 6, RegistrationNumber: 12209006, StudentName: "Karanveer Gill", Program: "B.Tech CSE", Time: 0.583333, Profile: "React JS Developer" },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");

    setWorkbook(wb);
    setFileName("Anonymized_Conzura_Sample.xls");
    setSheetNames(["Candidates"]);
    setSelectedSheet("Candidates");
    loadSheet(wb, "Candidates", 0);
  };

  const handleConfirmImport = () => {
    if (!validation) return;
    const validRecords = validation.rows.filter((r) => r.isValid);
    if (validRecords.length === 0) return;

    // Group valid records into distinct sessions by normalized sessionTimeLabel
    const sessionGroups = new Map<string, typeof validRecords>();
    for (const row of validRecords) {
      const list = sessionGroups.get(row.sessionTimeLabel) ?? [];
      list.push(row);
      sessionGroups.set(row.sessionTimeLabel, list);
    }

    const createdSessions: InterviewSession[] = [];
    const createdCandidates: Candidate[] = [];

    let sessionIdx = 1;
    for (const [timeLabel, groupRows] of Array.from(sessionGroups.entries())) {
      const mins = groupRows[0]?.sessionMinutesFromMidnight ?? 540;
      const hours = Math.floor(mins / 60);
      const minutes = mins % 60;
      const sessionStartIso = new Date(
        `${eventDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`
      ).toISOString();

      const sessionId = `sess-imp-${sessionIdx}-${Date.now()}`;
      createdSessions.push({
        id: sessionId,
        event_id: event.id,
        session_name: `Session ${sessionIdx} — ${timeLabel} Cohort`,
        session_start_at: sessionStartIso,
        default_interview_duration: defaultDuration,
        session_status: sessionIdx === 1 ? "active" : "scheduled",
      });

      // Distribute across available panels in round-robin order while preserving original sequence
      const sortedRows = [...groupRows].sort(
        (a, b) => a.originalSequence - b.originalSequence
      );
      const perPanelCounters = new Map<string, number>();

      const rawSessionCandidates: Candidate[] = sortedRows.map((row, idx) => {
        const panel = panels[idx % panels.length]!;
        const pos = (perPanelCounters.get(panel.id) ?? 0) + 1;
        perPanelCounters.set(panel.id, pos);
        const generatedPin = String(100000 + Math.floor(Math.random() * 900000));

        return {
          id: `cand-imp-${sessionIdx}-${idx}-${Date.now()}`,
          event_id: event.id,
          session_id: sessionId,
          panel_id: panel.id,
          registration_number: row.registrationNumber,
          student_name: row.studentName,
          program_name: row.programName,
          profile: row.profile,
          original_sequence: row.originalSequence,
          queue_position: pos,
          priority_level: 0,
          estimated_duration_minutes: defaultDuration,
          attendance_status: "not_checked_in",
          check_in_at: null,
          readiness_status: "not_ready",
          interview_status: "waiting",
          original_slot_start_at: null,
          original_slot_end_at: null,
          expected_start_at: null,
          expected_end_at: null,
          access_pin_preview: generatedPin,
        };
      });

      // Compute baseline original slots per panel
      for (const panel of panels) {
        const pGroup = rawSessionCandidates.filter((c) => c.panel_id === panel.id);
        const baselines = computeBaselineSlots(pGroup, sessionStartIso);
        for (const c of pGroup) {
          const b = baselines.get(c.id);
          if (b) {
            c.original_slot_start_at = b.originalStartAt;
            c.original_slot_end_at = b.originalEndAt;
            c.expected_start_at = b.originalStartAt;
            c.expected_end_at = b.originalEndAt;
          }
        }
      }

      createdCandidates.push(...rawSessionCandidates);
      sessionIdx++;
    }

    importCandidatesBatch(createdSessions, createdCandidates, true);
    router.push("/admin");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Candidate Spreadsheet Import Wizard
          </h2>
          <p className="text-sm text-slate-600">
            Supports legacy <code className="font-mono text-xs">.xls</code>,{" "}
            <code className="font-mono text-xs">.xlsx</code>, and{" "}
            <code className="font-mono text-xs">.csv</code> files with automatic Excel fractional
            time decoding and duplicate validation.
          </p>
        </div>

        <button
          onClick={loadSampleConzuraDataset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          <Wand2 className="h-3.5 w-3.5" />
          Load Sample Conzura-Format File
        </button>
      </div>

      {/* Step 1: Upload & Event Settings */}
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Step 1 · Select Spreadsheet (.xls, .xlsx, .csv)
          </label>
          <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-6 py-8 text-center hover:border-slate-400 hover:bg-slate-50">
            <Upload className="h-6 w-6 text-slate-400" />
            <span className="mt-2 text-sm font-medium text-slate-900">
              {fileName || "Click to upload candidate file"}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              Preserves leading zeros in registration numbers & parses Excel time fractions
            </span>
            <input
              type="file"
              accept=".xls,.xlsx,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
            />
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Interview Date
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Default Duration (Minutes)
            </label>
            <input
              type="number"
              min={5}
              max={180}
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(Number(e.target.value))}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Step 2 & 3: Worksheet & Column Mapping */}
      {workbook && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Step 2 · Worksheet & Column Mapping
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedSheet}
                onChange={(e) => {
                  setSelectedSheet(e.target.value);
                  loadSheet(workbook, e.target.value, headerRowIndex);
                }}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium"
              >
                {sheetNames.map((name) => (
                  <option key={name} value={name}>
                    Sheet: {name}
                  </option>
                ))}
              </select>

              <select
                value={headerRowIndex}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  setHeaderRowIndex(idx);
                  loadSheet(workbook, selectedSheet, idx);
                }}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium"
              >
                {[0, 1, 2, 3].map((idx) => (
                  <option key={idx} value={idx}>
                    Header Row #{idx + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["serialNumber", "Serial Number (S.No.)"],
                ["registrationNumber", "Registration Number *"],
                ["studentName", "Student Name *"],
                ["programName", "Academic Program"],
                ["sessionTime", "Session Start Time *"],
                ["profile", "Job Profile / Role"],
              ] as [keyof ColumnMapping, string][]
            ).map(([field, label]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-slate-700">{label}</label>
                <select
                  value={mapping[field]}
                  onChange={(e) => handleMappingChange(field, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                >
                  <option value="">— Not Mapped —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Validation & Preview */}
      {validation && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Step 3 · Validation & Extracted Preview
            </h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                Total: {validation.totalRows}
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                Valid: {validation.validRows}
              </span>
              {validation.duplicateRegCount > 0 && (
                <span className="rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700">
                  Duplicates: {validation.duplicateRegCount}
                </span>
              )}
              {validation.missingRegCount + validation.missingNameCount > 0 && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                  Missing Fields: {validation.missingRegCount + validation.missingNameCount}
                </span>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2">S.No</th>
                  <th className="px-3 py-2">Reg No.</th>
                  <th className="px-3 py-2">Student Name</th>
                  <th className="px-3 py-2">Program</th>
                  <th className="px-3 py-2">Cohort Time</th>
                  <th className="px-3 py-2">Profile</th>
                  <th className="px-3 py-2">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validation.rows.slice(0, 50).map((row) => (
                  <tr
                    key={row.rowIndex}
                    className={row.isValid ? "bg-white" : "bg-rose-50/50"}
                  >
                    <td className="px-3 py-2 font-mono">{row.originalSequence}</td>
                    <td className="px-3 py-2 font-mono font-medium">
                      {row.registrationNumber || "—"}
                    </td>
                    <td className="px-3 py-2 font-medium">{row.studentName || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{row.programName ?? "—"}</td>
                    <td className="px-3 py-2 font-mono">{row.sessionTimeLabel}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {row.profile ?? <span className="italic text-slate-400">Unspecified</span>}
                    </td>
                    <td className="px-3 py-2">
                      {row.isValid ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {row.errors.join("; ")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={handleConfirmImport}
              disabled={validation.validRows === 0}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
            >
              Generate Queues & Import {validation.validRows} Valid Candidates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
