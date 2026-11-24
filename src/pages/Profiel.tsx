import { Alert, Button, Card } from "../brand";
import { roleById } from "../core/roles";
import { LocalStore } from "../core/store";
import { isTestMode } from "../core/config";
import { useSession } from "../app/session";
import { navigate } from "../app/router";

export function Profiel() {
  const { user, signOut } = useSession();
  if (!user) return null;
  const role = roleById(user.role);
  const rows: [string, string | undefined][] = [
    ["Naam", user.name],
    ["E-mail", user.email],
    ["Rol", role.label],
    ["Personeelsnummer", user.personeelsnummer],
    ["Werkplek", user.werkplek],
    ["Team", user.team],
  ];

  return (
    <div className="app-stack app-narrow">
      <Card title={user.name} subtitle={role.description}>
        <dl className="app-dl">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}><dt className="label fx-muted">{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </Card>
      {isTestMode && (
        <Alert tone="info" title="Testomgeving">
          Uitloggen brengt je terug naar de rolkeuze. Met "Testgegevens wissen" zet je alles wat je in deze browser hebt ingevoerd terug.
        </Alert>
      )}
      <div className="app-testbox-actions">
        <Button variant="primary" size="lg" icon="users" onClick={async () => { await signOut(); navigate("/"); }}>
          {isTestMode ? "Rol wisselen" : "Uitloggen"}
        </Button>
        {isTestMode && (
          <Button variant="quiet" onClick={async () => { LocalStore.clearAll(); await signOut(); navigate("/"); }}>
            Testgegevens wissen
          </Button>
        )}
      </div>
    </div>
  );
}
