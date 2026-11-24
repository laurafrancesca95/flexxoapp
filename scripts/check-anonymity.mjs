// Controleert dat de repository geanonimiseerd is: geen organisatienaam, geen interne
// systeemnamen en geen echte personen. De verboden woorden staan gecodeerd in dit bestand,
// zodat ze zelf ook niet leesbaar in de repo staan.
// Gebruik: npm run check:anon   (draait ook in de GitHub-workflow vóór elke publicatie)
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readSheet } from "read-excel-file/node";

const decode = (s) => Buffer.from(s, "base64").toString("utf8");
const TERMS = ["ZmxleHhvbHV0aW9ucw==", "ZmxleHhvZG9jcw==", "d2F0ZXI0YWxs", "Ym9pa2U=", "ZGFtaHVpcw=="].map(decode);
// Ook de korte organisatienaam los (zonder "o" erachter) is verboden; "Flexxo..." mag wel.
const patterns = [...TERMS.map((t) => new RegExp(t, "i")), new RegExp(decode("ZmxleHg=") + "(?!o)", "i")];

const files = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && !f.startsWith("node_modules/"));

const hits = [];
for (const f of files) {
  let text;
  try {
    if (f.endsWith(".xlsx")) {
      text = (await readSheet(f)).flat().join(" ");
    } else if (/\.(png|jpg|jpeg|gif|ico|woff2?)$/i.test(f)) {
      continue;
    } else {
      text = readFileSync(f, "utf8");
    }
  } catch {
    continue;
  }
  for (const p of patterns) if (p.test(text) || p.test(f)) hits.push(`${f} (patroon ${patterns.indexOf(p) + 1})`);
}

let log = "";
try {
  log = execSync("git log --format=%an%n%ae%n%B", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
} catch {
  /* nog geen commits */
}
for (const p of patterns) if (p.test(log)) hits.push(`git-geschiedenis (patroon ${patterns.indexOf(p) + 1})`);

if (hits.length) {
  console.error("Anonimiseringscheck MISLUKT:\n  " + hits.join("\n  "));
  process.exit(1);
}
console.log(`Anonimiseringscheck geslaagd: ${files.length} bestanden en de git-geschiedenis gecontroleerd.`);
