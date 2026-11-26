// Laadt en bewaart verlofaanvragen en de managerkoppelingen via de AppStore (testfase: in de browser).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { store } from "../../core/store";
import { isTestMode } from "../../core/config";
import { useSession } from "../../app/session";
import { dagVan, maandagVan, plusDagen, type Dag } from "../montageplanning/model";
import {
  VERLOFDAG_UREN, berekenUren, managerVan, nieuwId,
  type Dagdeel, type ManagerKoppeling, type Verlofaanvraag, type VerlofSoort,
} from "./verlof";

const C = { aanvragen: "verlof-aanvragen", koppelingen: "beheer-managers", exports: "verlof-exports", instellingen: "verlof-instellingen" } as const;

export interface VerlofExport {
  id: string;
  op: string;
  door: string;
  regels: number;
  aanvragen: string[];
}
interface Instellingen { id: "algemeen"; demoGevuld?: boolean }

export function useVerlof() {
  const { data } = useSession();
  const [geladen, setGeladen] = useState(false);
  const [aanvragen, setAanvragen] = useState<Verlofaanvraag[]>([]);
  const [koppelingen, setKoppelingen] = useState<ManagerKoppeling[]>([]);
  const [exports, setExports] = useState<VerlofExport[]>([]);
  const [inst, setInst] = useState<Instellingen>({ id: "algemeen" });

  const laad = useCallback(async () => {
    const [a, k, e, s] = await Promise.all([
      store.get<Verlofaanvraag>(C.aanvragen), store.get<ManagerKoppeling>(C.koppelingen), store.get<VerlofExport>(C.exports), store.get<Instellingen>(C.instellingen),
    ]);
    setAanvragen(a);
    setKoppelingen(k);
    setExports(e);
    if (s[0]) setInst(s[0]);
    setGeladen(true);
  }, []);
  useEffect(() => {
    laad();
  }, [laad]);

  const mensen = useMemo(() => new Map((data?.rows.medewerkers ?? []).map((m) => [m.personeelsnummer, m])), [data]);
  const koppelMap = useMemo(() => new Map(koppelingen.map((k) => [k.id, k])), [koppelingen]);

  const bewaar = async (lijst: Verlofaanvraag[]) => {
    for (const a of lijst) await store.put(C.aanvragen, a);
    const ids = new Set(lijst.map((a) => a.id));
    setAanvragen((cur) => [...cur.filter((a) => !ids.has(a.id)), ...lijst]);
  };

  // Testomgeving: bij het eerste bezoek een paar aanvragen, zodat elke rol direct iets ziet.
  const bezig = useRef(false);
  useEffect(() => {
    if (!isTestMode || !geladen || !data || inst.demoGevuld || bezig.current || !data.rows.medewerkers.length) return;
    bezig.current = true;
    (async () => {
      const demo = demoAanvragen(data.rows.medewerkers.map((m) => m.personeelsnummer), (p) => managerVan(p, mensen, koppelMap), data.rows.medewerkers);
      await bewaar(demo);
      const n = { ...inst, demoGevuld: true };
      await store.put(C.instellingen, n);
      setInst(n);
    })();
  }, [geladen, data, inst.demoGevuld]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    geladen: geladen && (!isTestMode || inst.demoGevuld || !data?.rows.medewerkers.length),
    aanvragen, koppelingen: koppelMap, exports, mensen,
    managerVan: (pnr: string) => managerVan(pnr, mensen, koppelMap),
    bewaar: (a: Verlofaanvraag | Verlofaanvraag[]) => bewaar(Array.isArray(a) ? a : [a]),
    async koppel(lijst: ManagerKoppeling[]) {
      for (const k of lijst) await store.put(C.koppelingen, k);
      const ids = new Set(lijst.map((k) => k.id));
      setKoppelingen((cur) => [...cur.filter((k) => !ids.has(k.id)), ...lijst]);
    },
    async ontkoppel(ids: string[]) {
      for (const id of ids) await store.remove(C.koppelingen, id);
      const set = new Set(ids);
      setKoppelingen((cur) => cur.filter((k) => !set.has(k.id)));
    },
    async registreerExport(e: VerlofExport, verwerkt: Verlofaanvraag[]) {
      await store.put(C.exports, e);
      setExports((cur) => [...cur, e]);
      await bewaar(verwerkt.map((a) => ({ ...a, geexporteerdOp: e.op })));
    },
  };
}
export type VerlofData = ReturnType<typeof useVerlof>;

