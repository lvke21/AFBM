-- CreateEnum
CREATE TYPE "public"."SaveGameStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."WeekState" AS ENUM ('PRE_WEEK', 'READY', 'GAME_RUNNING', 'POST_GAME');

-- CreateEnum
CREATE TYPE "public"."RosterUnit" AS ENUM ('OFFENSE', 'DEFENSE', 'SPECIAL_TEAMS');

-- CreateEnum
CREATE TYPE "public"."SideOfBall" AS ENUM ('OFFENSE', 'DEFENSE', 'SPECIAL_TEAMS');

-- CreateEnum
CREATE TYPE "public"."PlayerStatus" AS ENUM ('ACTIVE', 'INJURED', 'FREE_AGENT', 'RETIRED');

-- CreateEnum
CREATE TYPE "public"."InjuryStatus" AS ENUM ('HEALTHY', 'QUESTIONABLE', 'DOUBTFUL', 'OUT', 'INJURED_RESERVE');

-- CreateEnum
CREATE TYPE "public"."DominantHand" AS ENUM ('RIGHT', 'LEFT', 'AMBIDEXTROUS');

-- CreateEnum
CREATE TYPE "public"."DevelopmentTrait" AS ENUM ('NORMAL', 'IMPACT', 'STAR', 'ELITE');

-- CreateEnum
CREATE TYPE "public"."RosterStatus" AS ENUM ('STARTER', 'ROTATION', 'BACKUP', 'PRACTICE_SQUAD', 'INACTIVE', 'INJURED_RESERVE', 'FREE_AGENT');

-- CreateEnum
CREATE TYPE "public"."AttributeCategory" AS ENUM ('GENERAL', 'QUARTERBACK', 'BALL_CARRIER', 'RECEIVING', 'OFFENSIVE_LINE', 'FRONT_SEVEN', 'COVERAGE', 'KICKING', 'SPECIAL_TEAMS');

-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'RELEASED');

-- CreateEnum
CREATE TYPE "public"."SeasonPhase" AS ENUM ('PRESEASON', 'REGULAR_SEASON', 'PLAYOFFS', 'OFFSEASON');

-- CreateEnum
CREATE TYPE "public"."MatchKind" AS ENUM ('PRESEASON', 'REGULAR_SEASON', 'PLAYOFF');

-- CreateEnum
CREATE TYPE "public"."MatchStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."RosterTransactionType" AS ENUM ('DRAFT', 'SIGNING', 'TRADE', 'RELEASE');

-- CreateEnum
CREATE TYPE "public"."PlayerHistoryEventType" AS ENUM ('DEVELOPMENT', 'INJURY', 'RECOVERY', 'DEPTH_CHART', 'SIGNING', 'RELEASE');

-- CreateEnum
CREATE TYPE "public"."TeamFinanceEventType" AS ENUM ('SIGNING_BONUS', 'RELEASE_PAYOUT', 'SEASON_SALARY');

