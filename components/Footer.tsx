import Link from "next/link";

const columns = [
  {
    title: "Narasumber",
    links: [
      { href: "/narasumber", label: "Daftar Narasumber" },
      { href: "/program", label: "Laporan Program" },
      { href: "/narasumber?status=tersedia", label: "Siap Mengikuti Siaran" },
      { href: "/narasumber?status=dalam-jeda", label: "Sedang Dalam Jeda" },
    ],
  },
  {
    title: "Informasi",
    links: [
      { href: "/about", label: "Tentang Sistem" },
      { href: "/about#ketentuan", label: "Ketentuan Jeda Narasumber" },
      { href: "/contact", label: "Kontak" },
    ],
  },
  {
    title: "Pegawai",
    links: [
      { href: "/login", label: "Login Pegawai TVRI" },
      { href: "/profile", label: "Profil Saya" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-10 border-t border-white/10 bg-[#102653] text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 sm:px-8 sm:py-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <p className="text-[14px] font-bold tracking-wide">
            TVRI <span className="text-[#f2c230]">Kalimantan Timur</span>
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-white/65">
            Sistem manajemen narasumber siaran Televisi Republik Indonesia stasiun
            Kalimantan Timur, Samarinda.
          </p>
          <div className="mt-3 space-y-0.5 text-[11px] text-white/55">
            <p>Jl. P. Sari No. 1, Samarinda, Kaltim 75242</p>
            <p>(0541) 743243</p>
            <p>kaltim@tvri.co.id</p>
          </div>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#f2c230]">
              {col.title}
            </h3>
            <ul className="space-y-1.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-[12px] text-white/70 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-6 py-3 text-[11px] text-white/50 sm:px-8">
          © {new Date().getFullYear()} TVRI Kalimantan Timur. Hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}
