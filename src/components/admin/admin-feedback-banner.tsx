export type AdminFeedbackTone = "success" | "warning";

export function AdminFeedbackBanner({
  className = "mt-5",
  message,
  tone,
}: {
  className?: string;
  message: string | null;
  tone: AdminFeedbackTone;
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={`${className} rounded-lg border px-4 py-3 text-sm font-semibold ${
        tone === "success"
          ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
          : "border-amber-200/25 bg-amber-300/10 text-amber-100"
      }`}
    >
      {message}
    </div>
  );
}
