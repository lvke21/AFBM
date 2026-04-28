"use client";

type DraftErrorProps = {
  error: Error;
  reset: () => void;
};

export default function DraftError({ error, reset }: DraftErrorProps) {
  return (
    <section className="rounded-lg border border-rose-300/30 bg-rose-300/10 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-100">
        Draftdaten nicht geladen
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">Draft Screen nicht verfuegbar</h2>
      <p className="mt-2 text-sm text-rose-50">
        {error.message || "Beim Laden der Draftdaten ist ein Fehler aufgetreten."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-lg border border-rose-200/25 px-4 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-200/10"
      >
        Erneut laden
      </button>
    </section>
  );
}
