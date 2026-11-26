// Goedgekeurd verlof als Excel klaarzetten voor import in Bemet (één regel per dag).
import { useState } from "react";
import writeXlsxFile from "write-excel-file/browser";
import { Alert, Button, DataTable } from "../../brand";
import { BEMET_IMPORT_KOPPEN, bemetRegels, urenTekst, type Verlofaanvraag } from "./verlof";
import type { VerlofData } from "./useVerlof";

export function BemetExport({ lijst, verlof, door, onMelding }: { lijst: Verlofaanvraag[]; verlof: VerlofData; door: string; onMelding(m: string): void }) {
  const [bezig, setBezig] = useState(false);
  const regels = bemetRegels(lijst, verlof.mensen);
  const totaal = regels.reduce((s, r) => s + r.uren, 0);

  const exporteer = async () => {
    setBezig(true);
    try {
      const nu = new Date();
      const stempel = `${nu.getFullYear()}${String(nu.getMonth() + 1).padStart(2, "0")}${String(nu.getDate()).padStart(2, "0")}-${String(nu.getHours()).padStart(2, "0")}${String(nu.getMinutes()).padStart(2, "0")}`;
      const datum = (d?: Date) => (d ? { value: d, type: Date, format: "dd-mm-yyyy" } : null);
      const sheet = [
        BEMET_IMPORT_KOPPEN.map((h) => ({ value: h, fontWeight: "bold" as const })),
        ...regels.map((r) => [r.personeelsnummer, r.naam, datum(r.datum), r.uren, r.soort, r.reden, r.aanvraag, r.door, datum(r.op)]),
      ];
      await writeXlsxFile(sheet as never, { sheet: "Verlof", stickyRowsCount: 1 }).toFile(`Verlof_import_Bemet_${stempel}.xlsx`);
      await verlof.registreerExport({ id: `EXP-${stempel}`, op: nu.toISOString(), door, regels: regels.length, aanvragen: lijst.map((a) => a.id) }, lijst);
      onMelding(`${regels.length} regels (${urenTekst(totaal)}) klaargezet voor Bemet.`);
    } finally {
      setBezig(false);
    }
  };

  const eerder = [...verlof.exports].sort((a, b) => b.op.localeCompare(a.op)).slice(0, 6);

  return (
    <section className="app-stack-sm" aria-label="Export naar Bemet">
      <p className="body-sm fx-muted">
        Goedgekeurd verlof dat nog niet in Bemet staat. De export heeft één regel per dag. Na het downloaden telt het saldo in de app deze uren niet meer
        dubbel: ze komen terug via de volgende export Verlofsaldo uit Bemet.
      </p>
      {!regels.length ? (
        <Alert tone="success" title="Alles staat in Bemet">Er is geen goedgekeurd verlof dat nog geëxporteerd moet worden.</Alert>
      ) : (
        <>
          <div className="cl-kop">
            <span className="body-strong">{lijst.length} aanvragen · {regels.length} regels · {urenTekst(totaal)}</span>
            <Button variant="primary" icon="file" disabled={bezig} onClick={exporteer}>{bezig ? "Bezig…" : "Download Excel voor Bemet"}</Button>
          </div>
          <DataTable
            caption="Voorbeeld van de export"
            density="compact"
            rows={regels.slice(0, 40)}
            columns={[
              { key: "personeelsnummer", label: "Pers.nr" },
              { key: "naam", label: "Naam" },
              { key: "datum", label: "Datum", render: (r) => r.datum.toLocaleDateString("nl-NL", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }) },
              { key: "uren", label: "Uren", numeric: true, render: (r) => urenTekst(r.uren) },
              { key: "soort", label: "Soort", render: (r) => `${r.soort}${r.reden ? ` · ${r.reden}` : ""}` },
              { key: "door", label: "Goedgekeurd door" },
            ]}
          />
          {regels.length > 40 && <p className="caption fx-muted">En nog {regels.length - 40} regels in het bestand.</p>}
        </>
      )}
      {eerder.length > 0 && (
        <details className="cl-eerder">
          <summary className="body-strong">Eerdere exports</summary>
          <ul className="cl-exports body-sm">
            {eerder.map((e) => <li key={e.id}>{new Date(e.op).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {e.regels} regels · {e.door}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
}
