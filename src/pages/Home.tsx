import { Alert, Button, ModuleTile, StatTile } from "../brand";
import { roleById } from "../core/roles";
import { MODULES } from "../modules/registry";
import { useSession } from "../app/session";
import { navigate } from "../app/router";
import { statsFor } from "../app/stats";
import { peilmoment } from "../app/format";
import { greeting } from "../app/greeting";
import { isTestMode } from "../core/config";

export function Home() {
  const { user, data } = useSession();
  if (!user) return null;
  const role = roleById(user.role);
  const stats = data ? statsFor(user, data) : [];
  const exportedAt = data?.states.projecten.exportedAt;
  const today = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  const problems = data ? Object.values(data.states).filter((s) => s.status === "fout" || s.status === "ontbreekt") : [];

  return (
    <>
      <div className="app-hello">
        <div className="fx-stat-label">{today}</div>
        <h1 className="display">{greeting()}, {user.name.split(" ")[0]}</h1>
      </div>

      {problems.length > 0 && (
        <Alert tone="warning" title="Niet alle data is geladen">
          {problems.map((p) => p.spec.label).join(", ")}. <a href="#/gegevens">Bekijk de gegevens</a>.
        </Alert>
      )}

      {stats.length > 0 && (
        <section aria-label="Vandaag" className="app-section">
          <div className="fx-stats">
            {stats.map((s) => <StatTile key={s.label} {...s} />)}
          </div>
          <p className="caption fx-muted app-source">Bemet-export {peilmoment(exportedAt)}</p>
        </section>
      )}

      <section className="app-section" aria-labelledby="mods">
        <h2 id="mods" className="h2">Jouw modules</h2>
        <div className="fx-modules">
          {role.modules.map((id) => {
            const m = MODULES[id];
            return <ModuleTile key={id} icon={m.icon} name={m.label} meta={m.meta} onClick={() => navigate(`/${id}`)} />;
          })}
        </div>
      </section>

      {isTestMode && (
        <section className="app-section app-testbox" aria-label="Testomgeving">
          <div>
            <h2 className="h3">Testomgeving</h2>
            <p className="body-sm fx-muted">Je bent ingelogd als {role.label.toLowerCase()}. Wissel van rol om te zien wat anderen zien, of bekijk welke Bemet-data er geladen is.</p>
          </div>
          <div className="app-testbox-actions">
            <Button variant="secondary" icon="users" onClick={() => navigate("/profiel")}>Rol wisselen</Button>
            <Button variant="quiet" icon="file" onClick={() => navigate("/gegevens")}>Gegevens bekijken</Button>
          </div>
        </section>
      )}
    </>
  );
}
