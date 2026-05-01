# Admin Simulation & Woche Flow

## Status

Teilweise implementiert.

Der Admin-Flow ist nicht mehr ein Dummy:
- Im Admin Control Center führt `Simulation & Woche` zur ausgewählten Ligadetailseite.
- Auf `/admin/league/[leagueId]` lädt die Liga über die Admin API.
- Die Action `simulateWeek` läuft serverseitig über `/admin/api/online/actions`.
- Firebase-Requests benötigen einen Bearer Token und werden durch den bestehenden Admin Guard geprüft.

## Vorhandene Simulation

Firebase-Multiplayer-Ligen unterstützen eine serverseitige Week-Simulation, wenn:
- die Liga existiert,
- `league.status === "active"` ist,
- der Fantasy Draft nicht aktiv oder offen ist,
- alle aktiven Memberships ready sind,
- mindestens ein gültiges Matchup erzeugt werden kann,
- dieselbe Season/Week noch nicht simuliert wurde.

Die Action schreibt:
- `matchResults`
- `completedWeeks`
- `currentWeek` / `currentSeason`
- `weekStatus`
- `weeks/sX-wY`
- `adminActionLocks`
- `adminLogs`
- ein `week_simulated` Event
- zurückgesetzte Ready-Flags aktiver Memberships

## Technische Grenze

Die Firebase-Simulation nutzt aktuell die vorhandene minimale Match-Engine. Sie ist reproduzierbar und speichert echte Ergebnisse, aber sie ist noch nicht vollständig parity mit dem gesamten Singleplayer-/Season-System.

Noch nicht vollständig im Firebase-Week-Flow enthalten:
- Training Outcomes je Team
- Attendance/Fan/Finance Updates
- vollständige Season Engine mit Schedule-Parität
- tiefe Roster-/Depth-Chart-Auswertung über die große Simulation Engine

## Nächster sinnvoller Schritt

Implementiere einen dedizierten Multiplayer Week Simulation Service, der:
- Schedule/Matchups explizit persistiert,
- Teamratings aus Roster und Depth Chart ableitet,
- Training, Attendance, Finance und Injury Hooks kontrolliert ausführt,
- idempotente Week-Jobs mit Status `queued/running/completed/failed` speichert,
- Admin UI mit Jobstatus und Ergebnisübersicht versorgt.

## Checks

- `npm run lint`
- `npx tsc --noEmit`
- `npx vitest run src/lib/admin/online-admin-actions.test.ts src/app/api/admin/online/actions/route.test.ts src/components/admin/admin-league-form-validation.test.ts`
