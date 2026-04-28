import {
  POSITION_STARTER_SLOTS,
  buildPlayerEvaluationSnapshot,
} from "../../../players/domain/player-evaluation";
import {
  DevelopmentTrait,
  DominantHand,
  RosterStatus,
} from "../../../shared/domain/enums";

const GENERAL_ATTRIBUTE_CODES = [
  "SPEED",
  "ACCELERATION",
  "AGILITY",
  "STRENGTH",
  "AWARENESS",
  "TOUGHNESS",
  "DURABILITY",
  "DISCIPLINE",
  "INTELLIGENCE",
  "LEADERSHIP",
] as const;

const ATTRIBUTE_CODES = [
  ...GENERAL_ATTRIBUTE_CODES,
  "THROW_POWER",
  "THROW_ACCURACY_SHORT",
  "THROW_ACCURACY_MEDIUM",
  "THROW_ACCURACY_DEEP",
  "POCKET_PRESENCE",
  "DECISION_MAKING",
  "PLAY_ACTION",
  "SCRAMBLING",
  "MOBILITY",
  "VISION",
  "BALL_SECURITY",
  "ELUSIVENESS",
  "BREAK_TACKLE",
  "ROUTE_RUNNING",
  "PASS_PROTECTION",
  "SHORT_YARDAGE_POWER",
  "CATCHING",
  "HANDS",
  "RELEASE",
  "SEPARATION",
  "CONTESTED_CATCH",
  "JUMPING",
  "RUN_AFTER_CATCH",
  "BLOCKING",
  "PASS_BLOCK",
  "RUN_BLOCK",
  "HAND_TECHNIQUE",
  "FOOTWORK",
  "ANCHOR",
  "TACKLING",
  "PURSUIT",
  "BLOCK_SHEDDING",
  "PASS_RUSH",
  "POWER_MOVES",
  "FINESSE_MOVES",
  "PLAY_RECOGNITION",
  "HIT_POWER",
  "MAN_COVERAGE",
  "ZONE_COVERAGE",
  "PRESS",
  "BALL_SKILLS",
  "LB_MAN_COVERAGE",
  "LB_ZONE_COVERAGE",
  "COVERAGE_RANGE",
  "LB_COVERAGE",
  "KICK_POWER",
  "KICK_ACCURACY",
  "PUNT_POWER",
  "PUNT_ACCURACY",
  "KICKOFF_POWER",
  "KICK_CONSISTENCY",
  "PUNT_HANG_TIME",
  "RETURN_VISION",
  "SNAP_ACCURACY",
  "SNAP_VELOCITY",
] as const;

type AttributeCode = (typeof ATTRIBUTE_CODES)[number];
type PositionGroupCode = "OFFENSE" | "DEFENSE" | "SPECIAL_TEAMS";

type AttributeMap = Partial<Record<AttributeCode, number>>;

type PositionBlueprint = {
  primaryPositionCode: string;
  positionGroupCode: PositionGroupCode;
  count: number;
  ageBase: number;
  heightCm: number;
  weightKg: number;
  yearsProBase: number;
  contractYears: number;
  yearlySalary: number;
  signingBonus: number;
  overallBase: number;
  potentialBase: number;
  generalAttributes: AttributeMap;
  specificAttributes: AttributeMap;
};

export type InitialRosterPlayerSeed = {
  primaryPositionCode: string;
  secondaryPositionCode?: string;
  positionGroupCode: PositionGroupCode;
  archetypeCode: string;
  schemeFitCode: string;
  firstName: string;
  lastName: string;
  age: number;
  birthDate: Date;
  heightCm: number;
  weightKg: number;
  yearsPro: number;
  college?: string;
  nationality?: string;
  dominantHand?: DominantHand;
  fatigue: number;
  morale: number;
  developmentTrait: DevelopmentTrait;
  rosterStatus: RosterStatus;
  depthChartSlot: number;
  captainFlag: boolean;
  injuryRisk: number;
  practiceSquadEligible: boolean;
  positionOverall: number;
  potentialRating: number;
  offensiveOverall?: number;
  defensiveOverall?: number;
  specialTeamsOverall?: number;
  physicalOverall: number;
  mentalOverall: number;
  yearlySalary: number;
  signingBonus: number;
  years: number;
  attributes: Partial<Record<AttributeCode, number>>;
};

const FIRST_NAMES = [
  "Evan",
  "Marcus",
  "Julian",
  "Troy",
  "Malik",
  "Grant",
  "Carter",
  "Noah",
  "Isaiah",
  "Devin",
  "Liam",
  "Dorian",
  "Caleb",
  "Jordan",
  "Tre",
  "Micah",
  "Nathan",
  "Jalen",
  "Brock",
  "Xavier",
  "Roman",
  "Bryce",
  "Avery",
  "Andre",
  "Corey",
];

const LAST_NAMES = [
  "Carter",
  "Reed",
  "Bennett",
  "Mason",
  "Parker",
  "Hayes",
  "Ward",
  "Coleman",
  "Foster",
  "Hayward",
  "Mercer",
  "Sullivan",
  "Powell",
  "Daniels",
  "Turner",
  "Brooks",
  "Ross",
  "Holland",
  "Stone",
  "Bishop",
  "Knight",
  "Ellis",
  "Vaughn",
  "Harper",
  "Logan",
];

