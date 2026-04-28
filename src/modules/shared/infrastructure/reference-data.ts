import {
  AttributeCategory,
  PrismaClient,
  RosterUnit,
  SideOfBall,
  type Prisma,
} from "@prisma/client";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type ConferenceSeed = {
  code: string;
  name: string;
};

type DivisionSeed = {
  conferenceCode: string;
  code: string;
  name: string;
};

type FranchiseSeed = {
  conferenceCode: string;
  divisionCode: string;
  city: string;
  nickname: string;
  abbreviation: string;
  marketSize: number;
  prestige: number;
  defaultBudget: number;
};

type PositionGroupSeed = {
  code: string;
  name: string;
  unit: RosterUnit;
  side: SideOfBall;
};

type PositionSeed = {
  groupCode: string;
  code: string;
  name: string;
  unit: RosterUnit;
  side: SideOfBall;
};

type ArchetypeSeed = {
  groupCode: string;
  positionCode?: string;
  code: string;
  name: string;
  description: string;
};

type SchemeFitSeed = {
  groupCode: string;
  code: string;
  name: string;
  description: string;
};

type AttributeSeed = {
  code: string;
  name: string;
  category: AttributeCategory;
  sortOrder: number;
  description: string;
};

export const DEFAULT_LEAGUE = {
  code: "AFM",
  name: "American Football Manager League",
};

export const CONFERENCES: ConferenceSeed[] = [
  { code: "ACE", name: "Atlantic Conference" },
  { code: "NFC", name: "National Frontier Conference" },
];

export const DIVISIONS: DivisionSeed[] = [
  { conferenceCode: "ACE", code: "EAST", name: "Eastern Division" },
  { conferenceCode: "ACE", code: "SOUTH", name: "Southern Division" },
  { conferenceCode: "NFC", code: "NORTH", name: "Northern Division" },
  { conferenceCode: "NFC", code: "WEST", name: "Western Division" },
];

export const FRANCHISE_TEMPLATES: FranchiseSeed[] = [
  {
    conferenceCode: "ACE",
    divisionCode: "EAST",
    city: "Boston",
    nickname: "Guardians",
    abbreviation: "BOS",
    marketSize: 81,
    prestige: 73,
    defaultBudget: 220000000,
  },
  {
    conferenceCode: "ACE",
    divisionCode: "EAST",
    city: "New York",
    nickname: "Titans",
    abbreviation: "NYT",
    marketSize: 96,
    prestige: 78,
    defaultBudget: 240000000,
  },
  {
    conferenceCode: "ACE",
    divisionCode: "SOUTH",
    city: "Miami",
    nickname: "Cyclones",
    abbreviation: "MIA",
    marketSize: 79,
    prestige: 69,
    defaultBudget: 210000000,
  },
  {
    conferenceCode: "ACE",
    divisionCode: "SOUTH",
    city: "Houston",
    nickname: "Outlaws",
    abbreviation: "HOU",
    marketSize: 84,
    prestige: 71,
    defaultBudget: 225000000,
  },
  {
    conferenceCode: "NFC",
    divisionCode: "NORTH",
    city: "Chicago",
    nickname: "Blizzard",
    abbreviation: "CHI",
    marketSize: 86,
    prestige: 72,
    defaultBudget: 226000000,
  },
  {
    conferenceCode: "NFC",
    divisionCode: "NORTH",
    city: "Detroit",
    nickname: "Iron",
    abbreviation: "DET",
    marketSize: 70,
    prestige: 65,
    defaultBudget: 205000000,
  },
  {
    conferenceCode: "NFC",
    divisionCode: "WEST",
    city: "San Diego",
    nickname: "Breakers",
    abbreviation: "SDG",
    marketSize: 77,
    prestige: 68,
    defaultBudget: 212000000,
  },
  {
    conferenceCode: "NFC",
    divisionCode: "WEST",
    city: "Seattle",
    nickname: "Orcas",
    abbreviation: "SEA",
    marketSize: 82,
    prestige: 74,
    defaultBudget: 223000000,
  },
];

export const POSITION_GROUP_DEFINITIONS: PositionGroupSeed[] = [
  {
    code: "OFFENSE",
    name: "Offense",
    unit: RosterUnit.OFFENSE,
    side: SideOfBall.OFFENSE,
  },
  {
    code: "DEFENSE",
    name: "Defense",
    unit: RosterUnit.DEFENSE,
    side: SideOfBall.DEFENSE,
  },
  {
    code: "SPECIAL_TEAMS",
    name: "Special Teams",
    unit: RosterUnit.SPECIAL_TEAMS,
    side: SideOfBall.SPECIAL_TEAMS,
  },
];

