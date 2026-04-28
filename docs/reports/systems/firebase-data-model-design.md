# Firebase Data Model Design

Datum: 2026-04-26

Scope: Konkretes, validierbares Firestore-Datenmodell fuer American Football Manager / FBManager. Dieses Dokument definiert Struktur und Typen, fuehrt aber keine Migration aus, schreibt keine Firestore-Daten und aendert keine produktiven Datenpfade.

## Status

Status: Gruen

Begruendung: Die geforderten Collections sind vollstaendig definiert, kritische Game-Engine-Datenpfade sind abgedeckt, Denormalisierungen sind benannt und Risiken sind dokumentiert. Prisma bleibt aktiv; dieses Dokument ist nur ein Zielmodell.

## Leitentscheidungen

- `leagues` ist die spielbare Liga-Instanz und entspricht fachlich dem heutigen Savegame-Root.
- `ownerId` ist der primaere Besitzanker fuer Rules und Parity-Tests.
- Alle Laufzeitdaten tragen `leagueId`; Nutzerzugriff laeuft ueber `leagueMembers`.
- Beziehungen werden ueber IDs modelliert, nicht ueber Joins.
- UI-nahe Felder werden bewusst denormalisiert, z.B. Teamnamen in Matches und Stats.
- Kritische Game-Engine-Writes bleiben server-only: Match State, Game Events, Stats, Season/Week Progress, Player Development und Finance.
- Geldwerte werden als integer cents gespeichert, z.B. `salaryCapCents`.
- Fractional Football-Werte werden als integer gespeichert, z.B. `sacksTenths`.
- Zeitfelder sind Firestore Timestamps.

## Collection-Uebersicht

Top-level Collections:

```text
users/{userId}
leagues/{leagueId}
leagueMembers/{leagueMemberId}
teams/{teamId}
players/{playerId}
seasons/{seasonId}
weeks/{weekId}
matches/{matchId}
gameEvents/{gameEventId}
playerStats/{playerStatId}
teamStats/{teamStatId}
reports/{reportId}
```

Optionale spaetere Referenzdaten-Collections, nicht Teil des geforderten finalen Katalogs:

```text
referenceLeagues/{id}
referencePositions/{id}
referenceAttributes/{id}
referenceSchemeFits/{id}
referenceFranchises/{id}
```

Diese Referenzdaten koennen zunaechst weiter aus den bestehenden TypeScript-Konstanten und Prisma-Seed-Daten gespiegelt werden.

## Naming-Konventionen

Collections:
- Plural, lower camel case: `leagueMembers`, `playerStats`.

IDs:
- `userId`: bestehende Auth/User-ID, keine Firestore-Neugenerierung erforderlich.
- `leagueId`: stabile Savegame-ID oder `league_${cuid}`; beim Backfill bevorzugt heutige `SaveGame.id`.
- `leagueMemberId`: `${leagueId}_${userId}`.
- `teamId`: heutige `Team.id`.
- `playerId`: heutige `Player.id`.
- `seasonId`: heutige `Season.id`.
- `weekId`: `${leagueId}_${seasonId}_w${weekNumber}`.
- `matchId`: heutige `Match.id`.
- `gameEventId`: `${matchId}_${sequencePadded}` oder servergeneriert, wenn keine Reihenfolge noetig ist.
- `playerStatId`: `${scope}_${scopeId}_${playerId}_${teamId?}`.
- `teamStatId`: `${scope}_${scopeId}_${teamId}`.
- `reportId`: `${leagueId}_${reportType}_${createdAtMillis}` oder servergeneriert.

Feldnamen:
- IDs enden auf `Id`.
- Snapshots enden auf `Snapshot`.
- Geldwerte enden auf `Cents`.
- Sortier-/Query-Felder werden explizit gespeichert, z.B. `weekNumber`, `seasonYear`, `status`.

## Gemeinsame Typbausteine

```ts
type Timestamp = unknown;

type AuditFields = {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type TeamSnapshot = {
  teamId: string;
  city: string;
  nickname: string;
  abbreviation: string;
};

type PlayerSnapshot = {
  playerId: string;
  fullName: string;
  positionCode: string;
  teamId: string | null;
  teamAbbreviation: string | null;
};

type MoneyCents = number;
type SacksTenths = number;
```

Statuswerte:

```ts
type LeagueStatus = "ACTIVE" | "ARCHIVED";
type MemberRole = "OWNER" | "ADMIN" | "GM" | "VIEWER";
type SeasonPhase = "PRESEASON" | "REGULAR_SEASON" | "PLAYOFFS" | "OFFSEASON";
type WeekState = "PRE_WEEK" | "READY" | "GAME_RUNNING" | "POST_GAME";
type MatchStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
type MatchKind = "PRESEASON" | "REGULAR_SEASON" | "PLAYOFF";
type PlayerStatus = "ACTIVE" | "INJURED" | "FREE_AGENT" | "RETIRED";
type InjuryStatus = "HEALTHY" | "QUESTIONABLE" | "DOUBTFUL" | "OUT" | "INJURED_RESERVE";
type RosterStatus =
  | "STARTER"
  | "ROTATION"
  | "BACKUP"
  | "PRACTICE_SQUAD"
  | "INACTIVE"
  | "INJURED_RESERVE"
  | "FREE_AGENT";
type ReportType = "MATCH_REPORT" | "SEASON_SUMMARY" | "SIMULATION_DEBUG" | "QA";
```

## Collections

### users

Pfad: `users/{userId}`

Zweck:
- App-Profil und nicht-auth-kritische Nutzer-Metadaten.
- Auth.js bleibt vorerst Prisma-basiert; dieses Dokument migriert keine Auth-Daten.

Pflichtfelder:
- `id`
- `displayName`
- `email`
- `createdAt`
- `updatedAt`

Optionale Felder:
- `imageUrl`
- `defaultLeagueId`
- `lastActiveLeagueId`
- `preferences`

Referenzen:
- `defaultLeagueId -> leagues/{leagueId}`
- `lastActiveLeagueId -> leagues/{leagueId}`

Denormalisierung:
- Keine Provider Tokens, keine Sessions, keine Auth Credentials.

Type:

```ts
type UserDoc = AuditFields & {
  id: string;
  displayName: string | null;
  email: string | null;
  imageUrl?: string | null;
  defaultLeagueId?: string | null;
  lastActiveLeagueId?: string | null;
  preferences?: {
    locale?: string;
    timezone?: string;
  };
};
```

Reads/Writes:
- Read: eigener User.
- Write: spaeter nur eigenes Profil, eingeschraenkt.
- Kritisch: Auth bleibt ausserhalb.

### leagues

Pfad: `leagues/{leagueId}`

Zweck:
- Spielbare Liga-/Savegame-Instanz.
- Zentraler Root fuer Season, Teams, Players, Matches und Game State.

Pflichtfelder:
- `id`
- `ownerId`
- `name`
- `status`
- `weekState`
- `currentSeasonId`
- `currentWeekId`
- `currentSeasonSnapshot`
- `settings`
- `counts`
- `createdAt`
- `updatedAt`

Optionale Felder:
- `sourceSaveGameId`
- `sourceLeagueDefinitionId`
- `leagueDefinitionSnapshot`
- `managerTeamId`
- `lastSimulatedAt`

Referenzen:
- `ownerId -> users/{userId}`
- `currentSeasonId -> seasons/{seasonId}`
- `currentWeekId -> weeks/{weekId}`
- `managerTeamId -> teams/{teamId}`

Denormalisierung:
- `currentSeasonSnapshot` vermeidet Reads fuer Dashboard.
- `counts.teamCount`, `counts.playerCount`, `counts.matchCount` ersetzen Prisma `_count`.
- `leagueDefinitionSnapshot.name` ersetzt Join auf `LeagueDefinition`.

Type:

```ts
type LeagueDoc = AuditFields & {
  id: string;
  ownerId: string;
  name: string;
  status: LeagueStatus;
  weekState: WeekState;
  currentSeasonId: string;
  currentWeekId: string;
  managerTeamId: string | null;
  sourceSaveGameId?: string;
  sourceLeagueDefinitionId?: string;
  leagueDefinitionSnapshot: {
    code: string;
    name: string;
  };
  currentSeasonSnapshot: {
    year: number;
    phase: SeasonPhase;
    weekNumber: number;
  };
  settings: {
    salaryCapCents: MoneyCents;
    activeRosterLimit: number;
    practiceSquadSize: number;
    seasonLengthWeeks: number;
  };
  counts: {
    teamCount: number;
    playerCount: number;
    matchCount: number;
  };
  lastSimulatedAt?: Timestamp | null;
};
```

Reads/Writes:
- Read: league members.
- Write: owner/admin server operations.
- Critical: `weekState`, `currentSeasonId`, `currentWeekId`, `counts`, `settings` are server-only.

### leagueMembers

Pfad: `leagueMembers/{leagueMemberId}`

Zweck:
- Zugriffsschicht fuer `leagues`.
- Ermoeglicht Queries nach Ligen eines Users und Rules-Pruefung.

Pflichtfelder:
- `id`
- `leagueId`
- `userId`
- `role`
- `status`
- `createdAt`
- `updatedAt`

