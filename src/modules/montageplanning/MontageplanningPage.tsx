// Module Montageplanning: planbord met teams als rijen en maandag t/m zondag als kolommen.
// Projecten sleep je vanuit "Nog te plannen" op een team en een dag; de duur volgt uit de VC-uren.
import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Alert, Button, Icon, StatTile, StatusBadge } from "../../brand";
import { useSession } from "../../app/session";
import { isTestMode } from "../../core/config";
import type { Medewerker, Montageproject } from "../../core/data/exports";
import { num, uren } from "../../app/format";
import {
  AANREIS, EQUIPMENT_SOORTEN, EXTRA_FASEN, STANDAARD_FASEN, UREN_PER_DAG, bouwDagen, dagVan, dagenVanaf, dekking, isoWeek, isWeekend,
  maakVoorstel, maandagVan, naarDate, nieuweInzet, plusDagen, standaardEquipment, teamsUitExport, verschuif, weekDagen, weekSleutel,
  werkdagenIn, werkdagenNodig, type Afwezigheid, type Dag, type Equipment, type Inzet, type TeamWeek,
} from "./model";
import { usePlanning, type Planning } from "./usePlanning";
import "./montageplanning.css";

type Ctx = {
  planning: Planning;
  projecten: Map<string, Montageproject>;
  mensen: Map<string, Medewerker>;
};

