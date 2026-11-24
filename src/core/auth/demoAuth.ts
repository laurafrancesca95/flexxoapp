import type { AppUser, AuthProvider, SignInRequest } from "./types";

const KEY = "flexxoapp.demo-user";

/** Nep-inloggen voor de testfase: de gekozen persoon wordt in de browser onthouden. */
export class DemoAuthProvider implements AuthProvider {
  readonly mode = "demo" as const;

  async restore() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
    }
  }

  async signIn(req?: SignInRequest) {
    if (!req?.user) throw new Error("Kies eerst een rol en een persoon.");
    try {
      localStorage.setItem(KEY, JSON.stringify(req.user));
    } catch {
      /* privévenster: dan alleen voor deze sessie */
    }
    return req.user;
  }

  async signOut() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* niets */
    }
  }

  async getAccessToken(): Promise<string> {
    throw new Error("In de testfase is er geen Microsoft-koppeling.");
  }
}
