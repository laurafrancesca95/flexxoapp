# Bemet-exports: kolomformaat

> Dit bestand wordt gemaakt met `npm run docs` uit `src/core/data/exports.ts`. Pas daar de kolommen aan, niet hier.

FlexxoApp leest de automatische Excel-exports uit Bemet. In de testfase zijn dat verzonnen bestanden in `public/data/`
(gemaakt met `npm run data`). Bij de livegang zet Bemet dezelfde bestanden in een SharePoint-map.

**Algemene regels**

- Eén werkblad per bestand; rij 1 bevat de kopnamen, daarna één rij per regel.
- Kolommen worden op kopnaam gevonden, niet op positie. Hoofdletters en extra spaties maken niet uit.
- Extra kolommen zijn toegestaan en worden genegeerd. Verplichte kolommen moeten er zijn.
- Datums als Excel-datum of als tekst `dd-mm-jjjj`. Getallen als Excel-getal of in Nederlandse notatie (`1.250,5`).
- J/N-velden accepteren ook Ja/Nee, X en 1/0.
- Het peilmoment is het moment waarop Bemet het bestand schreef (in de testfase: `public/data/manifest.json`).
- Heeft de echte export een andere kopnaam? Voeg die toe als `aliases` in `exports.ts`. De app blijft verder gelijk.

## Projecten

`Bemet_Projecten.xlsx` · Alle lopende projecten met status, data en voorcalculatie-uren (VC-uren).

Gebruikt door: Montageplanning, Montage, Logistiek, Productie, Productieplanning

| Kolom | Type | Verplicht | Omschrijving | Voorbeeld |
| --- | --- | --- | --- | --- |
| Projectnummer | Tekst | Ja | Uniek projectnummer | `PRJ-0241` |
| Omschrijving | Tekst | Ja | Korte projectomschrijving | `Pompskid 2x 15 kW` |
| Klant | Tekst | Ja | Naam van de klant | `Zilvermeer Waterbeheer` |
| Plaats | Tekst | Nee | Plaats van montage of levering | `Apeldoorn` |
| Land | Tekst | Nee | Landcode (NL, BE, DE, PL) | `NL` |
| Ordertype | Tekst | Ja | Nieuwbouw, Renovatie, Service of Levering | `Nieuwbouw` |
| Status | Tekst | Ja | Te plannen, Gepland, In productie, Gereed voor transport, In montage, Gereed | `Te plannen` |
| Projectleider | Tekst | Nee | Naam projectleider | `Sanne de Wit` |
| Engineer | Tekst | Nee | Naam engineer (ontvangt o.a. inmeetsheets) | `Ruben Kok` |
| Leverdatum | Datum (dd-mm-jjjj) | Ja | Afgesproken leverdatum | `12-01-2027` |
| Gewenste start montage | Datum (dd-mm-jjjj) | Nee | Gewenste startdatum op locatie | `18-01-2027` |
| VC-uren productie | Getal | Nee | Voorgecalculeerde uren productie | `64` |
| VC-uren montage | Getal | Nee | Voorgecalculeerde uren montage | `48` |
| Nacalculatie | J/N | Nee | Nacalculatieproject (J/N) | `J` |
| Kraan nodig | J/N | Nee | Kraan nodig op locatie (J/N) | `N` |
| Hoogwerker nodig | J/N | Nee | Hoogwerker nodig op locatie (J/N) | `J` |

## Medewerkers

`Bemet_Medewerkers.xlsx` · Personeel met afdeling, functie, manager en werkplek.

Gebruikt door: Collega, Montageplanning, Productieplanning

