"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

/** Wrapper untuk halaman admin: hanya administrator yang boleh masuk. */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isHydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace("/login");
    }
  }, [isHydrated, user, router]);

  if (!isHydrated) {
    return (
      <div className="admin-photo-shell">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
          <p className="font-semibold">Memverifikasi sesi...</p>
          <p className="text-[13px] text-[var(--muted-foreground)]">Mohon tunggu sebentar.</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="admin-photo-shell">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
          <p className="font-semibold text-[var(--danger)]">Akses Ditolak</p>
          <p className="text-[13px] text-[var(--muted-foreground)]">
            Halaman ini hanya untuk admin TVRI Kaltim.
          </p>
        </div>
      </div>
    );
  }

  return <div className="admin-photo-shell">{children}</div>;
}