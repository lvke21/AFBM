# Full Project Analysis Index

Ziel: Zentrale Einstiegsliste fuer eine vollstaendige technische, fachliche und qualitative Analyse des AFBM-Repositories.

## Struktur

| Bereich | Pfad | Zweck |
| --- | --- | --- |
| Codebase | `01-codebase/codebase-analysis.md` | Codegroesse, Komplexitaet, Verantwortlichkeiten, Dopplungen |
| UI | `02-ui/ui-analysis.md` | Sichtbare Komponenten, Navigation, States, Interaktionen |
| UX | `03-ux/ux-analysis.md` | Nutzerreisen, Verstaendlichkeit, Sackgassen, Flow-Qualitaet |
| Architecture | `04-architecture/architecture-analysis.md` | Modulgrenzen, Datenfluss, Systemkopplung, Zielarchitektur |
| Performance | `05-performance/performance-analysis.md` | Rendering, Bundle, Firestore-Kosten, teure Pfade |
| Data and State | `06-data-and-state/data-and-state-analysis.md` | Firestore, lokale Saves, State-Mapping, Konsistenz |
| Tests and Quality | `07-tests-and-quality/tests-and-quality-analysis.md` | Testabdeckung, E2E-Stabilitaet, QA-Gates, Regressionen |
| Security and Config | `08-security-and-config/security-and-config-analysis.md` | Auth, Admin, Rules, Secrets, Umgebungen, Deployment-Guards |
| Scope and Product | `09-scope-and-product/scope-and-product-analysis.md` | MVP-Scope, Produktklarheit, bewusst deaktivierte Features |
| Work Packages | `10-work-packages/work-packages.md` | Priorisierte Arbeitspakete aus allen Analysen |

## Regeln

- Keine produktiven Daten veraendern.
- Keine Secrets speichern.
- Keine Deployments ausloesen.
- Findings mit konkreten Dateien/Bereichen belegen.
- Empfehlungen klein, testbar und priorisiert formulieren.

## Status

Template-Struktur angelegt. Inhalte muessen in separaten Analyse-Laeufen gefuellt werden.
