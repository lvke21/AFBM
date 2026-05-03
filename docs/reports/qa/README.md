# QA Reports

## Zweck

QA Reports dokumentieren gezielte Validierungen, Checklisten und Ergebnisbewertungen, die nicht nur rohe Script-Ausgaben sind.

## Dateien

- [../qa-release-gates.md](../qa-release-gates.md) - verbindliche Release-Gate-Definition fuer Unit/Service, Typecheck, Lint, Firebase parity, lokale E2E, Staging-Smoke und UX/Product-Signale
- [play-legality-validation-2026-04-22.md](./play-legality-validation-2026-04-22.md) - Validierungsnachweis
- [play-library-validation-2026-04-22.md](./play-library-validation-2026-04-22.md) - Validierungsnachweis

## Abgrenzung

Rohe Playwright-, Vitest- oder Simulationsergebnisse werden unter `reports-output/test-runs/` oder `reports-output/simulations/` abgelegt.

## Naming

Neue QA-Dokumente verwenden `qa-<system>-check.md`, zum Beispiel `qa-depth-chart-validation.md`.
