"use client";

import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  pendingLabel?: string;
  primaryAction?: boolean;
};

export function FormSubmitButton({
  children,
  disabled = false,
  pendingLabel = "Wird verarbeitet...",
  primaryAction = false,
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      type="submit"
      data-primary-action={primaryAction ? "true" : undefined}
      disabled={isDisabled}
      className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/16 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