Optionale Felder:
- `teamId`
- `leagueSnapshot`
- `teamSnapshot`
- `invitedByUserId`

Referenzen:
- `leagueId -> leagues/{leagueId}`
- `userId -> users/{userId}`
- `teamId -> teams/{teamId}`

Denormalisierung:
- `leagueSnapshot.name/status/currentSeasonLabel` fuer Savegame-/League-Liste.
- `teamSnapshot` fuer schnelle Navigation.

Type:

```ts
type LeagueMemberDoc = AuditFields & {
  id: string;
  leagueId: string;
  userId: string;
  role: MemberRole;
  status: "ACTIVE" | "INVITED" | "REMOVED";
  teamId?: string | null;
  invitedByUserId?: string | null;
  leagueSnapshot: {
    name: string;
    status: LeagueStatus;
    weekState: WeekState;
    currentSeasonLabel: string;
    updatedAt: Timestamp;
  };
  teamSnapshot?: TeamSnapshot | null;
};
```

Reads/Writes:
- Read: eigener membership doc, admin/owner for league.
- Write: owner/admin only.

### teams

Pfad: `teams/{teamId}`

Zweck:
- Savegame-/League-spezifisches Team.
- Enthalt Team-Detail, Cap-Snapshot und Scheme-Auswahl.

Pflichtfelder:
- `id`
- `leagueId`
- `franchiseTemplateId`
- `city`
- `nickname`
- `abbreviation`
- `managerControlled`
- `conferenceSnapshot`
- `divisionSnapshot`
- `schemes`
- `overallRating`
- `morale`
- `cashBalanceCents`
- `salaryCapSpaceCents`
- `rosterCounts`
- `createdAt`
- `updatedAt`

Optionale Felder:
- `ownerUserId`
- `currentSeasonStatId`
- `activeContractSummary`

Referenzen:
- `leagueId -> leagues/{leagueId}`
- `ownerUserId -> users/{userId}`
- `currentSeasonStatId -> teamStats/{teamStatId}`

Denormalisierung:
- Conference/Division names are stored as snapshots.
- Scheme code/name snapshots avoid reference joins.
- Roster counts and cap summaries avoid expensive team detail reads.

Type:

```ts
type TeamDoc = AuditFields & {
  id: string;
  leagueId: string;
  ownerUserId?: string | null;
  franchiseTemplateId: string;
  city: string;
  nickname: string;
  abbreviation: string;
  managerControlled: boolean;
  conferenceSnapshot: { id: string; code: string; name: string };
  divisionSnapshot: { id: string; code: string; name: string };
  schemes: {
    offense: { id: string; code: string; name: string } | null;
    defense: { id: string; code: string; name: string } | null;
    specialTeams: { id: string; code: string; name: string } | null;
  };
  overallRating: number;
  morale: number;
  cashBalanceCents: MoneyCents;
  salaryCapSpaceCents: MoneyCents;
  rosterCounts: {
    active: number;
    practiceSquad: number;
    injuredReserve: number;
    total: number;
  };
  activeContractSummary?: {
    committedCapCents: MoneyCents;
    expiringCapCents: MoneyCents;
    expiringPlayerCount: number;
  };
  currentSeasonStatId?: string | null;
};
```

Reads/Writes:
- Read: league members.
- Write: server-only for cap/cash/rating/roster counts. Owner/admin actions go through server.

### players

Pfad: `players/{playerId}`

Zweck:
- Spieleridentitaet, Roster-Profil, Evaluation und Attribute.

Pflichtfelder:
- `id`
- `leagueId`
- `firstName`
- `lastName`
- `fullName`
- `age`
- `heightCm`
- `weightKg`
- `yearsPro`
- `status`
- `injury`
- `condition`
- `developmentTrait`
- `roster`
- `evaluation`
- `attributes`
- `createdAt`
- `updatedAt`

Optionale Felder:
- `birthDate`
- `college`
- `nationality`
- `dominantHand`
- `activeContractSummary`
- `careerStatId`
- `latestSeasonStatId`

Referenzen:
- `leagueId -> leagues/{leagueId}`
- `roster.teamId -> teams/{teamId}`
- `careerStatId -> playerStats/{playerStatId}`
- `latestSeasonStatId -> playerStats/{playerStatId}`

Denormalisierung:
- `fullName` for sort/display.
- `roster.positionSnapshot`, `roster.teamSnapshot` for player detail without joins.
- `evaluation` and `attributes` inline for team roster, simulation context and free agency.
- `activeContractSummary` inline for team/player views; canonical contract history can become `gameEvents` or future `contracts`.

Type:

