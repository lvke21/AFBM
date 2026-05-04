export type CityGroup = "usa_sports" | "switzerland" | "dach" | "europe_capital";

export type TeamNameCategory =
  | "identity_city"
  | "aggressive_competitive"
  | "modern_sports"
  | "classic_sports";

export type TeamIdentityCity = {
  id: string;
  name: string;
  country: string;
  cityGroups: CityGroup[];
};

export type TeamIdentityTeamName = {
  id: string;
  name: string;
  category: TeamNameCategory;
};

export type TeamIdentitySelection = {
  cityId: string;
  category: TeamNameCategory;
  teamNameId: string;
};

export type ResolvedTeamIdentity = {
  cityId: string;
  cityName: string;
  teamNameId: string;
  teamName: string;
  teamCategory: TeamNameCategory;
  teamDisplayName: string;
};

type RawCity = {
  name: string;
  country: string;
  cityGroups: CityGroup[];
};

export const TEAM_NAME_CATEGORY_LABELS: Record<TeamNameCategory, string> = {
  identity_city: "Identity",
  aggressive_competitive: "Aggressive",
  modern_sports: "Modern",
  classic_sports: "Classic",
};

export const TEAM_NAME_CATEGORIES: TeamNameCategory[] = [
  "identity_city",
  "aggressive_competitive",
  "modern_sports",
  "classic_sports",
];

const CITY_GROUP_ORDER: CityGroup[] = [
  "usa_sports",
  "switzerland",
  "dach",
  "europe_capital",
];

const CITY_CANONICAL_NAMES: Record<string, string> = {
  cologne: "Köln",
  geneva: "Genève",
  munich: "München",
  vienna: "Wien",
  zurich: "Zürich",
};

