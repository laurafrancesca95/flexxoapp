import type { ExportSpec } from "../exports";

/** Eén exportbestand zoals een bron het aanlevert. */
export interface ExportFile {
  data: ArrayBuffer | Blob;
  /** Peilmoment van de export (wanneer Bemet het bestand schreef). */
  exportedAt?: Date;
  /** Waar het bestand vandaan komt, voor op het scherm ("Testdata", "SharePoint", ...). */
  origin: string;
}

/**
 * Een plek waar de Bemet-exports staan.
 * Testfase: StaticExportSource (dummy-Excels in /data).
 * Livegang: GraphExportSource (SharePoint/OneDrive-map via Microsoft Graph).
 * De rest van de app weet niet welke bron er actief is.
 */
export interface ExportSource {
  readonly name: string;
  /** Geeft null als het bestand niet bestaat. */
  fetchExport(spec: ExportSpec): Promise<ExportFile | null>;
}
