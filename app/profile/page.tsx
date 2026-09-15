"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/Button";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated || !user) return null;

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10 sm:px-6">
      <header className="mb-5 border-b border-[var(--border)] pb-4">
        <p className="section-label">Akun administrator</p>
        <h1 className="mt-1 text-[20px] font-semibold">{user.name}</h1>
        <p className="text-[13px] text-[var(--muted-foreground)]">{user.email}</p>
        <p className="mt-2 inline-flex border border-[var(--border-strong)] px-2 py-0.5 text-[12px] font-semibold">
          Administrator TVRI Kaltim
        </p>
      </header>

      <section className="surface p-4 text-[13px] leading-relaxed">
        <p>
          Sebagai <b>administrator</b>, Anda dapat menambah, mengedit, menghapus
          data narasumber, mengatur jadwal, dan mencatat kehadiran siaran melalui Panel Admin.
        </p>
      </section>

      <div className="mt-4 space-y-2">
        <Button href="/admin" className="w-full">
          <ShieldCheck size={14} /> Buka Panel Admin
        </Button>
        <button
          onClick={() => {
            logout();
            router.push("/");
          }}
          className="btn btn-danger w-full"
        >
          <LogOut size={14} /> Keluar
        </button>
      </div>
    </div>
  );
}