const RAW_CITIES: RawCity[] = [
  { name: "Atlanta", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Baltimore", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Boston", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Brooklyn", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Buffalo", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Charlotte", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Chicago", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Cincinnati", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Cleveland", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Dallas", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Denver", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Detroit", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Foxborough", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Glendale", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Green Bay", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Houston", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Indianapolis", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Inglewood", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Jacksonville", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Kansas City", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Las Vegas", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Landover", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Los Angeles", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Memphis", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Miami", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Milwaukee", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Minneapolis", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Nashville", country: "United States", cityGroups: ["usa_sports"] },
  { name: "New Orleans", country: "United States", cityGroups: ["usa_sports"] },
  { name: "New York", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Oklahoma City", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Orchard Park", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Orlando", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Philadelphia", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Phoenix", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Pittsburgh", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Portland", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Sacramento", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Salt Lake City", country: "United States", cityGroups: ["usa_sports"] },
  { name: "San Antonio", country: "United States", cityGroups: ["usa_sports"] },
  { name: "San Francisco", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Santa Clara", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Seattle", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Tampa", country: "United States", cityGroups: ["usa_sports"] },
  { name: "Toronto", country: "Canada", cityGroups: ["usa_sports"] },
  { name: "Washington", country: "United States", cityGroups: ["usa_sports"] },

  { name: "Zürich", country: "Switzerland", cityGroups: ["switzerland", "dach"] },
  { name: "Zurich", country: "Switzerland", cityGroups: ["switzerland", "dach"] },
  { name: "Bern", country: "Switzerland", cityGroups: ["switzerland", "dach", "europe_capital"] },
  { name: "Basel", country: "Switzerland", cityGroups: ["switzerland", "dach"] },
  { name: "Lausanne", country: "Switzerland", cityGroups: ["switzerland", "dach"] },
  { name: "Genève", country: "Switzerland", cityGroups: ["switzerland", "dach"] },
  { name: "Geneva", country: "Switzerland", cityGroups: ["switzerland", "dach"] },
  { name: "Winterthur", country: "Switzerland", cityGroups: ["switzerland", "dach"] },
  { name: "Luzern", country: "Switzerland", cityGroups: ["switzerland", "dach"] },
  { name: "St. Gallen", country: "Switzerland", cityGroups: ["switzerland", "dach"] },
  { name: "Lugano", country: "Switzerland", cityGroups: ["switzerland", "dach"] },
  { name: "Biel/Bienne", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Thun", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Köniz", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "La Chaux-de-Fonds", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Fribourg", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Schaffhausen", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Chur", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Neuchâtel", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Sion", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Uster", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Zug", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Yverdon-les-Bains", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Montreux", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Rapperswil-Jona", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Frauenfeld", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Baden", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Wil", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Bellinzona", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Aarau", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Solothurn", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Olten", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Locarno", country: "Switzerland", cityGroups: ["switzerland"] },
  { name: "Vevey", country: "Switzerland", cityGroups: ["switzerland"] },

  { name: "Berlin", country: "Germany", cityGroups: ["dach", "europe_capital"] },
  { name: "Hamburg", country: "Germany", cityGroups: ["dach"] },
  { name: "München", country: "Germany", cityGroups: ["dach"] },
  { name: "Munich", country: "Germany", cityGroups: ["dach"] },
  { name: "Köln", country: "Germany", cityGroups: ["dach"] },
  { name: "Cologne", country: "Germany", cityGroups: ["dach"] },
  { name: "Frankfurt", country: "Germany", cityGroups: ["dach"] },
  { name: "Stuttgart", country: "Germany", cityGroups: ["dach"] },
  { name: "Düsseldorf", country: "Germany", cityGroups: ["dach"] },
  { name: "Leipzig", country: "Germany", cityGroups: ["dach"] },
  { name: "Dortmund", country: "Germany", cityGroups: ["dach"] },
  { name: "Essen", country: "Germany", cityGroups: ["dach"] },
  { name: "Bremen", country: "Germany", cityGroups: ["dach"] },
  { name: "Dresden", country: "Germany", cityGroups: ["dach"] },
  { name: "Hannover", country: "Germany", cityGroups: ["dach"] },
  { name: "Nürnberg", country: "Germany", cityGroups: ["dach"] },
  { name: "Duisburg", country: "Germany", cityGroups: ["dach"] },
  { name: "Bochum", country: "Germany", cityGroups: ["dach"] },
  { name: "Wuppertal", country: "Germany", cityGroups: ["dach"] },
  { name: "Bielefeld", country: "Germany", cityGroups: ["dach"] },
  { name: "Bonn", country: "Germany", cityGroups: ["dach"] },
  { name: "Münster", country: "Germany", cityGroups: ["dach"] },
  { name: "Karlsruhe", country: "Germany", cityGroups: ["dach"] },
  { name: "Mannheim", country: "Germany", cityGroups: ["dach"] },
  { name: "Augsburg", country: "Germany", cityGroups: ["dach"] },
  { name: "Wiesbaden", country: "Germany", cityGroups: ["dach"] },
  { name: "Gelsenkirchen", country: "Germany", cityGroups: ["dach"] },
  { name: "Mönchengladbach", country: "Germany", cityGroups: ["dach"] },
  { name: "Braunschweig", country: "Germany", cityGroups: ["dach"] },
  { name: "Chemnitz", country: "Germany", cityGroups: ["dach"] },
  { name: "Kiel", country: "Germany", cityGroups: ["dach"] },
  { name: "Aachen", country: "Germany", cityGroups: ["dach"] },
  { name: "Halle", country: "Germany", cityGroups: ["dach"] },
  { name: "Magdeburg", country: "Germany", cityGroups: ["dach"] },
  { name: "Freiburg", country: "Germany", cityGroups: ["dach"] },
  { name: "Krefeld", country: "Germany", cityGroups: ["dach"] },
  { name: "Lübeck", country: "Germany", cityGroups: ["dach"] },
  { name: "Mainz", country: "Germany", cityGroups: ["dach"] },
  { name: "Erfurt", country: "Germany", cityGroups: ["dach"] },
  { name: "Rostock", country: "Germany", cityGroups: ["dach"] },
  { name: "Kassel", country: "Germany", cityGroups: ["dach"] },
  { name: "Potsdam", country: "Germany", cityGroups: ["dach"] },
  { name: "Wien", country: "Austria", cityGroups: ["dach", "europe_capital"] },
  { name: "Vienna", country: "Austria", cityGroups: ["dach", "europe_capital"] },
  { name: "Graz", country: "Austria", cityGroups: ["dach"] },
  { name: "Linz", country: "Austria", cityGroups: ["dach"] },
  { name: "Salzburg", country: "Austria", cityGroups: ["dach"] },
  { name: "Innsbruck", country: "Austria", cityGroups: ["dach"] },
  { name: "Klagenfurt", country: "Austria", cityGroups: ["dach"] },
  { name: "Villach", country: "Austria", cityGroups: ["dach"] },
  { name: "Wels", country: "Austria", cityGroups: ["dach"] },
  { name: "St. Pölten", country: "Austria", cityGroups: ["dach"] },
  { name: "Dornbirn", country: "Austria", cityGroups: ["dach"] },
  { name: "Wiener Neustadt", country: "Austria", cityGroups: ["dach"] },
  { name: "Steyr", country: "Austria", cityGroups: ["dach"] },
  { name: "Feldkirch", country: "Austria", cityGroups: ["dach"] },

  { name: "Tirana", country: "Albania", cityGroups: ["europe_capital"] },
  { name: "Andorra la Vella", country: "Andorra", cityGroups: ["europe_capital"] },
  { name: "Yerevan", country: "Armenia", cityGroups: ["europe_capital"] },
  { name: "Baku", country: "Azerbaijan", cityGroups: ["europe_capital"] },
  { name: "Minsk", country: "Belarus", cityGroups: ["europe_capital"] },
  { name: "Brussels", country: "Belgium", cityGroups: ["europe_capital"] },
  { name: "Sarajevo", country: "Bosnia and Herzegovina", cityGroups: ["europe_capital"] },
  { name: "Sofia", country: "Bulgaria", cityGroups: ["europe_capital"] },
  { name: "Zagreb", country: "Croatia", cityGroups: ["europe_capital"] },
  { name: "Nicosia", country: "Cyprus", cityGroups: ["europe_capital"] },
  { name: "Prague", country: "Czechia", cityGroups: ["europe_capital"] },
  { name: "Copenhagen", country: "Denmark", cityGroups: ["europe_capital"] },
  { name: "Tallinn", country: "Estonia", cityGroups: ["europe_capital"] },
  { name: "Helsinki", country: "Finland", cityGroups: ["europe_capital"] },
  { name: "Paris", country: "France", cityGroups: ["europe_capital"] },
  { name: "Tbilisi", country: "Georgia", cityGroups: ["europe_capital"] },
  { name: "Athens", country: "Greece", cityGroups: ["europe_capital"] },
  { name: "Budapest", country: "Hungary", cityGroups: ["europe_capital"] },
  { name: "Reykjavik", country: "Iceland", cityGroups: ["europe_capital"] },
  { name: "Dublin", country: "Ireland", cityGroups: ["europe_capital"] },
  { name: "Rome", country: "Italy", cityGroups: ["europe_capital"] },
  { name: "Pristina", country: "Kosovo", cityGroups: ["europe_capital"] },
  { name: "Riga", country: "Latvia", cityGroups: ["europe_capital"] },
  { name: "Vaduz", country: "Liechtenstein", cityGroups: ["europe_capital"] },
  { name: "Vilnius", country: "Lithuania", cityGroups: ["europe_capital"] },
  { name: "Luxembourg", country: "Luxembourg", cityGroups: ["europe_capital"] },
  { name: "Valletta", country: "Malta", cityGroups: ["europe_capital"] },
  { name: "Chisinau", country: "Moldova", cityGroups: ["europe_capital"] },
  { name: "Monaco", country: "Monaco", cityGroups: ["europe_capital"] },
  { name: "Podgorica", country: "Montenegro", cityGroups: ["europe_capital"] },
  { name: "Amsterdam", country: "Netherlands", cityGroups: ["europe_capital"] },
  { name: "Skopje", country: "North Macedonia", cityGroups: ["europe_capital"] },
  { name: "Oslo", country: "Norway", cityGroups: ["europe_capital"] },
  { name: "Warsaw", country: "Poland", cityGroups: ["europe_capital"] },
  { name: "Lisbon", country: "Portugal", cityGroups: ["europe_capital"] },
  { name: "Bucharest", country: "Romania", cityGroups: ["europe_capital"] },
  { name: "Moscow", country: "Russia", cityGroups: ["europe_capital"] },
  { name: "San Marino", country: "San Marino", cityGroups: ["europe_capital"] },
  { name: "Belgrade", country: "Serbia", cityGroups: ["europe_capital"] },
  { name: "Bratislava", country: "Slovakia", cityGroups: ["europe_capital"] },
  { name: "Ljubljana", country: "Slovenia", cityGroups: ["europe_capital"] },
  { name: "Madrid", country: "Spain", cityGroups: ["europe_capital"] },
  { name: "Stockholm", country: "Sweden", cityGroups: ["europe_capital"] },
  { name: "Ankara", country: "Turkey", cityGroups: ["europe_capital"] },
  { name: "Kyiv", country: "Ukraine", cityGroups: ["europe_capital"] },
  { name: "London", country: "United Kingdom", cityGroups: ["europe_capital"] },
  { name: "Vatican City", country: "Vatican City", cityGroups: ["europe_capital"] },
];

const TEAM_NAMES_BY_CATEGORY: Record<TeamNameCategory, string[]> = {
  identity_city: [
    "Skyline",
    "Harbor",
    "Bay",
    "Bridges",
    "Towers",
    "Capitals",
    "Royals",
    "District",
    "Union",
    "Foundry",
    "Forge",
    "Railways",
    "Pioneers",
    "Settlers",
    "Frontier",
    "Highlands",
    "Peaks",
    "Glaciers",
    "Avalanche",
    "Stormfront",
    "Horizon",
    "Sunsets",
    "Aurora",
    "Comets",
    "Orbit",
    "Navigators",
    "Compass",
    "Voyagers",
    "Mariners",
    "Lighthouse",
    "Guardians",
    "Legacy",
    "Collective",
    "Alliance",
    "Syndicate",
    "Assembly",
    "Network",
    "Core",
    "Axis",
    "Summit",
  ],
  aggressive_competitive: [
    "Wolves",
    "Panthers",
    "Raptors",
    "Vipers",
    "Cobras",
    "Rhinos",
    "Bulls",
    "Titans",
    "Giants",
    "Warriors",
    "Raiders",
    "Outlaws",
    "Predators",
    "Hunters",
    "Reapers",
    "Phantoms",
    "Shadows",
    "Blitz",
    "Thunder",
    "Lightning",
    "Inferno",
    "Fury",
    "Havoc",
    "Chaos",
    "Rampage",
    "Warlords",
    "Crushers",
    "Breakers",
    "Ironclads",
    "Steel",
    "Juggernauts",
    "Renegades",
    "Dominators",
    "Enforcers",
    "Strikers",
    "Destroyers",
    "Gladiators",
    "Sentinels",
    "Marauders",
    "Berserkers",
  ],
  modern_sports: [
    "Pulse",
    "Surge",
    "Drive",
    "Shift",
    "Flux",
    "Prime",
    "Elite",
    "Apex",
    "Velocity",
    "Motion",
    "Impact",
    "Rise",
    "Ignite",
    "Nova",
    "Quantum",
    "Vertex",
    "Nexus",
    "CoreX",
    "Hyper",
    "Vortex",
  ],
  classic_sports: [
    "Eagles",
    "Falcons",
    "Hawks",
    "Lions",
    "Tigers",
    "Bears",
    "Sharks",
    "Knights",
    "Kings",
    "Dukes",
    "Rangers",
    "Chiefs",
    "Commanders",
    "Spartans",
    "Trojans",
    "Vikings",
    "Pirates",
    "Captains",
    "Generals",
    "Colonels",
  ],
};

function normalizeForSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeCityDedupeKey(value: string) {
  const normalizedName = normalizeForSlug(value);

  return CITY_CANONICAL_NAMES[normalizedName]
    ? normalizeForSlug(CITY_CANONICAL_NAMES[normalizedName])
    : normalizedName;
}

function mergeCityGroups(first: CityGroup[], second: CityGroup[]) {
  const groups = new Set([...first, ...second]);

  return CITY_GROUP_ORDER.filter((group) => groups.has(group));
}

function buildCities(rawCities: RawCity[]) {
  const cityMap = new Map<string, TeamIdentityCity>();

  rawCities.forEach((city) => {
    const key = normalizeCityDedupeKey(city.name);
    const canonicalName = CITY_CANONICAL_NAMES[normalizeForSlug(city.name)] ?? city.name;
    const existingCity = cityMap.get(key);

    if (existingCity) {
      cityMap.set(key, {
        ...existingCity,
        cityGroups: mergeCityGroups(existingCity.cityGroups, city.cityGroups),
      });
      return;
    }

    cityMap.set(key, {
      id: normalizeForSlug(canonicalName),
      name: canonicalName,
      country: city.country,
      cityGroups: mergeCityGroups([], city.cityGroups),
    });
  });

  return Array.from(cityMap.values()).sort((first, second) =>
    first.name.localeCompare(second.name, "de"),
  );
}

function buildTeamNames() {
  return TEAM_NAME_CATEGORIES.flatMap((category) =>
    TEAM_NAMES_BY_CATEGORY[category].map<TeamIdentityTeamName>((name) => ({
      id: normalizeForSlug(name),
      name,
      category,
    })),
  );
}

export const TEAM_IDENTITY_CITIES: TeamIdentityCity[] = buildCities(RAW_CITIES);
export const TEAM_IDENTITY_TEAM_NAMES: TeamIdentityTeamName[] = buildTeamNames();

export function getTeamNamesByCategory(category: TeamNameCategory) {
  return TEAM_IDENTITY_TEAM_NAMES.filter((teamName) => teamName.category === category);
}

export function isTeamNameCategory(value: unknown): value is TeamNameCategory {
  return (
    typeof value === "string" &&
    TEAM_NAME_CATEGORIES.includes(value as TeamNameCategory)
  );
}

export function resolveTeamIdentitySelection(
  selection: TeamIdentitySelection | null | undefined,
): ResolvedTeamIdentity | null {
  if (
    !selection ||
    typeof selection.cityId !== "string" ||
    typeof selection.teamNameId !== "string" ||
    !selection.cityId.trim() ||
    !selection.teamNameId.trim() ||
    !isTeamNameCategory(selection.category)
  ) {
    return null;
  }

  const city = TEAM_IDENTITY_CITIES.find((candidate) => candidate.id === selection.cityId);
  const teamName = TEAM_IDENTITY_TEAM_NAMES.find(
    (candidate) =>
      candidate.id === selection.teamNameId && candidate.category === selection.category,
  );

  if (!city || !teamName) {
    return null;
  }

  return {
    cityId: city.id,
    cityName: city.name,
    teamNameId: teamName.id,
    teamName: teamName.name,
    teamCategory: teamName.category,
    teamDisplayName: `${city.name} ${teamName.name}`,
  };
}

export function getTeamIdentityPreview(
  selection: TeamIdentitySelection | null | undefined,
) {
  return resolveTeamIdentitySelection(selection)?.teamDisplayName ?? "";
}
