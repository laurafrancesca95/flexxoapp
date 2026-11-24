import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { readSheet } from "read-excel-file/universal";
import { EXPORT_LIST, EXPORTS } from "../src/core/data/exports";
import { parseSheet, type Cell } from "../src/core/data/parse";

describe("dummy-exports in public/data", () => {
  for (const spec of EXPORT_LIST) {
    it(`${spec.fileName} past precies op het kolomformaat`, async () => {
      const buf = await readFile(new URL(`../public/data/${spec.fileName}`, import.meta.url));
      const sheet = (await readSheet(buf)) as Cell[][];
      const r = parseSheet<Record<string, unknown>>(sheet, spec);
      expect(r.missingColumns).toEqual([]);
      expect(r.unknownColumns).toEqual([]);
      expect(r.issues).toEqual([]);
      expect(r.rows.length).toBeGreaterThan(0);
      for (const col of spec.columns.filter((c) => c.type === "date")) {
        const v = r.rows.find((x) => x[col.key] !== undefined)?.[col.key];
        expect(v, col.header).toBeInstanceOf(Date);
      }
    });
  }
});

describe("parseSheet", () => {
  const spec = EXPORTS.verlofsaldo;
  it("leest kolommen op naam, in elke volgorde en met aliassen", () => {
    const s = { ...spec, columns: spec.columns.map((c) => (c.key === "saldo" ? { ...c, aliases: ["Restant"] } : c)) };
    const r = parseSheet<Record<string, unknown>>(
      [["saldo (U)", "Restant", "personeelsnummer", "Jaar", "Verlofrecht (u)", "Opgenomen (u)"], [1, "12,5", 1001, 2026, "1.200", 4]],
      s,
    );
    expect(r.missingColumns).toEqual([]);
    expect(r.rows[0]).toMatchObject({ personeelsnummer: "1001", recht: 1200, opgenomen: 4 });
  });
  it("meldt ontbrekende verplichte kolommen en ongeldige waarden", () => {
    const r = parseSheet([["Personeelsnummer", "Jaar"], ["1001", "twee"]], spec);
    expect(r.missingColumns).toContain("Saldo (u)");
    expect(r.issues[0]).toMatchObject({ row: 2, column: "Jaar" });
  });
  it("begrijpt J/N en dd-mm-jjjj", () => {
    const r = parseSheet<Record<string, unknown>>(
      [["Projectnummer", "Omschrijving", "Klant", "Ordertype", "Status", "Leverdatum", "Kraan nodig"], ["PRJ-0001", "Test", "Klant", "Service", "Gepland", "05-01-2027", "J"]],
      EXPORTS.projecten,
    );
    expect(r.issues).toEqual([]);
    expect((r.rows[0].leverdatum as Date).toISOString().slice(0, 10)).toBe("2027-01-05");
    expect(r.rows[0].kraan).toBe(true);
  });
});
