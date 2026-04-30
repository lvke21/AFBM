"use client";

export const ONLINE_GLOSSARY = {
  gm: {
    label: "GM",
    description:
      "General Manager: du steuerst Kader, Training, Verträge und Wochenfreigabe deines Teams.",
  },
  owner: {
    label: "Owner",
    description:
      "Teambesitzer: bewertet deine Arbeit langfristig anhand sportlicher, finanzieller und strategischer Ziele.",
  },
  franchise: {
    label: "Franchise",
    description:
      "Dein gesamtes Team-Projekt: Kader, Stadion, Finanzen, Fans, Strategie und Entwicklung.",
  },
  depthChart: {
    label: "Depth Chart",
    description:
      "Positionsrangliste deines Teams: wer startet und wer als Ersatzspieler bereitsteht.",
  },
  starter: {
    label: "Starter",
    description:
      "Spieler, die auf ihrer Position zuerst eingesetzt werden und die meisten Snaps bekommen.",
  },
  backup: {
    label: "Backup",
    description:
      "Ersatzspieler hinter dem Starter. Backups sind wichtig bei Müdigkeit, Verletzungen und Rotation.",
  },
  salaryCap: {
    label: "Salary Cap",
    description:
      "Gehaltsobergrenze: maximale Summe, die dein Team für Spielerverträge nutzen darf.",
  },
  capHit: {
    label: "Cap Hit",
    description:
      "Teil eines Vertrags, der in dieser Saison gegen die Gehaltsobergrenze zählt.",
  },
  deadCap: {
    label: "Dead Cap",
    description:
      "Geld, das trotz Entlassung oder Trade weiter gegen die Gehaltsobergrenze zählt.",
  },
  signingBonus: {
    label: "Signing Bonus",
    description:
      "Einmaliger Vertragsbonus. Er kann Cap-Kosten erzeugen, auch wenn der Spieler später geht.",
  },
  freeAgent: {
    label: "Free Agent",
    description:
      "Verfügbarer Spieler ohne Team, den du verpflichten kannst, wenn Budget und Regeln passen.",
  },
  tradeBoard: {
    label: "Trade Board",
    description:
      "Bereich für Tauschgeschäfte mit anderen Teams: Spieler oder Picks anbieten und anfragen.",
  },
  draft: {
    label: "Draft",
    description:
      "Auswahl neuer Talente. Teams wählen nacheinander Prospects für ihren zukünftigen Kader.",
  },
  trainingFocus: {
    label: "Trainingsfokus",
    description:
      "Trainingsschwerpunkt der Woche, zum Beispiel Angriff, Defense, Erholung oder Entwicklung.",
  },
  intensity: {
    label: "Intensität",
    description:
      "Belastung im Training. Höhere Intensität kann kurzfristig helfen, erhöht aber Risiko und Müdigkeit.",
  },
  fatigue: {
    label: "Müdigkeit",
    description:
      "Müdigkeit deiner Spieler. Hohe Fatigue kann Leistung senken und Risiken erhöhen.",
  },
  injuryRisk: {
    label: "Verletzungsrisiko",
    description:
      "Verletzungsrisiko. Es steigt durch Belastung, Alter, harte Trainingswochen oder schlechte Erholung.",
  },
  prep: {
    label: "Spielvorbereitung",
    description:
      "Vorbereitungsbonus für die kommende Woche. Gute Vorbereitung kann kleine Spielvorteile geben.",
  },
  chemistry: {
    label: "Chemistry",
    description:
      "Team-Zusammenhalt. Gute Chemistry kann Abläufe stabilisieren, schlechte Chemistry kann bremsen.",
  },
  fanMood: {
    label: "Fan-Stimmung",
    description:
      "Stimmung der Fans. Sie reagiert auf Siege, Erwartungen, Preise und Teamrichtung.",
  },
  fanPressure: {
    label: "Fan-Druck",
    description:
      "Druck der Fans auf Team und Owner. Hoher Druck kann Erwartungen und Job-Sicherheit beeinflussen.",
  },
  ownerConfidence: {
    label: "Owner Confidence",
    description:
      "Vertrauen des Owners in deine Arbeit. Es verändert sich durch Ergebnisse, Ziele und Fan-Druck.",
  },
  readyState: {
    label: "Ready-State",
    description:
      "Dein Signal: Team und Woche sind für dich bereit. Danach wartest du auf andere Spieler oder den Admin.",
  },
  weekSimulation: {
    label: "Wochen-Simulation",
    description:
      "Wochenberechnung der Liga. Der Admin startet sie, danach werden die vorbereiteten Teams simuliert.",
  },
} as const;

export type OnlineGlossaryTerm = keyof typeof ONLINE_GLOSSARY;

export function GlossaryTerm({
  children,
  term,
}: {
  children?: React.ReactNode;
  term: OnlineGlossaryTerm;
}) {
  const entry = ONLINE_GLOSSARY[term];
  const label = children ?? entry.label;

  return (
    <span className="group relative inline-flex items-center gap-1 align-baseline">
      <span>{label}</span>
      <button
        type="button"
        aria-label={`${entry.label} erklären`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[11px] font-bold leading-none text-slate-200 outline-none transition hover:border-emerald-200/45 hover:bg-emerald-300/10 focus:border-emerald-200/60 focus:bg-emerald-300/12"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-7 z-20 hidden w-64 rounded-lg border border-white/15 bg-[#07111d] p-3 text-left text-xs font-medium normal-case leading-5 tracking-normal text-slate-100 shadow-xl shadow-black/40 group-focus-within:block group-hover:block"
      >
        <span className="block font-semibold text-white">{entry.label}</span>
        <span className="mt-1 block text-slate-300">{entry.description}</span>
      </span>
    </span>
  );
}
