// Urenbriefje per monteur per week. Zelfde velden en keuzes als het huidige Excel-briefje,
// maar vooraf ingevuld vanuit de gepubliceerde planning. De monteur past aan en dient in.
import type { Montageproject } from "../../core/data/exports";
import { AANREIS, THUISREIS, plusDagen, weekDagen, type Dag } from "../montageplanning/model";
import { weekVanMonteur, type Publicatie } from "../montageplanning/publicatie";

export const GEREISD = ["Nee", "Ja, bus/auto", "Ja, vlucht/trein/boot/anders"] as const;
export const CHAUFFEUR = ["Nee", "Ja, de hele reis", "Ja, 1/2 van de reis", "Ja, 1/3 van de reis"] as const;
export const STARTPUNT = ["Huis", "Hotel bij project"] as const;
export const MAX_BLOKKEN = 5;
/** Standaard werkdag bij vooraf invullen: 10 uur, zoals in de calculatie. */
export const STANDAARD_VAN = "07:00";
export const STANDAARD_TOT = "17:00";
/** Projectnummer voor werk in de eigen werkplaats. */
export const WERKPLAATS = "WERKPLAATS";

export type Gereisd = (typeof GEREISD)[number];
export type Chauffeur = (typeof CHAUFFEUR)[number];

export interface Tijdblok {
  id: string;
  van: string; // "07:30", leeg = nog invullen
  tot: string;
  projectnummer: string;
  projectnaam: string;
  bouwleider: boolean;
  gereisd: Gereisd;
  chauffeur: Chauffeur | "";
  opmerking: string;
  /** Vooraf ingevuld vanuit de planning en nog niet aangepast. */
  uitPlanning?: boolean;
}

export interface BriefjeDag {
  datum: Dag;
  blokken: Tijdblok[];
  /** Overnachting in een hotel van deze dag op de volgende. */
  hotel: boolean;
  priveKm: number;
}

export interface Urenbriefje {
  id: string; // `${week}|${personeelsnummer}`
  week: string;
  personeelsnummer: string;
  team?: number;
  startpunt: (typeof STARTPUNT)[number];
  dagen: BriefjeDag[];
  status: "concept" | "ingediend";
  ingediendOp?: string;
  /** Versie van de publicatie waaruit is ingevuld. */
  bronVersie?: number;
}

