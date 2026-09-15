import Link from "next/link";
import { Home, Search } from "lucide-react";

export const metadata = { title: "Halaman Tidak Ditemukan" };

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center sm:px-6">
      <p className="font-semibold text-[var(--accent)]">TVRI Kalimantan Timur</p>
      <h1 className="mt-2 text-[56px] font-semibold leading-none tracking-tight">404</h1>
      <h2 className="mt-2 text-[18px] font-semibold">Sinyal Tidak Ditemukan</h2>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[var(--muted-foreground)]">
        Halaman yang kamu cari tidak tersedia atau sudah dipindahkan. Seperti
        siaran yang terganggu — coba cari frekuensi lain.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link href="/" className="btn btn-primary">
          <Home size={14} /> Kembali ke Beranda
        </Link>
        <Link href="/narasumber" className="btn btn-outline">
          <Search size={14} /> Lihat Narasumber
        </Link>
      </div>
    </div>
  );
}