const vandaag = () => dagVan(new Date());
const dagLabel = (d: Dag) => naarDate(d).toLocaleDateString("nl-NL", { weekday: "long" });
const datumKort = (d: Dag) => naarDate(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
const datumLang = (d: Dag) => naarDate(d).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
const dagenTekst = (n: number) => `${n} ${n === 1 ? "werkdag" : "werkdagen"}`;
const naam = (m?: Medewerker) => (m ? `${m.voornaam} ${m.achternaam}` : "Onbekend");
const LAND: Record<string, string> = { NL: "Nederland", DE: "Duitsland", BE: "België", PL: "Polen", FR: "Frankrijk", DK: "Denemarken" };

/** Teams voor een week; nieuw = kopie van de laatst bekende week, anders uit de medewerkersexport. */
function teamsVoorWeek(week: string, alle: TeamWeek[], medewerkers: Medewerker[]): { teams: TeamWeek[]; nieuw: boolean } {
  const eigen = alle.filter((t) => t.week === week);
  if (eigen.length) return { teams: eigen.sort((a, b) => a.nummer - b.nummer), nieuw: false };
  const eerder = [...new Set(alle.map((t) => t.week))].filter((w) => w < week).sort().pop();
  const bron = eerder ? alle.filter((t) => t.week === eerder) : teamsUitExport(week, medewerkers);
  return { teams: bron.map((t) => ({ ...t, week, id: `${week}|${t.nummer}` })).sort((a, b) => a.nummer - b.nummer), nieuw: true };
}

// ---- Drag & drop -------------------------------------------------------------
const DT = { project: "application/x-mp-project", inzet: "application/x-mp-inzet", monteur: "application/x-mp-monteur" };
const heeft = (e: DragEvent, t: string) => e.dataTransfer.types.includes(t);

export function MontageplanningPage() {
  const { data } = useSession();
  const planning = usePlanning();
  const [maandag, setMaandag] = useState(() => maandagVan(vandaag()));
  const [open, setOpen] = useState<string | null>(null);
  const [kies, setKies] = useState<string | null>(null); // projectnummer dat met een klik geplaatst wordt
  const [fasenOpen, setFasenOpen] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  const rows = data?.rows;
  const projecten = useMemo(() => new Map((rows?.montageprojecten ?? []).map((p) => [p.projectnummer, p])), [rows]);
  const mensen = useMemo(() => new Map((rows?.medewerkers ?? []).map((m) => [m.personeelsnummer, m])), [rows]);
  const monteurs = useMemo(() => (rows?.medewerkers ?? []).filter((m) => m.afdeling === "Montage"), [rows]);
  const week = weekSleutel(maandag);
  const dagen = weekDagen(maandag);
  const ctx: Ctx = { planning, projecten, mensen };

  const { teams, nieuw } = teamsVoorWeek(week, planning.teams, monteurs);
  useEffect(() => {
    if (planning.geladen && rows && nieuw && teams.length) planning.bewaarTeams(teams);
  }, [planning.geladen, rows, week, nieuw]); // eslint-disable-line react-hooks/exhaustive-deps

  // Eerste bezoek in de testomgeving: vorige, deze en volgende week alvast gevuld, zodat het bord er echt uitziet.
  const seeding = useRef(false);
  useEffect(() => {
    if (!planning.geladen || !rows || planning.demoGevuld || seeding.current || !rows.montageprojecten.length) return;
    seeding.current = true;
    (async () => {
      let alleTeams = [...planning.teams];
      let inzet = [...planning.inzet];
      const nu = maandagVan(vandaag());
      for (const m of [plusDagen(nu, -7), nu, plusDagen(nu, 7)]) {
        const t = teamsVoorWeek(weekSleutel(m), alleTeams, monteurs).teams;
        alleTeams = [...alleTeams.filter((x) => x.week !== weekSleutel(m)), ...t];
        const v = maakVoorstel({ projecten: rows.montageprojecten, inzet, teams: t, afwezig: [], maandag: m, fasen: planning.fasen });
        v.forEach((i, k) => {
          i.voorstel = false;
          i.equipment = i.equipment.map((e, j) => ({ ...e, bevestigd: m < nu || (k + j) % 3 !== 1 }));
        });
        inzet = [...inzet, ...v];
      }
      await planning.bewaarTeams(alleTeams);
      await planning.bewaarInzet(inzet);
      await planning.markeerDemo();
    })();
  }, [planning.geladen, rows, planning.demoGevuld]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && (setKies(null), setOpen(null), setFasenOpen(false));
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  if (!rows || !planning.geladen) return <p className="fx-muted">Planning laden…</p>;
  if (!rows.montageprojecten.length) {
    return <Alert tone="warning" title="Geen montageprojecten">De export Montageprojecten is leeg of ontbreekt. Kijk op de pagina Gegevens.</Alert>;
  }

  const afwezig = planning.afwezig.filter((a) => a.week === week);
  const afwezigSet = new Set(afwezig.map((a) => a.personeelsnummer));
  const ingedeeld = new Set(teams.flatMap((t) => t.leden));
  const reserve = monteurs.filter((m) => !ingedeeld.has(m.personeelsnummer) && !afwezigSet.has(m.personeelsnummer));
  const gepland = new Set(planning.inzet.map((i) => i.projectnummer));
  const teplannen = rows.montageprojecten.filter((p) => !gepland.has(p.projectnummer)).sort((a, b) => +a.gewensteStart - +b.gewensteStart);
  const dezeWeek = planning.inzet.filter((i) => i.dagen.some((d) => d.datum >= dagen[0] && d.datum <= dagen[6]));
  const voorstellen = planning.inzet.filter((i) => i.voorstel);

  // --- acties ---
  const teamGrootte = (nr: number, w = week) => {
    const t = teamsVoorWeek(w, planning.teams, monteurs).teams.find((x) => x.nummer === nr);
    return Math.max(1, t?.leden.length ?? 1);
  };
  const plaatsProject = async (pnr: string, team: number, start: Dag) => {
    const p = projecten.get(pnr);
    if (!p) return;
    const i = nieuweInzet(p, team, start, teamGrootte(team, weekSleutel(start)), planning.fasen);
    await planning.bewaarInzet(i);
    setKies(null);
    setOpen(i.id);
  };
  const verplaatsInzet = async (id: string, team: number, start: Dag) => {
    const i = planning.inzet.find((x) => x.id === id);
    if (!i) return;
    const dagenNieuw = verschuif(i.dagen, start, i.weekend);
    const shift = (d?: Dag) => (d ? dagenNieuw[Math.max(0, i.dagen.findIndex((x) => x.datum === d))]?.datum : d);
    await planning.bewaarInzet({ ...i, team, dagen: dagenNieuw, equipment: i.equipment.map((e) => ({ ...e, dag: shift(e.dag) })), gewijzigd: new Date().toISOString() });
  };
  /** Na een teamwijziging: duur opnieuw berekenen voor inzet die deze week start (tenzij fasen met de hand zijn aangepast). */
  const herberekenTeam = async (nr: number, nieuwAantal: number) => {
    const betrokken = planning.inzet.filter((i) => i.team === nr && i.dagen[0] && weekSleutel(i.dagen[0].datum) === week && i.monteurs !== nieuwAantal);
    const bij: Inzet[] = [];
    for (const i of betrokken) {
      const p = projecten.get(i.projectnummer);
      if (!p || i.fasenAangepast) continue;
      bij.push({ ...i, monteurs: nieuwAantal, dagen: bouwDagen(p, i.dagen[0].datum, nieuwAantal, i, planning.fasen), gewijzigd: new Date().toISOString() });
    }
    if (bij.length) {
      await planning.bewaarInzet(bij);
      setMelding(`${bij.length === 1 ? "Eén project" : `${bij.length} projecten`} van team ${nr} opnieuw berekend met ${nieuwAantal} monteurs.`);
    }
  };
  const verplaatsMonteur = async (pnr: string, naarTeam: number | "reserve" | "afwezig") => {
    const van = teams.find((t) => t.leden.includes(pnr));
    if (van?.nummer === naarTeam) return;
    const gewijzigd: TeamWeek[] = [];
    if (van) gewijzigd.push({ ...van, leden: van.leden.filter((l) => l !== pnr), bouwleider: van.bouwleider === pnr ? undefined : van.bouwleider });
    if (typeof naarTeam === "number") {
      const naar = teams.find((t) => t.nummer === naarTeam)!;
      gewijzigd.push({ ...naar, leden: [...naar.leden, pnr], bouwleider: naar.bouwleider ?? pnr });
    }
    await planning.bewaarTeams(gewijzigd);
    if (naarTeam === "afwezig") await planning.bewaarAfwezig({ id: `${week}|${pnr}`, week, personeelsnummer: pnr, reden: "Verlof" });
    else if (afwezigSet.has(pnr)) await planning.verwijderAfwezig(`${week}|${pnr}`);
    for (const t of gewijzigd) await herberekenTeam(t.nummer, Math.max(1, t.leden.length));
  };
  const maakVoorstelNu = async () => {
    const v = maakVoorstel({ projecten: rows.montageprojecten, inzet: planning.inzet, teams, afwezig, maandag, fasen: planning.fasen });
    if (!v.length) {
      setMelding("Geen voorstel mogelijk: er zijn geen ongeplande projecten met een gewenste start t/m deze week, of alle teams zijn bezet.");
      return;
    }
    await planning.bewaarInzet(v);
    setMelding(`Voorstel: ${v.length} ${v.length === 1 ? "project" : "projecten"} ingedeeld. Controleer, schuif waar nodig en accepteer.`);
  };

  // --- cijfers ---
  const vrijeTeamdagen = teams.reduce((n, t) => {
    if (!t.leden.length) return n;
    const bezet = new Set(planning.inzet.filter((i) => i.team === t.nummer).flatMap((i) => i.dagen.map((d) => d.datum)));
    return n + dagen.filter((d) => !isWeekend(d) && !bezet.has(d)).length;
  }, 0);
  const onbevestigd = dezeWeek.flatMap((i) => i.equipment).filter((e) => !e.bevestigd).length;
  const teLaat = teplannen.filter((p) => dagVan(p.gewensteStart) < vandaag()).length;
  const { week: kw, jaar } = isoWeek(maandag);

  return (
    <div className="mp">
      <div className="fx-stats mp-stats">
        <StatTile label="Nog te plannen" value={teplannen.length} unit="projecten" foot={`${num(teplannen.reduce((a, p) => a + p.vcUrenWerk, 0))} VC-uren werk${teLaat ? ` · ${teLaat} te laat` : ""}`} />
        <StatTile label={`Gepland in week ${kw}`} value={dezeWeek.length} unit="projecten" foot={`${teams.filter((t) => t.leden.length).length} teams actief`} />
        <StatTile label="Open capaciteit" value={vrijeTeamdagen} unit="teamdagen" foot="Werkdagen zonder project, ma t/m vr" />
        <StatTile label="Equipment onbevestigd" value={onbevestigd} unit="stuks" foot="Op het bord deze week" />
      </div>

      <div className="mp-toolbar">
        <div className="mp-weeknav" role="group" aria-label="Week kiezen">
          <span className="mp-prev"><Button variant="secondary" size="sm" icon="chevron-right" label="Vorige week" onClick={() => setMaandag(plusDagen(maandag, -7))} /></span>
          <div className="mp-weektitel">
            <span className="h2">Week {kw}</span>
            <span className="fx-muted body-sm">{datumKort(dagen[0])} t/m {datumKort(dagen[6])} {jaar}</span>
          </div>
          <Button variant="secondary" size="sm" icon="chevron-right" label="Volgende week" onClick={() => setMaandag(plusDagen(maandag, 7))} />
          {maandag !== maandagVan(vandaag()) && <Button variant="quiet" size="sm" onClick={() => setMaandag(maandagVan(vandaag()))}>Naar deze week</Button>}
        </div>
        <div className="mp-acties">
          {voorstellen.length > 0 ? (
            <>
              <Button variant="primary" size="sm" icon="check" onClick={() => planning.bewaarInzet(voorstellen.map((i) => ({ ...i, voorstel: false })))}>
                Voorstel accepteren ({voorstellen.length})
              </Button>
              <Button variant="quiet" size="sm" onClick={() => planning.verwijderInzet(voorstellen.map((i) => i.id))}>Verwerpen</Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" icon="send" onClick={maakVoorstelNu}>Voorstel maken</Button>
          )}
          <Button variant="quiet" size="sm" icon="menu" onClick={() => setFasenOpen(true)}>Montagefasen</Button>
          {isTestMode && (
            <Button variant="quiet" size="sm" onClick={async () => { seeding.current = false; await planning.wisAlles(); setOpen(null); }}>
              Demo opnieuw
            </Button>
          )}
        </div>
      </div>

      {melding && (
        <div className="mp-melding" role="status">
          <Icon name="info" />
          <span>{melding}</span>
          <button type="button" className="mp-x" aria-label="Sluiten" onClick={() => setMelding(null)}>×</button>
        </div>
      )}
      {kies && (
        <div className="mp-melding is-kies" role="status">
          <Icon name="plus" />
          <span>Klik op een team en dag om <b>{kies}</b> te plaatsen. Esc om te annuleren.</span>
          <button type="button" className="mp-x" aria-label="Annuleren" onClick={() => setKies(null)}>×</button>
        </div>
      )}

      <div className="mp-layout">
        <Bord
          ctx={ctx} dagen={dagen} teams={teams} afwezig={afwezig} reserve={reserve} kies={kies}
          onPlaats={plaatsProject} onVerplaats={verplaatsInzet} onMonteur={verplaatsMonteur} onOpen={setOpen}
          onTeams={(t) => planning.bewaarTeams(t)}
          onAfwezig={(a) => planning.bewaarAfwezig(a)}
          onNieuwTeam={() => planning.bewaarTeams([{ id: `${week}|${Math.max(0, ...teams.map((t) => t.nummer)) + 1}`, week, nummer: Math.max(0, ...teams.map((t) => t.nummer)) + 1, leden: [], voertuig: "" }])}
        />
        <TePlannen projecten={teplannen} maandag={maandag} kies={kies} onKies={setKies} />
      </div>

      <Legenda />

      {open && <InzetPaneel ctx={ctx} id={open} teams={teams} onClose={() => setOpen(null)} />}
      {fasenOpen && <FasenPaneel planning={planning} onClose={() => setFasenOpen(false)} />}
    </div>
  );
}

// ---- Planbord ------------------------------------------------------------------
interface Segment { inzet: Inzet; van: number; tot: number; lane: number }

function segmenten(inzet: Inzet[], dagen: Dag[]): Segment[] {
  const segs: Omit<Segment, "lane">[] = [];
  for (const i of inzet) {
    const cols = i.dagen.map((d) => dagen.indexOf(d.datum)).filter((c) => c >= 0).sort((a, b) => a - b);
    let start = -1;
    cols.forEach((c, k) => {
      if (start < 0) start = c;
      if (cols[k + 1] !== c + 1) {
        segs.push({ inzet: i, van: start, tot: c });
        start = -1;
      }
    });
  }
  segs.sort((a, b) => a.van - b.van || b.tot - a.tot);
  const lanes: number[] = [];
  return segs.map((s) => {
    let lane = lanes.findIndex((eind) => eind < s.van);
    if (lane < 0) lane = lanes.length;
    lanes[lane] = s.tot;
    return { ...s, lane };
  });
}

interface BordProps {
  ctx: Ctx; dagen: Dag[]; teams: TeamWeek[]; afwezig: Afwezigheid[]; reserve: Medewerker[]; kies: string | null;
  onPlaats(pnr: string, team: number, start: Dag): void;
  onVerplaats(id: string, team: number, start: Dag): void;
  onMonteur(pnr: string, naar: number | "reserve" | "afwezig"): void;
  onOpen(id: string): void;
  onTeams(t: TeamWeek[]): void;
  onAfwezig(a: Afwezigheid): void;
  onNieuwTeam(): void;
}

function Bord({ ctx, dagen, teams, afwezig, reserve, kies, onPlaats, onVerplaats, onMonteur, onOpen, onTeams, onAfwezig, onNieuwTeam }: BordProps) {
  const [over, setOver] = useState<string | null>(null);
  const [slepen, setSlepen] = useState(false);
  const grab = useRef(0);
  const vd = vandaag();
  // Tijdens slepen laten de balken de muis door, zodat je ook op een dag met een project kunt neerzetten.
  useEffect(() => {
    const aan = () => setTimeout(() => setSlepen(true), 0);
    const uit = () => {
      setSlepen(false);
      setOver(null);
    };
    window.addEventListener("dragstart", aan);
    window.addEventListener("dragend", uit);
    window.addEventListener("drop", uit);
    return () => {
      window.removeEventListener("dragstart", aan);
      window.removeEventListener("dragend", uit);
      window.removeEventListener("drop", uit);
    };
  }, []);

  const dropDag = (team: number, dag: Dag) => ({
    onDragOver: (e: DragEvent) => {
      if (heeft(e, DT.project) || heeft(e, DT.inzet)) {
        e.preventDefault();
        setOver(`${team}|${dag}`);
      }
    },
    onDragLeave: () => setOver(null),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setOver(null);
      const p = e.dataTransfer.getData(DT.project);
      const i = e.dataTransfer.getData(DT.inzet);
      if (p) onPlaats(p, team, dag);
      else if (i) onVerplaats(i, team, plusDagen(dag, -grab.current));
    },
  });
  const dropMonteur = (naar: number | "reserve" | "afwezig") => ({
    onDragOver: (e: DragEvent) => {
      if (heeft(e, DT.monteur)) {
        e.preventDefault();
        setOver(`m|${naar}`);
      }
    },
    onDragLeave: () => setOver(null),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setOver(null);
      const pnr = e.dataTransfer.getData(DT.monteur);
      if (pnr) onMonteur(pnr, naar);
    },
  });
  const chip = (m: Medewerker | undefined, pnr: string, extra?: ReactNode, cls = "") => (
    <span
      key={pnr}
      className={`mp-chip ${cls}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DT.monteur, pnr);
        e.dataTransfer.effectAllowed = "move";
      }}
      title="Sleep naar een ander team, reserve of afwezig"
    >
      {naam(m)}
      {m?.taal && m.taal !== "NL" && <small>{m.taal}</small>}
      {extra}
    </span>
  );

  return (
    <div className="mp-bord-wrap">
      <div className={`mp-bord ${slepen ? "is-slepen" : ""}`} role="grid" aria-label="Weekplanning montage">
        <div className="mp-h mp-h-team" role="columnheader">Team</div>
        {dagen.map((d) => (
          <div key={d} role="columnheader" className={`mp-h ${d === vd ? "is-today" : ""} ${isWeekend(d) ? "is-weekend" : ""}`}>
            <b>{dagLabel(d)}</b>
            <span>{datumKort(d)}</span>
          </div>
        ))}

        {teams.map((t) => {
          const items = ctx.planning.inzet.filter((i) => i.team === t.nummer);
          const segs = segmenten(items, dagen);
          const lanes = Math.max(1, ...segs.map((s) => s.lane + 1));
          return (
            <div key={t.id} className="mp-rij" role="row">
              <div className={`mp-team ${over === `m|${t.nummer}` ? "is-over" : ""}`} {...dropMonteur(t.nummer)} role="rowheader">
                <div className="mp-team-kop">
                  <b>Team {t.nummer}</b>
                  <input
                    className="mp-voertuig"
                    aria-label={`Voertuig team ${t.nummer}`}
                    placeholder="Voertuig"
                    defaultValue={t.voertuig}
                    onBlur={(e) => e.target.value !== t.voertuig && onTeams([{ ...t, voertuig: e.target.value }])}
                  />
                </div>
                <div className="mp-leden">
                  {t.leden.map((pnr) =>
                    chip(
                      ctx.mensen.get(pnr), pnr,
                      <button
                        type="button"
                        className={`mp-bl ${t.bouwleider === pnr ? "is-on" : ""}`}
                        aria-label={t.bouwleider === pnr ? "Bouwleider" : "Maak bouwleider"}
                        title={t.bouwleider === pnr ? "Bouwleider" : "Maak bouwleider"}
                        onClick={() => onTeams([{ ...t, bouwleider: pnr }])}
                      >★</button>,
                      t.bouwleider === pnr ? "is-bl" : "",
                    ),
                  )}
                  {!t.leden.length && <span className="caption fx-muted">Sleep monteurs hierheen</span>}
                </div>
                <span className="caption fx-muted">{t.leden.length} man · {t.leden.length * UREN_PER_DAG} u/dag</span>
              </div>
              <div className="mp-dagen" style={{ gridTemplateRows: `repeat(${lanes}, minmax(var(--mp-lane), auto))` }}>
                {dagen.map((d, c) => (
                  <div
                    key={d}
                    className={`mp-cel ${isWeekend(d) ? "is-weekend" : ""} ${d === vd ? "is-today" : ""} ${over === `${t.nummer}|${d}` ? "is-over" : ""} ${kies ? "is-kies" : ""}`}
                    style={{ gridColumn: c + 1, gridRow: `1 / span ${lanes}` }}
                    {...dropDag(t.nummer, d)}
                    onClick={() => kies && onPlaats(kies, t.nummer, d)}
                    role="gridcell"
                    aria-label={`Team ${t.nummer}, ${datumLang(d)}`}
                  />
                ))}
                {segs.map((s) => (
                  <Balk key={`${s.inzet.id}-${s.van}`} ctx={ctx} seg={s} dagen={dagen} teamGrootte={t.leden.length} grab={grab} onOpen={onOpen} />
                ))}
              </div>
            </div>
          );
        })}

        <div className="mp-rij mp-rij-extra" role="row">
          <div className={`mp-team ${over === "m|reserve" ? "is-over" : ""}`} {...dropMonteur("reserve")} role="rowheader">
            <b>Reserve</b>
            <div className="mp-leden">{reserve.length ? reserve.map((m) => chip(m, m.personeelsnummer)) : <span className="caption fx-muted">Iedereen is ingedeeld</span>}</div>
          </div>
          <div className={`mp-team mp-afwezig ${over === "m|afwezig" ? "is-over" : ""}`} {...dropMonteur("afwezig")} role="rowheader">
            <b>Afwezig deze week</b>
            <div className="mp-leden">
              {afwezig.length ? afwezig.map((a) =>
                chip(ctx.mensen.get(a.personeelsnummer), a.personeelsnummer,
                  <button type="button" className="mp-reden" title="Wissel verlof of ziek" onClick={() => onAfwezig({ ...a, reden: a.reden === "Verlof" ? "Ziek" : "Verlof" })}>{a.reden}</button>,
                  a.reden === "Ziek" ? "is-ziek" : "is-verlof"),
              ) : <span className="caption fx-muted">Sleep een monteur hierheen voor verlof of ziek</span>}
            </div>
          </div>
          <div className="mp-nieuwteam">
            <Button variant="quiet" size="sm" icon="plus" onClick={onNieuwTeam}>Team toevoegen</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Balk({ ctx, seg, dagen, teamGrootte, grab, onOpen }: { ctx: Ctx; seg: Segment; dagen: Dag[]; teamGrootte: number; grab: React.MutableRefObject<number>; onOpen(id: string): void }) {
  const { inzet: i, van, tot, lane } = seg;
  const p = ctx.projecten.get(i.projectnummer);
  const zichtbaar = dagen.slice(van, tot + 1);
  const index0 = i.dagen.findIndex((d) => d.datum === zichtbaar[0]);
  const eersteSeg = index0 === 0;
  const dek = p ? dekking(i, p) : 1;
  const heleInzet = i.equipment.filter((e) => !e.dag);
  const open = i.equipment.filter((e) => !e.bevestigd).length;
  const signalen: { tone: "warning" | "danger"; tekst: string }[] = [];
  if (!p) signalen.push({ tone: "danger", tekst: "Project niet meer in export" });
  if (p && dek < 0.995) signalen.push({ tone: "danger", tekst: `Krap: ${Math.round(dek * 100)}% van VC` });
  if (eersteSeg && teamGrootte && teamGrootte !== i.monteurs) signalen.push({ tone: "warning", tekst: `Berekend met ${i.monteurs} man, team is nu ${teamGrootte}` });
  if (p && eersteSeg && dagVan(p.gewensteStart) > i.dagen[0].datum) signalen.push({ tone: "warning", tekst: `Start vóór materiaal (${datumKort(dagVan(p.gewensteStart))})` });

  return (
    <div
      className={`mp-balk ${i.voorstel ? "is-voorstel" : ""} ${!p ? "is-fout" : ""} ${eersteSeg ? "is-start" : ""} ${i.dagen[i.dagen.length - 1].datum === zichtbaar[zichtbaar.length - 1] ? "is-eind" : ""}`}
      style={{ gridColumn: `${van + 1} / ${tot + 2}`, gridRow: lane + 1 }}
      draggable
      onDragStart={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const kol = Math.min(zichtbaar.length - 1, Math.floor(((e.clientX - r.left) / r.width) * zichtbaar.length));
        grab.current = Math.max(0, index0 + kol);
        e.dataTransfer.setData(DT.inzet, i.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen(i.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(i.id))}
      tabIndex={0}
      role="button"
      aria-label={`${i.projectnummer} ${p?.plaats ?? ""}, openen`}
    >
      <div className="mp-balk-kop">
        <b>{p ? `${p.land} · ${p.plaats}` : i.projectnummer}</b>
        <span className="fx-code">{i.projectnummer}</span>
        {p?.fix && <span className="mp-tag">Vast</span>}
        {i.voorstel && <span className="mp-tag is-voorstel">Voorstel</span>}
      </div>
      <div className="mp-balk-sub">{p?.omschrijving}{p?.silo ? ` · ${p.silo}` : ""}{p?.lining ? " · incl. lining" : ""}</div>
      <div className="mp-balk-dagen" style={{ gridTemplateColumns: `repeat(${zichtbaar.length}, 1fr)` }}>
        {zichtbaar.map((d) => {
          const dag = i.dagen.find((x) => x.datum === d)!;
          const eq = i.equipment.filter((e) => e.dag === d);
          return (
            <div key={d} className="mp-balk-dag">
              <i>{dag.fase}</i>
              {eq.map((e) => <Eq key={e.id} e={e} />)}
            </div>
          );
        })}
      </div>
      {(heleInzet.length > 0 || signalen.length > 0) && (
        <div className="mp-balk-voet">
          {heleInzet.map((e) => <Eq key={e.id} e={e} />)}
          {signalen.map((s) => <span key={s.tekst} className={`mp-signaal is-${s.tone}`}><Icon name="alert" />{s.tekst}</span>)}
          {open > 0 && eersteSeg && <span className="mp-sr">{open} equipment nog niet bevestigd</span>}
        </div>
      )}
    </div>
  );
}

function Eq({ e }: { e: Equipment }) {
  return (
    <span className={`mp-eq ${e.bevestigd ? "is-ok" : "is-open"}`} title={e.bevestigd ? "Bevestigd" : "Nog niet bevestigd"}>
      <Icon name={e.bevestigd ? "check-circle" : "clock"} />
      {e.aantal > 1 ? `${e.aantal}× ` : ""}{e.soort}{e.tijd ? ` ${e.tijd}` : ""} ({e.bron.toLowerCase()})
      <span className="mp-sr">{e.bevestigd ? ", bevestigd" : ", nog niet bevestigd"}</span>
    </span>
  );
}

function Legenda() {
  return (
    <div className="mp-legenda caption fx-muted" aria-label="Legenda">
      <span><span className="mp-eq is-ok"><Icon name="check-circle" />Bevestigd</span></span>
      <span><span className="mp-eq is-open"><Icon name="clock" />Nog niet bevestigd</span></span>
      <span><span className="mp-tag">Vast</span> vast afgesproken met de klant</span>
      <span><span className="mp-tag is-voorstel">Voorstel</span> nog te accepteren</span>
      <span>★ bouwleider · sleep monteurs tussen teams, reserve en afwezig</span>
    </div>
  );
}

// ---- Nog te plannen --------------------------------------------------------------
function TePlannen({ projecten, maandag, kies, onKies }: { projecten: Montageproject[]; maandag: Dag; kies: string | null; onKies(p: string | null): void }) {
  const [zoek, setZoek] = useState("");
  const vd = vandaag();
  const volgende = plusDagen(maandag, 7);
  const lijst = projecten.filter((p) => !zoek || `${p.projectnummer} ${p.plaats} ${p.klant} ${p.omschrijving} ${p.land}`.toLowerCase().includes(zoek.toLowerCase()));
  const groepen: [string, Montageproject[]][] = [
    ["Te laat", lijst.filter((p) => dagVan(p.gewensteStart) < vd)],
    ["Deze week", lijst.filter((p) => dagVan(p.gewensteStart) >= vd && dagVan(p.gewensteStart) < volgende)],
    ["Volgende week", lijst.filter((p) => dagVan(p.gewensteStart) >= volgende && dagVan(p.gewensteStart) < plusDagen(volgende, 7))],
    ["Later", lijst.filter((p) => dagVan(p.gewensteStart) >= plusDagen(volgende, 7))],
  ];
  return (
    <aside className="mp-lijst" aria-label="Nog te plannen">
      <div className="mp-lijst-kop">
        <span className="h3">Nog te plannen</span>
        <span className="fx-muted body-sm">{projecten.length}</span>
      </div>
      <input className="fx-input mp-zoek" type="search" placeholder="Zoek project, plaats of klant" value={zoek} onChange={(e) => setZoek(e.target.value)} aria-label="Zoek in nog te plannen" />
      <p className="caption fx-muted mp-tip">Sleep een project op een team en dag, of klik op Plaatsen.</p>
      <div className="mp-lijst-body">
        {groepen.filter(([, ps]) => ps.length).map(([titel, ps]) => (
          <section key={titel} className="mp-groep">
            <h3 className={`label ${titel === "Te laat" ? "is-danger" : ""}`}>{titel} <span className="fx-muted">({ps.length})</span></h3>
            {ps.map((p) => (
              <article
                key={p.projectnummer}
                className={`mp-kaart ${kies === p.projectnummer ? "is-gekozen" : ""}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DT.project, p.projectnummer);
                  e.dataTransfer.effectAllowed = "copy";
                }}
              >
                <div className="mp-kaart-kop">
                  <b>{p.land} · {p.plaats}</b>
                  {p.fix && <span className="mp-tag">Vast</span>}
                </div>
                <div className="body-sm">{p.omschrijving}</div>
                <div className="caption fx-muted"><span className="fx-code">{p.projectnummer}</span> · {p.klant}</div>
                <div className="mp-kaart-cijfers caption">
                  <span title="Gewenste start: materiaal op locatie"><Icon name="calendar" />{datumLang(dagVan(p.gewensteStart))}</span>
                  <span title="VC-uren werk"><Icon name="wrench" />{uren(p.vcUrenWerk)}</span>
                  <span title="VC-uren reis"><Icon name="truck" />{uren(p.vcUrenReis)}</span>
                </div>
                <div className="mp-kaart-voet">
                  <span className="caption fx-muted">≈ {dagenTekst(werkdagenNodig(p.vcUrenWerk, 3))} met 3 man</span>
                  <Button size="sm" variant={kies === p.projectnummer ? "primary" : "secondary"} onClick={() => onKies(kies === p.projectnummer ? null : p.projectnummer)}>
                    {kies === p.projectnummer ? "Kies dag…" : "Plaatsen"}
                  </Button>
                </div>
              </article>
            ))}
          </section>
        ))}
        {!lijst.length && <p className="body-sm fx-muted">Niets gevonden.</p>}
      </div>
    </aside>
  );
}

