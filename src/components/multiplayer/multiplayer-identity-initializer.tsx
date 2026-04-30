"use client";

import { useEffect } from "react";

import { ensureCurrentOnlineUser } from "@/lib/online/online-user-service";

export function MultiplayerIdentityInitializer() {
  useEffect(() => {
    ensureCurrentOnlineUser();
  }, []);

  return null;
}