export const POSITION_DEFINITIONS: PositionSeed[] = [
  { groupCode: "OFFENSE", code: "QB", name: "Quarterback", unit: RosterUnit.OFFENSE, side: SideOfBall.OFFENSE },
  { groupCode: "OFFENSE", code: "RB", name: "Running Back", unit: RosterUnit.OFFENSE, side: SideOfBall.OFFENSE },
  { groupCode: "OFFENSE", code: "FB", name: "Fullback", unit: RosterUnit.OFFENSE, side: SideOfBall.OFFENSE },
  { groupCode: "OFFENSE", code: "WR", name: "Wide Receiver", unit: RosterUnit.OFFENSE, side: SideOfBall.OFFENSE },
  { groupCode: "OFFENSE", code: "TE", name: "Tight End", unit: RosterUnit.OFFENSE, side: SideOfBall.OFFENSE },
  { groupCode: "OFFENSE", code: "LT", name: "Left Tackle", unit: RosterUnit.OFFENSE, side: SideOfBall.OFFENSE },
  { groupCode: "OFFENSE", code: "LG", name: "Left Guard", unit: RosterUnit.OFFENSE, side: SideOfBall.OFFENSE },
  { groupCode: "OFFENSE", code: "C", name: "Center", unit: RosterUnit.OFFENSE, side: SideOfBall.OFFENSE },
  { groupCode: "OFFENSE", code: "RG", name: "Right Guard", unit: RosterUnit.OFFENSE, side: SideOfBall.OFFENSE },
  { groupCode: "OFFENSE", code: "RT", name: "Right Tackle", unit: RosterUnit.OFFENSE, side: SideOfBall.OFFENSE },
  { groupCode: "DEFENSE", code: "LE", name: "Left End", unit: RosterUnit.DEFENSE, side: SideOfBall.DEFENSE },
  { groupCode: "DEFENSE", code: "RE", name: "Right End", unit: RosterUnit.DEFENSE, side: SideOfBall.DEFENSE },
  { groupCode: "DEFENSE", code: "DT", name: "Defensive Tackle", unit: RosterUnit.DEFENSE, side: SideOfBall.DEFENSE },
  { groupCode: "DEFENSE", code: "LOLB", name: "Left Outside Linebacker", unit: RosterUnit.DEFENSE, side: SideOfBall.DEFENSE },
  { groupCode: "DEFENSE", code: "MLB", name: "Middle Linebacker", unit: RosterUnit.DEFENSE, side: SideOfBall.DEFENSE },
  { groupCode: "DEFENSE", code: "ROLB", name: "Right Outside Linebacker", unit: RosterUnit.DEFENSE, side: SideOfBall.DEFENSE },
  { groupCode: "DEFENSE", code: "CB", name: "Cornerback", unit: RosterUnit.DEFENSE, side: SideOfBall.DEFENSE },
  { groupCode: "DEFENSE", code: "FS", name: "Free Safety", unit: RosterUnit.DEFENSE, side: SideOfBall.DEFENSE },
  { groupCode: "DEFENSE", code: "SS", name: "Strong Safety", unit: RosterUnit.DEFENSE, side: SideOfBall.DEFENSE },
  { groupCode: "SPECIAL_TEAMS", code: "K", name: "Kicker", unit: RosterUnit.SPECIAL_TEAMS, side: SideOfBall.SPECIAL_TEAMS },
  { groupCode: "SPECIAL_TEAMS", code: "P", name: "Punter", unit: RosterUnit.SPECIAL_TEAMS, side: SideOfBall.SPECIAL_TEAMS },
  { groupCode: "SPECIAL_TEAMS", code: "KR", name: "Kick Returner", unit: RosterUnit.SPECIAL_TEAMS, side: SideOfBall.SPECIAL_TEAMS },
  { groupCode: "SPECIAL_TEAMS", code: "PR", name: "Punt Returner", unit: RosterUnit.SPECIAL_TEAMS, side: SideOfBall.SPECIAL_TEAMS },
  { groupCode: "SPECIAL_TEAMS", code: "LS", name: "Long Snapper", unit: RosterUnit.SPECIAL_TEAMS, side: SideOfBall.SPECIAL_TEAMS },
];

