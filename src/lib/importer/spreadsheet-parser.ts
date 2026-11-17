import * as XLSX from "xlsx";

export interface ColumnMapping {
  serialNumber: string;
  registrationNumber: string;
  studentName: string;
  programName: string;
  sessionTime: string;
  profile: string;
}

export interface ParsedCandidateRow {
  rowIndex: number;
  originalSequence: number;
  registrationNumber: string;
  studentName: string;
  programName: string | null;
  sessionTimeLabel: string; // e.g., "09:00 AM" or "02:00 PM"
  sessionMinutesFromMidnight: number | null;
  profile: string | null;
  warnings: string[];
  errors: string[];
  isValid: boolean;
}

export interface ImportValidationSummary {
  totalRows: number;
  validRows: number;
  duplicateRegCount: number;
  missingRegCount: number;
  missingNameCount: number;
  invalidTimeCount: number;
  rows: ParsedCandidateRow[];
}

/**
 * Converts Excel fractional time (e.g., 0.375 -> 09:00 AM, 0.583333 -> 02:00 PM)
 * or string representations ("9:00 AM", "14:00", "2:00 PM") into normalized 12h time & minutes.
 */
export function parseExcelTimeCell(raw: unknown): {
  label: string;
  minutesFromMidnight: number | null;
} {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return { label: "Unassigned", minutesFromMidnight: null };
  }

  if (typeof raw === "number" && !Number.isNaN(raw)) {
    // Excel stores time as fraction of 24 hours (modulo 1 if date+time serial)
    const fraction = raw % 1;
    const totalMinutes = Math.round(fraction * 24 * 60);
    const hours24 = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return formatMinutesTo12Hour(hours24 * 60 + minutes);
  }

  const str = String(raw).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?$/);
  if (match && match[1] && match[2]) {
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const meridiem = match[3]?.toUpperCase();

    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

    if (hours >= 0 && hours < 24 && mins >= 0 && mins < 60) {
      return formatMinutesTo12Hour(hours * 60 + mins);
    }
  }

  return { label: str, minutesFromMidnight: null };
}

function formatMinutesTo12Hour(totalMinutes: number): {
  label: string;
  minutesFromMidnight: number;
} {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const label = `${String(hours12).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${meridiem}`;
  return { label, minutesFromMidnight: totalMinutes };
}

/**
 * Safely preserves registration numbers as exact strings (never scientific notation floats).
 */
export function normalizeRegistrationNumber(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "number") {
    return Math.trunc(raw).toString();
  }
  return String(raw).trim();
}

/**
 * Normalizes missing/placeholder values like "--", "-", "N/A", "null".
 */
export function normalizeNullableField(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const val = String(raw).trim();
  if (!val || val === "--" || val === "-" || val.toLowerCase() === "n/a") {
    return null;
  }
  return val;
}

export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const findMatch = (patterns: RegExp[]): string => {
    for (const pattern of patterns) {
      const found = headers.find((h) => pattern.test(h.trim()));
      if (found) return found;
    }
    return "";
  };

  return {
    serialNumber: findMatch([/^s\.?\s*no\.?$/i, /^sr/i, /^seq/i, /^id$/i]),
    registrationNumber: findMatch([/reg/i, /roll/i, /uid/i, /matric/i]),
    studentName: findMatch([/student\s*name/i, /^name$/i, /candidate/i]),
    programName: findMatch([/program/i, /course/i, /branch/i, /degree/i]),
    sessionTime: findMatch([/time/i, /slot/i, /session/i, /batch/i]),
    profile: findMatch([/profile/i, /role/i, /position/i, /track/i]),
  };
}

export function parseWorkbookBuffer(buffer: ArrayBuffer): {
  sheetNames: string[];
  workbook: XLSX.WorkBook;
} {
  const workbook = XLSX.read(buffer, { type: "array", raw: true });
  return {
    sheetNames: workbook.SheetNames,
    workbook,
  };
}

export function extractSheetRows(
  workbook: XLSX.WorkBook,
  sheetName: string,
  headerRowIndex = 0
): { headers: string[]; rawRows: Record<string, unknown>[] } {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], rawRows: [] };

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });

  const headerRow = matrix[headerRowIndex] ?? [];
  const headers = headerRow.map((cell, idx) => {
    const label = String(cell ?? "").trim();
    return label || `Column_${idx + 1}`;
  });

  const rawRows: Record<string, unknown>[] = [];
  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const rowArr = matrix[i];
    if (!rowArr || rowArr.every((v) => String(v ?? "").trim() === "")) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, colIdx) => {
      obj[h] = rowArr[colIdx] ?? "";
    });
    rawRows.push(obj);
  }

  return { headers, rawRows };
}

export function validateAndTransformRows(
  rawRows: Record<string, unknown>[],
  mapping: ColumnMapping
): ImportValidationSummary {
  const seenRegs = new Set<string>();
  let validRows = 0;
  let duplicateRegCount = 0;
  let missingRegCount = 0;
  let missingNameCount = 0;
  let invalidTimeCount = 0;

  const rows: ParsedCandidateRow[] = rawRows.map((raw, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const seqRaw = mapping.serialNumber ? Number(raw[mapping.serialNumber]) : NaN;
    const originalSequence = !Number.isNaN(seqRaw) && seqRaw > 0 ? Math.trunc(seqRaw) : idx + 1;

    const registrationNumber = mapping.registrationNumber
      ? normalizeRegistrationNumber(raw[mapping.registrationNumber])
      : "";

    const studentName = mapping.studentName
      ? String(raw[mapping.studentName] ?? "").trim()
      : "";

    const programName = mapping.programName
      ? normalizeNullableField(raw[mapping.programName])
      : null;

    const profile = mapping.profile ? normalizeNullableField(raw[mapping.profile]) : null;
    if (!profile) {
      warnings.push("Profile missing or '--' (will import as Unspecified)");
    }

    const parsedTime = mapping.sessionTime
      ? parseExcelTimeCell(raw[mapping.sessionTime])
      : { label: "09:00 AM", minutesFromMidnight: 540 };

    if (!registrationNumber) {
      errors.push("Missing registration number");
      missingRegCount++;
    } else if (seenRegs.has(registrationNumber)) {
      errors.push(`Duplicate registration number (${registrationNumber})`);
      duplicateRegCount++;
    } else {
      seenRegs.add(registrationNumber);
    }

    if (!studentName) {
      errors.push("Missing student name");
      missingNameCount++;
    }

    if (parsedTime.minutesFromMidnight === null) {
      errors.push(`Invalid session time: "${parsedTime.label}"`);
      invalidTimeCount++;
    }

    const isValid = errors.length === 0;
    if (isValid) validRows++;

    return {
      rowIndex: idx + 1,
      originalSequence,
      registrationNumber,
      studentName,
      programName,
      sessionTimeLabel: parsedTime.label,
      sessionMinutesFromMidnight: parsedTime.minutesFromMidnight,
      profile,
      warnings,
      errors,
      isValid,
    };
  });

  return {
    totalRows: rows.length,
    validRows,
    duplicateRegCount,
    missingRegCount,
    missingNameCount,
    invalidTimeCount,
    rows,
  };
}
