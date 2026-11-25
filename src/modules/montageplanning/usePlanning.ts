// Laadt en bewaart de planning via de AppStore (testfase: in de browser).
import { useCallback, useEffect, useState } from "react";
import { store } from "../../core/store";
import { STANDAARD_FASEN, type Afwezigheid, type Inzet, type TeamWeek } from "./model";
import type { Publicatie } from "./publicatie";

const C = { inzet: "mp-inzet", teams: "mp-teams", afwezig: "mp-afwezig", instellingen: "mp-instellingen", publicaties: "mp-publicaties" } as const;

interface Instellingen { id: "algemeen"; fasen: string[]; demoGevuld?: boolean }

export interface Planning {
  geladen: boolean;
  inzet: Inzet[];
  teams: TeamWeek[];
  afwezig: Afwezigheid[];
  publicaties: Publicatie[];
  fasen: string[];
  demoGevuld: boolean;
  bewaarInzet(i: Inzet | Inzet[]): Promise<void>;
  verwijderInzet(id: string | string[]): Promise<void>;
  bewaarTeams(t: TeamWeek[]): Promise<void>;
  bewaarAfwezig(a: Afwezigheid): Promise<void>;
  verwijderAfwezig(id: string): Promise<void>;
  bewaarFasen(f: string[]): Promise<void>;
  publiceer(p: Publicatie | Publicatie[]): Promise<void>;
  markeerDemo(): Promise<void>;
  wisAlles(): Promise<void>;
}

export function usePlanning(): Planning {
  const [geladen, setGeladen] = useState(false);
  const [inzet, setInzet] = useState<Inzet[]>([]);
  const [teams, setTeams] = useState<TeamWeek[]>([]);
  const [afwezig, setAfwezig] = useState<Afwezigheid[]>([]);
  const [publicaties, setPublicaties] = useState<Publicatie[]>([]);
  const [inst, setInst] = useState<Instellingen>({ id: "algemeen", fasen: STANDAARD_FASEN });

  const laad = useCallback(async () => {
    const [i, t, a, s, p] = await Promise.all([
      store.get<Inzet>(C.inzet), store.get<TeamWeek>(C.teams), store.get<Afwezigheid>(C.afwezig), store.get<Instellingen>(C.instellingen),
      store.get<Publicatie>(C.publicaties),
    ]);
    setPublicaties(p);
    setInzet(i);
    setTeams(t);
    setAfwezig(a);
    if (s[0]) setInst({ ...s[0], fasen: s[0].fasen?.length ? s[0].fasen : STANDAARD_FASEN });
    setGeladen(true);
  }, []);
  useEffect(() => {
    laad();
  }, [laad]);

  const lijst = <T,>(x: T | T[]) => (Array.isArray(x) ? x : [x]);

  return {
    geladen, inzet, teams, afwezig, publicaties, fasen: inst.fasen, demoGevuld: !!inst.demoGevuld,
    async bewaarInzet(x) {
      const nieuw = lijst(x);
      for (const i of nieuw) await store.put(C.inzet, i);
      const ids = new Set(nieuw.map((i) => i.id));
      setInzet((cur) => [...cur.filter((i) => !ids.has(i.id)), ...nieuw]);
    },
    async verwijderInzet(x) {
      const ids = new Set(lijst(x));
      for (const id of ids) await store.remove(C.inzet, id);
      setInzet((cur) => cur.filter((i) => !ids.has(i.id)));
    },
    async bewaarTeams(t) {
      for (const x of t) await store.put(C.teams, x);
      const ids = new Set(t.map((x) => x.id));
      setTeams((cur) => [...cur.filter((x) => !ids.has(x.id)), ...t]);
    },
    async bewaarAfwezig(a) {
      await store.put(C.afwezig, a);
      setAfwezig((cur) => [...cur.filter((x) => x.id !== a.id), a]);
    },
    async verwijderAfwezig(id) {
      await store.remove(C.afwezig, id);
      setAfwezig((cur) => cur.filter((x) => x.id !== id));
    },
    async bewaarFasen(fasen) {
      const n = { ...inst, fasen };
      await store.put(C.instellingen, n);
      setInst(n);
    },
    async publiceer(x) {
      const nieuw = lijst(x);
      for (const p of nieuw) await store.put(C.publicaties, p);
      const ids = new Set(nieuw.map((p) => p.id));
      setPublicaties((cur) => [...cur.filter((p) => !ids.has(p.id)), ...nieuw]);
    },
    async markeerDemo() {
      const n = { ...inst, demoGevuld: true };
      await store.put(C.instellingen, n);
      setInst(n);
    },
    async wisAlles() {
      for (const c of Object.values(C)) {
        const items = await store.get<{ id: string }>(c);
        for (const x of items) await store.remove(c, x.id);
      }
      setInzet([]);
      setTeams([]);
      setAfwezig([]);
      setPublicaties([]);
      setInst({ id: "algemeen", fasen: STANDAARD_FASEN });
    },
  };
}
