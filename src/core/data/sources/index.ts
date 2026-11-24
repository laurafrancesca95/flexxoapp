import { config } from "../../config";
import type { AuthProvider } from "../../auth";
import { GraphExportSource } from "./graphSource";
import { StaticExportSource } from "./staticSource";
import type { ExportSource } from "./types";

export type { ExportFile, ExportSource } from "./types";

export function createExportSource(auth: AuthProvider): ExportSource {
  if (config.dataSource === "graph") {
    return new GraphExportSource(config.graph.exportFolder, () =>
      auth.getAccessToken(["Files.Read.All"]),
    );
  }
  return new StaticExportSource(config.baseUrl);
}
