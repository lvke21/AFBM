import type { LiveTimelineEntry, LiveTimelineHighlight } from "./live-simulation-model";

type EventDramaturgy = {
  badgeLabel: string;
  borderClass: string;
  eyebrow: string;
  momentDescription: string;
  momentTitle: string;
};

const TURNOVER_COPY = [
  "Ball weg. Das ist der Moment, in dem ein stabiler Drive ploetzlich zum Risiko wird.",
  "Fehler unter Druck. Jetzt zaehlt sofort, ob die Defense den Swing verwandelt.",
  "Possession kippt. Der naechste Drive bekommt ploetzlich mehr Gewicht.",
];

const TOUCHDOWN_COPY = [
  "Die Offense finished den Drive. Das Scoreboard bewegt sich spuerbar.",
  "Sieben Punkte als klare Antwort. Jetzt muss die Gegenseite reagieren.",
  "Der Drive endet mit maximalem Ertrag und veraendert den Rhythmus.",
];

const BIG_PLAY_COPY = [
  "Ein kurzer Ausbruch veraendert Field Position und Tempo.",
  "Explosivitaet im richtigen Moment. Die Defense muss sich neu sortieren.",
  "Der Drive bekommt durch den Raumgewinn ploetzlich Energie.",
];

const RED_ZONE_COPY = [
  "Das Feld wird eng. Jetzt entscheidet Execution statt nur Raumgewinn.",
  "Red Zone bedeutet Druck: Finish oder verschenkte Chance.",
  "Nahe der Endzone wird jeder Fehler teurer.",
];

const FIELD_GOAL_COPY = [
  "Nicht der volle Punch, aber Punkte. Der Druck bleibt auf dem Scoreboard.",
  "Der Drive bringt Zaehlbares und haelt das Spiel in Bewegung.",
  "Drei Punkte veraendern die Rechnung fuer die naechste Possession.",
];

const SACK_COPY = [
  "Die Defense setzt ein klares Stop-Signal und nimmt Tempo aus dem Drive.",
  "Druck kommt durch. Der Drive verliert sofort Rhythmus.",
  "Ein negativer Moment fuer die Offense, ein Atemzug fuer die Defense.",
];

function variation<T>(items: T[], sequence: number) {
  return items[Math.abs(sequence) % items.length] ?? items[0];
}

function highlightFallback(highlight: LiveTimelineHighlight) {
  return highlight.replaceAll("-", " ");
}

export function liveEventBadgeLabel(highlight: LiveTimelineHighlight) {
  if (highlight === "touchdown") {
    return "Touchdown Moment";
  }

  if (highlight === "turnover") {
    return "Game Changing Moment";
  }

  if (highlight === "field-goal") {
    return "Scoring Drive";
  }

  if (highlight === "big-gain") {
    return "Big Play";
  }

  if (highlight === "red-zone") {
    return "Red Zone Pressure";
  }

  if (highlight === "sack") {
    return "Critical Stop";
  }

  return "Drive";
}

export function liveEventBorderClass(highlight: LiveTimelineHighlight) {
  if (highlight === "touchdown") {
    return "border-emerald-300/60 bg-emerald-300/12 ring-1 ring-emerald-300/20";
  }

  if (highlight === "big-gain") {
    return "border-cyan-300/55 bg-cyan-300/10 ring-1 ring-cyan-300/15";
  }

  if (highlight === "turnover") {
    return "border-red-300/65 bg-red-300/12 ring-1 ring-red-300/25";
  }

  if (highlight === "field-goal" || highlight === "red-zone" || highlight === "sack") {
    return "border-amber-300/55 bg-amber-300/12 ring-1 ring-amber-300/18";
  }

  return "border-white/10 bg-black/15";
}

export function liveEventDramaturgy(entry: LiveTimelineEntry): EventDramaturgy {
  if (entry.highlight === "turnover") {
    return {
      badgeLabel: liveEventBadgeLabel(entry.highlight),
      borderClass: liveEventBorderClass(entry.highlight),
      eyebrow: "Critical Drive",
      momentDescription: variation(TURNOVER_COPY, entry.sequence),
      momentTitle: "Game Changing Moment",
    };
  }

  if (entry.highlight === "touchdown") {
    return {
      badgeLabel: liveEventBadgeLabel(entry.highlight),
      borderClass: liveEventBorderClass(entry.highlight),
      eyebrow: "Score Moment",
      momentDescription: variation(TOUCHDOWN_COPY, entry.sequence),
      momentTitle: "Touchdown Swing",
    };
  }

  if (entry.highlight === "big-gain") {
    return {
      badgeLabel: liveEventBadgeLabel(entry.highlight),
      borderClass: liveEventBorderClass(entry.highlight),
      eyebrow: "Explosive Play",
      momentDescription: variation(BIG_PLAY_COPY, entry.sequence),
      momentTitle: "Big Play Spark",
    };
  }

  if (entry.highlight === "red-zone") {
    return {
      badgeLabel: liveEventBadgeLabel(entry.highlight),
      borderClass: liveEventBorderClass(entry.highlight),
      eyebrow: "Finish Zone",
      momentDescription: variation(RED_ZONE_COPY, entry.sequence),
      momentTitle: "Red Zone Pressure",
    };
  }

  if (entry.highlight === "field-goal") {
    return {
      badgeLabel: liveEventBadgeLabel(entry.highlight),
      borderClass: liveEventBorderClass(entry.highlight),
      eyebrow: "Score Moment",
      momentDescription: variation(FIELD_GOAL_COPY, entry.sequence),
      momentTitle: "Points On The Board",
    };
  }

  if (entry.highlight === "sack") {
    return {
      badgeLabel: liveEventBadgeLabel(entry.highlight),
      borderClass: liveEventBorderClass(entry.highlight),
      eyebrow: "Critical Drive",
      momentDescription: variation(SACK_COPY, entry.sequence),
      momentTitle: "Drive Stop",
    };
  }

  return {
    badgeLabel: liveEventBadgeLabel(entry.highlight),
    borderClass: liveEventBorderClass(entry.highlight),
    eyebrow: "Drive Flow",
    momentDescription: `${entry.offenseTeamAbbreviation} versucht, Rhythmus und Feldposition aufzubauen.`,
    momentTitle: highlightFallback(entry.highlight),
  };
}