export const ARCHETYPE_DEFINITIONS: ArchetypeSeed[] = [
  { groupCode: "OFFENSE", positionCode: "QB", code: "QB_FIELD_GENERAL", name: "Field General", description: "Reads coverage quickly and keeps the offense on schedule." },
  { groupCode: "OFFENSE", positionCode: "QB", code: "QB_POCKET_PASSER", name: "Pocket Passer", description: "Wins from structure with timing and deep-arm touch." },
  { groupCode: "OFFENSE", positionCode: "QB", code: "QB_SCRAMBLER", name: "Scrambler", description: "Extends plays and threatens defenses outside the pocket." },
  { groupCode: "OFFENSE", positionCode: "RB", code: "RB_POWER_BACK", name: "Power Back", description: "Breaks contact and converts tough yards between the tackles." },
  { groupCode: "OFFENSE", positionCode: "RB", code: "RB_ELUSIVE_BACK", name: "Elusive Back", description: "Creates chunk plays with burst and lateral quickness." },
  { groupCode: "OFFENSE", positionCode: "FB", code: "FB_LEAD_BLOCKER", name: "Lead Blocker", description: "Clears lanes, protects the passer and handles short-yardage work." },
  { groupCode: "OFFENSE", positionCode: "WR", code: "WR_ROUTE_TECHNICIAN", name: "Route Technician", description: "Separates with detail, leverage and reliable hands." },
  { groupCode: "OFFENSE", positionCode: "WR", code: "WR_DEEP_THREAT", name: "Deep Threat", description: "Stretches the field and punishes one-on-one coverage vertically." },
  { groupCode: "OFFENSE", positionCode: "TE", code: "TE_BALANCED", name: "Balanced Tight End", description: "Contributes as both possession target and attached blocker." },
  { groupCode: "OFFENSE", positionCode: "TE", code: "TE_IN_LINE_BLOCKER", name: "In-Line Blocker", description: "Supports the run game and pass protection from heavy sets." },
  { groupCode: "OFFENSE", code: "OL_PASS_PROTECTOR", name: "Pass Protector", description: "Prioritizes clean pockets and anchor in one-on-one sets." },
  { groupCode: "OFFENSE", code: "OL_ROAD_GRADER", name: "Road Grader", description: "Creates movement in the run game and finishes through contact." },
  { groupCode: "DEFENSE", positionCode: "LE", code: "EDGE_POWER_END", name: "Power End", description: "Compresses the pocket with leverage, length and heavy hands." },
  { groupCode: "DEFENSE", positionCode: "RE", code: "EDGE_SPEED_RUSHER", name: "Speed Rusher", description: "Wins outside the arc with burst and bend." },
  { groupCode: "DEFENSE", positionCode: "DT", code: "DT_RUN_STUFFER", name: "Run Stuffer", description: "Controls interior gaps and absorbs double teams." },
  { groupCode: "DEFENSE", positionCode: "DT", code: "DT_PENETRATOR", name: "Penetrator", description: "Attacks quickly through gaps and disrupts the backfield." },
  { groupCode: "DEFENSE", positionCode: "MLB", code: "LB_FIELD_GENERAL", name: "Field General", description: "Orchestrates the front and diagnoses plays early." },
  { groupCode: "DEFENSE", code: "LB_ENFORCER", name: "Enforcer", description: "Plays downhill, tackles violently and punishes contact." },
  { groupCode: "DEFENSE", code: "LB_COVER_SPECIALIST", name: "Coverage Specialist", description: "Matches routes, carries backs and tight ends, and closes throwing lanes." },
  { groupCode: "DEFENSE", positionCode: "CB", code: "CB_MAN_SPECIALIST", name: "Man Specialist", description: "Thrives in press-man with recovery speed and ball disruption." },
  { groupCode: "DEFENSE", positionCode: "CB", code: "CB_BALL_HAWK", name: "Ball Hawk", description: "Finds the football early and turns takeaways into swing plays." },
  { groupCode: "DEFENSE", positionCode: "FS", code: "FS_CENTER_FIELDER", name: "Center Fielder", description: "Erases deep windows with range and anticipation." },
  { groupCode: "DEFENSE", positionCode: "SS", code: "SS_BOX_ENFORCER", name: "Box Enforcer", description: "Adds force near the line and supports the run fit aggressively." },
  { groupCode: "SPECIAL_TEAMS", positionCode: "K", code: "K_ACCURACY_SPECIALIST", name: "Accuracy Specialist", description: "Wins with placement, repeatable mechanics and dependable range." },
  { groupCode: "SPECIAL_TEAMS", positionCode: "K", code: "K_POWER_LEG", name: "Power Leg", description: "Creates field-position swing with distance on kicks and kickoffs." },
  { groupCode: "SPECIAL_TEAMS", positionCode: "P", code: "P_FIELD_FLIPPER", name: "Field Flipper", description: "Controls hidden yardage with hang time and placement." },
  { groupCode: "SPECIAL_TEAMS", positionCode: "KR", code: "RETURN_SPECIALIST", name: "Return Specialist", description: "Changes momentum with vision, burst and open-field creativity." },
  { groupCode: "SPECIAL_TEAMS", positionCode: "PR", code: "PUNT_RETURN_SPECIALIST", name: "Punt Return Specialist", description: "Handles tight spaces cleanly and turns first misses into explosives." },
  { groupCode: "SPECIAL_TEAMS", positionCode: "LS", code: "LS_CORE_SPECIALIST", name: "Core Specialist", description: "Provides dependable snap operation and coverage discipline." },
];

