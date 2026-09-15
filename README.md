# TVRI Kaltim — Manajemen Narasumber Siaran

Sistem manajemen narasumber siaran TVRI Kalimantan Timur berbasis web. Dibangun dengan Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion, dan Lucide React.

## Fitur Utama

- **Dashboard Admin** — Statistik narasumber, jadwal siaran, rekomendasi, dan log aktivitas
- **Manajemen Narasumber** — Tambah, edit, catat siaran, dan hapus data narasumber
- **Jadwal Siaran** — Kelola jadwal dengan status: dijadwalkan, sudah tampil, dibatalkan, ditunda
- **Kalender Siaran** — Tampilan kalender interaktif dengan jadwal per tanggal
- **Laporan & Statistik** — Ringkasan data dengan grafik dan ekspor CSV
- **Sistem Rotasi 3 Bulan** — Pembatasan otomatis: narasumber hanya boleh tampil 1 kali setiap 3 bulan kalender
- **Autentikasi Admin** — Login khusus Admin TVRI untuk mengelola sistem
- **Audit Trail** — Log aktivitas admin tercatat otomatis

## Struktur Proyek

```
app/
├── page.tsx                    # Homepage dengan daftar narasumber
├── layout.tsx                  # Root layout dengan providers
├── narasumber/
│   ├── page.tsx               # Daftar narasumber (filter & search)
│   └── [id]/page.tsx          # Detail narasumber
├── admin/
│   ├── page.tsx               # Dashboard admin
│   ├── narasumber/page.tsx    # Manajemen narasumber (CRUD)
│   ├── jadwal/page.tsx        # Jadwal siaran
│   ├── kalender/page.tsx      # Kalender siaran
│   └── laporan/page.tsx       # Laporan & statistik
├── login/page.tsx             # Login Admin TVRI
├── profile/page.tsx           # Profil pengguna
├── about/page.tsx             # Tentang sistem
└── contact/page.tsx           # Kontak

components/
├── Navbar.tsx                  # Navigasi utama
├── Footer.tsx                  # Footer
├── StatusBadge.tsx             # Badge status narasumber
├── PageTransition.tsx          # Animasi transisi halaman
└── admin/
    ├── AdminGuard.tsx          # Proteksi halaman admin
    ├── AdminUI.tsx             # Komponen UI admin (nav, stat card, badge)
    ├── JadwalFormModal.tsx     # Form tambah/edit jadwal
    ├── NarasumberFormModal.tsx # Form tambah/edit narasumber
    └── CatatSiaranModal.tsx    # Modal catat siaran

context/
├── AuthContext.tsx             # Autentikasi & manajemen user
├── NarasumberContext.tsx       # State narasumber, jadwal, log
└── ToastContext.tsx            # Notifikasi toast

types/index.ts                  # Type definitions & helper functions
lib/utils.ts                    # Utility functions (cn)
```

## Sistem Rotasi 3 Bulan

Setiap narasumber dibatasi maksimal **1 kali tampil setiap 3 bulan kalender** (bukan 90 hari). Setelah tampil:
- Status otomatis berubah menjadi **"Dalam Masa Tunggu"**
- Masa tunggu = tanggal tampil + 3 bulan kalender
- Contoh: 31 Agustus + 3 bulan = 30 November (menangani overflow bulan)

## Konfigurasi Admin

| Role | Email | Password |
|------|-------|----------|
| Admin TVRI | sesuai `ADMIN_EMAIL` | isi sendiri di environment |

**Login sekarang divalidasi di server** (bukan di kode frontend). Password admin disimpan sebagai hash (bukan teks polos) di `.env.local`, dan sesi login memakai cookie httpOnly bertanda tangan. Isi semua credential melalui environment dan jangan commit file `.env.local`.

## Database MySQL XAMPP

1. Nyalakan Apache dan MySQL di XAMPP.
2. Buka phpMyAdmin lalu impor [database.sql](database.sql).
3. Salin `.env.example` menjadi `.env.local`.
4. Sesuaikan `DB_USER`, `DB_PASSWORD`, dan `DB_NAME` bila diperlukan.
5. Untuk Aiven MySQL, gunakan `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME=tvri_kaltim`, dan `DB_SSL=REQUIRED`; isi `DB_PASSWORD` hanya melalui environment.
6. Isi juga `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, dan `SESSION_SECRET` (lihat bagian "Ganti Password Admin").

Jika MySQL belum tersedia, aplikasi tetap berjalan memakai localStorage sebagai fallback. Jika MySQL aktif dan schema sudah diimpor, data disinkronkan melalui API `/api/database` (hanya admin yang login yang boleh menulis; membaca tetap terbuka untuk pengunjung).

## Ganti Password Admin

Password admin **tidak** ditulis di kode — disimpan sebagai hash di `.env.local`. Untuk mengganti:

1. Jalankan di terminal (di folder project):
   ```
   node scripts/hash-password.js "password-baru-kamu"
   ```
2. Salin hasilnya (format `salt:hash`), tempel ke `.env.local`:
   ```
   ADMIN_PASSWORD_HASH=<hasil-dari-langkah-1>
   ```
3. Bisa juga ganti `ADMIN_EMAIL` dan `ADMIN_NAME` di `.env.local` sesuai kebutuhan.
4. Restart server (`npm run dev` ulang) agar perubahan terbaca.

`SESSION_SECRET` di `.env.local` dipakai untuk menandatangani sesi login — biarkan nilainya acak dan panjang, jangan dibagikan, dan **wajib diganti** dengan nilai baru sebelum deploy ke server production (bisa generate dengan `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).

## Cara Menjalankan

1. Pasang dependensi: `npm install`
2. Jalankan server pengembangan: `npm run dev`
3. Buka `http://localhost:3000`

## Teknologi

- **Framework:** Next.js 14 (App Router)
- **UI:** React 18, Tailwind CSS, Framer Motion, Lucide React
- **Bahasa:** TypeScript
- **State Management:** React Context + localStorage
- **Storage:** localStorage (data persist di browser)

## Catatan

- Data aplikasi saat ini disimpan di localStorage browser — belum menggunakan backend/database bersama.
- Gunakan tombol "Muat Data Contoh" di dashboard admin untuk mengisi data sampel.
- Project ini dibuat untuk keperluan perkuliahan.
