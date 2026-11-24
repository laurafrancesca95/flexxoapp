import { useMemo, useState } from "react";
import { Alert, Button, Icon, Wordmark } from "../brand";
import type { AppUser } from "../core/auth";
import type { Medewerker } from "../core/data/exports";
import { ROLES, type RoleDef, type RoleId } from "../core/roles";
import { useSession } from "../app/session";
import { navigate } from "../app/router";

const toUser = (m: Medewerker, role: RoleId): AppUser => ({
  id: m.personeelsnummer,
  name: `${m.voornaam} ${m.achternaam}`,
  email: m.email,
  role,
  personeelsnummer: m.personeelsnummer,
  werkplek: m.werkplek,
  team: m.team,
});

export function Login() {
  const { data, signIn } = useSession();
  const [role, setRole] = useState<RoleDef | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);

  const people = useMemo(() => {
    if (!role || !data) return [];
    return data.rows.medewerkers.filter((m) => role.demoFuncties.includes(m.functie)).slice(0, 6);
  }, [role, data]);

  const chosen = people.find((p) => p.personeelsnummer === personId) ?? people[0];

  async function go() {
    if (!role || !chosen) return;
    await signIn({ role: role.id, user: toUser(chosen, role.id) });
    navigate("/");
  }

  return (
    <div className="fx-root app-login">
      <div className="app-login-card">
        <Wordmark size={30} />
        <h1 className="h1 app-login-title">{role ? "Wie ben je?" : "Inloggen"}</h1>
        <Alert tone="info" title="Testomgeving">
          Kies een rol om de app te bekijken zoals die rol hem ziet. Alle namen en gegevens zijn verzonnen. Later log je hier in met je Microsoft-werkaccount en MFA.
        </Alert>

        {!role ? (
          <div className="app-role-grid" role="list">
            {ROLES.map((r) => (
              <button key={r.id} type="button" role="listitem" className="app-role" onClick={() => { setRole(r); setPersonId(null); }}>
                <span className="fx-tile-icon"><Icon name={r.icon} size="lg" /></span>
                <span>
                  <span className="app-role-name">{r.label}</span>
                  <span className="app-role-meta">{r.description}</span>
                </span>
                <Icon name="chevron-right" className="app-role-chevron" />
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="app-picked">
              <span className="fx-tile-icon"><Icon name={role.icon} size="lg" /></span>
              <div>
                <div className="label">Rol</div>
                <div className="body-strong">{role.label}</div>
              </div>
              <Button variant="quiet" size="sm" onClick={() => setRole(null)}>Andere rol</Button>
            </div>
            {!data ? (
              <p className="fx-muted">Testdata laden…</p>
            ) : people.length === 0 ? (
              <Alert tone="warning" title="Geen testpersoon gevonden">Er staat niemand met deze functie in de medewerkersexport.</Alert>
            ) : (
              <fieldset className="app-people">
                <legend className="label">Inloggen als</legend>
                {people.map((p) => (
                  <label key={p.personeelsnummer} className="app-person">
                    <input type="radio" name="person" checked={chosen?.personeelsnummer === p.personeelsnummer} onChange={() => setPersonId(p.personeelsnummer)} />
                    <span className="fx-avatar" aria-hidden="true">{p.voornaam[0]}{p.achternaam.split(" ").pop()![0]}</span>
                    <span>
                      <span className="body-strong">{p.voornaam} {p.achternaam}</span>
                      <span className="app-role-meta">{p.functie}{p.werkplek ? ` · ${p.werkplek}` : ""}{p.team ? ` · ${p.team}` : ""}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            )}
            <Button variant="primary" size="lg" block disabled={!chosen} onClick={go} iconRight="chevron-right">
              {chosen ? `Inloggen als ${chosen.voornaam}` : "Inloggen"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
