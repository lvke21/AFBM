# AP4 Report - Code-Verkleinerung: lokale Online-Actions

## Status

Gruen.

## Umgesetzte Aenderungen

- Neue kleine Guard-/Utility-Datei erstellt:
  - `src/components/online/online-firebase-mvp-action-guard.ts`
- Die Firebase-MVP-Meldung fuer lokale, noch nicht synchronisierte Actions zentralisiert:
  - `FIREBASE_MVP_LOCAL_ACTION_MESSAGE`
- Wiederholte Firebase-Guard-Branches fuer die drei in AP4 genannten Handler ersetzt:
  - Franchise Strategy
  - Training
  - Stadium Pricing
- Die uebrigen lokalen Action-Handler behalten ihr Verhalten und nutzen dieselbe zentrale Meldung, damit der alte lokale String nicht mehrfach in `OnlineLeaguePlaceholder` liegt.
- Kein Hook extrahiert, keine JSX-Panels verschoben, keine Actions entfernt.

## Betroffene Dateien

- `src/components/online/online-league-placeholder.tsx`
- `src/components/online/online-firebase-mvp-action-guard.ts`
- `docs/reports/ap4-report.md`

## Vorher / Nachher

Vorher:
- `OnlineLeaguePlaceholder` enthielt die Firebase-MVP-Meldung lokal.
- Mehrere lokale Action-Handler prueften `repository.mode === "firebase"` direkt und setzten dieselbe Meldung selbst.

Nachher:
- Die Meldung und der Guard liegen zentral in `online-firebase-mvp-action-guard.ts`.
- Die AP4-Start-Handler nutzen `guardFirebaseMvpLocalAction()`.
- Firebase zeigt weiterhin dieselbe Nicht-synchronisiert-Meldung.
- Lokaler Modus fuehrt weiterhin die bestehenden lokalen Service-Actions aus.

## Testergebnisse

- `npm run lint` - bestanden.
- `npx tsc --noEmit` - bestanden.
- `npm run test:run` - bestanden, 154 Testdateien / 912 Tests.
- `npm run build` - bestanden.

## Potenzielle Risiken

- Niedrig: Die zentrale Meldung ist jetzt ein Import. Falls spaeter weitere Action-Handler extrahiert werden, sollten sie denselben Guard nutzen.
- Niedrig: Nur drei Handler wurden auf die Guard-Funktion umgestellt, damit der AP klein bleibt. Weitere Handler enthalten absichtlich noch direkte Branches, nutzen aber bereits die zentrale Meldung.
- Kein bekanntes Verhalten wurde geaendert.
