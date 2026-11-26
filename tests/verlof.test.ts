import { describe, expect, it } from "vitest";
import type { Medewerker, Verlofsaldo } from "../src/core/data/exports";
import {
  VERLOFDAG_UREN, bemetRegels, berekenSaldo, berekenUren, dagenKort, feestdagen, managerVan, pasen, saldoNa, verlofPerMonteur,
  type ManagerKoppeling, type Verlofaanvraag,
} from "../src/modules/collega/verlof";
import { geplandOp } from "../src/modules/collega/planningCheck";
import type { Inzet, TeamWeek } from "../src/modules/montageplanning/model";

const aanvraag = (x: Partial<Verlofaanvraag>): Verlofaanvraag => {
  const b = berekenUren(x.van ?? "2026-12-07", x.tot ?? "2026-12-07", x.deel ?? "hele", VERLOFDAG_UREN, x.uren);
  return { id: "VL-1", personeelsnummer: "1010", soort: "vakantie", van: "2026-12-07", tot: "2026-12-07", deel: "hele", dagen: b.dagen, totaal: b.totaal, status: "aangevraagd", aangevraagdOp: "2026-11-26T08:00:00Z", ...x };
};

describe("feestdagen", () => {
  it("berekent Pasen en de afgeleide dagen", () => {
    expect(pasen(2026)).toBe("2026-04-05");
    expect(pasen(2027)).toBe("2027-03-28");
    const f = feestdagen(2027);
    expect(f.get("2027-03-29")).toBe("Tweede paasdag");
    expect(f.get("2027-05-06")).toBe("Hemelvaartsdag");
    expect(f.get("2027-05-17")).toBe("Tweede pinksterdag");
  });
  it("schuift Koningsdag naar zaterdag als 27 april op zondag valt", () => {
    expect(feestdagen(2025).get("2025-04-26")).toBe("Koningsdag");
    expect(feestdagen(2026).get("2026-04-27")).toBe("Koningsdag");
  });
});

describe("uren berekenen", () => {
  it("telt alleen werkdagen, 8 uur per dag", () => {
    const b = berekenUren("2026-12-04", "2026-12-08", "hele", VERLOFDAG_UREN); // vr t/m di
    expect(b.dagen.map((d) => d.datum)).toEqual(["2026-12-04", "2026-12-07", "2026-12-08"]);
    expect(b.totaal).toBe(24);
  });
  it("slaat kerstdagen over en meldt ze", () => {
    const b = berekenUren("2026-12-24", "2026-12-31", "hele", VERLOFDAG_UREN);
    expect(b.overgeslagen.map((o) => o.reden)).toEqual(["Eerste kerstdag"]); // 26 dec is zaterdag
    expect(b.totaal).toBe(5 * 8); // do 24, ma 28 t/m do 31
  });
  it("halve dag en uren alleen op één dag", () => {
    expect(berekenUren("2026-12-07", "2026-12-07", "ochtend", 8).totaal).toBe(4);
    expect(berekenUren("2026-12-07", "2026-12-07", "uren", 8, 3).totaal).toBe(3);
    expect(berekenUren("2026-12-07", "2026-12-07", "uren", 8, 12).totaal).toBe(8);
    expect(berekenUren("2026-12-07", "2026-12-08", "middag", 8).fout).toBeTruthy();
    expect(berekenUren("2026-12-05", "2026-12-06", "hele", 8).fout).toMatch(/geen werkdag/);
    expect(berekenUren("2026-12-08", "2026-12-07", "hele", 8).fout).toMatch(/voor de begindatum/);
  });
});

