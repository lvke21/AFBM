"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { InboxTaskActionResult } from "@/app/app/savegames/[savegameId]/inbox/actions";
import type { PersistedInboxTaskStatus } from "@/modules/inbox/domain/inbox-task.types";
import type { InboxItem, InboxPriority, InboxState } from "./inbox-model";

type InboxTaskControlsProps = {
  item: InboxItem;
  onOptimisticChange: (taskKey: string, patch: Partial<InboxItem>) => void;
  saveGameId: string;
  state: InboxState;
  updateTaskAction: (formData: FormData) => Promise<InboxTaskActionResult>;
};

const PRIORITIES: InboxPriority[] = ["critical", "high", "medium", "low"];

const STATUS_ACTIONS: Array<{
  label: string;
  operation: "open" | "read" | "done";
  status: PersistedInboxTaskStatus;
}> = [
  { label: "Offen", operation: "open", status: "open" },
  { label: "Gelesen", operation: "read", status: "read" },
  { label: "Erledigt", operation: "done", status: "done" },
];

function actionButtonClass(active: boolean) {
  return [
    "inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition",
    active
      ? "border-emerald-300/35 bg-emerald-300/12 text-emerald-50"
      : "border-white/10 bg-white/5 text-white hover:bg-white/10",
  ].join(" ");
}

function operationPatch(operation: string): Partial<InboxItem> {
  const now = new Date();

  if (operation === "read") {
    return {
      completedAt: null,
      hiddenAt: null,
      readAt: now,
      status: "read",
    };
  }

  if (operation === "done") {
    return {
      completedAt: now,
      hiddenAt: null,
      readAt: now,
      status: "done",
    };
  }

  if (operation === "hide") {
    return {
      completedAt: null,
      hiddenAt: now,
      readAt: now,
      status: "hidden",
    };
  }

  return {
    completedAt: null,
    hiddenAt: null,
    readAt: null,
    status: "open",
  };
}

export function InboxTaskControls({
  item,
  onOptimisticChange,
  saveGameId,
  state,
  updateTaskAction,
}: InboxTaskControlsProps) {
  const router = useRouter();
  const [priority, setPriority] = useState(item.priority);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hidden = item.status === "hidden";

  useEffect(() => {
    setPriority(item.priority);
  }, [item.priority]);

  async function syncTask(
    operation: string,
    patch: Partial<InboxItem>,
    options: { priority?: InboxPriority; pendingKey?: string } = {},
  ) {
    const previousItem = item;
    const previousPriority = priority;
    const formData = new FormData();

    formData.set("saveGameId", saveGameId);
    formData.set("taskKey", item.taskKey);
    formData.set("operation", operation);
    formData.set("filter", state.activeFilter);

    if (options.priority) {
      formData.set("priority", options.priority);
    }

    setErrorMessage(null);
    setPendingKey(options.pendingKey ?? operation);
    onOptimisticChange(item.taskKey, patch);

    try {
      const result = await updateTaskAction(formData);

      if (!result.ok) {
        onOptimisticChange(item.taskKey, previousItem);
        setPriority(previousPriority);
        setErrorMessage(result.message);
        return;
      }

      router.refresh();
    } catch (error) {
      onOptimisticChange(item.taskKey, previousItem);
      setPriority(previousPriority);
      setErrorMessage(error instanceof Error ? error.message : "Inbox-Aktion fehlgeschlagen.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2" aria-label="Task status controls">
        {STATUS_ACTIONS.map((action) => {
          const active = item.status === action.status;
          const pending = pendingKey === action.operation;

          return (
            <button
              key={action.operation}
              type="button"
              disabled={active || pendingKey !== null}
              aria-disabled={active || pendingKey !== null}
              onClick={() => syncTask(action.operation, operationPatch(action.operation))}
              className={[
                actionButtonClass(active),
                active || pendingKey !== null ? "cursor-not-allowed opacity-65" : "",
              ].join(" ")}
            >
              {pending ? "Speichert..." : action.label}
            </button>
          );
        })}

        <button
          type="button"
          disabled={pendingKey !== null}
          aria-disabled={pendingKey !== null}
          onClick={() => syncTask(hidden ? "open" : "hide", operationPatch(hidden ? "open" : "hide"))}
          className={[
            "inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition",
            hidden
              ? "border-slate-300/25 bg-slate-300/10 text-slate-100"
              : "border-white/10 bg-black/10 text-slate-200 hover:bg-white/8",
            pendingKey !== null ? "cursor-not-allowed opacity-65" : "",
          ].join(" ")}
        >
          {pendingKey === "hide" || pendingKey === "open"
            ? "Speichert..."
            : hidden
              ? "Einblenden"
              : "Ausblenden"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`priority-${item.taskKey}`}>
          Prioritaet
        </label>
        <select
          id={`priority-${item.taskKey}`}
          name="priority"
          value={priority}
          disabled={pendingKey !== null}
          onChange={(event) => {
            const nextPriority = event.target.value as InboxPriority;
            setPriority(nextPriority);
            void syncTask(
              "priority",
              {
                priority: nextPriority,
                priorityOverride: nextPriority,
              },
              { pendingKey: "priority", priority: nextPriority },
            );
          }}
          className="min-h-9 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-65"
        >
          {PRIORITIES.map((priorityOption) => (
            <option key={priorityOption} value={priorityOption}>
              {priorityOption}
            </option>
          ))}
        </select>

        {item.priorityOverride ? (
          <button
            type="button"
            disabled={pendingKey !== null}
            aria-disabled={pendingKey !== null}
            onClick={() => {
              setPriority(item.basePriority);
              void syncTask("reset-priority", {
                priority: item.basePriority,
                priorityOverride: null,
              });
            }}
            className={[
              "inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/8",
              pendingKey !== null ? "cursor-not-allowed opacity-65" : "",
            ].join(" ")}
          >
            {pendingKey === "reset-priority" ? "Setzt zurueck..." : "Prioritaet zuruecksetzen"}
          </button>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-100">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
