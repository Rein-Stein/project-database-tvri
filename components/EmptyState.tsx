import Link from "next/link";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref = "/narasumber",
}: EmptyStateProps) {
  return (
    <div className="surface flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && (
        <div className="mb-1 text-[var(--muted-foreground)]">{icon}</div>
      )}
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <p className="max-w-sm text-[13px] text-[var(--muted-foreground)]">{description}</p>
      {actionLabel && (
        <Link href={actionHref} className="btn btn-outline mt-3">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}