// ---- Demo-aanvragen ----------------------------------------------------------------
function demoAanvragen(pnrs: string[], manager: (p: string) => string | undefined, mw: { personeelsnummer: string; afdeling: string; functie: string }[]): Verlofaanvraag[] {
  const nu = new Date();
  const ma = maandagVan(dagVan(nu));
  const vandaag = dagVan(nu);
  const monteurs = mw.filter((m) => m.afdeling === "Montage").map((m) => m.personeelsnummer);
  const productie = mw.filter((m) => m.afdeling === "Productie" || m.afdeling === "Logistiek").map((m) => m.personeelsnummer);
  const kantoor = mw.filter((m) => m.afdeling === "Kantoor" || m.afdeling === "Planning").map((m) => m.personeelsnummer);
  const geldig = new Set(pnrs);
  const uur = (h: number) => new Date(nu.getTime() - h * 3600e3).toISOString();

  const maak = (pnr: string | undefined, soort: VerlofSoort, van: Dag, tot: Dag, status: Verlofaanvraag["status"], x: Partial<Verlofaanvraag> & { deel?: Dagdeel } = {}): Verlofaanvraag | null => {
    if (!pnr || !geldig.has(pnr)) return null;
    const deel = x.deel ?? "hele";
    const b = berekenUren(van, tot, deel, VERLOFDAG_UREN, x.uren);
    if (b.fout) return null;
    const mgr = manager(pnr);
    return {
      id: nieuwId(new Date(nu.getTime() - Math.random() * 1e9)), personeelsnummer: pnr, soort, van, tot, deel, dagen: b.dagen, totaal: b.totaal, status,
      aangevraagdOp: uur(30), manager: mgr,
      ...(status === "goedgekeurd" || status === "afgewezen" ? { beoordeeldDoor: mgr, beoordeeldOp: uur(20) } : {}),
      ...x,
    };
  };

  const lijst = [
    // Monteurs: goedgekeurd verlof deze en volgende week (zichtbaar op het planbord).
    maak(monteurs[1], "vakantie", plusDagen(ma, 2), plusDagen(ma, 3), "goedgekeurd", { toelichting: "Bruiloft zus" }),
    maak(monteurs[5], "adv", plusDagen(ma, 11), plusDagen(ma, 11), "goedgekeurd"),
    // Monteurs: aanvragen die nog op akkoord wachten, één met advies van de planner.
    maak(monteurs[3], "vakantie", plusDagen(ma, 7), plusDagen(ma, 9), "aangevraagd", {
      toelichting: "Weekendje weg met het gezin", aangevraagdOp: uur(5),
      advies: { door: "Montageplanning", op: uur(2), akkoord: false, tekst: "Team 2 staat dan in Kleve. Liever een week later." },
    }),
    maak(monteurs[8], "vakantie", plusDagen(ma, 14), plusDagen(ma, 18), "aangevraagd", { aangevraagdOp: uur(26) }),
    maak(monteurs[10], "bijzonder", plusDagen(ma, 8), plusDagen(ma, 8), "aangevraagd", { reden: "Verhuizing", aangevraagdOp: uur(3) }),
    maak(monteurs[0], "vakantie", plusDagen(ma, -21), plusDagen(ma, -17), "goedgekeurd", { geexporteerdOp: uur(200) }),
    maak(monteurs[2], "vakantie", plusDagen(ma, 7), plusDagen(ma, 11), "afgewezen", { reactie: "Drukke week, kunnen we het in januari plannen?" }),
    // Productie, logistiek en kantoor.
    maak(productie[0], "vakantie", plusDagen(ma, 21), plusDagen(ma, 25), "aangevraagd", { aangevraagdOp: uur(48) }),
    maak(productie[2], "adv", plusDagen(ma, 4), plusDagen(ma, 4), "goedgekeurd"),
    maak(productie[4], "zorg", vandaag, vandaag, "aangevraagd", { reden: "Kortdurend zorgverlof", deel: "uren", uren: 4, toelichting: "Dochter ziek opgehaald van school" }),
    maak(kantoor[0], "vakantie", plusDagen(ma, 28), plusDagen(ma, 32), "aangevraagd"),
    maak(kantoor[3], "vakantie", plusDagen(ma, 9), plusDagen(ma, 9), "goedgekeurd", { deel: "middag" }),
  ];
  return lijst.filter((a): a is Verlofaanvraag => !!a);
}
