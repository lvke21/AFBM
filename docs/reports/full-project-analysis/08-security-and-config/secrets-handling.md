# Secrets Handling

## Ziel der Analyse

Bewertung, ob Secrets im Repository liegen oder versehentlich ausgegeben werden koennen. Es wurden keine Secret-Werte aus `.env` oder `.env.local` gelesen.

## Untersuchte Bereiche

- `.gitignore`
- `.env` und `.env.local` nur Existenz/Ignore-Status
- `.env.example`
- `apphosting.yaml`
- `scripts/staging-admin-week-smoke.ts`
- `scripts/set-admin.js`
- `docs/guides/*`
- Secret-Indikator-Suche ueber tracked Dateien

## Lokaler Secret-Status

Feststellung:

- `.env` existiert lokal.
- `.env.local` existiert lokal.
- `.local/` existiert bzw. ist fuer Firebase CLI Config vorgesehen.
- Alle drei Pfade sind durch `.gitignore` ignoriert.
- `git status` zeigt sie nicht als tracked oder untracked.

Bewertung:

- Gut.
- Reports und Debug-Ausgaben duerfen diese Dateien weiterhin nicht direkt lesen.

## Tracked Secret-Indikatoren

Gescannte Indikatoren:

- Firebase Web API Key Muster.
- Private Key Marker.
- Staging Firebase Test Password Env Name.
- E2E Firebase Admin ID Token Env Name.

Ergebnis:

- Firebase Web API Key Muster taucht in Staging Config/Smoke Script auf.
- Private-Key Marker tauchen in Dokumentation/Testkontext auf, nicht als echte Key-Datei.
- Token-/Passwort-Env-Namen tauchen in Scripts/Docs/E2E auf, aber keine echten Werte wurden im Scan ausgegeben.

Bewertung:

- Firebase Web API Keys sind Public Client Config, keine Server-Secrets.
- Trotzdem sind hart codierte Staging Public Configs ein Deployment-Trennungsrisiko.

## Staging Smoke Secret Handling

Datei: `scripts/staging-admin-week-smoke.ts`

Positive Punkte:

- Verlangt `CONFIRM_STAGING_SMOKE=true`.
- Refused non-staging App Hosting URLs.
- Hilfe sagt explizit, dass Tokens/Passwoerter nicht ausgegeben werden.
- Email/Password Login nutzt Env Variables.
- Fallback per IAM Custom Token ist auf Staging-Projekt begrenzt.
- Temporare JWT-Dateien werden in einem Temp-Verzeichnis erstellt.

Risiken:

- Script enthaelt eine Default Staging Web API Key Public Config.
- IAM `sign-jwt` benoetigt starke Service-Account-TokenCreator-Berechtigung.
- Wenn Fehlerausgaben von externen CLIs sensible Details enthalten, muessen Logs vorsichtig behandelt werden.

Empfehlung:

- Public API Key nur noch ueber Env setzen oder klar als public Firebase Web Config kommentieren.
- CI Logs fuer Smoke Runs maskieren.
- Service Account TokenCreator nur service-account-spezifisch und nur fuer Staging vergeben.

## Set Admin Script

Datei: `scripts/set-admin.js`

Positive Punkte:

- Projekt kann explizit per `--project` gesetzt werden.
- Credential Mode wird genannt, aber keine Secret-Datei-Inhalte.
- ADC-Recovery-Hinweise sind konkret.
- Service-Account-Alternative nutzt `GOOGLE_APPLICATION_CREDENTIALS` als Pfad, nicht Repo-Secret.

Risiken:

- Default-Projekt ist Staging. Das ist fuer aktuellen Prozess praktisch, muss aber bei Production klar blockiert/dokumentiert sein.
- Script setzt Claims; falsches Projekt waere kritisch.

Empfehlung:

- Fuer Production-Nutzung separate explizite Freigabe/Flag verlangen.
- UID, Projekt und Credential Mode weiter loggen, keine Claims/Token.

## App Hosting Public Config

Datei: `apphosting.yaml`

Bewertung:

- Enthaelt Public Firebase Web Config fuer Staging.
- Keine privaten Server-Secrets sichtbar.
- Datei ist staging-spezifisch und darf nicht als Production-Config dienen.

Empfehlung:

- Production Config getrennt verwalten.
- Public Config-Werte nicht in generischen Reports wiederholen.

## Dokumentationsrisiken

Gefunden:

- Dokumente enthalten Platzhalter fuer private Keys und Secret-Variablen.
- Das ist normal, aber muss konsequent als Platzhalter markiert bleiben.

Empfehlung:

- Secret-Check vor Commit:

```bash
git grep -l -I "PRIVATE KEY" -- . ':!package-lock.json'
git grep -l -I "E2E_FIREBASE_ADMIN_ID_TOKEN" -- . ':!package-lock.json'
git grep -l -I "STAGING_FIREBASE_TEST_PASSWORD" -- . ':!package-lock.json'
```

Danach jeden Treffer klassifizieren:

- Platzhalter/Doku ok.
- Env-Name ok.
- Echter Wert nicht ok.

## No-Go-Regeln

- Keine `.env` Inhalte in Reports oder Logs.
- Keine Service-Account-JSON-Dateien ins Repo.
- Keine echten ID Tokens in E2E-Reports.
- Keine Passwortwerte in Shell-History, wenn vermeidbar; besser Secret Manager/CI Secret Store.
- Keine Production-Secrets in `apphosting.yaml`.

## Gesamtbewertung

Status: Gelb-Gruen.

Es gibt keine Hinweise auf committed private Secrets im untersuchten Bereich. Das groesste Risiko ist operativ: Public Staging Config und echte Staging-Testcredentials muessen strikt von Production und Reports getrennt bleiben.
