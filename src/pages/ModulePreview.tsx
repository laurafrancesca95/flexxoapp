import type { ReactNode } from "react";
import { Alert, Card, DataTable, Icon, type DataTableColumn } from "../brand";
import type { AppUser } from "../core/auth";
import type { DataSnapshot } from "../core/data/repository";
import { EXPORTS } from "../core/data/exports";
import type { ModuleId } from "../core/roles";
import { MODULES } from "../modules/registry";
import { useSession } from "../app/session";
import { Status } from "../app/status";
import { datum, num, peilmoment, uren } from "../app/format";

type Row = Record<string, unknown> & { id: string };
interface Preview { title: string; subtitle: string; columns: DataTableColumn<Row>[]; rows: Row[] }

const code = (k: string): DataTableColumn<Row> => ({ key: k, label: k === "ordernummer" ? "Order" : "Project", render: (r) => <span className="fx-code">{String(r[k])}</span> });
const status: DataTableColumn<Row> = { key: "status", label: "Status", render: (r) => <Status value={String(r.status)} /> };

function previewFor(id: ModuleId, user: AppUser, data: DataSnapshot): Preview {
  const { projecten, productieorders, verlofsaldo, calculatieregels } = data.rows;
  const P = (xs: object[], key: string) => xs.map((x) => ({ ...(x as Record<string, unknown>), id: String((x as Record<string, unknown>)[key]) }));

  switch (id) {
    case "montageplanning":
      return {
        title: "Nog te plannen",
        subtitle: "Projecten met status Te plannen, op gewenste startdatum",
        columns: [code("projectnummer"), { key: "klant", label: "Klant" }, { key: "plaats", label: "Plaats" },
          { key: "montageStart", label: "Gewenste start", render: (r) => <span className="app-nowrap">{datum(r.montageStart as Date)}</span> },
          { key: "vcUrenMontage", label: "VC-uren", numeric: true, render: (r) => uren(r.vcUrenMontage as number) }],
        rows: P(projecten.filter((p) => p.status === "Te plannen" && (p.vcUrenMontage ?? 0) > 0).sort((a, b) => +(a.montageStart ?? 0) - +(b.montageStart ?? 0)).slice(0, 8), "projectnummer"),
      };
    case "montage":
      return {
        title: "Projecten in montage",
        subtitle: "Straks staat hier jouw weekplanning met de actieve order bovenaan",
        columns: [code("projectnummer"), { key: "omschrijving", label: "Omschrijving" }, { key: "plaats", label: "Plaats" }, status],
        rows: P(projecten.filter((p) => ["In montage", "Gepland"].includes(p.status)).slice(0, 8), "projectnummer"),
      };
    case "logistiek": {
      const colli = (nr: string) => calculatieregels.filter((c) => c.projectnummer === nr && c.soort === "Colli");
      return {
        title: "Te versturen",
        subtitle: "Projecten gereed voor transport of in productie, met colli uit de calculatie",
        columns: [code("projectnummer"), { key: "klant", label: "Klant" },
          { key: "leverdatum", label: "Leverdatum", render: (r) => <span className="app-nowrap">{datum(r.leverdatum as Date)}</span> },
          { key: "colli", label: "Colli", numeric: true, render: (r) => num(colli(String(r.projectnummer)).reduce((a, c) => a + c.aantal, 0)) },
          { key: "gewicht", label: "Gewicht", numeric: true, render: (r) => `${num(colli(String(r.projectnummer)).reduce((a, c) => a + c.aantal * (c.gewicht ?? 0), 0))} kg` },
          status],
        rows: P(projecten.filter((p) => ["Gereed voor transport", "In productie"].includes(p.status)).sort((a, b) => +a.leverdatum - +b.leverdatum).slice(0, 8), "projectnummer"),
      };
    }
    case "productie": {
      const mine = productieorders.filter((o) => !user.werkplek || o.werkplek === user.werkplek);
      return {
        title: user.werkplek ? `Orders voor ${user.werkplek}` : "Productieorders",
        subtitle: "In werkvolgorde, ingeplande en lopende orders",
        columns: [code("ordernummer"), code("projectnummer"), { key: "omschrijving", label: "Omschrijving" },
          { key: "vcUren", label: "VC-uren", numeric: true, render: (r) => uren(r.vcUren as number) }, status],
        rows: P(mine.filter((o) => ["Gepland", "In productie", "Afwijking"].includes(o.status)).sort((a, b) => +(a.start ?? Infinity) - +(b.start ?? Infinity)).slice(0, 8), "ordernummer"),
      };
    }
    case "productieplanning":
      return {
        title: "In te plannen",
        subtitle: "Productieorders zonder geplande start",
        columns: [code("ordernummer"), code("projectnummer"), { key: "werkplek", label: "Werkplek" },
          { key: "vcUren", label: "VC-uren", numeric: true, render: (r) => uren(r.vcUren as number) }, status],
        rows: P(productieorders.filter((o) => o.status === "Te plannen").slice(0, 8), "ordernummer"),
      };
    case "collega": {
      const v = verlofsaldo.find((x) => x.personeelsnummer === user.personeelsnummer);
      return {
        title: "Jouw verlof",
        subtitle: `Verlofsaldo ${v?.jaar ?? new Date().getFullYear()}`,
        columns: [{ key: "k", label: "Onderdeel" }, { key: "v", label: "Uren", numeric: true }],
        rows: v
          ? [
              { id: "r", k: "Verlofrecht", v: uren(v.recht) },
              { id: "o", k: "Opgenomen", v: uren(v.opgenomen) },
              { id: "a", k: "Aangevraagd", v: uren(v.aangevraagd) },
              { id: "s", k: "Saldo", v: uren(v.saldo) },
            ]
          : [],
      };
    }
  }
}

export function ModulePreview({ id }: { id: ModuleId }) {
  const { user, data } = useSession();
  const m = MODULES[id];
  if (!user) return null;
  const preview = data ? previewFor(id, user, data) : null;
  const firstExport = data?.states[m.exports[0]];

  let body: ReactNode = <p className="fx-muted">Data laden…</p>;
  if (preview) {
    body = preview.rows.length ? (
      <DataTable columns={preview.columns} rows={preview.rows} caption={preview.title} />
    ) : (
      <p className="fx-muted">Nog geen gegevens in de export.</p>
    );
  }

  return (
    <div className="app-stack">
      <Alert tone="info" title="Deze module is in ontwikkeling">
        {m.intro} Hieronder zie je wat erin komt en welke Bemet-data al klaarstaat.
      </Alert>

      <div className="app-split">
        <Card title="Wat komt erin" subtitle="Uit het plan, we bouwen het stap voor stap">
          <ul className="app-checklist">
            {m.plannedFeatures.map((f) => (
              <li key={f}><Icon name="check-circle" />{f}</li>
            ))}
          </ul>
          <p className="caption fx-muted app-source">
            Gebruikt: {m.exports.map((e) => EXPORTS[e].label).join(", ")}
          </p>
        </Card>

        <Card title={preview?.title ?? "Voorproef"} subtitle={preview?.subtitle}>
          {body}
          <p className="caption fx-muted app-source">
            Bemet-export {peilmoment(firstExport?.exportedAt)} · {firstExport?.origin ?? "–"}
          </p>
        </Card>
      </div>
    </div>
  );
}