const COLLEGES = [
  "Alabama",
  "Georgia",
  "Ohio State",
  "Michigan",
  "Notre Dame",
  "LSU",
  "Florida State",
  "Oregon",
  "Texas",
  "USC",
  "Penn State",
  "Wisconsin",
];

const NATIONALITIES = [
  "USA",
  "Canada",
  "Australia",
  "Germany",
  "United Kingdom",
];

const POSITION_BLUEPRINTS: PositionBlueprint[] = [
  {
    primaryPositionCode: "QB",
    positionGroupCode: "OFFENSE",
    count: 3,
    ageBase: 25,
    heightCm: 193,
    weightKg: 103,
    yearsProBase: 4,
    contractYears: 4,
    yearlySalary: 18000000,
    signingBonus: 4000000,
    overallBase: 79,
    potentialBase: 88,
    generalAttributes: {
      SPEED: 72,
      ACCELERATION: 70,
      AGILITY: 74,
      STRENGTH: 62,
      AWARENESS: 84,
      TOUGHNESS: 75,
      DURABILITY: 78,
      DISCIPLINE: 82,
      INTELLIGENCE: 88,
      LEADERSHIP: 86,
    },
    specificAttributes: {
      THROW_POWER: 86,
      THROW_ACCURACY_SHORT: 84,
      THROW_ACCURACY_MEDIUM: 82,
      THROW_ACCURACY_DEEP: 80,
      POCKET_PRESENCE: 82,
      DECISION_MAKING: 84,
      PLAY_ACTION: 78,
      SCRAMBLING: 72,
      MOBILITY: 75,
    },
  },
  {
    primaryPositionCode: "RB",
    positionGroupCode: "OFFENSE",
    count: 4,
    ageBase: 24,
    heightCm: 181,
    weightKg: 98,
    yearsProBase: 3,
    contractYears: 3,
    yearlySalary: 7200000,
    signingBonus: 1200000,
    overallBase: 75,
    potentialBase: 84,
    generalAttributes: {
      SPEED: 84,
      ACCELERATION: 86,
      AGILITY: 85,
      STRENGTH: 72,
      AWARENESS: 74,
      TOUGHNESS: 76,
      DURABILITY: 75,
      DISCIPLINE: 72,
      INTELLIGENCE: 71,
      LEADERSHIP: 68,
    },
    specificAttributes: {
      VISION: 83,
      BALL_SECURITY: 79,
      ELUSIVENESS: 84,
      BREAK_TACKLE: 80,
      ROUTE_RUNNING: 67,
      PASS_PROTECTION: 64,
      SHORT_YARDAGE_POWER: 78,
      HANDS: 72,
      RETURN_VISION: 76,
    },
  },
  {
    primaryPositionCode: "FB",
    positionGroupCode: "OFFENSE",
    count: 1,
    ageBase: 26,
    heightCm: 185,
    weightKg: 112,
    yearsProBase: 4,
    contractYears: 2,
    yearlySalary: 1800000,
    signingBonus: 250000,
    overallBase: 69,
    potentialBase: 73,
    generalAttributes: {
      SPEED: 68,
      ACCELERATION: 69,
      AGILITY: 64,
      STRENGTH: 78,
      AWARENESS: 73,
      TOUGHNESS: 84,
      DURABILITY: 82,
      DISCIPLINE: 77,
      INTELLIGENCE: 72,
      LEADERSHIP: 71,
    },
    specificAttributes: {
      VISION: 72,
      BALL_SECURITY: 82,
      ELUSIVENESS: 60,
      BREAK_TACKLE: 74,
      ROUTE_RUNNING: 58,
      PASS_PROTECTION: 76,
      SHORT_YARDAGE_POWER: 84,
      HANDS: 66,
    },
  },
  {
    primaryPositionCode: "WR",
    positionGroupCode: "OFFENSE",
    count: 5,
    ageBase: 24,
    heightCm: 187,
    weightKg: 90,
    yearsProBase: 3,
    contractYears: 4,
    yearlySalary: 8500000,
    signingBonus: 1500000,
    overallBase: 74,
    potentialBase: 84,
    generalAttributes: {
      SPEED: 85,
      ACCELERATION: 86,
      AGILITY: 84,
      STRENGTH: 65,
      AWARENESS: 72,
      TOUGHNESS: 69,
      DURABILITY: 70,
      DISCIPLINE: 71,
      INTELLIGENCE: 70,
      LEADERSHIP: 66,
    },
    specificAttributes: {
      CATCHING: 79,
      HANDS: 81,
      ROUTE_RUNNING: 80,
      RELEASE: 81,
      SEPARATION: 82,
      CONTESTED_CATCH: 72,
      JUMPING: 78,
      RUN_AFTER_CATCH: 80,
      BLOCKING: 60,
      RETURN_VISION: 79,
    },
  },
  {
    primaryPositionCode: "TE",
    positionGroupCode: "OFFENSE",
    count: 3,
    ageBase: 25,
    heightCm: 196,
    weightKg: 116,
    yearsProBase: 3,
    contractYears: 3,
    yearlySalary: 6300000,
    signingBonus: 900000,
    overallBase: 73,
    potentialBase: 80,
    generalAttributes: {
      SPEED: 76,
      ACCELERATION: 75,
      AGILITY: 73,
      STRENGTH: 79,
      AWARENESS: 74,
      TOUGHNESS: 81,
      DURABILITY: 80,
      DISCIPLINE: 74,
      INTELLIGENCE: 73,
      LEADERSHIP: 70,
    },
    specificAttributes: {
      CATCHING: 77,
      HANDS: 79,
      ROUTE_RUNNING: 74,
      RELEASE: 71,
      SEPARATION: 70,
      CONTESTED_CATCH: 78,
      JUMPING: 76,
      RUN_AFTER_CATCH: 70,
      BLOCKING: 75,
    },
  },
  {
    primaryPositionCode: "LT",
    positionGroupCode: "OFFENSE",
    count: 2,
    ageBase: 27,
    heightCm: 199,
    weightKg: 142,
    yearsProBase: 5,
    contractYears: 4,
    yearlySalary: 11000000,
    signingBonus: 2000000,
    overallBase: 77,
    potentialBase: 82,
    generalAttributes: {
      SPEED: 60,
      ACCELERATION: 61,
      AGILITY: 62,
      STRENGTH: 84,
      AWARENESS: 76,
      TOUGHNESS: 83,
      DURABILITY: 82,
      DISCIPLINE: 77,
      INTELLIGENCE: 74,
      LEADERSHIP: 71,
    },
    specificAttributes: {
      PASS_BLOCK: 81,
      RUN_BLOCK: 77,
      HAND_TECHNIQUE: 79,
      FOOTWORK: 78,
      ANCHOR: 82,
    },
  },
  {
    primaryPositionCode: "LG",
    positionGroupCode: "OFFENSE",
    count: 2,
    ageBase: 27,
    heightCm: 193,
    weightKg: 141,
    yearsProBase: 4,
    contractYears: 3,
    yearlySalary: 4800000,
    signingBonus: 750000,
    overallBase: 72,
    potentialBase: 77,
    generalAttributes: {
      SPEED: 58,
      ACCELERATION: 60,
      AGILITY: 61,
      STRENGTH: 83,
      AWARENESS: 75,
      TOUGHNESS: 82,
      DURABILITY: 81,
      DISCIPLINE: 76,
      INTELLIGENCE: 73,
      LEADERSHIP: 70,
    },
    specificAttributes: {
      PASS_BLOCK: 74,
      RUN_BLOCK: 79,
      HAND_TECHNIQUE: 75,
      FOOTWORK: 72,
      ANCHOR: 78,
    },
  },
  {
    primaryPositionCode: "C",
    positionGroupCode: "OFFENSE",
    count: 2,
    ageBase: 28,
    heightCm: 191,
    weightKg: 139,
    yearsProBase: 5,
    contractYears: 3,
    yearlySalary: 5000000,
    signingBonus: 800000,
    overallBase: 72,
    potentialBase: 77,
    generalAttributes: {
      SPEED: 57,
      ACCELERATION: 59,
      AGILITY: 60,
      STRENGTH: 82,
      AWARENESS: 80,
      TOUGHNESS: 82,
      DURABILITY: 81,
      DISCIPLINE: 79,
      INTELLIGENCE: 78,
      LEADERSHIP: 75,
    },
    specificAttributes: {
      PASS_BLOCK: 75,
      RUN_BLOCK: 77,
      HAND_TECHNIQUE: 78,
      FOOTWORK: 72,
      ANCHOR: 77,
    },
  },
  {
    primaryPositionCode: "RG",
    positionGroupCode: "OFFENSE",
    count: 2,
    ageBase: 27,
    heightCm: 193,
    weightKg: 141,
    yearsProBase: 4,
    contractYears: 3,
    yearlySalary: 4800000,
    signingBonus: 750000,
    overallBase: 72,
    potentialBase: 77,
    generalAttributes: {
      SPEED: 58,
      ACCELERATION: 60,
      AGILITY: 61,
      STRENGTH: 83,
      AWARENESS: 75,
      TOUGHNESS: 82,
      DURABILITY: 81,
      DISCIPLINE: 76,
      INTELLIGENCE: 73,
      LEADERSHIP: 70,
    },
    specificAttributes: {
      PASS_BLOCK: 74,
      RUN_BLOCK: 79,
      HAND_TECHNIQUE: 75,
      FOOTWORK: 72,
      ANCHOR: 78,
    },
  },
  {
    primaryPositionCode: "RT",
    positionGroupCode: "OFFENSE",
    count: 2,
    ageBase: 27,
    heightCm: 198,
    weightKg: 144,
    yearsProBase: 5,
    contractYears: 4,
    yearlySalary: 10500000,
    signingBonus: 1900000,
    overallBase: 76,
    potentialBase: 81,
    generalAttributes: {
      SPEED: 60,
      ACCELERATION: 61,
      AGILITY: 62,
      STRENGTH: 85,
      AWARENESS: 76,
      TOUGHNESS: 83,
      DURABILITY: 82,
      DISCIPLINE: 77,
      INTELLIGENCE: 74,
      LEADERSHIP: 71,
    },
    specificAttributes: {
      PASS_BLOCK: 79,
      RUN_BLOCK: 78,
      HAND_TECHNIQUE: 78,
      FOOTWORK: 76,
      ANCHOR: 81,
    },
  },
  {
    primaryPositionCode: "LE",
    positionGroupCode: "DEFENSE",
    count: 2,
    ageBase: 25,
    heightCm: 194,
    weightKg: 123,
    yearsProBase: 4,
    contractYears: 4,
    yearlySalary: 9800000,
    signingBonus: 1700000,
    overallBase: 76,
    potentialBase: 84,
    generalAttributes: {
      SPEED: 75,
      ACCELERATION: 76,
      AGILITY: 72,
      STRENGTH: 82,
      AWARENESS: 75,
      TOUGHNESS: 83,
      DURABILITY: 80,
      DISCIPLINE: 74,
      INTELLIGENCE: 72,
      LEADERSHIP: 70,
    },
    specificAttributes: {
      TACKLING: 77,
      PURSUIT: 78,
      BLOCK_SHEDDING: 80,
      PASS_RUSH: 81,
      POWER_MOVES: 82,
      FINESSE_MOVES: 72,
      PLAY_RECOGNITION: 75,
      HIT_POWER: 80,
    },
  },
  {
    primaryPositionCode: "RE",
    positionGroupCode: "DEFENSE",
    count: 2,
    ageBase: 25,
    heightCm: 193,
    weightKg: 120,
    yearsProBase: 4,
    contractYears: 4,
    yearlySalary: 10800000,
    signingBonus: 1900000,
    overallBase: 77,
    potentialBase: 85,
    generalAttributes: {
      SPEED: 78,
      ACCELERATION: 80,
      AGILITY: 75,
      STRENGTH: 79,
      AWARENESS: 74,
      TOUGHNESS: 81,
      DURABILITY: 78,
      DISCIPLINE: 73,
      INTELLIGENCE: 71,
      LEADERSHIP: 69,
    },
    specificAttributes: {
      TACKLING: 75,
      PURSUIT: 80,
      BLOCK_SHEDDING: 77,
      PASS_RUSH: 83,
      POWER_MOVES: 76,
      FINESSE_MOVES: 82,
      PLAY_RECOGNITION: 74,
      HIT_POWER: 77,
    },
  },
  {
    primaryPositionCode: "DT",
    positionGroupCode: "DEFENSE",
    count: 4,
    ageBase: 27,
    heightCm: 192,
    weightKg: 144,
    yearsProBase: 4,
    contractYears: 3,
    yearlySalary: 6000000,
    signingBonus: 900000,
    overallBase: 73,
    potentialBase: 79,
    generalAttributes: {
      SPEED: 68,
      ACCELERATION: 70,
      AGILITY: 66,
      STRENGTH: 86,
      AWARENESS: 74,
      TOUGHNESS: 85,
      DURABILITY: 82,
      DISCIPLINE: 74,
      INTELLIGENCE: 70,
      LEADERSHIP: 68,
    },
    specificAttributes: {
      TACKLING: 78,
      PURSUIT: 72,
      BLOCK_SHEDDING: 82,
      PASS_RUSH: 76,
      POWER_MOVES: 84,
      FINESSE_MOVES: 68,
      PLAY_RECOGNITION: 74,
      HIT_POWER: 82,
    },
  },
  {
    primaryPositionCode: "LOLB",
    positionGroupCode: "DEFENSE",
    count: 2,
    ageBase: 25,
    heightCm: 190,
    weightKg: 111,
    yearsProBase: 3,
    contractYears: 3,
    yearlySalary: 5400000,
    signingBonus: 850000,
    overallBase: 73,
    potentialBase: 80,
    generalAttributes: {
      SPEED: 79,
      ACCELERATION: 80,
      AGILITY: 78,
      STRENGTH: 75,
      AWARENESS: 73,
      TOUGHNESS: 76,
      DURABILITY: 76,
      DISCIPLINE: 72,
      INTELLIGENCE: 72,
      LEADERSHIP: 69,
    },
    specificAttributes: {
      TACKLING: 76,
      PURSUIT: 80,
      BLOCK_SHEDDING: 75,
      PASS_RUSH: 77,
      POWER_MOVES: 74,
      FINESSE_MOVES: 76,
      PLAY_RECOGNITION: 74,
      HIT_POWER: 77,
      LB_MAN_COVERAGE: 69,
      LB_ZONE_COVERAGE: 76,
      COVERAGE_RANGE: 74,
      LB_COVERAGE: 74,
    },
  },
  {
    primaryPositionCode: "MLB",
    positionGroupCode: "DEFENSE",
    count: 2,
    ageBase: 26,
    heightCm: 188,
    weightKg: 113,
    yearsProBase: 4,
    contractYears: 3,
    yearlySalary: 7400000,
    signingBonus: 1100000,
    overallBase: 75,
    potentialBase: 81,
    generalAttributes: {
      SPEED: 74,
      ACCELERATION: 74,
      AGILITY: 72,
      STRENGTH: 78,
      AWARENESS: 81,
      TOUGHNESS: 82,
      DURABILITY: 80,
      DISCIPLINE: 78,
      INTELLIGENCE: 79,
      LEADERSHIP: 80,
    },
    specificAttributes: {
      TACKLING: 82,
      PURSUIT: 80,
      BLOCK_SHEDDING: 78,
      PASS_RUSH: 70,
      POWER_MOVES: 72,
      FINESSE_MOVES: 68,
      PLAY_RECOGNITION: 83,
      HIT_POWER: 81,
      LB_MAN_COVERAGE: 72,
      LB_ZONE_COVERAGE: 79,
      COVERAGE_RANGE: 77,
      LB_COVERAGE: 76,
    },
  },
  {
    primaryPositionCode: "ROLB",
    positionGroupCode: "DEFENSE",
    count: 2,
    ageBase: 25,
    heightCm: 190,
    weightKg: 111,
    yearsProBase: 3,
    contractYears: 3,
    yearlySalary: 5400000,
    signingBonus: 850000,
    overallBase: 73,
    potentialBase: 80,
    generalAttributes: {
      SPEED: 79,
      ACCELERATION: 80,
      AGILITY: 78,
      STRENGTH: 75,
      AWARENESS: 73,
      TOUGHNESS: 76,
      DURABILITY: 76,
      DISCIPLINE: 72,
      INTELLIGENCE: 72,
      LEADERSHIP: 69,
    },
    specificAttributes: {
      TACKLING: 76,
      PURSUIT: 80,
      BLOCK_SHEDDING: 75,
      PASS_RUSH: 77,
      POWER_MOVES: 74,
      FINESSE_MOVES: 76,
      PLAY_RECOGNITION: 74,
      HIT_POWER: 77,
      LB_MAN_COVERAGE: 69,
      LB_ZONE_COVERAGE: 76,
      COVERAGE_RANGE: 74,
      LB_COVERAGE: 74,
    },
  },
  {
    primaryPositionCode: "CB",
    positionGroupCode: "DEFENSE",
    count: 5,
    ageBase: 25,
    heightCm: 182,
    weightKg: 88,
    yearsProBase: 3,
    contractYears: 4,
    yearlySalary: 7600000,
    signingBonus: 1250000,
    overallBase: 74,
    potentialBase: 82,
    generalAttributes: {
      SPEED: 85,
      ACCELERATION: 86,
      AGILITY: 84,
      STRENGTH: 65,
      AWARENESS: 74,
      TOUGHNESS: 67,
      DURABILITY: 70,
      DISCIPLINE: 72,
      INTELLIGENCE: 72,
      LEADERSHIP: 66,
    },
    specificAttributes: {
      MAN_COVERAGE: 82,
      ZONE_COVERAGE: 78,
      PRESS: 80,
      BALL_SKILLS: 79,
      HANDS: 71,
      COVERAGE_RANGE: 81,
      TACKLING: 67,
      PURSUIT: 74,
      PLAY_RECOGNITION: 76,
      RETURN_VISION: 71,
    },
  },
  {
    primaryPositionCode: "FS",
    positionGroupCode: "DEFENSE",
    count: 2,
    ageBase: 26,
    heightCm: 185,
    weightKg: 92,
    yearsProBase: 4,
    contractYears: 3,
    yearlySalary: 5200000,
    signingBonus: 800000,
    overallBase: 72,
    potentialBase: 78,
    generalAttributes: {
      SPEED: 82,
      ACCELERATION: 82,
      AGILITY: 80,
      STRENGTH: 68,
      AWARENESS: 78,
      TOUGHNESS: 72,
      DURABILITY: 74,
      DISCIPLINE: 75,
      INTELLIGENCE: 78,
      LEADERSHIP: 73,
    },
    specificAttributes: {
      MAN_COVERAGE: 74,
      ZONE_COVERAGE: 82,
      PRESS: 68,
      BALL_SKILLS: 80,
      HANDS: 74,
      COVERAGE_RANGE: 84,
      TACKLING: 75,
      PURSUIT: 79,
      PLAY_RECOGNITION: 82,
      RETURN_VISION: 68,
    },
  },
  {
    primaryPositionCode: "SS",
    positionGroupCode: "DEFENSE",
    count: 2,
    ageBase: 26,
    heightCm: 186,
    weightKg: 96,
    yearsProBase: 4,
    contractYears: 3,
    yearlySalary: 5200000,
    signingBonus: 800000,
    overallBase: 72,
    potentialBase: 78,
    generalAttributes: {
      SPEED: 78,
      ACCELERATION: 78,
      AGILITY: 76,
      STRENGTH: 76,
      AWARENESS: 77,
      TOUGHNESS: 80,
      DURABILITY: 78,
      DISCIPLINE: 75,
      INTELLIGENCE: 76,
      LEADERSHIP: 74,
    },
    specificAttributes: {
      MAN_COVERAGE: 72,
      ZONE_COVERAGE: 77,
      PRESS: 74,
      BALL_SKILLS: 75,
      HANDS: 70,
      COVERAGE_RANGE: 76,
      TACKLING: 80,
      PURSUIT: 78,
      PLAY_RECOGNITION: 79,
      RETURN_VISION: 66,
    },
  },
  {
    primaryPositionCode: "K",
    positionGroupCode: "SPECIAL_TEAMS",
    count: 2,
    ageBase: 28,
    heightCm: 185,
    weightKg: 92,
    yearsProBase: 5,
    contractYears: 2,
    yearlySalary: 2400000,
    signingBonus: 300000,
    overallBase: 70,
    potentialBase: 74,
    generalAttributes: {
      SPEED: 50,
      ACCELERATION: 52,
      AGILITY: 55,
      STRENGTH: 66,
      AWARENESS: 72,
      TOUGHNESS: 68,
      DURABILITY: 77,
      DISCIPLINE: 82,
      INTELLIGENCE: 74,
      LEADERSHIP: 68,
    },
    specificAttributes: {
      KICK_POWER: 81,
      KICK_ACCURACY: 83,
      PUNT_POWER: 30,
      PUNT_ACCURACY: 25,
      KICKOFF_POWER: 80,
      KICK_CONSISTENCY: 82,
    },
  },
  {
    primaryPositionCode: "P",
    positionGroupCode: "SPECIAL_TEAMS",
    count: 1,
    ageBase: 29,
    heightCm: 188,
    weightKg: 96,
    yearsProBase: 6,
    contractYears: 2,
    yearlySalary: 2200000,
    signingBonus: 250000,
    overallBase: 69,
    potentialBase: 73,
    generalAttributes: {
      SPEED: 51,
      ACCELERATION: 53,
      AGILITY: 56,
      STRENGTH: 67,
      AWARENESS: 71,
      TOUGHNESS: 67,
      DURABILITY: 76,
      DISCIPLINE: 80,
      INTELLIGENCE: 72,
      LEADERSHIP: 67,
    },
    specificAttributes: {
      KICK_POWER: 25,
      KICK_ACCURACY: 20,
      PUNT_POWER: 82,
      PUNT_ACCURACY: 81,
      KICKOFF_POWER: 48,
      KICK_CONSISTENCY: 79,
      PUNT_HANG_TIME: 80,
    },
  },
  {
    primaryPositionCode: "LS",
    positionGroupCode: "SPECIAL_TEAMS",
    count: 1,
    ageBase: 29,
    heightCm: 191,
    weightKg: 111,
    yearsProBase: 6,
    contractYears: 2,
    yearlySalary: 1200000,
    signingBonus: 100000,
    overallBase: 67,
    potentialBase: 70,
    generalAttributes: {
      SPEED: 56,
      ACCELERATION: 57,
      AGILITY: 58,
      STRENGTH: 74,
      AWARENESS: 80,
      TOUGHNESS: 78,
      DURABILITY: 82,
      DISCIPLINE: 84,
      INTELLIGENCE: 76,
      LEADERSHIP: 72,
    },
    specificAttributes: {
      PASS_BLOCK: 70,
      RUN_BLOCK: 70,
      HAND_TECHNIQUE: 76,
      FOOTWORK: 72,
      ANCHOR: 74,
      BLOCKING: 79,
      SNAP_ACCURACY: 84,
      SNAP_VELOCITY: 82,
    },
  },
];

