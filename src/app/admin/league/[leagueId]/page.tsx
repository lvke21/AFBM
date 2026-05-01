import Link from "next/link";

import { AdminAuthGate } from "@/components/admin/admin-auth-gate";
import { AdminLeagueDetail } from "@/components/admin/admin-league-detail";

export default async function AdminLeagueDetailPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;

  return (
    <AdminAuthGate>
      <main className="min-h-screen bg-[#07111d] text-white">
        <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%),radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_32%)] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-6">
              <Link
                href="/admin"
                className="inline-flex rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/8"
              >
                Zurück zum Admin Hub
              </Link>
            </div>
            <AdminLeagueDetail leagueId={leagueId} />
          </div>
        </div>
      </main>
    </AdminAuthGate>
  );
}
