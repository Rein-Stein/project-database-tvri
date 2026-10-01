"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSubNav } from "@/components/admin/AdminUI";
import { formatDate, formatDateTime, JADWAL_LABEL, type ChangeRequest, type JadwalStatus } from "@/types";
import { useNarasumber } from "@/context/NarasumberContext";
import { useToast } from "@/context/ToastContext";

const statusLabel = { pending: "Menunggu Persetujuan", approved: "Disetujui", rejected: "Ditolak" } as const;
const narasumberFields = [["nama", "Nama"], ["bidang", "Bidang"], ["instansi", "Instansi"], ["jabatan", "Jabatan"], ["phone", "Telepon"]] as const;
const jadwalFields = [["narasumberId", "Narasumber"], ["tanggal", "Tanggal"], ["waktu", "Waktu"], ["program", "Program"], ["jenisSiaran", "Jenis Siaran"], ["topik", "Topik"], ["catatan", "Catatan"], ["status", "Status"], ["tanggalBaru", "Tanggal Baru"]] as const;

function requestTypeLabel(entityType: ChangeRequest["entityType"]): string {
  if (entityType === "narasumber_create") return "Tambah Narasumber";
  if (entityType === "jadwal_siaran_create") return "Tambah Jadwal";
  if (entityType === "jadwal_siaran_update") return "Edit Jadwal";
  return "Edit Narasumber";
}

export default function ApprovalPage() {
  return <AdminGuard><ApprovalContent /></AdminGuard>;
}

function ApprovalContent() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reasonId, setReasonId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const { narasumberList } = useNarasumber();
  const { showToast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/change-requests", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setRequests(data.requests);
      })
      .catch((error) => showToast(error.message || "Gagal memuat pengajuan.", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const decide = async (request: ChangeRequest, action: "approve" | "reject") => {
    if (action === "reject" && !reason.trim()) {
      showToast("Alasan penolakan wajib diisi.", "error");
      return;
    }
    setBusyId(request.id);
    try {
      const res = await fetch(`/api/change-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Pengajuan gagal diproses.");
      showToast(data.message, "success");
      setReasonId(null);
      setReason("");
      window.location.reload();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Pengajuan gagal diproses.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const deleteHistory = async (request: ChangeRequest) => {
    if (request.status === "pending") return;
    if (!confirm("Yakin ingin menghapus riwayat pengajuan ini?")) return;
    setBusyId(request.id);
    try {
      const res = await fetch(`/api/change-requests/${request.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Riwayat gagal dihapus.");
      setRequests((current) => current.filter((item) => item.id !== request.id));
      showToast(data.message, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Riwayat gagal dihapus.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const displayValue = (field: string, value: string | undefined) => {
    if (!value) return "-";
    if (field === "narasumberId") {
      const narasumber = narasumberList.find((item) => item.id === value);
      return narasumber ? `${narasumber.nama} · ${value}` : value;
    }
    if (field === "tanggal" || field === "tanggalBaru") return formatDate(value);
    if (field === "status") return JADWAL_LABEL[value as JadwalStatus] ?? value;
    return value;
  };

  return <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
    <div className="mb-5 border-b border-[var(--border)] pb-4">
      <p className="section-label">Area administrasi</p>
      <h1 className="mt-2 text-[20px] font-semibold">Persetujuan Perubahan</h1>
      <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">Tinjau pengajuan narasumber dan jadwal sebelum diterapkan.</p>
    </div>
    <AdminSubNav />
    {loading ? <div className="surface p-6 text-[13px] text-[var(--muted-foreground)]">Memuat pengajuan...</div> : requests.length === 0 ? <div className="surface p-8 text-center text-[13px] text-[var(--muted-foreground)]">Belum ada riwayat pengajuan.</div> : <div className="space-y-4">
      {requests.map((request) => {
        const jadwalRequest = request.entityType === "jadwal_siaran_update" || request.entityType === "jadwal_siaran_create";
        const fields: ReadonlyArray<readonly [string, string]> = jadwalRequest ? jadwalFields : narasumberFields;
        const oldData = request.dataLama as Record<string, string | undefined>;
        const newData = request.dataBaru as Record<string, string | undefined>;
        const title = jadwalRequest
          ? `${newData.program || "Jadwal"} · ${formatDate(newData.tanggal ?? null)}`
          : newData.nama || oldData.nama || "Narasumber";
        return <article key={request.id} className="surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase text-[var(--accent)]">{requestTypeLabel(request.entityType)}</p>
              <h2 className="mt-1 font-semibold">{title}</h2>
              <p className="text-[12px] text-[var(--muted-foreground)]">Operator: {request.operatorName} · Diajukan {formatDateTime(request.createdAt)}</p>
              {request.reviewedAt && <p className="text-[12px] text-[var(--muted-foreground)]">Direview {formatDateTime(request.reviewedAt)}{request.reviewerName ? ` · ${request.reviewerName}` : ""}</p>}
            </div>
            <span className="border border-[var(--border-strong)] px-2 py-1 text-[11px] font-semibold">{statusLabel[request.status]}</span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="data-table"><thead><tr><th>Field</th><th>Data Lama</th><th>Data Baru</th></tr></thead>
              <tbody>{fields.map(([field, label]) => {
                const oldValue = displayValue(field, oldData[field]);
                const newValue = displayValue(field, newData[field]);
                return <tr key={field} className={oldValue !== newValue ? "bg-[var(--accent-muted)]" : ""}>
                  <td className="font-semibold">{label}</td><td>{oldValue}</td><td>{newValue}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          {request.status === "rejected" && request.alasanPenolakan && <p className="mt-3 text-[12px] text-[var(--danger)]">Alasan penolakan: {request.alasanPenolakan}</p>}
          {request.status === "pending" ? <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
            <button disabled={busyId === request.id} onClick={() => decide(request, "approve")} className="btn btn-primary">Setujui</button>
            {reasonId === request.id ? <>
              <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Alasan penolakan wajib diisi" className="field-input sm:max-w-xs" />
              <button disabled={busyId === request.id} onClick={() => decide(request, "reject")} className="btn btn-danger">Tolak</button>
            </> : <button disabled={busyId === request.id} onClick={() => { setReasonId(request.id); setReason(""); }} className="btn btn-outline">Tolak</button>}
          </div> : <div className="mt-4 flex justify-end border-t border-[var(--border)] pt-4">
            <button disabled={busyId === request.id} onClick={() => deleteHistory(request)} className="btn btn-danger"><Trash2 size={14} /> Hapus Riwayat</button>
          </div>}
        </article>;
      })}
    </div>}
  </div>;
}