export const SCHEME_FIT_DEFINITIONS: SchemeFitSeed[] = [
  { groupCode: "OFFENSE", code: "BALANCED_OFFENSE", name: "Balanced Offense", description: "Supports flexible game plans with multiple personnel groupings." },
  { groupCode: "OFFENSE", code: "POWER_RUN", name: "Power Run", description: "Values downhill blocking, short-yardage success and physicality." },
  { groupCode: "OFFENSE", code: "SPREAD_ATTACK", name: "Spread Attack", description: "Creates spacing and asks skill players to win in open space." },
  { groupCode: "OFFENSE", code: "WEST_COAST", name: "West Coast", description: "Favors timing, quick decisions and efficient underneath sequencing." },
  { groupCode: "OFFENSE", code: "AIR_RAID", name: "Air Raid", description: "Prioritizes high-volume passing, space and vertical stress." },
  { groupCode: "DEFENSE", code: "FOUR_THREE_FRONT", name: "4-3 Front", description: "Fits one-gap defensive line play with classic linebacker structure." },
  { groupCode: "DEFENSE", code: "THREE_FOUR_FRONT", name: "3-4 Front", description: "Relies on versatile linebackers and front multiplicity." },
  { groupCode: "DEFENSE", code: "PRESS_MAN", name: "Press Man", description: "Demands physical corners and tight coverage leverage." },
  { groupCode: "DEFENSE", code: "ZONE_DISCIPLINE", name: "Zone Discipline", description: "Rewards eyes, spacing and route distribution awareness." },
  { groupCode: "DEFENSE", code: "NICKEL_SPEED", name: "Nickel Speed", description: "Builds around sub-package quickness and matchup flexibility." },
  { groupCode: "SPECIAL_TEAMS", code: "FIELD_POSITION", name: "Field Position", description: "Optimizes hidden yardage through punting and coverage quality." },
  { groupCode: "SPECIAL_TEAMS", code: "POWER_LEG", name: "Power Leg", description: "Leans on distance, kickoff depth and swing-field advantage." },
  { groupCode: "SPECIAL_TEAMS", code: "RETURN_SPARK", name: "Return Spark", description: "Emphasizes return explosiveness and special-teams playmakers." },
];

