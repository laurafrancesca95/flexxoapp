// Rekenregels en gegevensmodel van de montageplanning. Zonder React, zodat alles te testen is.
//
// Spelregels (afgestemd met de planning):
// - Een monteur werkt 10 uur per dag. Werkdagen = VC-uren werk / (aantal monteurs x 10), naar boven afgerond.
// - Reisuren tellen los van die 10 uur. Een aparte aanreisdag is optioneel; de planner beslist.
// - De gewenste startdatum is de dag waarop het materiaal op locatie is.
import type { Medewerker, Montageproject } from "../../core/data/exports";

export const UREN_PER_DAG = 10;

// ---- Datums (lokaal, als "jjjj-mm-dd") --------------------------------------
export type Dag = string;

export const dagVan = (d: Date): Dag =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const naarDate = (d: Dag) => {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(y, m - 1, dd);
};
export const plusDagen = (d: Dag, n: number): Dag => {
  const x = naarDate(d);
  x.setDate(x.getDate() + n);
  return dagVan(x);
};
export const isWeekend = (d: Dag) => [0, 6].includes(naarDate(d).getDay());
export const maandagVan = (d: Dag): Dag => plusDagen(d, -((naarDate(d).getDay() + 6) % 7));
export const weekDagen = (maandag: Dag): Dag[] => Array.from({ length: 7 }, (_, i) => plusDagen(maandag, i));

