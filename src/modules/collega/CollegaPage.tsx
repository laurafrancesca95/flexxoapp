// Module Collega: verlofsaldo, verlof aanvragen, goedkeuren door de manager, advies van de planning
// voor monteurs en de export van goedgekeurd verlof naar Bemet.
import { useMemo, useState, type ReactNode } from "react";
import { Alert, Button, Icon, StatTile, StatusBadge } from "../../brand";
import { useSession } from "../../app/session";
import { href, navigate } from "../../app/router";
import { peilmoment } from "../../app/format";
import type { Medewerker } from "../../core/data/exports";
import { dagVan, naarDate, plusDagen, type Dag } from "../montageplanning/model";
import { usePlanning, type Planning } from "../montageplanning/usePlanning";
import { useDemoPlanning } from "../montageplanning/demo";
import {
  SOORTEN, STATUS_LABEL, VERLOFDAG_UREN, berekenSaldo, berekenUren, dagenTekst, nieuwId, opDagen, saldoNa, soortDef, urenTekst,
  type Dagdeel, type Pot, type Saldo, type Verlofaanvraag, type VerlofSoort,
} from "./verlof";
import { geplandOp, type Botsing } from "./planningCheck";
import { useVerlof, type VerlofData } from "./useVerlof";
import { BemetExport } from "./BemetExport";
import "./collega.css";

const vandaag = () => dagVan(new Date());
const kort = (d: Dag) => naarDate(d).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });

