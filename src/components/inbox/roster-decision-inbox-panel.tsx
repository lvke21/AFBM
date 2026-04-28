import Link from "next/link";

import type { RosterDecisionItem } from "./roster-decision-model";

type RosterDecisionInboxPanelProps = {
  decisions: RosterDecisionItem[];
};

function priorityClass(priority: RosterDecisionItem["priority"]) {
  if (priority === "critical") {
    return "border-rose-300/25 bg-rose-300/10 text-rose-100";
  }

  if (priority === "high") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  return "border-sky-300/25 bg-sky-300/10 text-sky-100";
}

export function RosterDecisionInboxPanel({ decisions }: RosterDecisionInboxPanelProps) {
  const topDecision = decisions[0] ?? null;
  const secondaryDecisions = decisions.slice(1);

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Roster Decision Inbox
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Priorisierte Kaderfragen</h2>
        </div>
        <span className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm font-semibold text-slate-200">
          {decisions.length}/3 aktiv
        </span>
      </div>

      {topDecision ? (
        <div className="mt-5 grid gap-3">
          <article className={`rounded-lg border p-4 ${priorityClass(topDecision.priority)}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">
                  Naechste Aktion
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">{topDecision.title}</h3>
                <p className="mt-2 text-sm text-slate-100">{topDecision.cause}</p>
                <p className="mt-1 text-xs text-slate-200/80">{topDecision.affectedLabel}</p>
              </div>
              <Link
                href={topDecision.href}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/20 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                {topDecision.actionLabel}
              </Link>
            </div>
          </article>

          {secondaryDecisions.map((decision) => (
            <article key={decision.id} className="rounded-lg border border-white/8 bg-black/10 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{decision.title}</h3>
                    <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${priorityClass(decision.priority)}`}>
                      {decision.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{decision.cause}</p>
                  <p className="mt-1 text-xs text-slate-500">{decision.affectedLabel}</p>
                </div>
                <Link
                  href={decision.href}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
                >
                  {decision.actionLabel}
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-emerald-300/20 bg-emerald-300/8 p-4 text-sm text-emerald-50">
          Keine akuten Roster-Entscheidungen.
        </div>
      )}
    </section>
  );
}
