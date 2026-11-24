# Architectuur en de weg naar Microsoft 365

De testversie is zo gebouwd dat nep-inloggen en dummy-Excels later één-op-één vervangen worden door Microsoft 365.
De modules praten nooit direct met een bron; ze gebruiken drie interfaces.

| Laag | Interface | Testfase | Livegang |
| --- | --- | --- | --- |
| Inloggen | `AuthProvider` (`src/core/auth/types.ts`) | `DemoAuthProvider`: rol en persoon kiezen | `EntraAuthProvider`: Microsoft-werkaccount met MFA (MSAL) |
| Bemet-exports lezen | `ExportSource` (`src/core/data/sources/types.ts`) | `StaticExportSource`: bestanden in `public/data/` | `GraphExportSource`: SharePoint/OneDrive-map via Microsoft Graph |
| Eigen gegevens opslaan | `AppStore` (`src/core/store/index.ts`) | `LocalStore`: in de browser | API met een kleine database in Azure |

Welke variant actief is, staat in `src/core/config.ts` en wordt bepaald door omgevingsvariabelen bij het bouwen:

| Variabele | Testfase | Livegang |
| --- | --- | --- |
| `VITE_AUTH_MODE` | `demo` | `entra` |
| `VITE_DATA_SOURCE` | `static` | `graph` |
| `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_TENANT_ID` | leeg | uit de app-registratie |
| `VITE_GRAPH_EXPORT_FOLDER` | leeg | Graph-URL van de exportmap |

## Rollen

In de testfase kies je zelf een rol. Bij de livegang komen rollen uit Entra ID als app-rollen
(`FlexxoApp.Monteur`, `FlexxoApp.Montageplanner`, ...; zie `ROLE_CLAIMS` in `entraAuth.ts`). IT wijst mensen toe,
dus IT bepaalt wie welke modules ziet. Welke modules bij welke rol horen staat in `src/core/roles.ts`.

## Data uit Bemet

1. Bemet schrijft de exports automatisch weg (bijv. elk kwartier of elk uur).
2. Testfase: verzonnen bestanden in `public/data/`, met het peilmoment in `manifest.json`.
3. Livegang: dezelfde bestandsnamen in een SharePoint-map. Het peilmoment is de wijzigingsdatum van het bestand.
4. `src/core/data/repository.ts` leest alle exports, controleert de kolommen en geeft getypte rijen aan de modules.
5. Problemen (ontbrekende kolommen, lege verplichte velden) zijn zichtbaar op de pagina Gegevens.

Data terug naar Bemet (uren, verlof, calculatieopzet) gaat bij de livegang via importbestanden in een vaste map,
waar de bestaande Bemet-scripts ze oppakken.

## Nodig van IT bij de livegang

- Een app-registratie in Entra ID (single-page app) met app-rollen voor de zeven rollen.
- Graph-rechten: `User.Read`, `Files.Read.All` of `Sites.Selected` voor de exportmap, later `Mail.Send` en schrijfrechten voor formulieren.
- Een Azure-abonnement voor hosting (Static Web Apps) en de kleine database.
- De SharePoint- of OneDrive-map waar Bemet de exports neerzet.

Bij de overstap wordt de repository privé; pas dan mag de echte organisatienaam erin.
