import { useRef, useState } from "react";

export function useAdminPendingAction() {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const pendingActionRef = useRef<string | null>(null);

  function beginAdminAction(actionId: string) {
    if (pendingActionRef.current) {
      return false;
    }

    pendingActionRef.current = actionId;
    setPendingAction(actionId);

    return true;
  }

  function endAdminAction() {
    pendingActionRef.current = null;
    setPendingAction(null);
  }

  function hasPendingAdminAction() {
    return pendingActionRef.current !== null;
  }

  return {
    beginAdminAction,
    endAdminAction,
    hasPendingAdminAction,
    pendingAction,
  };
}