// ---- Zijpaneel: één inzet -----------------------------------------------------------
function Paneel({ titel, sub, onClose, children, voet }: { titel: ReactNode; sub?: ReactNode; onClose(): void; children: ReactNode; voet?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="mp-overlay" onClick={onClose}>
      <div className="mp-paneel" role="dialog" aria-modal="true" aria-label={typeof titel === "string" ? titel : "Details"} onClick={(e) => e.stopPropagation()} ref={ref} tabIndex={-1}>
        <div className="mp-paneel-kop">
          <div>
            <div className="h2">{titel}</div>
            {sub && <div className="body-sm fx-muted">{sub}</div>}
          </div>
          <button type="button" className="mp-x is-groot" aria-label="Sluiten" onClick={onClose}>×</button>
        </div>
        <div className="mp-paneel-body">{children}</div>
        {voet && <div className="mp-paneel-voet">{voet}</div>}
      </div>
    </div>
  );
}

function InzetPaneel({ ctx, id, teams, onClose }: { ctx: Ctx; id: string; teams: TeamWeek[]; onClose(): void }) {
  const { planning, projecten } = ctx;
  const i = planning.inzet.find((x) => x.id === id);
  if (!i) return null;
  const p = projecten.get(i.projectnummer);
  const team = teams.find((t) => t.nummer === i.team);
  const bewaar = (x: Partial<Inzet>) => planning.bewaarInzet({ ...i, ...x, gewijzigd: new Date().toISOString() });
  const herbouw = (opts: { weekend?: boolean; aanreis?: boolean; monteurs?: number; start?: Dag }) => {
    if (!p) return;
    const n = { weekend: opts.weekend ?? i.weekend, aanreis: opts.aanreis ?? i.aanreis, monteurs: opts.monteurs ?? i.monteurs };
    const dagen = bouwDagen(p, opts.start ?? i.dagen[0].datum, n.monteurs, n, planning.fasen);
    const binnen = new Set(dagen.map((d) => d.datum));
    const equipment = i.equipment.map((e) => (e.dag && !binnen.has(e.dag) ? { ...e, dag: standaardEquipment(p, dagen).find((x) => x.id === "kr")?.dag ?? dagen[0].datum } : e));
    bewaar({ ...n, dagen, equipment, fasenAangepast: false });
  };
  const nodig = p ? werkdagenNodig(p.vcUrenWerk, i.monteurs) : 0;
  const dek = p ? dekking(i, p) : 1;
  const faseOpties = [...new Set([...planning.fasen, ...EXTRA_FASEN])];

  return (
    <Paneel
      titel={p ? `${p.plaats} (${p.land})` : i.projectnummer}
      sub={p ? `${i.projectnummer} · ${p.klant}` : "Dit project staat niet meer in de export"}
      onClose={onClose}
      voet={
        <>
          {i.voorstel && <Button variant="primary" icon="check" onClick={() => bewaar({ voorstel: false })}>Voorstel accepteren</Button>}
          <Button variant="danger" onClick={async () => { await planning.verwijderInzet(i.id); onClose(); }}>Uit planning halen</Button>
          <Button variant="secondary" onClick={onClose}>Klaar</Button>
        </>
      }
    >
      {p && (
        <section className="mp-sectie">
          <dl className="mp-dl">
            <div><dt className="label">Product</dt><dd>{p.omschrijving}{p.lining ? " (incl. lining)" : ""}</dd></div>
            <div><dt className="label">Silo</dt><dd>{p.silo ?? "–"}</dd></div>
            <div><dt className="label">Locatie</dt><dd>{p.postcode} {p.plaats}, {LAND[p.land] ?? p.land}</dd></div>
            <div><dt className="label">Gewenste start</dt><dd>{datumLang(dagVan(p.gewensteStart))} {p.fix ? <StatusBadge tone="success">Vast</StatusBadge> : <StatusBadge tone="neutral">Indicatie</StatusBadge>}</dd></div>
            <div><dt className="label">Status Bemet</dt><dd>{p.status}</dd></div>
            <div><dt className="label">Werkvoorbereider</dt><dd>{p.werkvoorbereider ?? "–"}</dd></div>
          </dl>
          {p.opmerking && <p className="body-sm mp-opmerking"><Icon name="file" /> {p.opmerking}</p>}
        </section>
      )}

      {p && (
        <section className="mp-sectie mp-reken">
          <div><span className="label">VC-uren werk</span><b>{uren(p.vcUrenWerk)}</b></div>
          <div><span className="label">VC-uren reis</span><b>{uren(p.vcUrenReis)}</b></div>
          <div><span className="label">Nodig met {i.monteurs} man</span><b>{dagenTekst(nodig)}</b></div>
          <div><span className="label">Gepland</span><b className={dek < 0.995 ? "is-danger" : ""}>{dagenTekst(werkdagenIn(i))} · {Math.round(dek * 100)}%</b></div>
          <p className="caption fx-muted">{p.vcUrenWerk} u ÷ ({i.monteurs} monteurs × {UREN_PER_DAG} u) = {dagenTekst(nodig)}. Reisuren tellen los van de {UREN_PER_DAG} werkuren.</p>
        </section>
      )}

      <section className="mp-sectie">
        <h3 className="h3">Planning</h3>
        <div className="mp-form">
          <label className="fx-field">
            <span className="fx-label">Team</span>
            <select className="fx-select" value={i.team} onChange={(e) => bewaar({ team: Number(e.target.value) })}>
              {teams.map((t) => <option key={t.id} value={t.nummer}>Team {t.nummer} ({t.leden.length} man)</option>)}
            </select>
          </label>
          <label className="fx-field">
            <span className="fx-label">Startdag</span>
            <input className="fx-input" type="date" value={i.dagen[0].datum} onChange={(e) => e.target.value && bewaar({ dagen: verschuif(i.dagen, e.target.value, i.weekend) })} />
          </label>
          <label className="mp-check"><input type="checkbox" checked={i.aanreis} onChange={(e) => herbouw({ aanreis: e.target.checked })} /> Aparte aanreisdag</label>
          <label className="mp-check"><input type="checkbox" checked={i.weekend} onChange={(e) => herbouw({ weekend: e.target.checked })} /> Doorwerken in het weekend</label>
        </div>
        {team && team.leden.length !== i.monteurs && (
          <Alert tone="warning" title={`Team ${team.nummer} heeft nu ${team.leden.length} man`}>
            De duur is berekend met {i.monteurs} monteurs.{" "}
            <Button size="sm" variant="secondary" onClick={() => herbouw({ monteurs: Math.max(1, team.leden.length) })}>Herberekenen met {team.leden.length}</Button>
          </Alert>
        )}
      </section>

      <section className="mp-sectie">
        <div className="mp-sectie-kop">
          <h3 className="h3">Dagen en fasen</h3>
          <div className="mp-knoppen">
            <Button size="sm" variant="quiet" disabled={i.dagen.length < 2} onClick={() => bewaar({ dagen: i.dagen.slice(0, -1), fasenAangepast: true })}>− dag</Button>
            <Button size="sm" variant="quiet" icon="plus" onClick={() => {
              const laatste = i.dagen[i.dagen.length - 1].datum;
              const [volgende] = dagenVanaf(plusDagen(laatste, 1), 1, i.weekend);
              bewaar({ dagen: [...i.dagen, { datum: volgende, fase: "Restwerkzaamheden" }], fasenAangepast: true });
            }}>dag</Button>
          </div>
        </div>
        <datalist id="mp-fasen">{faseOpties.map((f) => <option key={f} value={f} />)}</datalist>
        <ol className="mp-dagenlijst">
          {i.dagen.map((d, k) => (
            <li key={d.datum}>
              <span className="label">{datumLang(d.datum)}</span>
              <input
                className="fx-input"
                list="mp-fasen"
                defaultValue={d.fase}
                aria-label={`Fase op ${datumLang(d.datum)}`}
                onBlur={(e) => e.target.value !== d.fase && bewaar({ dagen: i.dagen.map((x, j) => (j === k ? { ...x, fase: e.target.value } : x)), fasenAangepast: true })}
              />
            </li>
          ))}
        </ol>
        <p className="caption fx-muted">Kies uit de lijst of typ zelf. {i.dagen[0].fase === AANREIS ? "De eerste dag is een aanreisdag." : ""}</p>
      </section>

      <section className="mp-sectie">
        <div className="mp-sectie-kop">
          <h3 className="h3">Equipment</h3>
          <Button size="sm" variant="quiet" icon="plus" onClick={() => bewaar({ equipment: [...i.equipment, { id: `e${Date.now()}`, soort: "Telescoophoogwerker", aantal: 1, bron: "Huur", bevestigd: false }] })}>Toevoegen</Button>
        </div>
        {!i.equipment.length && <p className="body-sm fx-muted">Geen equipment nodig.</p>}
        {i.equipment.map((e) => {
          const zet = (x: Partial<Equipment>) => bewaar({ equipment: i.equipment.map((y) => (y.id === e.id ? { ...y, ...x } : y)) });
          return (
            <div key={e.id} className={`mp-eqrij ${e.bevestigd ? "is-ok" : "is-open"}`}>
              <select className="fx-select" aria-label="Soort" value={e.soort} onChange={(x) => zet({ soort: x.target.value })}>
                {[...new Set([e.soort, ...EQUIPMENT_SOORTEN])].map((s) => <option key={s}>{s}</option>)}
              </select>
              <input className="fx-input" type="number" min={1} aria-label="Aantal" value={e.aantal} onChange={(x) => zet({ aantal: Math.max(1, Number(x.target.value)) })} />
              <select className="fx-select" aria-label="Van wie" value={e.bron} onChange={(x) => zet({ bron: x.target.value as Equipment["bron"] })}>
                <option value="Klant">Klant</option><option value="Huur">Huur</option><option value="Eigen">Eigen</option>
              </select>
              <select className="fx-select" aria-label="Wanneer" value={e.dag ?? ""} onChange={(x) => zet({ dag: x.target.value || undefined })}>
                <option value="">Hele inzet</option>
                {i.dagen.map((d) => <option key={d.datum} value={d.datum}>{datumLang(d.datum)}</option>)}
              </select>
              <input className="fx-input" aria-label="Tijd" placeholder="Tijd" value={e.tijd ?? ""} onChange={(x) => zet({ tijd: x.target.value || undefined })} />
              <button type="button" className={`mp-bevestig ${e.bevestigd ? "is-ok" : ""}`} aria-pressed={e.bevestigd} onClick={() => zet({ bevestigd: !e.bevestigd })}>
                <Icon name={e.bevestigd ? "check-circle" : "clock"} />{e.bevestigd ? "Bevestigd" : "Niet bevestigd"}
              </button>
              <button type="button" className="mp-x" aria-label="Verwijderen" onClick={() => bewaar({ equipment: i.equipment.filter((y) => y.id !== e.id) })}>×</button>
            </div>
          );
        })}
      </section>

      <section className="mp-sectie">
        <label className="fx-field">
          <span className="fx-label">Bijzonderheden voor het team</span>
          <textarea className="fx-textarea" rows={3} defaultValue={i.notitie} placeholder="Bijv. sleutel ophalen bij de portier, klant aanwezig vanaf 7:00" onBlur={(e) => e.target.value !== i.notitie && bewaar({ notitie: e.target.value })} />
          <span className="fx-hint">Komt straks in de weekplanning van de monteurs.</span>
        </label>
      </section>
    </Paneel>
  );
}

