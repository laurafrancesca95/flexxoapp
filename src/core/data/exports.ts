// Kolomformaat van de automatische Bemet-exports.
//
// Dit bestand is de enige plek waar staat welke kolommen de app verwacht.
// - De dummy-generator (scripts/generate-dummy-data.mjs) schrijft precies deze kolommen.
// - De parser (parse.ts) leest kolommen op kopnaam, dus de volgorde maakt niet uit.
// - Wijkt een echte Bemet-export af? Zet de echte kopnaam in `aliases`; de rest van de app
//   blijft ongewijzigd.
// Documentatie voor mensen: docs/bemet-exports.md.

export type ColumnType = "text" | "number" | "date" | "boolean";

export interface ColumnSpec {
  /** Veldnaam in de app (camelCase). */
  key: string;
  /** Kopnaam in rij 1 van het Excel-blad. */
  header: string;
  type: ColumnType;
  required?: boolean;
  /** Andere kopnamen die ook geaccepteerd worden (bijv. de echte Bemet-kop). */
  aliases?: string[];
  /** Uitleg en voorbeeld voor de documentatie. */
  description: string;
  example: string;
}

export interface ExportSpec {
  id: ExportId;
  label: string;
  /** Bestandsnaam in de exportmap. */
  fileName: string;
  /** Naam van het werkblad; leeg = eerste blad. */
  sheet?: string;
  description: string;
  /** Welke modules deze export gebruiken. */
  usedBy: string[];
  columns: ColumnSpec[];
}

export type ExportId =
  | "projecten"
  | "medewerkers"
  | "verlofsaldo"
  | "productieorders"
  | "calculatieregels";

