import { describe, expect, it } from "vitest";
import type { Montageproject } from "../src/core/data/exports";
import {
  STANDAARD_FASEN, bouwDagen, dagenVanaf, dekking, isoWeek, maakVoorstel, nieuweInzet, verdeelFasen, verschuif, werkdagenNodig, type TeamWeek,
} from "../src/modules/montageplanning/model";

const project = (x: Partial<Montageproject> = {}): Montageproject => ({
  projectnummer: "PRJ-0001", omschrijving: "Dak Ø22,5 m x 6,0 m", soort: "Nieuwbouw", klant: "Testklant", land: "NL", plaats: "Testdorp",
  status: "In productie", gewensteStart: new Date(2026, 10, 30), vcUrenWerk: 240, vcUrenReis: 24, ...x,
});

describe("rekenregels montageplanning", () => {
  it("rekent werkdagen met 10 uur per monteur per dag, naar boven afgerond", () => {
    expect(werkdagenNodig(240, 3)).toBe(8);
    expect(werkdagenNodig(241, 3)).toBe(9);
    expect(werkdagenNodig(15, 2)).toBe(1);
  });

  it("slaat het weekend over, tenzij doorwerken in het weekend aanstaat", () => {
    expect(dagenVanaf("2026-11-27", 3, false)).toEqual(["2026-11-27", "2026-11-30", "2026-12-01"]);
    expect(dagenVanaf("2026-11-28", 2, false)).toEqual(["2026-11-30", "2026-12-01"]);
    expect(dagenVanaf("2026-11-27", 3, true)).toEqual(["2026-11-27", "2026-11-28", "2026-11-29"]);
  });

  it("verdeelt fasen: samenvoegen bij weinig dagen, herhalen bij veel dagen", () => {
    expect(verdeelFasen(8, STANDAARD_FASEN)).toEqual(STANDAARD_FASEN);
    expect(verdeelFasen(4, STANDAARD_FASEN)[0]).toBe("Rails uitleggen en gaten boren en ankers lijmen en rails kitten");
    expect(verdeelFasen(16, STANDAARD_FASEN).filter((f) => f === "Dakmontage")).toHaveLength(2);
    expect(verdeelFasen(1, STANDAARD_FASEN)[0]).toMatch(/ t\/m /);
  });

  it("bouwt een inzet met aanreisdag en thuisreis op de laatste dag", () => {
    const d = bouwDagen(project({ vcUrenWerk: 60 }), "2026-11-30", 3, { weekend: false, aanreis: true }, STANDAARD_FASEN);
    expect(d.map((x) => x.datum)).toEqual(["2026-11-30", "2026-12-01", "2026-12-02"]);
    expect(d[0].fase).toBe("Aanreis");
    expect(d[2].fase).toMatch(/\+ thuisreis$/);
  });

  it("reparaties krijgen geen dakfasen", () => {
    const d = bouwDagen(project({ soort: "Reparatie", vcUrenWerk: 20 }), "2026-11-30", 2, { weekend: false, aanreis: false }, STANDAARD_FASEN);
    expect(d).toEqual([{ datum: "2026-11-30", fase: "Reparatie + thuisreis" }]);
  });

  it("verschuift met behoud van fasen en toont de dekking", () => {
    const i = nieuweInzet(project(), 1, "2026-11-30", 3, STANDAARD_FASEN, { aanreis: false });
    const v = verschuif(i.dagen, "2026-12-03", false);
    expect(v[0]).toEqual({ datum: "2026-12-03", fase: i.dagen[0].fase });
    expect(v[2].datum).toBe("2026-12-07");
    expect(dekking(i, project())).toBe(1);
  });

  it("kent ISO-weken", () => {
    expect(isoWeek("2026-11-25")).toEqual({ jaar: 2026, week: 48 });
    expect(isoWeek("2027-01-01")).toEqual({ jaar: 2026, week: 53 });
  });
});

describe("automatisch voorstel", () => {
  const teams: TeamWeek[] = [
    { id: "w|1", week: "w", nummer: 1, leden: ["1", "2", "3"], voertuig: "Bus 1" },
    { id: "w|2", week: "w", nummer: 2, leden: ["4", "5"], voertuig: "Bus 2" },
  ];
  it("plant vaste afspraken eerst en laat projecten van later liggen", () => {
    const projecten = [
      project({ projectnummer: "A", gewensteStart: new Date(2026, 10, 30), vcUrenWerk: 150 }),
      project({ projectnummer: "B", gewensteStart: new Date(2026, 11, 1), vcUrenWerk: 60, fix: true }),
      project({ projectnummer: "C", gewensteStart: new Date(2026, 11, 20) }),
    ];
    const v = maakVoorstel({ projecten, inzet: [], teams, afwezig: [], maandag: "2026-11-30", fasen: STANDAARD_FASEN });
    expect(v.map((i) => i.projectnummer)).toEqual(["B", "A"]);
    expect(v[0]).toMatchObject({ team: 1, voorstel: true });
    expect(v[0].dagen[0].datum).toBe("2026-12-01");
    // Team 1 is vanaf dinsdag bezet, dus A gaat maandag naar team 2 (8 dagen met 2 man).
    expect(v[1]).toMatchObject({ team: 2, monteurs: 2 });
    expect(v[1].dagen[0].datum).toBe("2026-11-30");
  });
  it("houdt rekening met afwezige monteurs", () => {
    const v = maakVoorstel({
      projecten: [project({ projectnummer: "A" })], inzet: [], teams,
      afwezig: [{ id: "x", week: "w", personeelsnummer: "1", reden: "Verlof" }], maandag: "2026-11-30", fasen: STANDAARD_FASEN,
    });
    expect(v[0].monteurs).toBe(2);
  });
});