```ts
type PlayerDoc = AuditFields & {
  id: string;
  leagueId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  age: number;
  birthDate?: Timestamp | null;
  heightCm: number;
  weightKg: number;
  yearsPro: number;
  college?: string | null;
  nationality?: string | null;
  dominantHand?: "RIGHT" | "LEFT" | "AMBIDEXTROUS" | null;
  status: PlayerStatus;
  injury: {
    status: InjuryStatus;
    name: string | null;
    endsOn: Timestamp | null;
  };
  condition: {
    fatigue: number;
    morale: number;
  };
  developmentTrait: "NORMAL" | "IMPACT" | "STAR" | "ELITE";
  roster: {
    teamId: string | null;
    teamSnapshot: TeamSnapshot | null;
    rosterStatus: RosterStatus;
    depthChartSlot: number | null;
    captainFlag: boolean;
    developmentFocus: boolean;
    practiceSquadEligible: boolean | null;
    primaryPosition: { id: string; code: string; name: string };
    secondaryPosition: { id: string; code: string; name: string } | null;
    positionGroup: { id: string; code: string; name: string };
    archetype: { id: string; code: string; name: string } | null;
    schemeFit: { id: string; code: string; name: string } | null;
  };
  evaluation: {
    potentialRating: number;
    positionOverall: number;
    offensiveOverall: number | null;
    defensiveOverall: number | null;
    specialTeamsOverall: number | null;
    physicalOverall: number | null;
    mentalOverall: number | null;
  };
  attributes: Record<string, number>;
  activeContractSummary?: {
    contractId: string;
    teamId: string;
    status: "ACTIVE" | "EXPIRED" | "RELEASED";
    years: number;
    yearlySalaryCents: MoneyCents;
    signingBonusCents: MoneyCents;
    capHitCents: MoneyCents;
    signedAt: Timestamp;
  } | null;
  careerStatId?: string | null;
  latestSeasonStatId?: string | null;
};
```

Reads/Writes:
- Read: league members.
- Write: server-only for roster/evaluation/attributes/injury/contract summary.

### seasons

Pfad: `seasons/{seasonId}`

Zweck:
- Saisonstatus und Saison-Metadaten.

Pflichtfelder:
- `id`
- `leagueId`
- `year`
- `phase`
- `currentWeekNumber`
- `startsAt`
- `createdAt`
- `updatedAt`

Optionale Felder:
- `endsAt`
- `championTeamId`
- `championTeamSnapshot`
- `counts`

Referenzen:
- `leagueId -> leagues/{leagueId}`
- `championTeamId -> teams/{teamId}`

Denormalisierung:
- `championTeamSnapshot` fuer Season Overview.
- `counts.matchCount/completedMatchCount` ersetzt Count-Queries.

Type:

```ts
type SeasonDoc = AuditFields & {
  id: string;
  leagueId: string;
  year: number;
  phase: SeasonPhase;
  currentWeekNumber: number;
  startsAt: Timestamp | null;
  endsAt?: Timestamp | null;
  championTeamId?: string | null;
  championTeamSnapshot?: TeamSnapshot | null;
  counts: {
    matchCount: number;
    completedMatchCount: number;
    teamCount: number;
  };
};
```

Reads/Writes:
- Read: league members.
- Write: server-only for phase/week/champion/counts.

### weeks

Pfad: `weeks/{weekId}`

Zweck:
- Expliziter Week-State fuer Game-/Week-Loop.
- Ersetzt implizite Prisma-Kombination aus `SaveGame.weekState`, `Season.week` und `Match.status`.

Pflichtfelder:
- `id`
- `leagueId`
- `seasonId`
- `seasonYear`
- `weekNumber`
- `phase`
- `state`
- `matchIds`
- `counts`
- `createdAt`
- `updatedAt`

Optionale Felder:
- `startedAt`
- `completedAt`
- `simulationLock`

Referenzen:
- `leagueId -> leagues/{leagueId}`
- `seasonId -> seasons/{seasonId}`
- `matchIds[] -> matches/{matchId}`

Denormalisierung:
- `matchIds` and `counts` make dashboard/week-loop cheap.
- `simulationLock` supports server-side lease later.

Type:

```ts
type WeekDoc = AuditFields & {
  id: string;
  leagueId: string;
  seasonId: string;
  seasonYear: number;
  weekNumber: number;
  phase: SeasonPhase;
  state: WeekState;
  matchIds: string[];
  counts: {
    scheduled: number;
    inProgress: number;
    completed: number;
    total: number;
  };
  startedAt?: Timestamp | null;
  completedAt?: Timestamp | null;
  simulationLock?: {
    status: "NONE" | "LOCKED";
    lockedBy: string | null;
    lockedAt: Timestamp | null;
    expiresAt: Timestamp | null;
  };
};
```

