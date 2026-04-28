# Dokumentationsindex

## Zweck

Diese Datei ist der Einstiegspunkt in die versionierte Projektdokumentation. `docs/` enthaelt statische Architektur-, Planungs-, Guide- und Report-Dokumente. Generierte Test- und Simulationsartefakte gehoeren nach `reports-output/`.

## Struktur

### Architektur

- [architecture/overview.md](./architecture/overview.md) - kurze Architekturuebersicht
- [architecture/architecture.md](./architecture/architecture.md) - fuehrende Systemarchitektur
- [architecture/modules.md](./architecture/modules.md) - Modulverantwortungen
- [architecture/data-flow.md](./architecture/data-flow.md) - zentrale Daten- und Schreibfluesse
- [architecture/gameplay-engine.md](./architecture/gameplay-engine.md) - Gameplay-Kern
- [architecture/gameplay-extension-guide.md](./architecture/gameplay-extension-guide.md) - Erweiterungsleitfaden
- [architecture/data/](./architecture/data/) - Datenmodell, Relationen, Readmodelle, Statistikstruktur
- [architecture/decisions/](./architecture/decisions/) - ADRs und Architekturentscheidungen

### Guides

- [guides/operations-setup.md](./guides/operations-setup.md) - lokales Setup
- [guides/operations-run-locally.md](./guides/operations-run-locally.md) - lokaler Betrieb
- [guides/operations-database.md](./guides/operations-database.md) - Datenbank, Prisma, Seeds
- [guides/documentation-guidelines.md](./guides/documentation-guidelines.md) - Ablage- und Namensregeln

### Planung

- [planning/](./planning/) - Phase-Plans, Workpackages, Prompts und Roadmap-nahe Dokumente

### Reports

- [reports/README.md](./reports/README.md) - Report-Uebersicht
- [reports/phases/README.md](./reports/phases/README.md) - AP- und Phasenberichte
- [reports/qa/README.md](./reports/qa/README.md) - QA-Reports
- [reports/simulations/README.md](./reports/simulations/README.md) - versionierte Simulationsberichte
- [reports/systems/](./reports/systems/) - System-, Engine-, Firebase- und Analyseberichte

## Empfehlungen

1. Fuer Systemverstaendnis zuerst [architecture/architecture.md](./architecture/architecture.md) lesen.
2. Fuer lokales Arbeiten [guides/operations-setup.md](./guides/operations-setup.md) und [guides/operations-database.md](./guides/operations-database.md) verwenden.
3. Fuer Roster- und Gameplay-Planung in [planning/](./planning/) starten.
4. Fuer historische AP-Arbeit die Phasenberichte unter [reports/phases/](./reports/phases/) nutzen.

## Begriffe

- **Docs**: versionierte, kuratierte Dokumente.
- **Reports**: statische Analyse-, QA-, Phasen- oder Systemberichte.
- **Reports Output**: generierte, wiederholbare Artefakte aus Simulationen, E2E-Laeufen oder Exporten.
- **Planung**: noch handlungsleitende Workpackages, Roadmaps und Phase-Plans.
