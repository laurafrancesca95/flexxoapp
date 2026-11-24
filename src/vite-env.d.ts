/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "demo" (rol kiezen, testfase) of "entra" (Microsoft Entra ID, livegang). */
  readonly VITE_AUTH_MODE?: string;
  /** "static" (dummy-Excels in /data) of "graph" (SharePoint/OneDrive via Microsoft Graph). */
  readonly VITE_DATA_SOURCE?: string;
  readonly VITE_ENTRA_CLIENT_ID?: string;
  readonly VITE_ENTRA_TENANT_ID?: string;
  readonly VITE_GRAPH_EXPORT_FOLDER?: string;
}