Reads/Writes:
- Read: league members.
- Write: server-only. Client must not set week state.

### matches

Pfad: `matches/{matchId}`

Zweck:
- Schedule, match lifecycle, score and summary.

Pflichtfelder:
- `id`
- `leagueId`
- `seasonId`
- `weekId`
- `seasonYear`
- `weekNumber`
- `kind`
- `status`
- `homeTeamId`
- `awayTeamId`
- `homeTeamSnapshot`
- `awayTeamSnapshot`
- `scheduledAt`
- `createdAt`
- `updatedAt`

Optionale Felder:
- `stadiumName`
- `simulationSeed`
- `simulationStartedAt`
- `simulationCompletedAt`
- `homeScore`
- `awayScore`
- `winnerTeamId`
- `summary`
- `reportId`
- `statsReady`

Referenzen:
- `leagueId -> leagues/{leagueId}`
- `seasonId -> seasons/{seasonId}`
- `weekId -> weeks/{weekId}`
- `homeTeamId/awayTeamId -> teams/{teamId}`
- `reportId -> reports/{reportId}`

Denormalisierung:
- Team snapshots avoid joins in schedule, game center and reports.
- `seasonYear`, `weekNumber`, `status` support schedule queries.
- `statsReady` avoids scanning stats collections.

Type:

```ts
type MatchDoc = AuditFields & {
  id: string;
  leagueId: string;
  seasonId: string;
  weekId: string;
  seasonYear: number;
  weekNumber: number;
  kind: MatchKind;
  status: MatchStatus;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamSnapshot: TeamSnapshot;
  awayTeamSnapshot: TeamSnapshot;
  scheduledAt: Timestamp;
  stadiumName?: string | null;
  simulationSeed?: string | null;
  simulationStartedAt?: Timestamp | null;
  simulationCompletedAt?: Timestamp | null;
  homeScore?: number | null;
  awayScore?: number | null;
  winnerTeamId?: string | null;
  summary?: string | null;
  reportId?: string | null;
  statsReady: boolean;
};
```

Reads/Writes:
- Read: league members.
- Write: server-only for status, scores, seed, report/stat readiness.

### gameEvents

Pfad: `gameEvents/{gameEventId}`

Zweck:
- Append-only event stream for drives, roster transactions, player history, finance events and audit events.
- Replaces several relational event tables while keeping `eventType`.

Pflichtfelder:
- `id`
- `leagueId`
- `eventType`
- `occurredAt`
- `createdAt`
- `updatedAt`

Optionale Felder:
- `seasonId`
- `weekId`
- `matchId`
- `sequence`
- `teamId`
- `playerId`
- `teamSnapshot`
- `playerSnapshot`
- `payload`
- `visibility`

Referenzen:
- Optional IDs point to `seasons`, `weeks`, `matches`, `teams`, `players`.

Denormalisierung:
- Snapshots preserve historic names/positions/teams.
- `payload` holds event-specific values, e.g. drive yards or finance cap impact.

Type:

```ts
type GameEventType =
  | "MATCH_DRIVE"
  | "ROSTER_TRANSACTION"
  | "PLAYER_HISTORY"
  | "FINANCE_EVENT"
  | "SIMULATION_AUDIT";

type GameEventDoc = AuditFields & {
  id: string;
  leagueId: string;
  seasonId?: string | null;
  weekId?: string | null;
  matchId?: string | null;
  sequence?: number | null;
  eventType: GameEventType;
  occurredAt: Timestamp;
  teamId?: string | null;
  playerId?: string | null;
  teamSnapshot?: TeamSnapshot | null;
  playerSnapshot?: PlayerSnapshot | null;
  visibility: "LEAGUE" | "TEAM" | "PRIVATE_SERVER";
  payload: Record<string, unknown>;
};
```

Event payload conventions:
- `MATCH_DRIVE`: scores, offense/defense IDs, plays, passAttempts, rushAttempts, totalYards, resultType, pointsScored, turnover, redZoneTrip, summary.
- `FINANCE_EVENT`: amountCents, capImpactCents, cashBalanceAfterCents, description.
- `PLAYER_HISTORY`: type, weekNumber, title, description.
- `ROSTER_TRANSACTION`: fromTeamId, toTeamId, transactionType, description.

Reads/Writes:
- Read: league members, except `PRIVATE_SERVER`.
- Write: server-only.

### playerStats

Pfad: `playerStats/{playerStatId}`

Zweck:
- Player stats for match, season and career scopes.
- Normalized Prisma stat-family tables become nested maps.

Pflichtfelder:
- `id`
- `leagueId`
- `playerId`
- `scope`
- `scopeId`
- `base`
- `statLines`
- `createdAt`
- `updatedAt`