/** ISO-weeknummer en -jaar. */
export function isoWeek(d: Dag) {
  const x = naarDate(d);
  x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7));
  const jan4 = new Date(x.getFullYear(), 0, 4);
  const week = 1 + Math.round(((x.getTime() - jan4.getTime()) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return { jaar: x.getFullYear(), week };
}
/** Sleutel voor een week, bijv. "2026-W48". */
export const weekSleutel = (d: Dag) => {
  const { jaar, week } = isoWeek(d);
  return `${jaar}-W${String(week).padStart(2, "0")}`;
};

/** `aantal` opeenvolgende dagen vanaf `start`, zonder zaterdag en zondag tenzij `weekend`. */
export function dagenVanaf(start: Dag, aantal: number, weekend: boolean): Dag[] {
  const out: Dag[] = [];
  let d = start;
  while (!weekend && isWeekend(d)) d = plusDagen(d, 1);
  while (out.length < aantal) {
    if (weekend || !isWeekend(d)) out.push(d);
    d = plusDagen(d, 1);
  }
  return out;
}

// ---- Montagefasen -----------------------------------------------------------
export const AANREIS = "Aanreis";
export const THUISREIS = "Thuisreis";

/** Standaardvolgorde voor de montage van een dak. De planner kan de lijst aanpassen. */
export const STANDAARD_FASEN = [
  "Rails uitleggen en gaten boren",
  "Ankers lijmen en rails kitten",
  "Mastmontage",
  "Banden inrijgen en spannen",
  "Netmontage",
  "Dakmontage",
  "Aanbouw apparatuur",
  "Restwerkzaamheden",
];
export const EXTRA_FASEN = [AANREIS, THUISREIS, "Reparatie", "Restwerkzaamheden", "Gasdichtheidstest", "Vrij"];

/** Verdeelt de fasen over het aantal werkdagen: bij weinig dagen samengevoegd, bij veel dagen herhaald. */
export function verdeelFasen(werkdagen: number, fasen: string[]): string[] {
  if (werkdagen <= 0) return [];
  if (!fasen.length) return Array(werkdagen).fill("Montage");
  const P = fasen.length;
  return Array.from({ length: werkdagen }, (_, i) => {
    const a = Math.floor((i * P) / werkdagen);
    const b = Math.max(a + 1, Math.floor(((i + 1) * P) / werkdagen));
    const deel = fasen.slice(a, b);
    return deel.length > 2 ? `${deel[0]} t/m ${deel[deel.length - 1].toLowerCase()}` : deel.map((f, j) => (j ? f.toLowerCase() : f)).join(" en ");
  });
}

// ---- Planning ---------------------------------------------------------------
export interface Equipment {
  id: string;
  soort: string;
  aantal: number;
  bron: "Klant" | "Eigen" | "Huur";
  bevestigd: boolean;
  /** Alleen nodig op één dag (bijv. kraan); leeg = hele inzet. */
  dag?: Dag;
  tijd?: string;
}
export const EQUIPMENT_SOORTEN = ["Telescoophoogwerker", "Schaarhoogwerker", "Autokraan 60 t", "Verreiker", "Aggregaat", "Gereedschapscontainer"];

export interface InzetDag {
  datum: Dag;
  fase: string;
}

/** Eén project ingepland bij één team. */
export interface Inzet {
  id: string;
  projectnummer: string;
  team: number;
  dagen: InzetDag[];
  weekend: boolean;
  aanreis: boolean;
  equipment: Equipment[];
  notitie: string;
  /** Gemaakt door "Voorstel maken" en nog niet geaccepteerd. */
  voorstel?: boolean;
  /** Fasen met de hand aangepast: dan niet automatisch herberekenen. */
  fasenAangepast?: boolean;
  /** Aantal monteurs waarmee de duur is berekend. */
  monteurs: number;
  gewijzigd: string;
}

/** Samenstelling van één team in één week. */
export interface TeamWeek {
  id: string; // `${week}|${nummer}`
  week: string;
  nummer: number;
  leden: string[]; // personeelsnummers
  bouwleider?: string;
  voertuig: string;
}

export interface Afwezigheid {
  id: string; // `${week}|${personeelsnummer}`
  week: string;
  personeelsnummer: string;
  reden: "Verlof" | "Ziek";
}

export const werkdagenNodig = (vcUrenWerk: number, monteurs: number) =>
  Math.max(1, Math.ceil(vcUrenWerk / (Math.max(1, monteurs) * UREN_PER_DAG)));

export function fasenVoor(p: Montageproject, fasen: string[]) {
  return p.soort === "Nieuwbouw" ? fasen : [p.soort === "Reparatie" ? "Reparatie" : "Restwerkzaamheden"];
}

/** Bouwt de dagen van een inzet: optioneel een aanreisdag, dan de werkdagen met fasen; thuisreis op de laatste dag. */
export function bouwDagen(p: Montageproject, start: Dag, monteurs: number, opts: { weekend: boolean; aanreis: boolean }, fasen: string[]): InzetDag[] {
  const n = werkdagenNodig(p.vcUrenWerk, monteurs);
  const werk = verdeelFasen(n, fasenVoor(p, fasen));
  const labels = [...(opts.aanreis ? [AANREIS] : []), ...werk];
  labels[labels.length - 1] += ` + ${THUISREIS.toLowerCase()}`;
  return dagenVanaf(start, labels.length, opts.weekend).map((datum, i) => ({ datum, fase: labels[i] }));
}

/** Verschuift een inzet naar een nieuwe startdag; de fasen blijven in dezelfde volgorde. */
export function verschuif(dagen: InzetDag[], start: Dag, weekend: boolean): InzetDag[] {
  const nieuw = dagenVanaf(start, dagen.length, weekend);
  return dagen.map((d, i) => ({ ...d, datum: nieuw[i] }));
}

/** Werkdagen in een inzet (zonder een pure aanreisdag). */
export const werkdagenIn = (i: Inzet) => i.dagen.filter((d) => d.fase !== AANREIS).length;

/** Geplande capaciteit tegenover de VC-uren: 1 = precies genoeg, < 1 = te krap. */
export const dekking = (i: Inzet, p: Montageproject) => (werkdagenIn(i) * i.monteurs * UREN_PER_DAG) / Math.max(1, p.vcUrenWerk);

export function standaardEquipment(p: Montageproject, dagen: InzetDag[]): Equipment[] {
  const out: Equipment[] = [];
  if (p.hoogwerkers) out.push({ id: "hw", soort: "Telescoophoogwerker", aantal: p.hoogwerkers, bron: /levert hoogwerker/i.test(p.opmerking ?? "") ? "Klant" : "Huur", bevestigd: false });
  if (p.kraan) {
    const mast = dagen.find((d) => /mast/i.test(d.fase)) ?? dagen.find((d) => d.fase !== AANREIS) ?? dagen[0];
    out.push({ id: "kr", soort: "Autokraan 60 t", aantal: 1, bron: /regelt de kraan/i.test(p.opmerking ?? "") ? "Klant" : "Huur", bevestigd: false, dag: mast?.datum, tijd: "08:00" });
  }
  return out;
}

export function nieuweInzet(p: Montageproject, team: number, start: Dag, monteurs: number, fasen: string[], extra: Partial<Inzet> = {}): Inzet {
  const weekend = extra.weekend ?? false;
  const aanreis = extra.aanreis ?? p.land !== "NL";
  const dagen = bouwDagen(p, start, monteurs, { weekend, aanreis }, fasen);
  return {
    id: `${p.projectnummer}-${team}-${start}`,
    projectnummer: p.projectnummer,
    team,
    dagen,
    weekend,
    aanreis,
    equipment: standaardEquipment(p, dagen),
    notitie: "",
    monteurs,
    gewijzigd: new Date().toISOString(),
    ...extra,
  };
}

// ---- Teams ------------------------------------------------------------------
const teamNr = (t?: string) => Number(t?.match(/\d+/)?.[0] ?? 0);

/** Standaardsamenstelling uit de medewerkersexport (veld Team, hoofdmonteur = bouwleider). */
export function teamsUitExport(week: string, medewerkers: Medewerker[]): TeamWeek[] {
  const monteurs = medewerkers.filter((m) => m.afdeling === "Montage" && teamNr(m.team) > 0);
  const nummers = [...new Set(monteurs.map((m) => teamNr(m.team)))].sort((a, b) => a - b);
  return nummers.map((n) => {
    const leden = monteurs.filter((m) => teamNr(m.team) === n).sort((a, b) => Number(b.functie === "Hoofdmonteur") - Number(a.functie === "Hoofdmonteur"));
    return { id: `${week}|${n}`, week, nummer: n, leden: leden.map((m) => m.personeelsnummer), bouwleider: leden.find((m) => m.functie === "Hoofdmonteur")?.personeelsnummer, voertuig: `Bus ${n}` };
  });
}

// ---- Automatisch voorstel ---------------------------------------------------
export interface VoorstelInput {
  projecten: Montageproject[];
  inzet: Inzet[];
  teams: TeamWeek[];
  afwezig: Afwezigheid[];
  maandag: Dag;
  fasen: string[];
}

/**
 * Eenvoudig voorstel voor één week. Volgorde: vast afgesproken eerst, dan gewenste startdatum.
 * Per project het team dat het vroegst vrij is vanaf de gewenste start (niet eerder dan maandag).
 * Projecten met een gewenste start na deze week blijven liggen.
 */
export function maakVoorstel({ projecten, inzet, teams, afwezig, maandag, fasen }: VoorstelInput): Inzet[] {
  const week = weekDagen(maandag);
  const zondag = week[6];
  const gepland = new Set(inzet.map((i) => i.projectnummer));
  const bezet = new Map<number, Set<Dag>>();
  for (const i of inzet) for (const d of i.dagen) (bezet.get(i.team) ?? bezet.set(i.team, new Set()).get(i.team)!).add(d.datum);
  const weg = new Set(afwezig.map((a) => a.personeelsnummer));
  const beschikbaar = teams.map((t) => ({ t, n: t.leden.filter((l) => !weg.has(l)).length })).filter((x) => x.n > 0);

  const kandidaten = projecten
    .filter((p) => !gepland.has(p.projectnummer) && dagVan(p.gewensteStart) <= zondag)
    .sort((a, b) => Number(!!b.fix) - Number(!!a.fix) || +a.gewensteStart - +b.gewensteStart);

  const out: Inzet[] = [];
  for (const p of kandidaten) {
    const vanaf = dagVan(p.gewensteStart) > maandag ? dagVan(p.gewensteStart) : maandag;
    let beste: { team: number; n: number; start: Dag } | null = null;
    for (const { t, n } of beschikbaar) {
      const vrij = bezet.get(t.nummer) ?? new Set<Dag>();
      for (const start of week.filter((d) => d >= vanaf && !isWeekend(d))) {
        // Alleen de dagen binnen deze week hoeven vrij te zijn; daarna ziet de planner het in de volgende week.
        const dagen = bouwDagen(p, start, n, { weekend: false, aanreis: p.land !== "NL" }, fasen).filter((d) => d.datum <= zondag);
        if (dagen.every((d) => !vrij.has(d.datum))) {
          if (!beste || start < beste.start || (start === beste.start && n > beste.n)) beste = { team: t.nummer, n, start };
          break;
        }
      }
    }
    if (!beste) continue;
    const i = nieuweInzet(p, beste.team, beste.start, beste.n, fasen, { voorstel: true });
    out.push(i);
    const set = bezet.get(beste.team) ?? bezet.set(beste.team, new Set()).get(beste.team)!;
    i.dagen.forEach((d) => set.add(d.datum));
  }
  return out;
}
