# Kontrollierter Rollout Report

Datum: 2026-05-02
Basis-Commit: `a2e37b7`
Ziel: Staging -> Produktion fuer den aktuellen Refactor-Stand

## Gesamtentscheidung

Status: **No-Go fuer Produktion**

Begruendung:
- Alle lokalen Pflicht-Checks haben mit Exit-Code 0 bestanden.
- Der Multiplayer-E2E enthaelt aber einen uebersprungenen Admin-Simulationsfall, weil `E2E_FIREBASE_ADMIN_ID_TOKEN` nicht gesetzt war.
- Der Git-Arbeitsbaum ist nicht sauber. Es gibt viele modifizierte und ungetrackte Dateien, also kein unveraenderliches Release-Artefakt.
- Eine echte Staging-Validierung gegen Firebase App Hosting wurde in dieser Session nicht ausgefuehrt.
- Kein Produktionsdeployment wurde gestartet.

Empfehlung: Erst Staging-Deployment aus einem sauberen Commit/Tag, dann Staging-Smoke mit Admin-Token und erst danach Produktionsfreigabe.

## Pre-Release Checks

| Check | Ergebnis | Hinweis |
| --- | --- | --- |
| `npx tsc --noEmit` | Gruen | Keine TypeScript-Fehler |
| `npm run lint` | Gruen | ESLint bestanden |
| `npm run build` | Gruen | Next.js Production Build erfolgreich |
| `npm run test:firebase:parity` | Gruen | 1 Testdatei, 3 Tests bestanden; Firestore Emulator sauber beendet |
| `npm run test:e2e` | Gruen | 1 Playwright-Smoke-Test bestanden |
| `npm run test:e2e:navigation` | Gruen | Seed idempotent, 1 Navigationstest bestanden |
| `npm run test:e2e:multiplayer` | Gelb | 3 bestanden, 1 uebersprungen; Admin API E2E braucht `E2E_FIREBASE_ADMIN_ID_TOKEN` |

Build-Hinweis:
- Next.js 15.5.15 Build erfolgreich.
- Groessere Client-Routen bleiben beobachtenswert, z. B. `/online/league/[leagueId]` mit ca. 293 kB First Load JS.

## Staging Validierung

Nicht ausgefuehrt in dieser Session.

Noch verpflichtend vor Produktion:
- Login / User State auf Staging pruefen.
- Bestehende Liga laden.
- Team-Zuordnung fuer bestehenden Manager pruefen.
- Draft UI laden.
- Ready-State pruefen.
- Admin-Flow mit echter Admin UID / Bearer Token testen.
- Woche simulieren.
- Ergebnisse und Standings nach Reload pruefen.

Blocker fuer vollstaendige Staging-Freigabe:
- Kein `E2E_FIREBASE_ADMIN_ID_TOKEN` im lokalen Testlauf.
- Kein dokumentierter aktiver Staging-Revision-Hash nach Deployment.
- Kein Browser-Smoke gegen die echte Staging-URL in dieser Session.

## Daten- und Seed-Sicherheit

Lokale Hinweise:
- `scripts/seeds/e2e-seed.ts` lief im Navigationstest idempotent.
- `npm run test:firebase:parity` bestand gegen den Firestore Emulator.

Vor Staging/Produktion verpflichtend:
- Keine Seed- oder Reset-Scripts gegen Produktion ausfuehren.
- Fuer Staging nur explizit markierte Testdaten veraendern.
- Vor jeder Datenstruktur- oder Seed-Aktion Firestore Export/Backup erstellen.
- Memberships, Manager-Zuordnungen und Rosters vor/nach Deployment vergleichen.

## Git-/Release-Artefakt

Aktueller Stand:
- Branch: `main`
- Basis-Commit: `a2e37b7`
- Arbeitsbaum: nicht sauber

Release-Risiko:
- Viele modifizierte und ungetrackte Dateien sind noch nicht als Commit fixiert.
- Ein Rollout direkt aus diesem Arbeitsbaum waere nicht reproduzierbar.

Freigabebedingung:
- Alle beabsichtigten Dateien reviewen.
- Unbeabsichtigte Aenderungen entfernen oder bewusst ausklammern.
- Release-Commit erstellen.
- Release-Tag oder App-Hosting-Revision dokumentieren.

## Kontrollierter Rollout-Plan

1. Arbeitsbaum bereinigen und Release-Commit erstellen.
2. Pflicht-Checks erneut ausfuehren:
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm run build`
   - `npm run test:firebase:parity`
   - `npm run test:e2e`
   - `npm run test:e2e:navigation`
   - `npm run test:e2e:multiplayer`
3. Staging-Deployment fuer genau diesen Commit ausloesen.
4. Staging-Smoke manuell oder automatisiert pruefen:
   - App laedt
   - Login funktioniert
   - Multiplayer-Liga laedt
   - Team-Zuordnung stimmt
   - Draft UI laedt
   - Admin kann Woche simulieren
   - Ergebnisse bleiben nach Reload erhalten
5. Staging-Logs fuer Fehler, Firebase Issues und auffaellige Requests pruefen.
6. Nur bei gruener Staging-Freigabe Produktionsdeployment aus demselben Commit ausloesen.
7. Produktion Smoke-Test:
   - App laedt
   - Login funktioniert
   - Liga laedt
   - keine Console/API-Fehler
8. Erste 24 Stunden Monitoring:
   - Error Rate
   - Firebase Reads/Writes
   - Admin API Fehler
   - Multiplayer Join/Load Fehler

## Rollback-Plan

Primaerer Rollback:
- Firebase App Hosting auf die vorherige aktive Revision zuruecksetzen.
- Vorherige stabile Revision/Commit vor dem Produktionsrollout notieren.

Hotfix-Pfad:
- Kritischen Fix auf eigenem Branch erstellen.
- Pflicht-Checks ausfuehren.
- Staging-Smoke wiederholen.
- Hotfix-Commit deployen.

Daten-Fallback:
- Keine destruktiven Seeds in Produktion.
- Falls Datenmigration oder Seed noetig wird: vorher Firestore Export/Backup erstellen.
- Bei Datenfehlern erst schreibende Admin-/Seed-Aktionen deaktivieren, dann Reparaturscript mit explizitem Project/Confirm-Guard ausfuehren.

## Risiken

1. Unsicheres Release-Artefakt: Arbeitsbaum ist dirty.
2. Admin Week Simulation ist lokal nicht vollstaendig E2E-validiert, weil der Admin Token fehlt.
3. Staging-Smoke gegen echte Firebase-Daten wurde nicht ausgefuehrt.
4. Multiplayer/Firebase bleibt ein Bereich mit hohem Datenkonsistenz-Risiko.
5. Grosse Client-Bundles und grosse Komponenten sind verbessert, aber nicht vollstaendig aufgeloest.

## Entscheidung

**No-Go fuer Produktion jetzt.**

**Go fuer naechsten Schritt:** Release-Commit herstellen, dann Staging-Deployment und echte Staging-Smoke-Validierung ausfuehren.
