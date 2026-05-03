# User Team Linking

Stand: 2026-05-02

## Ziel der Analyse

Analyse der User-Team-Verbindung im Multiplayer: Firebase UID, Membership, globaler Mirror, Team Assignment, Reload, Rejoin und Blockierzustände.

## Untersuchte Dateien/Bereiche

- `src/lib/online/repositories/firebase-online-league-repository.ts`
- `src/lib/online/types.ts`
- `src/components/online/online-league-route-state-model.ts`
- `src/components/online/online-league-route-state.tsx`
- `src/lib/online/error-recovery.ts`
- `src/lib/online/online-league-storage.ts`
- `firestore.rules`
- vorhandene Smoke-/MVP-Reports

## Aktueller Link-Pfad

```text
Firebase Auth
  uid
    |
    v
leagues/{leagueId}/memberships/{uid}
  userId == uid
  teamId
  status active
    |
    v
leagues/{leagueId}/teams/{teamId}
  assignedUserId == uid
  status assigned
    |
    v
leagueMembers/{leagueId_uid}
  userId == uid
  teamId
  status ACTIVE
    |
    v
mapFirestoreSnapshotToOnlineLeague()
  league.users[]
    |
    v
validateOnlineLeagueRouteState()
  leagueUser exists
  leagueUser.teamId exists
```

## Join-Verhalten

Beim Join schreibt die Firebase Repository Transaction:

- Team wird auf `assignedUserId=user.uid`, `status=assigned` gesetzt.
- Membership wird unter `leagues/{leagueId}/memberships/{uid}` erstellt.
- Mirror wird unter `leagueMembers/{leagueId_uid}` erstellt.
- League `memberCount/version/updatedAt` wird beruehrt.
- Event `user_joined_league` wird erstellt.
- `lastLeagueId` wird erst nach `joined` oder `already-member` lokal gespeichert.

Bewertung: **gute atomare Grundlage.**

## Rejoin-Verhalten

`getLeagueById()` laedt member-scoped:

1. League document.
2. Membership document.
3. Mirror document.
4. Teams.
5. `resolveFirestoreMembershipForUser()`.

Wenn Membership kaputt/fehlend ist, aber Mirror + Team stimmen, wird eine Fallback-Membership fuer den gemappten Snapshot erzeugt.

Bewertung: **robust fuer UI-Load, aber keine Persistenz-Reparatur.**

## Gueltige Membership

`getMembershipLoadProblem()` blockiert:

- missing membership
- inactive membership
- missing team id
- missing team
- team.assignedUserId mismatch
- team status available/vacant

Admin-Mitgliedschaften duerfen ohne Team laden.

## Blockierende Zustände

| Zustand | User-Auswirkung | Ursache |
|---|---|---|
| Membership fehlt, Mirror fehlt | User ist nicht verbunden | Join nie abgeschlossen oder Daten geloescht |
| Membership aktiv, Team fehlt | Route blockiert | Team-Dokument geloescht/ID geaendert |
| Membership teamId A, Team A assignedUserId B | Route blockiert | Auto-Draft/Repair/Admin-Fehler |
| Mirror teamId A, Membership teamId B | Weiterspielen/Lobby kann widersprechen | Mirror-Drift |
| Team assignedUserId UID, Membership fehlt | User kann evtl. nicht laden, Mirror-Fallback nur wenn Mirror existiert | unvollstaendige Migration |
| Team status vacant, assignedUserId UID | Route blockiert | Repair/Remove halb fertig |
| Admin UID ohne membership/team | Admin UI erlaubt, League User-Route nicht | korrekt getrennt |

## Lokaler State

`afbm.online.lastLeagueId` ist nur ein Pointer:

- sicherheitsrelevant: nein
- UX-relevant: ja
- wird bei Permission/NotFound in Route-State bereinigt
- darf nie als Membership-Ersatz gelten

## Sicherheitsmodell

Firestore Rules:

- Membership Reads sind fuer eigenes Dokument, Admin oder aktive Mitglieder erlaubt.
- Mirror `leagueMembers` erlaubt Own-Get/List.
- Team Claim muss nach Membership-Team passen.
- Fremde Membership-/Team-Writes sind blockiert.

API/Admin:

- Nutzt Bearer Token + serverseitigen Guard.
- Darf Membership/Mirror/Team reparieren, wenn Commands existieren.

## Inkonsistenz-Ursachen aus Historie

Die bisherigen Reports und Smoke-Historie zeigen typische Fehlerquellen:

- Auto-Draft/Finalize durfte Manager-Zuordnungen nicht veraendern.
- Missing Mirror konnte bestehenden Manager aussperren.
- `team.assignedUserId` und Membership waren nicht immer synchron.
- LocalStorage `lastLeagueId` konnte auf eine nicht mehr gueltige Liga zeigen.

## Empfohlene Invarianten

```text
For every active GM membership:
  team exists
  team.assignedUserId == membership.userId
  team.status == assigned
  mirror exists
  mirror.userId == membership.userId
  mirror.teamId == membership.teamId
  mirror.status == ACTIVE

For every assigned team:
  exactly one active GM membership references it
  mirror exists for that user/team

For every ACTIVE mirror:
  local membership exists or can be safely repaired
  team assignedUserId matches userId
```

## Empfehlungen

1. Nicht-destruktiver Consistency Validator fuer alle Ligen.
2. Repair nur, wenn mindestens zwei von drei Pfaden eindeutig uebereinstimmen.
3. Auto-Draft/Finalize muss User-Team-Mapping vor/nachher snapshotten und validieren.
4. UI soll zwischen "nicht beigetreten" und "Daten inkonsistent" unterscheiden.
5. `lastLeagueId` weiterhin nur nach erfolgreichem Join/Rejoin setzen.

## Offene Fragen

- Soll Mirror-Fallback automatisch persistiert werden?
- Soll ein assigned Team ohne Membership im Admin Debug als "repairable" oder "dangerous" gelten?
- Soll eine Admin-Rolle ohne Team auch die normale League-Route laden duerfen?

## Naechste Arbeitspakete

- AP-UTL1: `validateUserTeamLinks(snapshot)` pure Helper.
- AP-UTL2: Admin Debug Panel zeigt Link-Status pro Team/User.
- AP-UTL3: Safe Repair Command mit Dry-Run.
- AP-UTL4: Tests fuer alle Drift-Kombinationen.