export const EXPORTS: Record<ExportId, ExportSpec> = {
  projecten: {
    id: "projecten",
    label: "Projecten",
    fileName: "Bemet_Projecten.xlsx",
    description: "Alle lopende projecten met status, data en voorcalculatie-uren (VC-uren).",
    usedBy: ["Montageplanning", "Montage", "Logistiek", "Productie", "Productieplanning"],
    columns: [
      { key: "projectnummer", header: "Projectnummer", type: "text", required: true, description: "Uniek projectnummer", example: "PRJ-0241" },
      { key: "omschrijving", header: "Omschrijving", type: "text", required: true, description: "Korte projectomschrijving", example: "Pompskid 2x 15 kW" },
      { key: "klant", header: "Klant", type: "text", required: true, description: "Naam van de klant", example: "Zilvermeer Waterbeheer" },
      { key: "plaats", header: "Plaats", type: "text", description: "Plaats van montage of levering", example: "Apeldoorn" },
      { key: "land", header: "Land", type: "text", description: "Landcode (NL, BE, DE, PL)", example: "NL" },
      { key: "ordertype", header: "Ordertype", type: "text", required: true, description: "Nieuwbouw, Renovatie, Service of Levering", example: "Nieuwbouw" },
      { key: "status", header: "Status", type: "text", required: true, description: "Te plannen, Gepland, In productie, Gereed voor transport, In montage, Gereed", example: "Te plannen" },
      { key: "projectleider", header: "Projectleider", type: "text", description: "Naam projectleider", example: "Sanne de Wit" },
      { key: "engineer", header: "Engineer", type: "text", description: "Naam engineer (ontvangt o.a. inmeetsheets)", example: "Ruben Kok" },
      { key: "leverdatum", header: "Leverdatum", type: "date", required: true, description: "Afgesproken leverdatum", example: "12-01-2027" },
      { key: "montageStart", header: "Gewenste start montage", type: "date", description: "Gewenste startdatum op locatie", example: "18-01-2027" },
      { key: "vcUrenProductie", header: "VC-uren productie", type: "number", description: "Voorgecalculeerde uren productie", example: "64" },
      { key: "vcUrenMontage", header: "VC-uren montage", type: "number", description: "Voorgecalculeerde uren montage", example: "48" },
      { key: "nacalculatie", header: "Nacalculatie", type: "boolean", description: "Nacalculatieproject (J/N)", example: "J" },
      { key: "kraan", header: "Kraan nodig", type: "boolean", description: "Kraan nodig op locatie (J/N)", example: "N" },
      { key: "hoogwerker", header: "Hoogwerker nodig", type: "boolean", description: "Hoogwerker nodig op locatie (J/N)", example: "J" },
    ],
  },
  medewerkers: {
    id: "medewerkers",
    label: "Medewerkers",
    fileName: "Bemet_Medewerkers.xlsx",
    description: "Personeel met afdeling, functie, manager en werkplek.",
    usedBy: ["Collega", "Montageplanning", "Productieplanning"],
    columns: [
      { key: "personeelsnummer", header: "Personeelsnummer", type: "text", required: true, description: "Uniek personeelsnummer", example: "1007" },
      { key: "voornaam", header: "Voornaam", type: "text", required: true, description: "Voornaam", example: "Daan" },
      { key: "achternaam", header: "Achternaam", type: "text", required: true, description: "Achternaam (incl. tussenvoegsel)", example: "van Leeuwen" },
      { key: "email", header: "E-mail", type: "text", required: true, description: "Werk-e-mail; later de koppeling met het Microsoft-account", example: "daan.vanleeuwen@example.com" },
      { key: "afdeling", header: "Afdeling", type: "text", required: true, description: "Montage, Productie, Planning, Logistiek, Kantoor of Management", example: "Montage" },
      { key: "functie", header: "Functie", type: "text", required: true, description: "Functienaam", example: "Monteur" },
      { key: "manager", header: "Manager", type: "text", description: "Personeelsnummer van de leidinggevende", example: "1001" },
      { key: "team", header: "Team", type: "text", description: "Montageteam (alleen monteurs)", example: "Team 2" },
      { key: "werkplek", header: "Werkplek", type: "text", description: "Vaste werkplek (alleen productie)", example: "Lasstraat 1" },
      { key: "contracturen", header: "Contracturen per week", type: "number", description: "Contracturen per week", example: "40" },
      { key: "taal", header: "Taal", type: "text", description: "Voorkeurstaal: NL, DE of PL", example: "NL" },
    ],
  },
  verlofsaldo: {
    id: "verlofsaldo",
    label: "Verlofsaldo",
    fileName: "Bemet_Verlofsaldo.xlsx",
    description: "Verlofrecht en -opname per medewerker voor het lopende jaar.",
    usedBy: ["Collega"],
    columns: [
      { key: "personeelsnummer", header: "Personeelsnummer", type: "text", required: true, description: "Koppeling met Medewerkers", example: "1007" },
      { key: "jaar", header: "Jaar", type: "number", required: true, description: "Kalenderjaar", example: "2026" },
      { key: "recht", header: "Verlofrecht (u)", type: "number", required: true, description: "Totaal verlofrecht in uren, incl. meegenomen saldo", example: "216" },
      { key: "opgenomen", header: "Opgenomen (u)", type: "number", required: true, description: "Al opgenomen uren", example: "152" },
      { key: "aangevraagd", header: "Aangevraagd (u)", type: "number", description: "Goedgekeurd maar nog niet opgenomen", example: "16" },
      { key: "saldo", header: "Saldo (u)", type: "number", required: true, description: "Resterende uren", example: "48" },
    ],
  },
  productieorders: {
    id: "productieorders",
    label: "Productieorders",
    fileName: "Bemet_Productieorders.xlsx",
    description: "Productieorders per project en werkplek, met volgorde en VC-uren.",
    usedBy: ["Productie", "Productieplanning"],
    columns: [
      { key: "ordernummer", header: "Ordernummer", type: "text", required: true, description: "Uniek productieordernummer", example: "PO-24110" },
      { key: "projectnummer", header: "Projectnummer", type: "text", required: true, description: "Koppeling met Projecten", example: "PRJ-0241" },
      { key: "werkplek", header: "Werkplek", type: "text", required: true, description: "Zaagstraat, Lasstraat 1, Lasstraat 2, Assemblage, Spuiterij of Eindcontrole", example: "Lasstraat 1" },
      { key: "volgorde", header: "Volgorde", type: "number", description: "Werkvolgorde binnen het project", example: "2" },
      { key: "omschrijving", header: "Omschrijving", type: "text", required: true, description: "Wat er gemaakt wordt", example: "Frame lassen" },
      { key: "vcUren", header: "VC-uren", type: "number", required: true, description: "Voorgecalculeerde uren", example: "12" },
      { key: "start", header: "Geplande start", type: "date", description: "Leeg = nog niet ingepland", example: "01-12-2026" },
      { key: "eind", header: "Geplande eind", type: "date", description: "Leeg = nog niet ingepland", example: "03-12-2026" },
      { key: "status", header: "Status", type: "text", required: true, description: "Te plannen, Gepland, In productie, Gereed of Afwijking", example: "Gepland" },
    ],
  },
  calculatieregels: {
    id: "calculatieregels",
    label: "Calculatieregels",
    fileName: "Bemet_Calculatieregels.xlsx",
    description: "Calculatiedetails per project: materiaal, equipment en colli met gewicht en afmeting.",
    usedBy: ["Montage", "Montageplanning", "Logistiek"],
    columns: [
      { key: "projectnummer", header: "Projectnummer", type: "text", required: true, description: "Koppeling met Projecten", example: "PRJ-0241" },
      { key: "regel", header: "Regel", type: "number", required: true, description: "Regelnummer", example: "3" },
      { key: "soort", header: "Soort", type: "text", required: true, description: "Materiaal, Equipment of Colli", example: "Equipment" },
      { key: "artikelcode", header: "Artikelcode", type: "text", description: "Artikel- of equipmentcode", example: "EQ-HW12" },
      { key: "omschrijving", header: "Omschrijving", type: "text", required: true, description: "Omschrijving van de regel", example: "Hoogwerker 12 m" },
      { key: "aantal", header: "Aantal", type: "number", required: true, description: "Aantal", example: "1" },
      { key: "eenheid", header: "Eenheid", type: "text", description: "st, m, kg, dag", example: "dag" },
      { key: "gewicht", header: "Gewicht (kg)", type: "number", description: "Gewicht per stuk (colli en materiaal)", example: "420" },
      { key: "lengte", header: "Lengte (mm)", type: "number", description: "Afmeting colli", example: "2400" },
      { key: "breedte", header: "Breedte (mm)", type: "number", description: "Afmeting colli", example: "1200" },
      { key: "hoogte", header: "Hoogte (mm)", type: "number", description: "Afmeting colli", example: "1800" },
    ],
  },
};

