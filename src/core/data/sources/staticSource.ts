import type { ExportSpec } from "../exports";
import type { ExportFile, ExportSource } from "./types";

interface Manifest {
  files: Record<string, { exportedAt: string }>;
}

/** Leest de dummy-exports uit public/data (meegebouwd met de app). */
export class StaticExportSource implements ExportSource {
  readonly name = "Testdata";
  private manifest?: Promise<Manifest | null>;

  constructor(private readonly baseUrl: string) {}

  private getManifest() {
    this.manifest ??= fetch(`${this.baseUrl}data/manifest.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
      .catch(() => null);
    return this.manifest;
  }

  async fetchExport(spec: ExportSpec): Promise<ExportFile | null> {
    const res = await fetch(`${this.baseUrl}data/${spec.fileName}`, { cache: "no-cache" });
    if (!res.ok) return null;
    const manifest = await this.getManifest();
    const stamp = manifest?.files[spec.fileName]?.exportedAt;
    return { data: await res.arrayBuffer(), exportedAt: stamp ? new Date(stamp) : undefined, origin: this.name };
  }
}
