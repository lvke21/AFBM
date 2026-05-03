# Dead Code Candidates

Stand: 2026-05-02

## Ziel der Analyse

Kandidaten fuer ungenutzte Exports, Debug-Code, TODOs und moegliche Legacy-Reste identifizieren. Es wurde nichts geloescht.

## Methode und Grenzen

Das Script zaehlt `export function|const|class|type|interface|enum` und sucht Namensreferenzen in anderen Dateien. Das ist bewusst konservativ und nicht compiler-aware.

Falsch-positive Treffer sind wahrscheinlich bei:

- Next.js Route-/Action-Dateien
- Typen, die nur lokal oder von TypeScript strukturell genutzt werden
- Barrel-/Re-Exports
- dynamischen Imports
- Scripts, die ueber CLI statt Import genutzt werden
- Test-Fixtures

## Quantitative Ergebnisse

| Metrik | Wert |
|---|---:|
| Ungenutzte Export-Kandidaten | 556 |
| `TODO/FIXME/HACK/XXX` Treffer gesamt | 16 |
| `console.*` Treffer gesamt | 164 |

## Source-nahe ungenutzte Export-Kandidaten

| Datei | Export | Bewertung |
|---|---|---|
| `src/app/app/savegames/[savegameId]/game/game-flow-data.ts` | `GameRouteParams`, `GameRouteSearchParams` | Typ-Kandidat; vor Loeschung Route-Nutzung pruefen |
| `src/app/app/savegames/[savegameId]/inbox/actions.ts` | `updateInboxTaskAction` | Server-Action-Kandidat; kann durch Formular/Next indirekt genutzt sein |
| `src/app/app/savegames/[savegameId]/league/league-route-data.ts` | `CanonicalLeagueRouteParams` | Typ-Kandidat |
| `src/app/app/savegames/[savegameId]/team/team-route-data.ts` | `CanonicalTeamRouteParams`, `resolveManagerTeamRouteParams` | Route-/Helper-Kandidat; vor Loeschung per `rg` und Tests pruefen |
| `src/components/admin/admin-feedback-banner.tsx` | `AdminFeedbackTone` | Typ-Kandidat |
| `src/components/admin/admin-league-detail-display.tsx` | `AdminDisplayedWeekGame` | Typ-Kandidat |
| `src/components/admin/admin-league-form-validation.ts` | `AdminLeagueFormValidationResult` | Typ-Kandidat |
| `src/components/auth/firebase-email-auth-panel.tsx` | `OnlinePlayLink` | UI-Typ/Konfig-Kandidat |
| `src/components/dashboard/dashboard-model.ts` | mehrere `Dashboard*` Typen | Moeglicherweise oeffentliches Modell, nicht blind entfernen |
| `src/components/inbox/inbox-model.ts` | `sortInboxItems`, `buildInboxItems` | Kandidat fuer echte Nutzungsklaerung |

## Script-/Seed-Kandidaten

Viele Treffer liegen in `scripts/seeds/*` und `scripts/firestore-*`, z. B.:

- `resetAndSeedMultiplayerTestLeague`
- `autoDraftMultiplayerTestLeague`
- `finalizeExistingMultiplayerLeagueStaging`
- `seedMultiplayerE2eLeague`
- `verifyFirestoreEmulatorCounts`

Bewertung: Diese Exports koennen fuer Tests, manuelle CLI-Nutzung oder kuenftige Automatisierung gedacht sein. Nicht entfernen, bevor `package.json`, direkte `npx tsx` Aufrufe und Dokumentation geprueft wurden.

## TODO/FIXME/HACK

Source-nahe relevante Treffer:

| Datei | Zeilen | Bedeutung |
|---|---:|---|
| `firestore.rules` | 2 | Auth-/Role-Mapping und Write-Strategie sind bewusst als spaeter zu ueberpruefen markiert |

Weitere TODOs liegen in Reports oder im Analyse-Script selbst und sind keine Produktivlogik.

## Console/Debug Code

Die meisten `console.*` Treffer liegen in Scripts, Seeds, Smoke Tests und QA-Tools. Relevante `src`-Treffer:

| Datei | Log-Art | Bewertung |
|---|---|---|
| `src/lib/audit/security-audit-log.ts` | `console.info`, `console.warn` | Bewusste Audit-Ausgabe |
| `src/lib/observability/performance.ts` | `console.info` | Bewusste Performance-Ausgabe |
| `src/lib/online/auth/online-auth.ts` | `console.error("AUTH_ERROR", ...)` | Produktiver Auth-Fehlerlog; sollte keine Secrets enthalten |
| `src/lib/online/repositories/firebase-online-league-repository.ts` | `console.warn` | Membership-/Team-Mismatch Logging |
| `src/server/repositories/firestoreUsageLogger.ts` | `console.info` | Usage Logging |
| `src/server/repositories/firestoreOperationalLogger.ts` | `console.error`, `console.info` | Operational Logging |

## Risiken

- Entfernen von Server Actions oder Route-Typen kann Next.js-Verhalten brechen, auch wenn keine statische Referenz sichtbar ist.
- Entfernen von Script-Exports kann Tests oder manuelle Operator-Workflows brechen.
- Debug-Logs koennen in Staging/Production gewollte Diagnose liefern.

## Empfehlungen

1. Dead-Code nicht anhand dieses Reports loeschen.
2. Fuer jeden Kandidaten `rg`, TypeScript, Build und relevante Tests verwenden.
3. Script-Exports nur entfernen, wenn `package.json`, Docs und CI keine Nutzung zeigen.
4. `console.*` in `src` klassifizieren: Observability behalten, echte Debug-Reste entfernen.

## Naechste Arbeitspakete

- AP-DC1: 20 Top-Export-Kandidaten manuell verifizieren.
- AP-DC2: `console.*`-Policy fuer App-Code dokumentieren.
- AP-DC3: Firestore-Rules TODOs in Security/Config-Analyse uebernehmen.