const tijd = (iso?: string) => (iso ? new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
export const naamVan = (m?: Medewerker) => (m ? `${m.voornaam} ${m.achternaam}` : "Onbekend");
const periode = (a: Pick<Verlofaanvraag, "van" | "tot" | "deel" | "uren">) => {
  const deel = a.deel === "ochtend" ? " (ochtend)" : a.deel === "middag" ? " (middag)" : a.deel === "uren" ? ` (${urenTekst(a.uren ?? 0)})` : "";
  return a.van === a.tot ? `${kort(a.van)}${deel}` : `${kort(a.van)} t/m ${kort(a.tot)}`;
};
const STATUS_BADGE = { aangevraagd: "aangevraagd", goedgekeurd: "akkoord", afgewezen: "afgewezen", ingetrokken: "concept" } as const;

export function CollegaPage({ path }: { path: string }) {
  const { user, data } = useSession();
  const verlof = useVerlof();
  const planning = usePlanning();
  useDemoPlanning(planning);
  const [melding, setMelding] = useState<string | null>(null);
  const sub = path.split("/")[2] ?? "";

  if (!user || !data || !verlof.geladen || !planning.geladen) return <p className="fx-muted">Verlof laden…</p>;
  const ik = user.personeelsnummer ?? user.id;
  const mijnTeam = data.rows.medewerkers.filter((m) => verlof.managerVan(m.personeelsnummer) === ik);
  const isManager = user.role === "manager" || mijnTeam.length > 0;
  const isPlanner = user.role === "montageplanner";
  const teBeoordelen = verlof.aanvragen.filter((a) => a.status === "aangevraagd" && verlof.managerVan(a.personeelsnummer) === ik);
  const adviesNodig = verlof.aanvragen.filter((a) => a.status === "aangevraagd" && verlof.mensen.get(a.personeelsnummer)?.afdeling === "Montage" && !a.advies);
  const teExporteren = verlof.aanvragen.filter((a) => a.status === "goedgekeurd" && !a.geexporteerdOp);

  const tabs: { id: string; label: string; teller?: number; zichtbaar: boolean }[] = [
    { id: "", label: "Mijn verlof", zichtbaar: true },
    { id: "aanvragen", label: "Verlof aanvragen", zichtbaar: true },
    { id: "beoordelen", label: "Te beoordelen", teller: teBeoordelen.length, zichtbaar: isManager },
    { id: "advies", label: "Advies planning", teller: adviesNodig.length, zichtbaar: isPlanner },
    { id: "export", label: "Export naar Bemet", teller: teExporteren.length, zichtbaar: user.role === "manager" },
  ];
  const zichtbaar = tabs.filter((t) => t.zichtbaar);
  const actief = zichtbaar.some((t) => t.id === sub) ? sub : "";
  const ga = (id: string, m?: string) => {
    setMelding(m ?? null);
    navigate(id ? `/collega/${id}` : "/collega");
  };

  let inhoud: ReactNode;
  if (actief === "aanvragen") inhoud = <Aanvragen pnr={ik} verlof={verlof} planning={planning} onKlaar={(m) => ga("", m)} />;
  else if (actief === "beoordelen") inhoud = <Beoordelen ik={ik} lijst={teBeoordelen} verlof={verlof} planning={planning} onMelding={setMelding} />;
  else if (actief === "advies") inhoud = <AdviesPlanning lijst={verlof.aanvragen.filter((a) => a.status === "aangevraagd" && verlof.mensen.get(a.personeelsnummer)?.afdeling === "Montage")} door={user.name} verlof={verlof} planning={planning} onMelding={setMelding} />;
  else if (actief === "export") inhoud = <BemetExport lijst={teExporteren} verlof={verlof} door={user.name} onMelding={setMelding} />;
  else inhoud = <MijnVerlof pnr={ik} verlof={verlof} onAanvragen={() => ga("aanvragen")} onMelding={setMelding} />;

  return (
    <div className="cl">
      {zichtbaar.length > 1 && (
        <nav className="cl-tabs" aria-label="Verlof">
          {zichtbaar.map((t) => (
            <a key={t.id} href={href(t.id ? `/collega/${t.id}` : "/collega")} className={`cl-tab ${actief === t.id ? "is-actief" : ""}`} aria-current={actief === t.id ? "page" : undefined} onClick={() => setMelding(null)}>
              {t.label}
              {!!t.teller && <span className="cl-teller" aria-label={`${t.teller} open`}>{t.teller}</span>}
            </a>
          ))}
        </nav>
      )}
      {melding && <Alert tone="success" title={melding} />}
      {inhoud}
    </div>
  );
}

// ---- Mijn verlof -------------------------------------------------------------------
function MijnVerlof({ pnr, verlof, onAanvragen, onMelding }: { pnr: string; verlof: VerlofData; onAanvragen(): void; onMelding(m: string): void }) {
  const { data } = useSession();
  const jaar = new Date().getFullYear();
  const rij = data!.rows.verlofsaldo.find((v) => v.personeelsnummer === pnr);
  const saldo = berekenSaldo(rij, verlof.aanvragen, jaar);
  const mgr = verlof.managerVan(pnr);
  const mijn = verlof.aanvragen.filter((a) => a.personeelsnummer === pnr).sort((a, b) => b.van.localeCompare(a.van));
  const vd = vandaag();
  const komend = mijn.filter((a) => a.tot >= vd && a.status !== "ingetrokken").reverse();
  const eerder = mijn.filter((a) => !komend.includes(a));

  const trekIn = async (a: Verlofaanvraag) => {
    await verlof.bewaar({ ...a, status: "ingetrokken" });
    onMelding("Je aanvraag is ingetrokken.");
  };

  return (
    <>
      <div className="cl-kop">
        <div>
          <h2 className="h2">Jouw verlof {jaar}</h2>
          <p className="body-sm fx-muted">
            {mgr ? <>Je aanvragen gaan naar <b>{naamVan(verlof.mensen.get(mgr))}</b>.</> : "Je hebt nog geen manager gekoppeld. Vraag de beheerder om dit in te stellen."}
            {" "}Saldo volgens Bemet van {peilmoment(data!.states.verlofsaldo.exportedAt)}, bijgewerkt met je aanvragen in de app.
          </p>
        </div>
        <Button variant="primary" size="lg" icon="plus" onClick={onAanvragen}>Verlof aanvragen</Button>
      </div>

      {!saldo ? (
        <Alert tone="warning" title="Geen saldo gevonden">Je staat niet in de export Verlofsaldo. Je kunt wel verlof aanvragen.</Alert>
      ) : (
        <>
          <div className="fx-stats">
            <SaldoTegel label="Vakantie beschikbaar" pot={saldo.vakantie} />
            {saldo.adv && <SaldoTegel label="ADV beschikbaar" pot={saldo.adv} />}
            <StatTile label="Wacht op akkoord" value={urenTekst((saldo.vakantie.inAanvraag + (saldo.adv?.inAanvraag ?? 0))).replace(" u", "")} unit="u" foot={`${mijn.filter((a) => a.status === "aangevraagd").length} aanvragen`} />
          </div>
          <SaldoOpbouw saldo={saldo} />
        </>
      )}

      <section className="app-stack-sm" aria-labelledby="cl-komend">
        <h2 id="cl-komend" className="h3">Aangevraagd en gepland</h2>
        {komend.length ? (
          <ul className="cl-lijst">{komend.map((a) => <AanvraagRegel key={a.id} a={a} verlof={verlof} actie={a.status === "aangevraagd" && <Button variant="quiet" size="sm" onClick={() => trekIn(a)}>Intrekken</Button>} />)}</ul>
        ) : (
          <p className="cl-leeg body-sm fx-muted">Je hebt nog geen verlof gepland.</p>
        )}
      </section>
      {eerder.length > 0 && (
        <details className="cl-eerder">
          <summary className="body-strong">Eerdere aanvragen ({eerder.length})</summary>
          <ul className="cl-lijst">{eerder.map((a) => <AanvraagRegel key={a.id} a={a} verlof={verlof} />)}</ul>
        </details>
      )}
    </>
  );
}

function SaldoTegel({ label, pot }: { label: string; pot: Pot }) {
  return (
    <StatTile
      label={label}
      value={new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(pot.beschikbaar)}
      unit="u"
      progress={pot.recht ? Math.max(0, Math.min(100, (pot.beschikbaar / pot.recht) * 100)) : 0}
      foot={`${dagenTekst(pot.beschikbaar, VERLOFDAG_UREN)} van ${urenTekst(pot.recht)}`}
    />
  );
}

function SaldoOpbouw({ saldo }: { saldo: Saldo }) {
  const regels: [string, (p: Pot) => number, string?][] = [
    ["Verlofrecht dit jaar", (p) => p.recht],
    ["Opgenomen (Bemet)", (p) => -p.opgenomen],
    ["Gepland (Bemet)", (p) => -p.gepland],
    ["Goedgekeurd in de app", (p) => -p.goedgekeurd, "Nog niet in Bemet verwerkt"],
    ["Wacht op akkoord", (p) => -p.inAanvraag],
  ];
  const f = (n: number) => (n === 0 ? "–" : urenTekst(n).replace("-", "− "));
  return (
    <details className="cl-opbouw">
      <summary className="body-strong">Hoe is je saldo opgebouwd?</summary>
      <table className="cl-tabel">
        <thead><tr><th scope="col"></th><th scope="col" className="fx-num">Vakantie</th>{saldo.adv && <th scope="col" className="fx-num">ADV</th>}</tr></thead>
        <tbody>
          {regels.map(([l, fn, hint]) => (
            <tr key={l}><th scope="row">{l}{hint && <span className="caption fx-muted"> · {hint}</span>}</th><td className="fx-num">{f(fn(saldo.vakantie))}</td>{saldo.adv && <td className="fx-num">{f(fn(saldo.adv))}</td>}</tr>
          ))}
          <tr className="cl-totaal"><th scope="row">Beschikbaar</th><td className="fx-num">{urenTekst(saldo.vakantie.beschikbaar)}</td>{saldo.adv && <td className="fx-num">{urenTekst(saldo.adv.beschikbaar)}</td>}</tr>
        </tbody>
      </table>
      <p className="caption fx-muted">Een verlofdag telt {VERLOFDAG_UREN} uur. Weekenden en feestdagen tellen niet mee.</p>
    </details>
  );
}

function AanvraagRegel({ a, verlof, wie, actie }: { a: Verlofaanvraag; verlof: VerlofData; wie?: boolean; actie?: ReactNode }) {
  const s = soortDef(a.soort);
  return (
    <li className={`cl-regel is-${a.status}`}>
      <div className="cl-regel-hoofd">
        <div className="cl-regel-titel">
          <b>{wie ? `${naamVan(verlof.mensen.get(a.personeelsnummer))} · ` : ""}{s.label}{a.reden ? ` · ${a.reden}` : ""}</b>
          <span className="body-sm">{periode(a)} · {urenTekst(a.totaal)}{s.saldo ? "" : " · niet van saldo"}</span>
        </div>
        <StatusBadge status={STATUS_BADGE[a.status]}>{STATUS_LABEL[a.status]}</StatusBadge>
      </div>
      {a.toelichting && <p className="body-sm fx-muted cl-quote">“{a.toelichting}”</p>}
      {a.reactie && (
        <p className={`cl-reactie body-sm ${a.status === "afgewezen" ? "is-af" : ""}`}>
          <Icon name="info" />{naamVan(verlof.mensen.get(a.beoordeeldDoor ?? ""))}: {a.reactie}
        </p>
      )}
      <div className="cl-regel-voet caption fx-muted">
        <span>Aangevraagd {tijd(a.aangevraagdOp)}</span>
        {a.beoordeeldOp && <span>{a.status === "goedgekeurd" ? "Goedgekeurd" : "Beoordeeld"} {tijd(a.beoordeeldOp)}</span>}
        {a.geexporteerdOp && <span>In Bemet gezet {tijd(a.geexporteerdOp)}</span>}
        {actie}
      </div>
    </li>
  );
}

// ---- Verlof aanvragen --------------------------------------------------------------
function Aanvragen({ pnr, verlof, planning, onKlaar }: { pnr: string; verlof: VerlofData; planning: Planning; onKlaar(m: string): void }) {
  const { data } = useSession();
  const ik = verlof.mensen.get(pnr);
  const morgen = plusDagen(vandaag(), 1);
  const [soort, setSoort] = useState<VerlofSoort>("vakantie");
  const [reden, setReden] = useState("");
  const [van, setVan] = useState(morgen);
  const [tot, setTot] = useState(morgen);
  const [deel, setDeel] = useState<Dagdeel>("hele");
  const [uren, setUren] = useState("4");
  const [toelichting, setToelichting] = useState("");
  const [poging, setPoging] = useState(false);

  const def = soortDef(soort);
  const saldo = berekenSaldo(data!.rows.verlofsaldo.find((v) => v.personeelsnummer === pnr), verlof.aanvragen, new Date().getFullYear());
  const echteTot = deel === "hele" ? tot : van;
  const urenNum = Number(uren.replace(",", "."));
  const b = berekenUren(van, echteTot, deel, VERLOFDAG_UREN, urenNum);
  const na = saldoNa(saldo, soort, b.totaal);
  const dagen = b.dagen.map((d) => d.datum);
  const dubbel = opDagen(verlof.aanvragen, dagen, pnr);
  const botsingen = ik?.afdeling === "Montage" ? geplandOp(pnr, dagen, planning.inzet, planning.teams) : [];
  const mgr = verlof.managerVan(pnr);
  const fouten = {
    periode: b.fout,
    reden: def.redenen && !reden ? "Kies een reden." : undefined,
    dubbel: dubbel.length ? `Je hebt al verlof aangevraagd op ${dubbel.flatMap((a) => a.dagen.filter((d) => dagen.includes(d.datum)).map((d) => kort(d.datum))).join(", ")}.` : undefined,
    verleden: van < vandaag() ? "Verlof in het verleden vraag je aan bij de administratie." : undefined,
  };
  const ok = !Object.values(fouten).some(Boolean);

  const dien = async () => {
    setPoging(true);
    if (!ok) return;
    const a: Verlofaanvraag = {
      id: nieuwId(), personeelsnummer: pnr, soort, reden: def.redenen ? reden : undefined, van, tot: echteTot, deel,
      uren: deel === "uren" ? urenNum : undefined, toelichting: toelichting.trim() || undefined,
      dagen: b.dagen, totaal: b.totaal, status: "aangevraagd", aangevraagdOp: new Date().toISOString(), manager: mgr,
    };
    await verlof.bewaar(a);
    onKlaar(`Je aanvraag voor ${periode(a)} is verstuurd${mgr ? ` naar ${naamVan(verlof.mensen.get(mgr))}` : ""}.`);
  };

  return (
    <div className="cl-form app-narrow">
      <fieldset className="cl-fs">
        <legend className="h3">Soort verlof</legend>
        <div className="cl-soorten" role="radiogroup">
          {SOORTEN.filter((s) => s.id !== "adv" || saldo?.adv).map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={soort === s.id} className={`cl-soort ${soort === s.id ? "is-aan" : ""}`} onClick={() => { setSoort(s.id); setReden(""); }}>
              <b>{s.label}</b>
              <span className="caption">{s.uitleg}</span>
            </button>
          ))}
        </div>
        {def.redenen && (
          <div className="fx-field">
            <label className="fx-label" htmlFor="cl-reden">Reden<span className="fx-req" aria-hidden="true">*</span></label>
            <select id="cl-reden" className="fx-select" value={reden} onChange={(e) => setReden(e.target.value)} aria-invalid={poging && !!fouten.reden}>
              <option value="">Kies een reden</option>
              {def.redenen.map((r) => <option key={r}>{r}</option>)}
            </select>
            {poging && fouten.reden && <div className="fx-error"><Icon name="error" />{fouten.reden}</div>}
          </div>
        )}
      </fieldset>

      <fieldset className="cl-fs">
        <legend className="h3">Wanneer?</legend>
        <div className="fx-seg cl-seg" role="radiogroup" aria-label="Hoe lang">
          {([["hele", "Hele dag(en)"], ["ochtend", "Ochtend"], ["middag", "Middag"], ["uren", "Aantal uren"]] as [Dagdeel, string][]).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={deel === v} data-v="ok" onClick={() => setDeel(v)}>{l}</button>
          ))}
        </div>
        <div className="fx-form fx-form-2">
          <div className="fx-field">
            <label className="fx-label" htmlFor="cl-van">{deel === "hele" ? "Eerste dag" : "Datum"}</label>
            <input id="cl-van" className="fx-input" type="date" value={van} min={vandaag()} onChange={(e) => { setVan(e.target.value); if (e.target.value > tot) setTot(e.target.value); }} />
          </div>
          {deel === "hele" ? (
            <div className="fx-field">
              <label className="fx-label" htmlFor="cl-tot">Laatste dag</label>
              <input id="cl-tot" className="fx-input" type="date" value={tot} min={van} onChange={(e) => setTot(e.target.value)} />
            </div>
          ) : deel === "uren" ? (
            <div className="fx-field">
              <label className="fx-label" htmlFor="cl-uren">Aantal uren</label>
              <input id="cl-uren" className="fx-input" type="number" inputMode="decimal" min={0.5} max={VERLOFDAG_UREN} step={0.5} value={uren} onChange={(e) => setUren(e.target.value)} />
              <div className="fx-hint">Maximaal {VERLOFDAG_UREN} uur</div>
            </div>
          ) : null}
        </div>

        <div className={`cl-som ${b.fout ? "is-fout" : ""}`} aria-live="polite">
          {b.fout ? (
            <span><Icon name="error" />{b.fout}</span>
          ) : (
            <>
              <div>
                <span className="cl-som-getal">{urenTekst(b.totaal)}</span>
                <span className="body-sm"> · {b.dagen.length} {b.dagen.length === 1 ? "werkdag" : "werkdagen"} ({dagenTekst(b.totaal, VERLOFDAG_UREN)})</span>
              </div>
              {b.overgeslagen.length > 0 && <span className="body-sm fx-muted">Telt niet mee: {b.overgeslagen.map((o) => `${o.reden} (${kort(o.datum)})`).join(", ")}</span>}
              {na && na.pot && <span className={`body-sm ${na.tekort ? "cl-rood" : ""}`}>{def.label}saldo daarna: <b>{urenTekst(na.na)}</b>{na.tekort ? " · je komt tekort, je manager ziet dit" : ""}</span>}
              {!def.saldo && <span className="body-sm fx-muted">Gaat niet van je saldo af.</span>}
            </>
          )}
        </div>
      </fieldset>

      {botsingen.length > 0 && <BotsingMelding botsingen={botsingen} jij />}
      {poging && fouten.dubbel && <Alert tone="danger" title="Dubbele aanvraag">{fouten.dubbel}</Alert>}
      {fouten.verleden && <Alert tone="warning">{fouten.verleden}</Alert>}

      <div className="fx-field">
        <label className="fx-label" htmlFor="cl-toel">Toelichting (optioneel)</label>
        <textarea id="cl-toel" className="fx-textarea" value={toelichting} onChange={(e) => setToelichting(e.target.value)} placeholder="Bijv. vakantie Italië, of overdracht aan een collega" />
      </div>

      <div className="cl-verstuur">
        <p className="body-sm fx-muted">
          {mgr ? <>Gaat naar <b>{naamVan(verlof.mensen.get(mgr))}</b>{ik?.afdeling === "Montage" ? ", na advies van de montageplanning" : ""}.</> : "Er is nog geen manager aan je gekoppeld. Je aanvraag blijft wachten tot dat in Beheer is ingesteld."}
        </p>
        <Button variant="primary" size="lg" icon="send" disabled={!!b.fout || !!fouten.verleden} onClick={dien}>Aanvraag versturen</Button>
      </div>
    </div>
  );
}

