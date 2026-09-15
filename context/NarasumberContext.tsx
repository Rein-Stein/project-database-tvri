"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type {
  JadwalSiaran,
  JadwalStatus,
  LogAktivitas,
  Narasumber,
  RiwayatSiaran,
} from "../types";
import { getCurrentWaitingPeriodSetting, getLastAppearance, isJadwalSelesai, setClientWaitingPeriod, type WaitingPeriodSetting } from "../types";
import { loadDatabaseSnapshot, syncDatabaseSnapshot } from "@/lib/database";

interface NarasumberContextValue {
  narasumberList: Narasumber[];
  jadwalList: JadwalSiaran[];
  logList: LogAktivitas[];
  addNarasumber: (data: Omit<Narasumber, "id" | "riwayat" | "lastAppearance">) => Narasumber;
  updateNarasumber: (id: string, patch: Partial<Narasumber>) => void;
  removeNarasumber: (id: string) => void;
  /** Catat bahwa narasumber BENAR-BENAR sudah mengikuti siaran → buat riwayat baru + hitung ulang rotasi */
  catatSiaran: (id: string, data: Omit<RiwayatSiaran, "id">) => void;
  updateRiwayat: (id: string, riwayatId: string, patch: Partial<RiwayatSiaran>) => void;
  removeRiwayat: (id: string, riwayatId: string) => void;
  addJadwal: (data: Omit<JadwalSiaran, "id" | "status">) => JadwalSiaran;
  updateJadwal: (id: string, patch: Partial<JadwalSiaran>) => void;
  setJadwalStatus: (id: string, status: JadwalStatus, extra?: { tanggalBaru?: string }) => void;
  removeJadwal: (id: string) => void;
  /** Jadwal berlangsung → buat riwayat + mulai rotasi 3 bulan */
  tandaiJadwalTampil: (jadwalId: string) => void;
  addLog: (aksi: string, detail?: string) => void;
  resetKehadiran: (id: string) => void;
  resetToSampleData: () => void;
  /** Masa tunggu aktif dari MySQL (tabel settings) — source of truth bukan localStorage */
  waitingPeriod: WaitingPeriodSetting;
}

const NarasumberContext = createContext<NarasumberContextValue | null>(null);
const STORAGE_KEY = "tvri-kaltim-narasumber";
const JADWAL_KEY = "tvri-kaltim-jadwal";
const LOG_KEY = "tvri-kaltim-log";

const SEED_NARASUMBER: Narasumber[] = [
  {
    id: "n1",
    nama: "Dr. H. Muhammad Ridwan",
    bidang: "Kesehatan Masyarakat",
    instansi: "Dinas Kesehatan Kaltim",
    jabatan: "Kepala Bidang Kesmas",
    phone: "0812-3456-7890",
    lastAppearance: "2026-04-20",
    riwayat: [
      {
        id: "r101",
        tanggal: "2026-01-15",
        waktu: "08:30",
        program: "Dialog Pagi",
        topik: "Pencegahan DBD & Pola Hidup Bersih di Musim Hujan",
      },
      {
        id: "r102",
        tanggal: "2026-04-20",
        waktu: "09:00",
        program: "Kaltim Menyapa",
        topik: "Standarisasi Puskesmas Daerah Terpencil",
      },
    ],
  },
  {
    id: "n2",
    nama: "Siti Aisyah, S.E.",
    bidang: "Ekonomi & UMKM",
    instansi: "Dinas Koperasi & UKM Kaltim",
    jabatan: "Kasi Pemberdayaan Usaha",
    phone: "0813-9876-5432",
    lastAppearance: "2026-05-10",
    riwayat: [
      {
        id: "r201",
        tanggal: "2026-05-10",
        waktu: "10:30",
        program: "Beranda UMKM",
        topik: "Digitalisasi dan Strategi Ekspor Produk Lokal",
      },
    ],
  },
  {
    id: "n3",
    nama: "Ir. Bambang Sutrisno",
    bidang: "Lingkungan Hidup",
    instansi: "DLH Provinsi Kaltim",
    jabatan: "Koordinator Pengendalian Pencemaran",
    phone: "0852-1122-3344",
    lastAppearance: "2026-08-15",
    riwayat: [
      {
        id: "r301",
        tanggal: "2026-08-15",
        waktu: "09:00",
        program: "Dialog Khusus",
        topik: "Mitigasi Karhutla & Pencegahan Kabut Asap",
      },
    ],
  },
  {
    id: "n4",
    nama: "Prof. Dr. Ir. H. Ahmad Zaini",
    bidang: "Kehutanan & Tata Kota",
    instansi: "Universitas Mulawarman",
    jabatan: "Guru Besar Kehutanan",
    phone: "0811-2233-4455",
    lastAppearance: "2026-06-12",
    riwayat: [
      {
        id: "r401",
        tanggal: "2026-06-12",
        waktu: "10:00",
        program: "Wawasan Nusantara",
        topik: "Konservasi Keanekaragaman Hayati Koridor IKN",
      },
    ],
  },
  {
    id: "n5",
    nama: "AKBP Hendra Wijaya, S.I.K.",
    bidang: "Hukum & Kamtibmas",
    instansi: "Polda Kalimantan Timur",
    jabatan: "Kasubdit Kamsel Ditlantas",
    phone: "0812-9988-7766",
    lastAppearance: null,
    riwayat: [],
  },
  {
    id: "n6",
    nama: "Dra. Hj. Nurul Hidayah, M.Pd.",
    bidang: "Pendidikan & Kurikulum",
    instansi: "Dinas Pendidikan Kaltim",
    jabatan: "Pengawas Sekolah Menengah",
    phone: "0821-4455-6677",
    lastAppearance: null,
    riwayat: [],
  },
];