// ---- Tijd -------------------------------------------------------------------------------
export const minuten = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
export const KWARTIEREN = Array.from({ length: 24 * 4 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`);

/** Duur van een blok in uren; 0 als van of tot ontbreekt. Over middernacht telt door. */
export function duur(b: Tijdblok) {
  const a = minuten(b.van);
  const z = minuten(b.tot);
  if (a == null || z == null) return 0;
  return ((z - a + 24 * 60) % (24 * 60)) / 60;
}

export const isReis = (b: Tijdblok) => b.gereisd !== "Nee";

export function totalen(br: Urenbriefje) {
  const perDag = br.dagen.map((d) => ({
    datum: d.datum,
    werk: d.blokken.filter((b) => !isReis(b)).reduce((s, b) => s + duur(b), 0),
    reis: d.blokken.filter(isReis).reduce((s, b) => s + duur(b), 0),
  }));
  return { perDag, werk: perDag.reduce((s, d) => s + d.werk, 0), reis: perDag.reduce((s, d) => s + d.reis, 0) };
}

// ---- Controles ----------------------------------------------------------------------------
export interface Melding { datum: Dag; blok?: string; tekst: string }

export function controleer(br: Urenbriefje): Melding[] {
  const out: Melding[] = [];
  for (const d of br.dagen) {
    const gevuld = d.blokken.filter((b) => b.van || b.tot || b.projectnummer);
    for (const b of gevuld) {
      if (!b.van || !b.tot) out.push({ datum: d.datum, blok: b.id, tekst: "Vul begin- en eindtijd in." });
      else if (minuten(b.van) === minuten(b.tot)) out.push({ datum: d.datum, blok: b.id, tekst: "Begin- en eindtijd zijn gelijk." });
      if (!b.projectnummer) out.push({ datum: d.datum, blok: b.id, tekst: "Kies een project of de werkplaats." });
      if (isReis(b) && !b.chauffeur) out.push({ datum: d.datum, blok: b.id, tekst: "Geef aan of je chauffeur was." });
      if (b.gereisd === "Ja, vlucht/trein/boot/anders" && !b.opmerking.trim()) out.push({ datum: d.datum, blok: b.id, tekst: "Vul bij vlucht, trein of boot vertrek, aankomst en reistijd in bij de opmerking." });
    }
    const tijden = gevuld.map((b) => [minuten(b.van), minuten(b.tot), b.id] as const).filter(([a, z]) => a != null && z != null && z > a!).sort((x, y) => x[0]! - y[0]!);
    for (let i = 1; i < tijden.length; i++) {
      if (tijden[i][0]! < tijden[i - 1][1]!) out.push({ datum: d.datum, blok: tijden[i][2], tekst: "Dit blok overlapt met het vorige." });
    }
  }
  return out;
}

// ---- Vooraf invullen ------------------------------------------------------------------------
let teller = 0;
const nieuwId = () => `b${Date.now().toString(36)}${(teller++).toString(36)}`;

export const leegBlok = (x: Partial<Tijdblok> = {}): Tijdblok => ({
  id: nieuwId(), van: "", tot: "", projectnummer: "", projectnaam: "", bouwleider: false, gereisd: "Nee", chauffeur: "", opmerking: "", ...x,
});

/** Reismiddel als voorstel: binnen NL, DE en BE met de bus, verder weg vrij te kiezen (leeg = planner weet het niet). */
const reisVoorstel = (p?: Montageproject): Gereisd => (p && ["NL", "DE", "BE"].includes(p.land) ? "Ja, bus/auto" : "Ja, vlucht/trein/boot/anders");

/**
 * Maakt een urenbriefje op basis van de gepubliceerde week:
 * - werkdag: één blok 07:00-17:00 op het project (10 uur), bouwleider als de monteur dat is;
 * - aanreisdag: een reisblok zonder tijden (de monteur vult de werkelijke reistijd in);
 * - laatste dag (+ thuisreis): werkblok plus een reisblok naar huis zonder tijden;
 * - hotel: ja als het project buiten NL ligt en de volgende dag hetzelfde project is.
 */
export function vulVooraf(pub: Publicatie | undefined, pnr: string, week: string, maandag: Dag, projecten: Map<string, Montageproject>): Urenbriefje {
  const mijn = weekVanMonteur(pub, pnr);
  const bl = mijn?.team?.bouwleider === pnr;
  const opDag = (d: Dag) => (mijn?.inzet ?? []).flatMap((i) => i.dagen.filter((x) => x.datum === d).map((x) => ({ i, fase: x.fase })));
  const dagen: BriefjeDag[] = weekDagen(maandag).map((datum) => {
    const blokken: Tijdblok[] = [];
    for (const { i, fase } of mijn?.afwezig ? [] : opDag(datum)) {
      const p = projecten.get(i.projectnummer);
      const basis = { projectnummer: i.projectnummer, projectnaam: p ? `${p.plaats} (${p.land})` : i.projectnummer, bouwleider: bl, uitPlanning: true };
      if (fase === AANREIS) {
        blokken.push(leegBlok({ ...basis, gereisd: reisVoorstel(p), opmerking: "Aanreis" }));
        continue;
      }
      blokken.push(leegBlok({ ...basis, van: STANDAARD_VAN, tot: STANDAARD_TOT, opmerking: fase.replace(/ \+ thuisreis$/i, "") }));
      if (/thuisreis$/i.test(fase)) blokken.push(leegBlok({ ...basis, van: STANDAARD_TOT, gereisd: reisVoorstel(p), opmerking: THUISREIS }));
    }
    return { datum, blokken: blokken.slice(0, MAX_BLOKKEN), hotel: false, priveKm: 0 };
  });
  // Hotel: buitenlands project dat de volgende dag doorloopt.
  dagen.forEach((d, k) => {
    const morgen = dagen[k + 1]?.datum ?? plusDagen(d.datum, 1);
    const vandaagPrj = opDag(d.datum).map((x) => x.i.projectnummer);
    const morgenPrj = new Set(opDag(morgen).map((x) => x.i.projectnummer));
    d.hotel = vandaagPrj.some((nr) => morgenPrj.has(nr) && projecten.get(nr)?.land !== "NL");
  });
  return {
    id: `${week}|${pnr}`, week, personeelsnummer: pnr, team: mijn?.team?.nummer, startpunt: "Huis", dagen, status: "concept", bronVersie: pub?.versie,
  };
}
