import Link from "next/link";

function getErrorMessage(error: string | undefined) {
  if (error === "invalid-code") {
    return "Der Admin-Code ist nicht korrekt.";
  }

  if (error === "not-configured") {
    return "Adminzugang ist noch nicht serverseitig konfiguriert.";
  }

  return null;
}

function safeNextPath(next: string | undefined) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/admin";
  }

  return next;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;
  const errorMessage = getErrorMessage(params.error);
  const nextPath = safeNextPath(params.next);

  return (
    <main className="min-h-screen bg-[#07111d] text-white">
      <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%),radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_32%)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl items-center">
          <section className="w-full rounded-lg border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/30">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
              Adminzugang
            </p>
            <h1
              className="mt-3 text-4xl font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Admin Control Center entsperren
            </h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Der Adminbereich ist vom normalen Online-GM-Zugang getrennt. Anonymous Auth
              reicht hier nicht aus.
            </p>

            <form className="mt-6 grid gap-4" action="/api/admin/login" method="post">
              <input type="hidden" name="next" value={nextPath} />
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-200">Admin-Code</span>
                <input
                  name="code"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="rounded-lg border border-white/10 bg-[#07111d] px-4 py-3 text-white outline-none focus:border-amber-200/60"
                />
              </label>
              <button
                type="submit"
                className="min-h-12 rounded-lg border border-amber-200/35 bg-amber-300/10 px-5 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-100/55 hover:bg-amber-300/16"
              >
                Admin öffnen
              </button>
            </form>

            {errorMessage ? (
              <div className="mt-4 rounded-lg border border-rose-200/25 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-100">
                {errorMessage}
              </div>
            ) : null}

            <Link
              href="/app/savegames"
              className="mt-5 inline-flex rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/8"
            >
              Zurück zum Hauptmenü
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
