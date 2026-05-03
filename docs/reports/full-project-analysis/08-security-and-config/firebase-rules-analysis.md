# Firebase Rules Analysis

## Ziel der Analyse

Bewertung der Firestore Security Rules fuer Online-Ligen, Admin-Zugriff, Memberships, Draft, Week/Simulation und allgemeine Default-Sicherheit.

## Untersuchte Dateien/Bereiche

- `firestore.rules`
- `src/lib/firebase/firestore.rules.test.ts`
- `src/lib/admin/admin-claims.ts`
- `src/lib/admin/admin-action-guard.ts`
- `src/lib/admin/admin-uid-allowlist.ts`
- `src/lib/online/*`
- `src/app/api/admin/online/actions/route.ts`

## Grundmodell

Die Rules sind deny-by-default:

- Unbekannte Pfade enden in `allow read, write: if false`.
- `reference` ist read-only fuer eingeloggte User.
- `users` sind nur fuer Self-Reads offen.
- zentrale Game-State-Pfade sind read-beschraenkt und write-verboten.
- `adminLogs` und `control` sind komplett clientseitig gesperrt.
- `/admin/{document=**}` ist nur fuer `isGlobalAdmin()` offen.

## Admin-Regelmodell

Rules-Funktion:

- `isGlobalAdmin()` akzeptiert nur Firebase Auth Custom Claim `admin == true`.

Server/API-Modell:

- Admin API akzeptiert `decodedToken.admin === true` oder `isAdminUid(decodedToken.uid)`.

Bewertung:

- Positiv: Admin API prueft serverseitig; kein Client-only Admin-Modell.
- Risiko: Rules und API verwenden nicht exakt dieselbe Admin-Definition.

Konsequenz:

- UID-Allowlist-Admin kann Admin API nutzen.
- Derselbe User ist fuer direkte Firestore `/admin` Rules nur Admin, wenn auch der Custom Claim gesetzt ist.

Empfehlung:

- Entscheidung dokumentieren:
  - Option A: UID-Allowlist bleibt nur API-Fallback; direkte Firestore-Admin-Pfade bleiben claim-only.
  - Option B: UID-Allowlist entfernen und Custom Claims wieder zum alleinigen Admin-Modell machen.
- Firestore Rules koennen keine sichere serverseitige Code-Allowlist lesen; daher ist Option A kurzfristig akzeptabel, muss aber klar dokumentiert werden.

## Online League Read Rules

Staerken:

- League Read erlaubt fuer:
  - aktive Members.
  - Owner.
  - Lobby-Listen-Docs.
  - Online League Creator.
- Teams, Draft, Events und Weeks sind fuer aktive Online Members oder Admins lesbar.
- Globale `leagueMembers` Mirrors koennen nur scoped gelesen/listed werden.

Risiken:

- Lobby-List-Read erlaubt public-ish Informationen fuer eingeloggte User.
- `isOnlineLobbyListDoc()` basiert auf `resource.data`, was fuer bestehende Docs okay ist; Query Rules muessen weiterhin zu Query-Filtern passen.

Empfehlung:

- Rules-Tests fuer Lobby Query und Join/Rejoin beibehalten.
- Keine sensiblen Daten in Lobby-League-Dokumente legen.

## Online Join / Membership Rules

Staerken:

- Membership Create ist eng beschraenkt:
  - Self User.
  - Lobby.
  - Rolle `gm`.
  - Status `active`.
  - Ready `false`.
  - Team muss assigned an denselben User sein.
- Mirror Create verlangt konsistente LeagueId/UserId/TeamId und Status/Rolle.
- Team Claim Update ist eng auf `assignedUserId`, Status und Identitaetsfelder beschraenkt.

Risiken:

- Join ist multi-document und relies on `existsAfter/getAfter`. Das ist korrekt, aber komplex.
- Komplexitaet erhoeht Regressionsrisiko bei Schema-/Feldnamen-Aenderungen.

Empfehlung:

- Rules-Tests fuer alle Join-Pfade:
  - neuer User.
  - Rejoin.
  - Team schon vergeben.
  - Mirror fehlt.
  - falsches Team.

## Ready-State Rules

Staerken:

- User darf nur eigenen `ready` und `lastSeenAt` aendern.
- Rolle, UserId, Status bleiben unveraendert.

Risiko:

- Ready-State kann in UI und Membership Mirror auseinanderlaufen, wenn der Mirror spaeter als Source genutzt wird.

Empfehlung:

- Single Source of Truth fuer Ready klar: League Membership Subdoc.

## Draft Rules

Staerken:

- Draft Pick Create ist an aktiven Draft, Membership Team und currentTeamId gebunden.
- Available Player Delete ist nur fuer aktuelles Team und aktuellen Draft Run erlaubt.
- Draft State Update ist auf Round/Pick/currentTeam/status beschraenkt.
- Draft Roster Finalize Update ist nur nach completed Draft erlaubt.

Risiken:

- Draft-Regeln sind sehr komplex.
- `isOnlineDraftRosterFinalizeUpdate()` erlaubt jedem aktiven Member nach completed Draft, Team `contractRoster`/`depthChart` zu aktualisieren. Das kann fachlich okay sein, braucht aber Tests fuer fremde Teams.

Empfehlung:

- Expliziter Rules-Test: Member darf nach completed Draft nicht fremdes Team finalisieren, falls das nicht gewollt ist.
- Wenn bewusst erlaubt: Dokumentieren, dass Finalize idempotent und nicht user-spezifisch ist.

## Week / Simulation Rules

Staerken:

- `/weeks/{seasonWeekId}` ist clientseitig read-only.
- Game-State-/Stats-/Reports-Pfade sind write-verboten.
- Simulation Writes muessen serverseitig ueber Admin SDK/API laufen.

Bewertung:

- Starkes Sicherheitsmodell.

Risiko:

- Server/Admin SDK umgeht Rules; deshalb Admin API Guards und Audit Logs sind kritisch.

Empfehlung:

- Admin API Tests und auditierte Mutationen als Pflicht-Gate.

## Tests

Vorhanden:

- `src/lib/firebase/firestore.rules.test.ts`
- `npm run test:firebase:rules`

Empfohlen:

- Neue Tests fuer UID-Allowlist-vs-Claim-Entscheidung.
- Draft finalize fremdes Team.
- Lobby Query ohne Membership.
- Mirror Create bei inkonsistentem Team.
- Week/Results Write vom Client bleibt verboten.

## Gesamtbewertung

Status: Gelb-Gruen.

Rules sind defensiv und detailliert. Der groesste Security-Risikopunkt ist nicht offene Schreibbarkeit, sondern Komplexitaet und die leichte Divergenz zwischen API-Admin-Modell und Firestore-Admin-Claims.
