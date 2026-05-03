# Bundle And Build Analysis

## Ziel der Analyse

Bewertung von Bundle-Groesse, Tree-Shaking-Risiken, grossen Dependencies, dynamischen Imports und Build-Artefakten.

## Untersuchte Bereiche

- `package.json`
- `.next` lokale Build-Artefakte
- `src/app/*`
- `src/components/admin/*`
- `src/components/online/*`
- `src/lib/online/*`
- `src/modules/gameplay/*`
- `src/modules/seasons/*`

## Dependencies

Runtime Dependencies laut `package.json`:

- `@prisma/client`
- `firebase`
- `firebase-admin`
- `next`
- `react`
- `react-dom`
- `zod`

Dev Dependencies:

- `@playwright/test`
- `@types/*`
- `eslint`
- `firebase-tools`
- `playwright`
- `prisma`
- `tsx`
- `typescript`
- `vitest`
- Tailwind/PostCSS Tooling

## Bundle-Risiken durch Dependencies

| Dependency | Risiko | Bewertung |
| --- | --- | --- |
| `firebase` | Client SDK kann gross werden, wenn breite Imports oder viele Firestore/Auth-Pfade in Client-Komponenten landen. | Mittel-Hoch |
| `firebase-admin` | Darf nie in Client-Bundles importiert werden. Vorheriger Fehler mit `fs`/`child_process` zeigt reales Risiko. | Hoch |
| `@prisma/client` | Muss serverseitig bleiben. Dynamic Imports im Savegame-Service sind positiv. | Mittel |
| Game Engine Module | Sehr grosse TS-Module, sollten nicht in Client-Routen geraten. | Mittel-Hoch |

## Lokale Build-Artefakte

Lokale `.next`-Messung:

- `.next`: ca. 748 MB.
- `.next/static`: ca. 41 MB.
- `.next/server`: ca. 28 MB.
- Groesste raw JS-Chunks in `.next/static/chunks`:
  - `main-app.js`: ca. 7.6 MB.
  - `app/page.js`: ca. 7.2 MB.
  - `app/layout.js`: ca. 6.3 MB.

Wichtige Einschraenkung:

Diese `.next`-Werte sind raw lokale Artefakte und muessen nicht einer frischen, komprimierten Production-Build-Auslieferung entsprechen. Fuer eine belastbare Entscheidung braucht es einen frischen `npm run build` plus Bundle Analyzer oder Next Build-Metriken.

Bestehende aeltere Build-Reports nannten First-Load-JS-Werte im Bereich ca. 264-292 kB fuer zentrale Routen. Diese Werte sind plausibler fuer User-facing Bundle-Budgets als raw `.next`-Dateigroessen.

## Route-Risiken

| Route/Bereich | Risiko |
| --- | --- |
| `/online/league/[leagueId]` | Online Dashboard laedt viele Panels, Detailmodelle und Service-Typen. |
| `/online/league/[leagueId]/draft` | Draft Room ist besser optimiert, aber haengt an League-Snapshot und Player Pool. |
| `/admin` | Admin Control Center kann selten genutzte Debug-/Management-Bereiche direkt laden. |
| `/admin/league/[leagueId]` | Admin Detail ist gross und action-lastig. |
| Savegames Einstieg | Viele Einstiegspfade koennen Code fuer Offline/Online/Admin gemeinsam laden. |

## Dynamische Imports

Gefunden wurden nur wenige dynamische Imports:

- `src/modules/savegames/application/savegame-command.service.ts`
  - dynamische Imports fuer Prisma/Reference-Data/Bootstrap-Pfade.
- Testspezifische dynamische Imports.

Nicht gefunden:

- Keine nennenswerte `next/dynamic`-Strategie fuer schwere Frontend-Panels.
- Keine klare Lazy-Loading-Grenze fuer Admin Debug, Online Advanced Panels oder grosse Manager-Views.

## Tree-Shaking-Risiken

### 1. `online-league-service.ts`

Datei: `src/lib/online/online-league-service.ts`

Risiko:
- Sehr grosser Barrel-/Service-Knoten.
- Wenn Client-Dateien Runtime-Funktionen daraus importieren, koennen mehr Abhaengigkeiten als noetig in Client-Bundles landen.

Aktueller Zustand:
- Einige Typ-/Konstanten-Imports wurden bereits aus Fachmodulen gezogen.
- Restabhaengigkeiten bestehen.

Empfehlung:
- Weiterhin nur kleine sichere Import-Schnitte.
- Typen konsequent aus `online-league-types.ts` importieren.
- Client-Komponenten nicht aus Server-/Admin-Modulen importieren lassen.

### 2. Firebase Admin SDK

Risiko:
- `firebase-admin` importiert Node-Module wie `fs` und `child_process`.
- Client-Import fuehrt sofort zu Build-Fehlern.

Aktueller Zustand:
- Bereits frueher abgesichert durch client-safe UID-Allowlist.

Empfehlung:
- CI-Check behalten:
  - `rg "firebase-admin" src/components src/app -n`
  - `rg "@/lib/firebase/admin" src/components src/app -n`

### 3. Engine Imports

Risiko:
- Simulation/Gameplay-Engine ist gross.
- Wenn UI-Komponenten direkte Engine-Pfade importieren, koennen Bundles wachsen.

Empfehlung:
- Engine-Nutzung ueber serverseitige Services/API halten.
- UI nur Ergebnis-/View-Model-Typen importieren lassen.

## Build-Performance-Risiken

1. Sehr grosse TS-Dateien verlangsamen Typecheck und Build.
2. Grosse statische Module wie `play-library.ts` belasten Parser und Compiler.
3. Barrel-artige Imports erschweren Tree-Shaking.
4. Client Components mit vielen Imports koennen Routen breiter machen als noetig.
5. Fehlende Bundle-Budgets machen Regressionen spaet sichtbar.

## Empfehlungen

### Quick Wins

1. Ein read-only Bundle-Report-Script dokumentieren:
   - frischer Build.
   - Route-Bundle-Groessen aus Next Output.
   - optional `@next/bundle-analyzer`, falls spaeter erlaubt.
2. CI/Release-Check fuer verbotene Client-Imports:
   - `firebase-admin`
   - `@/lib/firebase/admin`
   - grosse Server-only Simulation Services.
3. Weitere Client-Imports aus `online-league-service.ts` durch Fachmodule ersetzen.
4. Admin Debug Panels via `next/dynamic` oder conditional mount pruefen.

### Groessere Arbeit

1. Route-spezifische Code-Splitting-Strategie fuer Admin/Online.
2. Engine-/Play-Library-Daten aus Build-Pfad auslagern oder serverseitig kapseln.
3. Bundle-Budget im Release-Prozess:
   - Warnung ab +10 Prozent First Load JS.
   - Blocker ab definierter Obergrenze fuer Haupt-Routen.

## Fazit

Das groesste Bundle-Risiko ist nicht eine einzelne Dependency, sondern Import-Kopplung: grosse Services und Engine-Module duerfen nicht versehentlich Client-Grenzen ueberschreiten. Die App hat bereits wichtige Korrekturen gesehen, braucht aber feste Bundle-Gates und mehr route-spezifisches Lazy Loading.