function pickFromSeed(values: string[], seed: number) {
  return values[seed % values.length];
}

function clampRating(value: number, min = 35, max = 99) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function resolveStarterStatus(positionCode: string, depthIndex: number) {
  const starterThreshold = POSITION_STARTER_SLOTS[positionCode] ?? 1;

  if (depthIndex < starterThreshold) {
    return RosterStatus.STARTER;
  }

  if (depthIndex < starterThreshold + 1) {
    return RosterStatus.ROTATION;
  }

  return RosterStatus.BACKUP;
}

function resolveCaptainFlag(positionCode: string, depthIndex: number) {
  return (
    depthIndex === 0 &&
    (positionCode === "QB" ||
      positionCode === "MLB" ||
      positionCode === "C" ||
      positionCode === "SS")
  );
}

function resolveSecondaryPositionCode(positionCode: string, depthIndex: number) {
  if (positionCode === "RB" && depthIndex === 0) {
    return "KR";
  }

  if (positionCode === "WR" && depthIndex === 0) {
    return "KR";
  }

  if (positionCode === "WR" && depthIndex === 1) {
    return "PR";
  }

  if (positionCode === "CB" && depthIndex === 1) {
    return "KR";
  }

  if (positionCode === "CB" && depthIndex === 2) {
    return "PR";
  }

  return undefined;
}

