"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, LogIn } from "lucide-react";
import { Button } from "@/components/Button";

export default function AccountManagementLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/account-management/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data.allowed) router.replace("/admin/users");
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/account-management/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setError(data.message ?? "Email atau password manajemen akun salah.");
        return;
      }
      router.replace("/admin/users");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-photo-shell flex min-h-full items-start justify-center px-6 py-12 sm:px-8">
      <div className="surface w-full max-w-sm p-6">
        <header className="page-heading mb-6">
          <p className="section-label">Akses terbatas</p>
          <h1 className="mt-2 text-[24px] font-semibold">Manajemen Akun</h1>
          <p className="mt-2 text-[13px] text-[var(--muted-foreground)]">
            Masukkan kredensial akun inti untuk mengelola akun pengguna.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium">Email akun inti</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field-input"
              autoComplete="username"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium">Password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field-input pr-10"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="btn-focus absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[4px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>

          {error && <div className="rounded-[4px] bg-[var(--danger-muted)] px-3 py-2.5 text-[12px] text-[var(--danger)]">{error}</div>}

          <Button type="submit" disabled={loading} className="w-full">
            <LogIn size={14} /> {loading ? "Memverifikasi..." : "Masuk ke Manajemen Akun"}
          </Button>

          <p className="flex items-center justify-center gap-1.5 border-t border-[var(--border)] pt-4 text-center text-[12px] text-[var(--muted-foreground)]">
            <KeyRound size={13} /> Akses ini hanya untuk akun inti.
          </p>
        </form>
      </div>
    </div>
  );
}
