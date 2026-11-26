// Samenhang met de montageplanning: staat een monteur ingepland op dagen waarop hij verlof vraagt?
import { weekSleutel, type Dag, type Inzet, type TeamWeek } from "../montageplanning/model";

export interface Botsing {
  datum: Dag;
  projectnummer: string;
  team: number;
}

/** Projecten (geen voorstellen) waar de medewerker via zijn team op deze dagen voor ingepland staat. */
export function geplandOp(pnr: string, dagen: Dag[], inzet: Inzet[], teams: TeamWeek[]): Botsing[] {
  const out: Botsing[] = [];
  for (const d of dagen) {
    const team = teams.find((t) => t.week === weekSleutel(d) && t.leden.includes(pnr));
    if (!team) continue;
    for (const i of inzet) {
      if (i.voorstel || i.team !== team.nummer) continue;
      if (i.dagen.some((x) => x.datum === d)) out.push({ datum: d, projectnummer: i.projectnummer, team: team.nummer });
    }
  }
  return out;
}