function resolveSchemeFitCode(positionCode: string, seed: number) {
  const options: Record<string, string[]> = {
    QB: ["WEST_COAST", "AIR_RAID", "SPREAD_ATTACK"],
    RB: ["POWER_RUN", "BALANCED_OFFENSE"],
    FB: ["POWER_RUN", "BALANCED_OFFENSE"],
    WR: ["SPREAD_ATTACK", "AIR_RAID", "WEST_COAST"],
    TE: ["BALANCED_OFFENSE", "POWER_RUN", "WEST_COAST"],
    LT: ["POWER_RUN", "BALANCED_OFFENSE"],
    LG: ["POWER_RUN", "BALANCED_OFFENSE"],
    C: ["BALANCED_OFFENSE", "POWER_RUN"],
    RG: ["POWER_RUN", "BALANCED_OFFENSE"],
    RT: ["POWER_RUN", "BALANCED_OFFENSE"],
    LE: ["FOUR_THREE_FRONT", "PRESS_MAN"],
    RE: ["FOUR_THREE_FRONT", "NICKEL_SPEED"],
    DT: ["FOUR_THREE_FRONT", "THREE_FOUR_FRONT"],
    LOLB: ["THREE_FOUR_FRONT", "NICKEL_SPEED"],
    MLB: ["THREE_FOUR_FRONT", "ZONE_DISCIPLINE"],
    ROLB: ["THREE_FOUR_FRONT", "NICKEL_SPEED"],
    CB: ["PRESS_MAN", "ZONE_DISCIPLINE"],
    FS: ["ZONE_DISCIPLINE", "NICKEL_SPEED"],
    SS: ["ZONE_DISCIPLINE", "PRESS_MAN"],
    K: ["POWER_LEG", "FIELD_POSITION"],
    P: ["FIELD_POSITION", "POWER_LEG"],
    LS: ["FIELD_POSITION"],
  };

  const candidates = options[positionCode] ?? ["BALANCED_OFFENSE"];
  return candidates[seed % candidates.length];
}

