# GM Job Security Core Report

## Ziel

Das lokale Online-GM-System bewertet den GM jetzt über sportliche Leistung, Fan-Druck, Owner-Profil und Inaktivität. Der Druck ist dauerhaft sichtbar, aber Entlassungen bleiben regelbasiert und nicht willkürlich.

## Kernmodell

`GmJobSecurityScore` enthält:

- `score`: 0-100
- `status`: `secure`, `stable`, `under_pressure`, `hot_seat`, `termination_risk`, `fired`
- `lastUpdatedWeek`
- `lastUpdatedSeason`
- `gmPerformanceHistory`

Der bestehende Status `termination_risk` bleibt als Zwischenstufe vor `fired` erhalten.

## Einflussfaktoren

### Sportlich

`recordOnlineGmSeasonResult` bewertet:

- WinRate bzw. Wins gegen Erwartung
- Playoff-Teilnahme
- Playoff-Erfolge
- Championship
- Losing Streaks
- Rivalry Losses
- Cap Health

### Fans

Fan-Druck wird über `FanPressureSnapshot` eingerechnet:

- `fanMood`
- Attendance Trend
- Merchandise Trend
- Media Pressure
- Erwartung vs. Ergebnis
- Rivalry Failures
- Playoff Drought

Owner mit hoher `mediaSensitivity` reagieren stärker auf Fan-Druck.

### Owner

Owner-Profil beeinflusst Druck und Geduld:

- `patience`
- `ambition`
- `mediaSensitivity`
- `loyalty`
- `rebuildTolerance`
- `financialPressure`

Win-Now-Owner reagieren schneller kritisch, geduldige Owner feuern später.

### Inaktivität

Neu: Inaktivität wirkt direkt auf den Job-Security-Score.

Berechnung:

- missed weeks
- missed lineup submissions
- inactive status
- removal eligible threshold

Der Penalty ist auf `-30` begrenzt.

## Fairness-Regeln

- Keine Owner-Entlassung nach einer einzelnen schlechten Saison.
- Zwei schlechte Saisons können bei ungeduldigen Win-Now-Ownern kritisch werden.
- Geduldige oder rebuild-tolerante Owner feuern später.
- Niedriger Score erzeugt Hot Seat / Termination Risk Events.
- Admin-Removal ist getrennt von sportlicher Owner-Entlassung.

## Admin-Kontrolle

Admin-Funktionen:

- `warnOnlineGm`
- `authorizeOnlineGmRemoval`
- `removeOnlineGmByAdmin`
- `markOnlineTeamVacant`

Direkte Admin-Removal benötigt einen Grund und erzeugt Audit Events.

## Events

Relevante Events:

- `owner_confidence_changed`
- `owner_confidence_changed_by_fans`
- `gm_hot_seat`
- `gm_fired_by_owner`
- `gm_removed_by_admin`
- `gm_warning`
- `gm_removal_authorized`
- `team_marked_vacant`

## Tests

Abgedeckt:

- Gute Saison erhöht Job Security.
- Schlechte Saison senkt Job Security.
- Fan-Stimmung und Media Pressure beeinflussen Owner Confidence.
- Patient Owner feuert später als Win-Now Owner.
- Keine Sofortentlassung ohne schlechte Historie.
- Inaktive GMs werden removal eligible.
- Inaktivität senkt Job Security.
- Admin Warning und Removal Authorization funktionieren.
- Admin Removal erzeugt Audit Log und macht Team vakant.
- Neuer GM kann vakantes Team übernehmen.

## Offene Punkte

- Noch keine echte Backend-/Firebase-Synchronisation.
- Noch keine Midseason-Owner-Reviews außerhalb der lokalen MVP-Logik.
- Noch keine GM-Nachrichten-Inbox für Warnungen.
