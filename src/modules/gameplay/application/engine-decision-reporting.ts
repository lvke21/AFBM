export type EngineDecisionStage =
  | "PLAY_CALL"
  | "PASS_PROTECTION"
  | "QB_DECISION"
  | "RECEIVER_MATCHUP"
  | "RUN_LANE"
  | "CHEMISTRY"
  | "COACH_MOMENTUM";

export type EngineDecisionDetail = {
  label: string;
  value: string;
  explanation: string;
};

export type EngineDecisionExplanation = {
  playNumber: number;
  title: string;
  stage: EngineDecisionStage;
  userSummary: string;
  footballReason: string;
  developerDetails: EngineDecisionDetail[];
};

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildEngineDecisionExamples(): EngineDecisionExplanation[] {
  return [
    {
      playNumber: 1,
      title: "Coordinator waehlt Quick Pass gegen Blitz-Anzeichen",
      stage: "PLAY_CALL",
      userSummary:
        "Der Offensive Coordinator erwartet Druck und bevorzugt einen schnellen Pass statt eines tiefen Dropbacks.",
      footballReason:
        "Down & Distance erlauben einen kurzen, sicheren Wurf. Der Gameplan schuetzt den Quarterback gegen starken Pass Rush.",
      developerDetails: [
        {
          label: "Play Call",
          value: "Quick Stick",
          explanation: "Kurzes Timing-Konzept mit schneller Ballabgabe.",
        },
        {
          label: "Defense Call",
          value: "Fire Zone",
          explanation: "Defense bringt Druck, laesst aber Zone-Spieler dahinter.",
        },
        {
          label: "Gameplan/Coordinator",
          value: "Fast Release + hoher Screen/Quick-vs-Blitz Wert",
          explanation: "Der Coordinator-Modifier hebt schnelle Antworten gegen Blitz sichtbar an.",
        },
      ],
    },
    {
      playNumber: 2,
      title: "Blocker vs Rusher erzeugt stabile Pocket",
      stage: "PASS_PROTECTION",
      userSummary:
        "Fuenf Blocker halten vier Rusher sauber auf. Der QB bekommt genug Zeit fuer kurze und mittlere Routen.",
      footballReason:
        "Die Offense hat numerischen Vorteil und gute Pass-Blocking-Werte; Double-Team-Hilfe reduziert Druck.",
      developerDetails: [
        {
          label: "Blocker vs Rusher",
          value: "5 vs 4",
          explanation: "Ein zusaetzlicher Blocker kann helfen, den gefaehrlichsten Rusher zu kontrollieren.",
        },
        {
          label: "Pressure Level",
          value: "Niedrig",
          explanation: "Druck ist moeglich, aber nicht der wahrscheinlichste Ausgang.",
        },
        {
          label: "Chemistry Modifier",
          value: "O-Line leicht positiv",
          explanation: "Wiederkehrende Lineups geben kleine Boni, keine dominanten Haupt-Ratings.",
        },
      ],
    },
    {
      playNumber: 3,
      title: "Open Blitz Lane zwingt fruehe QB-Entscheidung",
      stage: "QB_DECISION",
      userSummary:
        "Die Defense bringt mehr Rusher als Blocker. Der QB muss frueher werfen oder ausweichen.",
      footballReason:
        "Ein freier Druckkanal verkuerzt die Decision Time. Tiefe Routen sind noch nicht voll entwickelt.",
      developerDetails: [
        {
          label: "Blocker vs Rusher",
          value: "5 vs 6",
          explanation: "Ein unaufgenommener Rusher erhoeht Open-Blitz-Lane-Risiko.",
        },
        {
          label: "QB Decision Time",
          value: "Kurz",
          explanation: "Nur Quick/Short Targets sind verlaesslich verfuegbar.",
        },
        {
          label: "Verfuegbare Targets",
          value: "Flat, Slant",
          explanation: "Medium/Deep Routen brauchen mehr Entwicklungszeit.",
        },
      ],
    },
    {
      playNumber: 4,
      title: "QB waehlt das sichere Target",
      stage: "RECEIVER_MATCHUP",
      userSummary:
        "Der QB liest Coverage und Druck sauber und nimmt den besser verfuegbaren Receiver.",
      footballReason:
        "Decision Making, Awareness und Command senken das Risiko, den Ball in schlechte Coverage zu werfen.",
      developerDetails: [
        {
          label: "Gewaehltes Target",
          value: "Slot Receiver auf kurzer Route",
          explanation: "Target Selection bevorzugt entwickelte Routen mit Separation und geringerem Risiko.",
        },
        {
          label: "Separation Result",
          value: "Leichter Vorteil Offense",
          explanation: "Route Running und Separation schlagen die Coverage knapp.",
        },
        {
          label: "Pressure Modifier",
          value: "Kleiner Malus",
          explanation: "Druck reduziert Passqualitaet, macht den Wurf aber nicht automatisch schlecht.",
        },
      ],
    },
    {
      playNumber: 5,
      title: "Press Coverage stoert Quick Timing",
      stage: "RECEIVER_MATCHUP",
      userSummary:
        "Der Corner gewinnt am Release-Punkt und stoert das Timing der schnellen Route.",
      footballReason:
        "Press vs Release verschiebt das Route-Fenster. Der Pass kann trotzdem ankommen, aber die Catch Window wird enger.",
      developerDetails: [
        {
          label: "Press Result",
          value: "Press Win",
          explanation: "DB Press besiegt WR Release in der Pre-Route-Phase.",
        },
        {
          label: "Separation Result",
          value: "Reduziert",
          explanation: "Timing Disruption verringert den Abstand am Catch Point.",
        },
        {
          label: "Outcome",
          value: "Pass Breakup moeglich",
          explanation: "Starke Coverage und Ball Skills erhoehen PBU/INT-Anteile.",
        },
      ],
    },
    {
      playNumber: 6,
      title: "Outside Run profitiert von Perimeter-Blocks",
      stage: "RUN_LANE",
      userSummary:
        "Die Offense laeuft nach aussen und bekommt Hilfe von Tight End und Wide Receiver.",
      footballReason:
        "Outside-Runs zaehlen Perimeter-Blocker nur, wenn das Konzept sie wirklich nutzt.",
      developerDetails: [
        {
          label: "Run Lane Quality",
          value: "Gut",
          explanation: "Blocker-Vorteil und schneller RB erzeugen Open-Lane-Chance.",
        },
        {
          label: "Blocker vs Box Defender",
          value: "Vorteil Offense",
          explanation: "Defense hat nicht genug Box-Spieler am Point of Attack.",
        },
        {
          label: "Yardage Impact",
          value: "Positive Erwartung",
          explanation: "Lane Quality hebt erwartete Yards leicht an.",
        },
      ],
    },
    {
      playNumber: 7,
      title: "Run Blitz stoppt Inside Run",
      stage: "RUN_LANE",
      userSummary:
        "Die Defense erkennt den Inside Run und bringt einen zusaetzlichen Box Defender.",
      footballReason:
        "Defensive Ueberzahl plus Block Shedding erhoeht Stuffed Risk und negative Yardage Risk.",
      developerDetails: [
        {
          label: "Run Lane Quality",
          value: "Schwach",
          explanation: "Blocker Advantage kippt zur Defense.",
        },
        {
          label: "Stuffed Risk",
          value: "Erhoeht",
          explanation: "Mehr Box Defender und gute Run Defense machen ein kurzes Play wahrscheinlicher.",
        },
        {
          label: "RB Creation",
          value: "Noetig",
          explanation: "Der RB kann mit Vision/Elusiveness noch etwas retten, aber nicht automatisch.",
        },
      ],
    },
    {
      playNumber: 8,
      title: "QB-WR Chemistry oeffnet Catch Window leicht",
      stage: "CHEMISTRY",
      userSummary:
        "Ein eingespieltes QB-WR-Duo bekommt einen kleinen Timing-Vorteil.",
      footballReason:
        "Gemeinsame Snaps verbessern Timing und Target-Vertrauen, ohne schlechte Ratings zu ueberschreiben.",
      developerDetails: [
        {
          label: "Chemistry Modifier",
          value: "QB-WR leicht positiv",
          explanation: "Route Timing, Target Selection und Catch Window werden minimal verbessert.",
        },
        {
          label: "Grenze",
          value: "Kein Haupt-Rating",
          explanation: "Sehr hohe Chemistry gibt kleine Vorteile, keine Superkraefte.",
        },
      ],
    },
    {
      playNumber: 9,
      title: "DB Chemistry hilft bei Zone-Uebergaben",
      stage: "CHEMISTRY",
      userSummary:
        "Eine eingespielte Secondary uebergibt Routen sauberer und bekommt bessere Safety-Hilfe.",
      footballReason:
        "DB Chemistry verbessert Coverage Support, Zone Handoff und Safety Help leicht.",
      developerDetails: [
        {
          label: "Chemistry Modifier",
          value: "DB leicht positiv",
          explanation: "Coverage-Werte werden nicht ersetzt, nur situativ unterstuetzt.",
        },
        {
          label: "Separation Result",
          value: "Engeres Fenster",
          explanation: "Mehr Support kann Separation und Completion-Wahrscheinlichkeit reduzieren.",
        },
      ],
    },
    {
      playNumber: 10,
      title: "Head Coach stabilisiert nach Turnover",
      stage: "COACH_MOMENTUM",
      userSummary:
        "Nach einem Ballverlust verhindert ein guter Head Coach eher eine Fehlerkette.",
      footballReason:
        "Motivation, Stability, Big Picture, Risk Control und Discipline wirken nur als kleine Fokus- und Disziplin-Modifier.",
      developerDetails: [
        {
          label: "Coach/Momentum Event",
          value: "Interception im vorherigen Drive",
          explanation: "Negatives Event erhoeht Error-Chain-Risk.",
        },
        {
          label: "HC Situation Modifier",
          value: "Stabilisierung",
          explanation: "Guter HC reduziert Collapse-Gefahr, dreht aber nicht magisch das Spiel.",
        },
      ],
    },
  ];
}