function resolveArchetypeCode(positionCode: string, seed: number) {
  const options: Record<string, string[]> = {
    QB: ["QB_FIELD_GENERAL", "QB_POCKET_PASSER", "QB_SCRAMBLER"],
    RB: ["RB_POWER_BACK", "RB_ELUSIVE_BACK"],
    FB: ["FB_LEAD_BLOCKER"],
    WR: ["WR_ROUTE_TECHNICIAN", "WR_DEEP_THREAT"],
    TE: ["TE_BALANCED", "TE_IN_LINE_BLOCKER"],
    LT: ["OL_PASS_PROTECTOR", "OL_ROAD_GRADER"],
    LG: ["OL_ROAD_GRADER", "OL_PASS_PROTECTOR"],
    C: ["OL_PASS_PROTECTOR", "OL_ROAD_GRADER"],
    RG: ["OL_ROAD_GRADER", "OL_PASS_PROTECTOR"],
    RT: ["OL_PASS_PROTECTOR", "OL_ROAD_GRADER"],
    LE: ["EDGE_POWER_END", "DT_RUN_STUFFER"],
    RE: ["EDGE_SPEED_RUSHER", "EDGE_POWER_END"],
    DT: ["DT_RUN_STUFFER", "DT_PENETRATOR"],
    LOLB: ["LB_COVER_SPECIALIST", "LB_ENFORCER"],
    MLB: ["LB_FIELD_GENERAL", "LB_ENFORCER"],
    ROLB: ["LB_COVER_SPECIALIST", "LB_ENFORCER"],
    CB: ["CB_MAN_SPECIALIST", "CB_BALL_HAWK"],
    FS: ["FS_CENTER_FIELDER"],
    SS: ["SS_BOX_ENFORCER"],
    K: ["K_ACCURACY_SPECIALIST", "K_POWER_LEG"],
    P: ["P_FIELD_FLIPPER"],
    LS: ["LS_CORE_SPECIALIST"],
  };

  const candidates = options[positionCode] ?? ["QB_FIELD_GENERAL"];
  return candidates[seed % candidates.length];
}

