// Genereert verzonnen Bemet-exports (Excel) in public/data/.
// Alle namen, klanten en nummers zijn fictief. Data staat rond de huidige week,
// zodat de testomgeving altijd "actueel" oogt. Zelfde dag = zelfde data (vaste seed per dag).
//
// Gebruik: npm run data
import writeXlsxFile from "write-excel-file/node";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "data");

// ---- Hulpjes ----------------------------------------------------------------
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
let seed = Number(process.env.DATA_SEED ?? today.getTime() / 864e5) % 2147483647 || 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const chance = (p) => rnd() < p;
const monday = new Date(today);
monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
const addDays = (d, n) => {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
};
const workday = (d) => {
  const r = new Date(d);
  while (r.getUTCDay() === 0 || r.getUTCDay() === 6) r.setUTCDate(r.getUTCDate() + 1);
  return r;
};
const dateCell = (d) => (d ? { value: d, type: Date, format: "dd-mm-yyyy" } : null);
const JN = (b) => (b ? "J" : "N");

// ---- Medewerkers ------------------------------------------------------------
const VOORNAMEN = ["Daan", "Sem", "Lucas", "Milan", "Thijs", "Jesse", "Bram", "Ruben", "Niels", "Joris", "Sanne", "Lotte", "Femke", "Iris", "Noor", "Eva", "Anouk", "Wouter", "Koen", "Stijn", "Pieter", "Gijs", "Mees", "Floor", "Tess", "Lars", "Jelle", "Mark", "Bas", "Rick"];
const ACHTERNAMEN = ["de Vries", "Jansen", "van Dijk", "Bakker", "Visser", "Smit", "Meijer", "de Boer", "Mulder", "de Groot", "Bos", "Vos", "Peters", "Hendriks", "van Leeuwen", "Dekker", "Brouwer", "de Wit", "Dijkstra", "Kok", "Vermeulen", "van den Berg", "Willems", "Hoekstra", "Schouten", "Kuipers", "Prins", "Huisman", "Post", "Verhoeven"];
const DE = [["Jonas", "Becker"], ["Felix", "Hoffmann"], ["Lukas", "Schneider"]];
const PL = [["Piotr", "Nowak"], ["Tomasz", "Kowalski"], ["Marek", "Wiśniewski"], ["Kamil", "Zieliński"]];
const WERKPLEKKEN = ["Zaagstraat", "Lasstraat 1", "Lasstraat 2", "Assemblage", "Spuiterij", "Eindcontrole"];