export const ATTRIBUTE_DEFINITIONS: AttributeSeed[] = [
  { code: "SPEED", name: "Speed", category: AttributeCategory.GENERAL, sortOrder: 10, description: "Top-end movement speed over open distance." },
  { code: "ACCELERATION", name: "Acceleration", category: AttributeCategory.GENERAL, sortOrder: 20, description: "First-step burst and short-area takeoff." },
  { code: "AGILITY", name: "Agility", category: AttributeCategory.GENERAL, sortOrder: 30, description: "Ability to redirect efficiently under control." },
  { code: "STRENGTH", name: "Strength", category: AttributeCategory.GENERAL, sortOrder: 40, description: "Functional power through contact and leverage." },
  { code: "AWARENESS", name: "Awareness", category: AttributeCategory.GENERAL, sortOrder: 50, description: "Game sense, spacing and situational processing." },
  { code: "TOUGHNESS", name: "Toughness", category: AttributeCategory.GENERAL, sortOrder: 60, description: "Physical resilience and willingness in contested reps." },
  { code: "DURABILITY", name: "Durability", category: AttributeCategory.GENERAL, sortOrder: 70, description: "Ability to withstand volume and recover reliably." },
  { code: "DISCIPLINE", name: "Discipline", category: AttributeCategory.GENERAL, sortOrder: 80, description: "Consistency, assignment trust and penalty avoidance." },
  { code: "INTELLIGENCE", name: "Intelligence", category: AttributeCategory.GENERAL, sortOrder: 90, description: "Mental processing, learning capacity and adaptability." },
  { code: "LEADERSHIP", name: "Leadership", category: AttributeCategory.GENERAL, sortOrder: 100, description: "Influence on teammates, huddle control and tone-setting." },
  { code: "THROW_POWER", name: "Throw Power", category: AttributeCategory.QUARTERBACK, sortOrder: 110, description: "Velocity and distance on NFL-level throws." },
  { code: "THROW_ACCURACY_SHORT", name: "Throw Accuracy Short", category: AttributeCategory.QUARTERBACK, sortOrder: 120, description: "Placement on quick-game and underneath throws." },
  { code: "THROW_ACCURACY_MEDIUM", name: "Throw Accuracy Medium", category: AttributeCategory.QUARTERBACK, sortOrder: 130, description: "Placement in the intermediate windows." },
  { code: "THROW_ACCURACY_DEEP", name: "Throw Accuracy Deep", category: AttributeCategory.QUARTERBACK, sortOrder: 140, description: "Ball location and trajectory down the field." },
  { code: "POCKET_PRESENCE", name: "Pocket Presence", category: AttributeCategory.QUARTERBACK, sortOrder: 150, description: "Composure, feel and movement under pressure." },
  { code: "DECISION_MAKING", name: "Decision Making", category: AttributeCategory.QUARTERBACK, sortOrder: 160, description: "Turnover avoidance and choice quality within timing." },
  { code: "PLAY_ACTION", name: "Play Action", category: AttributeCategory.QUARTERBACK, sortOrder: 170, description: "Execution and timing from deception concepts." },
  { code: "SCRAMBLING", name: "Scrambling", category: AttributeCategory.QUARTERBACK, sortOrder: 180, description: "Escapability and off-script rushing threat." },
  { code: "MOBILITY", name: "Mobility", category: AttributeCategory.QUARTERBACK, sortOrder: 185, description: "Functional pocket movement and directional freedom under pressure." },
  { code: "VISION", name: "Vision", category: AttributeCategory.BALL_CARRIER, sortOrder: 190, description: "Read quality through traffic and blocking surfaces." },
  { code: "BALL_SECURITY", name: "Ball Security", category: AttributeCategory.BALL_CARRIER, sortOrder: 200, description: "Ability to avoid strips and handling mistakes." },
  { code: "ELUSIVENESS", name: "Elusiveness", category: AttributeCategory.BALL_CARRIER, sortOrder: 210, description: "Missed-tackle creation in space and contact windows." },
  { code: "BREAK_TACKLE", name: "Break Tackle", category: AttributeCategory.BALL_CARRIER, sortOrder: 220, description: "Power through arm tackles and glancing contact." },
  { code: "ROUTE_RUNNING", name: "Route Running", category: AttributeCategory.RECEIVING, sortOrder: 230, description: "Tempo, leverage and timing through route stems." },
  { code: "PASS_PROTECTION", name: "Pass Protection", category: AttributeCategory.BALL_CARRIER, sortOrder: 240, description: "Recognition and execution against pressure looks." },
  { code: "SHORT_YARDAGE_POWER", name: "Short Yardage Power", category: AttributeCategory.BALL_CARRIER, sortOrder: 250, description: "Conversion ability in dense, short-yardage situations." },
  { code: "CATCHING", name: "Catching", category: AttributeCategory.RECEIVING, sortOrder: 260, description: "Hands consistency through traffic and awkward frames." },
  { code: "HANDS", name: "Hands", category: AttributeCategory.RECEIVING, sortOrder: 265, description: "Pure catch reliability and control through the finish." },
  { code: "RELEASE", name: "Release", category: AttributeCategory.RECEIVING, sortOrder: 270, description: "Early separation created off the line." },
  { code: "SEPARATION", name: "Separation", category: AttributeCategory.RECEIVING, sortOrder: 280, description: "Ability to open space at breakpoints and late windows." },
  { code: "CONTESTED_CATCH", name: "Contested Catch", category: AttributeCategory.RECEIVING, sortOrder: 290, description: "Success rate in tight-window and above-the-rim targets." },
  { code: "JUMPING", name: "Jumping", category: AttributeCategory.RECEIVING, sortOrder: 300, description: "Vertical explosiveness and catch-point reach." },
  { code: "RUN_AFTER_CATCH", name: "Run After Catch", category: AttributeCategory.RECEIVING, sortOrder: 310, description: "Open-field transition and post-catch playmaking." },
  { code: "BLOCKING", name: "Blocking", category: AttributeCategory.RECEIVING, sortOrder: 320, description: "Engagement quality from skill positions in space or attached alignments." },
  { code: "PASS_BLOCK", name: "Pass Block", category: AttributeCategory.OFFENSIVE_LINE, sortOrder: 330, description: "Consistency protecting against bull rush and counters." },
  { code: "RUN_BLOCK", name: "Run Block", category: AttributeCategory.OFFENSIVE_LINE, sortOrder: 340, description: "Movement creation and angle control in the run game." },
  { code: "HAND_TECHNIQUE", name: "Hand Technique", category: AttributeCategory.OFFENSIVE_LINE, sortOrder: 350, description: "Timing, placement and reset quality with the hands." },
  { code: "FOOTWORK", name: "Footwork", category: AttributeCategory.OFFENSIVE_LINE, sortOrder: 360, description: "Base control and recovery through complex movements." },
  { code: "ANCHOR", name: "Anchor", category: AttributeCategory.OFFENSIVE_LINE, sortOrder: 370, description: "Ability to sit down versus power and hold depth." },
  { code: "TACKLING", name: "Tackling", category: AttributeCategory.FRONT_SEVEN, sortOrder: 380, description: "Finishing quality through contact and leverage." },
  { code: "PURSUIT", name: "Pursuit", category: AttributeCategory.FRONT_SEVEN, sortOrder: 390, description: "Range and effort closing to the football." },
  { code: "BLOCK_SHEDDING", name: "Block Shedding", category: AttributeCategory.FRONT_SEVEN, sortOrder: 400, description: "Ability to disengage and reset into the play." },
  { code: "PASS_RUSH", name: "Pass Rush", category: AttributeCategory.FRONT_SEVEN, sortOrder: 410, description: "Overall threat level as a pressure creator." },
  { code: "POWER_MOVES", name: "Power Moves", category: AttributeCategory.FRONT_SEVEN, sortOrder: 420, description: "Rush wins built on force, leverage and long-arm usage." },
  { code: "FINESSE_MOVES", name: "Finesse Moves", category: AttributeCategory.FRONT_SEVEN, sortOrder: 430, description: "Rush wins built on timing, counters and body control." },
  { code: "PLAY_RECOGNITION", name: "Play Recognition", category: AttributeCategory.FRONT_SEVEN, sortOrder: 440, description: "Ability to identify concepts quickly and trigger correctly." },
  { code: "HIT_POWER", name: "Hit Power", category: AttributeCategory.FRONT_SEVEN, sortOrder: 450, description: "Impact force created at point of contact." },
  { code: "MAN_COVERAGE", name: "Man Coverage", category: AttributeCategory.COVERAGE, sortOrder: 460, description: "Stickiness and technique in man assignments." },
  { code: "ZONE_COVERAGE", name: "Zone Coverage", category: AttributeCategory.COVERAGE, sortOrder: 470, description: "Spacing, eyes and route exchange awareness in zone." },
  { code: "PRESS", name: "Press", category: AttributeCategory.COVERAGE, sortOrder: 480, description: "Jam timing, disruption and balance at the line." },
  { code: "BALL_SKILLS", name: "Ball Skills", category: AttributeCategory.COVERAGE, sortOrder: 490, description: "Tracking, timing and finishing plays on the football." },
  { code: "LB_MAN_COVERAGE", name: "Linebacker Man Coverage", category: AttributeCategory.COVERAGE, sortOrder: 492, description: "Ability to mirror backs and tight ends from linebacker leverage." },
  { code: "LB_ZONE_COVERAGE", name: "Linebacker Zone Coverage", category: AttributeCategory.COVERAGE, sortOrder: 493, description: "Spacing, pattern passing and route awareness from hook and curl zones." },
  { code: "COVERAGE_RANGE", name: "Coverage Range", category: AttributeCategory.COVERAGE, sortOrder: 494, description: "Closing burst and spatial reach attacking passing windows." },
  { code: "LB_COVERAGE", name: "Linebacker Coverage", category: AttributeCategory.COVERAGE, sortOrder: 495, description: "Composite linebacker comfort matching underneath routes from stacked alignments." },
  { code: "KICK_POWER", name: "Kick Power", category: AttributeCategory.KICKING, sortOrder: 500, description: "Distance ceiling on field goals and general kicks." },
  { code: "KICK_ACCURACY", name: "Kick Accuracy", category: AttributeCategory.KICKING, sortOrder: 510, description: "Directional control and repeatability through the ball." },
  { code: "PUNT_POWER", name: "Punt Power", category: AttributeCategory.KICKING, sortOrder: 520, description: "Distance generated off the punt foot." },
  { code: "PUNT_ACCURACY", name: "Punt Accuracy", category: AttributeCategory.KICKING, sortOrder: 530, description: "Placement quality, hang time control and coffin-corner ability." },
  { code: "KICKOFF_POWER", name: "Kickoff Power", category: AttributeCategory.KICKING, sortOrder: 540, description: "Depth and drive created on kickoffs." },
  { code: "KICK_CONSISTENCY", name: "Kick Consistency", category: AttributeCategory.SPECIAL_TEAMS, sortOrder: 550, description: "Repeatability from kick to kick, especially under pressure." },
  { code: "PUNT_HANG_TIME", name: "Punt Hang Time", category: AttributeCategory.SPECIAL_TEAMS, sortOrder: 560, description: "Ability to trade distance for controlled return suppression." },
  { code: "RETURN_VISION", name: "Return Vision", category: AttributeCategory.SPECIAL_TEAMS, sortOrder: 570, description: "Ability to read lanes quickly on kick and punt returns." },
  { code: "SNAP_ACCURACY", name: "Snap Accuracy", category: AttributeCategory.SPECIAL_TEAMS, sortOrder: 580, description: "Reliability and placement on long snaps for punts and kicks." },
  { code: "SNAP_VELOCITY", name: "Snap Velocity", category: AttributeCategory.SPECIAL_TEAMS, sortOrder: 590, description: "Operational speed from snap to hold without losing control." },
];

