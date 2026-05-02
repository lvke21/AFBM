# Refactor Final Evaluation

Stand: 2026-05-01

## Gesamturteil

Die Refactor-Serie AP1-AP6 hat den Codezustand verbessert, aber nicht grundlegend transformiert. Die wichtigsten Gewinne liegen in stabilerer Online-State-Fuehrung, weniger doppelten Firestore-Subscriptions, geringerer Renderarbeit im Draft Room und etwas saubereren Importgrenzen. Die groessten Architekturprobleme bleiben bestehen: `online-league-service.ts` ist weiterhin ein sehr grosser Monolith, mehrere Client-Komponenten bleiben schwergewichtig, und die Browser-E2E-Schicht ist aktuell nicht zuverlaessig gruen.

Klare Empfehlung: **so lassen, aber weiter refactoren in kleinen Schritten**. Die AP1-AP6-Aenderungen sollten nicht zurueckgebaut werden. Vor groesseren weiteren Refactors sollten aber zuerst die E2E-Testinfrastruktur und Seed-Idempotenz repariert werden.

## Vorher vs. Nachher

| Bereich | Vorher | Nachher | Bewertung |
| --- | --- | --- | --- |
| Codegroesse | Mehr Logik in einzelnen Komponenten, doppelte Online-Ladeeffekte, wiederholte Admin-/Firebase-MVP-Branches | Neue kleine Utility-/Config-Dateien, weniger Wiederholung in einzelnen Komponenten, aber mehr Gesamtdateien | Leicht besser |
| Komplexitaet | Online-Dashboard, Draft-Seite und App-Shell konnten eigene Lade-/Subscription-Ketten starten | Route-State liegt zentral in `online-league-route-state.tsx`; Dashboard und Draft teilen Snapshot | Deutlich besser |
| Wartbarkeit | `online-league-service.ts` wurde stark als Barrel fuer Typen, Konstanten und Runtime-Funktionen genutzt | Einige Typen/Konstanten kommen direkt aus Fachmodulen; Runtime-Imports bleiben wo noetig | Etwas besser |
| Performance-Risiken | Draft Room berechnete Listen, Picks, Roster und Counts bei jedem Render neu; mehrere Live-Subscriptions pro Route moeglich | Draft Room nutzt Memoization; Route startet nur noch eine Online-League-Subscription | Deutlich besser im betroffenen Pfad |
| Testbarkeit | Firebase Join-/Mirror-Rules waren weniger E2E-nah abgesichert | Rules und Parity Tests decken Membership/Mirror-Pfade besser ab | Besser |
| Release-Sicherheit | Unit-/Build-Abdeckung vorhanden, Browser-E2E schon fragil | Unit-/Build/Firebase gruen, Browser-E2E weiterhin blockiert | Gleich geblieben bis leicht riskanter sichtbar |

## Was wurde besser?

### 1. Online-League-State ist sauberer gefuehrt

AP1 hat die wichtigste strukturelle Verbesserung geliefert. Vorher konnten `OnlineLeagueAppShell`, `OnlineLeaguePlaceholder` und `OnlineLeagueDraftPage` jeweils eigene Lade- und Subscription-Pfade oeffnen. Nachher liegen `getCurrentUser()`, `getLeagueById()` und `subscribeToLeague()` in der Route nur noch in `src/components/online/online-league-route-state.tsx`.

Aktueller statischer Check fuer die AP1-Komponenten:

- `repository.getCurrentUser()` nur noch in `online-league-route-state.tsx`
- `repository.getLeagueById()` nur noch in `online-league-route-state.tsx`
- `repository.subscribeToLeague()` nur noch in `online-league-route-state.tsx`

Das reduziert Firestore-Read-/Subscription-Risiken und macht Reload-/Error-State nachvollziehbarer.

### 2. Draft Room rendert billiger

AP3 hat mehrere Renderpfad-Berechnungen memoisiert:

- Teamnamen-Map
- verfuegbare Spieler
- gepickte Spieler
- eigener Roster
- Roster-Positionscounts

Zusätzlich zaehlt `getRosterCounts()` Positionen jetzt in einem Lauf statt pro Position erneut ueber den Roster zu filtern. Das ist eine echte Performance-Verbesserung ohne fachliche Aenderung.

### 3. Firebase Join-/Membership-Pfad ist robuster abgesichert

AP2 hat Rules und Tests verbessert:

- eigene `leagueMembers` Mirrors koennen query-sicher gelesen werden
- fehlender eigener Mirror blockiert Join-Transactions nicht
- fremde und malformed Mirrors bleiben verboten

Das verbessert weniger die Codegroesse, aber klar die Wartbarkeit und Regressionssicherheit eines kritischen Multiplayer-Pfads.

### 4. Lokale Firebase-MVP-Warnlogik ist weniger verstreut

