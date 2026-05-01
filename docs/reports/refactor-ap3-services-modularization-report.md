# Refactor AP3: Services Modularization Report

Status: Gruen

## Executive Summary

AP3 hat die grossen Multiplayer-/Online-Services nicht fachlich umgebaut, sondern klare technische Verantwortungsgrenzen eingezogen. Direkte `localStorage`-Zugriffe wurden aus Repository-, Auth- und Admin-UI-Code herausgezogen und in kleine, testbare Storage-Services verschoben.

Das Verhalten der bestehenden Public APIs bleibt erhalten. Engine-Regeln, Balancing, Firebase-Datenmodell und UI-Flows wurden nicht erweitert.

## Zielbild

- Browser Storage: eine gemeinsame Browser-Storage-Abstraktion.
- Online League Persistence: eine kleine API fuer gespeicherte Online-Ligen und die letzte Liga-ID.
- Auth/User Identity: Identity-Services verwenden dieselbe Storage-Abstraktion.
- Repository/Data Access: Local/Firebase-Repositories delegieren browserlokale Last-League-State-Operationen.
- Admin Local State Bridge: Admin-Komponenten kennen keine Online-Storage-Keys mehr direkt.
- League Domain Logic: bleibt im bestehenden Service, aber raw Storage Parsing/Writing ist ausgelagert.

## Neue Dateien

| Datei | Verantwortung | Groesse |
| --- | --- | ---: |
| `src/lib/online/browser-storage.ts` | Sichere Browser-Storage-Erkennung fuer Client/SSR-Grenze | 19 Zeilen / 478 Zeichen |
| `src/lib/online/online-league-storage.ts` | Lesen/Schreiben der Online-League-Collection und Last-League-ID | 68 Zeilen / 1.927 Zeichen |
| `src/lib/admin/local-admin-browser-state.ts` | Bridge fuer lokalen Admin-State ohne direkte UI-Storage-Details | 64 Zeilen / 1.759 Zeichen |

## Geaenderte Service-Grenzen

### Browser Storage Service

`src/lib/online/browser-storage.ts` stellt nur zwei Operationen bereit:

- `getOptionalBrowserStorage()`: fuer Client-only Pfade, die im SSR-Kontext nichts tun duerfen.
- `getRequiredBrowserStorage(errorMessage)`: fuer Pfade, die ohne Browser Storage bewusst abbrechen.

Damit duplizieren Auth, Repository und Admin-UI keine eigenen `typeof window`-Checks mehr.

### Online League Persistence Service

`src/lib/online/online-league-storage.ts` besitzt jetzt die browserlokalen Persistenzdetails fuer:

- `afbm.online.leagues`
- `afbm.online.lastLeagueId`
- JSON-Parsing der gespeicherten Liga-Liste
- Entfernen und bedingtes Loeschen der letzten Liga-ID

`online-league-service.ts` delegiert raw Storage Reads/Writes an diesen Service. Die bestehende Domainlogik und die oeffentliche API bleiben erhalten.

### Repository/Data Access Layer

`src/lib/online/repositories/local-online-league-repository.ts` und `src/lib/online/repositories/firebase-online-league-repository.ts` verwalten die letzte Liga-ID nicht mehr selbst ueber eigene Storage-Key-Konstanten oder eigene Browser-Storage-Helper.

Die Repositories behalten ihre fachliche Aufgabe:

- Local Repository: lokaler Adapter fuer bestehende Online-League-Service-Funktionen.
- Firebase Repository: Firestore Adapter und Realtime-Sync.
- Storage Service: browserlokale Last-League-ID.

### Auth/User Identity Service

`src/lib/online/online-user-service.ts`, `src/lib/online/auth/online-auth.ts` und `src/lib/online/auth/account-linking.ts` nutzen jetzt die gemeinsame Browser-Storage-Abstraktion.

Die Firebase Anonymous Auth und Account-Linking-Logik wurden nicht fachlich geaendert. Es wurde nur die wiederholte Browser-Storage-Erkennung entfernt.

### Admin Local State Bridge

`src/components/admin/admin-league-manager.tsx` und `src/components/admin/admin-league-detail.tsx` lesen und schreiben keine Online-/User-Storage-Keys mehr direkt.

Der neue Service `src/lib/admin/local-admin-browser-state.ts` kapselt:

- lokale Liga-JSON-Daten
- letzte Liga-ID
- lokalen Online-User
- lokalen Online-Username
- optionales Reset des lokalen Users

Damit bleibt die Admin-UI naeher an ihrer eigentlichen Aufgabe: Darstellung, Form Submit und Action-Ausloesung.

## Vorher/Nachher Groessen