function BotsingMelding({ botsingen, jij }: { botsingen: Botsing[]; jij?: boolean }) {
  const per = new Map<string, Dag[]>();
  for (const b of botsingen) per.set(b.projectnummer, [...(per.get(b.projectnummer) ?? []), b.datum]);
  return (
    <Alert tone="warning" title={jij ? "Je staat deze dagen ingepland" : "Staat ingepland op het planbord"}>
      {[...per].map(([p, d]) => `${p} (team ${botsingen.find((b) => b.projectnummer === p)!.team}) op ${d.map(kort).join(", ")}`).join("; ")}.
      {jij ? " De montageplanning kijkt mee voordat je manager beslist." : ""}
    </Alert>
  );
}

// ---- Context bij een aanvraag (manager en planner) ---------------------------------------
function Context({ a, verlof, planning }: { a: Verlofaanvraag; verlof: VerlofData; planning: Planning }) {
  const { data } = useSession();
  const m = verlof.mensen.get(a.personeelsnummer);
  const dagen = a.dagen.map((d) => d.datum);
  const saldo = berekenSaldo(data!.rows.verlofsaldo.find((v) => v.personeelsnummer === a.personeelsnummer), verlof.aanvragen, new Date().getFullYear());
  const pot = soortDef(a.soort).saldo === "adv" ? saldo?.adv : soortDef(a.soort).saldo ? saldo?.vakantie : undefined;
  // Wat er na goedkeuren overblijft: deze aanvraag telt nu al mee als "wacht op akkoord".
  const na = pot ? pot.beschikbaar : undefined;
  const botsingen = m?.afdeling === "Montage" ? geplandOp(a.personeelsnummer, dagen, planning.inzet, planning.teams) : [];
  const collegas = new Set(
    verlof.mensen.size
      ? [...verlof.mensen.values()].filter((x) => x.personeelsnummer !== a.personeelsnummer && ((m?.team && x.team === m.team) || verlof.managerVan(x.personeelsnummer) === verlof.managerVan(a.personeelsnummer))).map((x) => x.personeelsnummer)
      : [],
  );
  const ookWeg = opDagen(verlof.aanvragen, dagen).filter((x) => collegas.has(x.personeelsnummer) && x.id !== a.id);

  return (
    <div className="cl-context">
      {pot && (
        <span className={`body-sm ${na! < 0 ? "cl-rood" : ""}`}>
          <Icon name={na! < 0 ? "alert" : "check-circle"} />
          {soortDef(a.soort).label}saldo na goedkeuren: <b>{urenTekst(na!)}</b> ({dagenTekst(na!, VERLOFDAG_UREN)})
        </span>
      )}
      {botsingen.length > 0 && <BotsingMelding botsingen={botsingen} />}
      {ookWeg.length > 0 ? (
        <span className="body-sm"><Icon name="users" />Ook weg: {ookWeg.map((x) => `${naamVan(verlof.mensen.get(x.personeelsnummer))} (${periode(x)}${x.status === "aangevraagd" ? ", aangevraagd" : ""})`).join("; ")}</span>
      ) : (
        <span className="body-sm fx-muted"><Icon name="users" />Geen directe collega's met verlof in deze periode</span>
      )}
    </div>
  );
}