// ---- Zijpaneel: montagefasen beheren -------------------------------------------------
function FasenPaneel({ planning, onClose }: { planning: Planning; onClose(): void }) {
  const [fasen, setFasen] = useState(planning.fasen);
  const zet = (k: number, v: string) => setFasen(fasen.map((f, j) => (j === k ? v : f)));
  const wissel = (a: number, b: number) => {
    const n = [...fasen];
    [n[a], n[b]] = [n[b], n[a]];
    setFasen(n);
  };
  return (
    <Paneel
      titel="Montagefasen"
      sub="Standaardvolgorde bij nieuwbouw. Nieuwe planningen worden hiermee over de werkdagen verdeeld."
      onClose={onClose}
      voet={
        <>
          <Button variant="primary" onClick={async () => { await planning.bewaarFasen(fasen.map((f) => f.trim()).filter(Boolean)); onClose(); }}>Opslaan</Button>
          <Button variant="quiet" onClick={() => setFasen(STANDAARD_FASEN)}>Standaard herstellen</Button>
        </>
      }
    >
      <ol className="mp-fasenlijst">
        {fasen.map((f, k) => (
          <li key={k}>
            <span className="caption fx-muted">{k + 1}</span>
            <input className="fx-input" value={f} aria-label={`Fase ${k + 1}`} onChange={(e) => zet(k, e.target.value)} />
            <button type="button" className="mp-x" aria-label="Omhoog" disabled={!k} onClick={() => wissel(k, k - 1)}>↑</button>
            <button type="button" className="mp-x" aria-label="Omlaag" disabled={k === fasen.length - 1} onClick={() => wissel(k, k + 1)}>↓</button>
            <button type="button" className="mp-x" aria-label="Verwijderen" onClick={() => setFasen(fasen.filter((_, j) => j !== k))}>×</button>
          </li>
        ))}
      </ol>
      <Button variant="secondary" size="sm" icon="plus" onClick={() => setFasen([...fasen, ""])}>Fase toevoegen</Button>
      <p className="caption fx-muted">Aanreis, thuisreis, reparatie en gasdichtheidstest zijn altijd te kiezen per dag.</p>
    </Paneel>
  );
}
