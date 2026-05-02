# AP6 Report - Code-Verkleinerung Online-Service Importflaeche

## Umfang

AP6 wurde strikt als Import-Bereinigung umgesetzt. Es wurden keine Runtime-Funktionen verschoben und keine Business-Logik veraendert.

## Entfernte Dateien / Code

- Keine Dateien geloescht.
- Keine fachlichen Funktionen geloescht.
- Entfernt wurden nur unnoetige Typ- und Konstanten-Importe aus dem grossen Barrel `online-league-service.ts`.

## Vereinfachte Strukturen

- `OnlineFantasyDraftRoom` importiert Draft-Konstanten und `OnlineFantasyDraftPosition` jetzt direkt aus `online-league-draft-service.ts`.
- `OnlineFantasyDraftRoom` importiert `OnlineContractPlayer` und `OnlineLeague` jetzt direkt aus `online-league-types.ts`.
- Admin-/Online-Komponenten importieren reine Typen jetzt direkt aus `online-league-types.ts`, waehrend benoetigte Runtime-Funktionen aus `online-league-service.ts` unveraendert bleiben.

## Betroffene Bereiche

- `src/components/online/online-fantasy-draft-room.tsx`
- `src/components/admin/admin-control-center.tsx`
- `src/components/admin/admin-league-manager.tsx`
- `src/components/admin/admin-league-detail.tsx`
- `src/components/admin/admin-league-action-config.ts`
- `src/components/online/online-league-detail-model.ts`
- `src/components/online/online-league-placeholder.tsx`

## Begruendung

- Der 8977-LOC-Service `online-league-service.ts` bleibt API-kompatibel, wird aber in Client Components nicht mehr fuer reine Typen oder Draft-Konstanten als generelles Import-Barrel verwendet.
- Runtime-Imports wurden nur dort belassen, wo Komponenten tatsaechlich Funktionen aus dem Service aufrufen.
- Der erste klare Gewinn liegt im Draft Room: Diese Komponente zieht fuer Draft-Konstanten nicht mehr den Online-Service-Barrel heran.

## Bewusst nicht geaendert

- Kein Split von `online-league-service.ts`.
- Keine Verschiebung von Business Actions.
- Keine Aenderung an Draft-, Week-, Simulation-, Firebase/Auth- oder Multiplayer-Sync-Flow.
- Keine Entfernung von Re-Exports aus `online-league-service.ts`, weil externe Abhaengigkeiten weiterhin bestehen koennen.

## Testergebnisse

- `npm run lint` - gruen
- `npx tsc --noEmit` - gruen
- `npx vitest run src/lib/online/fantasy-draft.test.ts src/lib/online/fantasy-draft-service.test.ts src/components/online/online-league-dashboard-panels.test.tsx` - gruen, 19 Tests bestanden
- `npm run test:run` - gruen, 154 Testdateien / 912 Tests bestanden
- `npm run build` - gruen

Hinweis: Vitest meldet weiterhin bestehende `punycode` Deprecation Warnings aus Abhaengigkeiten. Keine AP6-Regression.

## Risiken

- Niedrig: Es wurden nur Importpfade fuer vorhandene Exporte umgestellt.
- Niedrig bis mittel: Der Bundle-Effekt bleibt klein, solange andere Client Components weiterhin Runtime-Funktionen aus `online-league-service.ts` benoetigen.
- Niedrig: `online-league-service.ts` bleibt als Re-Export-Barrel kompatibel, daher ist ein Rollback reine Importpfad-Ruecksetzung.

## Status

Gruen
