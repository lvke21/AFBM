# Firebase Integration

Stand: 2026-05-02

## Ziel der Analyse

Bewertung der Firebase-Integration, Firestore-Datenzugriffe, Admin-/Client-Trennung, Security-Boundaries und architektonischen Risiken.

## Untersuchte Dateien/Bereiche

- `src/lib/firebase/admin.ts`
- `src/lib/firebase/client.ts`
- `src/lib/firebase/firestore.rules.test.ts`
- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/admin/admin-action-guard.ts`
- `src/lib/admin/admin-claims.ts`
- `src/lib/admin/online-admin-actions.ts`
- `src/server/repositories/*.firestore.ts`
- `package.json` Firebase scripts

## Firebase Architekturkarte

```text
Client Firebase
  -> src/lib/firebase/client.ts
  -> Firebase Auth + Firestore Client SDK
  -> Online Repository
  -> Rules begrenzen direkte Writes

Server Firebase
  -> src/lib/firebase/admin.ts
  -> Firebase Admin Auth + Firestore
  -> Admin API / Server repositories
  -> Week Simulation / Admin Commands

Firestore Data Paths
  -> users/*
  -> leagues/*
  -> leagues/{leagueId}/memberships/*
  -> leagueMembers/{leagueId_uid}
  -> leagues/{leagueId}/teams/*
  -> leagues/{leagueId}/draft/main/*
  -> leagues/{leagueId}/events/*
  -> singleplayer read models / reports / stats
```

## Gute Entscheidungen

- Firebase Admin und Client SDK sind getrennte Module.
- Admin-Flow basiert auf Firebase ID Token + serverseitigem Guard.
- Admin UID-Allowlist ist zentralisiert und client-safe gespiegelt.
- Emulator/Staging-Modi wurden in Seeds/Smoke-Kontexten expliziter gemacht.
- Firestore Rules werden getestet.
- Server-Repositories kapseln Firestore Admin SDK fuer Singleplayer-Parity.
- Online Repository abstrahiert Firebase vs Local Backend.

## Kritische Stellen

### Firebase Client Repository als Hotspot

`src/lib/online/repositories/firebase-online-league-repository.ts` ist ein zentraler Knoten fuer:

- Authenticated User
- League Snapshot
- Membership + Mirror
- Join/Rejoin
- Ready State
- Draft
- Depth Chart
- Subscriptions
- Events

Risiko: Jede Aenderung kann Join, Dashboard, Draft und Ready-State gleichzeitig betreffen.

### Breite Subscriptions

`subscribeToLeague()` registriert mehrere Listener:

- League document
- Memberships
- Teams
- Events
- Draft state
- Draft picks
- Draft available players

Risiko: Kosten, Re-Renders und Race Conditions, besonders nach Draft completion.

### Doppelte Membership-Pfade

Es gibt lokalen Pfad und globalen Mirror:

- `leagues/{leagueId}/memberships/{uid}`
- `leagueMembers/{leagueId_uid}`

Architektonisch sinnvoll fuer Query/Rules, aber UX- und Data-Repair-riskant, wenn sie auseinanderlaufen.

### Admin Actions schreiben komplexe Payloads

`online-admin-actions.ts` fuehrt Firestore Transactions fuer Week Simulation, Draft, Debug und GM Actions aus. Firestore akzeptiert keine `undefined`-Werte; Payloads muessen sauber normalisiert werden.

### Client-Config-Fallbacks

`firebase/client.ts` erlaubt Demo-Fallbacks in Nicht-Production bei `NEXT_PUBLIC_AFBM_ONLINE_BACKEND=firebase`. Gut fuer Tests, aber muss in Production strikt bleiben.

## Frontend/Backend Security Boundary

```text
Normale GM-Actions:
  Client Auth -> Firestore Rules -> erlaubte Membership-/Team-Felder

Admin-Actions:
  Client Auth -> ID Token -> API Route -> Admin Guard -> Firebase Admin SDK

Nicht erlaubt:
  Client -> direkte Admin Writes
  Client -> firebase-admin Import
  Unknown Project -> Staging/Production Script Writes
```

## Firestore-Kostenrisiken

| Risiko | Ursache | Empfehlung |
|---|---|---|
| Hohe Reads pro League-View | breite Snapshot-Loads | Route-spezifische Read Models |
| Hohe Live-Listener-Kosten | `subscribeToLeague` Fanout | Phasen-/View-spezifische Subscriptions |
| Draft-Pool Live Reads nach Draft | availablePlayers subscription | nur Draft Route abonnieren |
| Membership Repair Reads | Mirror + Local Path Fallback | klarer Consistency-Service |
| Admin Detail Overfetching | viele Daten auf einer Seite | Debug/Simulation lazy laden |

## Empfohlene Zielarchitektur

```text
lib/firebase
  bootstrap only

lib/online/repositories/firebase
  leagueQueries.ts
  leagueCommands.ts
  leagueSubscriptions.ts
  membershipConsistency.ts
  draftFirestoreMapper.ts
  weekFirestoreMapper.ts

lib/admin
  command handlers use Firebase Admin
  no UI state
  no client SDK

components
  consume typed read models
```

## Risiken

- Falsche Projekt-/Emulator-Konfiguration kann Staging-Smokes verfälschen.
- Membership Mirror Drift kann User aussperren.
- Admin UID-Allowlist ist kurzfristig praktisch, langfristig weniger sauber als Custom Claims.
- Firestore Rules und Admin API muessen beide konsistent geschuetzt bleiben.

## Empfehlungen

1. Membership Consistency als eigenstaendiges Modul.
2. Firestore Payload Sanitizer fuer Admin Writes zentral nutzen.
3. `subscribeToLeague()` in Dashboard/Draft/Admin Profile aufteilen.
4. Firebase Repository Mapper isolieren und separat testen.
5. Staging/Production Preflight fuer Projekt-ID und Backend-ID beibehalten.

## Offene Fragen

- Wird Admin-UID-Allowlist dauerhaft bleiben oder nur bis Custom Claims/IAM sauber sind?
- Welche Firestore-Daten duerfen GMs direkt schreiben?
- Wie lange muss Local Online Repository produktiv unterstuetzt werden?

## Naechste Arbeitspakete

- AP-FI1: MembershipConsistencyService extrahieren.
- AP-FI2: Firestore DTO Sanitization zentralisieren.
- AP-FI3: `subscribeToLeague` in optionale Datenbereiche trennen.
- AP-FI4: Firebase Repository in Query/Command/Mapper Dateien schneiden.
- AP-FI5: Rules/API Guard Matrix dokumentieren und testen.
