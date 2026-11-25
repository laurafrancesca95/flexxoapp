// Publiceren van een weekplanning. Monteurs zien alleen wat gepubliceerd is, niet het concept van de planner.
import { weekDagen, type Afwezigheid, type Dag, type Inzet, type TeamWeek } from "./model";

export interface Publicatie {
  id: string; // weeksleutel, bijv. "2026-W48"
  week: string;
  maandag: Dag;
  gepubliceerdOp: string;
  door: string;
  inzet: Inzet[];
  teams: TeamWeek[];
  afwezig: Afwezigheid[];
  /** Ids van inzet die bij deze publicatie nieuw of anders is dan bij de vorige. */
  gewijzigd: string[];
  versie: number;
}

/** Inhoud die voor de monteur telt (zonder tijdstempels en conceptvlaggen). */
const kern = (i: Inzet) => JSON.stringify([i.projectnummer, i.team, i.dagen, i.equipment, i.notitie]);
const kernTeam = (t: TeamWeek) => JSON.stringify([t.nummer, [...t.leden].sort(), t.bouwleider, t.voertuig]);

export function weekInhoud(maandag: Dag, inzet: Inzet[], teams: TeamWeek[], afwezig: Afwezigheid[], week: string) {
  const dagen = weekDagen(maandag);
  return {
    inzet: inzet.filter((i) => !i.voorstel && i.dagen.some((d) => d.datum >= dagen[0] && d.datum <= dagen[6])).sort((a, b) => a.id.localeCompare(b.id)),
    teams: teams.filter((t) => t.week === week).sort((a, b) => a.nummer - b.nummer),
    afwezig: afwezig.filter((a) => a.week === week),
  };
}

export function maakPublicatie(
  week: string, maandag: Dag, inhoud: ReturnType<typeof weekInhoud>, vorige: Publicatie | undefined, door: string, nu = new Date(),
): Publicatie {
  const oud = new Map((vorige?.inzet ?? []).map((i) => [i.id, kern(i)]));
  return {
    id: week, week, maandag, gepubliceerdOp: nu.toISOString(), door, ...inhoud,
    gewijzigd: vorige ? inhoud.inzet.filter((i) => oud.get(i.id) !== kern(i)).map((i) => i.id) : [],
    versie: (vorige?.versie ?? 0) + 1,
  };
}

/** Aantal verschillen tussen het concept en de laatste publicatie (inzet en teams). */
export function wijzigingenSinds(p: Publicatie | undefined, inhoud: ReturnType<typeof weekInhoud>): number {
  if (!p) return inhoud.inzet.length;
  const a = new Map(p.inzet.map((i) => [i.id, kern(i)]));
  const b = new Map(inhoud.inzet.map((i) => [i.id, kern(i)]));
  let n = 0;
  for (const [id, k] of b) if (a.get(id) !== k) n++;
  for (const id of a.keys()) if (!b.has(id)) n++;
  const ta = new Map(p.teams.map((t) => [t.nummer, kernTeam(t)]));
  for (const t of inhoud.teams) if (ta.get(t.nummer) !== kernTeam(t)) n++;
  return n;
}

/** Wat één monteur in een gepubliceerde week ziet. */
export function weekVanMonteur(p: Publicatie | undefined, personeelsnummer: string) {
  if (!p) return null;
  const afwezig = p.afwezig.find((a) => a.personeelsnummer === personeelsnummer);
  const team = p.teams.find((t) => t.leden.includes(personeelsnummer));
  const inzet = team ? p.inzet.filter((i) => i.team === team.nummer) : [];
  return { team, afwezig, inzet };
}
