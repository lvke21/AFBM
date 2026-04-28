# Firebase Preview/Staging Dry Run Report

Datum: 2026-04-28  
Projekt: American Football Manager / FBManager  
Rolle: Lead Engineer, Release Manager und QA Engineer  
Status: Rot

## Executive Summary

Der kombinierte Preview/Staging Dry Run wurde **nicht ausgefuehrt**. Das ist die korrekte Release-Entscheidung fuer den aktuellen Stand.

Grund:

- Es ist kein separates Preview-/Staging-Firebase-Projekt im Repo konfiguriert.
- Es gibt keine `.firebaserc` mit Preview-Alias.
- Firebase CLI ist lokal nicht authentifiziert.
- `scripts/firestore-backfill.ts` und `scripts/firestore-compare.ts` sind absichtlich durch `ensureFirestoreEmulatorEnvironment()` auf Emulator/`demo-*` beschraenkt.
- `firestoreGuard` blockiert `DATA_BACKEND=firestore` ohne Emulator-Host und `demo-*` Projekt-ID.

Damit kann der geforderte Dry Run **außerhalb des Emulators** nicht sicher ausgefuehrt werden, ohne vorher bewusst Schutzlogik und Projektfreigaben zu aendern. Es wurde kein Production-Zugriff gestartet, kein Deployment ausgefuehrt und Firestore nicht produktiv aktiviert.

## Gepruefte Ausgangslage

Vorhandene Reports:

- `docs/reports/firebase-backfill-compare-report.md`: Gruen, aber lokal/Emulator.
- `docs/reports/firebase-browser-e2e-report.md`: Gruen, aber lokal/Emulator.
- `docs/reports/firebase-cost-measurement-report.md`: Gruen, aber lokal/Emulator.
- `docs/reports/firebase-monitoring-alerting-report.md`: Gruen, technische Hooks vorbereitet.
- `docs/reports/firebase-production-go-no-go-report.md`: Production bleibt No-Go.

Technische Repo-Pruefung:

- `firebase.json` enthaelt Firestore Rules/Indexes und lokale Emulator-Konfiguration.
- `.firebaserc` existiert nicht bzw. enthaelt keinen Projekt-Alias.
- `firestore.indexes.json` ist vorhanden und deployfaehig vorbereitet.
- Backfill/Compare importieren `ensureFirestoreEmulatorEnvironment()`.
- Seed/Reset/Verify sind auf `demo-afbm` und `127.0.0.1:8080` ausgelegt.

## Ausgefuehrte Checks

```bash
npx firebase use
npx tsc --noEmit
npm run lint
```

Ergebnis:

- `npx firebase use`: fehlgeschlagen, keine Firebase-/Google-Credentials vorhanden.
- `npx tsc --noEmit`: Gruen.
- `npm run lint`: Gruen.

Firebase CLI Fehlerbild:

```text
Error: Failed to authenticate, have you run firebase login?
Could not load the default credentials.
```

Zusatzhinweis: Der CLI Update-Check kann lokal zusaetzlich an Configstore-Rechten scheitern. Das ist kein Production-Zugriff und kein App-Fehler.

## Dry-Run-Schritte Und Status

| Schritt | Status | Ergebnis |
| --- | --- | --- |
| Separates Firebase-Projekt erstellen | Nicht ausgefuehrt | Kein Projektname, keine Credentials, keine explizite Console-/Org-Freigabe |
| Firestore Indexes deployen | Nicht ausgefuehrt | Kein Preview-Projekt/Alias, kein Firebase Login |
| Backfill gegen Preview | Blockiert | Script erlaubt nur Emulator/`demo-*` |
| Compare gegen Preview | Blockiert | Script erlaubt nur Emulator/`demo-*` |
| Logging aktivieren | Lokal vorbereitet | `FIRESTORE_USAGE_LOGGING`, `AFBM_FIRESTORE_OPERATION_LOG`, `AFBM_PERFORMANCE_LOG` dokumentiert |
| Browser Flow gegen Preview | Nicht ausgefuehrt | Keine Preview-App/ENV, kein Firestore-Preview-Datenpfad |
| Kosten pruefen | Nicht ausgefuehrt | Nur lokale Emulator-Kostenmessung vorhanden |
| Monitoring Events pruefen | Nicht ausgefuehrt | Hooks vorhanden, aber kein Preview-Lauf |

## Stop-Kriterien Bewertung

Der Dry Run wurde vor Start gestoppt, weil Vorbedingungen fehlen:

- Keine authentifizierte Preview-Firebase-Umgebung.
- Kein separates Projekt.
- Kein sicherer Nicht-Emulator-Backfill-Modus.
- Kein freigegebener Preview-Deploy.

Es gab daher:

- keine Datenabweichung,
- keinen Write Failure,
- kein Permission Denied aus Preview,
- keinen Prisma-Fallback im Preview-Lauf,
- keine Security-Verletzung,
- aber auch keinen erfolgreichen Preview-Dry-Run.

## Risiken

Weiterhin offen:

- Backfill/Compare sind noch nicht staging-faehig, weil sie bewusst emulator-only sind.
- Browser-E2E ist noch nicht gegen eine echte Preview-App mit echter Firebase-Konfiguration gelaufen.
- Kostenmessung basiert auf Emulator-Zaehlung, nicht auf Cloud Billing/Usage.
- Monitoring-Hooks sind implementiert, aber noch nicht in einem externen Log-/Alert-System verifiziert.
- Auth ohne E2E-Bypass ist weiterhin nicht validiert.

## Sichere Naechste Schritte

1. Separates Preview/Staging-Firebase-Projekt manuell in der Firebase Console erstellen.
2. `.firebaserc` mit eindeutigem Alias ergaenzen, z.B. `staging`.
3. Service Account / CI-Credentials nur in Secret Store setzen, nicht committen.
4. Firestore Rules/Indexes nur gegen den Preview-Alias deployen:

```bash
firebase deploy --only firestore:indexes --project <preview-project-id>
firebase deploy --only firestore:rules --project <preview-project-id>
```

5. Einen separaten, explizit freigegebenen Preview-Backfill-Modus implementieren:
   - kein Default,
   - nur mit `FIRESTORE_PREVIEW_DRY_RUN=true`,
   - nur mit Allowlist-Projekt-ID,
   - niemals Production-Projekt,
   - kein Seed/Reset gegen Production.

6. Danach Dry Run wiederholen:
   - Backfill
   - Compare
   - Logging aktiv
   - Browser Flow
   - Kosten/Monitoring/State pruefen

## Entscheidung

Der aktuelle Status ist **Rot**, weil das Ziel “Backfill/Compare auch außerhalb Emulator stabil” nicht validiert wurde und sicherheitstechnisch nicht validiert werden darf, solange Projekt, Credentials und expliziter Preview-Modus fehlen.

Das ist kein Rueckschritt der lokalen Firebase-Migration. Es ist ein korrektes Release-Gate: Lokal ist Gruen, Preview/Staging ist noch nicht freigegeben.

## Statuspruefung

| Frage | Ergebnis |
| --- | --- |
| Backfill/Compare auch außerhalb Emulator stabil? | Nein, blockiert durch Emulator-Guard |
| Browser Flow stabil? | Nur lokal/Emulator gruen, nicht Preview |
| Kosten im erwartbaren Rahmen? | Nur Emulator-Messung vorhanden |
| Monitoring funktioniert? | Hooks lokal getestet, nicht Preview |
| Kein Prisma-Fallback? | In Preview nicht getestet |
| Keine Security-Probleme? | Ja: kein unsicherer Zugriff ausgefuehrt |

Status: Rot
