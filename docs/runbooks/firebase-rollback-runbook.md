# Firebase Rollback Runbook

Status: vorbereitet, kein Firestore-Go-Live  
Gilt fuer: lokale Emulator-Validierung, Preview/Staging-Proben und spaetere explizit freigegebene Rollouts

## Ziel

Firestore schnell deaktivieren, Firestore-Writes stoppen und Prisma/PostgreSQL als sicheren Default-Datenpfad nutzen.

## Sofortentscheidung

Rollback ausloesen bei:

- Firestore Write Failure im Week Loop, Match Finish, Game Output oder Stats Persist.
- `state_transition_failure` im Week Loop.
- Backfill-/Compare-Abweichung bei Counts, IDs, Week-State, Scores, Stats oder Reports.
- Permission-Denied-Spike nach Release.
- Unerwarteter Prisma-Fallback waehrend eines Firestore-Gates.
- `DATA_BACKEND=firestore` in Production ohne explizite Freigabe.
- Firestore Usage oder Latenz deutlich ueber Budget.

## Schritt 1: Firestore deaktivieren

Setze den Runtime-Datenpfad auf Prisma:

```bash
DATA_BACKEND=prisma
```

Alternativ `DATA_BACKEND` entfernen, weil Prisma der Default ist.

Nicht tun:

- Prisma-Code entfernen.
- Auth umstellen.
- Firestore Production weiter beschreiben.
- Seed/Reset/Verify gegen Production ausfuehren.

## Schritt 2: App neu starten oder redeployen

Je nach Umgebung:

```bash
npm run dev
```

oder Deployment mit `DATA_BACKEND=prisma` ausloesen.

Erwartung:

- `getRepositories()` meldet `backend: prisma`.
- Firestore Guard wird nicht fuer Runtime-App-Pfade benoetigt.
- Neue Writes laufen wieder ueber Prisma/PostgreSQL.

## Schritt 3: Firestore-Writes stoppen

Stoppe alle Jobs oder Prozesse, die Firestore schreiben:

- Backfill
- Compare mit Write-Vorbereitung
- Simulation/Game Output Persistenz
- Stats Persistenz
- Report-Generatoren
- Preview/Staging E2E gegen `DATA_BACKEND=firestore`

Wenn ein Emulator laeuft, darf er fuer Analyse weiterlaufen. Production-Writes bleiben gestoppt.

## Schritt 4: Logs pruefen

Suche strukturierte Logs:

```text
[afbm:firestore:ops]
[firestore-usage]
[afbm:perf]
```

Wichtige Events:

- `data_backend_configuration`
- `repository_error`
- `write_failure`
- `state_transition_failure`
- `unexpected_prisma_fallback`

Pruefe:

- Operation
- Repository
- Flow Name
- Request ID
- Fehlername
- Usage Reads/Writes
- Performance Duration

Keine Dokumentinhalte oder Secrets sollten in den Logs stehen.

## Schritt 5: Datenabweichung analysieren

Bei Datenverdacht:

1. Prisma/PostgreSQL als Source of Truth behandeln.
2. Firestore nicht weiter beschreiben.
3. Backfill-/Compare-Report erzeugen oder wiederholen.
4. Abweichungen klassifizieren:
   - Counts
   - IDs
   - Week-State
   - Match Status
   - Scores
   - TeamStats/PlayerStats
   - Reports
5. Firestore-Daten erst nach Ursachenanalyse neu backfillen.

## Schritt 6: Prisma-Snapshot nutzen

Vor jedem spaeteren Production-Cutover muss ein Prisma/PostgreSQL-Snapshot existieren.

Rollback-Quelle:

- Prisma/PostgreSQL Snapshot
- letzter gruener Backfill-/Compare-Report
- aktuelle Prisma-DB, wenn Cutover nicht erfolgt ist

Firestore-Daten duerfen nicht als Source of Truth gelten, solange das Go/No-Go auf No-Go steht.

## Schritt 7: Kommunikation

Intern festhalten:

- Zeitpunkt des Rollbacks
- Ausloeser
- betroffene Umgebung
- letzter Deploy
- gesetzter `DATA_BACKEND`
- relevante Log-Events
- ob Nutzerdaten betroffen sein koennten
- naechste Analyseperson

## Recovery Gate

Firestore darf erst wieder in Preview/Staging getestet werden, wenn:

- Ursache verstanden ist.
- Typecheck/Lint gruen sind.
- Firebase Tests gruen sind.
- Backfill/Compare gruen ist.
- Browser-E2E fuer den betroffenen Flow gruen ist.
- Usage-/Performance-Budget nicht verletzt wird.

Production-Aktivierung bleibt separat freigabepflichtig.

## Aktueller Sicherheitsstatus

- Prisma bleibt Default.
- `DATA_BACKEND=firestore` ist durch Emulator-/`demo-*` Guard geschuetzt.
- Keine Prisma-Entfernung.
- Keine Auth-Umstellung.
- Keine produktive Firestore-Aktivierung.