AP4 hat die zentrale Meldung und den Guard fuer lokale, noch nicht Firebase-synchronisierte Actions ausgelagert. Dadurch ist `OnlineLeaguePlaceholder` etwas weniger repetitiv, ohne lokale Actions oder Firebase-Verhalten zu veraendern.

### 5. Admin-Action-Boilerplate wurde teilweise reduziert

AP5 hat drei nicht-destruktive Admin-Actions konfigurierbar gemacht:

- `set-all-ready`
- `start-league`
- `refresh-league`

Das entfernt kleine Handler-Dopplung und macht Buttondaten sichtbarer. Der Gewinn ist klein, aber sauber begrenzt.

### 6. Importflaeche des Online-Monolithen ist etwas kleiner

AP6 hat reine Typ- und Draft-Konstanten-Imports in mehreren Client-Dateien aus `online-league-service.ts` herausgezogen:

- Typen aus `online-league-types.ts`
- Draft-Konstanten aus `online-league-draft-service.ts`

Der Runtime-Monolith bleibt bestehen, wird aber nicht mehr ganz so oft als generelles Import-Barrel verwendet.

## Was ist gleich geblieben?

### 1. `online-league-service.ts` bleibt der Hauptmonolith

Aktuelle Groesse:

- `src/lib/online/online-league-service.ts`: **8977 Zeilen**

Das ist weiterhin der zentrale Wartbarkeitsengpass. AP6 hat nur Importpfade verbessert, aber keine Business-Logik aus dem Monolithen verschoben.

### 2. Grosse Client-Komponenten bleiben gross

Aktuelle Groessen:

- `src/components/online/online-league-placeholder.tsx`: **1834 Zeilen**
- `src/components/admin/admin-league-detail.tsx`: **1758 Zeilen**
- `src/components/online/online-fantasy-draft-room.tsx`: **339 Zeilen**

`OnlineLeaguePlaceholder` und `AdminLeagueDetail` sind weiterhin schwer zu reviewen, weil UI, lokale UI-State-Maschine, Action-Handler und viele Panels in grossen Dateien zusammenliegen.

### 3. Runtime-Abhaengigkeiten auf `online-league-service.ts` bestehen weiter

Nach AP6 importieren Client-Dateien weiterhin Runtime-Funktionen aus `online-league-service.ts`, wo sie wirklich gebraucht werden:

- `admin-control-center.tsx`
- `admin-league-detail.tsx`
- `admin-league-manager.tsx`
- `online-league-detail-model.ts`
- `online-league-route-state.tsx`
- `online-league-placeholder.tsx`

Das ist korrekt fuer AP6, bedeutet aber: Bundle- und Kopplungsgewinn bleibt begrenzt.

### 4. Browser-E2E ist weiterhin nicht stabil gruen

Der Regression-Report zeigt:

- `npm run test:e2e` scheitert an einem nicht eindeutigen `AFBM Manager` Locator.
- `npm run test:e2e:navigation` scheitert an einem nicht-idempotenten Seed mit doppelter `SaveGame.id`.

Das ist kein nachgewiesener AP1-AP6-Funktionsverlust, aber ein reales Release-/Refactoring-Risiko.

## Was ist riskanter geworden?

### 1. Online Route-State ist zentraler, also auch wichtiger

AP1 reduziert doppelte Quellen, aber `online-league-route-state.tsx` wird dadurch ein kritischer Knoten. Ein Fehler dort betrifft Dashboard und Draft-Seite gleichzeitig. Das ist architektonisch trotzdem besser als mehrere divergierende Ladepfade, braucht aber gute Tests und Browser-QA.

Risiko: **mittel**

### 2. Memoization kann stale State verstecken, wenn Dependencies spaeter falsch erweitert werden

AP3 ist aktuell getestet und plausibel. Das Risiko entsteht spaeter, wenn neue Draft-Anzeigen ergänzt werden und Dependency-Arrays unvollstaendig bleiben.

Risiko: **niedrig**

### 3. Config-basierte Admin-Actions koennen UI-nahe Strings verstecken

AP5 zentralisiert Buttondaten inklusive CSS-Klassen. Das ist fuer drei Actions vertretbar, kann aber schlechter werden, wenn zu viele semantisch unterschiedliche Actions in dieselbe Config gezwungen werden.

Risiko: **niedrig**

### 4. Die Testbasis zeigt jetzt klarer, dass Browser-E2E nicht belastbar ist

Das Risiko ist nicht durch den Code groesser geworden, aber sichtbarer. Weitere Refactors ohne reparierte E2E-Schicht waeren riskanter, weil GUI-/Flow-Regressionen nicht sauber detektiert werden.

Risiko: **mittel bis hoch fuer weitere Refactors**

## Performance-Risiken nach Refactor

Verbessert:

