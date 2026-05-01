# Multiplayer/Firebase UI Action Audit

Datum: 2026-05-01

## Ziel

Im Firebase-Multiplayer-MVP sollen keine Buttons oder Flows sichtbar sein, die nicht sauber synchronisiert, gespeichert oder getestet sind. Der MVP bleibt bewusst eng: Online Hub, Liga laden/beitreten, Fantasy Draft, Ready-State, Admin-Draft-Kontrolle, Week-Simulation und gespeicherte Ergebnisse.

## Entscheidungsmatrix

| Aktion | Screen | vorher sichtbar? | synchronisiert? | getestet? | Entscheidung |
| --- | --- | --- | --- | --- | --- |
| Liga suchen / Liga beitreten | Online Hub | Ja | Ja | Ja | behalten |
| Letzte Liga laden / Weiterspielen | Online Hub | Ja | Ja | Ja | behalten |
| Name speichern | Online User Status | Ja | Ja | Ja | behalten |
| Account sichern | Online User Status | Ja | Ja, aber projektkonfigurationsabhängig | Nein live | ausblenden |
| Ready setzen / zurücknehmen | Online Liga Dashboard | Ja | Ja | Ja | behalten |
| Fantasy-Draft Pick bestätigen | Online Liga Draft Room | Ja | Ja | Ja | behalten |
| Vakantes Team übernehmen | Online Liga Dashboard | Ja | Nein | Nein | ausblenden |
| Trainingsplan speichern | Online Liga Dashboard | Ja | Nein | Nein | ausblenden |
| Franchise-Strategie / Preise / Media-Ziel speichern | Online Liga Dashboard Expertenmodus | Ja | Nein | Nein | ausblenden |
| Vertrag verlängern / Spieler entlassen / Free Agent verpflichten | Online Liga Dashboard Expertenmodus | Ja | Nein | Nein | ausblenden |
| Trade vorschlagen / annehmen / ablehnen | Online Liga Dashboard Expertenmodus | Ja | Nein | Nein | ausblenden |
| Prospect scouten / draften | Online Liga Dashboard Expertenmodus | Ja | Nein | Nein | ausblenden |
| Coach einstellen / entlassen | Online Liga Dashboard Expertenmodus | Ja | Nein | Nein | ausblenden |
| Liga erstellen | Admin Hub | Ja | Ja | Ja | behalten |
| Liga löschen / zurücksetzen | Admin Hub | Ja | Teilweise | Nein | ausblenden |
| Debug Tools | Admin Hub | Ja | Nein, lokaler Legacy-State | Nein | ausblenden |
| Fantasy Draft initialisieren/starten/Auto-Draft/Abschluss prüfen | Admin Liga Detail | Ja | Ja | Ja | behalten |
| Fantasy Draft Reset Dev/Test | Admin Liga Detail | Ja | Ja | Nein produktiv | ausblenden |
| Alle Ready setzen / Liga starten / Woche simulieren | Admin Liga Detail | Ja | Ja | Ja | behalten |
| Revenue Sharing anwenden | Admin Liga Detail | Ja | Nein | Nein | ausblenden |
| Trainingsplan zurücksetzen | Admin Liga Detail | Ja | Nein | Nein | ausblenden |
| GM verwarnen / entfernen / Team vakant setzen / Legacy entfernen | Admin Liga Detail | Ja | Teilweise/unklar | Nein | ausblenden |

## UI-Anpassungen

- Online-Liga-Dashboard: Expertenmodus ist im Firebase-MVP nicht mehr aktivierbar. Franchise-, Contract-, Trade-, Legacy-Draft-, Coach- und Pricing-Aktionen bleiben nur im lokalen Legacy-Modus erreichbar.
- Online-Liga-Dashboard: Training bleibt im Firebase-MVP lesbar, aber der Trainingsplan-Write ist ausgeblendet. Die Week-Simulation nutzt synchronisierte Standardwerte.
- Online-Liga-Dashboard: "Vakantes Team übernehmen" ist im Firebase-MVP ausgeblendet; Zuweisung bleibt Admin-Aufgabe.
- Online User Status: "Account sichern" ist hinter `NEXT_PUBLIC_AFBM_ENABLE_ACCOUNT_LINKING=true` versteckt. Anonymous Auth bleibt Standard.
- Admin Hub: Delete/Reset und Debug Tools sind im Firebase-Modus nicht sichtbar.
- Admin Liga Detail: Revenue Sharing, Training Reset, GM-Kontrollaktionen und Draft Reset sind im Firebase-Modus nicht sichtbar.

## Behaltene Firebase-MVP-Aktionen

- Online Hub: Liga suchen, beitreten, letzte Liga laden.
- Online Liga: Ready setzen/zurücknehmen.
- Online Draft Room: Spieler picken.
- Admin Hub: Liga erstellen, Liga öffnen.
- Admin Liga Detail: Draft initialisieren/starten/Auto-Draft/Abschluss prüfen, alle Ready setzen, Liga starten, Woche simulieren, Spieleransicht öffnen.

## Restrisiken

- Die UI-Gates verhindern sichtbare unsichere Flows, entfernen aber die Legacy-Funktionen nicht aus dem lokalen Modus.
- "Account sichern" kann per Feature-Flag wieder sichtbar werden; vorher muss Firebase Email/Password im Zielprojekt geprüft sein.
- Einige Admin-Server-Actions existieren technisch noch, sind aber im Firebase-MVP nicht mehr über UI erreichbar.

## Validierung

- `npx tsc --noEmit`: grün
- `npm run lint`: grün
- `npx vitest run src/lib/online/multiplayer-firebase-mvp-actions.test.ts src/lib/online/online-league-service.test.ts src/lib/admin/online-admin-actions.test.ts`: grün, 46 Tests

## Status

Grün: Die sichtbare Firebase-MVP-Oberfläche ist bereinigt. Unsichere Legacy-/Local-only-Aktionen sind im Firebase-Modus ausgeblendet.
