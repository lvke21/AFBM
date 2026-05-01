# Refactor AP5: UI Component Split Report

Status: Gruen

## Executive Summary

AP5 entlastet grosse UI-Komponenten ohne sichtbare Verhaltensaenderung. Der groesste Schnitt liegt im Online-League-Dashboard: der Container `OnlineLeaguePlaceholder` behaelt State, Actions, Repository-Zugriff und Sync-Handling; wiederverwendbare UI-Bloecke fuer Header, Ladezustand, Feedback, First Steps, Liga-Regeln und Week Flow sind in reine Presentational Components ausgelagert.

Im Adminbereich wurden wiederholte Pending-Action-Guards und Feedback-Banner gekapselt. Die sichtbare Admin-UI bleibt gleich, aber doppelte State-/Guard-Logik in Manager und Detail wurde reduziert.

## Geaenderte Dateien

| Datei | Aenderung |
| --- | --- |
| `src/components/online/online-league-placeholder.tsx` | Container entlastet; obere Dashboard-Sektionen an Presentational Components delegiert |
| `src/components/online/online-league-overview-sections.tsx` | Neu: Ladezustand, Header, Action Feedback, All-Ready Notice, First Steps, Rules, Week Flow |
| `src/components/admin/admin-league-manager.tsx` | Pending-Action-Hook und Feedback-Komponente verwendet |
| `src/components/admin/admin-league-detail.tsx` | Pending-Action-Hook und Feedback-Komponente verwendet |
| `src/components/admin/use-admin-pending-action.ts` | Neu: gemeinsamer Guard gegen doppelte Admin-Actions |
| `src/components/admin/admin-feedback-banner.tsx` | Neu: gemeinsamer Admin-Feedback-Banner |

## Vorher/Nachher Groessen

| Datei | Vorher | Nachher |
| --- | ---: | ---: |
| `src/components/online/online-league-placeholder.tsx` | 2.320 Zeilen / 97.268 Zeichen | 2.053 Zeilen / 85.194 Zeichen |
| `src/components/admin/admin-league-detail.tsx` | 1.031 Zeilen / 39.938 Zeichen | 1.021 Zeilen / 39.584 Zeichen |
| `src/components/admin/admin-league-manager.tsx` | 462 Zeilen / 16.515 Zeichen | 441 Zeilen / 15.990 Zeichen |

Neue kleine Bausteine:

| Datei | Groesse |
| --- | ---: |
| `src/components/online/online-league-overview-sections.tsx` | 368 Zeilen / 13.663 Zeichen |
| `src/components/admin/admin-feedback-banner.tsx` | 28 Zeilen / 602 Zeichen |
| `src/components/admin/use-admin-pending-action.ts` | 33 Zeilen / 718 Zeichen |

## Architekturentscheidung

### Online Dashboard

`OnlineLeaguePlaceholder` bleibt bewusst der Container:

- haelt Online-League-State
- verwaltet Lade-/Recovery-Flow
- ruft Repository und lokale/Firebase-Actions auf
- entscheidet ueber Expert Mode und Pending Actions

Die neue Datei `online-league-overview-sections.tsx` ist dagegen rein praesentational:

- keine Repository-Imports
- keine Firebase-/Storage-Abhaengigkeit
- keine Sync-Logik
- nur Props, Callbacks und Rendering

Dadurch wird der obere Dashboardbereich test- und reviewfreundlicher, ohne die unteren Expert-Mode-Subsysteme anzufassen.

### Adminbereich

`useAdminPendingAction` kapselt die bisher doppelte Kombination aus `useState`, `useRef`, `beginAdminAction` und `endAdminAction`.

`AdminFeedbackBanner` kapselt das gleiche Success/Warning-Markup aus Admin Manager und Admin Detail.

Diese Schnitte sind klein, aber risikoarm: Sie veraendern keine Adminaktionen, keine API-Pfade und keine Zugriffsschutzlogik.

