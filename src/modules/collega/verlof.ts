// Rekenregels en gegevensmodel voor verlof. Zonder React, zodat alles te testen is.
//
// Spelregels (afgestemd 26-11-2026):
// - Saldo rekent in uren (zoals de Bemet-export). Een verlofdag telt 8 uur.
// - Alleen werkdagen tellen: geen zaterdag, zondag of officiële feestdag.
// - Vakantie en ADV gaan van het saldo af. Bijzonder verlof, zorgverlof en onbetaald verlof niet.
// - De manager die in Beheer aan de medewerker gekoppeld is, keurt goed. Zonder koppeling: de manager uit Bemet.
// - Voor monteurs kan de montageplanner advies geven; de manager beslist.
import type { Medewerker, Verlofsaldo } from "../../core/data/exports";
import { dagVan, isWeekend, naarDate, plusDagen, type Dag } from "../montageplanning/model";

// ---- Soorten verlof -------------------------------------------------------------
export type VerlofSoort = "vakantie" | "adv" | "bijzonder" | "zorg" | "onbetaald";
export type Saldopot = "vakantie" | "adv";

export interface SoortDef {
  id: VerlofSoort;
  label: string;
  uitleg: string;
  /** Van welk saldo de uren afgaan; leeg = geen saldo. */
  saldo?: Saldopot;
  /** Verplicht een reden kiezen. */
  redenen?: string[];
}

export const SOORTEN: SoortDef[] = [
  { id: "vakantie", label: "Vakantie", uitleg: "Gaat van je vakantiesaldo af", saldo: "vakantie" },
  { id: "adv", label: "ADV", uitleg: "Gaat van je ADV-saldo af", saldo: "adv" },
  {
    id: "bijzonder", label: "Bijzonder verlof", uitleg: "Volgens de cao, gaat niet van je saldo af",
    redenen: ["Eigen huwelijk of geregistreerd partnerschap", "Huwelijk familielid", "Overlijden of begrafenis", "Verhuizing", "Bevalling partner", "Doktersbezoek", "Anders"],
  },
  { id: "zorg", label: "Zorgverlof", uitleg: "Zorg voor een naaste, gaat niet van je saldo af", redenen: ["Kortdurend zorgverlof", "Calamiteitenverlof", "Langdurend zorgverlof"] },
  { id: "onbetaald", label: "Onbetaald verlof", uitleg: "Wordt ingehouden op je salaris" },
];
export const soortDef = (id: VerlofSoort) => SOORTEN.find((s) => s.id === id)!;

// ---- Aanvraag --------------------------------------------------------------------
export type VerlofStatus = "aangevraagd" | "goedgekeurd" | "afgewezen" | "ingetrokken";
/** Hele dagen, halve dag (ochtend of middag) of een aantal uren op één dag. */
export type Dagdeel = "hele" | "ochtend" | "middag" | "uren";

export interface Advies {
  door: string;
  op: string;
  akkoord: boolean;
  tekst?: string;
}

export interface Verlofaanvraag {
  id: string;
  personeelsnummer: string;
  soort: VerlofSoort;
  reden?: string;
  van: Dag;
  tot: Dag;
  deel: Dagdeel;
  /** Alleen bij deel = "uren". */
  uren?: number;
  toelichting?: string;
  /** Uren per dag zoals berekend bij het aanvragen. */
  dagen: { datum: Dag; uren: number }[];
  totaal: number;
  status: VerlofStatus;
  aangevraagdOp: string;
  /** Personeelsnummer van de manager die moet beslissen. */
  manager?: string;
  beoordeeldDoor?: string;
  beoordeeldOp?: string;
  reactie?: string;
  advies?: Advies;
  /** Gezet zodra de goedgekeurde aanvraag in een Bemet-export zit. */
  geexporteerdOp?: string;
}