const SEED_JADWAL: JadwalSiaran[] = [
  {
    id: "j1",
    narasumberId: "n3",
    tanggal: "2026-08-15",
    waktu: "09:00",
    program: "Dialog Khusus",
    topik: "Mitigasi Karhutla & Pencegahan Kabut Asap",
    status: "sudah-tampil",
  },
  {
    id: "j2",
    narasumberId: "n2",
    tanggal: "2026-05-10",
    waktu: "10:30",
    program: "Beranda UMKM",
    topik: "Digitalisasi dan Strategi Ekspor Produk Lokal",
    status: "sudah-tampil",
  },
  {
    id: "j3",
    narasumberId: "n1",
    tanggal: "2026-09-05",
    waktu: "08:30",
    program: "Dialog Pagi",
    topik: "Layanan Kesehatan Terpadu Masyarakat Kaltim",
    status: "dijadwalkan",
  },
  {
    id: "j4",
    narasumberId: "n5",
    tanggal: "2026-09-08",
    waktu: "19:30",
    program: "Patroli Kaltim",
    topik: "Sosialisasi Keselamatan dan Tertib Berlalu Lintas",
    status: "dijadwalkan",
  },
];

const SEED_LOG: LogAktivitas[] = [
  {
    id: "log-seed-1",
    waktu: "2026-09-01T01:15:00.000Z",
    aktor: "Admin",
    aksi: "Buat jadwal: Dr. H. Muhammad Ridwan",
    detail: "Tanggal: 5 September 2026, Program: Dialog Pagi",
  },
  {
    id: "log-seed-2",
    waktu: "2026-08-15T09:45:00.000Z",
    aktor: "Admin",
    aksi: "Tandai sudah tampil: Ir. Bambang Sutrisno",
    detail: "Jadwal: j1, Tanggal: 15 Agustus 2026",
  },
];

/** Migrasi data lama: riwayat berupa string[] tanggal → RiwayatSiaran[] */
function migrate(raw: unknown): Narasumber[] {
  const list = Array.isArray(raw) ? (raw as Narasumber[]) : [];
  return list.map((n) => ({
    ...n,
    riwayat: ((n.riwayat || []) as unknown[]).map((r) =>
      typeof r === "string"
        ? { id: `mig-${n.id}-${r}`, tanggal: (r as string).slice(0, 10), program: "Siaran (data lama)" }
        : { ...(r as RiwayatSiaran), jenisSiaran: (r as RiwayatSiaran).jenisSiaran ?? "live" }
    ),
  }));
}

