# Player Profile Decision Layer Report

## Status
Gruen

## Ziel
Der Player Profile Screen wurde so geschaerft, dass Nutzer innerhalb weniger Sekunden erkennen koennen, ob ein Spieler starten, gebencht oder entwickelt werden sollte.

## Umgesetzte Verbesserungen

### Entscheidungs-Zusammenfassung
- Neue Top Section `Decision Summary` direkt unter der Profilnavigation.
- Klare Entscheidungssignale:
  - `Sollte Starter sein`
  - `Grenzfall Starter/Backup`
  - `Nur Tiefe`
  - `Entwickeln`
- Visuelle Hervorhebung ueber Tone-Farben:
  - Gruen fuer klare Starter
  - Sky/Accent fuer Entwicklung oder Grenzfaelle
  - Amber fuer risikobehaftete Grenzfaelle
  - Neutral fuer reine Tiefe

### Risiko-Indikatoren
- Neue Risikoauswertung in `getPlayerDecisionLayer`.
- Verwendet nur vorhandene Daten:
  - Scheme Fit
  - Fatigue
  - Injury Status
  - OVR/POT-Spanne
  - Depth-Chart-Slot
- Sichtbare Indikatoren:
  - `Schwacher Scheme Fit`
  - `Hohe Fatigue`
  - `Fatigue beobachten`
  - `Verletzungsrisiko`
  - `Niedriges Potential`
  - `Ohne Slot`

### Vergleichshinweis
- Der Screen nutzt den bestehenden Team-Read-Model-Kontext, um Spieler derselben Position mit Slot #1 zu vergleichen.
- Moegliche Hinweise:
  - `Aktueller Slot #1`
  - `Besser als aktueller Starter`
  - `Schlechter als Slot #1`
  - `Nah am Slot #1`
  - `Slot #1 offen`
- Es wurden keine neuen Datenfelder, keine Migrationen und keine neue Persistenz eingefuehrt.

### Reduktion / Fokus
- Die Entscheidung steht jetzt oberhalb von Header, Ratings, Vertrag und Performance.
- Die fruehere Bewertungs-StatCard wurde entfernt, weil die neue Top Section diese Aufgabe klarer erfuellt.
- Detaildaten bleiben vorhanden, sind aber unter der Entscheidungshilfe nachgeordnet.
- Direkte Next Actions fuehren zu bestehenden Arbeitsbereichen:
  - Depth Chart pruefen
  - Entwicklung pruefen

## Betroffene Dateien
- `src/app/app/savegames/[savegameId]/players/[playerId]/page.tsx`
- `src/components/player/player-detail-model.ts`
- `src/components/player/player-detail-model.test.ts`
- `docs/gui/player-profile-decision-layer-report.md`

## Tests
- `npx vitest run src/components/player/player-detail-model.test.ts src/components/player/player-role-model.test.ts src/components/player/player-value-model.test.ts`
  - Ergebnis: Gruen, 3 Testdateien, 22 Tests
- `npx tsc --noEmit`
  - Ergebnis: Gruen
- `npm run lint`
  - Ergebnis: Gruen

## Grenzen
- Kein neues Datenmodell.
- Keine Engine-Aenderung.
- Kein neuer Entscheidungs-Workflow; die Top Section interpretiert nur vorhandene Daten.
- Der Slot-#1-Vergleich ist nur verfuegbar, wenn der Spieler einem Team zugeordnet ist und das Team-Read-Model geladen werden kann.

## Statuspruefung
- Entscheidung in Sekunden erkennbar: Ja
- Starten / Benchen / Entwickeln interpretierbar: Ja
- Risiken sichtbar: Ja
- Vergleich zum Slot #1 sichtbar: Ja
- Weniger wichtige Daten visuell nachgeordnet: Ja
- Bestehende Tests gruen: Ja

Status: Gruen