// ---- Feestdagen ------------------------------------------------------------------
/** Paaszondag (Anonieme Gregoriaanse methode). */
export function pasen(jaar: number): Dag {
  const a = jaar % 19, b = Math.floor(jaar / 100), c = jaar % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const maand = Math.floor((h + l - 7 * m + 114) / 31), dag = ((h + l - 7 * m + 114) % 31) + 1;
  return dagVan(new Date(jaar, maand - 1, dag));
}

/** Officiële vrije dagen in Nederland (Bevrijdingsdag alleen in lustrumjaren). */
export function feestdagen(jaar: number): Map<Dag, string> {
  const p = pasen(jaar);
  const koning = naarDate(`${jaar}-04-27`).getDay() === 0 ? `${jaar}-04-26` : `${jaar}-04-27`;
  const lijst: [Dag, string][] = [
    [`${jaar}-01-01`, "Nieuwjaarsdag"],
    [plusDagen(p, 1), "Tweede paasdag"],
    [koning, "Koningsdag"],
    [plusDagen(p, 39), "Hemelvaartsdag"],
    [plusDagen(p, 50), "Tweede pinksterdag"],
    [`${jaar}-12-25`, "Eerste kerstdag"],
    [`${jaar}-12-26`, "Tweede kerstdag"],
  ];
  if (jaar % 5 === 0) lijst.push([`${jaar}-05-05`, "Bevrijdingsdag"]);
  return new Map(lijst);
}
export const feestdag = (d: Dag) => feestdagen(naarDate(d).getFullYear()).get(d);
export const isWerkdag = (d: Dag) => !isWeekend(d) && !feestdag(d);

// ---- Uren berekenen --------------------------------------------------------------
/** Een verlofdag telt 8 uur, ook bij parttime (afgesproken 26-11-2026). */
export const VERLOFDAG_UREN = 8;

export interface Berekening {
  dagen: { datum: Dag; uren: number }[];
  totaal: number;
  /** Vrije dagen in de periode die niet meetellen (weekend telt niet mee in deze lijst). */
  overgeslagen: { datum: Dag; reden: string }[];
  fout?: string;
}

export function berekenUren(van: Dag, tot: Dag, deel: Dagdeel, upd: number, uren?: number): Berekening {
  const leeg = (fout: string): Berekening => ({ dagen: [], totaal: 0, overgeslagen: [], fout });
  if (!van || !tot) return leeg("Kies een begin- en einddatum.");
  if (tot < van) return leeg("De einddatum ligt voor de begindatum.");
  if (deel !== "hele" && van !== tot) return leeg("Een halve dag of een aantal uren kan alleen op één dag.");
  const dagen: { datum: Dag; uren: number }[] = [];
  const overgeslagen: { datum: Dag; reden: string }[] = [];
  let n = 0;
  for (let d = van; d <= tot; d = plusDagen(d, 1)) {
    if (++n > 366) return leeg("Kies een periode van maximaal een jaar.");
    if (isWeekend(d)) continue;
    const f = feestdag(d);
    if (f) {
      overgeslagen.push({ datum: d, reden: f });
      continue;
    }
    const u = deel === "hele" ? upd : deel === "uren" ? Math.min(upd, Math.max(0, uren ?? 0)) : upd / 2;
    dagen.push({ datum: d, uren: u });
  }
  if (!dagen.length) return { dagen, totaal: 0, overgeslagen, fout: "In deze periode zit geen werkdag." };
  if (deel === "uren" && !(uren && uren > 0)) return { dagen, totaal: 0, overgeslagen, fout: "Vul het aantal uren in." };
  return { dagen, totaal: dagen.reduce((s, d) => s + d.uren, 0), overgeslagen };
}

// ---- Saldo -----------------------------------------------------------------------
export interface Pot {
  /** Verlofrecht dit jaar, incl. meegenomen saldo. */
  recht: number;
  /** Volgens Bemet opgenomen. */
  opgenomen: number;
  /** Volgens Bemet gepland (goedgekeurd, nog niet opgenomen). */
  gepland: number;
  /** In de app goedgekeurd, nog niet in Bemet verwerkt. */
  goedgekeurd: number;
  /** In de app aangevraagd, wacht op de manager. */
  inAanvraag: number;
  /** Wat je nog kunt aanvragen. */
  beschikbaar: number;
}

