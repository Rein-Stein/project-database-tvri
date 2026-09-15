"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/narasumber", label: "Daftar Narasumber" },
  { href: "/program", label: "Program" },
  { href: "/about", label: "Tentang" },
  { href: "/contact", label: "Kontak" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    const updateDate = () => {
      setCurrentDate(
        new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Makassar",
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()) + " WITA"
      );
    };
    updateDate();
    const interval = window.setInterval(updateDate, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
    localStorage.setItem("tvri-kaltim-theme", isDark ? "dark" : "light");
  };

  const linkClass = (active: boolean) =>
    cn(
      "border-b-2 px-3 py-4 text-[13px] font-semibold transition-colors",
      active
        ? "border-[#f2c230] text-white"
        : "border-transparent text-white/70 hover:border-white/30 hover:text-white"
    );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#123d4b] bg-[#092735] text-white shadow-[0_8px_24px_rgba(4,30,42,0.18)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Beranda TVRI Kaltim">
          <Image src="/logo.svg" alt="Logo TVRI" width={44} height={28} />
          <span className="text-[14px] font-extrabold tracking-wide">
            TVRI <span className="text-[#f4c95d]">Kaltim</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClass(pathname === link.href)}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <Link
              href="/admin"
              className={linkClass(pathname?.startsWith("/admin") ?? false)}
            >
              Panel Admin
            </Link>
          )}
        </nav>

        <div className="hidden border-l border-white/15 pl-5 lg:block">
          <span className="whitespace-nowrap text-[10px] font-medium text-white/65">
            {currentDate || "Memuat waktu..."}
          </span>
        </div>
        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            aria-label="Ganti tema"
            className="btn-focus flex h-9 w-9 items-center justify-center rounded-[3px] text-white/70 hover:bg-white/10 hover:text-white"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {user ? (
            <>
              <Link
                href="/profile"
                aria-label="Profil"
                className="btn-focus hidden h-9 items-center px-3 text-[13px] font-semibold text-white/80 hover:bg-white/10 hover:text-white md:flex"
              >
                {user.name}
              </Link>
              <button
                onClick={logout}
                aria-label="Keluar"
                title={`Keluar (${user.name})`}
                className="btn-focus flex h-9 items-center gap-1.5 px-3 text-[13px] font-semibold text-white/75 hover:bg-white/10 hover:text-white"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </>
          ) : (
            <Link
              href="/admin"
              className="hidden !h-9 !border-[#f2c230] !bg-[#f2c230] !px-4 !text-[12px] !font-bold !text-[#102653] hover:!bg-[#ffd95c] sm:inline-flex"
            >
              <LogIn size={13} />
              Panel Admin
            </Link>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="btn-focus flex h-9 w-9 items-center justify-center rounded-[3px] text-white/80 hover:bg-white/10 md:hidden"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          className="border-t border-white/10 bg-[#102653] md:hidden"
          aria-label="Menu mobile"
        >
          <div className="space-y-1 px-6 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block rounded-xl px-3 py-2.5 text-[14px] font-semibold",
                  pathname === link.href
                    ? "bg-white/15 text-white"
                    : "text-white/75"
                )}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <Link
                href="/admin"
                className="block rounded-xl px-3 py-2.5 text-[14px] font-semibold text-white/75"
              >
                Panel Admin
              </Link>
            )}
            {!user && (
              <Link
                href="/admin"
                className="mt-2 block rounded-xl border border-[#f2c230] bg-[#f2c230] px-3 py-2.5 text-center text-[13px] font-bold text-[#102653]"
              >
                Panel Admin
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
