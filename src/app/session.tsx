// React-context voor de ingelogde gebruiker en de geladen Bemet-data.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createAuthProvider, type AppUser } from "../core/auth";
import { createExportSource, type ExportFile } from "../core/data/sources";
import { loadAll, type DataSnapshot } from "../core/data/repository";
import type { ExportId } from "../core/data/exports";
import type { SignInRequest } from "../core/auth/types";

interface Session {
  user: AppUser | null;
  authReady: boolean;
  signIn(req: SignInRequest): Promise<void>;
  signOut(): Promise<void>;
  data: DataSnapshot | null;
  dataError: string | null;
  reload(): Promise<void>;
  /** Alleen testfase: een eigen exportbestand gebruiken in plaats van de dummy-data. */
  overrides: Partial<Record<ExportId, ExportFile>>;
  setOverride(id: ExportId, file: ExportFile | null): void;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const auth = useMemo(createAuthProvider, []);
  const source = useMemo(() => createExportSource(auth), [auth]);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<DataSnapshot | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Partial<Record<ExportId, ExportFile>>>({});

  useEffect(() => {
    auth.restore().then((u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, [auth]);

  const reload = useCallback(async () => {
    try {
      setData(await loadAll(source, overrides));
      setDataError(null);
    } catch (e) {
      setDataError(e instanceof Error ? e.message : String(e));
    }
  }, [source, overrides]);

  useEffect(() => {
    reload();
  }, [reload]);

  const value: Session = {
    user,
    authReady,
    async signIn(req) {
      setUser(await auth.signIn(req));
    },
    async signOut() {
      await auth.signOut();
      setUser(null);
    },
    data,
    dataError,
    reload,
    overrides,
    setOverride(id, file) {
      setOverrides((o) => {
        const n = { ...o };
        if (file) n[id] = file;
        else delete n[id];
        return n;
      });
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSession buiten SessionProvider");
  return s;
}
