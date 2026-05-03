"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SectionPanel } from "@/components/layout/section-panel";
import type { InboxTaskActionResult } from "@/app/app/savegames/[savegameId]/inbox/actions";

import type {
  InboxFilter,
  InboxItem,
  InboxState,
} from "./inbox-model";
import { InboxTaskControls } from "./inbox-task-controls";

type InboxListProps = {
  saveGameId: string;
  state: InboxState;
  updateTaskAction: (formData: FormData) => Promise<InboxTaskActionResult>;
};

const FILTERS: Array<{ label: string; value: InboxFilter }> = [
  { label: "Offen", value: "open" },
  { label: "Gelesen", value: "read" },
  { label: "Erledigt", value: "done" },
  { label: "Ausgeblendet", value: "hidden" },
  { label: "Alle", value: "all" },
];

function priorityClass(priority: InboxItem["priority"]) {
  if (priority === "critical") {
    return "border-rose-300/30 bg-rose-300/10 text-rose-100";
  }

  if (priority === "high") {
    return "border-amber-300/30 bg-amber-300/10 text-amber-100";
  }

  if (priority === "medium") {
    return "border-sky-300/30 bg-sky-300/10 text-sky-100";
  }

  return "border-white/10 bg-white/5 text-slate-200";
}

function categoryClass(category: InboxItem["category"]) {
  if (category === "Game") {
    return "text-emerald-200";
  }

  if (category === "Roster") {
    return "text-amber-100";
  }

  if (category === "Finance") {
    return "text-sky-100";
  }

  return "text-slate-300";
}

function statusLabel(status: InboxItem["status"]) {
  if (status === "done") {
    return "Erledigt";
  }

  if (status === "hidden") {
    return "Ausgeblendet";
  }

  if (status === "read") {
    return "Gelesen";
  }

  return "Offen";
}

function filterHref(saveGameId: string, filter: InboxFilter) {
  return `/app/savegames/${saveGameId}/inbox?filter=${filter}`;
}

export function InboxList({ saveGameId, state, updateTaskAction }: InboxListProps) {
  const [items, setItems] = useState(state.items);

  useEffect(() => {
    setItems(state.items);
  }, [state.items]);

  function updateOptimisticItem(taskKey: string, patch: Partial<InboxItem>) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.taskKey === taskKey
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  return (
    <SectionPanel
      title="Inbox / Aufgaben"
      description="Manager-Aufgaben mit Status, Prioritaet und direkter Aktion."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = state.activeFilter === filter.value;

          return (
            <Link
              key={filter.value}
              href={filterHref(saveGameId, filter.value)}
              aria-current={active ? "page" : undefined}
              className={[
                "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                active
                  ? "border-emerald-300/35 bg-emerald-300/12 text-emerald-50"
                  : "border-white/10 bg-black/10 text-slate-300 hover:bg-white/8 hover:text-white",
              ].join(" ")}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {state.isEmpty ? (
        <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/8 p-5">
          <p className="text-lg font-semibold text-emerald-50">Keine passenden Tasks</p>
          <p className="mt-2 text-sm text-emerald-50/80">
            Fuer den aktiven Filter gibt es keine Eintraege. Andere Filter bleiben oben erreichbar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className={`rounded-lg border border-white/10 p-5 ${
                item.status === "done" || item.status === "hidden"
                  ? "bg-white/[0.03] opacity-80"
                  : "bg-white/5"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-lg border px-2 py-1 text-xs font-semibold ${priorityClass(
                        item.priority,
                      )}`}
                    >
                      {item.priority}
                    </span>
                    <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${categoryClass(item.category)}`}>
                      {item.category}
                    </span>
                    <span className="rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-xs font-semibold text-slate-200">
                      {statusLabel(item.status)}
                    </span>
                    {item.priorityOverride ? (
                      <span className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-xs font-semibold text-amber-100">
                        manuell priorisiert
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                    {item.message}
                  </p>
                  <div className="mt-4">
                    <InboxTaskControls
                      item={item}
                      onOptimisticChange={updateOptimisticItem}
                      saveGameId={saveGameId}
                      state={state}
                      updateTaskAction={updateTaskAction}
                    />
                  </div>
                </div>
                <Link
                  href={item.href}
                  className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
                >
                  {item.actionLabel}
                </Link>
              </div>
            </article>
          ))}
          {state.hiddenCount > 0 ? (
            <div className="rounded-lg border border-white/8 bg-black/10 p-4 text-sm text-slate-300">
              {state.hiddenCount} weitere Task(s) im aktuellen Filter nicht angezeigt.
            </div>
          ) : null}
        </div>
      )}
    </SectionPanel>
  );
}
