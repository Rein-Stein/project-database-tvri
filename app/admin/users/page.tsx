"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminSubNav } from "@/components/admin/AdminUI";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "admin" | "operator";
  is_active: boolean;
  protected?: boolean;
  created_at?: string;
  updated_at?: string;
}

function UsersContent() {
  const router = useRouter();
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", role: "operator" as "admin" | "operator" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [managementReady, setManagementReady] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        router.replace("/admin/users/login");
        return;
      }
      if (!res.ok) throw new Error(data.message ?? "Gagal memuat data user.");
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data user.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetch("/api/auth/account-management/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.allowed) {
          router.replace("/admin/users/login");
          return;
        }
        setManagementReady(true);
        loadUsers();
      })
      .catch(() => router.replace("/admin/users/login"));
  }, [loadUsers, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Nama, email, dan password wajib diisi.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Email tidak valid.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Password dan konfirmasi password harus sama.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? "Gagal membuat akun.");
      }
      setMessage(`Akun ${form.name} berhasil dibuat.`);
      setForm({ name: "", email: "", password: "", confirmPassword: "", role: "operator" });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat akun.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeUsers = useMemo(() => users.filter((u) => u.is_active).length, [users]);

  const patchUser = async (id: string, patch: Record<string, unknown>, successMsg: string) => {
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Gagal menyimpan perubahan. Silakan coba lagi.");
      showToast(successMsg, "success");
      await loadUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan perubahan. Silakan coba lagi.";
      setError(msg);
      showToast(msg, "error");
    }
  };

  const deleteUser = async (u: UserRow) => {
    if (!confirm(`Hapus permanen akun ${u.name} (${u.email})? Tindakan ini tidak dapat dibatalkan.`)) return;
    setError("");
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(u.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Gagal menghapus akun.");
      showToast(`Akun ${u.name} dihapus.`, "success");
      await loadUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus akun.";
      setError(msg);
      showToast(msg, "error");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">
      <div className="mb-5 flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <p className="section-label">Akses internal</p>
          <h1 className="mt-2 text-[20px] font-semibold">Manajemen Akun</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[12px] font-semibold text-[var(--muted-foreground)]">
            {activeUsers} akun aktif
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/account-management/logout", { method: "POST" });
              router.replace("/admin/users/login");
            }}
            className="btn btn-outline !h-9 text-[11px]"
          >
            Kunci Akses
          </button>
        </div>
      </div>

      {managementReady && <AdminSubNav />}

      {!managementReady ? (
        <div className="surface p-6 text-[13px] text-[var(--muted-foreground)]">Memverifikasi akses manajemen akun...</div>
      ) : <div className="grid gap-6 lg:grid-cols-[430px_1fr]">
        <section className="surface p-5">
          <h2 className="mb-4 text-[14px] font-semibold">Buat Akun</h2>
          <form className="space-y-4" onSubmit={submit} noValidate>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium">Nama</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field-input" placeholder="Nama lengkap" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium">Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="field-input" placeholder="nama@tvri.co.id" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium">Password</span>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="field-input" placeholder="Minimal 6 karakter" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium">Konfirmasi Password</span>
              <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="field-input" placeholder="Ulangi password" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-medium">Role</span>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "operator" })} className="field-input">
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
              </select>
            </label>
            {error && <div className="rounded-[4px] border border-[var(--danger)] bg-[var(--danger-muted)] px-3 py-2 text-[12px] text-[var(--danger)]">{error}</div>}
            {message && <div className="rounded-[4px] border border-[var(--success)] bg-[var(--success-muted)] px-3 py-2 text-[12px] text-[var(--success)]">{message}</div>}
            <Button type="submit" disabled={submitting} className="w-full">
              <UserPlus size={14} /> {submitting ? "Membuat akun..." : "Buat Akun"}
            </Button>
          </form>
        </section>

        <section className="surface overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-[14px] font-semibold">Daftar pengguna</h2>
          </div>
          {loading ? (
            <div className="p-5 text-[13px] text-[var(--muted-foreground)]">Memuat data akun...</div>
          ) : users.length === 0 ? (
            <div className="p-5 text-[13px] text-[var(--muted-foreground)]">Belum ada akun yang dibuat.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isSelf = user.id === me?.id;
                    const isProtected = Boolean(user.protected);
                    return (
                    <tr key={user.id}>
                      <td className="font-semibold">
                        {user.name}
                        {(isSelf || isProtected) && <span className="ml-2 text-[10px] font-medium text-[var(--muted-foreground)]">({isProtected ? "Terlindungi" : "Anda"})</span>}
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <select
                          value={user.role}
                          disabled={isSelf || isProtected}
                          onChange={(e) => patchUser(user.id, { role: e.target.value }, `Role ${user.name} diubah.`)}
                          className="field-input !h-8 !w-auto !py-0 text-[12px]"
                          aria-label={`Role ${user.name}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="operator">Operator</option>
                        </select>
                      </td>
                      <td>
                        <span className={user.is_active ? "text-[var(--success)] font-semibold" : "text-[var(--danger)] font-semibold"}>
                          {user.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isSelf || isProtected}
                            onClick={() =>
                              patchUser(
                                user.id,
                                { is_active: !user.is_active },
                                user.is_active ? `Akun ${user.name} dinonaktifkan.` : `Akun ${user.name} diaktifkan.`
                              )
                            }
                            className="btn btn-outline !h-7 !px-2 text-[11px] disabled:opacity-40"
                          >
                            {user.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                          <button
                            type="button"
                            disabled={isSelf || isProtected}
                            onClick={() => deleteUser(user)}
                            aria-label={`Hapus akun ${user.name}`}
                            className="btn btn-outline !h-7 !w-7 !p-0 text-[var(--danger)] disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>}
    </div>
  );
}

export default function AdminUsersPage() {
  return <UsersContent />;
}
