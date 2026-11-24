import type { ExportSpec } from "../exports";
import type { ExportFile, ExportSource } from "./types";

/**
 * LIVEGANG — leest de Bemet-exports uit een SharePoint- of OneDrive-map via Microsoft Graph.
 * Nog niet actief in de testfase. Inschakelen met VITE_DATA_SOURCE=graph.
 *
 * Nodig van IT:
 * - App-registratie in Entra ID met gedelegeerde rechten Files.Read.All (of Sites.Selected).
 * - De map waar Bemet de exports neerzet, bijv. "/sites/planning/Gedeelde documenten/Bemet-exports".
 *
 * Graph-aanroepen (per bestand):
 *   GET {folder}/{fileName}               -> metadata, o.a. lastModifiedDateTime (= peilmoment)
 *   GET {folder}/{fileName}:/content      -> het .xlsx-bestand zelf
 */
export class GraphExportSource implements ExportSource {
  readonly name = "SharePoint";

  constructor(
    /** Bijv. "https://graph.microsoft.com/v1.0/sites/{site-id}/drive/root:/Bemet-exports" */
    private readonly folderUrl: string,
    private readonly getToken: () => Promise<string>,
  ) {}

  async fetchExport(spec: ExportSpec): Promise<ExportFile | null> {
    const token = await this.getToken();
    const headers = { Authorization: `Bearer ${token}` };
    const itemUrl = `${this.folderUrl}/${encodeURIComponent(spec.fileName)}`;
    const meta = await fetch(itemUrl, { headers });
    if (meta.status === 404) return null;
    if (!meta.ok) throw new Error(`Graph gaf ${meta.status} voor ${spec.fileName}`);
    const info = (await meta.json()) as { lastModifiedDateTime?: string };
    const file = await fetch(`${itemUrl}:/content`, { headers });
    if (!file.ok) throw new Error(`Graph gaf ${file.status} bij downloaden van ${spec.fileName}`);
    return {
      data: await file.arrayBuffer(),
      exportedAt: info.lastModifiedDateTime ? new Date(info.lastModifiedDateTime) : undefined,
      origin: this.name,
    };
  }
}
