// Urenbriefje van de monteur: vooraf ingevuld vanuit de gepubliceerde planning, per dag aan te passen en in te dienen.
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Icon, StatusBadge } from "../../brand";
import { useSession } from "../../app/session";
import { navigate } from "../../app/router";
import { num } from "../../app/format";
import { store } from "../../core/store";
import type { Montageproject } from "../../core/data/exports";
import { dagVan, isWeekend, isoWeek, maandagVan, naarDate, plusDagen, weekSleutel, type Dag } from "../montageplanning/model";
import { weekVanMonteur, type Publicatie } from "../montageplanning/publicatie";
import {
  CHAUFFEUR, GEREISD, KWARTIEREN, MAX_BLOKKEN, STARTPUNT, WERKPLAATS, controleer, duur, isReis, leegBlok, totalen, vulVooraf,
  type BriefjeDag, type Tijdblok, type Urenbriefje,
} from "./urenbriefje";

const COLLECTIE = "uren-briefjes";
const datumLang = (d: Dag) => naarDate(d).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
const datumKort = (d: Dag) => naarDate(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
const u = (n: number) => `${num(Math.round(n * 100) / 100)} u`;

/** Maandag van een weeksleutel als "2026-W48". */
function maandagVanWeek(w: string): Dag | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(w);
  if (!m) return null;
  const jan4 = dagVan(new Date(Number(m[1]), 0, 4));
  return plusDagen(maandagVan(jan4), (Number(m[2]) - 1) * 7);
}

