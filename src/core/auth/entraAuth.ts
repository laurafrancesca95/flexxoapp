import type { RoleId } from "../roles";
import type { AppUser, AuthProvider } from "./types";

/**
 * LIVEGANG — inloggen met het Microsoft-werkaccount (Entra ID), inclusief de bestaande MFA.
 * Nog niet actief in de testfase. Inschakelen met VITE_AUTH_MODE=entra.
 *
 * Plan van aanpak:
 * 1. `npm i @azure/msal-browser` en een PublicClientApplication met clientId/tenantId uit config.
 * 2. restore(): handleRedirectPromise() + getActiveAccount().
 * 3. signIn(): loginRedirect({ scopes: ["User.Read"] }). MFA regelt Entra zelf.
 * 4. Rol: uit de `roles`-claim van het ID-token (app-rollen in de app-registratie),
 *    via ROLE_CLAIMS hieronder. IT wijst mensen toe aan rollen in Entra.
 * 5. Personeelsnummer: koppelen op e-mailadres met de medewerkersexport.
 * 6. getAccessToken(): acquireTokenSilent, met acquireTokenRedirect als terugval.
 */
export const ROLE_CLAIMS: Record<string, RoleId> = {
  "FlexxoApp.Monteur": "monteur",
  "FlexxoApp.Montageplanner": "montageplanner",
  "FlexxoApp.Productie": "productie",
  "FlexxoApp.Productieplanner": "productieplanner",
  "FlexxoApp.Logistiek": "logistiek",
  "FlexxoApp.Medewerker": "medewerker",
  "FlexxoApp.Manager": "manager",
};

export class EntraAuthProvider implements AuthProvider {
  readonly mode = "entra" as const;

  constructor(private readonly settings: { clientId: string; tenantId: string }) {}

  private notReady(): never {
    throw new Error(
      this.settings.clientId
        ? "Inloggen met Microsoft is nog niet geïmplementeerd (zie entraAuth.ts)."
        : "Inloggen met Microsoft is nog niet ingesteld: VITE_ENTRA_CLIENT_ID ontbreekt.",
    );
  }

  async restore(): Promise<AppUser | null> {
    return null;
  }
  async signIn(): Promise<AppUser> {
    this.notReady();
  }
  async signOut() {}
  async getAccessToken(): Promise<string> {
    this.notReady();
  }
}
