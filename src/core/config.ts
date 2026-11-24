// Centrale configuratie. In de testfase staat alles op "demo" en "static".
// Voor de livegang zet je in de build-omgeving:
//   VITE_AUTH_MODE=entra, VITE_DATA_SOURCE=graph, plus de Entra- en Graph-instellingen.
export type AuthMode = "demo" | "entra";
export type DataSourceMode = "static" | "graph";

export const config = {
  authMode: (import.meta.env.VITE_AUTH_MODE ?? "demo") as AuthMode,
  dataSource: (import.meta.env.VITE_DATA_SOURCE ?? "static") as DataSourceMode,
  entra: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID ?? "",
    tenantId: import.meta.env.VITE_ENTRA_TENANT_ID ?? "",
  },
  graph: {
    exportFolder: import.meta.env.VITE_GRAPH_EXPORT_FOLDER ?? "",
  },
  /** Basis-URL van de app (werkt op GitHub Pages, Vercel en Azure). */
  baseUrl: import.meta.env.BASE_URL,
};

export const isTestMode = config.authMode === "demo";
