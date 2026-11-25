import { describe, expect, it } from "vitest";
import type { Montageproject } from "../src/core/data/exports";
import { STANDAARD_FASEN, nieuweInzet, type TeamWeek } from "../src/modules/montageplanning/model";
import { maakPublicatie, weekInhoud } from "../src/modules/montageplanning/publicatie";
import { controleer, duur, leegBlok, totalen, vulVooraf } from "../src/modules/montage/urenbriefje";

const project = (x: Partial<Montageproject> = {}): Montageproject => ({
  projectnummer: "PRJ-0001", omschrijving: "Dak", soort: "Nieuwbouw", klant: "Testklant", land: "DE", plaats: "Teststadt",
  status: "In productie", gewensteStart: new Date(2026, 10, 30), vcUrenWerk: 60, vcUrenReis: 24, ...x,
});
const teams: TeamWeek[] = [{ id: "2026-W49|1", week: "2026-W49", nummer: 1, leden: ["1", "2"], bouwleider: "1", voertuig: "Bus 1" }];
const p = project();
const projecten = new Map([[p.projectnummer, p]]);
// DE-project, 60 u met 2 man = 3 werkdagen, plus aanreisdag: ma aanreis, di-do werk, do + thuisreis.
const inzet = nieuweInzet(p, 1, "2026-11-30", 2, STANDAARD_FASEN);
const pub = maakPublicatie("2026-W49", "2026-11-30", weekInhoud("2026-11-30", [inzet], teams, [], "2026-W49"), undefined, "Planner");

describe("urenbriefje vooraf invullen", () => {
  const br = vulVooraf(pub, "1", "2026-W49", "2026-11-30", projecten);
  it("zet de aanreis als reisblok zonder tijden", () => {
    expect(br.dagen[0].blokken).toHaveLength(1);
    expect(br.dagen[0].blokken[0]).toMatchObject({ projectnummer: "PRJ-0001", gereisd: "Ja, bus/auto", van: "", bouwleider: true });
  });
  it("vult werkdagen met 10 uur en de thuisreis op de laatste dag", () => {
    expect(br.dagen[1].blokken[0]).toMatchObject({ van: "07:00", tot: "17:00", gereisd: "Nee" });
    expect(duur(br.dagen[1].blokken[0])).toBe(10);
    expect(br.dagen[3].blokken.map((b) => b.opmerking)).toEqual(["Dakmontage t/m restwerkzaamheden", "Thuisreis"]);
    expect(br.dagen[4].blokken).toEqual([]);
  });
  it("zet hotel aan zolang het buitenlandse project de volgende dag doorloopt", () => {
    expect(br.dagen.map((d) => d.hotel)).toEqual([true, true, true, false, false, false, false]);
  });
  it("een teamlid is geen bouwleider; iemand buiten het team krijgt een leeg briefje", () => {
    expect(vulVooraf(pub, "2", "2026-W49", "2026-11-30", projecten).dagen[1].blokken[0].bouwleider).toBe(false);
    expect(vulVooraf(pub, "9", "2026-W49", "2026-11-30", projecten).dagen.every((d) => !d.blokken.length)).toBe(true);
  });
  it("telt werk- en reisuren apart", () => {
    const t = totalen(br);
    expect(t.werk).toBe(30);
    expect(t.reis).toBe(0);
  });
});

describe("controles", () => {
  it("vraagt tijden, chauffeur en reisdetails, en vindt overlap", () => {
    const br = vulVooraf(pub, "1", "2026-W49", "2026-11-30", projecten);
    let m = controleer(br).map((x) => x.tekst);
    expect(m).toContain("Vul begin- en eindtijd in.");
    expect(m).toContain("Geef aan of je chauffeur was.");
    br.dagen[1].blokken.push(leegBlok({ van: "16:00", tot: "18:00", projectnummer: "WERKPLAATS" }));
    br.dagen[2].blokken.push(leegBlok({ van: "08:00", tot: "12:00", projectnummer: "PRJ-0001", gereisd: "Ja, vlucht/trein/boot/anders", chauffeur: "Nee" }));
    m = controleer(br).map((x) => x.tekst);
    expect(m).toContain("Dit blok overlapt met het vorige.");
    expect(m.some((x) => x.startsWith("Vul bij vlucht"))).toBe(true);
  });
  it("rekent over middernacht door", () => {
    expect(duur(leegBlok({ van: "22:00", tot: "02:30" }))).toBe(4.5);
  });
});
