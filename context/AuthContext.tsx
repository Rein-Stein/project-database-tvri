"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { UserProfile } from "@/types";

interface AuthContextValue {
  user: UserProfile | null;
  isHydrated: boolean;
  /** Login Admin/Operator TVRI. Divalidasi di server (bukan di browser). */
  login: (email: string, password?: string) => Promise<{ ok: boolean; message: string; user?: UserProfile }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login: AuthContextValue["login"] = useCallback(async (email, password = "") => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        return { ok: false, message: data.message ?? "Email atau password salah." };
      }
      setUser(data.user ?? null);
      return { ok: true, message: "Berhasil masuk.", user: data.user ?? undefined };
    } catch {
      return { ok: false, message: "Tidak dapat terhubung ke server." };
    }
  }, []);

  const logout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }, []);

  const value: AuthContextValue = { user, isHydrated, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