- Weniger doppelte Online-Subscriptions pro Liga-Route.
- Draft Room vermeidet mehrere teure Ableitungen pro Render.
- Position Counts sind algorithmisch guenstiger.

Weiterhin offen:

- `subscribeToLeague()` selbst bleibt breit und liest mehrere Datenbereiche.
- Grosse Client Components koennen weiterhin viele States und Props im Renderpfad bewegen.
- `online-league-service.ts` als grosser Runtime-Import kann Bundle-/Tree-Shaking-Effekte erschweren.
- Admin- und Online-Dashboards enthalten weiterhin viele Tabellen/Panels ohne echte Virtualisierung.

## Wartbarkeitsbewertung

Vorher: **Rot/Gelb**

- Doppelte Online-State-Pfade
- Kritischer Rules-Pfad weniger abgesichert
- Grosse Komponenten mit viel gemischter Verantwortung
- Monolithischer Online-Service

Nachher: **Gelb**

- Online-State deutlich besser
- Draft Room besser
- Rules-Pfad besser
- Kleine Utilities/Configs reduzieren Wiederholung
- Monolith und grosse Komponenten bleiben
- Browser-E2E blockiert weiterhin volle Sicherheit

## Naechste sinnvolle Schritte

### Schritt 1: E2E zuerst stabilisieren

Prioritaet: **sehr hoch**

Konkrete Arbeit:

- Smoke-Test-Locator von `getByText("AFBM Manager")` auf eindeutige Role-/Link-Assertion umstellen.
- `scripts/seeds/e2e-seed.ts` idempotent machen oder eigene Fixture-IDs vor Seed entfernen.
- Danach mindestens laufen lassen:
  - `npm run test:e2e`
  - `npm run test:e2e:navigation`
  - `npm run test:e2e:multiplayer`

Begruendung: Ohne stabile Browser-E2E werden weitere UI-/Flow-Refactors zu blind.

### Schritt 2: `OnlineLeaguePlaceholder` weiter segmentieren

Prioritaet: **hoch**

Konkrete Arbeit:

- Nur weitere lokale Action-Handler in kleine Hooks/Utilities extrahieren.
- Keine JSX-Panels verschieben, solange Props explodieren.
- Pro Schritt 3-5 Handler, wie AP4 bereits begonnen hat.

Begruendung: Diese Datei bleibt mit 1834 Zeilen einer der groessten Client-Wartbarkeitsrisiken.

### Schritt 3: `online-league-service.ts` fachlich schneiden

Prioritaet: **hoch, aber erst nach E2E-Fix**

Konkrete Arbeit:

- Keine Big-Bang-Aufteilung.
- Erst rein lesende Query-/View-Helper in existierende Fachmodule verschieben.
- Danach Actions nach Domänen gruppieren:
  - Contracts/Cap
  - Trades
  - Draft
  - Training
  - Week Flow

Begruendung: 8977 Zeilen sind zu gross fuer dauerhaft sichere Feature-Arbeit.

### Schritt 4: Admin Detail in kleine, sichere Bereiche zerlegen

Prioritaet: **mittel**

Konkrete Arbeit:

- Nicht-destruktive Display-Sektionen extrahieren.
- Destruktive Actions und Confirm-Logik erst spaeter anfassen.
- GM-Row-Actions nur mit dedizierten Tests extrahieren.

Begruendung: `AdminLeagueDetail` bleibt mit 1758 Zeilen schwer reviewbar, aber riskanter als reine Display-Komponenten.

### Schritt 5: Importgrenzen weiter reduzieren

Prioritaet: **mittel**

Konkrete Arbeit:

- Weitere reine Typimporte aus `online-league-service.ts` entfernen.
- Runtime-Funktionen erst verschieben, wenn Fachmodule klar sind.
- Re-Exports im Service erst entfernen, wenn keine Abhaengigkeiten mehr bestehen.

Begruendung: AP6 war ein sauberer Start, aber noch kein struktureller Bundle-Schnitt.

## Klare Empfehlung

**So lassen und weiter refactoren, aber nicht groesser werden lassen.**

Die AP1-AP6-Aenderungen sind wertvoll und sollten bleiben. Sie reduzieren echte Risiken, ohne die kritischen Systeme fachlich umzubauen. Der Zustand ist aber noch nicht "fertig refactored". Der naechste Hebel ist nicht noch mehr Produktionscode, sondern zuerst eine verlaessliche Browser-E2E-Basis. Danach sollte der Online-Monolith schrittweise geschnitten werden.

Empfohlene Reihenfolge:

1. E2E Smoke und Navigation reparieren.
2. `OnlineLeaguePlaceholder` weiter mit kleinen Handler-Extraktionen entlasten.
3. `online-league-service.ts` in fachliche Module aufbrechen.

Finale Bewertung: **Gelb mit positiver Tendenz**.