export interface Saldo {
  jaar: number;
  vakantie: Pot;
  adv?: Pot;
}

/** Uren van een aanvraag die van een pot afgaan, beperkt tot één jaar. */
const urenInJaar = (a: Verlofaanvraag, jaar: number) => a.dagen.filter((d) => d.datum.startsWith(`${jaar}-`)).reduce((s, d) => s + d.uren, 0);

export function berekenSaldo(rij: Verlofsaldo | undefined, aanvragen: Verlofaanvraag[], jaar: number): Saldo | null {
  if (!rij) return null;
  const eigen = aanvragen.filter((a) => a.personeelsnummer === rij.personeelsnummer);
  const pot = (soort: Saldopot, recht: number, opgenomen: number, gepland: number): Pot => {
    const van = eigen.filter((a) => soortDef(a.soort).saldo === soort);
    const goedgekeurd = van.filter((a) => a.status === "goedgekeurd" && !a.geexporteerdOp).reduce((s, a) => s + urenInJaar(a, jaar), 0);
    const inAanvraag = van.filter((a) => a.status === "aangevraagd").reduce((s, a) => s + urenInJaar(a, jaar), 0);
    return { recht, opgenomen, gepland, goedgekeurd, inAanvraag, beschikbaar: recht - opgenomen - gepland - goedgekeurd - inAanvraag };
  };
  const vakantie = pot("vakantie", rij.recht, rij.opgenomen, Math.max(0, rij.recht - rij.opgenomen - rij.saldo));
  const adv = rij.advRecht ? pot("adv", rij.advRecht, rij.advOpgenomen ?? 0, 0) : undefined;
  return { jaar: rij.jaar || jaar, vakantie, adv };
}

/** Controle bij het aanvragen: genoeg saldo? */
export function saldoNa(saldo: Saldo | null, soort: VerlofSoort, uren: number) {
  const s = soortDef(soort).saldo;
  if (!s || !saldo) return null;
  const pot = s === "adv" ? saldo.adv : saldo.vakantie;
  if (!pot) return { pot: undefined, na: -uren, tekort: true };
  const na = pot.beschikbaar - uren;
  return { pot, na, tekort: na < 0 };
}

// ---- Manager ---------------------------------------------------------------------
/** Koppeling medewerker -> manager zoals ingesteld in Beheer. Gaat voor de manager uit Bemet. */
export interface ManagerKoppeling {
  id: string; // personeelsnummer medewerker
  manager: string; // personeelsnummer manager, "" = expliciet geen manager
  gewijzigdDoor?: string;
  gewijzigdOp?: string;
}

export function managerVan(pnr: string, mensen: Map<string, Medewerker>, koppelingen: Map<string, ManagerKoppeling>): string | undefined {
  const k = koppelingen.get(pnr);
  if (k) return k.manager || undefined;
  return mensen.get(pnr)?.manager || undefined;
}

/** Wie in Beheer als manager gekozen kan worden: management en iedereen die al manager is. */
export function kandidaatManagers(medewerkers: Medewerker[], koppelingen: Map<string, ManagerKoppeling>) {
  const al = new Set([...medewerkers.map((m) => m.manager), ...[...koppelingen.values()].map((k) => k.manager)].filter(Boolean));
  return medewerkers.filter((m) => m.afdeling === "Management" || al.has(m.personeelsnummer) || /manager|directeur|leidinggevende/i.test(m.functie));
}

// ---- Overlap en planning ---------------------------------------------------------
/** Actieve aanvragen (aangevraagd of goedgekeurd) die op één van de dagen vallen. */
export function opDagen(aanvragen: Verlofaanvraag[], dagen: Dag[], pnr?: string) {
  const set = new Set(dagen);
  return aanvragen.filter((a) => (a.status === "aangevraagd" || a.status === "goedgekeurd") && (!pnr || a.personeelsnummer === pnr) && a.dagen.some((d) => set.has(d.datum)));
}

