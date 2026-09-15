"use client";

import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSubNav } from "@/components/admin/AdminUI";
import { Button } from "@/components/Button";
import { DEFAULT_WAITING_PERIOD, formatWaitingPeriod, normalizeWaitingPeriod, setClientWaitingPeriod, type WaitingPeriodSetting } from "@/types";

function SettingContent() {
  const { user } = useAuth();
  const [setting, setSetting] = useState<WaitingPeriodSetting>(DEFAULT_WAITING_PERIOD);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [customValue, setCustomValue] = useState(45);
  const [customUnit, setCustomUnit] = useState<"day" | "month">("day");

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message ?? "Gagal memuat pengaturan.");
        }
        const next = normalizeWaitingPeriod(data.setting ?? DEFAULT_WAITING_PERIOD);
        setSetting(next);
        if (next.unit === "day") {
          setCustomValue(next.value);
          setCustomUnit("day");
        } else {
          setCustomValue(next.value);
          setCustomUnit("month");
        }
      })
      .catch(() => setError("Gagal memuat pengaturan masa tunggu."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (nextSetting: WaitingPeriodSetting) => {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSetting),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Gagal menyimpan perubahan.");
        return;
      }
      const savedSetting = normalizeWaitingPeriod(data.setting ?? nextSetting);
      setClientWaitingPeriod(savedSetting);
      window.dispatchEvent(new CustomEvent("tvri-waiting-period-changed", { detail: savedSetting }));
      setSetting(savedSetting);
      setMessage("Pengaturan masa tunggu berhasil diperbarui.");
    } catch {
      setError("Gagal menyimpan perubahan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10 sm:px-8">
        <div className="surface p-6 text-[13px] text-[var(--muted-foreground)]">Memuat pengaturan...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 sm:px-8">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <p className="section-label">Pengaturan sistem</p>
          <h1 className="mt-2 text-[20px] font-semibold">Masa Tunggu Narasumber</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[12px] font-semibold text-[var(--muted-foreground)]">
          <Settings2 size={14} /> {formatWaitingPeriod(setting)}
        </div>
      </div>

      <AdminSubNav />

      <div className="surface p-5">
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium">Jumlah</span>
            <input
              type="number"
              min={1}
              value={customValue}
              onChange={(e) => setCustomValue(Math.max(1, Number(e.target.value || 1)))}
              className="field-input"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="mb-1.5 block text-[12px] font-medium">Satuan</legend>
            <div className="flex flex-wrap gap-4">
              {(["day", "month"] as const).map((unit) => (
                <label key={unit} className="inline-flex items-center gap-2 text-[13px]">
                  <input
                    type="radio"
                    name="waiting-unit"
                    value={unit}
                    checked={customUnit === unit}
                    onChange={() => setCustomUnit(unit)}
                  />
                  {unit === "day" ? "Hari" : "Bulan"}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => handleSave({ value: customValue, unit: customUnit })}
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
          <div className="text-[12px] text-[var(--muted-foreground)]">
            Pengaturan aktif saat ini: <strong>{formatWaitingPeriod(setting)}</strong>
          </div>
        </div>

        {message && <div className="mt-4 rounded-[4px] border border-[var(--success)] bg-[var(--success-muted)] px-3 py-2 text-[12px] text-[var(--success)]">{message}</div>}
        {error && <div className="mt-4 rounded-[4px] border border-[var(--danger)] bg-[var(--danger-muted)] px-3 py-2 text-[12px] text-[var(--danger)]">{error}</div>}

        <div className="mt-6 rounded-[4px] border border-[var(--border)] bg-[var(--muted)] p-3 text-[12px] text-[var(--muted-foreground)]">
          {user && user.role === "admin" ? "Anda masuk sebagai administrator dan dapat mengubah pengaturan sistem." : "Harap login sebagai admin untuk mengubah pengaturan."}
        </div>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <AdminGuard>
      <SettingContent />
    </AdminGuard>
  );
}
