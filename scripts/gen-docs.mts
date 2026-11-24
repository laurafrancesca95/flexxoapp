// Schrijft docs/bemet-exports.md op basis van src/core/data/exports.ts.
// Gebruik: npm run docs
import { writeFileSync } from "node:fs";
import { EXPORT_LIST } from "../src/core/data/exports.ts";

const TYPE = { text: "Tekst", number: "Getal", date: "Datum (dd-mm-jjjj)", boolean: "J/N" };
let md = `# Bemet-exports: kolomformaat

> Dit bestand wordt gemaakt met \`npm run docs\` uit \`src/core/data/exports.ts\`. Pas daar de kolommen aan, niet hier.

FlexxoApp leest de automatische Excel-exports uit Bemet. In de testfase zijn dat verzonnen bestanden in \`public/data/\`
(gemaakt met \`npm run data\`). Bij de livegang zet Bemet dezelfde bestanden in een SharePoint-map.

**Algemene regels**

- Eén werkblad per bestand; rij 1 bevat de kopnamen, daarna één rij per regel.
- Kolommen worden op kopnaam gevonden, niet op positie. Hoofdletters en extra spaties maken niet uit.
- Extra kolommen zijn toegestaan en worden genegeerd. Verplichte kolommen moeten er zijn.
- Datums als Excel-datum of als tekst \`dd-mm-jjjj\`. Getallen als Excel-getal of in Nederlandse notatie (\`1.250,5\`).
- J/N-velden accepteren ook Ja/Nee, X en 1/0.
- Het peilmoment is het moment waarop Bemet het bestand schreef (in de testfase: \`public/data/manifest.json\`).
- Heeft de echte export een andere kopnaam? Voeg die toe als \`aliases\` in \`exports.ts\`. De app blijft verder gelijk.

`;
for (const s of EXPORT_LIST) {
  md += `## ${s.label}\n\n\`${s.fileName}\` · ${s.description}\n\nGebruikt door: ${s.usedBy.join(", ")}\n\n`;
  md += `| Kolom | Type | Verplicht | Omschrijving | Voorbeeld |\n| --- | --- | --- | --- | --- |\n`;
  for (const c of s.columns) md += `| ${c.header} | ${TYPE[c.type]} | ${c.required ? "Ja" : "Nee"} | ${c.description} | \`${c.example}\` |\n`;
  md += "\n";
}
writeFileSync(new URL("../docs/bemet-exports.md", import.meta.url), md);
console.log("docs/bemet-exports.md bijgewerkt");