function resolveDominantHand(positionCode: string, seed: number) {
  if (positionCode === "K" || positionCode === "P") {
    return seed % 7 === 0 ? DominantHand.LEFT : DominantHand.RIGHT;
  }

  if (positionCode === "QB") {
    return seed % 9 === 0 ? DominantHand.LEFT : DominantHand.RIGHT;
  }

  return seed % 17 === 0 ? DominantHand.LEFT : DominantHand.RIGHT;
}

function resolveDevelopmentTrait(positionOverall: number, potentialRating: number) {
  const delta = potentialRating - positionOverall;

  if (delta >= 12) {
    return DevelopmentTrait.ELITE;
  }

  if (delta >= 8) {
    return DevelopmentTrait.STAR;
  }

  if (delta >= 5) {
    return DevelopmentTrait.IMPACT;
  }

  return DevelopmentTrait.NORMAL;
}

function buildBirthDate(seasonYear: number, age: number, seed: number) {
  const month = seed % 12;
  const day = (seed % 27) + 1;
  return new Date(Date.UTC(seasonYear - age, month, day));
}

function applyVariance(base: number, seed: number, depthIndex: number, prestigeBoost: number) {
  const variance = (seed % 7) - 3;
  return clampRating(base + prestigeBoost - depthIndex + variance);
}

