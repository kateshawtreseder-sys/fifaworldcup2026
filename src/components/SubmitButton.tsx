"use client";

import { useFormStatus } from "react-dom";

// Submit button that shows a pending/loading state while its form's server
// action runs. Must be rendered inside the <form>.
export function SubmitButton({
  children,
  pendingText = "Working…",
  className = "btn-primary",
  disabled = false,
  title,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={disabled || pending} title={title} aria-busy={pending}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
