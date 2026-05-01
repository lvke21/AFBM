"use client";

import { getOnlineFirebaseAuth } from "@/lib/online/auth/online-auth";

export async function getFirebaseAdminActionHeaders() {
  const user = getOnlineFirebaseAuth().currentUser;

  if (!user) {
    throw new Error("Bitte melde dich mit deinem Firebase-Admin-Account an.");
  }

  const token = await user.getIdToken();

  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };
}
