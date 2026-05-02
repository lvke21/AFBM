# AP5 Report - Code-Verkleinerung Admin-Action-Boilerplate

## Umfang

AP5 wurde strikt auf die nicht-destruktiven ligaweiten Admin-Actions begrenzt:

- `set-all-ready`
- `start-league`
- `refresh-league`

Destruktive oder bestätigungspflichtige Aktionen wurden nicht verändert:

- Fantasy Draft Reset
- Auto-Draft bis zum Ende
- GM entfernen
- Team vakant setzen

## Entfernte Codebereiche

- Drei einzelne Handler in `AdminLeagueDetail` wurden entfernt:
  - `handleSetAllReady`
  - `handleStartLeague`
  - `handleRefreshLeague`
- Die duplizierte Button-Definition fuer diese drei Aktionen wurde durch eine gemeinsame Konfiguration ersetzt.

## Zusammengelegte Logik

- Neue Konfiguration `ADMIN_LEAGUE_ACTIONS` fuer Label, Pending-Label, API-Action, Disabled-State und Styling.
- Neuer gemeinsamer Handler `handleConfiguredLeagueAction`, der die bestehende `runAdminAction`-Logik weiterverwendet.
- `runAdminAction` gibt nun das Admin-Action-Ergebnis zurueck, damit `refresh-league` weiterhin `loadError` und `lastLoadedAt` wie zuvor aktualisieren kann.

## Betroffene Dateien

- `src/components/admin/admin-league-action-config.ts`
- `src/components/admin/admin-league-detail.tsx`
- `docs/reports/ap5-report.md`

## Begruendung je Änderung

- `admin-league-action-config.ts`: Zentralisiert die wiederholten Daten der drei sicheren ligaweiten Aktionen. Dadurch bleiben Button-Text, Pending-State, API-Action und Disabled-Regeln an einer Stelle sichtbar.
- `admin-league-detail.tsx`: Entfernt kleine, nahezu identische Handler und reduziert JSX-Wiederholung fuer die betroffenen Buttons. Die bestehende Admin-API, Berechtigungslogik und mutierende Semantik bleiben unverändert.

## Testergebnisse

- `npm run lint` - gruen
- `npx tsc --noEmit` - gruen
- `npx vitest run src/app/api/admin/online/actions/route.test.ts src/lib/admin/online-admin-actions.test.ts` - gruen, 20 Tests bestanden
- `npm run test:run` - gruen, 154 Testdateien / 912 Tests bestanden
- `npm run build` - gruen

Hinweis: Vitest meldet weiterhin bestehende `punycode` Deprecation Warnings aus Abhaengigkeiten. Keine AP5-Regression.

## Verbleibende Risiken

- Gering: Die Action-Konfiguration enthaelt CSS-Klassen als Strings. Das reduziert Boilerplate, bleibt aber weiterhin UI-nah.
- Gering: Weitere Admin-GM-Row-Actions enthalten noch Wiederholung. AP5 hat diese bewusst nicht angefasst, weil destruktive und lokale GM-Aktionen laut Arbeitspaket separat und vorsichtig behandelt werden sollen.

## Status

Gruen
