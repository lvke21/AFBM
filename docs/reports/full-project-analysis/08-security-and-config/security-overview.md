# Security Overview

## Ziel der Analyse

Bewertung der Security-, Config- und Deployment-Risiken im aktuellen AFBM-Repository. Fokus sind Firebase, Firestore Rules, Admin-Flows, Seed-/Reset-Scripts, Environment Guards, Staging/Production-Trennung und Secret Handling.

Es wurden keine Deployments ausgefuehrt, keine Seeds gestartet und keine produktiven Daten gelesen oder geaendert.

## Untersuchte Dateien/Bereiche

- `.gitignore`
- `.env`, `.env.local` nur Existenz/Ignore-Status, keine Werte
- `.env.example`
- `firebase.json`
- `apphosting.yaml`
- `firestore.rules`
- `next.config.ts`
- `src/lib/env/runtime-env.ts`
- `src/lib/firebase/admin.ts`
- `src/lib/firebase/client.ts`
- `src/lib/firebase/previewGuard.ts`
- `src/lib/admin/admin-claims.ts`
- `src/lib/admin/admin-action-guard.ts`
- `src/lib/admin/admin-uid-allowlist.ts`
- `src/app/api/admin/online/actions/route.ts`
- `scripts/set-admin.js`
- `scripts/staging-admin-week-smoke.ts`
- `scripts/production-apphosting-preflight.mjs`
- Seed-/Backfill-/Reset-Scripts unter `scripts/`
- Deployment-/Operations-Dokumente unter `docs/guides`, `docs/runbooks`, `docs/reports`

## Top Security-Risiken

| Rang | Risiko | Bewertung | Begruendung |
| --- | --- | --- | --- |
| 1 | Admin-UID-Allowlist ist serverseitig, aber hart codiert. | Hoch | Bypass fuer fehlende Custom Claims ist praktisch, aber ein Code-Deploy ist noetig, um Adminrechte zu aendern oder zu entziehen. |
| 2 | Firestore Rules kennen nur Custom Claims, Admin API kennt Claim oder UID-Allowlist. | Hoch | API-Admin und direkte Firestore-Admin-Pfade koennen auseinanderlaufen. |
| 3 | Staging-App-Hosting-Config ist im Repo und stark staging-spezifisch. | Mittel-Hoch | Kein Secret, aber Risiko fuer versehentliche Verwendung als Production-Konfiguration. |
| 4 | Production-Projekt-ID und Production-App-Hosting-Backend sind weiterhin nicht verifiziert. | Hoch | Deployment darf nicht mit geratenen IDs stattfinden. |
| 5 | Staging-Smoke kann per IAM sign-jwt Custom Token erzeugen. | Mittel-Hoch | Gut geguarded auf Staging, aber benoetigt stark privilegierte `iam.serviceAccounts.signJwt` Berechtigung. |
| 6 | Mehrere Seed-/Repair-/Finalize-Scripts schreiben gegen Staging. | Mittel-Hoch | Guards sind vorhanden, aber falsche Env-Kombinationen bleiben operativ riskant. |
| 7 | Alte Dokumentation ist teilweise widerspruechlich zum aktuellen Admin-Flow. | Mittel | Mindestens ein Production-Guide referenziert noch alte Admin-Code-Logik. |
| 8 | `.env` und `.env.local` existieren lokal. | Mittel | Sie sind ignored und nicht tracked, muessen aber bei Support/Debug-Ausgaben strikt geschuetzt bleiben. |
| 9 | Admin Actions auditieren, aber die Audit-Logs sind nur so gut wie ihre zentrale Auswertung. | Mittel | Fehlende Monitoring-/Alerting-Verbindlichkeit kann Missbrauch spaet sichtbar machen. |
| 10 | Firestore Rules sind komplex. | Mittel | Komplexe Join-/Draft-/Ready-Pfade koennen bei Aenderungen leicht regressieren. |

## Top Deployment-Risiken

| Rang | Risiko | Bewertung | Begruendung |
| --- | --- | --- | --- |
| 1 | Keine verifizierte Production-Zielumgebung. | Hoch | Production bleibt No-Go, solange Projekt und Backend nicht sichtbar bestaetigt sind. |
| 2 | `apphosting.yaml` ist staging-orientiert. | Hoch | Ein Production-Rollout mit dieser Datei wuerde Staging-ENV in Production tragen. |
| 3 | Keine `.firebaserc` mit klaren Projektaliases im Repo. | Mittel-Hoch | CLI-Kontext muss manuell oder per Command gesetzt werden. |
| 4 | Deployment-Scripts fuer Staging Rules/Indexes existieren, Production-Rollout nur als Preflight-Entwurf. | Mittel | Gut als Schutz, aber Release-Prozess bleibt manuell. |
| 5 | Seeds/Backfills liegen nah an npm Scripts. | Mittel | Gute Guards, aber falscher Copy/Paste bleibt Risiko. |
| 6 | Production Firestore ist per Runtime Guard blockiert, kann aber mit explizitem Flag aktiviert werden. | Mittel-Hoch | Das Flag darf nur nach separater Datenfreigabe existieren. |
| 7 | Staging-Smoke benoetigt echte Test-Credentials oder IAM-Rechte. | Mittel | Release-Go kann an externen IAM-/Secret-Setups haengen. |

## Positive Schutzmassnahmen

- `.env` und `.env.local` sind per `.gitignore` ausgeschlossen.
- `next.config.ts` ruft `assertRuntimeEnvironment()` beim Next-Startup auf.
- Runtime Guards blockieren Emulator-Flags, Preview-/Seed-Flags und lokale Online-Backends ausserhalb lokaler Entwicklung.
- Production blockiert `DATA_BACKEND=firestore`, solange kein explizites Freigabeflag gesetzt ist.
- Firestore Rules sind deny-by-default.
- Client-Writes fuer zentrale Game-State-/Simulation-/Stats-Pfade sind verboten.
- Admin API verlangt Bearer ID Token und prueft serverseitig.
- Seed-/Reset-Scripts fuer Multiplayer unterscheiden Emulator und Staging explizit.
- Staging-Reset/Repair/Auto-Draft verlangt `CONFIRM_STAGING_SEED=true`.
- Production-App-Hosting-Preflight ist read-only und verlangt konkrete Projekt-/Backend-IDs.

## Kritische Empfehlungen

1. Admin-UID-Allowlist nur als temporaeren Fallback behandeln und mittelfristig auf Custom Claims zurueckfuehren.
2. Firestore Rules und Admin API Guard harmonisieren: entweder Rules ebenfalls sauber dokumentiert ueber Claims-only lassen oder UID-Allowlist bewusst nur API-seitig erlauben.
3. Separate Production-App-Hosting-Konfiguration erstellen; `apphosting.yaml` nicht fuer Production verwenden.
4. Production-Projekt-ID und Backend-ID erst verifizieren, dann Rollout-Command formulieren.
5. Staging Public Firebase Config aus Scripts in Env verschieben oder zumindest als bewusst public dokumentieren.
6. Seed-/Backfill-Scripts nur ueber dedizierte Runbooks ausfuehren, nie aus Copy/Paste in Production-Kontexten.
7. Firestore Rules Tests bei jeder Admin-/Membership-/Draft-Aenderung verpflichtend machen.

## Gesamtbewertung

Status: Gelb.

Die Codebasis hat viele gute Guards und ein vorsichtiges Default-Deny-Modell. Die groessten verbleibenden Risiken liegen nicht in fehlender Basis-Security, sondern in Umgebungstrennung, Admin-Fallbacks, Production-Zielklarheit und operativen Schreibscripts.
