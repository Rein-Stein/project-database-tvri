"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ExternalLink, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/Button";

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const { showToast } = useToast();
  const [isHydrated, setIsHydrated] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && user) {
      router.replace("/");
    }
  }, [isHydrated, user, router]);

  if (isHydrated && user) {
    return null;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    showToast(result.message, "success");
    window.location.href = "/";
  };

  return (
    <div className="photo-page-shell flex min-h-full items-start justify-center px-6 py-12 sm:px-8">
      <div className="surface w-full max-w-sm p-6">
      <header className="page-heading mb-6">
        <p className="section-label">Akses administrator</p>
        <h1 className="mt-2 text-[26px] font-semibold">Login Admin TVRI</h1>
        <p className="mt-2 text-[13px] text-[var(--muted-foreground)]">
          Masuk untuk mengelola data narasumber dan jadwal siaran TVRI Kalimantan Timur.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-[12px] font-medium">
            Email Admin
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@tvri.co.id"
            autoComplete="email"
            className="field-input"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-[12px] font-medium">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="field-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              className="btn-focus absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-[4px]"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-[var(--danger-muted)] px-3 py-2.5 text-[12px] text-[var(--danger)] rounded-[4px]">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          <LogIn size={14} /> {loading ? "Memverifikasi..." : "Masuk"}
        </Button>

        <div className="space-y-2 text-center text-[12px] text-[var(--muted-foreground)]">
          <p>Akses ini khusus administrator &amp; operator TVRI.</p>
          <p className="border-t border-[var(--border)] pt-2">
            <span className="font-medium text-[var(--foreground)]">Belum memiliki akun?</span>
            <br />
            Hubungi administrator untuk mendapatkan akun.
          </p>
          <a
            href={process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ? `https://wa.me/${process.env.NEXT_PUBLIC_ADMIN_WHATSAPP}` : "#"}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline inline-flex w-full justify-center"
            onClick={(event) => {
              if (!process.env.NEXT_PUBLIC_ADMIN_WHATSAPP) event.preventDefault();
            }}
            aria-disabled={!process.env.NEXT_PUBLIC_ADMIN_WHATSAPP}
          >
            <ExternalLink size={14} /> Hubungi via WhatsApp
          </a>
        </div>
      </form>
      </div>
    </div>
  );
}