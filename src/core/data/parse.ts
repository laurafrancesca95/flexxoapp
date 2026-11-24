// Zet een ingelezen Excel-blad (2D-array) om naar getypte rijen volgens een ExportSpec.
// Kolommen worden op kopnaam gezocht (hoofdletters en spaties maken niet uit).
import type { ColumnSpec, ExportSpec } from "./exports";

export type Cell = string | number | boolean | Date | null | undefined;

export interface ParseIssue {
  /** Rijnummer zoals in Excel (kop = rij 1). 0 = het hele bestand. */
  row: number;
  column?: string;
  message: string;
}

export interface ParseResult<T> {
  rows: T[];
  missingColumns: string[];
  unknownColumns: string[];
  issues: ParseIssue[];
}

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export function parseSheet<T>(data: Cell[][], spec: ExportSpec): ParseResult<T> {
  const issues: ParseIssue[] = [];
  const headerRowIndex = data.findIndex((r) => r.some((c) => c !== null && c !== undefined && c !== ""));
  if (headerRowIndex < 0) {
    return { rows: [], missingColumns: spec.columns.filter((c) => c.required).map((c) => c.header), unknownColumns: [], issues: [{ row: 0, message: "Het bestand is leeg." }] };
  }
  const header = data[headerRowIndex].map(norm);

  const index = new Map<string, number>();
  for (const col of spec.columns) {
    const names = [col.header, ...(col.aliases ?? [])].map(norm);
    const i = header.findIndex((h) => names.includes(h));
    if (i >= 0) index.set(col.key, i);
  }
  const missingColumns = spec.columns.filter((c) => c.required && !index.has(c.key)).map((c) => c.header);
  const known = new Set(spec.columns.flatMap((c) => [c.header, ...(c.aliases ?? [])].map(norm)));
  const unknownColumns = data[headerRowIndex]
    .filter((h) => h !== null && h !== undefined && String(h).trim() !== "" && !known.has(norm(h)))
    .map((h) => String(h));

  const rows: T[] = [];
  for (let r = headerRowIndex + 1; r < data.length; r++) {
    const raw = data[r];
    if (!raw || raw.every((c) => c === null || c === undefined || c === "")) continue;
    const obj: Record<string, unknown> = {};
    let ok = true;
    for (const col of spec.columns) {
      const i = index.get(col.key);
      const value = i === undefined ? undefined : convert(raw[i], col);
      if (value === INVALID) {
        issues.push({ row: r + 1, column: col.header, message: `"${String(raw[i!])}" is geen geldige ${typeName(col)}.` });
        if (col.required) ok = false;
        continue;
      }
      if ((value === undefined || value === "") && col.required && index.has(col.key)) {
        issues.push({ row: r + 1, column: col.header, message: "Verplicht veld is leeg." });
        ok = false;
        continue;
      }
      if (value !== undefined) obj[col.key] = value;
    }
    if (ok) rows.push(obj as T);
  }
  return { rows, missingColumns, unknownColumns, issues };
}

const INVALID = Symbol("invalid");

function typeName(c: ColumnSpec) {
  return { text: "tekst", number: "waarde (getal)", date: "datum", boolean: "J/N-waarde" }[c.type];
}

function convert(v: Cell, col: ColumnSpec): unknown {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return undefined;
  switch (col.type) {
    case "text":
      if (v instanceof Date) return formatDate(v);
      return String(v).trim();
    case "number": {
      if (typeof v === "number") return v;
      if (typeof v === "boolean") return INVALID;
      // Nederlandse notatie: 1.250,5
      const s = String(v).trim().replace(/\s/g, "");
      const dutch = s.includes(",") || /^-?\d{1,3}(\.\d{3})+$/.test(s);
      const n = Number(dutch ? s.replace(/\./g, "").replace(",", ".") : s);
      return Number.isFinite(n) ? n : INVALID;
    }
    case "date":
      return toDate(v) ?? INVALID;
    case "boolean": {
      if (typeof v === "boolean") return v;
      const s = norm(v);
      if (["j", "ja", "y", "yes", "true", "1", "x", "waar"].includes(s)) return true;
      if (["n", "nee", "no", "false", "0", "onwaar", "-"].includes(s)) return false;
      return INVALID;
    }
  }
}

export function toDate(v: Cell): Date | undefined {
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  if (typeof v === "number") {
    // Excel-serienummer (dagen sinds 30-12-1899)
    if (v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 86400000));
    return undefined;
  }
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  let m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); // dd-mm-jjjj
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); // jjjj-mm-dd
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return undefined;
}

export function formatDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}-${p(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
}
