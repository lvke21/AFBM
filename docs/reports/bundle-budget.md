# Bundle Budget

Datum: 2026-05-03  
Status: Gate vorhanden und nach Production-Build gruen.

## Executive Summary

Das Bundle-Budget-Gate ist ueber `npm run bundle:size` enforcebar. Es liest `.next/app-build-manifest.json` und bewertet nur reale Required-Routen. Optionale Routen werden explizit als optional/skipped behandelt und duerfen das Gate nicht faelschlich rot machen.

Wichtig: Der Check muss nach einem frischen `npm run build` laufen. Eine stale oder dev-generierte `.next` kann falsche Routen oder unbrauchbare Bundle-Werte enthalten.

## Budgetierte Bereiche

| Bereich | Required Routes | Optional Routes | Budget |
| --- | --- | --- | ---: |
| Online | `/online/page`, `/online/league/[leagueId]/page` | keine | 315 kB gzip JS |
| Draft | `/online/league/[leagueId]/draft/page` | keine | 295 kB gzip JS |
| Admin | `/admin/league/[leagueId]/page` | `/admin/page` | 285 kB gzip JS |

## Aktueller Messstand

Nach `npm run build`:

| Bereich | Max Route gzip | Route | Status |
| --- | ---: | --- | --- |
| Online | 296.2 kB | `/online/league/[leagueId]/page` | OK |
| Draft | 279.2 kB | `/online/league/[leagueId]/draft/page` | OK |
| Admin | 269.3 kB | `/admin/league/[leagueId]/page` | OK |

`/admin/page` ist optional und wird gemessen, wenn die Route im Manifest vorhanden ist.

## Gate-Regel

- `npm run build` erzeugt das Production-Manifest.
- `npm run bundle:size` ist lokal blockierend.
- `npm run release:check` fuehrt Build und Bundle Size als blockierende Required Gates aus.
- Missing Required Route ist rot.
- Missing Optional Route ist skipped, nicht rot.

## Historischer Fix

Das Gate war rot, weil `/admin/page` als Required Route behandelt wurde, obwohl sie in der vorhandenen `.next/app-build-manifest.json` fehlte. Der Fix macht Admin Root optional und budgetiert die reale Admin-Detailroute als Required Route.

## Checks

| Check | Ergebnis |
| --- | --- |
| `npm run build` | Gruen |
| `npm run bundle:size` | Gruen |
| `npm run release:check` | Gruen fuer Required Local Gates |
