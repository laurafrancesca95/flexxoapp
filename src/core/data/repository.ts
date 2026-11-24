// Laadt alle Bemet-exports via de actieve bron en zet ze om naar getypte rijen.
import { readSheet } from "read-excel-file/universal";
import { EXPORT_LIST, type ExportId, type ExportRows, type ExportSpec } from "./exports";
import { parseSheet, type Cell, type ParseIssue } from "./parse";
import type { ExportFile, ExportSource } from "./sources/types";

export type ExportStatus = "ok" | "waarschuwing" | "fout" | "ontbreekt";

export interface ExportState {
  spec: ExportSpec;
  status: ExportStatus;
  rowCount: number;
  exportedAt?: Date;
  origin?: string;
  missingColumns: string[];
  unknownColumns: string[];
  issues: ParseIssue[];
  error?: string;
}

export interface DataSnapshot {
  rows: ExportRows;
  states: Record<ExportId, ExportState>;
  loadedAt: Date;
}

export async function parseExportFile(spec: ExportSpec, file: ExportFile) {
  const sheet = (await readSheet(file.data, spec.sheet || 1)) as Cell[][];
  return parseSheet(sheet, spec);
}

export async function loadAll(source: ExportSource, overrides: Partial<Record<ExportId, ExportFile>> = {}): Promise<DataSnapshot> {
  const rows = {} as ExportRows;
  const states = {} as Record<ExportId, ExportState>;

  await Promise.all(
    EXPORT_LIST.map(async (spec) => {
      const base: ExportState = { spec, status: "ontbreekt", rowCount: 0, missingColumns: [], unknownColumns: [], issues: [] };
      (rows as unknown as Record<string, unknown[]>)[spec.id] = [];
      try {
        const file = overrides[spec.id] ?? (await source.fetchExport(spec));
        if (!file) {
          states[spec.id] = base;
          return;
        }
        const result = await parseExportFile(spec, file);
        (rows as unknown as Record<string, unknown[]>)[spec.id] = result.rows;
        states[spec.id] = {
          ...base,
          status: result.missingColumns.length ? "fout" : result.issues.length ? "waarschuwing" : "ok",
          rowCount: result.rows.length,
          exportedAt: file.exportedAt,
          origin: file.origin,
          missingColumns: result.missingColumns,
          unknownColumns: result.unknownColumns,
          issues: result.issues,
        };
      } catch (e) {
        states[spec.id] = { ...base, status: "fout", error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );

  return { rows, states, loadedAt: new Date() };
}