describe("saldo", () => {
  const rij: Verlofsaldo = { personeelsnummer: "1010", jaar: 2026, recht: 200, opgenomen: 120, aangevraagd: 16, saldo: 64, advRecht: 52, advOpgenomen: 40 };
  it("trekt goedgekeurd (nog niet in Bemet) en aangevraagd af, maar geëxporteerd niet dubbel", () => {
    const s = berekenSaldo(rij, [
      aanvraag({ id: "a", status: "goedgekeurd", van: "2026-12-07", tot: "2026-12-08" }),
      aanvraag({ id: "b", status: "aangevraagd", van: "2026-12-10", tot: "2026-12-10" }),
      aanvraag({ id: "c", status: "goedgekeurd", geexporteerdOp: "2026-11-01T00:00:00Z" }),
      aanvraag({ id: "d", status: "afgewezen" }),
      aanvraag({ id: "e", status: "aangevraagd", soort: "bijzonder" }),
      aanvraag({ id: "f", status: "aangevraagd", soort: "adv" }),
    ], 2026)!;
    expect(s.vakantie).toMatchObject({ gepland: 16, goedgekeurd: 16, inAanvraag: 8, beschikbaar: 64 - 16 - 8 });
    expect(s.adv).toMatchObject({ recht: 52, inAanvraag: 8, beschikbaar: 4 });
    expect(saldoNa(s, "adv", 8)).toMatchObject({ na: -4, tekort: true });
    expect(saldoNa(s, "zorg", 8)).toBeNull();
    expect(s.tvt).toBeUndefined();
  });
  it("TVT: opgebouwde overuren als eigen saldo", () => {
    const s = berekenSaldo({ ...rij, tvtOpgebouwd: 22.5, tvtOpgenomen: 8 }, [aanvraag({ soort: "tvt", deel: "uren", uren: 4 })], 2026)!;
    expect(s.tvt).toMatchObject({ recht: 22.5, opgenomen: 8, inAanvraag: 4, beschikbaar: 10.5 });
    expect(s.vakantie.inAanvraag).toBe(0);
    expect(saldoNa(s, "tvt", 12)).toMatchObject({ na: -1.5, tekort: true });
  });
  it("telt alleen uren in het saldojaar", () => {
    const s = berekenSaldo(rij, [aanvraag({ status: "aangevraagd", van: "2026-12-31", tot: "2027-01-04" })], 2026)!;
    expect(s.vakantie.inAanvraag).toBe(8);
  });
});

describe("manager", () => {
  const mensen = new Map<string, Medewerker>([
    ["1010", { personeelsnummer: "1010", voornaam: "Sem", achternaam: "Bos", email: "", afdeling: "Montage", functie: "Monteur", manager: "1002" }],
  ]);
  it("koppeling in Beheer gaat voor Bemet, leeg = geen manager", () => {
    expect(managerVan("1010", mensen, new Map())).toBe("1002");
    const k = (manager: string) => new Map<string, ManagerKoppeling>([["1010", { id: "1010", manager }]]);
    expect(managerVan("1010", mensen, k("1003"))).toBe("1003");
    expect(managerVan("1010", mensen, k(""))).toBeUndefined();
  });
});

describe("samenhang met de planning", () => {
  const teams: TeamWeek[] = [{ id: "2026-W50|2", week: "2026-W50", nummer: 2, leden: ["1010", "1011"], voertuig: "Bus 2" }];
  const inzet = [
    { id: "i1", projectnummer: "PRJ-0300", team: 2, dagen: [{ datum: "2026-12-08", fase: "Netmontage" }, { datum: "2026-12-09", fase: "Dakmontage" }] },
    { id: "i2", projectnummer: "PRJ-0301", team: 2, voorstel: true, dagen: [{ datum: "2026-12-10", fase: "Netmontage" }] },
  ] as unknown as Inzet[];
  it("vindt projecten van het team op de verlofdagen, zonder voorstellen", () => {
    expect(geplandOp("1010", ["2026-12-09", "2026-12-10"], inzet, teams)).toEqual([{ datum: "2026-12-09", projectnummer: "PRJ-0300", team: 2 }]);
    expect(geplandOp("9999", ["2026-12-09"], inzet, teams)).toEqual([]);
  });
  it("geeft per monteur de verlofdagen in de week", () => {
    const v = verlofPerMonteur([aanvraag({ status: "goedgekeurd", van: "2026-12-08", tot: "2026-12-10" }), aanvraag({ id: "x", status: "afgewezen", van: "2026-12-11", tot: "2026-12-11" })], ["2026-12-07", "2026-12-08", "2026-12-09", "2026-12-10", "2026-12-11"]);
    expect(v.get("1010")!.map((x) => x.datum)).toEqual(["2026-12-08", "2026-12-09", "2026-12-10"]);
    expect(dagenKort(v.get("1010")!.map((x) => x.datum))).toBe("di t/m do");
    expect(dagenKort(["2026-12-08", "2026-12-10"])).toBe("di, do");
  });
});

describe("export naar Bemet", () => {
  it("maakt één regel per dag, alleen goedgekeurd", () => {
    const r = bemetRegels([aanvraag({ status: "goedgekeurd", van: "2026-12-07", tot: "2026-12-08", beoordeeldDoor: "1002" }), aanvraag({ id: "n", status: "aangevraagd" })], new Map());
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ personeelsnummer: "1010", uren: 8, soort: "Vakantie" });
  });
});