// ---- Te beoordelen (manager) ------------------------------------------------------------
function Beoordelen({ ik, lijst, verlof, planning, onMelding }: { ik: string; lijst: Verlofaanvraag[]; verlof: VerlofData; planning: Planning; onMelding(m: string): void }) {
  const [afwijzen, setAfwijzen] = useState<string | null>(null);
  const [reactie, setReactie] = useState("");
  const gesorteerd = [...lijst].sort((a, b) => a.van.localeCompare(b.van));
  const wachtOpAdvies = (a: Verlofaanvraag) => verlof.mensen.get(a.personeelsnummer)?.afdeling === "Montage" && !a.advies;
  const klaar = gesorteerd.filter((a) => !wachtOpAdvies(a));
  const wacht = gesorteerd.filter(wachtOpAdvies);
  const recent = verlof.aanvragen
    .filter((a) => a.beoordeeldDoor === ik && (a.status === "goedgekeurd" || a.status === "afgewezen"))
    .sort((a, b) => (b.beoordeeldOp ?? "").localeCompare(a.beoordeeldOp ?? ""))
    .slice(0, 8);

  const beslis = async (a: Verlofaanvraag, goed: boolean, tekst?: string) => {
    await verlof.bewaar({ ...a, status: goed ? "goedgekeurd" : "afgewezen", beoordeeldDoor: ik, beoordeeldOp: new Date().toISOString(), reactie: tekst?.trim() || undefined });
    setAfwijzen(null);
    setReactie("");
    const n = naamVan(verlof.mensen.get(a.personeelsnummer));
    onMelding(goed ? `Verlof van ${n} goedgekeurd.${verlof.mensen.get(a.personeelsnummer)?.afdeling === "Montage" ? " Het staat nu op het planbord." : ""}` : `Aanvraag van ${n} afgewezen.`);
  };

  const kaart = (a: Verlofaanvraag) => {
    const m = verlof.mensen.get(a.personeelsnummer);
    return (
      <li key={a.id} className="cl-kaart">
        <div className="cl-regel-hoofd">
          <div className="cl-regel-titel">
            <b>{naamVan(m)}</b>
            <span className="caption fx-muted">{m?.functie}{m?.team ? ` · ${m.team}` : ""}{m?.werkplek ? ` · ${m.werkplek}` : ""}</span>
          </div>
          <span className="caption fx-muted">Aangevraagd {tijd(a.aangevraagdOp)}</span>
        </div>
        <div className="cl-wat">
          <span className="cl-wat-soort">{soortDef(a.soort).label}{a.reden ? ` · ${a.reden}` : ""}</span>
          <span className="body-strong">{periode(a)}</span>
          <span className="body-sm">{urenTekst(a.totaal)} ({dagenTekst(a.totaal, VERLOFDAG_UREN)})</span>
        </div>
        {a.toelichting && <p className="body-sm cl-quote">“{a.toelichting}”</p>}
        {a.advies ? (
          <p className={`cl-advies body-sm ${a.advies.akkoord ? "is-ok" : "is-niet"}`}>
            <Icon name={a.advies.akkoord ? "check-circle" : "alert"} />
            <span><b>Advies planning: {a.advies.akkoord ? "akkoord" : "liever niet"}</b>{a.advies.tekst ? `. ${a.advies.tekst}` : ""} <span className="caption fx-muted">({a.advies.door}, {tijd(a.advies.op)})</span></span>
          </p>
        ) : m?.afdeling === "Montage" ? (
          <p className="cl-advies body-sm is-wacht"><Icon name="clock" />Wacht nog op advies van de montageplanning.</p>
        ) : null}
        <Context a={a} verlof={verlof} planning={planning} />
        {afwijzen === a.id ? (
          <div className="cl-afwijzen">
            <div className="fx-field">
              <label className="fx-label" htmlFor={`r-${a.id}`}>Waarom wijs je af?<span className="fx-req" aria-hidden="true">*</span></label>
              <textarea id={`r-${a.id}`} className="fx-textarea" value={reactie} onChange={(e) => setReactie(e.target.value)} placeholder="De medewerker ziet deze reactie" autoFocus />
            </div>
            <div className="fx-row">
              <Button variant="danger" disabled={!reactie.trim()} onClick={() => beslis(a, false, reactie)}>Afwijzen</Button>
              <Button variant="quiet" onClick={() => setAfwijzen(null)}>Annuleren</Button>
            </div>
          </div>
        ) : (
          <div className="fx-row">
            <Button variant="primary" icon="check" onClick={() => beslis(a, true)}>{wachtOpAdvies(a) ? "Toch goedkeuren" : "Goedkeuren"}</Button>
            <Button variant="secondary" onClick={() => { setAfwijzen(a.id); setReactie(""); }}>Afwijzen</Button>
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      {!lijst.length && <Alert tone="success" title="Alles is beoordeeld">Er wachten geen verlofaanvragen op jou.</Alert>}
      {klaar.length > 0 && (
        <section className="app-stack-sm" aria-labelledby="cl-klaar">
          <h2 id="cl-klaar" className="h3">Klaar om te beslissen ({klaar.length})</h2>
          <ul className="cl-lijst">{klaar.map(kaart)}</ul>
        </section>
      )}
      {wacht.length > 0 && (
        <section className="app-stack-sm" aria-labelledby="cl-wacht">
          <h2 id="cl-wacht" className="h3">Wacht op advies planning ({wacht.length})</h2>
          <p className="body-sm fx-muted">Bij monteurs kijkt de montageplanning eerst of het past. Je kunt ook al beslissen.</p>
          <ul className="cl-lijst">{wacht.map(kaart)}</ul>
        </section>
      )}
      {recent.length > 0 && (
        <details className="cl-eerder">
          <summary className="body-strong">Onlangs door jou beoordeeld ({recent.length})</summary>
          <ul className="cl-lijst">{recent.map((a) => <AanvraagRegel key={a.id} a={a} verlof={verlof} wie />)}</ul>
        </details>
      )}
    </>
  );
}

// ---- Advies van de montageplanning ------------------------------------------------------
function AdviesPlanning({ lijst, door, verlof, planning, onMelding }: { lijst: Verlofaanvraag[]; door: string; verlof: VerlofData; planning: Planning; onMelding(m: string): void }) {
  const [tekst, setTekst] = useState<Record<string, string>>({});
  const gesorteerd = useMemo(() => [...lijst].sort((a, b) => Number(!!a.advies) - Number(!!b.advies) || a.van.localeCompare(b.van)), [lijst]);
  const geef = async (a: Verlofaanvraag, akkoord: boolean) => {
    await verlof.bewaar({ ...a, advies: { door, op: new Date().toISOString(), akkoord, tekst: tekst[a.id]?.trim() || undefined } });
    onMelding(`Advies gegeven voor ${naamVan(verlof.mensen.get(a.personeelsnummer))}. De manager beslist.`);
  };
  if (!lijst.length) return <Alert tone="success" title="Geen openstaande aanvragen van monteurs" />;
  return (
    <section className="app-stack-sm" aria-label="Advies planning">
      <p className="body-sm fx-muted">Verlofaanvragen van monteurs. Geef aan of het in de planning past; de manager beslist daarna.</p>
      <ul className="cl-lijst">
        {gesorteerd.map((a) => {
          const m = verlof.mensen.get(a.personeelsnummer);
          return (
            <li key={a.id} className="cl-kaart">
              <div className="cl-regel-hoofd">
                <div className="cl-regel-titel">
                  <b>{naamVan(m)}</b>
                  <span className="caption fx-muted">{m?.functie}{m?.team ? ` · ${m.team}` : ""}</span>
                </div>
                {a.advies ? <StatusBadge tone={a.advies.akkoord ? "success" : "warning"}>{a.advies.akkoord ? "Akkoord gegeven" : "Liever niet"}</StatusBadge> : <StatusBadge status="wacht">Advies nodig</StatusBadge>}
              </div>
              <div className="cl-wat">
                <span className="cl-wat-soort">{soortDef(a.soort).label}</span>
                <span className="body-strong">{periode(a)}</span>
                <span className="body-sm">{urenTekst(a.totaal)}</span>
              </div>
              <Context a={a} verlof={verlof} planning={planning} />
              <div className="fx-field">
                <label className="fx-label" htmlFor={`adv-${a.id}`}>Toelichting voor de manager (optioneel)</label>
                <input id={`adv-${a.id}`} className="fx-input" value={tekst[a.id] ?? a.advies?.tekst ?? ""} onChange={(e) => setTekst({ ...tekst, [a.id]: e.target.value })} placeholder="Bijv. kan, team 3 vangt het op" />
              </div>
              <div className="fx-row">
                <Button variant={a.advies ? "secondary" : "primary"} icon="check" onClick={() => geef(a, true)}>Past in de planning</Button>
                <Button variant="secondary" icon="alert" onClick={() => geef(a, false)}>Liever niet</Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="caption fx-muted">Zie ook het <a href="#/montageplanning">planbord</a>: verlof staat daar bij de monteur.</p>
    </section>
  );
}


