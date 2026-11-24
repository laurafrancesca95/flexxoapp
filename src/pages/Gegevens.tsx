import { useRef } from "react";
import { Alert, Button, Card, DataTable, StatusBadge } from "../brand";
import { EXPORT_LIST, type ExportId } from "../core/data/exports";
import type { ExportState } from "../core/data/repository";
import { config } from "../core/config";
import { useSession } from "../app/session";
import { num, peilmoment } from "../app/format";

const TONE: Record<ExportState["status"], "success" | "warning" | "danger" | "neutral"> = {
  ok: "success",
  waarschuwing: "warning",
  fout: "danger",
  ontbreekt: "neutral",
};
const LABEL: Record<ExportState["status"], string> = { ok: "In orde", waarschuwing: "Let op", fout: "Fout", ontbreekt: "Ontbreekt" };

export function Gegevens() {
  const { data, overrides, setOverride, reload } = useSession();
  if (!data) return <p className="fx-muted">Data laden…</p>;

  const rows = EXPORT_LIST.map((spec) => ({ id: spec.id, st: data.states[spec.id] }));

  return (
    <div className="app-stack">
      <Alert tone="info" title="Waar komt de data vandaan?">
        In de testfase leest de app verzonnen Excel-bestanden in het formaat van de automatische Bemet-exports.
        Bij de livegang leest dezelfde code de echte exports uit een SharePoint-map. Je kunt hieronder ook een eigen
        bestand proberen; dat blijft alleen in deze browser en verdwijnt als je de pagina ververst.
      </Alert>

      <Card title="Geladen exports" subtitle={`Geladen om ${peilmoment(data.loadedAt)}`} action={<Button variant="quiet" size="sm" onClick={reload}>Opnieuw laden</Button>}>
        <DataTable
          caption="Geladen exports"
          rows={rows}
          columns={[
            { key: "label", label: "Export", render: (r) => <strong>{r.st.spec.label}</strong> },
            { key: "file", label: "Bestand", render: (r) => <span className="fx-code">{r.st.spec.fileName}</span> },
            { key: "at", label: "Peilmoment", render: (r) => peilmoment(r.st.exportedAt) },
            { key: "n", label: "Rijen", numeric: true, render: (r) => num(r.st.rowCount) },
            { key: "s", label: "Status", render: (r) => <StatusBadge tone={TONE[r.st.status]}>{LABEL[r.st.status]}</StatusBadge> },
          ]}
        />
      </Card>

      {EXPORT_LIST.map((spec) => (
        <ExportCard key={spec.id} id={spec.id} st={data.states[spec.id]} overridden={!!overrides[spec.id]}
          onFile={(f) => setOverride(spec.id, f ? { data: f, origin: `Eigen bestand (${f.name})`, exportedAt: new Date(f.lastModified) } : null)} />
      ))}
    </div>
  );
}

function ExportCard({ id, st, overridden, onFile }: { id: ExportId; st: ExportState; overridden: boolean; onFile: (f: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const { spec } = st;
  return (
    <Card title={spec.label} subtitle={spec.description}>
      <div className="app-stack-sm">
        {st.error && <Alert tone="danger" title="Bestand niet te lezen">{st.error}</Alert>}
        {st.missingColumns.length > 0 && (
          <Alert tone="danger" title="Verplichte kolommen ontbreken">
            {st.missingColumns.join(", ")}. Controleer de kopnamen in rij 1.
          </Alert>
        )}
        {st.issues.length > 0 && (
          <Alert tone="warning" title={`${st.issues.length} ${st.issues.length === 1 ? "melding" : "meldingen"}`}>
            <ul className="app-issues">
              {st.issues.slice(0, 5).map((i, n) => (
                <li key={n}>Rij {i.row}{i.column ? `, ${i.column}` : ""}: {i.message}</li>
              ))}
            </ul>
          </Alert>
        )}
        {st.unknownColumns.length > 0 && (
          <p className="body-sm fx-muted">Extra kolommen genegeerd: {st.unknownColumns.join(", ")}</p>
        )}
        <p className="body-sm fx-muted">
          Bron: {st.origin ?? "–"} · Gebruikt door {spec.usedBy.join(", ")}
        </p>

        <details className="app-details">
          <summary className="label">Kolomformaat ({spec.columns.length} kolommen)</summary>
          <DataTable
            caption={`Kolommen ${spec.label}`}
            rows={spec.columns.map((c) => ({ ...c, id: c.key }))}
            columns={[
              { key: "header", label: "Kolom", render: (c) => <strong>{c.header}</strong> },
              { key: "type", label: "Type", render: (c) => ({ text: "Tekst", number: "Getal", date: "Datum", boolean: "J/N" })[c.type] },
              { key: "required", label: "Verplicht", render: (c) => (c.required ? "Ja" : "Nee") },
              { key: "example", label: "Voorbeeld", render: (c) => <span className="fx-code">{c.example}</span> },
            ]}
          />
        </details>

        <div className="app-testbox-actions">
          <input ref={input} type="file" accept=".xlsx" hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          <Button variant="secondary" icon="file" onClick={() => input.current?.click()}>Eigen bestand testen</Button>
          {overridden ? (
            <Button variant="quiet" onClick={() => { if (input.current) input.current.value = ""; onFile(null); }}>Terug naar testdata</Button>
          ) : (
            <a className="fx-btn fx-btn-quiet" href={`${config.baseUrl}data/${spec.fileName}`} download data-export={id}>Testbestand downloaden</a>
          )}
        </div>
      </div>
    </Card>
  );
}
