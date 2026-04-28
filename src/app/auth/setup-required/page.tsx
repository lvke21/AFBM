import Link from "next/link";

export default function AuthSetupRequiredPage() {
  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12">
        <section className="glass-panel w-full rounded-[2rem] p-8">
          <p className="eyebrow">Auth Setup Required</p>
          <h1
            className="mt-5 text-4xl font-semibold tracking-tight text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Die App ist absichtlich gesperrt, bis mindestens ein Auth-Provider
            konfiguriert ist.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">
            Fuer produktionsnahe Sicherheit gibt es keine stille Ersatzanmeldung mehr.
            Konfiguriere mindestens einen echten Auth-Provider ueber die
            Umgebungsvariablen in `.env`.
          </p>
          <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
            <p>`AUTH_GITHUB_ID` + `AUTH_GITHUB_SECRET`</p>
            <p className="mt-2">Der aktuelle Scaffold ist auf GitHub OAuth vorbereitet.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
            >
              Zur Startseite
            </Link>
            <Link
              href="/api/auth/signin"
              className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200"
            >
              Sign-In pruefen
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
