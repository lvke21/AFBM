import type { ReactNode } from "react";

import { requirePageUserId } from "@/lib/auth/session";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePageUserId();

  return children;
}