/** Per medewerker de verlofdagen in een week (voor het planbord). */
export function verlofPerMonteur(aanvragen: Verlofaanvraag[], dagen: Dag[]) {
  const set = new Set(dagen);
  const out = new Map<string, { datum: Dag; status: "aangevraagd" | "goedgekeurd"; deel: Dagdeel; soort: VerlofSoort }[]>();
  for (const a of aanvragen) {
    if (a.status !== "aangevraagd" && a.status !== "goedgekeurd") continue;
    for (const d of a.dagen) {
      if (!set.has(d.datum)) continue;
      const lijst = out.get(a.personeelsnummer) ?? out.set(a.personeelsnummer, []).get(a.personeelsnummer)!;
      lijst.push({ datum: d.datum, status: a.status, deel: a.deel, soort: a.soort });
    }
  }
  for (const l of out.values()) l.sort((x, y) => x.datum.localeCompare(y.datum));
  return out;
}

/** Korte weergave van dagen, bijv. "di, wo" of "ma t/m vr". */
export function dagenKort(dagen: Dag[]) {
  const wd = (d: Dag) => naarDate(d).toLocaleDateString("nl-NL", { weekday: "short" }).replace(".", "");
  if (dagen.length >= 3) {
    const aaneen = dagen.every((d, i) => i === 0 || werkdagTussen(dagen[i - 1], d));
    if (aaneen) return `${wd(dagen[0])} t/m ${wd(dagen[dagen.length - 1])}`;
  }
  return dagen.map(wd).join(", ");
}
/** Of b de eerstvolgende werkdag na a is. */
function werkdagTussen(a: Dag, b: Dag) {
  let d = plusDagen(a, 1);
  while (isWeekend(d)) d = plusDagen(d, 1);
  return d === b;
}

// ---- Export naar Bemet -----------------------------------------------------------
export const BEMET_IMPORT_KOPPEN = ["Personeelsnummer", "Naam", "Datum", "Uren", "Verlofsoort", "Reden", "Aanvraagnummer", "Goedgekeurd door", "Goedgekeurd op"];

/** Eén regel per dag, zodat Bemet het per dag kan boeken. */
export function bemetRegels(aanvragen: Verlofaanvraag[], mensen: Map<string, Medewerker>) {
  const naam = (p?: string) => {
    const m = p ? mensen.get(p) : undefined;
    return m ? `${m.voornaam} ${m.achternaam}` : p ?? "";
  };
  return aanvragen
    .filter((a) => a.status === "goedgekeurd")
    .flatMap((a) => a.dagen.map((d) => ({
      personeelsnummer: a.personeelsnummer, naam: naam(a.personeelsnummer), datum: naarDate(d.datum), uren: d.uren,
      soort: soortDef(a.soort).label, reden: a.reden ?? "", aanvraag: a.id, door: naam(a.beoordeeldDoor), op: a.beoordeeldOp ? new Date(a.beoordeeldOp) : undefined,
    })))
    .sort((x, y) => x.personeelsnummer.localeCompare(y.personeelsnummer) || +x.datum - +y.datum);
}

// ---- Hulpjes ---------------------------------------------------------------------
export const nieuwId = (nu = new Date()) => `VL-${nu.getTime().toString(36).toUpperCase()}${Math.floor(Math.random() * 36 ** 2).toString(36).toUpperCase()}`;
export const urenTekst = (u: number) => `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 }).format(Math.round(u * 100) / 100)} u`;
export const dagenTekst = (u: number, upd: number) => {
  const d = Math.round((u / upd) * 10) / 10;
  return `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(d)} ${d === 1 ? "dag" : "dagen"}`;
};
export const STATUS_LABEL: Record<VerlofStatus, string> = { aangevraagd: "Wacht op akkoord", goedgekeurd: "Goedgekeurd", afgewezen: "Afgewezen", ingetrokken: "Ingetrokken" };
