// Module Montage: de gepubliceerde weekplanning van de monteur ("Mijn week") en per project alle orderinformatie.
// Tablet-first: grote tikvlakken, de dag van vandaag bovenaan.
import { useEffect, useState } from "react";
import { Alert, Button, Icon, StatusBadge } from "../../brand";
import { useSession } from "../../app/session";
import { navigate } from "../../app/router";
import { uren } from "../../app/format";
import type { Medewerker, Montageproject } from "../../core/data/exports";
import { AANREIS, dagVan, isWeekend, isoWeek, maandagVan, naarDate, plusDagen, weekDagen, weekSleutel, type Dag, type Equipment, type Inzet } from "../montageplanning/model";
import { weekVanMonteur, type Publicatie } from "../montageplanning/publicatie";
import { usePlanning } from "../montageplanning/usePlanning";
import { useDemoPlanning } from "../montageplanning/demo";
import "./montage.css";

const vandaag = () => dagVan(new Date());
const datumLang = (d: Dag) => naarDate(d).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
const datumKort = (d: Dag) => naarDate(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
const naam = (m?: Medewerker) => (m ? `${m.voornaam} ${m.achternaam}` : "Onbekend");
const LAND: Record<string, string> = { NL: "Nederland", DE: "Duitsland", BE: "België", PL: "Polen", FR: "Frankrijk", DK: "Denemarken" };

/** Kiest voor niet-monteurs (planner, manager) in de testfase een monteur om mee te kijken. */
function useMonteur(monteurs: Medewerker[]) {
  const { user } = useSession();
  const eigen = user?.role === "monteur" ? user.personeelsnummer : undefined;
  const [gekozen, setGekozen] = useState<string | undefined>(undefined);
  const pnr = eigen ?? gekozen ?? monteurs.find((m) => m.functie === "Hoofdmonteur")?.personeelsnummer;
  return { pnr, eigen: !!eigen, setGekozen };
}

export function MontagePage({ path }: { path: string }) {
  const { data } = useSession();
  const planning = usePlanning();
  useDemoPlanning(planning);
  const rows = data?.rows;
  const monteurs = (rows?.medewerkers ?? []).filter((m) => m.afdeling === "Montage");
  const { pnr, eigen, setGekozen } = useMonteur(monteurs);

  if (!rows || !planning.geladen) return <p className="fx-muted">Planning laden…</p>;
  const projectnr = decodeURIComponent(path.split("/project/")[1] ?? "");
  const projecten = new Map(rows.montageprojecten.map((p) => [p.projectnummer, p]));
  const mensen = new Map(rows.medewerkers.map((m) => [m.personeelsnummer, m]));

  const kiezer = !eigen && (
    <label className="mt-kiezer">
      <span className="label">Bekijk als monteur</span>
      <select className="fx-select" value={pnr} onChange={(e) => setGekozen(e.target.value)}>
        {monteurs.map((m) => <option key={m.personeelsnummer} value={m.personeelsnummer}>{naam(m)}{m.team ? ` (${m.team})` : ""}</option>)}
      </select>
    </label>
  );

  if (projectnr) {
    return <ProjectDetail p={projecten.get(projectnr)} nr={projectnr} pnr={pnr} publicaties={planning.publicaties} mensen={mensen} />;
  }
  if (!planning.publicaties.length) {
    return (
      <div className="mt">
        {kiezer}
        <Alert tone="info" title="Nog geen planning gepubliceerd">Zodra de montageplanner een week publiceert, zie je hier je weekplanning.</Alert>
      </div>
    );
  }
  return <MijnWeek pnr={pnr!} kiezer={kiezer} publicaties={planning.publicaties} projecten={projecten} mensen={mensen} />;
}

// ---- Mijn week -------------------------------------------------------------------------
function MijnWeek({ pnr, kiezer, publicaties, projecten, mensen }: {
  pnr: string; kiezer: React.ReactNode; publicaties: Publicatie[]; projecten: Map<string, Montageproject>; mensen: Map<string, Medewerker>;
}) {
  const [maandag, setMaandag] = useState(() => maandagVan(vandaag()));
  useEffect(() => { window.scrollTo(0, 0); }, [maandag]);
  const week = weekSleutel(maandag);
  const dagen = weekDagen(maandag);
  const pub = publicaties.find((p) => p.id === week);
  const mijn = weekVanMonteur(pub, pnr);
  const vd = vandaag();
  const { week: kw } = isoWeek(maandag);
  const opDag = (d: Dag) => (mijn?.inzet ?? []).filter((i) => i.dagen.some((x) => x.datum === d));
  const vandaagItems = dagen.includes(vd) ? opDag(vd) : [];

  return (
    <div className="mt">
      {kiezer}
      <div className="mt-weekkop">
        <span className="mt-prev"><Button variant="secondary" icon="chevron-right" label="Vorige week" onClick={() => setMaandag(plusDagen(maandag, -7))} /></span>
        <div className="mt-weektitel">
          <span className="h2">Week {kw}</span>
          <span className="body-sm fx-muted">{datumKort(dagen[0])} t/m {datumKort(dagen[6])}</span>
        </div>
        <Button variant="secondary" icon="chevron-right" label="Volgende week" onClick={() => setMaandag(plusDagen(maandag, 7))} />
      </div>

      {!pub && <Alert tone="info" title="Deze week is nog niet gepubliceerd">De planner is nog bezig. Je krijgt hem te zien zodra hij gepubliceerd is.</Alert>}
      {pub && mijn?.afwezig && <Alert tone="info" title={mijn.afwezig.reden === "Ziek" ? "Je staat deze week ziek gemeld" : "Je hebt deze week verlof"}>Geen projecten voor jou ingepland.</Alert>}
      {pub && !mijn?.afwezig && !mijn?.team && <Alert tone="info" title="Je bent deze week niet ingedeeld">Neem contact op met de planning als dat niet klopt.</Alert>}

      {pub && mijn?.team && (
        <section className="mt-team" aria-label="Jouw team">
          <div>
            <span className="label fx-muted">Jouw team</span>
            <div className="h3">Team {mijn.team.nummer}{mijn.team.voertuig ? ` · ${mijn.team.voertuig}` : ""}</div>
          </div>
          <ul className="mt-leden">
            {mijn.team.leden.map((l) => (
              <li key={l} className={l === mijn.team!.bouwleider ? "is-bl" : ""}>
                {naam(mensen.get(l))}{l === pnr ? " (jij)" : ""}{l === mijn.team!.bouwleider ? <span className="mt-bl">Bouwleider</span> : null}
              </li>
            ))}
          </ul>
          <span className="caption fx-muted">Gepubliceerd {new Date(pub.gepubliceerdOp).toLocaleString("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
        </section>
      )}

      {vandaagItems.length > 0 && (
        <section className="mt-vandaag" aria-label="Vandaag">
          <h2 className="label">Vandaag</h2>
          {vandaagItems.map((i) => <OrderKaart key={i.id} i={i} d={vd} p={projecten.get(i.projectnummer)} groot gewijzigd={pub!.gewijzigd.includes(i.id)} />)}
        </section>
      )}

      {pub && mijn?.team && (
        <ol className="mt-dagen">
          {dagen.map((d) => {
            const items = opDag(d);
            return (
              <li key={d} className={`mt-dag ${d === vd ? "is-today" : ""} ${isWeekend(d) ? "is-weekend" : ""}`}>
                <div className="mt-dagkop">
                  <b>{datumLang(d)}</b>
                  {d === vd && <StatusBadge tone="active">Vandaag</StatusBadge>}
                </div>
                {items.length ? items.map((i) => <OrderKaart key={i.id} i={i} d={d} p={projecten.get(i.projectnummer)} gewijzigd={pub.gewijzigd.includes(i.id)} />)
                  : <p className="body-sm fx-muted mt-vrij">{isWeekend(d) ? "Weekend" : "Niets ingepland"}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function EqLijst({ eq }: { eq: Equipment[] }) {
  if (!eq.length) return null;
  return (
    <ul className="mt-eq">
      {eq.map((e) => (
        <li key={e.id} className={e.bevestigd ? "is-ok" : "is-open"}>
          <Icon name={e.bevestigd ? "check-circle" : "clock"} />
          {e.aantal > 1 ? `${e.aantal}× ` : ""}{e.soort}{e.tijd ? ` om ${e.tijd}` : ""} · {e.bron === "Klant" ? "van de klant" : e.bron === "Huur" ? "gehuurd" : "eigen"}
          {!e.bevestigd && <span className="mt-eq-status"> · nog niet bevestigd</span>}
        </li>
      ))}
    </ul>
  );
}

function OrderKaart({ i, d, p, groot, gewijzigd }: { i: Inzet; d: Dag; p?: Montageproject; groot?: boolean; gewijzigd?: boolean }) {
  const dag = i.dagen.find((x) => x.datum === d)!;
  const eq = i.equipment.filter((e) => !e.dag || e.dag === d);
  const open = () => navigate(`/montage/project/${encodeURIComponent(i.projectnummer)}`);
  return (
    <button type="button" className={`mt-order ${groot ? "is-groot" : ""}`} onClick={open} aria-label={`${p?.plaats ?? i.projectnummer}, ${dag.fase}. Open orderinformatie`}>
      <div className="mt-order-kop">
        <span className="mt-order-titel">{p ? `${p.plaats} (${p.land})` : i.projectnummer}</span>
        {gewijzigd && <StatusBadge tone="warning">Gewijzigd</StatusBadge>}
        <Icon name="chevron-right" className="mt-chevron" />
      </div>
      <span className="body-sm">{p?.omschrijving}{p?.silo ? ` · ${p.silo}` : ""}</span>
      <span className={`mt-fase ${dag.fase.startsWith(AANREIS) ? "is-reis" : ""}`}>{dag.fase}</span>
      <EqLijst eq={eq} />
      {i.notitie && <span className="mt-notitie"><Icon name="info" />{i.notitie}</span>}
      <span className="caption fx-muted"><span className="fx-code">{i.projectnummer}</span>{p ? ` · ${p.klant}` : ""}</span>
    </button>
  );
}

// ---- Orderinformatie ---------------------------------------------------------------------
function ProjectDetail({ p, nr, pnr, publicaties, mensen }: { p?: Montageproject; nr: string; pnr?: string; publicaties: Publicatie[]; mensen: Map<string, Medewerker> }) {
  useEffect(() => { window.scrollTo(0, 0); }, [nr]);
  // Alle gepubliceerde dagen van dit project, over de weken heen, voor het team van de monteur (of alle teams).
  const items = publicaties.flatMap((pub) => pub.inzet.filter((i) => i.projectnummer === nr).map((i) => ({ i, pub })));
  const mijnTeams = new Set(publicaties.flatMap((pub) => pub.teams.filter((t) => pnr && t.leden.includes(pnr)).map((t) => `${pub.week}|${t.nummer}`)));
  const eigen = items.filter(({ i, pub }) => mijnTeams.has(`${pub.week}|${i.team}`));
  const toon = eigen.length ? eigen : items;
  const dagen = new Map<string, { fase: string; team: number }>();
  for (const { i } of toon) for (const d of i.dagen) dagen.set(d.datum, { fase: d.fase, team: i.team });
  const laatste = toon[toon.length - 1];
  const team = laatste?.pub.teams.find((t) => t.nummer === laatste.i.team);
  const notities = [...new Set(toon.map(({ i }) => i.notitie).filter(Boolean))];
  const eq = laatste?.i.equipment ?? [];
  const adres = p ? `${p.postcode ?? ""} ${p.plaats}, ${LAND[p.land] ?? p.land}`.trim() : "";

  return (
    <div className="mt">
      <div>
        <Button variant="quiet" onClick={() => (history.length > 1 ? history.back() : navigate("/montage"))}><span className="mt-terug"><Icon name="chevron-right" /></span>Terug naar mijn week</Button>
      </div>
      {!p ? (
        <Alert tone="warning" title="Project niet gevonden">{nr} staat niet (meer) in de export Montageprojecten.</Alert>
      ) : (
        <>
          <section className="mt-blok mt-projectkop">
            <span className="fx-code">{p.projectnummer}</span>
            <h2 className="h1">{p.plaats} ({p.land})</h2>
            <p className="body">{p.omschrijving}{p.lining ? ", inclusief lining" : ""}</p>
            <div className="mt-knoppen">
              <a className="fx-btn fx-btn-secondary" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adres)}`} target="_blank" rel="noreferrer">
                <Icon name="truck" />Route
              </a>
              <Button variant="secondary" icon="clock" disabled>Uren klokken (volgt)</Button>
            </div>
          </section>

          <section className="mt-blok">
            <h3 className="h3">Order</h3>
            <dl className="mt-dl">
              <div><dt className="label">Klant</dt><dd>{p.klant}</dd></div>
              <div><dt className="label">Adres bouwplaats</dt><dd>{adres}</dd></div>
              <div><dt className="label">Product</dt><dd>{p.omschrijving}</dd></div>
              <div><dt className="label">Silo</dt><dd>{p.silo ?? "–"}</dd></div>
              <div><dt className="label">Soort</dt><dd>{p.soort}</dd></div>
              <div><dt className="label">Materiaal op locatie</dt><dd>{datumLang(dagVan(p.gewensteStart))}</dd></div>
              <div><dt className="label">Begrote uren</dt><dd>{uren(p.vcUrenWerk)} werk · {uren(p.vcUrenReis)} reis</dd></div>
              <div><dt className="label">Werkvoorbereider</dt><dd>{p.werkvoorbereider ?? "–"}</dd></div>
            </dl>
            {p.opmerking && <p className="body-sm mt-opmerking"><Icon name="file" />{p.opmerking}</p>}
          </section>

          {notities.length > 0 && (
            <section className="mt-blok mt-bijzonder">
              <h3 className="h3">Bijzonderheden van de planning</h3>
              {notities.map((n) => <p key={n} className="body">{n}</p>)}
            </section>
          )}

          <section className="mt-blok">
            <h3 className="h3">Planning</h3>
            {dagen.size ? (
              <ol className="mt-planning">
                {[...dagen.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, x]) => (
                  <li key={d} className={d === vandaag() ? "is-today" : ""}><span className="label">{datumLang(d)}</span><span>{x.fase}</span></li>
                ))}
              </ol>
            ) : <p className="body-sm fx-muted">Nog niet gepubliceerd.</p>}
          </section>

          {team && (
            <section className="mt-blok">
              <h3 className="h3">Team {team.nummer}{team.voertuig ? ` · ${team.voertuig}` : ""}</h3>
              <ul className="mt-leden">
                {team.leden.map((l) => <li key={l} className={l === team.bouwleider ? "is-bl" : ""}>{naam(mensen.get(l))}{l === team.bouwleider ? <span className="mt-bl">Bouwleider</span> : null}</li>)}
              </ul>
            </section>
          )}

          <section className="mt-blok">
            <h3 className="h3">Equipment</h3>
            {eq.length ? <EqLijst eq={eq} /> : <p className="body-sm fx-muted">Geen equipment ingepland.</p>}
          </section>

          <section className="mt-blok mt-volgt">
            <h3 className="h3">Tekeningen en paklijst</h3>
            <p className="body-sm fx-muted">Komt uit de projectmap zodra die gekoppeld is.</p>
          </section>
        </>
      )}
    </div>
  );
}