export function UrenbriefjePage({ path, pnr, publicaties, projecten }: {
  path: string; pnr: string; publicaties: Publicatie[]; projecten: Map<string, Montageproject>;
}) {
  const { user } = useSession();
  const maandag = maandagVanWeek(path.split("/uren/")[1] ?? "") ?? maandagVan(dagVan(new Date()));
  const week = weekSleutel(maandag);
  const pub = publicaties.find((p) => p.id === week);
  const [br, setBr] = useState<Urenbriefje | null>(null);
  const [opgeslagen, setOpgeslagen] = useState(false);
  const [toonFouten, setToonFouten] = useState(false);

  useEffect(() => {
    let weg = false;
    setBr(null);
    setToonFouten(false);
    store.get<Urenbriefje>(COLLECTIE).then((alle) => {
      if (weg) return;
      const eigen = alle.find((b) => b.id === `${week}|${pnr}`);
      setOpgeslagen(!!eigen);
      setBr(eigen ?? vulVooraf(pub, pnr, week, maandag, projecten));
    });
    return () => {
      weg = true;
    };
  }, [week, pnr, pub?.versie]); // eslint-disable-line react-hooks/exhaustive-deps

  const mijn = weekVanMonteur(pub, pnr);
  const projectOpties = useMemo(() => {
    const nrs = [...new Set((mijn?.inzet ?? []).map((i) => i.projectnummer))];
    return [...nrs.map((nr) => ({ nr, naam: projecten.get(nr) ? `${projecten.get(nr)!.plaats} (${projecten.get(nr)!.land})` : nr })), { nr: WERKPLAATS, naam: "Werkplaats" }];
  }, [mijn, projecten]);

  if (!br) return <p className="fx-muted">Urenbriefje laden…</p>;
  const ingediend = br.status === "ingediend";
  const meldingen = controleer(br);
  const tot = totalen(br);
  const { week: kw } = isoWeek(maandag);
  const nieuwerePlanning = pub && br.bronVersie != null && pub.versie > br.bronVersie && !ingediend;

  const bewaar = async (n: Urenbriefje) => {
    setBr(n);
    await store.put(COLLECTIE, n);
    setOpgeslagen(true);
  };
  const zetDag = (k: number, d: Partial<BriefjeDag>) => bewaar({ ...br, dagen: br.dagen.map((x, j) => (j === k ? { ...x, ...d } : x)) });
  const zetBlok = (k: number, id: string, b: Partial<Tijdblok>) =>
    zetDag(k, { blokken: br.dagen[k].blokken.map((x) => (x.id === id ? { ...x, ...b, uitPlanning: false } : x)) });
  const ga = (m: Dag) => navigate(`/montage/uren/${weekSleutel(m)}`);

  return (
    <div className="mt ub">
      <div>
        <Button variant="quiet" onClick={() => navigate("/montage")}><span className="mt-terug"><Icon name="chevron-right" /></span>Terug naar mijn week</Button>
      </div>

      <div className="mt-weekkop">
        <span className="mt-prev"><Button variant="secondary" icon="chevron-right" label="Vorige week" onClick={() => ga(plusDagen(maandag, -7))} /></span>
        <div className="mt-weektitel">
          <span className="h2">Urenbriefje week {kw}</span>
          <span className="body-sm fx-muted">{datumKort(maandag)} t/m {datumKort(plusDagen(maandag, 6))}</span>
        </div>
        <Button variant="secondary" icon="chevron-right" label="Volgende week" onClick={() => ga(plusDagen(maandag, 7))} />
      </div>

      <section className="mt-blok ub-kop">
        <div className="ub-kop-rij">
          <div>
            <span className="label fx-muted">Naam</span>
            <div className="body-strong">{user?.role === "monteur" ? user.name : `Monteur ${pnr}`}{br.team ? ` · Team ${br.team}` : ""}</div>
          </div>
          {ingediend ? <StatusBadge tone="success">Ingediend</StatusBadge> : <StatusBadge tone="neutral">Concept</StatusBadge>}
        </div>
        <div className="ub-kop-rij">
          <label className="ub-veld">
            <span className="label">Startpunt van de week</span>
            <select className="fx-select" disabled={ingediend} value={br.startpunt} onChange={(e) => bewaar({ ...br, startpunt: e.target.value as Urenbriefje["startpunt"] })}>
              {STARTPUNT.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <div className="ub-totaal"><span className="label fx-muted">Werkuren</span><b>{u(tot.werk)}</b></div>
          <div className="ub-totaal"><span className="label fx-muted">Reisuren</span><b>{u(tot.reis)}</b></div>
        </div>
        {!pub && <Alert tone="info" title="Deze week is nog niet gepubliceerd">Je kunt je uren wel zelf invullen; vooraf invullen kan zodra de planning er is.</Alert>}
        {pub && br.dagen.some((d) => d.blokken.some((b) => b.uitPlanning)) && !ingediend && (
          <p className="body-sm ub-uitleg"><Icon name="info" /><span>Blokken met <span className="ub-plan">uit planning</span> zijn vooraf ingevuld. Controleer de tijden; reistijden vul je zelf in. Rijden hotel → bouwplaats → hotel is geen reis.</span></p>
        )}
        {nieuwerePlanning && (
          <Alert tone="warning" title="De planning is gewijzigd sinds je begon">
            <Button size="sm" variant="secondary" onClick={() => bewaar(vulVooraf(pub, pnr, week, maandag, projecten))}>Opnieuw invullen vanuit planning</Button> Je eigen aanpassingen gaan dan verloren.
          </Alert>
        )}
      </section>

      {br.dagen.map((d, k) => {
        const dt = tot.perDag[k];
        const fout = new Set(meldingen.filter((m) => m.datum === d.datum).map((m) => m.blok));
        return (
          <section key={d.datum} className={`mt-blok ub-dag ${isWeekend(d.datum) ? "is-weekend" : ""} ${d.datum === dagVan(new Date()) ? "is-today" : ""}`}>
            <div className="ub-dagkop">
              <b className="ub-datum">{datumLang(d.datum)}</b>
              <span className="body-sm fx-muted">{dt.werk || dt.reis ? `${u(dt.werk)} werk${dt.reis ? ` · ${u(dt.reis)} reis` : ""}` : "Geen uren"}</span>
            </div>
            {d.blokken.map((b, bi) => (
              <div key={b.id} className={`ub-blok ${isReis(b) ? "is-reis" : ""} ${toonFouten && fout.has(b.id) ? "is-fout" : ""}`}>
                <div className="ub-blok-kop">
                  <span className="label">{isReis(b) ? "Reis" : "Werk"} {bi + 1}</span>
                  {b.uitPlanning && <span className="ub-plan">uit planning</span>}
                  <span className="ub-duur">{duur(b) ? u(duur(b)) : ""}</span>
                  {!ingediend && <button type="button" className="mp-x" aria-label="Blok verwijderen" onClick={() => zetDag(k, { blokken: d.blokken.filter((x) => x.id !== b.id) })}>×</button>}
                </div>
                <fieldset className="ub-velden" disabled={ingediend}>
                  <label className="ub-veld"><span className="label">Van</span>
                    <select className="fx-select" value={b.van} onChange={(e) => zetBlok(k, b.id, { van: e.target.value })}>
                      <option value="">--:--</option>{KWARTIEREN.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="ub-veld"><span className="label">Tot</span>
                    <select className="fx-select" value={b.tot} onChange={(e) => zetBlok(k, b.id, { tot: e.target.value })}>
                      <option value="">--:--</option>{KWARTIEREN.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </label>
                  <label className="ub-veld ub-breed"><span className="label">Project</span>
                    <select className="fx-select" value={b.projectnummer} onChange={(e) => {
                      const o = projectOpties.find((x) => x.nr === e.target.value);
                      zetBlok(k, b.id, { projectnummer: e.target.value, projectnaam: o?.naam ?? "" });
                    }}>
                      <option value="">Kies…</option>
                      {[...projectOpties, ...(b.projectnummer && !projectOpties.some((o) => o.nr === b.projectnummer) ? [{ nr: b.projectnummer, naam: b.projectnaam }] : [])].map((o) => (
                        <option key={o.nr} value={o.nr}>{o.nr === WERKPLAATS ? o.naam : `${o.naam} · ${o.nr}`}</option>
                      ))}
                    </select>
                  </label>
                  <label className="ub-veld"><span className="label">Gereisd?</span>
                    <select className="fx-select" value={b.gereisd} onChange={(e) => zetBlok(k, b.id, { gereisd: e.target.value as Tijdblok["gereisd"], chauffeur: e.target.value === "Nee" ? "" : b.chauffeur })}>
                      {GEREISD.map((g) => <option key={g}>{g}</option>)}
                    </select>
                  </label>
                  {isReis(b) && (
                    <label className="ub-veld"><span className="label">Chauffeur?</span>
                      <select className="fx-select" value={b.chauffeur} onChange={(e) => zetBlok(k, b.id, { chauffeur: e.target.value as Tijdblok["chauffeur"] })}>
                        <option value="">Kies…</option>{CHAUFFEUR.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </label>
                  )}
                  <label className="ub-check"><input type="checkbox" checked={b.bouwleider} onChange={(e) => zetBlok(k, b.id, { bouwleider: e.target.checked })} /> Bouwleider</label>
                  <label className="ub-veld ub-vol"><span className="label">Opmerking{b.gereisd === "Ja, vlucht/trein/boot/anders" ? " (vertrek, aankomst en reistijd)" : ""}</span>
                    <input className="fx-input" value={b.opmerking} onChange={(e) => zetBlok(k, b.id, { opmerking: e.target.value })} />
                  </label>
                </fieldset>
                {toonFouten && meldingen.filter((m) => m.blok === b.id).map((m) => <p key={m.tekst} className="ub-fout"><Icon name="alert" />{m.tekst}</p>)}
              </div>
            ))}
            {!ingediend && (
              <div className="ub-dagvoet">
                <Button size="sm" variant="quiet" icon="plus" disabled={d.blokken.length >= MAX_BLOKKEN} onClick={() => {
                  const vorige = d.blokken[d.blokken.length - 1];
                  zetDag(k, { blokken: [...d.blokken, leegBlok({ van: vorige?.tot ?? "", projectnummer: vorige?.projectnummer ?? "", projectnaam: vorige?.projectnaam ?? "", bouwleider: vorige?.bouwleider ?? false })] });
                }}>Tijdblok</Button>
                <label className="ub-check"><input type="checkbox" checked={d.hotel} onChange={(e) => zetDag(k, { hotel: e.target.checked })} /> Overnachting hotel (naar de volgende dag)</label>
                <label className="ub-km"><span className="label">Privé km</span>
                  <input className="fx-input" type="number" min={0} inputMode="numeric" value={d.priveKm || ""} onChange={(e) => zetDag(k, { priveKm: Math.max(0, Number(e.target.value) || 0) })} />
                </label>
              </div>
            )}
            {ingediend && (d.hotel || d.priveKm > 0) && <p className="body-sm fx-muted">{d.hotel ? "Overnachting hotel. " : ""}{d.priveKm ? `${d.priveKm} privé km.` : ""}</p>}
          </section>
        );
      })}

      <div className="ub-acties">
        {ingediend ? (
          <>
            <span className="body-sm">Ingediend op {new Date(br.ingediendOp!).toLocaleString("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. De administratie controleert je uren.</span>
            <Button variant="secondary" onClick={() => bewaar({ ...br, status: "concept", ingediendOp: undefined })}>Terugzetten naar concept</Button>
          </>
        ) : (
          <>
            <span className="body-sm fx-muted">{opgeslagen ? "Automatisch opgeslagen als concept." : "Nog niet opgeslagen: pas iets aan of dien in."}{toonFouten && meldingen.length ? ` Nog ${meldingen.length} ${meldingen.length === 1 ? "punt" : "punten"} te controleren.` : ""}</span>
            <Button variant="primary" icon="send" onClick={() => {
              if (meldingen.length) {
                setToonFouten(true);
                document.querySelector(".ub-blok.is-fout")?.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => document.querySelector(".ub-blok.is-fout")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
                return;
              }
              bewaar({ ...br, status: "ingediend", ingediendOp: new Date().toISOString() });
            }}>Urenbriefje indienen</Button>
          </>
        )}
      </div>
    </div>
  );
}

/** Kaartje in Mijn week dat naar het urenbriefje van die week gaat. */
export function UrenbriefjeKaart({ week, pnr }: { week: string; pnr: string }) {
  const [status, setStatus] = useState<Urenbriefje["status"] | "nieuw">("nieuw");
  useEffect(() => {
    store.get<Urenbriefje>(COLLECTIE).then((a) => setStatus(a.find((b) => b.id === `${week}|${pnr}`)?.status ?? "nieuw"));
  }, [week, pnr]);
  return (
    <button type="button" className="mt-order ub-kaart" onClick={() => navigate(`/montage/uren/${week}`)}>
      <div className="mt-order-kop">
        <Icon name="clock" />
        <span className="mt-order-titel">Urenbriefje week {Number(week.slice(-2))}</span>
        {status === "ingediend" ? <StatusBadge tone="success">Ingediend</StatusBadge> : status === "concept" ? <StatusBadge tone="neutral">Concept</StatusBadge> : <StatusBadge tone="info">Klaar om te controleren</StatusBadge>}
        <Icon name="chevron-right" className="mt-chevron" />
      </div>
      <span className="body-sm fx-muted">Vooraf ingevuld vanuit je planning. Controleer, vul reistijden aan en dien in.</span>
    </button>
  );
}