export async function ensureReferenceData(prisma: PrismaExecutor) {
  const league = await prisma.leagueDefinition.upsert({
    where: { code: DEFAULT_LEAGUE.code },
    update: { name: DEFAULT_LEAGUE.name },
    create: DEFAULT_LEAGUE,
  });

  const conferenceIds = new Map<string, string>();

  for (const conference of CONFERENCES) {
    const entry = await prisma.conferenceDefinition.upsert({
      where: {
        leagueDefinitionId_code: {
          leagueDefinitionId: league.id,
          code: conference.code,
        },
      },
      update: { name: conference.name },
      create: {
        leagueDefinitionId: league.id,
        code: conference.code,
        name: conference.name,
      },
    });

    conferenceIds.set(conference.code, entry.id);
  }

  const divisionIds = new Map<string, string>();

  for (const division of DIVISIONS) {
    const conferenceId = conferenceIds.get(division.conferenceCode);

    if (!conferenceId) {
      throw new Error(`Missing conference seed for ${division.conferenceCode}`);
    }

    const entry = await prisma.divisionDefinition.upsert({
      where: {
        conferenceDefinitionId_code: {
          conferenceDefinitionId: conferenceId,
          code: division.code,
        },
      },
      update: { name: division.name },
      create: {
        conferenceDefinitionId: conferenceId,
        code: division.code,
        name: division.name,
      },
    });

    divisionIds.set(`${division.conferenceCode}:${division.code}`, entry.id);
  }

  for (const franchise of FRANCHISE_TEMPLATES) {
    const conferenceId = conferenceIds.get(franchise.conferenceCode);
    const divisionId = divisionIds.get(
      `${franchise.conferenceCode}:${franchise.divisionCode}`,
    );

    if (!conferenceId || !divisionId) {
      throw new Error(`Missing division seed for ${franchise.abbreviation}`);
    }

    await prisma.franchiseTemplate.upsert({
      where: { abbreviation: franchise.abbreviation },
      update: {
        city: franchise.city,
        nickname: franchise.nickname,
        marketSize: franchise.marketSize,
        prestige: franchise.prestige,
        defaultBudget: franchise.defaultBudget,
        leagueDefinitionId: league.id,
        conferenceDefinitionId: conferenceId,
        divisionDefinitionId: divisionId,
      },
      create: {
        leagueDefinitionId: league.id,
        conferenceDefinitionId: conferenceId,
        divisionDefinitionId: divisionId,
        city: franchise.city,
        nickname: franchise.nickname,
        abbreviation: franchise.abbreviation,
        marketSize: franchise.marketSize,
        prestige: franchise.prestige,
        defaultBudget: franchise.defaultBudget,
      },
    });
  }

  const positionGroupIds = new Map<string, string>();

  for (const group of POSITION_GROUP_DEFINITIONS) {
    const entry = await prisma.positionGroupDefinition.upsert({
      where: { code: group.code },
      update: {
        name: group.name,
        unit: group.unit,
        side: group.side,
      },
      create: group,
    });

    positionGroupIds.set(group.code, entry.id);
  }

  const positionIds = new Map<string, string>();

  for (const position of POSITION_DEFINITIONS) {
    const positionGroupDefinitionId = positionGroupIds.get(position.groupCode);

    if (!positionGroupDefinitionId) {
      throw new Error(`Missing position group seed for ${position.code}`);
    }

    const entry = await prisma.positionDefinition.upsert({
      where: { code: position.code },
      update: {
        positionGroupDefinitionId,
        name: position.name,
        unit: position.unit,
        side: position.side,
      },
      create: {
        positionGroupDefinitionId,
        code: position.code,
        name: position.name,
        unit: position.unit,
        side: position.side,
      },
    });

    positionIds.set(position.code, entry.id);
  }

  for (const archetype of ARCHETYPE_DEFINITIONS) {
    const positionGroupDefinitionId = positionGroupIds.get(archetype.groupCode);
    const positionDefinitionId = archetype.positionCode
      ? positionIds.get(archetype.positionCode)
      : null;

    if (!positionGroupDefinitionId) {
      throw new Error(`Missing position group seed for archetype ${archetype.code}`);
    }

    if (archetype.positionCode && !positionDefinitionId) {
      throw new Error(`Missing position seed for archetype ${archetype.code}`);
    }

    await prisma.archetypeDefinition.upsert({
      where: { code: archetype.code },
      update: {
        positionGroupDefinitionId,
        positionDefinitionId,
        name: archetype.name,
        description: archetype.description,
      },
      create: {
        positionGroupDefinitionId,
        positionDefinitionId,
        code: archetype.code,
        name: archetype.name,
        description: archetype.description,
      },
    });
  }

  for (const schemeFit of SCHEME_FIT_DEFINITIONS) {
    const positionGroupDefinitionId = positionGroupIds.get(schemeFit.groupCode);

    if (!positionGroupDefinitionId) {
      throw new Error(`Missing position group seed for scheme fit ${schemeFit.code}`);
    }

    await prisma.schemeFitDefinition.upsert({
      where: { code: schemeFit.code },
      update: {
        positionGroupDefinitionId,
        name: schemeFit.name,
        description: schemeFit.description,
      },
      create: {
        positionGroupDefinitionId,
        code: schemeFit.code,
        name: schemeFit.name,
        description: schemeFit.description,
      },
    });
  }

  for (const attribute of ATTRIBUTE_DEFINITIONS) {
    await prisma.attributeDefinition.upsert({
      where: { code: attribute.code },
      update: {
        name: attribute.name,
        category: attribute.category,
        sortOrder: attribute.sortOrder,
        description: attribute.description,
      },
      create: attribute,
    });
  }

  return league;
}

