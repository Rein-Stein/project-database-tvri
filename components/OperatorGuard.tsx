"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

export function OperatorGuard({ children }: { children: ReactNode }) {
  const { user, isHydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated && !user) router.replace("/login");
  }, [isHydrated, user, router]);

  if (!isHydrated) return <div className="admin-photo-shell"><div className="flex min-h-[50vh] items-center justify-center text-[13px]">Memverifikasi sesi...</div></div>;
  if (!user || (user.role !== "admin" && user.role !== "operator")) return <div className="admin-photo-shell"><div className="flex min-h-[50vh] items-center justify-center text-[13px] text-[var(--danger)]">Akses Ditolak</div></div>;
  return <div className="admin-photo-shell">{children}</div>;
}
