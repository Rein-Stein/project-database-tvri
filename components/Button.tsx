"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-[var(--accent)] text-white border border-[var(--accent)] hover:bg-[var(--accent-hover)] hover:border-[var(--accent-hover)]",
  secondary: "bg-[var(--success)] text-white border border-[var(--success)] hover:opacity-90",
  outline: "border border-[var(--border-strong)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--muted-foreground)]",
  ghost: "bg-transparent hover:bg-[var(--muted)]",
  danger: "bg-transparent text-[var(--danger)] border border-[var(--danger)] hover:bg-[var(--danger-muted)]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-[12px]",
  md: "h-9 px-4 text-[13px]",
  lg: "h-10 px-6 text-[14px]",
};

export function Button({
  variant = "primary",
  size = "md",
  href,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "btn-focus inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 rounded-[4px]",
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