export function buildEngineDecisionSummary(explanations = buildEngineDecisionExamples()) {
  return {
    examples: explanations,
    hasExamples: explanations.length > 0,
    developerDebugAvailable: explanations.every(
      (example) => example.developerDetails.length > 0,
    ),
    userReadable: explanations.every(
      (example) => example.userSummary.length > 24 && example.footballReason.length > 24,
    ),
  };
}

export function renderEngineDecisionReportHtml(
  explanations = buildEngineDecisionExamples(),
) {
  const rows = explanations
    .map(
      (example) => `<tr>
        <td>${example.playNumber}</td>
        <td>${escapeHtml(example.title)}</td>
        <td>${escapeHtml(example.stage)}</td>
        <td>${escapeHtml(example.userSummary)}</td>
        <td>${escapeHtml(example.footballReason)}</td>
      </tr>`,
    )
    .join("");
  const details = explanations
    .map(
      (example) => `<section>
        <h3>Play ${example.playNumber}: ${escapeHtml(example.title)}</h3>
        <p>${escapeHtml(example.userSummary)}</p>
        <table>
          <thead><tr><th>Anzeige</th><th>Wert</th><th>Erklaerung</th></tr></thead>
          <tbody>${example.developerDetails
            .map(
              (detail) => `<tr>
                <td>${escapeHtml(detail.label)}</td>
                <td>${escapeHtml(detail.value)}</td>
                <td>${escapeHtml(detail.explanation)}</td>
              </tr>`,
            )
            .join("")}</tbody>
        </table>
      </section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Neue Engine Entscheidungen - Report</title>
  <style>
    body { margin: 0; background: #f5f7f6; color: #172126; font-family: Inter, system-ui, sans-serif; line-height: 1.5; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 20px 56px; }
    h1 { margin: 0; font-size: 32px; }
    h2 { margin-top: 32px; font-size: 22px; }
    h3 { margin-top: 24px; font-size: 17px; }
    p { color: #5d696d; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; background: #fff; border: 1px solid #d8dfdc; }
    th, td { padding: 10px; border-bottom: 1px solid #d8dfdc; text-align: left; vertical-align: top; font-size: 13px; }
    th { background: #edf2ef; color: #5d696d; text-transform: uppercase; font-size: 12px; }
    .note { border: 1px solid #d8dfdc; background: #fff; border-radius: 8px; padding: 14px; }
  </style>
</head>
<body>
  <main>
    <h1>Neue Engine Entscheidungen im Game Report</h1>
    <p class="note">Dieser Bericht erklaert die neuen Engine-Entscheidungen fuer Anwender und Entwickler. Er nutzt bewusst klare Football-Sprache statt rohe Debug-Zahlen ohne Kontext.</p>
    <h2>Uebersicht</h2>
    <table>
      <thead><tr><th>#</th><th>Play</th><th>Bereich</th><th>Anwender-Erklaerung</th><th>Warum es passiert</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h2>10 Beispiel-Plays mit Entwicklerdetails</h2>
    ${details}
    <h2>Hinweis zur GUI</h2>
    <p>Der normale Game Report soll diese Informationen zusammenfassen. Der Developer Debug Mode darf die Detailtabellen zeigen. Dadurch bleibt die GUI lesbar und Entwickler bekommen trotzdem genug Evidenz.</p>
  </main>
</body>
</html>`;
}