/** lastAppearance SELALU dihitung ulang dari riwayat agar tidak pernah tidak sinkron */
function recompute(listToRecompute: Narasumber[]): Narasumber[] {
  return listToRecompute.map((n) => ({ ...n, lastAppearance: getLastAppearance(n) }));
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function NarasumberProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Narasumber[]>([]);
  const [jadwalList, setJadwalList] = useState<JadwalSiaran[]>([]);
  const [logList, setLogList] = useState<LogAktivitas[]>([]);
  const [actor, setActor] = useState("Admin");
  const [databaseReady, setDatabaseReady] = useState(false);
  const [waitingPeriod, setWaitingPeriod] = useState<WaitingPeriodSetting>(getCurrentWaitingPeriodSetting());

  // Muat masa tunggu aktif dari MySQL (bukan localStorage). Semua halaman
  // (dashboard, daftar narasumber, modals) ikut ter-render ulang saat berubah.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.setting) return;
        const next = setClientWaitingPeriod(data.setting);
        setWaitingPeriod(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleWaitingPeriodChange = (event: Event) => {
      const detail = (event as CustomEvent<WaitingPeriodSetting>).detail;
      if (!detail) return;
      const next = setClientWaitingPeriod(detail);
      setWaitingPeriod(next);
    };
    window.addEventListener("tvri-waiting-period-changed", handleWaitingPeriodChange);
    return () => window.removeEventListener("tvri-waiting-period-changed", handleWaitingPeriodChange);
  }, []);

  // Jadwal yang waktunya sudah lewat dianggap benar-benar tampil otomatis.
  useEffect(() => {
    const completeDueSchedules = () => {
      const now = new Date();
      setJadwalList((prevJadwal) => {
        const dueSchedules = prevJadwal.filter(
          (jadwal) => jadwal.status === "dijadwalkan" && isJadwalSelesai(jadwal, now)
        );
        if (dueSchedules.length === 0) return prevJadwal;

        const dueIds = new Set(dueSchedules.map((jadwal) => jadwal.id));
        const nextJadwal = prevJadwal.map((jadwal) =>
          dueIds.has(jadwal.id) ? { ...jadwal, status: "sudah-tampil" as JadwalStatus } : jadwal
        );
        localStorage.setItem(JADWAL_KEY, JSON.stringify(nextJadwal));

        setList((prevList) => {
          const dueByNarasumber = new Map<string, JadwalSiaran[]>();
          for (const jadwal of dueSchedules) {
            const schedules = dueByNarasumber.get(jadwal.narasumberId) ?? [];
            schedules.push(jadwal);
            dueByNarasumber.set(jadwal.narasumberId, schedules);
          }
          const nextList = recompute(
            prevList.map((narasumber) => {
              const schedules = dueByNarasumber.get(narasumber.id);
              if (!schedules) return narasumber;
              return {
                ...narasumber,
                riwayat: [
                  ...(narasumber.riwayat || []),
                  ...schedules.map((jadwal) => ({
                    id: `jadwal-${jadwal.id}`,
                    tanggal: jadwal.tanggal,
                    waktu: jadwal.waktu,
                    program: jadwal.program,
                    jenisSiaran: jadwal.jenisSiaran ?? "live",
                    topik: jadwal.topik,
                    catatan: jadwal.catatan,
                  })),
                ],
              };
            })
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
          return nextList;
        });
        return nextJadwal;
      });
    };

    completeDueSchedules();
    const timer = window.setInterval(completeDueSchedules, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = recompute(migrate(JSON.parse(raw)));
        // Jika data lama kosong tanpa riwayat sama sekali, gunakan sample data
        const totalRiwayat = parsed.reduce((acc, n) => acc + (n.riwayat?.length || 0), 0);
        if (parsed.length <= 3 && totalRiwayat === 0) {
          const sampleRecomputed = recompute(SEED_NARASUMBER);
          setList(sampleRecomputed);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleRecomputed));
        } else {
          setList(parsed);
        }
      } else {
        const sampleRecomputed = recompute(SEED_NARASUMBER);
        setList(sampleRecomputed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleRecomputed));
      }
    } catch {
      setList(recompute(SEED_NARASUMBER));
    }

    const loadedJadwal = load<JadwalSiaran[]>(JADWAL_KEY, []);
    if (loadedJadwal.length === 0) {
      setJadwalList(SEED_JADWAL);
      localStorage.setItem(JADWAL_KEY, JSON.stringify(SEED_JADWAL));
    } else {
      setJadwalList(loadedJadwal.map((j) => ({ ...j, jenisSiaran: j.jenisSiaran ?? "live" })));
    }

    const loadedLog = load<LogAktivitas[]>(LOG_KEY, []);
    if (loadedLog.length === 0) {
      setLogList(SEED_LOG);
      localStorage.setItem(LOG_KEY, JSON.stringify(SEED_LOG));
    } else {
      setLogList(loadedLog);
    }

    try {
      const u = JSON.parse(localStorage.getItem("tvri-kaltim-user") || "null");
      if (u?.name) setActor(u.name);
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadDatabaseSnapshot()
      .then((snapshot) => {
        if (cancelled || !snapshot) return;
        const hasData = snapshot.narasumber.length > 0 || snapshot.jadwal.length > 0 || snapshot.log.length > 0;
        if (hasData) {
          setList(recompute(snapshot.narasumber));
          setJadwalList(snapshot.jadwal);
          setLogList(snapshot.log);
        }
        if (!cancelled) setDatabaseReady(true);
      })
      .catch((error) => {
        console.error("Supabase tidak dapat dimuat, memakai localStorage:", error);
      })

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!databaseReady || list.length === 0) return;
    syncDatabaseSnapshot({ narasumber: list, jadwal: jadwalList, log: logList }).catch((error) => {
      console.error("Perubahan belum tersinkron ke Supabase:", error);
    });
  }, [databaseReady, list, jadwalList, logList]);

  const persist = (next: Narasumber[]) => {
    setList(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const persistJadwal = (next: JadwalSiaran[]) => {
    setJadwalList(next);
    localStorage.setItem(JADWAL_KEY, JSON.stringify(next));
  };

  const addLog: NarasumberContextValue["addLog"] = useCallback(
    (aksi, detail) => {
      setLogList((prev) => {
        const entry: LogAktivitas = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          waktu: new Date().toISOString(),
          aktor: actor,
          aksi,
          detail,
        };
        const next = [entry, ...prev].slice(0, 200);
        localStorage.setItem(LOG_KEY, JSON.stringify(next));
        return next;
      });
    },
    [actor]
  );
  const addNarasumber: NarasumberContextValue["addNarasumber"] = useCallback((data) => {
    const baru: Narasumber = { ...data, id: `n${Date.now()}`, lastAppearance: null, riwayat: [] };
    setList((prev) => {
      const next = recompute([...prev, baru]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    return baru;
  }, []);

  const updateNarasumber: NarasumberContextValue["updateNarasumber"] = useCallback((id, patch) => {
    setList((prev) => {
      const next = recompute(prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeNarasumber: NarasumberContextValue["removeNarasumber"] = useCallback((id) => {
    setList((prev) => {
      const next = prev.filter((n) => n.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setJadwalList((prev) => {
      const next = prev.filter((j) => j.narasumberId !== id);
      localStorage.setItem(JADWAL_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /** Riwayat BARU ditambahkan — riwayat lama tidak ditimpa. lastAppearance dihitung ulang otomatis. */
  const catatSiaran: NarasumberContextValue["catatSiaran"] = useCallback((id, data) => {
    setList((prev) => {
      const next = recompute(
        prev.map((n) =>
          n.id === id
            ? { ...n, riwayat: [...(n.riwayat || []), { ...data, id: `r${Date.now()}` }] }
            : n
        )
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updateRiwayat: NarasumberContextValue["updateRiwayat"] = useCallback((id, riwayatId, patch) => {
    setList((prev) => {
      const next = recompute(
        prev.map((n) =>
          n.id === id
            ? { ...n, riwayat: n.riwayat.map((r) => (r.id === riwayatId ? { ...r, ...patch } : r)) }
            : n
        )
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeRiwayat: NarasumberContextValue["removeRiwayat"] = useCallback((id, riwayatId) => {
    setList((prev) => {
      const next = recompute(
        prev.map((n) => (n.id === id ? { ...n, riwayat: n.riwayat.filter((r) => r.id !== riwayatId) } : n))
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addJadwal: NarasumberContextValue["addJadwal"] = useCallback((data) => {
    const jadwal: JadwalSiaran = { ...data, id: `j${Date.now()}`, status: "dijadwalkan" };
    setJadwalList((prev) => {
      const next = [...prev, jadwal];
      localStorage.setItem(JADWAL_KEY, JSON.stringify(next));
      return next;
    });
    return jadwal;
  }, []);

  const updateJadwal: NarasumberContextValue["updateJadwal"] = useCallback((id, patch) => {
    setJadwalList((prev) => {
      const current = prev.find((j) => j.id === id);
      if (!current) return prev;
      const next = prev.map((j) => (j.id === id ? { ...j, ...patch } : j));
      const updated = next.find((j) => j.id === id)!;
      localStorage.setItem(JADWAL_KEY, JSON.stringify(next));

      setList((prevList) => {
        const withoutLinkedHistory = prevList.map((n) => ({
          ...n,
          riwayat: (n.riwayat || []).filter((r) => r.id !== `jadwal-${id}`),
        }));
        if (updated.status !== "sudah-tampil") {
          const recomputed = recompute(withoutLinkedHistory);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(recomputed));
          return recomputed;
        }

        const withUpdatedHistory = withoutLinkedHistory.map((n) =>
          n.id === updated.narasumberId
            ? {
                ...n,
                riwayat: [
                  ...(n.riwayat || []),
                  {
                    id: `jadwal-${id}`,
                    tanggal: updated.tanggal,
                    waktu: updated.waktu,
                    program: updated.program,
                    jenisSiaran: updated.jenisSiaran ?? "live",
                    topik: updated.topik,
                    catatan: updated.catatan,
                  },
                ],
              }
            : n
        );
        const recomputed = recompute(withUpdatedHistory);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recomputed));
        return recomputed;
      });
      return next;
    });
  }, []);

  const setJadwalStatus: NarasumberContextValue["setJadwalStatus"] = useCallback((id, status, extra) => {
    setJadwalList((prev) => {
      const next = prev.map((j) =>
        j.id === id
          ? {
              ...j,
              status,
              ...(extra?.tanggalBaru ? { tanggal: extra.tanggalBaru, tanggalBaru: extra.tanggalBaru } : {}),
            }
          : j
      );
      localStorage.setItem(JADWAL_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeJadwal: NarasumberContextValue["removeJadwal"] = useCallback((id) => {
    setJadwalList((prev) => {
      const next = prev.filter((j) => j.id !== id);
      localStorage.setItem(JADWAL_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /** "Tandai Sudah Tampil": jadwal → riwayat siaran → rotasi 3 bulan dimulai ulang */
  const tandaiJadwalTampil: NarasumberContextValue["tandaiJadwalTampil"] = useCallback((jadwalId) => {
    setJadwalList((prevJadwal) => {
      const target = prevJadwal.find((j) => j.id === jadwalId);
      if (!target) return prevJadwal;
      const nextJadwal = prevJadwal.map((j) =>
        j.id === jadwalId ? { ...j, status: "sudah-tampil" as JadwalStatus } : j
      );
      localStorage.setItem(JADWAL_KEY, JSON.stringify(nextJadwal));

      setList((prevList) => {
        const next = recompute(
          prevList.map((n) =>
            n.id === target.narasumberId
              ? {
                  ...n,
                  riwayat: [
                    ...(n.riwayat || []),
                    {
                      id: `jadwal-${jadwalId}`,
                      tanggal: target.tanggal,
                      waktu: target.waktu,
                      program: target.program,
                      jenisSiaran: target.jenisSiaran ?? "live",
                      topik: target.topik,
                      catatan: target.catatan,
                    },
                  ],
                }
              : n
          )
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      return nextJadwal;
    });
  }, []);

  const resetKehadiran: NarasumberContextValue["resetKehadiran"] = useCallback((id) => {
    setList((prev) => {
      const next = recompute(prev.map((n) => (n.id === id ? { ...n, riwayat: [] } : n)));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetToSampleData: NarasumberContextValue["resetToSampleData"] = useCallback(() => {
    const sample = recompute(SEED_NARASUMBER);
    setList(sample);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));

    setJadwalList(SEED_JADWAL);
    localStorage.setItem(JADWAL_KEY, JSON.stringify(SEED_JADWAL));

    setLogList(SEED_LOG);
    localStorage.setItem(LOG_KEY, JSON.stringify(SEED_LOG));
  }, []);

  const value: NarasumberContextValue = {
    narasumberList: list,
    waitingPeriod,
    jadwalList,
    logList,
    addNarasumber,
    updateNarasumber,
    removeNarasumber,
    catatSiaran,
    updateRiwayat,
    removeRiwayat,
    addJadwal,
    updateJadwal,
    setJadwalStatus,
    removeJadwal,
    tandaiJadwalTampil,
    addLog,
    resetKehadiran,
    resetToSampleData,
  };

  return <NarasumberContext.Provider value={value}>{children}</NarasumberContext.Provider>;
}

export function useNarasumber() {
  const ctx = useContext(NarasumberContext);
  if (!ctx) throw new Error("useNarasumber must be used within NarasumberProvider");
  return ctx;
}