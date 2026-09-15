"use client";

import { useState } from "react";
import { ChevronDown, Send } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { Button } from "@/components/Button";

const contactInfo = [
  { label: "Alamat", value: "Jl. P. Sari No. 1, Samarinda, Kalimantan Timur 75242" },
  { label: "Telepon", value: "(0541) 743243" },
  { label: "Email", value: "kaltim@tvri.co.id" },
  { label: "Jam Operasional", value: "Senin – Jumat, 08.00 – 16.00 WITA" },
];

const faqs = [
  {
    q: "Berapa lama jeda antar penampilan narasumber?",
    a: "Setiap narasumber dibatasi mengikuti siaran maksimal sekali dalam periode jeda yang diatur admin, dengan sistem menghitung otomatis sejak kehadiran terakhir yang dicatat admin.",
  },
  {
    q: "Bagaimana cara menjadi narasumber di TVRI Kaltim?",
    a: "Kirim data diri, bidang keahlian, dan instansi melalui formulir kontak ini dengan subjek 'Narasumber Baru'. Tim kami akan memverifikasi dan mendaftarkan Anda.",
  },
  {
    q: "Siapa yang dapat mengubah data narasumber?",
    a: "Hanya admin TVRI Kalimantan Timur yang telah login sebagai pegawai. Data nama, bidang, dan instansi dapat diperbarui melalui Panel Admin.",
  },
  {
    q: "Apa arti status 'Dalam Masa Tunggu' pada daftar narasumber?",
    a: "Status ini menandakan narasumber baru saja tampil dan masih berada dalam periode jeda sebelum dapat mengikuti siaran berikutnya. Sisa hari jeda ditampilkan pada baris tabel.",
  },
];

const CONTACT_MESSAGES_KEY = "tvri-kaltim-contact-messages";

export default function ContactPage() {
  const { showToast } = useToast();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Nama wajib diisi";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Email tidak valid";
    if (!form.subject.trim()) errs.subject = "Subjek wajib diisi";
    if (form.message.trim().length < 10) errs.message = "Pesan minimal 10 karakter";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast("Periksa kembali isian formulir", "error");
      return;
    }
    setSubmitting(true);
    try {
      const saved = JSON.parse(localStorage.getItem(CONTACT_MESSAGES_KEY) ?? "[]");
      saved.push({ ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
      localStorage.setItem(CONTACT_MESSAGES_KEY, JSON.stringify(saved));
      setForm({ name: "", email: "", subject: "", message: "" });
      showToast("Pesan tersimpan di perangkat ini.", "success");
    } catch {
      showToast("Pesan tidak dapat disimpan. Coba lagi.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="photo-page-shell">
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
      <header className="page-heading mb-8">
        <p className="section-label">Kontak resmi</p>
        <h1 className="mt-2 text-[26px] font-semibold">Hubungi TVRI Kalimantan Timur</h1>
        <p className="mt-1 text-[14px] text-[var(--muted-foreground)]">
          Gunakan informasi berikut untuk menghubungi stasiun atau kirim pesan melalui formulir.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside aria-label="Informasi kontak">
          <h2 className="section-label mb-3">Informasi kontak</h2>
          <dl>
            {contactInfo.map((info) => (
              <div key={info.label} className="info-row">
                <dt>{info.label}</dt>
                <dd>{info.value}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <section aria-label="Formulir kontak">
          <h2 className="section-label mb-3">Formulir kontak</h2>
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="ct-name" className="mb-1 block text-[12px] font-semibold">Nama</label>
                <input id="ct-name" value={form.name} onChange={set("name")} className="field-input" />
                {errors.name && <p className="mt-1 text-[12px] text-[var(--danger)]">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="ct-email" className="mb-1 block text-[12px] font-semibold">Email</label>
                <input id="ct-email" type="email" value={form.email} onChange={set("email")} className="field-input" />
                {errors.email && <p className="mt-1 text-[12px] text-[var(--danger)]">{errors.email}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="ct-subject" className="mb-1 block text-[12px] font-semibold">Subjek</label>
              <input id="ct-subject" value={form.subject} onChange={set("subject")} className="field-input" />
              {errors.subject && <p className="mt-1 text-[12px] text-[var(--danger)]">{errors.subject}</p>}
            </div>
            <div>
              <label htmlFor="ct-message" className="mb-1 block text-[12px] font-semibold">Pesan</label>
              <textarea id="ct-message" rows={5} value={form.message} onChange={set("message")} className="field-textarea" />
              {errors.message && <p className="mt-1 text-[12px] text-[var(--danger)]">{errors.message}</p>}
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                "Mengirim..."
              ) : (
                <>
                  <Send size={14} /> Kirim Pesan
                </>
              )}
            </Button>
          </form>
        </section>
      </div>

      <section id="faq" className="mt-8 scroll-mt-20" aria-label="Pertanyaan umum">
        <h2 className="mb-2 text-[14px] font-semibold">Pertanyaan Umum (FAQ)</h2>
        <div className="surface divide-y divide-[var(--border)]">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
                className="btn-focus flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[13px] font-semibold"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-[var(--muted-foreground)] transition-transform ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openFaq === i && (
                <p className="bg-[var(--muted)] px-4 py-3 text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}