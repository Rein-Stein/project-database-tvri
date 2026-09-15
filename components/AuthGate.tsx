"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isHydrated } = useAuth();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (isHydrated && !user && !isLoginPage) {
      router.replace("/login");
    }
  }, [isHydrated, isLoginPage, router, user]);

  if (isLoginPage) return <>{children}</>;

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-center">
        <div>
          <p className="font-semibold">Memverifikasi akses...</p>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">Mohon tunggu sebentar.</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}