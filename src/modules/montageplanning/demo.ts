// Alleen testomgeving: vult bij het eerste bezoek vorige, deze en volgende week met een planning,
// en publiceert vorige en deze week, zodat zowel planner als monteur direct iets zien.
import { useEffect, useRef } from "react";
import { useSession } from "../../app/session";
import { isTestMode } from "../../core/config";
import { dagVan, maakVoorstel, maandagVan, plusDagen, teamsUitExport, weekSleutel, type Inzet, type TeamWeek } from "./model";
import { maakPublicatie, weekInhoud, type Publicatie } from "./publicatie";
import type { Planning } from "./usePlanning";

export function useDemoPlanning(planning: Planning) {
  const { data } = useSession();
  const rows = data?.rows;
  const bezig = useRef(false);
  useEffect(() => {
    if (!isTestMode || !planning.geladen || !rows || planning.demoGevuld || bezig.current || !rows.montageprojecten.length) return;
    bezig.current = true;
    (async () => {
      const monteurs = rows.medewerkers.filter((m) => m.afdeling === "Montage");
      let teams: TeamWeek[] = [];
      let inzet: Inzet[] = [];
      const nu = maandagVan(dagVan(new Date()));
      const weken = [plusDagen(nu, -7), nu, plusDagen(nu, 7)];
      for (const m of weken) {
        const w = weekSleutel(m);
        const t = teamsUitExport(w, monteurs);
        teams = [...teams, ...t];
        const v = maakVoorstel({ projecten: rows.montageprojecten, inzet, teams: t, afwezig: [], maandag: m, fasen: planning.fasen });
        v.forEach((i, k) => {
          i.voorstel = false;
          i.equipment = i.equipment.map((e, j) => ({ ...e, bevestigd: m < nu || (k + j) % 3 !== 1 }));
          if (k % 4 === 1) i.notitie = "Klant is aanwezig vanaf 7:00. Melden bij de portier.";
        });
        inzet = [...inzet, ...v];
      }
      await planning.bewaarTeams(teams);
      await planning.bewaarInzet(inzet);
      const pubs: Publicatie[] = weken.slice(0, 2).map((m) => {
        const w = weekSleutel(m);
        return maakPublicatie(w, m, weekInhoud(m, inzet, teams, [], w), undefined, "Demo");
      });
      await planning.publiceer(pubs);
      await planning.markeerDemo();
    })();
  }, [planning.geladen, rows, planning.demoGevuld]); // eslint-disable-line react-hooks/exhaustive-deps
  return bezig;
}
