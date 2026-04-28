import type { ReactNode } from "react";

type SectionPanelProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  tone?: "default" | "subtle" | "warning";
};

export function SectionPanel({
  title,
  description,
  actions,
  children,
  tone = "default",
}: SectionPanelProps) {
  const toneClass =
    tone === "warning"
      ? "border-amber-300/25 bg-amber-300/8"
      : tone === "subtle"
        ? "border-white/8 bg-white/4"
        : "glass-panel";

  return (
    <section className={`rounded-lg p-5 ${toneClass}`}>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {description ? <p className="mt-1 max-w-2xl text-sm text-slate-300">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
