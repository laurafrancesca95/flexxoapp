// Beheer: per medewerker de manager instellen die verlof goedkeurt.
// Startwaarde is de kolom Manager uit de Bemet-export; wat hier is ingesteld gaat voor.
import { useMemo, useState } from "react";
import { Alert, Button, StatTile } from "../brand";
import { useSession } from "../app/session";
import { kandidaatManagers, type ManagerKoppeling } from "../modules/collega/verlof";
import { useVerlof } from "../modules/collega/useVerlof";
import { naamVan } from "../modules/collega/CollegaPage";
import "../modules/collega/collega.css";

export function Beheer() {
  const { data, user } = useSession();
  const verlof = useVerlof();
  const [zoek, setZoek] = useState("");
  const [afdeling, setAfdeling] = useState("");
  const [alleenZonder, setAlleenZonder] = useState(false);
  const [gekozen, setGekozen] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState("");
  const [melding, setMelding] = useState<string | null>(null);

  const medewerkers = data?.rows.medewerkers ?? [];
  const managers = useMemo(() => kandidaatManagers(medewerkers, verlof.koppelingen).sort((a, b) => naamVan(a).localeCompare(naamVan(b))), [medewerkers, verlof.koppelingen]);
  if (!data || !verlof.geladen) return <p className="fx-muted">Laden…</p>;

  const afdelingen = [...new Set(medewerkers.map((m) => m.afdeling))].sort();
  const zonder = medewerkers.filter((m) => !verlof.managerVan(m.personeelsnummer));
  const aangepast = medewerkers.filter((m) => verlof.koppelingen.has(m.personeelsnummer));
  const lijst = medewerkers
    .filter((m) => !afdeling || m.afdeling === afdeling)
    .filter((m) => !alleenZonder || !verlof.managerVan(m.personeelsnummer))
    .filter((m) => !zoek || `${m.voornaam} ${m.achternaam} ${m.functie} ${m.personeelsnummer} ${m.team ?? ""}`.toLowerCase().includes(zoek.toLowerCase()))
    .sort((a, b) => a.afdeling.localeCompare(b.afdeling) || naamVan(a).localeCompare(naamVan(b)));

  const k = (id: string, manager: string): ManagerKoppeling => ({ id, manager, gewijzigdDoor: user?.name, gewijzigdOp: new Date().toISOString() });
  const zet = async (pnr: string, manager: string) => {
    const bemet = data.rows.medewerkers.find((m) => m.personeelsnummer === pnr)?.manager ?? "";
    // Terug naar de waarde uit Bemet = koppeling weghalen, zodat een latere Bemet-wijziging weer doorkomt.
    if (manager === bemet) await verlof.ontkoppel([pnr]);
    else await verlof.koppel([k(pnr, manager)]);
    setMelding(null);
  };
  const koppelBulk = async () => {
    if (!bulk || !gekozen.size) return;
    await verlof.koppel([...gekozen].filter((p) => p !== bulk).map((p) => k(p, bulk)));
    setMelding(`${gekozen.size} medewerkers gekoppeld aan ${naamVan(verlof.mensen.get(bulk))}.`);
    setGekozen(new Set());
  };
  const wissel = (pnr: string) => {
    const n = new Set(gekozen);
    if (n.has(pnr)) n.delete(pnr);
    else n.add(pnr);
    setGekozen(n);
  };
  const alleAan = lijst.length > 0 && lijst.every((m) => gekozen.has(m.personeelsnummer));

  return (
    <div className="cl">
      <div>
        <h2 className="h2">Managers koppelen</h2>
        <p className="body-sm fx-muted">De gekoppelde manager keurt het verlof van de medewerker goed. Standaard staat hier de manager uit Bemet; een keuze hier gaat voor.</p>
      </div>
      <div className="fx-stats">
        <StatTile label="Medewerkers" value={medewerkers.length} />
        <StatTile label="Zonder manager" value={zonder.length} foot={zonder.length ? "Hun aanvragen komen nergens aan" : "Iedereen is gekoppeld"} />
        <StatTile label="Aangepast in de app" value={aangepast.length} foot="Wijkt af van Bemet" />
      </div>
      {melding && <Alert tone="success" title={melding} />}

      <div className="cl-filters">
        <div className="fx-field">
          <label className="fx-label" htmlFor="bh-zoek">Zoeken</label>
          <input id="bh-zoek" className="fx-input" type="search" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="Naam, functie of nummer" />
        </div>
        <div className="fx-field">
          <label className="fx-label" htmlFor="bh-afd">Afdeling</label>
          <select id="bh-afd" className="fx-select" value={afdeling} onChange={(e) => setAfdeling(e.target.value)}>
            <option value="">Alle afdelingen</option>
            {afdelingen.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <label className="cl-check"><input type="checkbox" checked={alleenZonder} onChange={(e) => setAlleenZonder(e.target.checked)} /> Alleen zonder manager</label>
      </div>

      {gekozen.size > 0 && (
        <div className="cl-bulk" role="region" aria-label="Geselecteerde medewerkers koppelen">
          <span className="body-strong">{gekozen.size} geselecteerd</span>
          <select className="fx-select" aria-label="Manager voor de selectie" value={bulk} onChange={(e) => setBulk(e.target.value)}>
            <option value="">Kies een manager</option>
            {managers.map((m) => <option key={m.personeelsnummer} value={m.personeelsnummer}>{naamVan(m)} · {m.functie}</option>)}
          </select>
          <Button variant="primary" disabled={!bulk} onClick={koppelBulk}>Koppelen</Button>
          <Button variant="quiet" onClick={() => setGekozen(new Set())}>Selectie wissen</Button>
        </div>
      )}

      <div className="fx-table-wrap">
        <table className="fx-table cl-beheer">
          <thead>
            <tr>
              <th scope="col" className="cl-kolom-check"><input type="checkbox" aria-label="Alles selecteren" checked={alleAan} onChange={() => setGekozen(alleAan ? new Set() : new Set(lijst.map((m) => m.personeelsnummer)))} /></th>
              <th scope="col">Medewerker</th>
              <th scope="col">Afdeling</th>
              <th scope="col">Manager (keurt verlof goed)</th>
              <th scope="col">Bron</th>
            </tr>
          </thead>
          <tbody>
            {lijst.map((m) => {
              const mgr = verlof.managerVan(m.personeelsnummer) ?? "";
              const eigen = verlof.koppelingen.get(m.personeelsnummer);
              return (
                <tr key={m.personeelsnummer} className={!mgr ? "is-leeg" : ""}>
                  <td className="cl-kolom-check"><input type="checkbox" aria-label={`Selecteer ${naamVan(m)}`} checked={gekozen.has(m.personeelsnummer)} onChange={() => wissel(m.personeelsnummer)} /></td>
                  <td><b>{naamVan(m)}</b><div className="caption fx-muted">{m.functie}{m.team ? ` · ${m.team}` : ""} · <span className="fx-code">{m.personeelsnummer}</span></div></td>
                  <td>{m.afdeling}</td>
                  <td>
                    <select className="fx-select" aria-label={`Manager van ${naamVan(m)}`} value={mgr} onChange={(e) => zet(m.personeelsnummer, e.target.value)}>
                      <option value="">Geen manager</option>
                      {managers.filter((x) => x.personeelsnummer !== m.personeelsnummer).map((x) => <option key={x.personeelsnummer} value={x.personeelsnummer}>{naamVan(x)} · {x.functie}</option>)}
                    </select>
                  </td>
                  <td className="caption">
                    {eigen ? (
                      <span>
                        Aangepast{eigen.gewijzigdDoor ? ` door ${eigen.gewijzigdDoor}` : ""}
                        {" "}<button type="button" className="cl-link" onClick={() => verlof.ontkoppel([m.personeelsnummer])}>terug naar Bemet</button>
                      </span>
                    ) : m.manager ? <span className="fx-muted">Bemet</span> : <span className="cl-rood">Ontbreekt</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!lijst.length && <p className="fx-muted">Geen medewerkers gevonden.</p>}
      <p className="caption fx-muted">Testfase: koppelingen worden in deze browser bewaard. Later in de centrale database van de app, zodat iedereen dezelfde koppeling ziet.</p>
    </div>
  );
}
