# Online Admin Actions Extraction

Datum: 2026-05-03  
Status: Draft-Mutationen extrahiert, Public API unveraendert.

## Inventar Verbleibender Mutationsbereiche

| Bereich | Aktueller Ort | Status |
| --- | --- | --- |
| Simulation | `online-admin-actions.ts`, `online-week-simulation.ts` | Noch teilweise zentral; Week-Preparation ist bereits ausgelagert. |
| Repair/User-Mutationen | `online-admin-actions.ts`, `online-admin-repair-use-cases.ts` | Kategorisiert, aber Firebase-Write-Orchestrierung bleibt zentral. |
| Seed/Reset/Create | `online-admin-actions.ts`, `online-admin-seed-use-cases.ts` | Kategorisiert, aber Firebase-Write-Orchestrierung bleibt zentral. |
| Debug lokal | `online-admin-actions.ts`, `online-admin-seed-use-cases.ts` | Lokal gebuendelt, dev/test-geschuetzt ueber Policy. |
| Draft-Mutationen | `online-admin-firestore-draft-use-cases.ts`, `online-admin-draft-use-cases.ts` | Firebase-Draft-Writes extrahiert. |

## Extrahierter Bereich

Neues Modul: `src/lib/admin/online-admin-firestore-draft-use-cases.ts`

Enthaelt:

- Draft-Doc-Referenz und Draft-Run-ID-Helper.
- Firestore Draft State Mapper.
- Available-Player-Pool Writer.
- Auto-Draft-Pick-Transaktion.
- Firebase Actions fuer `initializeFantasyDraft`, `autoDraftNextFantasyDraft`, `autoDraftToEndFantasyDraft`, `completeFantasyDraftIfReady`, `resetFantasyDraft`.

## Guard / Confirm / Audit / Environment

| Anforderung | Abdeckung |
| --- | --- |
| Guard | `executeOnlineAdminAction` ruft weiterhin `assertOnlineAdminActionPolicy(input)` vor Firebase-/Local-Dispatch auf. |
| Confirm/Intent | Alle Mutationen bleiben `requiresConfirmation: true`; Public API und Action-Namen sind unveraendert. |
| Audit | Draft-Mutationen schreiben Admin-Audit-Logs im neuen Draft-Use-Case; bestehende Event-Writes bleiben erhalten. |
| Environment-Schutz | `resetFantasyDraft` bleibt ueber Policy und Use-Case-Pruefung auf Development/Test begrenzt. |

## Vorher/Nachher

| Datei | Vorher | Nachher |
| --- | ---: | ---: |
| `src/lib/admin/online-admin-actions.ts` | 1939 Zeilen | 1552 Zeilen |

Reduktion: 387 Zeilen.

## Nicht Geaendert

- Keine Public API Aenderung.
- Keine Firestore-Pfade geaendert.
- Keine lokalen Admin-Action-Namen geaendert.
- Keine Persistenzmodelle migriert.

## Checks

| Check | Ergebnis |
| --- | --- |
| `npx vitest run src/lib/admin` | Gruen |
| `npx tsc --noEmit` | Gruen |
| `npm run lint` | Gruen |
| `wc -l src/lib/admin/online-admin-actions.ts` | 1552 |
