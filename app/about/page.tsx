import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatWaitingPeriod, getCurrentWaitingPeriodSetting } from "@/types";

export const metadata = { title: "Tentang Kami" };

export default function AboutPage() {
  const waitingPeriodText = formatWaitingPeriod(getCurrentWaitingPeriodSetting());

  return (
    <div className="photo-page-shell">
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
      <header className="page-heading mb-8">
        <p className="section-label">Tentang sistem</p>
        <h1 className="mt-2 text-[26px] font-semibold sm:text-[30px]">TVRI Kalimantan Timur</h1>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-[var(--muted-foreground)]">
          Sistem Informasi Manajemen Narasumber Siaran untuk mendukung pencatatan,
          penjadwalan, dan pemerataan kesempatan tampil pada program TVRI Kaltim.
        </p>
      </header>

      <section className="mb-8 grid gap-8 border-b border-[var(--border)] pb-8 sm:grid-cols-2">
        <div>
          <h2 className="section-label mb-3">Identitas lembaga</h2>
          <dl>
            <div className="info-row">
              <dt>Lembaga</dt>
              <dd>LPP TVRI (Lembaga Penyiaran Publik)</dd>
            </div>
            <div className="info-row">
              <dt>Stasiun</dt>
              <dd>TVRI Kalimantan Timur — Samarinda</dd>
            </div>
            <div className="info-row">
              <dt>Alamat</dt>
              <dd>Jl. P. Sari No. 1, Samarinda, Kaltim 75242</dd>
            </div>
            <div className="info-row">
              <dt>Telepon</dt>
              <dd>(0541) 743243</dd>
            </div>
            <div className="info-row">
              <dt>Email</dt>
              <dd>kaltim@tvri.co.id</dd>
            </div>
          </dl>
        </div>
        <div>
          <h2 className="section-label mb-3">Tujuan sistem</h2>
          <p className="text-[13px] leading-relaxed text-[var(--foreground)]">
            Sistem Manajemen Narasumber Siaran TVRI Kaltim dibangun untuk
            memastikan keberagaman suara yang tampil pada program-program
            TVRI Kalimantan Timur, dengan tetap menjaga penjadwalan yang terukur
            dan dapat diaudit oleh admin.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-[18px] font-semibold">Cara kerja sistem</h2>
        <ol className="border-l border-[var(--border-strong)]">
          <li className="ml-3 border-b border-[var(--border)] py-2 pl-3">
            <span className="mr-2 font-semibold text-[var(--accent)]">1970</span>
            Admin mencatat data narasumber beserta bidang dan instansinya.
          </li>
          <li className="ml-3 border-b border-[var(--border)] py-2 pl-3">
            <span className="mr-2 font-semibold text-[var(--accent)]">2000-an</span>
            Setiap penampilan dicatat sebagai riwayat siaran baru.
          </li>
          <li className="ml-3 border-b border-[var(--border)] py-2 pl-3">
            <span className="mr-2 font-semibold text-[var(--accent)]">2019</span>
            Sistem menghitung masa jeda {waitingPeriodText.toLowerCase()} secara otomatis.
          </li>
          <li className="ml-3 py-2 pl-3">
            <span className="mr-2 font-semibold text-[var(--accent)]">2025</span>
            Tim menggunakan status dan jadwal untuk menyiapkan siaran berikutnya.
          </li>
        </ol>
      </section>

      <section id="ketentuan" className="mb-8 scroll-mt-20">
        <h2 className="mb-3 text-[18px] font-semibold">Ketentuan jeda narasumber</h2>
        <ol className="border-y border-[var(--border)] py-3 text-[13px] leading-relaxed">
          <li className="mb-2">
            <b>1. Batas Penampilan.</b> Narasumber hanya boleh mengikuti
            siaran maksimal satu kali dalam periode jeda yang diatur admin
            sejak penampilan terakhirnya.
          </li>
          <li className="mb-2">
            <b>2. Pencatatan Otomatis.</b> Setiap kehadiran yang dicatat admin
            akan otomatis menghitung ulang masa jeda sesuai pengaturan aktif
            sistem.
          </li>
          <li className="mb-2">
            <b>3. Status Narasumber.</b> Status &quot;Boleh Diundang&quot; berarti jeda
            telah terlewati; status &quot;Dalam Masa Tunggu&quot; berarti
            narasumber belum boleh tampil.
          </li>
          <li>
            <b>4. Pengelolaan Data.</b> Hanya admin TVRI Kaltim yang dapat
            menambah, mengedit, dan menghapus data narasumber.
          </li>
        </ol>
      </section>

      <section className="flex flex-col items-start justify-between gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-[14px] font-semibold">Siaran Lebih Beragam</h2>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            Dengan rotasi narasumber yang terjadwal, setiap siaran menghadirkan
            perspektif yang segar untuk masyarakat Kalimantan Timur.
          </p>
        </div>
        <Link href="/narasumber" className="btn btn-primary">
          Lihat Daftar Narasumber <ArrowRight size={14} />
        </Link>
      </section>
      </div>
    </div>
  );
}