-- CreateEnum
CREATE TYPE "public"."InboxTaskStatus" AS ENUM ('OPEN', 'READ', 'DONE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "public"."InboxTaskPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "public"."DraftClassStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."DraftPlayerStatus" AS ENUM ('AVAILABLE', 'DRAFTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "public"."ScoutingLevel" AS ENUM ('NONE', 'BASIC', 'FOCUSED');

-- CreateEnum
CREATE TYPE "public"."DraftRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."LeagueDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "LeagueDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConferenceDefinition" (
    "id" TEXT NOT NULL,
    "leagueDefinitionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ConferenceDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DivisionDefinition" (
    "id" TEXT NOT NULL,
    "conferenceDefinitionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DivisionDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PositionGroupDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "public"."RosterUnit" NOT NULL,
    "side" "public"."SideOfBall" NOT NULL,

    CONSTRAINT "PositionGroupDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PositionDefinition" (
    "id" TEXT NOT NULL,
    "positionGroupDefinitionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "public"."RosterUnit" NOT NULL,
    "side" "public"."SideOfBall" NOT NULL,

    CONSTRAINT "PositionDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ArchetypeDefinition" (
    "id" TEXT NOT NULL,
    "positionGroupDefinitionId" TEXT NOT NULL,
    "positionDefinitionId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ArchetypeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SchemeFitDefinition" (
    "id" TEXT NOT NULL,
    "positionGroupDefinitionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SchemeFitDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttributeDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."AttributeCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "AttributeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FranchiseTemplate" (
    "id" TEXT NOT NULL,
    "leagueDefinitionId" TEXT NOT NULL,
    "conferenceDefinitionId" TEXT NOT NULL,
    "divisionDefinitionId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "marketSize" INTEGER NOT NULL,
    "prestige" INTEGER NOT NULL,
    "defaultBudget" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "FranchiseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SaveGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueDefinitionId" TEXT NOT NULL,
    "currentSeasonId" TEXT,
    "name" TEXT NOT NULL,
    "status" "public"."SaveGameStatus" NOT NULL DEFAULT 'ACTIVE',
    "weekState" "public"."WeekState" NOT NULL DEFAULT 'PRE_WEEK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaveGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SaveGameSetting" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "salaryCap" DECIMAL(14,2) NOT NULL,
    "activeRosterLimit" INTEGER NOT NULL,
    "practiceSquadSize" INTEGER NOT NULL,
    "seasonLengthWeeks" INTEGER NOT NULL,

    CONSTRAINT "SaveGameSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Season" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "phase" "public"."SeasonPhase" NOT NULL DEFAULT 'PRESEASON',
    "week" INTEGER NOT NULL DEFAULT 1,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Team" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "franchiseTemplateId" TEXT NOT NULL,
    "conferenceDefinitionId" TEXT NOT NULL,
    "divisionDefinitionId" TEXT NOT NULL,
    "offensiveSchemeFitDefinitionId" TEXT,
    "defensiveSchemeFitDefinitionId" TEXT,
    "specialTeamsSchemeFitDefinitionId" TEXT,
    "city" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "managerControlled" BOOLEAN NOT NULL DEFAULT false,
    "overallRating" INTEGER NOT NULL DEFAULT 60,
    "morale" INTEGER NOT NULL DEFAULT 50,
    "cashBalance" DECIMAL(14,2) NOT NULL,
    "salaryCapSpace" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DraftClass" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "seasonId" TEXT,
    "year" INTEGER NOT NULL,
    "status" "public"."DraftClassStatus" NOT NULL DEFAULT 'UPCOMING',
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DraftPlayer" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "draftClassId" TEXT NOT NULL,
    "positionDefinitionId" TEXT NOT NULL,
    "archetypeDefinitionId" TEXT,
    "schemeFitDefinitionId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "college" TEXT,
    "heightCm" INTEGER NOT NULL,
    "weightKg" INTEGER NOT NULL,
    "trueOverall" INTEGER NOT NULL,
    "truePotential" INTEGER NOT NULL,
    "projectedRound" INTEGER NOT NULL,
    "riskLevel" "public"."DraftRiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."DraftPlayerStatus" NOT NULL DEFAULT 'AVAILABLE',
    "draftedByTeamId" TEXT,
    "draftedRound" INTEGER,
    "draftedPickNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DraftPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScoutingData" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "draftClassId" TEXT NOT NULL,
    "draftPlayerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "level" "public"."ScoutingLevel" NOT NULL DEFAULT 'NONE',
    "visibleOverallMin" INTEGER,
    "visibleOverallMax" INTEGER,
    "visiblePotentialMin" INTEGER,
    "visiblePotentialMax" INTEGER,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoutingData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Player" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "birthDate" TIMESTAMP(3),
    "heightCm" INTEGER NOT NULL,
    "weightKg" INTEGER NOT NULL,
    "yearsPro" INTEGER NOT NULL,
    "college" TEXT,
    "nationality" TEXT,
    "dominantHand" "public"."DominantHand",
    "status" "public"."PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "injuryStatus" "public"."InjuryStatus" NOT NULL DEFAULT 'HEALTHY',
    "injuryName" TEXT,
    "injuryEndsOn" TIMESTAMP(3),
    "fatigue" INTEGER NOT NULL DEFAULT 10,
    "morale" INTEGER NOT NULL DEFAULT 50,
    "developmentTrait" "public"."DevelopmentTrait" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerRosterProfile" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT,
    "primaryPositionDefinitionId" TEXT NOT NULL,
    "secondaryPositionDefinitionId" TEXT,
    "positionGroupDefinitionId" TEXT NOT NULL,
    "archetypeDefinitionId" TEXT,
    "schemeFitDefinitionId" TEXT,
    "rosterStatus" "public"."RosterStatus" NOT NULL DEFAULT 'BACKUP',
    "depthChartSlot" INTEGER,
    "captainFlag" BOOLEAN NOT NULL DEFAULT false,
    "developmentFocus" BOOLEAN NOT NULL DEFAULT false,
    "injuryRisk" INTEGER NOT NULL DEFAULT 50,
    "practiceSquadEligible" BOOLEAN,

    CONSTRAINT "PlayerRosterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerEvaluation" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "potentialRating" INTEGER NOT NULL,
    "positionOverall" INTEGER NOT NULL,
    "offensiveOverall" INTEGER,
    "defensiveOverall" INTEGER,
    "specialTeamsOverall" INTEGER,
    "physicalOverall" INTEGER,
    "mentalOverall" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerAttributeRating" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "attributeDefinitionId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "PlayerAttributeRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contract" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "startSeasonId" TEXT,
    "status" "public"."ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "years" INTEGER NOT NULL,
    "yearlySalary" DECIMAL(12,2) NOT NULL,
    "signingBonus" DECIMAL(12,2) NOT NULL,
    "capHit" DECIMAL(12,2) NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Match" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "kind" "public"."MatchKind" NOT NULL DEFAULT 'REGULAR_SEASON',
    "status" "public"."MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "stadiumName" TEXT,
    "simulationSeed" TEXT,
    "simulationStartedAt" TIMESTAMP(3),
    "simulationCompletedAt" TIMESTAMP(3),
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MatchSimulationDrive" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "phaseLabel" TEXT NOT NULL,
    "offenseTeamId" TEXT NOT NULL,
    "offenseTeamAbbreviation" TEXT NOT NULL,
    "defenseTeamId" TEXT NOT NULL,
    "defenseTeamAbbreviation" TEXT NOT NULL,
    "startedHomeScore" INTEGER NOT NULL,
    "startedAwayScore" INTEGER NOT NULL,
    "endedHomeScore" INTEGER NOT NULL,
    "endedAwayScore" INTEGER NOT NULL,
    "plays" INTEGER NOT NULL,
    "passAttempts" INTEGER NOT NULL,
    "rushAttempts" INTEGER NOT NULL,
    "totalYards" INTEGER NOT NULL,
    "resultType" TEXT NOT NULL,
    "pointsScored" INTEGER NOT NULL DEFAULT 0,
    "turnover" BOOLEAN NOT NULL DEFAULT false,
    "redZoneTrip" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT NOT NULL,
    "primaryPlayerName" TEXT,
    "primaryDefenderName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchSimulationDrive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamSeasonStat" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" INTEGER NOT NULL DEFAULT 0,
    "pointsAgainst" INTEGER NOT NULL DEFAULT 0,
    "touchdownsFor" INTEGER NOT NULL DEFAULT 0,
    "touchdownsAgainst" INTEGER NOT NULL DEFAULT 0,
    "turnoversForced" INTEGER NOT NULL DEFAULT 0,
    "turnoversCommitted" INTEGER NOT NULL DEFAULT 0,
    "passingYards" INTEGER NOT NULL DEFAULT 0,
    "rushingYards" INTEGER NOT NULL DEFAULT 0,
    "sacks" INTEGER NOT NULL DEFAULT 0,
    "explosivePlays" INTEGER NOT NULL DEFAULT 0,
    "redZoneTrips" INTEGER NOT NULL DEFAULT 0,
    "redZoneTouchdowns" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeamSeasonStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerCareerStat" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesStarted" INTEGER NOT NULL DEFAULT 0,
    "snapsOffense" INTEGER NOT NULL DEFAULT 0,
    "snapsDefense" INTEGER NOT NULL DEFAULT 0,
    "snapsSpecialTeams" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerCareerStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerSeasonStat" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesStarted" INTEGER NOT NULL DEFAULT 0,
    "snapsOffense" INTEGER NOT NULL DEFAULT 0,
    "snapsDefense" INTEGER NOT NULL DEFAULT 0,
    "snapsSpecialTeams" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerSeasonStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerMatchStat" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "snapshotFullName" TEXT,
    "snapshotPositionCode" TEXT,
    "snapshotTeamAbbreviation" TEXT,
    "started" BOOLEAN NOT NULL DEFAULT false,
    "snapsOffense" INTEGER NOT NULL DEFAULT 0,
    "snapsDefense" INTEGER NOT NULL DEFAULT 0,
    "snapsSpecialTeams" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerMatchStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerCareerPassingStat" (
    "id" TEXT NOT NULL,
    "playerCareerStatId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "yards" INTEGER NOT NULL DEFAULT 0,
    "touchdowns" INTEGER NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "sacksTaken" INTEGER NOT NULL DEFAULT 0,
    "sackYardsLost" INTEGER NOT NULL DEFAULT 0,
    "longestCompletion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerCareerPassingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerCareerRushingStat" (
    "id" TEXT NOT NULL,
    "playerCareerStatId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "yards" INTEGER NOT NULL DEFAULT 0,
    "touchdowns" INTEGER NOT NULL DEFAULT 0,
    "fumbles" INTEGER NOT NULL DEFAULT 0,
    "longestRush" INTEGER NOT NULL DEFAULT 0,
    "brokenTackles" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerCareerRushingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerCareerReceivingStat" (
    "id" TEXT NOT NULL,
    "playerCareerStatId" TEXT NOT NULL,
    "targets" INTEGER NOT NULL DEFAULT 0,
    "receptions" INTEGER NOT NULL DEFAULT 0,
    "yards" INTEGER NOT NULL DEFAULT 0,
    "touchdowns" INTEGER NOT NULL DEFAULT 0,
    "drops" INTEGER NOT NULL DEFAULT 0,
    "longestReception" INTEGER NOT NULL DEFAULT 0,
    "yardsAfterCatch" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerCareerReceivingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerCareerBlockingStat" (
    "id" TEXT NOT NULL,
    "playerCareerStatId" TEXT NOT NULL,
    "passBlockSnaps" INTEGER NOT NULL DEFAULT 0,
    "runBlockSnaps" INTEGER NOT NULL DEFAULT 0,
    "sacksAllowed" INTEGER NOT NULL DEFAULT 0,
    "pressuresAllowed" INTEGER NOT NULL DEFAULT 0,
    "pancakes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerCareerBlockingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerCareerDefensiveStat" (
    "id" TEXT NOT NULL,
    "playerCareerStatId" TEXT NOT NULL,
    "tackles" INTEGER NOT NULL DEFAULT 0,
    "assistedTackles" INTEGER NOT NULL DEFAULT 0,
    "tacklesForLoss" INTEGER NOT NULL DEFAULT 0,
    "sacks" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "quarterbackHits" INTEGER NOT NULL DEFAULT 0,
    "passesDefended" INTEGER NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "forcedFumbles" INTEGER NOT NULL DEFAULT 0,
    "fumbleRecoveries" INTEGER NOT NULL DEFAULT 0,
    "defensiveTouchdowns" INTEGER NOT NULL DEFAULT 0,
    "coverageSnaps" INTEGER NOT NULL DEFAULT 0,
    "targetsAllowed" INTEGER NOT NULL DEFAULT 0,
    "receptionsAllowed" INTEGER NOT NULL DEFAULT 0,
    "yardsAllowed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerCareerDefensiveStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerCareerKickingStat" (
    "id" TEXT NOT NULL,
    "playerCareerStatId" TEXT NOT NULL,
    "fieldGoalsMade" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsAttempted" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsMadeShort" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsAttemptedShort" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsMadeMid" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsAttemptedMid" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsMadeLong" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsAttemptedLong" INTEGER NOT NULL DEFAULT 0,
    "extraPointsMade" INTEGER NOT NULL DEFAULT 0,
    "extraPointsAttempted" INTEGER NOT NULL DEFAULT 0,
    "longestFieldGoal" INTEGER NOT NULL DEFAULT 0,
    "kickoffTouchbacks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerCareerKickingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerCareerPuntingStat" (
    "id" TEXT NOT NULL,
    "playerCareerStatId" TEXT NOT NULL,
    "punts" INTEGER NOT NULL DEFAULT 0,
    "puntYards" INTEGER NOT NULL DEFAULT 0,
    "netPuntYards" INTEGER NOT NULL DEFAULT 0,
    "fairCatchesForced" INTEGER NOT NULL DEFAULT 0,
    "hangTimeTotalTenths" INTEGER NOT NULL DEFAULT 0,
    "puntsInside20" INTEGER NOT NULL DEFAULT 0,
    "touchbacks" INTEGER NOT NULL DEFAULT 0,
    "longestPunt" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerCareerPuntingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerCareerReturnStat" (
    "id" TEXT NOT NULL,
    "playerCareerStatId" TEXT NOT NULL,
    "kickReturns" INTEGER NOT NULL DEFAULT 0,
    "kickReturnYards" INTEGER NOT NULL DEFAULT 0,
    "kickReturnTouchdowns" INTEGER NOT NULL DEFAULT 0,
    "kickReturnFumbles" INTEGER NOT NULL DEFAULT 0,
    "puntReturns" INTEGER NOT NULL DEFAULT 0,
    "puntReturnYards" INTEGER NOT NULL DEFAULT 0,
    "puntReturnTouchdowns" INTEGER NOT NULL DEFAULT 0,
    "puntReturnFumbles" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerCareerReturnStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerSeasonPassingStat" (
    "id" TEXT NOT NULL,
    "playerSeasonStatId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "yards" INTEGER NOT NULL DEFAULT 0,
    "touchdowns" INTEGER NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "sacksTaken" INTEGER NOT NULL DEFAULT 0,
    "sackYardsLost" INTEGER NOT NULL DEFAULT 0,
    "longestCompletion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerSeasonPassingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerSeasonRushingStat" (
    "id" TEXT NOT NULL,
    "playerSeasonStatId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "yards" INTEGER NOT NULL DEFAULT 0,
    "touchdowns" INTEGER NOT NULL DEFAULT 0,
    "fumbles" INTEGER NOT NULL DEFAULT 0,
    "longestRush" INTEGER NOT NULL DEFAULT 0,
    "brokenTackles" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerSeasonRushingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerSeasonReceivingStat" (
    "id" TEXT NOT NULL,
    "playerSeasonStatId" TEXT NOT NULL,
    "targets" INTEGER NOT NULL DEFAULT 0,
    "receptions" INTEGER NOT NULL DEFAULT 0,
    "yards" INTEGER NOT NULL DEFAULT 0,
    "touchdowns" INTEGER NOT NULL DEFAULT 0,
    "drops" INTEGER NOT NULL DEFAULT 0,
    "longestReception" INTEGER NOT NULL DEFAULT 0,
    "yardsAfterCatch" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerSeasonReceivingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerSeasonBlockingStat" (
    "id" TEXT NOT NULL,
    "playerSeasonStatId" TEXT NOT NULL,
    "passBlockSnaps" INTEGER NOT NULL DEFAULT 0,
    "runBlockSnaps" INTEGER NOT NULL DEFAULT 0,
    "sacksAllowed" INTEGER NOT NULL DEFAULT 0,
    "pressuresAllowed" INTEGER NOT NULL DEFAULT 0,
    "pancakes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerSeasonBlockingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerSeasonDefensiveStat" (
    "id" TEXT NOT NULL,
    "playerSeasonStatId" TEXT NOT NULL,
    "tackles" INTEGER NOT NULL DEFAULT 0,
    "assistedTackles" INTEGER NOT NULL DEFAULT 0,
    "tacklesForLoss" INTEGER NOT NULL DEFAULT 0,
    "sacks" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "quarterbackHits" INTEGER NOT NULL DEFAULT 0,
    "passesDefended" INTEGER NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "forcedFumbles" INTEGER NOT NULL DEFAULT 0,
    "fumbleRecoveries" INTEGER NOT NULL DEFAULT 0,
    "defensiveTouchdowns" INTEGER NOT NULL DEFAULT 0,
    "coverageSnaps" INTEGER NOT NULL DEFAULT 0,
    "targetsAllowed" INTEGER NOT NULL DEFAULT 0,
    "receptionsAllowed" INTEGER NOT NULL DEFAULT 0,
    "yardsAllowed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerSeasonDefensiveStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerSeasonKickingStat" (
    "id" TEXT NOT NULL,
    "playerSeasonStatId" TEXT NOT NULL,
    "fieldGoalsMade" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsAttempted" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsMadeShort" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsAttemptedShort" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsMadeMid" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsAttemptedMid" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsMadeLong" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsAttemptedLong" INTEGER NOT NULL DEFAULT 0,
    "extraPointsMade" INTEGER NOT NULL DEFAULT 0,
    "extraPointsAttempted" INTEGER NOT NULL DEFAULT 0,
    "longestFieldGoal" INTEGER NOT NULL DEFAULT 0,
    "kickoffTouchbacks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerSeasonKickingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerSeasonPuntingStat" (
    "id" TEXT NOT NULL,
    "playerSeasonStatId" TEXT NOT NULL,
    "punts" INTEGER NOT NULL DEFAULT 0,
    "puntYards" INTEGER NOT NULL DEFAULT 0,
    "netPuntYards" INTEGER NOT NULL DEFAULT 0,
    "fairCatchesForced" INTEGER NOT NULL DEFAULT 0,
    "hangTimeTotalTenths" INTEGER NOT NULL DEFAULT 0,
    "puntsInside20" INTEGER NOT NULL DEFAULT 0,
    "touchbacks" INTEGER NOT NULL DEFAULT 0,
    "longestPunt" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerSeasonPuntingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerSeasonReturnStat" (
    "id" TEXT NOT NULL,
    "playerSeasonStatId" TEXT NOT NULL,
    "kickReturns" INTEGER NOT NULL DEFAULT 0,
    "kickReturnYards" INTEGER NOT NULL DEFAULT 0,
    "kickReturnTouchdowns" INTEGER NOT NULL DEFAULT 0,
    "kickReturnFumbles" INTEGER NOT NULL DEFAULT 0,
    "puntReturns" INTEGER NOT NULL DEFAULT 0,
    "puntReturnYards" INTEGER NOT NULL DEFAULT 0,
    "puntReturnTouchdowns" INTEGER NOT NULL DEFAULT 0,
    "puntReturnFumbles" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerSeasonReturnStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerMatchPassingStat" (
    "id" TEXT NOT NULL,
    "playerMatchStatId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "yards" INTEGER NOT NULL DEFAULT 0,
    "touchdowns" INTEGER NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "sacksTaken" INTEGER NOT NULL DEFAULT 0,
    "sackYardsLost" INTEGER NOT NULL DEFAULT 0,
    "longestCompletion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerMatchPassingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerMatchRushingStat" (
    "id" TEXT NOT NULL,
    "playerMatchStatId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "yards" INTEGER NOT NULL DEFAULT 0,
    "touchdowns" INTEGER NOT NULL DEFAULT 0,
    "fumbles" INTEGER NOT NULL DEFAULT 0,
    "longestRush" INTEGER NOT NULL DEFAULT 0,
    "brokenTackles" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerMatchRushingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerMatchReceivingStat" (
    "id" TEXT NOT NULL,
    "playerMatchStatId" TEXT NOT NULL,
    "targets" INTEGER NOT NULL DEFAULT 0,
    "receptions" INTEGER NOT NULL DEFAULT 0,
    "yards" INTEGER NOT NULL DEFAULT 0,
    "touchdowns" INTEGER NOT NULL DEFAULT 0,
    "drops" INTEGER NOT NULL DEFAULT 0,
    "longestReception" INTEGER NOT NULL DEFAULT 0,
    "yardsAfterCatch" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerMatchReceivingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerMatchBlockingStat" (
    "id" TEXT NOT NULL,
    "playerMatchStatId" TEXT NOT NULL,
    "passBlockSnaps" INTEGER NOT NULL DEFAULT 0,
    "runBlockSnaps" INTEGER NOT NULL DEFAULT 0,
    "sacksAllowed" INTEGER NOT NULL DEFAULT 0,
    "pressuresAllowed" INTEGER NOT NULL DEFAULT 0,
    "pancakes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerMatchBlockingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerMatchDefensiveStat" (
    "id" TEXT NOT NULL,
    "playerMatchStatId" TEXT NOT NULL,
    "tackles" INTEGER NOT NULL DEFAULT 0,
    "assistedTackles" INTEGER NOT NULL DEFAULT 0,
    "tacklesForLoss" INTEGER NOT NULL DEFAULT 0,
    "sacks" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "quarterbackHits" INTEGER NOT NULL DEFAULT 0,
    "passesDefended" INTEGER NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "forcedFumbles" INTEGER NOT NULL DEFAULT 0,
    "fumbleRecoveries" INTEGER NOT NULL DEFAULT 0,
    "defensiveTouchdowns" INTEGER NOT NULL DEFAULT 0,
    "coverageSnaps" INTEGER NOT NULL DEFAULT 0,
    "targetsAllowed" INTEGER NOT NULL DEFAULT 0,
    "receptionsAllowed" INTEGER NOT NULL DEFAULT 0,
    "yardsAllowed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerMatchDefensiveStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerMatchKickingStat" (
    "id" TEXT NOT NULL,
    "playerMatchStatId" TEXT NOT NULL,
    "fieldGoalsMade" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsAttempted" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsMadeShort" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsAttemptedShort" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsMadeMid" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsAttemptedMid" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsMadeLong" INTEGER NOT NULL DEFAULT 0,
    "fieldGoalsAttemptedLong" INTEGER NOT NULL DEFAULT 0,
    "extraPointsMade" INTEGER NOT NULL DEFAULT 0,
    "extraPointsAttempted" INTEGER NOT NULL DEFAULT 0,
    "longestFieldGoal" INTEGER NOT NULL DEFAULT 0,
    "kickoffTouchbacks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerMatchKickingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerMatchPuntingStat" (
    "id" TEXT NOT NULL,
    "playerMatchStatId" TEXT NOT NULL,
    "punts" INTEGER NOT NULL DEFAULT 0,
    "puntYards" INTEGER NOT NULL DEFAULT 0,
    "netPuntYards" INTEGER NOT NULL DEFAULT 0,
    "fairCatchesForced" INTEGER NOT NULL DEFAULT 0,
    "hangTimeTotalTenths" INTEGER NOT NULL DEFAULT 0,
    "puntsInside20" INTEGER NOT NULL DEFAULT 0,
    "touchbacks" INTEGER NOT NULL DEFAULT 0,
    "longestPunt" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerMatchPuntingStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerMatchReturnStat" (
    "id" TEXT NOT NULL,
    "playerMatchStatId" TEXT NOT NULL,
    "kickReturns" INTEGER NOT NULL DEFAULT 0,
    "kickReturnYards" INTEGER NOT NULL DEFAULT 0,
    "kickReturnTouchdowns" INTEGER NOT NULL DEFAULT 0,
    "kickReturnFumbles" INTEGER NOT NULL DEFAULT 0,
    "puntReturns" INTEGER NOT NULL DEFAULT 0,
    "puntReturnYards" INTEGER NOT NULL DEFAULT 0,
    "puntReturnTouchdowns" INTEGER NOT NULL DEFAULT 0,
    "puntReturnFumbles" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerMatchReturnStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamMatchStat" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "firstDowns" INTEGER NOT NULL DEFAULT 0,
    "totalYards" INTEGER NOT NULL DEFAULT 0,
    "turnovers" INTEGER NOT NULL DEFAULT 0,
    "penalties" INTEGER NOT NULL DEFAULT 0,
    "timeOfPossessionSeconds" INTEGER NOT NULL DEFAULT 0,
    "passingYards" INTEGER NOT NULL DEFAULT 0,
    "rushingYards" INTEGER NOT NULL DEFAULT 0,
    "sacks" INTEGER NOT NULL DEFAULT 0,
    "explosivePlays" INTEGER NOT NULL DEFAULT 0,
    "redZoneTrips" INTEGER NOT NULL DEFAULT 0,
    "redZoneTouchdowns" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeamMatchStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RosterTransaction" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "fromTeamId" TEXT,
    "toTeamId" TEXT,
    "type" "public"."RosterTransactionType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "RosterTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerHistoryEvent" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT,
    "teamId" TEXT,
    "type" "public"."PlayerHistoryEventType" NOT NULL,
    "week" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerHistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamFinanceEvent" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT,
    "seasonId" TEXT,
    "type" "public"."TeamFinanceEventType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "capImpact" DECIMAL(14,2) NOT NULL,
    "cashBalanceAfter" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamFinanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InboxTaskState" (
    "id" TEXT NOT NULL,
    "saveGameId" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "status" "public"."InboxTaskStatus" NOT NULL DEFAULT 'OPEN',
    "priorityOverride" "public"."InboxTaskPriority",
    "readAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxTaskState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueDefinition_code_key" ON "public"."LeagueDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ConferenceDefinition_leagueDefinitionId_code_key" ON "public"."ConferenceDefinition"("leagueDefinitionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "DivisionDefinition_conferenceDefinitionId_code_key" ON "public"."DivisionDefinition"("conferenceDefinitionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PositionGroupDefinition_code_key" ON "public"."PositionGroupDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PositionDefinition_code_key" ON "public"."PositionDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ArchetypeDefinition_code_key" ON "public"."ArchetypeDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SchemeFitDefinition_code_key" ON "public"."SchemeFitDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeDefinition_code_key" ON "public"."AttributeDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "FranchiseTemplate_abbreviation_key" ON "public"."FranchiseTemplate"("abbreviation");

-- CreateIndex
CREATE INDEX "SaveGame_userId_updatedAt_idx" ON "public"."SaveGame"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SaveGame_currentSeasonId_id_key" ON "public"."SaveGame"("currentSeasonId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "SaveGameSetting_saveGameId_key" ON "public"."SaveGameSetting"("saveGameId");

-- CreateIndex
CREATE INDEX "Season_saveGameId_year_idx" ON "public"."Season"("saveGameId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Season_saveGameId_year_key" ON "public"."Season"("saveGameId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Season_id_saveGameId_key" ON "public"."Season"("id", "saveGameId");

-- CreateIndex
CREATE INDEX "Team_saveGameId_conferenceDefinitionId_divisionDefinitionId_idx" ON "public"."Team"("saveGameId", "conferenceDefinitionId", "divisionDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_saveGameId_abbreviation_key" ON "public"."Team"("saveGameId", "abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "Team_id_saveGameId_key" ON "public"."Team"("id", "saveGameId");

-- CreateIndex
CREATE INDEX "DraftClass_saveGameId_status_idx" ON "public"."DraftClass"("saveGameId", "status");

-- CreateIndex
CREATE INDEX "DraftClass_seasonId_idx" ON "public"."DraftClass"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftClass_saveGameId_year_key" ON "public"."DraftClass"("saveGameId", "year");

-- CreateIndex
CREATE INDEX "DraftPlayer_saveGameId_draftClassId_status_idx" ON "public"."DraftPlayer"("saveGameId", "draftClassId", "status");

-- CreateIndex
CREATE INDEX "DraftPlayer_saveGameId_positionDefinitionId_idx" ON "public"."DraftPlayer"("saveGameId", "positionDefinitionId");

-- CreateIndex
CREATE INDEX "DraftPlayer_draftedByTeamId_saveGameId_idx" ON "public"."DraftPlayer"("draftedByTeamId", "saveGameId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPlayer_draftClassId_draftedPickNumber_key" ON "public"."DraftPlayer"("draftClassId", "draftedPickNumber");

-- CreateIndex
CREATE INDEX "ScoutingData_saveGameId_teamId_level_idx" ON "public"."ScoutingData"("saveGameId", "teamId", "level");

-- CreateIndex
CREATE INDEX "ScoutingData_draftClassId_teamId_idx" ON "public"."ScoutingData"("draftClassId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutingData_draftPlayerId_teamId_key" ON "public"."ScoutingData"("draftPlayerId", "teamId");

-- CreateIndex
CREATE INDEX "Player_saveGameId_status_idx" ON "public"."Player"("saveGameId", "status");

-- CreateIndex
CREATE INDEX "Player_saveGameId_lastName_firstName_idx" ON "public"."Player"("saveGameId", "lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Player_id_saveGameId_key" ON "public"."Player"("id", "saveGameId");

-- CreateIndex
CREATE INDEX "PlayerRosterProfile_saveGameId_teamId_positionGroupDefiniti_idx" ON "public"."PlayerRosterProfile"("saveGameId", "teamId", "positionGroupDefinitionId");

-- CreateIndex
CREATE INDEX "PlayerRosterProfile_saveGameId_primaryPositionDefinitionId__idx" ON "public"."PlayerRosterProfile"("saveGameId", "primaryPositionDefinitionId", "rosterStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRosterProfile_playerId_saveGameId_key" ON "public"."PlayerRosterProfile"("playerId", "saveGameId");

-- CreateIndex
CREATE INDEX "PlayerEvaluation_saveGameId_positionOverall_idx" ON "public"."PlayerEvaluation"("saveGameId", "positionOverall");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerEvaluation_playerId_saveGameId_key" ON "public"."PlayerEvaluation"("playerId", "saveGameId");

-- CreateIndex
CREATE INDEX "PlayerAttributeRating_saveGameId_attributeDefinitionId_idx" ON "public"."PlayerAttributeRating"("saveGameId", "attributeDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAttributeRating_playerId_attributeDefinitionId_saveGa_key" ON "public"."PlayerAttributeRating"("playerId", "attributeDefinitionId", "saveGameId");

-- CreateIndex
CREATE INDEX "Contract_saveGameId_teamId_status_idx" ON "public"."Contract"("saveGameId", "teamId", "status");

-- CreateIndex
CREATE INDEX "Contract_playerId_status_idx" ON "public"."Contract"("playerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_id_saveGameId_key" ON "public"."Contract"("id", "saveGameId");

-- CreateIndex
CREATE INDEX "Match_saveGameId_seasonId_week_idx" ON "public"."Match"("saveGameId", "seasonId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "Match_seasonId_week_homeTeamId_awayTeamId_key" ON "public"."Match"("seasonId", "week", "homeTeamId", "awayTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_id_saveGameId_key" ON "public"."Match"("id", "saveGameId");

-- CreateIndex
CREATE INDEX "MatchSimulationDrive_saveGameId_matchId_sequence_idx" ON "public"."MatchSimulationDrive"("saveGameId", "matchId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSimulationDrive_matchId_sequence_key" ON "public"."MatchSimulationDrive"("matchId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "TeamSeasonStat_seasonId_teamId_key" ON "public"."TeamSeasonStat"("seasonId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCareerStat_playerId_saveGameId_key" ON "public"."PlayerCareerStat"("playerId", "saveGameId");

-- CreateIndex
CREATE INDEX "PlayerSeasonStat_saveGameId_teamId_seasonId_idx" ON "public"."PlayerSeasonStat"("saveGameId", "teamId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeasonStat_seasonId_playerId_teamId_key" ON "public"."PlayerSeasonStat"("seasonId", "playerId", "teamId");

-- CreateIndex
CREATE INDEX "PlayerMatchStat_saveGameId_matchId_teamId_idx" ON "public"."PlayerMatchStat"("saveGameId", "matchId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchStat_matchId_playerId_key" ON "public"."PlayerMatchStat"("matchId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCareerPassingStat_playerCareerStatId_key" ON "public"."PlayerCareerPassingStat"("playerCareerStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCareerRushingStat_playerCareerStatId_key" ON "public"."PlayerCareerRushingStat"("playerCareerStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCareerReceivingStat_playerCareerStatId_key" ON "public"."PlayerCareerReceivingStat"("playerCareerStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCareerBlockingStat_playerCareerStatId_key" ON "public"."PlayerCareerBlockingStat"("playerCareerStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCareerDefensiveStat_playerCareerStatId_key" ON "public"."PlayerCareerDefensiveStat"("playerCareerStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCareerKickingStat_playerCareerStatId_key" ON "public"."PlayerCareerKickingStat"("playerCareerStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCareerPuntingStat_playerCareerStatId_key" ON "public"."PlayerCareerPuntingStat"("playerCareerStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCareerReturnStat_playerCareerStatId_key" ON "public"."PlayerCareerReturnStat"("playerCareerStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeasonPassingStat_playerSeasonStatId_key" ON "public"."PlayerSeasonPassingStat"("playerSeasonStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeasonRushingStat_playerSeasonStatId_key" ON "public"."PlayerSeasonRushingStat"("playerSeasonStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeasonReceivingStat_playerSeasonStatId_key" ON "public"."PlayerSeasonReceivingStat"("playerSeasonStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeasonBlockingStat_playerSeasonStatId_key" ON "public"."PlayerSeasonBlockingStat"("playerSeasonStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeasonDefensiveStat_playerSeasonStatId_key" ON "public"."PlayerSeasonDefensiveStat"("playerSeasonStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeasonKickingStat_playerSeasonStatId_key" ON "public"."PlayerSeasonKickingStat"("playerSeasonStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeasonPuntingStat_playerSeasonStatId_key" ON "public"."PlayerSeasonPuntingStat"("playerSeasonStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeasonReturnStat_playerSeasonStatId_key" ON "public"."PlayerSeasonReturnStat"("playerSeasonStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchPassingStat_playerMatchStatId_key" ON "public"."PlayerMatchPassingStat"("playerMatchStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchRushingStat_playerMatchStatId_key" ON "public"."PlayerMatchRushingStat"("playerMatchStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchReceivingStat_playerMatchStatId_key" ON "public"."PlayerMatchReceivingStat"("playerMatchStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchBlockingStat_playerMatchStatId_key" ON "public"."PlayerMatchBlockingStat"("playerMatchStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchDefensiveStat_playerMatchStatId_key" ON "public"."PlayerMatchDefensiveStat"("playerMatchStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchKickingStat_playerMatchStatId_key" ON "public"."PlayerMatchKickingStat"("playerMatchStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchPuntingStat_playerMatchStatId_key" ON "public"."PlayerMatchPuntingStat"("playerMatchStatId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerMatchReturnStat_playerMatchStatId_key" ON "public"."PlayerMatchReturnStat"("playerMatchStatId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMatchStat_matchId_teamId_key" ON "public"."TeamMatchStat"("matchId", "teamId");

-- CreateIndex
CREATE INDEX "RosterTransaction_saveGameId_occurredAt_idx" ON "public"."RosterTransaction"("saveGameId", "occurredAt");

-- CreateIndex
CREATE INDEX "PlayerHistoryEvent_saveGameId_playerId_occurredAt_idx" ON "public"."PlayerHistoryEvent"("saveGameId", "playerId", "occurredAt");

-- CreateIndex
CREATE INDEX "PlayerHistoryEvent_saveGameId_teamId_occurredAt_idx" ON "public"."PlayerHistoryEvent"("saveGameId", "teamId", "occurredAt");

-- CreateIndex
CREATE INDEX "TeamFinanceEvent_saveGameId_teamId_occurredAt_idx" ON "public"."TeamFinanceEvent"("saveGameId", "teamId", "occurredAt");

-- CreateIndex
CREATE INDEX "InboxTaskState_saveGameId_status_updatedAt_idx" ON "public"."InboxTaskState"("saveGameId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InboxTaskState_saveGameId_taskKey_key" ON "public"."InboxTaskState"("saveGameId", "taskKey");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConferenceDefinition" ADD CONSTRAINT "ConferenceDefinition_leagueDefinitionId_fkey" FOREIGN KEY ("leagueDefinitionId") REFERENCES "public"."LeagueDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DivisionDefinition" ADD CONSTRAINT "DivisionDefinition_conferenceDefinitionId_fkey" FOREIGN KEY ("conferenceDefinitionId") REFERENCES "public"."ConferenceDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PositionDefinition" ADD CONSTRAINT "PositionDefinition_positionGroupDefinitionId_fkey" FOREIGN KEY ("positionGroupDefinitionId") REFERENCES "public"."PositionGroupDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArchetypeDefinition" ADD CONSTRAINT "ArchetypeDefinition_positionGroupDefinitionId_fkey" FOREIGN KEY ("positionGroupDefinitionId") REFERENCES "public"."PositionGroupDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArchetypeDefinition" ADD CONSTRAINT "ArchetypeDefinition_positionDefinitionId_fkey" FOREIGN KEY ("positionDefinitionId") REFERENCES "public"."PositionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SchemeFitDefinition" ADD CONSTRAINT "SchemeFitDefinition_positionGroupDefinitionId_fkey" FOREIGN KEY ("positionGroupDefinitionId") REFERENCES "public"."PositionGroupDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FranchiseTemplate" ADD CONSTRAINT "FranchiseTemplate_leagueDefinitionId_fkey" FOREIGN KEY ("leagueDefinitionId") REFERENCES "public"."LeagueDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FranchiseTemplate" ADD CONSTRAINT "FranchiseTemplate_conferenceDefinitionId_fkey" FOREIGN KEY ("conferenceDefinitionId") REFERENCES "public"."ConferenceDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FranchiseTemplate" ADD CONSTRAINT "FranchiseTemplate_divisionDefinitionId_fkey" FOREIGN KEY ("divisionDefinitionId") REFERENCES "public"."DivisionDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaveGame" ADD CONSTRAINT "SaveGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaveGame" ADD CONSTRAINT "SaveGame_leagueDefinitionId_fkey" FOREIGN KEY ("leagueDefinitionId") REFERENCES "public"."LeagueDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaveGame" ADD CONSTRAINT "SaveGame_currentSeasonId_id_fkey" FOREIGN KEY ("currentSeasonId", "id") REFERENCES "public"."Season"("id", "saveGameId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaveGameSetting" ADD CONSTRAINT "SaveGameSetting_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Season" ADD CONSTRAINT "Season_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_franchiseTemplateId_fkey" FOREIGN KEY ("franchiseTemplateId") REFERENCES "public"."FranchiseTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_conferenceDefinitionId_fkey" FOREIGN KEY ("conferenceDefinitionId") REFERENCES "public"."ConferenceDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_divisionDefinitionId_fkey" FOREIGN KEY ("divisionDefinitionId") REFERENCES "public"."DivisionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_offensiveSchemeFitDefinitionId_fkey" FOREIGN KEY ("offensiveSchemeFitDefinitionId") REFERENCES "public"."SchemeFitDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_defensiveSchemeFitDefinitionId_fkey" FOREIGN KEY ("defensiveSchemeFitDefinitionId") REFERENCES "public"."SchemeFitDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_specialTeamsSchemeFitDefinitionId_fkey" FOREIGN KEY ("specialTeamsSchemeFitDefinitionId") REFERENCES "public"."SchemeFitDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DraftClass" ADD CONSTRAINT "DraftClass_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DraftClass" ADD CONSTRAINT "DraftClass_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "public"."Season"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DraftPlayer" ADD CONSTRAINT "DraftPlayer_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DraftPlayer" ADD CONSTRAINT "DraftPlayer_draftClassId_fkey" FOREIGN KEY ("draftClassId") REFERENCES "public"."DraftClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DraftPlayer" ADD CONSTRAINT "DraftPlayer_positionDefinitionId_fkey" FOREIGN KEY ("positionDefinitionId") REFERENCES "public"."PositionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DraftPlayer" ADD CONSTRAINT "DraftPlayer_archetypeDefinitionId_fkey" FOREIGN KEY ("archetypeDefinitionId") REFERENCES "public"."ArchetypeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DraftPlayer" ADD CONSTRAINT "DraftPlayer_schemeFitDefinitionId_fkey" FOREIGN KEY ("schemeFitDefinitionId") REFERENCES "public"."SchemeFitDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DraftPlayer" ADD CONSTRAINT "DraftPlayer_draftedByTeamId_saveGameId_fkey" FOREIGN KEY ("draftedByTeamId", "saveGameId") REFERENCES "public"."Team"("id", "saveGameId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScoutingData" ADD CONSTRAINT "ScoutingData_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScoutingData" ADD CONSTRAINT "ScoutingData_draftClassId_fkey" FOREIGN KEY ("draftClassId") REFERENCES "public"."DraftClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScoutingData" ADD CONSTRAINT "ScoutingData_draftPlayerId_fkey" FOREIGN KEY ("draftPlayerId") REFERENCES "public"."DraftPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScoutingData" ADD CONSTRAINT "ScoutingData_teamId_saveGameId_fkey" FOREIGN KEY ("teamId", "saveGameId") REFERENCES "public"."Team"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Player" ADD CONSTRAINT "Player_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerRosterProfile" ADD CONSTRAINT "PlayerRosterProfile_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerRosterProfile" ADD CONSTRAINT "PlayerRosterProfile_playerId_saveGameId_fkey" FOREIGN KEY ("playerId", "saveGameId") REFERENCES "public"."Player"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerRosterProfile" ADD CONSTRAINT "PlayerRosterProfile_teamId_saveGameId_fkey" FOREIGN KEY ("teamId", "saveGameId") REFERENCES "public"."Team"("id", "saveGameId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerRosterProfile" ADD CONSTRAINT "PlayerRosterProfile_primaryPositionDefinitionId_fkey" FOREIGN KEY ("primaryPositionDefinitionId") REFERENCES "public"."PositionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerRosterProfile" ADD CONSTRAINT "PlayerRosterProfile_secondaryPositionDefinitionId_fkey" FOREIGN KEY ("secondaryPositionDefinitionId") REFERENCES "public"."PositionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerRosterProfile" ADD CONSTRAINT "PlayerRosterProfile_positionGroupDefinitionId_fkey" FOREIGN KEY ("positionGroupDefinitionId") REFERENCES "public"."PositionGroupDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerRosterProfile" ADD CONSTRAINT "PlayerRosterProfile_archetypeDefinitionId_fkey" FOREIGN KEY ("archetypeDefinitionId") REFERENCES "public"."ArchetypeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerRosterProfile" ADD CONSTRAINT "PlayerRosterProfile_schemeFitDefinitionId_fkey" FOREIGN KEY ("schemeFitDefinitionId") REFERENCES "public"."SchemeFitDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerEvaluation" ADD CONSTRAINT "PlayerEvaluation_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerEvaluation" ADD CONSTRAINT "PlayerEvaluation_playerId_saveGameId_fkey" FOREIGN KEY ("playerId", "saveGameId") REFERENCES "public"."Player"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerAttributeRating" ADD CONSTRAINT "PlayerAttributeRating_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerAttributeRating" ADD CONSTRAINT "PlayerAttributeRating_playerId_saveGameId_fkey" FOREIGN KEY ("playerId", "saveGameId") REFERENCES "public"."Player"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerAttributeRating" ADD CONSTRAINT "PlayerAttributeRating_attributeDefinitionId_fkey" FOREIGN KEY ("attributeDefinitionId") REFERENCES "public"."AttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_playerId_saveGameId_fkey" FOREIGN KEY ("playerId", "saveGameId") REFERENCES "public"."Player"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_teamId_saveGameId_fkey" FOREIGN KEY ("teamId", "saveGameId") REFERENCES "public"."Team"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contract" ADD CONSTRAINT "Contract_startSeasonId_saveGameId_fkey" FOREIGN KEY ("startSeasonId", "saveGameId") REFERENCES "public"."Season"("id", "saveGameId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_seasonId_saveGameId_fkey" FOREIGN KEY ("seasonId", "saveGameId") REFERENCES "public"."Season"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_homeTeamId_saveGameId_fkey" FOREIGN KEY ("homeTeamId", "saveGameId") REFERENCES "public"."Team"("id", "saveGameId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_awayTeamId_saveGameId_fkey" FOREIGN KEY ("awayTeamId", "saveGameId") REFERENCES "public"."Team"("id", "saveGameId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchSimulationDrive" ADD CONSTRAINT "MatchSimulationDrive_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchSimulationDrive" ADD CONSTRAINT "MatchSimulationDrive_matchId_saveGameId_fkey" FOREIGN KEY ("matchId", "saveGameId") REFERENCES "public"."Match"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamSeasonStat" ADD CONSTRAINT "TeamSeasonStat_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamSeasonStat" ADD CONSTRAINT "TeamSeasonStat_seasonId_saveGameId_fkey" FOREIGN KEY ("seasonId", "saveGameId") REFERENCES "public"."Season"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamSeasonStat" ADD CONSTRAINT "TeamSeasonStat_teamId_saveGameId_fkey" FOREIGN KEY ("teamId", "saveGameId") REFERENCES "public"."Team"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerCareerStat" ADD CONSTRAINT "PlayerCareerStat_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerCareerStat" ADD CONSTRAINT "PlayerCareerStat_playerId_saveGameId_fkey" FOREIGN KEY ("playerId", "saveGameId") REFERENCES "public"."Player"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerSeasonStat" ADD CONSTRAINT "PlayerSeasonStat_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerSeasonStat" ADD CONSTRAINT "PlayerSeasonStat_seasonId_saveGameId_fkey" FOREIGN KEY ("seasonId", "saveGameId") REFERENCES "public"."Season"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerSeasonStat" ADD CONSTRAINT "PlayerSeasonStat_playerId_saveGameId_fkey" FOREIGN KEY ("playerId", "saveGameId") REFERENCES "public"."Player"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerSeasonStat" ADD CONSTRAINT "PlayerSeasonStat_teamId_saveGameId_fkey" FOREIGN KEY ("teamId", "saveGameId") REFERENCES "public"."Team"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerMatchStat" ADD CONSTRAINT "PlayerMatchStat_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerMatchStat" ADD CONSTRAINT "PlayerMatchStat_matchId_saveGameId_fkey" FOREIGN KEY ("matchId", "saveGameId") REFERENCES "public"."Match"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerMatchStat" ADD CONSTRAINT "PlayerMatchStat_playerId_saveGameId_fkey" FOREIGN KEY ("playerId", "saveGameId") REFERENCES "public"."Player"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerMatchStat" ADD CONSTRAINT "PlayerMatchStat_teamId_saveGameId_fkey" FOREIGN KEY ("teamId", "saveGameId") REFERENCES "public"."Team"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerCareerPassingStat" ADD CONSTRAINT "PlayerCareerPassingStat_playerCareerStatId_fkey" FOREIGN KEY ("playerCareerStatId") REFERENCES "public"."PlayerCareerStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerCareerRushingStat" ADD CONSTRAINT "PlayerCareerRushingStat_playerCareerStatId_fkey" FOREIGN KEY ("playerCareerStatId") REFERENCES "public"."PlayerCareerStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerCareerReceivingStat" ADD CONSTRAINT "PlayerCareerReceivingStat_playerCareerStatId_fkey" FOREIGN KEY ("playerCareerStatId") REFERENCES "public"."PlayerCareerStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerCareerBlockingStat" ADD CONSTRAINT "PlayerCareerBlockingStat_playerCareerStatId_fkey" FOREIGN KEY ("playerCareerStatId") REFERENCES "public"."PlayerCareerStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerCareerDefensiveStat" ADD CONSTRAINT "PlayerCareerDefensiveStat_playerCareerStatId_fkey" FOREIGN KEY ("playerCareerStatId") REFERENCES "public"."PlayerCareerStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerCareerKickingStat" ADD CONSTRAINT "PlayerCareerKickingStat_playerCareerStatId_fkey" FOREIGN KEY ("playerCareerStatId") REFERENCES "public"."PlayerCareerStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerCareerPuntingStat" ADD CONSTRAINT "PlayerCareerPuntingStat_playerCareerStatId_fkey" FOREIGN KEY ("playerCareerStatId") REFERENCES "public"."PlayerCareerStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerCareerReturnStat" ADD CONSTRAINT "PlayerCareerReturnStat_playerCareerStatId_fkey" FOREIGN KEY ("playerCareerStatId") REFERENCES "public"."PlayerCareerStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerSeasonPassingStat" ADD CONSTRAINT "PlayerSeasonPassingStat_playerSeasonStatId_fkey" FOREIGN KEY ("playerSeasonStatId") REFERENCES "public"."PlayerSeasonStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerSeasonRushingStat" ADD CONSTRAINT "PlayerSeasonRushingStat_playerSeasonStatId_fkey" FOREIGN KEY ("playerSeasonStatId") REFERENCES "public"."PlayerSeasonStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerSeasonReceivingStat" ADD CONSTRAINT "PlayerSeasonReceivingStat_playerSeasonStatId_fkey" FOREIGN KEY ("playerSeasonStatId") REFERENCES "public"."PlayerSeasonStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerSeasonBlockingStat" ADD CONSTRAINT "PlayerSeasonBlockingStat_playerSeasonStatId_fkey" FOREIGN KEY ("playerSeasonStatId") REFERENCES "public"."PlayerSeasonStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerSeasonDefensiveStat" ADD CONSTRAINT "PlayerSeasonDefensiveStat_playerSeasonStatId_fkey" FOREIGN KEY ("playerSeasonStatId") REFERENCES "public"."PlayerSeasonStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerSeasonKickingStat" ADD CONSTRAINT "PlayerSeasonKickingStat_playerSeasonStatId_fkey" FOREIGN KEY ("playerSeasonStatId") REFERENCES "public"."PlayerSeasonStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerSeasonPuntingStat" ADD CONSTRAINT "PlayerSeasonPuntingStat_playerSeasonStatId_fkey" FOREIGN KEY ("playerSeasonStatId") REFERENCES "public"."PlayerSeasonStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerSeasonReturnStat" ADD CONSTRAINT "PlayerSeasonReturnStat_playerSeasonStatId_fkey" FOREIGN KEY ("playerSeasonStatId") REFERENCES "public"."PlayerSeasonStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerMatchPassingStat" ADD CONSTRAINT "PlayerMatchPassingStat_playerMatchStatId_fkey" FOREIGN KEY ("playerMatchStatId") REFERENCES "public"."PlayerMatchStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerMatchRushingStat" ADD CONSTRAINT "PlayerMatchRushingStat_playerMatchStatId_fkey" FOREIGN KEY ("playerMatchStatId") REFERENCES "public"."PlayerMatchStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerMatchReceivingStat" ADD CONSTRAINT "PlayerMatchReceivingStat_playerMatchStatId_fkey" FOREIGN KEY ("playerMatchStatId") REFERENCES "public"."PlayerMatchStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerMatchBlockingStat" ADD CONSTRAINT "PlayerMatchBlockingStat_playerMatchStatId_fkey" FOREIGN KEY ("playerMatchStatId") REFERENCES "public"."PlayerMatchStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerMatchDefensiveStat" ADD CONSTRAINT "PlayerMatchDefensiveStat_playerMatchStatId_fkey" FOREIGN KEY ("playerMatchStatId") REFERENCES "public"."PlayerMatchStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerMatchKickingStat" ADD CONSTRAINT "PlayerMatchKickingStat_playerMatchStatId_fkey" FOREIGN KEY ("playerMatchStatId") REFERENCES "public"."PlayerMatchStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerMatchPuntingStat" ADD CONSTRAINT "PlayerMatchPuntingStat_playerMatchStatId_fkey" FOREIGN KEY ("playerMatchStatId") REFERENCES "public"."PlayerMatchStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerMatchReturnStat" ADD CONSTRAINT "PlayerMatchReturnStat_playerMatchStatId_fkey" FOREIGN KEY ("playerMatchStatId") REFERENCES "public"."PlayerMatchStat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMatchStat" ADD CONSTRAINT "TeamMatchStat_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMatchStat" ADD CONSTRAINT "TeamMatchStat_matchId_saveGameId_fkey" FOREIGN KEY ("matchId", "saveGameId") REFERENCES "public"."Match"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMatchStat" ADD CONSTRAINT "TeamMatchStat_teamId_saveGameId_fkey" FOREIGN KEY ("teamId", "saveGameId") REFERENCES "public"."Team"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RosterTransaction" ADD CONSTRAINT "RosterTransaction_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RosterTransaction" ADD CONSTRAINT "RosterTransaction_playerId_saveGameId_fkey" FOREIGN KEY ("playerId", "saveGameId") REFERENCES "public"."Player"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RosterTransaction" ADD CONSTRAINT "RosterTransaction_fromTeamId_saveGameId_fkey" FOREIGN KEY ("fromTeamId", "saveGameId") REFERENCES "public"."Team"("id", "saveGameId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RosterTransaction" ADD CONSTRAINT "RosterTransaction_toTeamId_saveGameId_fkey" FOREIGN KEY ("toTeamId", "saveGameId") REFERENCES "public"."Team"("id", "saveGameId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerHistoryEvent" ADD CONSTRAINT "PlayerHistoryEvent_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerHistoryEvent" ADD CONSTRAINT "PlayerHistoryEvent_playerId_saveGameId_fkey" FOREIGN KEY ("playerId", "saveGameId") REFERENCES "public"."Player"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerHistoryEvent" ADD CONSTRAINT "PlayerHistoryEvent_seasonId_saveGameId_fkey" FOREIGN KEY ("seasonId", "saveGameId") REFERENCES "public"."Season"("id", "saveGameId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerHistoryEvent" ADD CONSTRAINT "PlayerHistoryEvent_teamId_saveGameId_fkey" FOREIGN KEY ("teamId", "saveGameId") REFERENCES "public"."Team"("id", "saveGameId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamFinanceEvent" ADD CONSTRAINT "TeamFinanceEvent_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamFinanceEvent" ADD CONSTRAINT "TeamFinanceEvent_teamId_saveGameId_fkey" FOREIGN KEY ("teamId", "saveGameId") REFERENCES "public"."Team"("id", "saveGameId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamFinanceEvent" ADD CONSTRAINT "TeamFinanceEvent_playerId_saveGameId_fkey" FOREIGN KEY ("playerId", "saveGameId") REFERENCES "public"."Player"("id", "saveGameId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamFinanceEvent" ADD CONSTRAINT "TeamFinanceEvent_seasonId_saveGameId_fkey" FOREIGN KEY ("seasonId", "saveGameId") REFERENCES "public"."Season"("id", "saveGameId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboxTaskState" ADD CONSTRAINT "InboxTaskState_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "public"."SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
