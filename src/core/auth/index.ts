import { config } from "../config";
import { DemoAuthProvider } from "./demoAuth";
import { EntraAuthProvider } from "./entraAuth";
import type { AuthProvider } from "./types";

export type { AppUser, AuthProvider } from "./types";

export function createAuthProvider(): AuthProvider {
  return config.authMode === "entra" ? new EntraAuthProvider(config.entra) : new DemoAuthProvider();
}
