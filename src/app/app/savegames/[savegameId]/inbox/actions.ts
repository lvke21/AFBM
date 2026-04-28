"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionErrorMessage, withActionFeedback } from "@/lib/actions/action-feedback";
import { requirePageUserId } from "@/lib/auth/session";
import type { InboxTaskOperation } from "@/modules/inbox/domain/inbox-task.types";
import { updateInboxTaskStateForUser } from "@/modules/inbox/application/inbox-task.service";

export type InboxTaskActionResult = {
  ok: boolean;
  message: string;
};

function normalizeOperation(value: FormDataEntryValue | null): InboxTaskOperation {
  if (
    value === "read" ||
    value === "done" ||
    value === "hide" ||
    value === "open" ||
    value === "priority" ||
    value === "reset-priority"
  ) {
    return value;
  }

  throw new Error("Unknown inbox task action");
}

async function updateInboxTaskFromFormData(formData: FormData) {
  const userId = await requirePageUserId();
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const taskKey = String(formData.get("taskKey") ?? "");
  const operation = normalizeOperation(formData.get("operation"));
  const priority = String(formData.get("priority") ?? "");

  await updateInboxTaskStateForUser({
    operation,
    priority,
    saveGameId,
    taskKey,
    userId,
  });

  revalidatePath(`/app/savegames/${saveGameId}/inbox`);

  return {
    operation,
    saveGameId,
  };
}

export async function updateInboxTaskOptimisticAction(
  formData: FormData,
): Promise<InboxTaskActionResult> {
  try {
    const { operation } = await updateInboxTaskFromFormData(formData);

    return {
      ok: true,
      message: successMessage(operation),
    };
  } catch (error) {
    return {
      ok: false,
      message: actionErrorMessage(error),
    };
  }
}

function inboxHref(saveGameId: string, filter: string | null) {
  const params = new URLSearchParams();

  if (filter) {
    params.set("filter", filter);
  }

  const query = params.toString();

  return query ? `/app/savegames/${saveGameId}/inbox?${query}` : `/app/savegames/${saveGameId}/inbox`;
}

function successMessage(operation: InboxTaskOperation) {
  if (operation === "done") {
    return "Task wurde erledigt.";
  }

  if (operation === "read") {
    return "Task wurde als gelesen markiert.";
  }

  if (operation === "hide") {
    return "Task wurde ausgeblendet.";
  }

  if (operation === "open") {
    return "Task ist wieder offen.";
  }

  if (operation === "priority") {
    return "Task-Prioritaet wurde aktualisiert.";
  }

  return "Task-Prioritaet wurde zurueckgesetzt.";
}

export async function updateInboxTaskAction(formData: FormData) {
  const saveGameId = String(formData.get("saveGameId") ?? "");
  const filter = String(formData.get("filter") ?? "open");
  const targetHref = inboxHref(saveGameId, filter);
  let redirectHref = targetHref;

  try {
    const result = await updateInboxTaskFromFormData(formData);

    redirectHref = withActionFeedback(targetHref, {
      impact: "Die Inbox bleibt gespeichert und wird sofort neu sortiert.",
      message: successMessage(result.operation),
      title: "Inbox aktualisiert",
      tone: "success",
    });
  } catch (error) {
    redirectHref = withActionFeedback(targetHref, {
      impact: "Der Task-Status wurde nicht veraendert.",
      message: actionErrorMessage(error),
      title: "Inbox-Aktion fehlgeschlagen",
      tone: "error",
    });
  }

  redirect(redirectHref);
}
