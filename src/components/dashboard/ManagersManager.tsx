"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus, Trash2, RefreshCw, Shield, Pencil } from "lucide-react";
import { useDashboardAccess } from "@/components/dashboard/DashboardAccessContext";
import { appToast } from "@/lib/toast";
import {
  inviteBranchManager,
  listFamilyManagers,
  revokeBranchManager,
  updateManagerBranches,
  formatManagerBranches,
} from "@/services/managerService";
import type { FamilyManager } from "@/types/managers";

export function ManagersManager({ familyId }: { familyId: string }) {
  const { access, family, canManageManagers, isBranchAdmin } =
    useDashboardAccess();
  const branches = family?.settings.branches ?? [];
  const [managers, setManagers] = useState<FamilyManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastCredentials, setLastCredentials] = useState<{
    email: string;
    password: string;
    created: boolean;
    branches: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBranches, setEditBranches] = useState<string[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listFamilyManagers(familyId);
      setManagers(list);
    } catch (err) {
      appToast.error(
        "Không tải được danh sách",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (selectedBranches.length === 0 && branches[0]) {
      setSelectedBranches([branches[0].id]);
    }
  }, [branches, selectedBranches.length]);

  const toggleBranch = (id: string, list: string[], setList: (v: string[]) => void) => {
    setList(
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    );
  };

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageManagers) return;
    setSubmitting(true);
    setLastCredentials(null);
    try {
      const result = await inviteBranchManager({
        familyId,
        email,
        password,
        branchIds: selectedBranches,
        branchNames: selectedBranches.map(
          (id) => branches.find((b) => b.id === id)?.name ?? null,
        ),
      });
      const branchLabel = formatManagerBranches(result.manager);
      setLastCredentials({
        email: result.manager.email,
        password: result.password,
        created: result.accountCreated,
        branches: branchLabel,
      });
      appToast.success(
        result.accountCreated
          ? "Đã tạo tài khoản & giao quyền"
          : "Đã gắn thêm chi cho tài khoản sẵn có",
        `Chi: ${branchLabel}`,
      );
      setEmail("");
      setPassword("");
      await reload();
    } catch (err) {
      appToast.error(
        "Mời thất bại",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onRevoke = async (m: FamilyManager) => {
    if (!canManageManagers) return;
    if (!window.confirm(`Thu hồi toàn bộ quyền của ${m.email}?`)) return;
    try {
      await revokeBranchManager(m.id);
      const again = await listFamilyManagers(familyId);
      for (const other of again) {
        if (other.email === m.email && other.id !== m.id) {
          await revokeBranchManager(other.id);
        }
      }
      appToast.success("Đã thu hồi quyền");
      await reload();
    } catch (err) {
      appToast.error(
        "Thu hồi thất bại",
        err instanceof Error ? err.message : undefined,
      );
    }
  };

  const startEdit = (m: FamilyManager) => {
    setEditingId(m.id);
    setEditBranches(
      m.branch_ids?.length ? [...m.branch_ids] : m.branch_id ? [m.branch_id] : [],
    );
  };

  const saveEdit = async (m: FamilyManager) => {
    try {
      await updateManagerBranches({
        managerId: m.id,
        branchIds: editBranches,
        branchNames: editBranches.map(
          (id) => branches.find((b) => b.id === id)?.name ?? null,
        ),
      });
      appToast.success("Đã cập nhật chi được giao");
      setEditingId(null);
      await reload();
    } catch (err) {
      appToast.error(
        "Cập nhật thất bại",
        err instanceof Error ? err.message : undefined,
      );
    }
  };

  const myBranchesLabel = useMemo(() => {
    if (access.branchNames?.length) {
      return access.branchNames.filter(Boolean).join(", ");
    }
    if (access.branchIds?.length) return access.branchIds.join(", ");
    return access.branchName ?? access.branchId ?? "—";
  }, [access]);

  if (isBranchAdmin) {
    return (
      <div className="gp-panel mx-auto max-w-lg p-6">
        <p className="gp-eyebrow">Phân quyền</p>
        <h1 className="gp-title mt-2 text-2xl">Bạn là trưởng nhánh</h1>
        <p className="gp-lede mt-3 text-sm">
          Chi được giao: <strong>{myBranchesLabel}</strong>
        </p>
        <p className="mt-3 text-sm text-[var(--gp-muted)]">
          Bạn có thể cập nhật thành viên thuộc các chi này. Chỉ{" "}
          <strong>chủ dòng họ</strong> mới mời thêm quản lý khác.
        </p>
      </div>
    );
  }

  if (!canManageManagers) {
    return (
      <div className="gp-panel p-6 text-sm text-[var(--gp-lacquer)]">
        Chỉ chủ dòng họ hoặc Super Admin mới quản lý phân quyền.
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header>
        <p className="gp-eyebrow">Cộng tác</p>
        <h1 className="gp-title mt-1 text-2xl md:text-3xl">
          Phân quyền · Trưởng nhánh
        </h1>
        <p className="gp-lede mt-2 max-w-2xl text-sm">
          Tạo tài khoản bằng email + mật khẩu, giao một hoặc nhiều chi. Một
          người có thể quản lý nhiều nhánh; mời lại cùng email sẽ gắn thêm chi.
        </p>
      </header>

      <form
        onSubmit={(e) => void onInvite(e)}
        className="gp-panel space-y-4 p-5"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--gp-lacquer)]">
          <UserPlus size={18} aria-hidden />
          Tạo / giao quyền trưởng nhánh
        </div>

        <label className="block text-sm">
          <span className="font-semibold">Email đăng nhập</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nhanhtruong@email.com"
            className="gp-input mt-1 w-full"
            autoComplete="off"
          />
        </label>

        <label className="block text-sm">
          <span className="font-semibold">Mật khẩu</span>
          <input
            type="text"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ít nhất 6 ký tự"
            className="gp-input mt-1 w-full font-mono"
            autoComplete="new-password"
          />
          <span className="mt-1 block text-xs text-[var(--gp-muted)]">
            Tài khoản mới: mật khẩu tạm để họ đăng nhập. Tài khoản đã có: phải
            nhập đúng mật khẩu hiện tại để gắn thêm nhánh.
          </span>
        </label>

        <fieldset className="block text-sm">
          <legend className="font-semibold">Chi / nhánh được quyền sửa</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {branches.length === 0 ? (
              <p className="text-xs text-[var(--gp-muted)]">
                Chưa có chi — tạo ở mục Nhánh trước.
              </p>
            ) : (
              branches.map((b) => (
                <label
                  key={b.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--gp-scroll-edge)] px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedBranches.includes(b.id)}
                    onChange={() =>
                      toggleBranch(b.id, selectedBranches, setSelectedBranches)
                    }
                  />
                  <span>{b.name}</span>
                </label>
              ))
            )}
          </div>
        </fieldset>

        <button
          type="submit"
          className="gp-btn gp-btn-primary"
          disabled={
            submitting ||
            branches.length === 0 ||
            selectedBranches.length === 0
          }
        >
          {submitting ? "Đang tạo…" : "Tạo tài khoản & giao quyền"}
        </button>
      </form>

      {lastCredentials ? (
        <div className="rounded-lg border border-[var(--gp-lacquer)]/30 bg-[var(--gp-lacquer-soft)] p-4 text-sm">
          <p className="font-semibold text-[var(--gp-lacquer)]">
            {lastCredentials.created
              ? "Tài khoản mới — gửi thông tin này cho người được mời (chỉ hiện một lần):"
              : "Đã gắn quyền — họ đăng nhập bằng mật khẩu hiện tại:"}
          </p>
          <dl className="mt-2 grid grid-cols-[6rem_1fr] gap-y-1">
            <dt className="text-[var(--gp-muted)]">Email</dt>
            <dd className="font-mono font-medium">{lastCredentials.email}</dd>
            <dt className="text-[var(--gp-muted)]">Mật khẩu</dt>
            <dd className="font-mono font-medium">{lastCredentials.password}</dd>
            <dt className="text-[var(--gp-muted)]">Chi</dt>
            <dd>{lastCredentials.branches}</dd>
            <dt className="text-[var(--gp-muted)]">Đăng nhập</dt>
            <dd>
              <code>/login</code> → dashboard dòng họ
            </dd>
          </dl>
        </div>
      ) : null}

      <section className="gp-panel p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-[var(--gp-lacquer)]">
            <Shield size={16} aria-hidden />
            Đang giao quyền ({managers.length})
          </h2>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--gp-muted)] hover:text-[var(--gp-lacquer)]"
            onClick={() => void reload()}
          >
            <RefreshCw size={14} aria-hidden />
            Làm mới
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--gp-muted)]">Đang tải…</p>
        ) : managers.length === 0 ? (
          <p className="text-sm text-[var(--gp-muted)]">
            Chưa có trưởng nhánh. Tạo người đầu tiên ở form trên.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--gp-scroll-edge)]">
            {managers.map((m) => (
              <li key={m.id} className="space-y-2 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--gp-ink)]">
                      {m.email}
                    </p>
                    <p className="text-xs text-[var(--gp-muted)]">
                      Chi: <strong>{formatManagerBranches(m)}</strong>
                      {" · "}
                      {m.status === "pending"
                        ? "Chờ kích hoạt"
                        : m.status === "active"
                          ? "Đang hoạt động"
                          : m.status}
                      {m.uid ? ` · uid ${m.uid.slice(0, 8)}…` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--gp-scroll-edge)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--gp-paper)]"
                      onClick={() => startEdit(m)}
                    >
                      <Pencil size={14} aria-hidden />
                      Sửa chi
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--gp-scroll-edge)] px-3 py-1.5 text-xs font-semibold text-[var(--gp-lacquer)] hover:bg-[var(--gp-lacquer-soft)]"
                      onClick={() => void onRevoke(m)}
                    >
                      <Trash2 size={14} aria-hidden />
                      Thu hồi
                    </button>
                  </div>
                </div>
                {editingId === m.id ? (
                  <div className="rounded-md border border-[var(--gp-scroll-edge)] bg-[var(--gp-paper)] p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {branches.map((b) => (
                        <label
                          key={b.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={editBranches.includes(b.id)}
                            onChange={() =>
                              toggleBranch(b.id, editBranches, setEditBranches)
                            }
                          />
                          {b.name}
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="gp-btn gp-btn-primary text-xs"
                        disabled={editBranches.length === 0}
                        onClick={() => void saveEdit(m)}
                      >
                        Lưu chi
                      </button>
                      <button
                        type="button"
                        className="gp-btn gp-btn-ghost text-xs"
                        onClick={() => setEditingId(null)}
                      >
                        Huỷ
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