export function buildInitialRoster(
  teamIndex: number,
  prestige: number,
  seasonYear: number,
) {
  const prestigeBoost = Math.round(prestige - 80);
  const roster: InitialRosterPlayerSeed[] = [];
  let slotIndex = 0;

  for (const blueprint of POSITION_BLUEPRINTS) {
    for (let depthIndex = 0; depthIndex < blueprint.count; depthIndex += 1) {
      const seed = teamIndex * 97 + slotIndex * 13 + depthIndex * 5;
      const age = Math.max(21, blueprint.ageBase + (seed % 4));
      const yearsPro = Math.max(
        0,
        Math.min(age - 21, blueprint.yearsProBase + ((seed % 3) - 1)),
      );
      const secondaryPositionCode = resolveSecondaryPositionCode(
        blueprint.primaryPositionCode,
        depthIndex,
      );

      const attributes: Partial<Record<AttributeCode, number>> = {};

      for (const code of ATTRIBUTE_CODES) {
        const value = blueprint.generalAttributes[code] ?? blueprint.specificAttributes[code];

        if (value == null) {
          continue;
        }

        attributes[code] = applyVariance(
          value,
          seed + value,
          Math.floor(depthIndex / 2),
          prestigeBoost,
        );
      }

      if (secondaryPositionCode === "KR" || secondaryPositionCode === "PR") {
        attributes.BALL_SECURITY = clampRating((attributes.BALL_SECURITY ?? 68) + 4);
        attributes.ELUSIVENESS = clampRating((attributes.ELUSIVENESS ?? 68) + 5);
        attributes.HANDS = clampRating((attributes.HANDS ?? attributes.CATCHING ?? 67) + 5);
        attributes.RUN_AFTER_CATCH = clampRating((attributes.RUN_AFTER_CATCH ?? 66) + 4);
        attributes.RETURN_VISION = clampRating((attributes.RETURN_VISION ?? attributes.VISION ?? 68) + 6);
      }

      const evaluation = buildPlayerEvaluationSnapshot(
        blueprint.primaryPositionCode,
        blueprint.positionGroupCode,
        secondaryPositionCode ?? null,
        attributes,
      );
      let potentialRating = clampRating(
        Math.max(
          evaluation.positionOverall + 1,
          blueprint.potentialBase + prestigeBoost - Math.floor(depthIndex / 2) + (seed % 4),
        ),
        evaluation.positionOverall + 1,
        97,
      );
      const durability = attributes.DURABILITY ?? 70;
      const isDecisionPosition = [
        "QB",
        "RB",
        "WR",
        "LT",
        "MLB",
        "CB",
        "K",
      ].includes(blueprint.primaryPositionCode);
      const fatigue =
        isDecisionPosition && depthIndex === 0
          ? 58 + (seed % 18)
          : isDecisionPosition && depthIndex === 1
            ? 6 + (seed % 12)
            : 8 + (seed % 15);

      if (isDecisionPosition && depthIndex === 2) {
        potentialRating = clampRating(Math.max(potentialRating, evaluation.positionOverall + 12), evaluation.positionOverall + 1, 97);
      }
      const developmentTrait = resolveDevelopmentTrait(
        evaluation.positionOverall,
        potentialRating,
      );

      roster.push({
        primaryPositionCode: blueprint.primaryPositionCode,
        secondaryPositionCode,
        positionGroupCode: blueprint.positionGroupCode,
        archetypeCode: resolveArchetypeCode(blueprint.primaryPositionCode, seed),
        schemeFitCode:
          secondaryPositionCode === "KR" || secondaryPositionCode === "PR"
            ? "RETURN_SPARK"
            : resolveSchemeFitCode(blueprint.primaryPositionCode, seed),
        firstName: pickFromSeed(FIRST_NAMES, seed),
        lastName: pickFromSeed(LAST_NAMES, seed * 3),
        age,
        birthDate: buildBirthDate(seasonYear, age, seed),
        heightCm: blueprint.heightCm + ((seed % 3) - 1),
        weightKg: blueprint.weightKg + ((seed % 5) - 2),
        yearsPro,
        college: seed % 5 === 0 ? undefined : pickFromSeed(COLLEGES, seed * 7),
        nationality:
          seed % 6 === 0 ? pickFromSeed(NATIONALITIES, seed * 11) : undefined,
        dominantHand: resolveDominantHand(blueprint.primaryPositionCode, seed),
        fatigue,
        morale: 56 + (seed % 23),
        developmentTrait,
        rosterStatus: resolveStarterStatus(blueprint.primaryPositionCode, depthIndex),
        depthChartSlot: depthIndex + 1,
        captainFlag: resolveCaptainFlag(blueprint.primaryPositionCode, depthIndex),
        injuryRisk: clampRating(100 - durability + 18 + (seed % 9), 18, 92),
        practiceSquadEligible: yearsPro <= 1,
        positionOverall: evaluation.positionOverall,
        potentialRating,
        offensiveOverall: evaluation.offensiveOverall,
        defensiveOverall: evaluation.defensiveOverall,
        specialTeamsOverall: evaluation.specialTeamsOverall,
        physicalOverall: evaluation.physicalOverall,
        mentalOverall: evaluation.mentalOverall,
        yearlySalary: blueprint.yearlySalary,
        signingBonus: blueprint.signingBonus,
        years: blueprint.contractYears,
        attributes,
      });

      slotIndex += 1;
    }
  }

  return roster;
}
