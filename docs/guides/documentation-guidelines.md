# Documentation Guidelines

## Ziel

Die Dokumentation soll eindeutig auffindbar, stabil benannt und langfristig wartbar sein.

## Ordner

- `docs/architecture/` - technische Architektur, Datenmodell, ADRs und Systemverhalten.
- `docs/guides/` - Anleitungen fuer Setup, Betrieb, Datenbank und Dokumentationspflege.
- `docs/planning/` - Roadmaps, Phase-Plans, Workpackages und handlungsleitende Planung.
- `docs/reports/` - versionierte, kuratierte Reports.
- `reports-output/` - generierte Artefakte aus Simulationen, Testlaeufen oder Exporten.
- `scripts/simulations/` - Simulations- und QA-Auswertungsskripte.
- `scripts/seeds/` - Seed-, Fixture- und Parity-Skripte.
- `scripts/tools/` - operative Hilfsskripte.

## Naming Convention

Allgemeines Format:

```text
<domain>-<topic>-<type>-<version?>.md
```

Beispiele:

- `roster-phase-plan-v1.md`
- `trade-system-design-v1.md`
- `firebase-migration-analysis.md`
- `gameengine-simulation-report-8teams.md`

## Report-Typen

- Phase Reports: `phase-<area>-ap<nr>-report.md`
- QA Reports: `qa-<system>-check.md`
- Simulation Reports: `sim-<scenario>-<runs>-report.md`
- System Reports: `<domain>-<topic>-report.md`
- Planning Docs: `<area>-phase-plan-v<nr>.md` oder `<area>-workpackages.md`

## Wann welcher Typ?

- Nutze `docs/planning/`, wenn ein Dokument zukuenftige Arbeit steuert.
- Nutze `docs/reports/phases/`, wenn ein Arbeitspaket abgeschlossen und bewertet wurde.
- Nutze `docs/reports/qa/`, wenn ein Check kuratiert und als Nachweis erhalten bleiben soll.
- Nutze `docs/reports/simulations/`, wenn ein Simulationsergebnis bewusst versioniert werden soll.
- Nutze `reports-output/`, wenn ein Script das Ergebnis jederzeit neu erzeugen kann.

## Loeschen und Archivieren

- Loesche nur Dateien, die eindeutig temporaer, leer oder systemgeneriert sind.
- Verschiebe alte, aber noch aussagekraeftige Inhalte lieber in die passende Kategorie.
- Entferne Duplikate nur, wenn Inhalt und Zweck identisch sind.
- Aktualisiere Links direkt nach jeder Umbenennung.

## Docs vs Generated Outputs

- `docs/` ist fuer Menschen kuratiert und sollte reviewbar bleiben.
- `reports-output/` ist maschinell erzeugt, wiederholbar und in `.gitignore` ausgeschlossen.
- Generierte HTML/JSON-Dateien duerfen nur in `docs/reports/` liegen, wenn sie als historischer Snapshot bewusst versioniert werden.