Optionale Felder:
- `seasonId`
- `weekId`
- `matchId`
- `teamId`
- `seasonYear`
- `weekNumber`
- `playerSnapshot`
- `teamSnapshot`

Referenzen:
- `playerId -> players/{playerId}`
- `teamId -> teams/{teamId}`
- scope IDs point to match/season/league.

Denormalisierung:
- `playerSnapshot` and `teamSnapshot` are required for reports without player/team joins.
- `seasonYear`, `weekNumber`, `teamId` support leaderboard and team stat queries.

Type:

```ts
type PlayerStatScope = "MATCH" | "SEASON" | "CAREER";

type PlayerStatLines = {
  passing?: {
    attempts: number;
    completions: number;
    yards: number;
    touchdowns: number;
    interceptions: number;
    sacksTaken: number;
    sackYardsLost: number;
    longestCompletion: number;
  };
  rushing?: {
    attempts: number;
    yards: number;
    touchdowns: number;
    fumbles: number;
    longestRush: number;
    brokenTackles: number;
  };
  receiving?: {
    targets: number;
    receptions: number;
    yards: number;
    touchdowns: number;
    drops: number;
    longestReception: number;
    yardsAfterCatch: number;
  };
  blocking?: {
    passBlockSnaps: number;
    runBlockSnaps: number;
    sacksAllowed: number;
    pressuresAllowed: number;
    pancakes: number;
  };
  defensive?: {
    tackles: number;
    assistedTackles: number;
    tacklesForLoss: number;
    sacksTenths: SacksTenths;
    quarterbackHits: number;
    passesDefended: number;
    interceptions: number;
    forcedFumbles: number;
    fumbleRecoveries: number;
    defensiveTouchdowns: number;
    coverageSnaps: number;
    targetsAllowed: number;
    receptionsAllowed: number;
    yardsAllowed: number;
  };
  kicking?: Record<string, number>;
  punting?: Record<string, number>;
  returns?: Record<string, number>;
};

type PlayerStatDoc = AuditFields & {
  id: string;
  leagueId: string;
  playerId: string;
  teamId?: string | null;
  seasonId?: string | null;
  weekId?: string | null;
  matchId?: string | null;
  seasonYear?: number | null;
  weekNumber?: number | null;
  scope: PlayerStatScope;
  scopeId: string;
  playerSnapshot: PlayerSnapshot;
  teamSnapshot?: TeamSnapshot | null;
  base: {
    gamesPlayed?: number;
    gamesStarted?: number;
    started?: boolean;
    snapsOffense: number;
    snapsDefense: number;
    snapsSpecialTeams: number;
  };
  statLines: PlayerStatLines;
};
```

Reads/Writes:
- Read: league members.
- Write: server-only, especially match/season/career increments.

### teamStats

Pfad: `teamStats/{teamStatId}`

Zweck:
- Team stats for match, season and optional career/franchise scopes.

Pflichtfelder:
- `id`
- `leagueId`
- `teamId`
- `scope`
- `scopeId`
- `teamSnapshot`
- `stats`
- `createdAt`
- `updatedAt`

Optionale Felder:
- `seasonId`
- `weekId`
- `matchId`
- `seasonYear`
- `weekNumber`
- `rank`

Referenzen:
- `teamId -> teams/{teamId}`
- scope IDs point to match/season/league.

Denormalisierung:
- `teamSnapshot` supports standings and reports.
- `rank` may be server-maintained for standings UI.

Type:

```ts
type TeamStatScope = "MATCH" | "SEASON";

type TeamStatDoc = AuditFields & {
  id: string;
  leagueId: string;
  teamId: string;
  seasonId?: string | null;
  weekId?: string | null;
  matchId?: string | null;
  seasonYear?: number | null;
  weekNumber?: number | null;
  scope: TeamStatScope;
  scopeId: string;
  teamSnapshot: TeamSnapshot;
  rank?: number | null;
  stats: {
    gamesPlayed?: number;
    wins?: number;
    losses?: number;
    ties?: number;
    pointsFor?: number;
    pointsAgainst?: number;
    touchdownsFor?: number;
    touchdownsAgainst?: number;
    turnoversForced?: number;
    turnoversCommitted?: number;
    passingYards?: number;
    rushingYards?: number;
    firstDowns?: number;
    totalYards?: number;
    turnovers?: number;
    penalties?: number;
    timeOfPossessionSeconds?: number;
    sacks?: number;
    explosivePlays?: number;
    redZoneTrips?: number;
    redZoneTouchdowns?: number;
  };
};
```

Reads/Writes:
- Read: league members.
- Write: server-only. Standings and match stats are critical Game Engine outputs.