const used = new Set();
function naam() {
  for (;;) {
    const n = [pick(VOORNAMEN), pick(ACHTERNAMEN)];
    if (!used.has(n.join(" "))) {
      used.add(n.join(" "));
      return n;
    }
  }
}
const mail = (v, a) => `${v}.${a}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/[^a-z.]/g, "") + "@example.com";

let pnr = 1000;
const medewerkers = [];
function mw(functie, afdeling, extra = {}) {
  const [voornaam, achternaam] = extra.naam ?? naam();
  const m = { personeelsnummer: String(++pnr), voornaam, achternaam, email: mail(voornaam, achternaam), afdeling, functie, manager: extra.manager ?? "", team: extra.team ?? "", werkplek: extra.werkplek ?? "", contracturen: extra.uren ?? pick([40, 40, 40, 36, 32]), taal: extra.taal ?? "NL" };
  medewerkers.push(m);
  return m;
}
const directeur = mw("Directeur", "Management", { uren: 40 });
const mgrMontage = mw("Manager montage", "Management", { manager: directeur.personeelsnummer, uren: 40 });
const mgrProductie = mw("Manager productie", "Management", { manager: directeur.personeelsnummer, uren: 40 });
mw("Montageplanner", "Planning", { manager: mgrMontage.personeelsnummer });
mw("Montageplanner", "Planning", { manager: mgrMontage.personeelsnummer, uren: 32 });
mw("Productieplanner", "Planning", { manager: mgrProductie.personeelsnummer });
const foreign = [...DE.map((n) => [n, "DE"]), ...PL.map((n) => [n, "PL"])];
// Zeven montageteams van 2 of 3 man (hoofdmonteur = bouwleider) plus twee invallers zonder vast team.
const TEAMGROOTTE = [3, 3, 2, 3, 3, 2, 3];
TEAMGROOTTE.forEach((n, i) => {
  const t = i + 1;
  mw("Hoofdmonteur", "Montage", { team: `Team ${t}`, manager: mgrMontage.personeelsnummer, uren: 40 });
  for (let k = 1; k < n; k++) {
    const f = t > 3 && foreign.length > 1 ? foreign.shift() : null;
    mw("Monteur", "Montage", { team: `Team ${t}`, manager: mgrMontage.personeelsnummer, uren: 40, ...(f ? { naam: f[0], taal: f[1] } : {}) });
  }
});
for (let k = 0; k < 2; k++) mw("Monteur", "Montage", { manager: mgrMontage.personeelsnummer, uren: 40 });
const PRODFUNCTIE = { Zaagstraat: "Plaatwerker", "Lasstraat 1": "Lasser", "Lasstraat 2": "Lasser", Assemblage: "Samensteller", Spuiterij: "Spuiter", Eindcontrole: "Kwaliteitscontroleur" };
for (const w of WERKPLEKKEN) {
  const n = w === "Eindcontrole" ? 1 : 2;
  for (let i = 0; i < n; i++) {
    const f = w === "Lasstraat 2" && i === 1 ? foreign.shift() : null;
    mw(PRODFUNCTIE[w], "Productie", { werkplek: w, manager: mgrProductie.personeelsnummer, ...(f ? { naam: f[0], taal: f[1] } : {}) });
  }
}
mw("Logistiek coördinator", "Logistiek", { manager: mgrProductie.personeelsnummer });
mw("Magazijnmedewerker", "Logistiek", { manager: mgrProductie.personeelsnummer });
mw("Magazijnmedewerker", "Logistiek", { manager: mgrProductie.personeelsnummer, uren: 32 });
const engineers = [mw("Engineer", "Kantoor", { manager: directeur.personeelsnummer }), mw("Engineer", "Kantoor", { manager: directeur.personeelsnummer })];
const pls = [mw("Projectleider", "Kantoor", { manager: directeur.personeelsnummer }), mw("Projectleider", "Kantoor", { manager: directeur.personeelsnummer })];
mw("Calculator", "Kantoor", { manager: directeur.personeelsnummer });
mw("Administratief medewerker", "Kantoor", { manager: directeur.personeelsnummer, uren: 32 });

// ---- Verlofsaldo ------------------------------------------------------------
const jaar = today.getUTCFullYear();
const yearFrac = (today - Date.UTC(jaar, 0, 1)) / (365 * 864e5);
const verlofsaldo = medewerkers.map((m) => {
  const recht = Math.round((m.contracturen / 40) * 200 + int(0, 6) * 4);
  const opgenomen = Math.min(recht, Math.round((recht * (yearFrac * 0.72 + rnd() * 0.12)) / 4) * 4);
  const aangevraagd = Math.min(recht - opgenomen, pick([0, 0, 8, 16, 24, 40]));
  return { personeelsnummer: m.personeelsnummer, jaar, recht, opgenomen, aangevraagd, saldo: recht - opgenomen - aangevraagd };
});

// ---- Projecten --------------------------------------------------------------
const KLANTEN = ["Zilvermeer Waterbeheer", "Kwartelhof Industrie", "Dommelstroom Energie", "Hazelaar Zuivel", "Noorderlicht Procestechniek", "Brugwachter Bouw", "Peelrand Agro", "Lindeboom Utiliteit", "Rietkraag Installaties", "Kempenveld Food", "Ooievaar Logistiek", "Ganzenpoort Vastgoed", "Duinzicht Recreatie", "Merelhof Zorg", "Wilgenrijk Gemeentewerken", "Sterrenwacht Techniek", "Rheinblick Anlagenbau", "Sonnenfeld Haustechnik", "Wiśla Instal", "Schelde Klimaat"];
const PLAATSEN = { NL: ["Apeldoorn", "Zwolle", "Eindhoven", "Tilburg", "Utrecht", "Amersfoort", "Deventer", "Breda", "Nijmegen", "Groningen", "Venlo", "Almelo"], DE: ["Kleve", "Münster", "Düsseldorf"], BE: ["Antwerpen", "Hasselt"], PL: ["Poznań"] };
const OMS = ["Pompskid 2x 15 kW", "Doseerinstallatie", "Stalen frame met bordes", "Leidingwerk RVS DN80", "Behuizing met deuren", "Warmtewisselaarunit", "Filterunit 3-traps", "Bordes en trap", "Opslagtank 10 m³ met frame", "Drukverhogingsinstallatie", "Gasregelstation", "Containerinstallatie", "Ombouw bestaande installatie", "Service en inspectie", "Leveringspakket onderdelen"];
const STATUS_MIX = [
  ["Te plannen", 12], ["Gepland", 9], ["In productie", 8], ["Gereed voor transport", 4], ["In montage", 5], ["Gereed", 4],
];
const projecten = [];
let prj = 230;
for (const [status, n] of STATUS_MIX) {
  for (let i = 0; i < n; i++) {
    const klant = pick(KLANTEN);
    const land = /Anlagen|Haus/.test(klant) ? "DE" : /Wiśla/.test(klant) ? "PL" : /Schelde/.test(klant) ? "BE" : chance(0.08) ? "DE" : "NL";
    const metProductie = ["In productie", "Gereed voor transport"].includes(status);
    const ordertype = pick(metProductie ? ["Nieuwbouw", "Nieuwbouw", "Renovatie", "Levering"] : ["Nieuwbouw", "Nieuwbouw", "Nieuwbouw", "Renovatie", "Service", "Levering"]);
    const offset = { "Te plannen": int(7, 42), Gepland: int(3, 21), "In productie": int(5, 28), "Gereed voor transport": int(0, 6), "In montage": int(-10, -1), Gereed: int(-30, -8) }[status];
    const leverdatum = workday(addDays(monday, offset));
    const metMontage = ordertype !== "Levering";
    projecten.push({
      projectnummer: `PRJ-0${++prj}`,
      omschrijving: ordertype === "Service" ? "Service en inspectie" : ordertype === "Levering" ? "Leveringspakket onderdelen" : pick(OMS.slice(0, 13)),
      klant,
      plaats: pick(PLAATSEN[land]),
      land,
      ordertype,
      status,
      projectleider: (() => { const p = pick(pls); return `${p.voornaam} ${p.achternaam}`; })(),
      engineer: (() => { const p = pick(engineers); return `${p.voornaam} ${p.achternaam}`; })(),
      leverdatum,
      montageStart: metMontage ? workday(addDays(leverdatum, int(2, 7))) : null,
      vcUrenProductie: ordertype === "Service" ? 0 : int(4, 30) * 4,
      vcUrenMontage: metMontage ? int(2, 20) * 4 : 0,
      nacalculatie: chance(0.3),
      kraan: metMontage && chance(0.35),
      hoogwerker: metMontage && chance(0.45),
    });
  }
}
projecten.sort((a, b) => a.projectnummer.localeCompare(b.projectnummer));

// ---- Productieorders --------------------------------------------------------
const STAPPEN = [["Zaagstraat", "Profielen zagen"], ["Zaagstraat", "Plaatdelen knippen en zetten"], ["Lasstraat 1", "Frame lassen"], ["Lasstraat 2", "Leidingwerk lassen"], ["Assemblage", "Componenten monteren"], ["Spuiterij", "Stralen en coaten"], ["Eindcontrole", "Eindcontrole en druktest"]];
const productieorders = [];
let po = 24100;
for (const p of projecten) {
  if (!p.vcUrenProductie) continue;
  const steps = STAPPEN.filter((_, i) => i === 0 || i === 2 || i === 6 || chance(0.5));
  let start = workday(addDays(p.leverdatum, -int(10, 16)));
  steps.forEach(([werkplek, omschrijving], i) => {
    const vcUren = Math.max(2, Math.round((p.vcUrenProductie / steps.length) * (0.6 + rnd() * 0.8)));
    const dagen = Math.max(1, Math.ceil(vcUren / 8));
    const eind = workday(addDays(start, dagen - 1));
    let status;
    if (p.status === "Te plannen") status = "Te plannen";
    else if (p.status === "Gepland") status = "Gepland";
    else if (p.status === "In productie") status = eind < today ? "Gereed" : start <= today ? (chance(0.12) ? "Afwijking" : "In productie") : "Gepland";
    else status = "Gereed";
    productieorders.push({ ordernummer: `PO-${++po}`, projectnummer: p.projectnummer, werkplek, volgorde: i + 1, omschrijving, vcUren, start: status === "Te plannen" ? null : start, eind: status === "Te plannen" ? null : eind, status });
    start = workday(addDays(eind, 1));
  });
}
// Minstens één afwijking, zodat die status in de test te zien is.
if (!productieorders.some((o) => o.status === "Afwijking")) {
  const o = productieorders.find((x) => x.status === "In productie");
  if (o) o.status = "Afwijking";
}
// Zorg dat elke werkplek iets in productie heeft.
for (const w of WERKPLEKKEN) {
  if (!productieorders.some((o) => o.werkplek === w && o.status === "In productie")) {
    const o = productieorders.find((x) => x.werkplek === w && x.status === "Gepland");
    if (o) { o.status = "In productie"; o.start = workday(today); o.eind = workday(addDays(today, 1)); }
  }
}

// ---- Calculatieregels -------------------------------------------------------
const MATERIAAL = [["MAT-HEA160", "HEA 160 S235", "m", 30.4], ["MAT-K80", "Koker 80x80x4", "m", 9.2], ["MAT-RVS80", "Buis RVS316 DN80", "m", 6.6], ["MAT-PL6", "Plaat S235 6 mm", "m²", 47.1], ["MAT-FL80", "Flens DN80 PN16", "st", 3.9], ["MAT-KL80", "Kogelkraan DN80", "st", 11.5], ["MAT-PMP15", "Centrifugaalpomp 15 kW", "st", 145], ["MAT-BEV", "Bevestigingsset M16", "st", 2.4]];
const calculatieregels = [];
for (const p of projecten) {
  let regel = 0;
  const add = (soort, artikelcode, omschrijving, aantal, eenheid, gewicht = null, lbh = [null, null, null]) =>
    calculatieregels.push({ projectnummer: p.projectnummer, regel: ++regel, soort, artikelcode, omschrijving, aantal, eenheid, gewicht, lengte: lbh[0], breedte: lbh[1], hoogte: lbh[2] });
  if (p.ordertype !== "Service") {
    for (const m of MATERIAAL.filter(() => chance(0.5)).slice(0, 5)) add("Materiaal", m[0], m[1], m[2] === "st" ? int(1, 8) : int(4, 60), m[2], m[3]);
  }
  if (p.kraan) add("Equipment", "EQ-KR40", "Mobiele kraan 40 t", int(1, 2), "dag");
  if (p.hoogwerker) add("Equipment", pick(["EQ-HW12", "EQ-HW18"]), pick(["Hoogwerker 12 m", "Hoogwerker 18 m"]), int(1, 5), "dag");
  if (p.vcUrenMontage) add("Equipment", "EQ-GSB", "Gereedschapsbus", 1, "st");
  if (p.ordertype !== "Service") {
    const n = p.ordertype === "Levering" ? int(1, 3) : int(1, 5);
    for (let c = 1; c <= n; c++) {
      const l = int(8, 60) * 100, b = int(8, 24) * 100, h = int(6, 24) * 100;
      add("Colli", `COL-${c}`, pick(["Frame", "Skid", "Pallet onderdelen", "Kist leidingwerk", "Bordes", "Behuizing"]), 1, "st", Math.round((l * b * h) / 1e9 * int(60, 180)), [l, b, h]);
    }
  }
}

// ---- Montageprojecten -------------------------------------------------------
// Vaste seed: dezelfde projectnummers elke dag, zodat een opgeslagen testplanning blijft kloppen.
// De datums schuiven mee met de huidige week.
let mseed = 7331;
const mrnd = () => ((mseed = (mseed * 16807) % 2147483647) - 1) / 2147483646;
const mpick = (xs) => xs[Math.floor(mrnd() * xs.length)];
const mint = (a, b) => a + Math.floor(mrnd() * (b - a + 1));
const LOCATIES = [
  ["NL", "7741", "Coevorden"], ["NL", "7881", "Emmer-Compascuum"], ["NL", "8102", "Raalte"], ["NL", "7721", "Dalfsen"], ["NL", "6602", "Wijchen"],
  ["NL", "9641", "Veendam"], ["NL", "5751", "Deurne"], ["NL", "8401", "Gorredijk"], ["DE", "49377", "Vechta"], ["DE", "49661", "Cloppenburg"],
  ["DE", "49808", "Lingen"], ["DE", "46325", "Borken"], ["DE", "26169", "Friesoythe"], ["DE", "48431", "Rheine"], ["BE", "2440", "Geel"],
  ["BE", "8600", "Diksmuide"], ["PL", "62-300", "Września"], ["PL", "64-100", "Leszno"], ["FR", "35000", "Rennes"], ["DK", "7400", "Herning"],
];
const MKLANTEN = { NL: ["Groengas Heidehof", "Biovergisting De Kievit", "Mestverwerking Oostveld", "Energieboerderij Lindehoeve"], DE: ["Agrarenergie Moorland GmbH", "Biogas Emsaue GmbH", "Hofenergie Sandkamp KG"], BE: ["Biostroom Kempen NV", "Vergisting Westhoek"], PL: ["Biogazownia Zielone Pole Sp. z o.o."], FR: ["Méthanisation Brocéliande SAS"], DK: ["Herning Biogas ApS"] };
const SILO = ["Beton gegoten H6 m", "Beton gegoten H8 m", "Beton elementen H6 m", "Staal H7 m", "Beton gegoten H5 m", "Staal plaat H8 m"];
const MSTATUS = ["In productie", "In productie", "Productiepapier geprint", "Intern gereed", "Verzending compleet"];
const WVB = ["MV", "LB", "JK", "SD"];
const OPM = ["", "", "Klant levert hoogwerkers.", "Start vast afgesproken met de klant.", "Mestzak eerst leeg, bevestiging volgt.", "Klant regelt de kraan.", "Toegang bouwplaats via achteringang.", "Gasdichtheidstest aansluitend plannen."];
const montageprojecten = [];
for (let i = 0; i < 30; i++) {
  const [land, postcode, plaats] = mpick(LOCATIES);
  const soort = i % 9 === 4 ? "Reparatie" : i % 11 === 7 ? "Restwerk" : "Nieuwbouw";
  const diam = (mint(30, 76) / 2).toFixed(1).replace(".", ",");
  const hoog = mpick(["5,0", "6,0", "7,0", "8,0"]);
  const aantal = mpick([1, 1, 1, 1, 2, 3]);
  const omschrijving = soort === "Nieuwbouw" ? `${aantal > 1 ? `${aantal}x ` : ""}Dak Ø${diam} m x ${hoog} m` : soort === "Reparatie" ? `Reparatie dak Ø${diam} m` : "Restwerkzaamheden";
  const vcUrenWerk = soort === "Nieuwbouw" ? mint(10, 55) * 10 * Math.min(aantal, 2) : mint(2, 6) * 10;
  const ver = land === "NL" ? 0 : ["DE", "BE"].includes(land) ? 1 : 2;
  const vcUrenReis = [mint(2, 4), mint(4, 8), mint(10, 16)][ver] * (soort === "Nieuwbouw" ? 3 : 2);
  const gewensteStart = addDays(monday, mint(-10, 38));
  const opm = mpick(OPM);
  montageprojecten.push({
    projectnummer: `PRJ-0${400 + i}`, omschrijving, soort, klant: mpick(MKLANTEN[land]), land, postcode, plaats,
    silo: soort === "Nieuwbouw" ? mpick(SILO) : null, lining: soort === "Nieuwbouw" && mrnd() < 0.2,
    status: gewensteStart < monday ? "Verzending compleet" : mpick(MSTATUS), werkvoorbereider: mpick(WVB), gewensteStart,
    vcUrenWerk, vcUrenReis, fix: mrnd() < 0.4 || /vast/.test(opm), hoogwerkers: soort === "Nieuwbouw" ? mpick([1, 2, 2, 2]) : mpick([0, 1]),
    kraan: soort === "Nieuwbouw" && mrnd() < 0.5, opmerking: opm || null,
  });
}
montageprojecten.sort((a, b) => a.gewensteStart - b.gewensteStart);

// ---- Schrijven --------------------------------------------------------------
// Kopnamen MOETEN gelijk zijn aan src/core/data/exports.ts (de test controleert dit).
const sheets = {
  "Bemet_Projecten.xlsx": [
    ["Projectnummer", "Omschrijving", "Klant", "Plaats", "Land", "Ordertype", "Status", "Projectleider", "Engineer", "Leverdatum", "Gewenste start montage", "VC-uren productie", "VC-uren montage", "Nacalculatie", "Kraan nodig", "Hoogwerker nodig"],
    projecten.map((p) => [p.projectnummer, p.omschrijving, p.klant, p.plaats, p.land, p.ordertype, p.status, p.projectleider, p.engineer, dateCell(p.leverdatum), dateCell(p.montageStart), p.vcUrenProductie, p.vcUrenMontage, JN(p.nacalculatie), JN(p.kraan), JN(p.hoogwerker)]),
  ],
  "Bemet_Medewerkers.xlsx": [
    ["Personeelsnummer", "Voornaam", "Achternaam", "E-mail", "Afdeling", "Functie", "Manager", "Team", "Werkplek", "Contracturen per week", "Taal"],
    medewerkers.map((m) => [m.personeelsnummer, m.voornaam, m.achternaam, m.email, m.afdeling, m.functie, m.manager || null, m.team || null, m.werkplek || null, m.contracturen, m.taal]),
  ],
  "Bemet_Verlofsaldo.xlsx": [
    ["Personeelsnummer", "Jaar", "Verlofrecht (u)", "Opgenomen (u)", "Aangevraagd (u)", "Saldo (u)"],
    verlofsaldo.map((v) => [v.personeelsnummer, v.jaar, v.recht, v.opgenomen, v.aangevraagd, v.saldo]),
  ],
  "Bemet_Productieorders.xlsx": [
    ["Ordernummer", "Projectnummer", "Werkplek", "Volgorde", "Omschrijving", "VC-uren", "Geplande start", "Geplande eind", "Status"],
    productieorders.map((o) => [o.ordernummer, o.projectnummer, o.werkplek, o.volgorde, o.omschrijving, o.vcUren, dateCell(o.start), dateCell(o.eind), o.status]),
  ],
  "Bemet_Calculatieregels.xlsx": [
    ["Projectnummer", "Regel", "Soort", "Artikelcode", "Omschrijving", "Aantal", "Eenheid", "Gewicht (kg)", "Lengte (mm)", "Breedte (mm)", "Hoogte (mm)"],
    calculatieregels.map((c) => [c.projectnummer, c.regel, c.soort, c.artikelcode, c.omschrijving, c.aantal, c.eenheid, c.gewicht, c.lengte, c.breedte, c.hoogte]),
  ],
  "Bemet_Montageprojecten.xlsx": [
    ["Projectnummer", "Omschrijving", "Soort", "Klant", "Land", "Postcode", "Plaats", "Silo", "Inclusief lining", "Status", "Werkvoorbereider", "Gewenste start montage", "VC-uren werk", "VC-uren reis", "Vast afgesproken", "Hoogwerkers", "Kraan nodig", "Opmerking"],
    montageprojecten.map((m) => [m.projectnummer, m.omschrijving, m.soort, m.klant, m.land, m.postcode, m.plaats, m.silo, JN(m.lining), m.status, m.werkvoorbereider, dateCell(m.gewensteStart), m.vcUrenWerk, m.vcUrenReis, JN(m.fix), m.hoogwerkers, JN(m.kraan), m.opmerking]),
  ],
};

await mkdir(OUT, { recursive: true });
// Peilmoment: vandaag 06:00 Nederlandse tijd (zoals de nachtelijke export).
const exportedAt = new Date(today.getTime() + 5 * 3600e3).toISOString();
const manifest = { generatedBy: "scripts/generate-dummy-data.mjs", note: "Verzonnen testdata", files: {} };
for (const [file, [header, rows]] of Object.entries(sheets)) {
  const data = [header.map((h) => ({ value: h, fontWeight: "bold" })), ...rows];
  await writeXlsxFile(data, { sheet: "Export", stickyRowsCount: 1 }).toFile(path.join(OUT, file));
  manifest.files[file] = { exportedAt, rows: rows.length };
  console.log(`${file}: ${rows.length} rijen`);
}
await writeFile(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
