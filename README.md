# FlexxoApp

Interne web-app voor planning, montage, logistiek, productie en personeelszaken. Werkt op telefoon, tablet en desktop.

> **Testomgeving.** Deze repository is openbaar om te kunnen testen. Alle namen, klanten, projecten en cijfers zijn verzonnen.
> Inloggen gaat door een rol te kiezen; er is geen echte koppeling met systemen.

## Wat zit erin (basis)

- **App-frame per apparaat** volgens het FlexxoApp-brandbook: tabbar onderaan op telefoon, navigatierail op tablet, zijbalk op desktop.
- **Inloggen met een rol**: monteur, montageplanner, productiemedewerker, productieplanner, logistiek, medewerker of manager. De rol bepaalt welke modules je ziet.
- **Data uit Excel** in het formaat van de automatische Bemet-exports (zie [docs/bemet-exports.md](docs/bemet-exports.md)).
- **Zes modules** als voorproef: Montageplanning, Montage, Logistiek, Productie, Productieplanning en Collega. Ze worden één voor één uitgebouwd.

## Zelf draaien

```bash
npm install
npm run dev        # http://localhost:5173, ook bereikbaar op je netwerk (tablet/telefoon)
npm test           # controleert o.a. dat de dummy-Excels op het kolomformaat passen
npm run build
```

| Script | Wat het doet |
| --- | --- |
| `npm run data` | Maakt nieuwe verzonnen Bemet-exports in `public/data/` |
| `npm run docs` | Werkt `docs/bemet-exports.md` bij uit `src/core/data/exports.ts` |
| `npm run check:anon` | Controleert dat er geen organisatienamen in de repository staan |

## Publiceren

Elke push naar `main` bouwt de app en zet hem op GitHub Pages (`.github/workflows/deploy.yml`).
De workflow maakt eerst verse testdata, draait de tests en de anonimiseringscheck, en publiceert alleen als alles slaagt.

## Opbouw

```
src/
  brand/        brandbook (tokens, componenten). Niet aanpassen.
  core/
    auth/       inloggen: demo (rol kiezen) en later Microsoft Entra ID
    data/       Bemet-exports: kolomformaat, inlezen, bronnen (testdata of SharePoint)
    store/      opslag van wat de app zelf maakt (nu in de browser, later Azure)
    roles.ts    rollen en welke modules ze zien
  modules/      de modules
  pages/        inloggen, startscherm, gegevens, profiel
scripts/        dummy-data, documentatie, anonimiseringscheck
docs/           kolomformaat, architectuur en testen
```

Zie [docs/architectuur.md](docs/architectuur.md) voor hoe de koppeling met Microsoft 365 later wordt ingeplugd, en [docs/testen.md](docs/testen.md) voor wat je nu kunt testen.