### reports

Pfad: `reports/{reportId}`

Zweck:
- Persisted read/report artifacts for match report, season summary, simulation debug and QA.

Pflichtfelder:
- `id`
- `leagueId`
- `reportType`
- `title`
- `createdAt`
- `updatedAt`
- `createdBy`
- `visibility`
- `summary`

Optionale Felder:
- `seasonId`
- `weekId`
- `matchId`
- `teamId`
- `payload`
- `htmlReportPath`
- `jsonReportPath`

Referenzen:
- Optional IDs point to league entities.

Denormalisierung:
- `title`, `summary`, `teamSnapshots`, `score` should be stored in payload for stable historic reports.

Type:

```ts
type ReportDoc = AuditFields & {
  id: string;
  leagueId: string;
  seasonId?: string | null;
  weekId?: string | null;
  matchId?: string | null;
  teamId?: string | null;
  reportType: ReportType;
  title: string;
  summary: string;
  createdBy: "SYSTEM" | "USER";
  visibility: "LEAGUE" | "OWNER_ONLY" | "PRIVATE_SERVER";
  payload: Record<string, unknown>;
  htmlReportPath?: string | null;
  jsonReportPath?: string | null;
};
```

Reads/Writes:
- Read: league members for `LEAGUE`, owner/admin for restricted reports.
- Write: server-only.

## Query- und Indexbedarf

Primaere Queries:
- Ligen eines Nutzers: `leagueMembers where userId == X and status == ACTIVE`.
- Teams einer Liga: `teams where leagueId == X orderBy abbreviation`.
- Manager-Team: `teams where leagueId == X and managerControlled == true`.
- Roster: `players where leagueId == X and roster.teamId == Y`.
- Free Agents: `players where leagueId == X and status == FREE_AGENT`.
- Season Overview: `teamStats where leagueId == X and seasonId == Y and scope == SEASON orderBy wins desc, pointsFor desc`.
- Week Matches: `matches where leagueId == X and seasonId == Y and weekNumber == N orderBy scheduledAt`.
- Match Report: `matches/{id}`, `gameEvents where matchId == X and eventType == MATCH_DRIVE orderBy sequence`, `playerStats where matchId == X`, `teamStats where matchId == X`.
- Player Detail: `players/{id}`, `playerStats where playerId == X orderBy seasonYear desc`.
- Reports: `reports where leagueId == X orderBy createdAt desc`.

Composite Indexes:
- `leagueMembers`: `userId ASC, status ASC, updatedAt DESC`.
- `teams`: `leagueId ASC, abbreviation ASC`.
- `teams`: `leagueId ASC, managerControlled ASC`.
- `players`: `leagueId ASC, roster.teamId ASC, roster.primaryPosition.code ASC`.
- `players`: `leagueId ASC, status ASC, evaluation.positionOverall DESC`.
- `matches`: `leagueId ASC, seasonId ASC, weekNumber ASC, scheduledAt ASC`.
- `matches`: `leagueId ASC, status ASC, updatedAt ASC`.
- `gameEvents`: `leagueId ASC, matchId ASC, eventType ASC, sequence ASC`.
- `gameEvents`: `leagueId ASC, playerId ASC, occurredAt DESC`.
- `playerStats`: `leagueId ASC, playerId ASC, scope ASC, seasonYear DESC`.
- `playerStats`: `leagueId ASC, matchId ASC, teamId ASC`.
- `teamStats`: `leagueId ASC, seasonId ASC, scope ASC, wins DESC, pointsFor DESC`.
- `reports`: `leagueId ASC, createdAt DESC`.

## Kritische Analyse

### Viele Reads

Team Detail:
- Ohne Denormalisierung wuerde jedes Roster-Mitglied Player, Evaluation, Attributes, Contract und Season Stat laden.
- Loesung: `players` enthaelt Roster, Evaluation, Attributes und Contract Summary inline.

Simulation Context:
- Braucht zwei komplette Teams mit aktiven Spielern, Attributen, Ratings, Injury/Fatigue und Stat-Ankern.
- Loesung: serverseitiger Bulk-Read von `players where roster.teamId in [home, away]`; keine Client-Reads.

Free-Agent Market:
- Kann viele Spieler mit Evaluation/Attributes laden.
- Loesung: paginieren und optional spaeter `marketScore`, `positionCode`, `askingPriceCents` als server gepflegte Felder.

Match Report:
- Braucht Match, Drives, TeamStats und PlayerStats.
- Loesung: Drive Events als `gameEvents` mit `matchId`, Stats als top-level stat docs mit snapshots.

### Aggregates

