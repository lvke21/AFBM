# GM Job Security, Owner Confidence and Admin Removal Report

## Neue Datenmodelle

Die lokalen Online-League-Memberships wurden additiv erweitert. Bestehende lokale Ligen
werden beim Laden normalisiert, damit alte Daten ohne Owner-/Security-Felder weiter nutzbar
bleiben.

Neue Kernmodelle:

- `OwnershipProfile`
  - `ownerId`
  - `ownerName`
  - `patience`
  - `ambition`
  - `financialPressure`
  - `loyalty`
  - `mediaSensitivity`
  - `rebuildTolerance`
- `GmJobSecurityScore`
  - `score`
  - `status`
  - `lastUpdatedWeek`
  - `lastUpdatedSeason`
  - `gmPerformanceHistory`
- `OnlineGmActivityMetrics`
  - `lastSeenAt`
  - `lastLeagueActionAt`
  - `missedWeeklyActions`
  - `missedLineupSubmissions`
  - `inactiveSinceWeek`
  - `inactiveStatus`
- `OnlineGmAdminRemovalState`
  - `none`
  - `admin_warning`
  - `admin_authorized_removal`
  - `admin_removed`
- Team Vacancy Felder
  - `teamStatus`
  - `controlledBy`
  - `allowNewUserJoin`
  - `previousUserId`
  - `vacantSince`
- `OnlineLeagueEvent`
  - Audit-/Notification-Events für Owner, Admin und Vacancy-Aktionen

## Owner-Logik

Neue GMs erhalten beim Join automatisch ein Owner-Profil. Für ältere lokale Daten wird
beim Laden ein Owner-Profil aus Team-ID und Teamname erzeugt.

Die saisonale Bewertung läuft über `recordOnlineGmSeasonResult()`:

- sportliche Erwartung wird über `expectation` oder `expectedWins` bewertet
- Playoff-Teilnahme, Playoff-Siege und Championship verbessern den Score
- Losing Streaks, Rivalry Losses und schwacher Cap-Zustand senken den Score
- Owner-Traits verändern die Schärfe der Bewertung
- schlechte Einzelsaisons führen nicht sofort automatisch zur Entlassung
- mehrere schlechte Saisons können je nach Owner-Profil zu `fired` führen

Win-Now Owner reagieren schneller, geduldige/Rebuild-Owner tolerieren schlechte Records länger.

## Inaktivitätslogik

Die Liga enthält konfigurierbare `leagueSettings.gmActivityRules`:

```ts
{
  warningAfterMissedWeeks: 1,
  inactiveAfterMissedWeeks: 2,
  removalEligibleAfterMissedWeeks: 3,
  autoVacateAfterMissedWeeks: false
}
```

`recordOnlineGmMissedWeek()` erhöht die verpassten Week Actions und setzt:

- 1 verpasste Woche: `warning`
- 2 verpasste Wochen: `inactive`
- 3 verpasste Wochen: `removal_eligible`

Auto-Vacate ist im MVP bewusst aus.

## Admin-Aktionen

Neue Service-Funktionen:

- `warnOnlineGm()`
- `authorizeOnlineGmRemoval()`
- `removeOnlineGmByAdmin()`
- `markOnlineTeamVacant()`
- `claimVacantOnlineTeam()`
- `recordOnlineGmMissedWeek()`
- `recordOnlineGmSeasonResult()`

Admin-Entfernung löscht kein Team. Das Team bleibt erhalten, wird vakant und kann von
einem neuen GM übernommen werden.

Jede kritische Admin-Aktion schreibt Events und Logs:

- `gm_warning`
- `gm_removal_authorized`
- `gm_removed_by_admin`
- `team_marked_vacant`

Owner-Entlassungen schreiben:

- `owner_confidence_changed`
- optional `gm_hot_seat`
- `owner_fired_gm`
- `gm_fired_by_owner`

## UI-Änderungen

### Admin UI

Die Admin-Liga-Detailseite zeigt nun:

- Job Security Score und Status
- Aktivitätsstatus
- verpasste Wochenaktionen
- letzte Liga-Aktion
- Teamstatus: besetzt/vakant
- Filter für active, warning, inactive, removal eligible, hot seat und vacant

Admin-Aktionen pro GM:

- Missed Week +1
- Verwarnen
- Entlassung ermächtigen
- GM entfernen
- Team vakant setzen
- Legacy entfernen bleibt als alter Debug-Pfad sichtbar

### GM UI

Die Online-Liga-Detailseite zeigt dem Spieler:

- Owner Confidence / Owner-Profil
- Job Security Status
- kurze Erwartungsbeschreibung
- kurze Erklärung des aktuellen Drucks
- Inaktivitätswarnung, falls vorhanden
- vakante Teams können übernommen werden, ohne Teamdaten zurückzusetzen

## Tests

Neue Tests in `src/lib/online/gm-job-security.test.ts` decken ab:

- JobSecurityScore sinkt bei schlechter Saison
- geduldiger Owner feuert später
- Win-Now Owner feuert früher
- inaktiver GM wird `removal_eligible`
- Admin kann Removal authorizen
- Admin Removal erzeugt Audit Events/Logs
- Team wird vakant statt gelöscht
- neuer GM kann vakantes Team übernehmen

Bestehende Online-Service- und Dashboard-Tests wurden für die additiven Felder angepasst.

## Offene Punkte

- Die Logik ist weiterhin lokaler MVP-State in `localStorage`.
- Es gibt noch keine echte Authentifizierung und keine serverseitigen Admin-Rechte.
- Scoring nutzt MVP-Heuristiken; echte Season-/Roster-/Cap-Metriken müssen später aus
  Backend und Game-Systemen kommen.
- Keine echten Notifications oder E-Mails.
- Keine automatische Week-Flow-Integration; verpasste Aktionen werden im Adminbereich
  manuell simuliert.
- Für Firebase/Backend müssen Owner-Firing und Admin-Removal transaktional und
  regelbasiert abgesichert werden.