## Bewusst Nicht Geaendert

- Keine Routen.
- Keine Game Engine.
- Keine Sync-Logik.
- Keine Firebase-/Firestore-Logik.
- Keine sichtbaren Texte oder Layout-Klassen absichtlich geaendert.
- Keine neuen Features.
- Kein Umbau der grossen Expert-Mode-Abschnitte in `OnlineLeaguePlaceholder`, weil dort viele Action-Handler und Detail-State-Subdomains eng gekoppelt sind.

## Manuelle Smoke-Test-Liste

Dokumentierte Smoke-Checks fuer den naechsten Browserlauf:

1. `/online` oeffnen und Online Hub laden.
2. Letzte Liga laden und pruefen, dass Header, Status-Chips und Zurueck-Link unveraendert sichtbar sind.
3. Online-Liga-Dashboard im Beginner Mode pruefen:
   - Ladezustand erscheint beim Refresh.
   - First-Steps-Block zeigt dieselben Schritte und Ready-Button.
   - Liga-Regeln sind sichtbar.
   - Week-Flow-Karten sind sichtbar.
4. Ready-Button einmal klicken:
   - Pending-Text erscheint.
   - Feedback-Banner erscheint.
   - kein doppelter Submit.
5. Expert Mode umschalten:
   - Untere Expert-Abschnitte bleiben erreichbar.
   - Verträge, Trades, Draft, Coaching, Franchise und Training bleiben visuell unveraendert.
6. `/admin` oeffnen:
   - Liga-erstellen-Formular sieht gleich aus.
   - Feedback-Banner erscheint nach Adminaktion.
   - Buttons sind waehrend Pending-State deaktiviert.
7. Admin-Liga-Detail oeffnen:
   - Header und Action-Buttons bleiben gleich.
   - Feedback-Banner erscheint nach Adminaktion.
   - Doppeltes Klicken auf Week Simulation bleibt blockiert.
8. Reload im Online-Dashboard und Admin-Detail:
   - keine leeren Screens.
   - keine OAuth-/Auth.js-Weiterleitung.

Hinweis: Diese Liste ist dokumentiert; im Rahmen dieses AP wurden die automatisierten Validierungen ausgefuehrt, kein Browser-Smoke-Test.

## Validierung

| Befehl | Ergebnis |
| --- | --- |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npx vitest run src/components/online/online-league-detail-model.test.ts src/components/online/online-continue-model.test.ts src/components/online/online-league-search-model.test.ts src/components/admin/admin-action-hardening.test.ts src/lib/admin/online-admin-actions.test.ts src/lib/online/online-league-service.test.ts src/lib/online/repositories/online-league-repository.test.ts` | Gruen, 6 Testdateien / 64 Tests |
| `git diff --check` | Gruen |

## Verbleibende Risiken

- `OnlineLeaguePlaceholder` bleibt mit ueber 2.000 Zeilen weiterhin gross. Der naechste sinnvolle Schnitt waere je ein Presentational Component fuer Training, Contracts, Trades, Draft, Coaching und Franchise.
- `AdminLeagueDetail` enthaelt weiterhin viele Tabellen-/Action-Bloecke. Ein naechster AP koennte GM-Tabelle, Finance-Table und Admin-Action-Bar trennen.
- Dashboard-ViewModels wie `dashboard-model.ts`, `online-league-detail-model.ts`, `post-game-report-model.ts` und `match-report-model.ts` sind in AP5 nicht zerlegt worden, weil der Auftrag sichtbar risikofrei bleiben sollte.

## Fazit

AP5 reduziert UI-Komponenten-Komplexitaet an den groessten Online-/Admin-Einstiegspunkten, ohne sichtbares Verhalten, Routen, Game Engine oder Sync-Logik zu aendern. Die neuen Komponenten und Hooks sind klein, klar verantwortlich und durch TypeScript, Lint und relevante Tests abgesichert.

Status: Gruen
