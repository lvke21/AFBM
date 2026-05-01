# Firebase 16-Team Fantasy Draft E2E Report

Datum: 2026-05-01

## Ziel

Der neue E2E-Test deckt den kompletten Firebase-MVP-Fantasy-Draft mit 16 Teams ab. Er nutzt den Firestore/Auth-Emulator, erstellt eine Liga ueber die echte Admin-API, simuliert 16 User/Team-Zuweisungen im Firestore und steuert den Draft ueber die produktiven Firebase-Admin-Actions.

## Testdateien

- `e2e/multiplayer-firebase-fantasy-draft.spec.ts`
- `package.json`: neues Script `test:e2e:multiplayer:firebase:draft`

## Gepruefte Szenarien

| Szenario | Pruefung |
| --- | --- |
| Liga wird erstellt | Admin-API `createLeague` im Firebase-Modus liefert 16 Teams und vollstaendigen Spielerpool. |
| 16 Teams/User werden simuliert | Firestore-Emulator erhaelt 16 Memberships und 16 Team-Zuweisungen. |
| Draft startet | Admin-API `startFantasyDraft` setzt Draft auf `active`, Round 1, Pick 1, 16er Draft Order. |
| Reload-Stabilitaet | Nach drei Auto-Picks bleibt der persistente Firestore-Draft-State nach Browser-Reload bei Round 1, Pick 4. |
| Alle Picks laufen durch | Admin-API `autoDraftToEndFantasyDraft` beendet den Draft. |
| Keine Doppel-Picks | Pick-IDs sind eindeutig und nicht mehr in `availablePlayerIds`. |
| Vollstaendige Kader | Alle 16 Team-Dokumente haben vollstaendige aktive Kader nach Mindestpositionsschema. |
| Week 1 | Liga ist nach Draftabschluss `active`, Season 1, Week 1. |

## Erwartete Kennzahlen

- Teams/User: 16
- Roster-Zielgroesse pro Team: 41
- Erwartete Picks: 656
- Erwartete Poolgroesse: 786

## Ausfuehrung

```bash
npm run test:e2e:multiplayer:firebase:draft
```

## Ergebnis

- `npx tsc --noEmit`: gruen
- `npm run lint`: gruen
- `npm run test:e2e:multiplayer:firebase:draft`: gruen
- Playwright: 1 Test bestanden
- Laufzeit: ca. 1 Minute
- Hinweis: Der Emulator-Lauf benoetigt lokale Port-Rechte fuer Firestore/Auth/Playwright. Im Sandbox-Modus ohne Portfreigabe scheitert der Start erwartbar mit `listen EPERM`; mit Portfreigabe lief der Test erfolgreich.

## Status

Gruen.