| Datei | Vorher | Nachher | Ergebnis |
| --- | ---: | ---: | --- |
| `src/lib/online/online-league-service.ts` | 8.048 Zeilen / 243.400 Zeichen | 8.026 Zeilen / 243.307 Zeichen | raw Storage-Funktionen ausgelagert |
| `src/lib/online/repositories/local-online-league-repository.ts` | 232 Zeilen / 6.722 Zeichen | 229 Zeilen / 6.642 Zeichen | eigene Last-League-Storage-Logik entfernt |
| `src/lib/online/repositories/firebase-online-league-repository.ts` | 692 Zeilen / 20.168 Zeichen | 688 Zeilen / 20.151 Zeichen | eigene Browser-Storage-Logik entfernt |
| `src/lib/online/online-user-service.ts` | 108 Zeilen / 2.870 Zeichen | 106 Zeilen / 2.835 Zeichen | gemeinsamer Browser-Storage-Helper |
| `src/lib/online/auth/online-auth.ts` | 130 Zeilen / 3.388 Zeichen | 123 Zeilen / 3.303 Zeichen | doppelter Browser-Storage-Helper entfernt |
| `src/components/admin/admin-league-detail.tsx` | ca. 1.069 Zeilen / 40.975 Zeichen | 1.031 Zeilen / 39.938 Zeichen | lokale Storage-Bridge ausgelagert |

Hinweis: Der Worktree enthaelt noch vorherige AP1-AP7-Hardening-Aenderungen. Die Tabelle fokussiert die in AP3 modularisierten Service-Schnitte.

## Verantwortung Nach AP3

| Bereich | Primaere Dateien | Verantwortung |
| --- | --- | --- |
| League Service | `src/lib/online/online-league-service.ts` | Domainnahe Ligaoperationen und bestehende Public API |
| Online League Persistence | `src/lib/online/online-league-storage.ts` | Browserlokale Online-League-Persistenz |
| Sync Service | `src/lib/online/sync-guards.ts` | Guards, Idempotenz- und Sync-Hilfen aus vorherigem AP |
| Repository/Data Access | `src/lib/online/repositories/*` | Local/Firebase Adapter fuer Datenzugriff |
| Auth/User Identity | `src/lib/online/online-user-service.ts`, `src/lib/online/auth/*` | Online-User, Firebase Anonymous Auth, Account Linking |
| Admin Local Bridge | `src/lib/admin/local-admin-browser-state.ts` | lokale Admin-State-Uebergabe fuer Server Actions |
| Admin UI | `src/components/admin/*` | Darstellung und Action-Ausloesung |

## Bewusst Nicht Geaendert

- Keine Engine-Regeln.
- Kein Balancing.
- Kein Firebase-Datenmodell.
- Keine neuen Multiplayer-Features.
- Keine neuen Auth-Systeme.
- Keine OAuth/Auth.js-Rueckkehr.
- Keine tiefere Zerlegung der grossen Domainfunktionen in `online-league-service.ts`.

Die weitere Zerlegung von `online-league-service.ts` sollte separat erfolgen, weil dort Domainlogik, Simulation-Vorbereitung, Ownership, Finanzen, Ratings und Admin-Operationen eng verwoben sind. Ein tieferer Split waere groesser und risikoreicher als dieser AP3-Schnitt.

## Validierung

| Befehl | Ergebnis |
| --- | --- |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `npm test -- --run` | Gruen, 133 Testdateien / 771 Tests |
| Targeted Vitest fuer Online/Admin/Auth/Sync/Error-Recovery | Gruen, 8 Testdateien / 71 Tests |
| `git diff --check` | Gruen |

## Risiken Und Naechste APs

- `src/lib/online/online-league-service.ts` bleibt mit ueber 8.000 Zeilen der groesste Refactoring-Kandidat.
- Admin UI und Admin Actions sind stabilisiert, aber fachlich noch nicht voll in Command-/Query-Services getrennt.
- Firebase Repository enthaelt weiterhin Sync-, Mapping- und Firestore-Transaktionslogik in einer Datei.
- Eine weitere Zerlegung sollte in kleinen, testgestuetzten Schritten erfolgen:
  1. Online League Domain Queries extrahieren.
  2. Online League Mutations/Commands extrahieren.
  3. Admin Commands von Admin UI DTOs trennen.
  4. Firebase Mapping/Firestore Converter in eigene Module verschieben.
  5. Engine-nahe Week-Simulation-Adapter von Online-League-Persistenz trennen.

## Fazit

AP3 hat die akut vermischten Browser-Persistenz-Zugriffe aus Services, Repositories, Auth-Code und Admin-Komponenten herausgezogen. Die Services haben dadurch klarere Grenzen, kleinere Nebenwirkungsflaechen und bessere Testbarkeit, ohne das Produktverhalten zu aendern.

Status: Gruen
