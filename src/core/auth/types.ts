import type { RoleId } from "../roles";

export interface AppUser {
  /** Stabiele id: in de testfase het personeelsnummer, later de Entra object-id. */
  id: string;
  name: string;
  email: string;
  role: RoleId;
  personeelsnummer?: string;
  werkplek?: string;
  team?: string;
}

export interface SignInRequest {
  /** Alleen testfase: gekozen rol en persoon. Entra negeert dit. */
  role?: RoleId;
  user?: AppUser;
}

/**
 * Inloggen achter één interface.
 * Testfase: DemoAuthProvider (rol kiezen, geen wachtwoord).
 * Livegang: EntraAuthProvider (Microsoft-werkaccount met MFA via MSAL).
 */
export interface AuthProvider {
  readonly mode: "demo" | "entra";
  /** Herstelt een bestaande sessie, of null. */
  restore(): Promise<AppUser | null>;
  signIn(req?: SignInRequest): Promise<AppUser>;
  signOut(): Promise<void>;
  /** Token voor Microsoft Graph of de eigen API. In de testfase niet beschikbaar. */
  getAccessToken(scopes: string[]): Promise<string>;
}