| Kolom | Type | Verplicht | Omschrijving | Voorbeeld |
| --- | --- | --- | --- | --- |
| Personeelsnummer | Tekst | Ja | Uniek personeelsnummer | `1007` |
| Voornaam | Tekst | Ja | Voornaam | `Daan` |
| Achternaam | Tekst | Ja | Achternaam (incl. tussenvoegsel) | `van Leeuwen` |
| E-mail | Tekst | Ja | Werk-e-mail; later de koppeling met het Microsoft-account | `daan.vanleeuwen@example.com` |
| Afdeling | Tekst | Ja | Montage, Productie, Planning, Logistiek, Kantoor of Management | `Montage` |
| Functie | Tekst | Ja | Functienaam | `Monteur` |
| Manager | Tekst | Nee | Personeelsnummer van de leidinggevende | `1001` |
| Team | Tekst | Nee | Montageteam (alleen monteurs) | `Team 2` |
| Werkplek | Tekst | Nee | Vaste werkplek (alleen productie) | `Lasstraat 1` |
| Contracturen per week | Getal | Nee | Contracturen per week | `40` |
| Taal | Tekst | Nee | Voorkeurstaal: NL, DE of PL | `NL` |

## Verlofsaldo

`Bemet_Verlofsaldo.xlsx` · Verlofrecht en -opname per medewerker voor het lopende jaar.

Gebruikt door: Collega

| Kolom | Type | Verplicht | Omschrijving | Voorbeeld |
| --- | --- | --- | --- | --- |
| Personeelsnummer | Tekst | Ja | Koppeling met Medewerkers | `1007` |
| Jaar | Getal | Ja | Kalenderjaar | `2026` |
| Verlofrecht (u) | Getal | Ja | Totaal verlofrecht in uren, incl. meegenomen saldo | `216` |
| Opgenomen (u) | Getal | Ja | Al opgenomen uren | `152` |
| Aangevraagd (u) | Getal | Nee | Goedgekeurd maar nog niet opgenomen | `16` |
| Saldo (u) | Getal | Ja | Resterende uren | `48` |

## Productieorders

`Bemet_Productieorders.xlsx` · Productieorders per project en werkplek, met volgorde en VC-uren.

Gebruikt door: Productie, Productieplanning

| Kolom | Type | Verplicht | Omschrijving | Voorbeeld |
| --- | --- | --- | --- | --- |
| Ordernummer | Tekst | Ja | Uniek productieordernummer | `PO-24110` |
| Projectnummer | Tekst | Ja | Koppeling met Projecten | `PRJ-0241` |
| Werkplek | Tekst | Ja | Zaagstraat, Lasstraat 1, Lasstraat 2, Assemblage, Spuiterij of Eindcontrole | `Lasstraat 1` |
| Volgorde | Getal | Nee | Werkvolgorde binnen het project | `2` |
| Omschrijving | Tekst | Ja | Wat er gemaakt wordt | `Frame lassen` |
| VC-uren | Getal | Ja | Voorgecalculeerde uren | `12` |
| Geplande start | Datum (dd-mm-jjjj) | Nee | Leeg = nog niet ingepland | `01-12-2026` |
| Geplande eind | Datum (dd-mm-jjjj) | Nee | Leeg = nog niet ingepland | `03-12-2026` |
| Status | Tekst | Ja | Te plannen, Gepland, In productie, Gereed of Afwijking | `Gepland` |

## Calculatieregels

`Bemet_Calculatieregels.xlsx` · Calculatiedetails per project: materiaal, equipment en colli met gewicht en afmeting.

Gebruikt door: Montage, Montageplanning, Logistiek

| Kolom | Type | Verplicht | Omschrijving | Voorbeeld |
| --- | --- | --- | --- | --- |
| Projectnummer | Tekst | Ja | Koppeling met Projecten | `PRJ-0241` |
| Regel | Getal | Ja | Regelnummer | `3` |
| Soort | Tekst | Ja | Materiaal, Equipment of Colli | `Equipment` |
| Artikelcode | Tekst | Nee | Artikel- of equipmentcode | `EQ-HW12` |
| Omschrijving | Tekst | Ja | Omschrijving van de regel | `Hoogwerker 12 m` |
| Aantal | Getal | Ja | Aantal | `1` |
| Eenheid | Tekst | Nee | st, m, kg, dag | `dag` |
| Gewicht (kg) | Getal | Nee | Gewicht per stuk (colli en materiaal) | `420` |
| Lengte (mm) | Getal | Nee | Afmeting colli | `2400` |
| Breedte (mm) | Getal | Nee | Afmeting colli | `1200` |
| Hoogte (mm) | Getal | Nee | Afmeting colli | `1800` |

