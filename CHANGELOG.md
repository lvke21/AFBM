# Changelog

Alle wesentlichen Aenderungen an diesem Projekt werden in dieser Datei dokumentiert.

Die Historie vor Einfuehrung dieses Changelogs wurde aus dem aktuellen Repository-Zustand zusammengefasst. Fuer aeltere Zwischenstaende existieren im Repository derzeit keine separaten Release-Notizen.

## [Unreleased]

### Added

- Team-Scheme-Identitaet pro Team inklusive aktiver Scheme-Fit-Bewertung fuer Teamansicht und Free Agency.
- `developmentFocus` im Roster-Profil als erste steuerbare Trainingspriorisierung fuer die Weekly-Entwicklung.
- Injured-Reserve-Workflow fuer das managergesteuerte Team.
- `TeamFinanceEvent` als Finanzverlauf fuer Signing Bonuses, Releases und Saisongehaelter.
- Vertragsausblick mit expiring contracts und aktiver Cap-Bindung in der Teamansicht.
- Offseason-Rollover in die naechste Saison mit Altersfortschritt, Vertragsfortschreibung und neuer Saisoninitialisierung.
- Match-Detailseite mit Team-Boxscore, Top-Performern und automatisch erzeugter Match-Zusammenfassung.
- `coverageSnaps` als neuer Defensivwert fuer Coverage-Effizienz.
- Field-Goal-Distanzsplits fuer Short/Mid/Long auf Match-, Season- und Career-Ebene.
- Punting-Erweiterung um `fairCatchesForced` und `hangTimeTotalTenths`.
- Neue Football-Attribute fuer `MOBILITY`, `HANDS`, `LB_MAN_COVERAGE`, `LB_ZONE_COVERAGE`, `COVERAGE_RANGE` und `SNAP_VELOCITY`.
- Player-Detail-Flow mit eigener Query-Service-Schicht, UI-Seite und API-Route.
- Abgeleitete Composite- und Spotlight-Ratings fuer Positionsentscheidungen in Team- und Spieleransichten.
- Erste drive-basierte Matchsimulation mit Season-Write-Flow im Seasons-Modul.
- Server Action und UI-Einstiegspunkt zum Simulieren der aktuellen Saisonwoche.
- Persistenz fuer `TeamMatchStat` und `PlayerMatchStat` inklusive Fortschreibung von Team-, Season- und Career-Stats.
- Tests fuer Depth-Chart-Aufbereitung, Match-Engine und Saisonfortschritt.
- `PlayerHistoryEvent` als Timeline fuer Entwicklung, Verletzungen, Recovery und Roster-Aktionen.
- Weekly-Development-Slice mit positionsbezogenen Attributanpassungen und automatischer Player-Re-Evaluation.
- Free-Agency-Flow fuer das managergesteuerte Team inklusive Signings, Releases und bearbeitbarer Roster-Rollen.
- Zusätzliche Coverage-Rohdaten (`targetsAllowed`, `receptionsAllowed`, `yardsAllowed`) und Return-Fumble-Stats.
- Playoff-Erzeugung nach der Regular Season mit Semifinals, Championship Game und Playoff Picture in der UI.

### Changed

- Das Seasons-Modul ist nicht mehr read-only, sondern besitzt jetzt einen produktiven Write-Use-Case.
- Die Root-Layout-Fonts wurden auf lokale Font-Stacks umgestellt, damit Builds nicht mehr an externen Google-Font-Downloads haengen.
- Die ESLint-Konfiguration wurde auf eine funktionierende Flat-Config-Integration mit Next.js umgestellt.
- Die Roster-Bootstrap-Logik gewichtet Positions-OVRs jetzt feiner und nutzt die neuen Football-Attribute aktiv fuer QB-, Coverage- und Special-Teams-Profile.
- Die Matchsimulation nutzt verbesserte Coverage-, Return-, Snap- und Kicking-/Punting-Logik sowie realistischere Passing- und Drop-Berechnung.
- Die Saisonlogik fuehrt nun einen expliziten Weekly-Recovery-Schritt fuer Fatigue und Morale vor jeder neuen Woche aus.
- Die Team- und Saisonansichten zeigen mehr fachliche Stats wie TDs, Turnover-Differential, Detailratings und erweitere Spieler-Saisonlinien.
- Team-Readmodelle enthalten jetzt Team Needs und Management-relevante Roster-Daten.
- Die Spieleransicht zeigt jetzt Coverage-Allowed-/Return-Fumble-Stats und eine direkte Historie.
- Free Agency priorisiert nun Scheme Fit und Team Needs statt nur nacktem Overall.
- Die Teamansicht zeigt jetzt Team-Schemes, Finance-Log und Vertragsausblick.
- Player-Detailseiten zeigen Coverage-Snaps, Kicking-Splits und erweiterte Punt-Daten.

### Fixed

- `npm run lint` laeuft wieder sauber.
- `npm run build` scheitert nicht mehr an `next/font/google`.
- Die Teamansicht verlinkt nicht mehr ins Leere, sondern auf eine produktive Player-Detail-Seite.
- `docs/guides/operations-run-locally.md` enthaelt keinen veralteten Google-Font-Build-Hinweis mehr.

## [0.1.0] - 2026-04-21

### Added

- Initiales Next.js-Grundgeruest fuer den American-Football-Manager mit App Router, TypeScript und Tailwind CSS.
- Relationales Prisma-Schema auf PostgreSQL-Basis fuer Auth, Referenzdaten, Savegames, Teams, Spieler, Vertraege, Seasons, Matches und Statistiken.
- Referenzdaten-Seed fuer Liga, Konferenzen, Divisionen, Franchise-Templates, Positionsgruppen, Positionen, Archetypen, Scheme Fits und Attribute.
- Savegame-Bootstrap fuer Teams, 53er-Roster, Player-Evaluation, Attribute, Vertragsdaten, Season-Stats und Spielplan.
- Query- und Repository-Schichten fuer Savegame-, Team- und Saisonansichten.
- Strukturierte Projektdokumentation unter `docs/`.

### Changed

- Next.js wurde auf `15.2.9` konsolidiert.
- `eslint-config-next` wurde an dieselbe Next.js-Version angepasst.
- Prisma und `@prisma/client` wurden auf `6.15.0` konsolidiert.
- Die Spielerstruktur wurde auf getrennte Modelle fuer Identitaet, Roster-Rolle, Evaluation, Attribute und Statistiken erweitert.

### Fixed

- Peer-Dependency-Konflikt zwischen Next.js 16 und `legacy-auth-package@5.0.0-beta.22` wurde durch Rueckkehr auf die kompatible Next-15-Linie aufgeloest.
- Unsicherer anonymer Entwicklungs-Fallback fuer Benutzerzugriffe wurde entfernt.
- Ownership-Pruefungen fuer geschuetzte Seiten, API-Routen und Server Actions wurden vereinheitlicht.

### Notes

- Im Repository liegt derzeit noch kein versioniertes `prisma/migrations`-Verzeichnis.