export async function requireDefaultLeagueDefinition(prisma: PrismaExecutor) {
  const league = await prisma.leagueDefinition.findUnique({
    where: {
      code: DEFAULT_LEAGUE.code,
    },
  });

  if (!league) {
    throw new Error(
      `Reference data for league ${DEFAULT_LEAGUE.code} is missing. Run prisma:seed first.`,
    );
  }

  return league;
}

export async function listFranchiseTemplatesByLeague(
  prisma: PrismaExecutor,
  leagueDefinitionId: string,
) {
  return prisma.franchiseTemplate.findMany({
    where: {
      leagueDefinitionId,
    },
    orderBy: [{ abbreviation: "asc" }],
  });
}

export async function listPositionDefinitions(prisma: PrismaExecutor) {
  return prisma.positionDefinition.findMany({
    orderBy: [{ code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      positionGroupDefinitionId: true,
      positionGroup: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  });
}

export async function listArchetypeDefinitions(prisma: PrismaExecutor) {
  return prisma.archetypeDefinition.findMany({
    orderBy: [{ code: "asc" }],
    select: {
      id: true,
      code: true,
    },
  });
}

export async function listSchemeFitDefinitions(prisma: PrismaExecutor) {
  return prisma.schemeFitDefinition.findMany({
    orderBy: [{ code: "asc" }],
    select: {
      id: true,
      code: true,
    },
  });
}

export async function listAttributeDefinitions(prisma: PrismaExecutor) {
  return prisma.attributeDefinition.findMany({
    orderBy: [{ sortOrder: "asc" }],
    select: {
      id: true,
      code: true,
      category: true,
    },
  });
}