Notwendig:
- League counts: team/player/match counts.
- Team roster counts.
- Team cap/cash summary.
- Team season standings.
- Player career stats.
- Player latest season stats.
- Week match status counts.
- Draft pick counter, falls Draft im Modell spaeter als eigene Collection ergaenzt wird.

Aggregates muessen serverseitig gepflegt werden. Client darf sie nicht frei schreiben.

### Duplizierte Daten

Bewusst dupliziert:
- Team snapshots in `matches`, `teamStats`, `playerStats`, `gameEvents`.
- Player snapshots in `playerStats`, `gameEvents`, `reports`.
- Current season snapshot and counts in `leagues`.
- Roster/team/position/evaluation/attributes in `players`.
- Contract summary in `players` and team cap summary in `teams`.

Grund:
- Firestore hat keine Joins.
- UI-Readmodelle sollen wenige Reads brauchen.
- Historische Reports muessen stabil bleiben, auch wenn Team-/Spielerdaten spaeter geaendert werden.

### Kritische Writes

Server-only:
- `leagues.weekState`, current season/week and counts.
- `weeks.state`, match counts and simulation lock.
- `matches.status`, score, seed, winner and report links.
- `gameEvents` for match drives, finance, roster transactions and player history.
- `playerStats`, `teamStats`.
- `players.evaluation`, `players.attributes`, `players.injury`, `players.condition`, `players.roster`.
- `teams.cashBalanceCents`, `teams.salaryCapSpaceCents`, `teams.overallRating`, `teams.rosterCounts`.
- `reports`.

Main risk:
- Season simulation can generate many writes and must not run as one long Firestore transaction. Use compute outside transaction, then short transactions/batches for state transitions and persisted outputs.

## Security-Grundmodell

Reads:
- User can read own `users/{userId}`.
- League members can read league-scoped docs where `leagueId` matches active membership.

Writes:
- Client writes are denied by default.
- Optional future client writes can be limited to harmless preferences or inbox-like docs.
- Game Engine writes require Admin SDK / server execution.

Rules implication:
- Because Rules cannot efficiently join arbitrary collections, either store a compact membership claim or keep membership docs queryable by deterministic ID `${leagueId}_${uid}`.
- Use `leagueMembers/{leagueId}_${uid}` for Rules membership checks.

## Migration Mapping Summary

Current Prisma -> Firestore:
- `SaveGame` -> `leagues`
- `User` -> `users` only for app profile; Auth remains Prisma/Auth.js for now.
- `Team` -> `teams`
- `Player`, `PlayerRosterProfile`, `PlayerEvaluation`, `PlayerAttributeRating`, active `Contract` summary -> `players`
- `Season` -> `seasons`
- `Season.week` + `SaveGame.weekState` -> `weeks`
- `Match` -> `matches`
- `MatchSimulationDrive`, `RosterTransaction`, `PlayerHistoryEvent`, `TeamFinanceEvent` -> `gameEvents`
- `PlayerCareerStat`, `PlayerSeasonStat`, `PlayerMatchStat` and families -> `playerStats`
- `TeamSeasonStat`, `TeamMatchStat` -> `teamStats`
- HTML/JSON generated outputs -> `reports`

## Nicht-Ziele

- Keine Firestore-Repositories.
- Keine Firestore Seeds.
- Keine Migration.
- Keine Prisma-Loeschung.
- Keine Auth-Umstellung.
- Keine produktive Nutzung von `DATA_BACKEND=firestore`.
- Keine Client-Writes fuer Game State.

## Statuspruefung

Ist das Modell vollstaendig?

Status: Gruen. Alle geforderten Collections sind mit Zweck, Struktur, Pflichtfeldern, optionalen Feldern, Referenzen und Typen definiert.

Sind alle kritischen Datenpfade abgedeckt?

Status: Gruen. Week Loop, Match State, Game Events, Team/Player Stats, Reports, Player Development, Team Finance und Aggregates sind modelliert und als server-only markiert.

Sind Denormalisierungen klar?

Status: Gruen. Team-, Player-, Season-, Match-, Stats- und Report-Snapshots sind explizit benannt und begruendet.

Sind Risiken benannt?

Status: Gruen. Viele Reads, Aggregates, doppelte Daten, kritische Game-Engine-Writes, Batch-/Transaktionslimits und Rules-Membership-Risiken sind dokumentiert.

## Naechste Empfehlung

Naechster sicherer Schritt:
- `firestore.indexes.json` an dieses finale Modell angleichen.
- Rules-Testmatrix fuer Membership, eigene User-Daten und verbotene Game-Engine-Writes erstellen.
- Erst danach Firestore-Seed-Anforderungen fuer Emulator-Daten konkretisieren.