export const EXPORT_LIST: ExportSpec[] = Object.values(EXPORTS);

// ---- Getypte rijen ---------------------------------------------------------

export interface Project {
  projectnummer: string; omschrijving: string; klant: string; plaats?: string; land?: string;
  ordertype: string; status: string; projectleider?: string; engineer?: string;
  leverdatum: Date; montageStart?: Date; vcUrenProductie?: number; vcUrenMontage?: number;
  nacalculatie?: boolean; kraan?: boolean; hoogwerker?: boolean;
}
export interface Medewerker {
  personeelsnummer: string; voornaam: string; achternaam: string; email: string; afdeling: string;
  functie: string; manager?: string; team?: string; werkplek?: string; contracturen?: number; taal?: string;
}
export interface Verlofsaldo {
  personeelsnummer: string; jaar: number; recht: number; opgenomen: number; aangevraagd?: number; saldo: number;
}
export interface Productieorder {
  ordernummer: string; projectnummer: string; werkplek: string; volgorde?: number; omschrijving: string;
  vcUren: number; start?: Date; eind?: Date; status: string;
}
export interface Calculatieregel {
  projectnummer: string; regel: number; soort: string; artikelcode?: string; omschrijving: string;
  aantal: number; eenheid?: string; gewicht?: number; lengte?: number; breedte?: number; hoogte?: number;
}

export interface ExportRows {
  projecten: Project[];
  medewerkers: Medewerker[];
  verlofsaldo: Verlofsaldo[];
  productieorders: Productieorder[];
  calculatieregels: Calculatieregel[];
}
