"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, Trash2, RefreshCw, Shield } from "lucide-react";
import { useDashboardAccess } from "@/components/dashboard/DashboardAccessContext";
import { appToast } from "@/lib/toast";
import {
  inviteBranchManager,
  listFamilyManagers,
  revokeBranchManager,
} from "@/services/managerService";
import type { FamilyManager } from "@/types/managers";

export function ManagersManager({ familyId }: { familyId: string }) {
  const { access, family, canManageManagers, isBranchAdmin } =
    useDashboardAccess();
  const branches = family?.settings.branches ?? [];
  const [managers, setManagers] = useState<FamilyManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    if (!branchId && branches[0]) setBranchId(branches[0].id);
  }, [branches, branchId]);

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageManagers) return;
    setSubmitting(true);
    try {
      const branch = branches.find((b) => b.id === branchId);
      await inviteBranchManager({
        familyId,
        email,
        branchId,
        branchName: branch?.name ?? null,
      });
      appToast.success(
        "Đã mời trưởng nhánh",
        "Họ cần đăng ký/đăng nhập đúng email này, rồi vào dashboard dòng họ để nhận quyền.",
      );
      setEmail("");
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
    if (!window.confirm(`Thu hồi quyền của ${m.email}?`)) return;
    try {
      await revokeBranchManager(m.id);
      // Nếu có doc uid khác cùng email — thu hồi luôn khi reload hiện
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

  if (isBranchAdmin) {
    return (
      <div className="gp-panel mx-auto max-w-lg p-6">
        <p className="gp-eyebrow">Phân quyền</p>
        <h1 className="gp-title mt-2 text-2xl">Bạn là trưởng nhánh</h1>
        <p className="gp-lede mt-3 text-sm">
          Chi được giao:{" "}
          <strong>{access.branchName ?? access.branchId ?? "—"}</strong>
        </p>
        <p className="mt-3 text-sm text-[var(--gp-muted)]">
          Bạn có thể cập nhật thành viên thuộc chi này. Chỉ{" "}
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
          Tạo người quản lý dưới bạn: mỗi người một email + một chi. Họ đăng nhập
          đúng email được mời sẽ vào dashboard và chỉ sửa được nhánh đó.
        </p>
      </header>

      <form
        onSubmit={(e) => void onInvite(e)}
        className="gp-panel space-y-4 p-5"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--gp-lacquer)]">
          <UserPlus size={18} aria-hidden />
          Mời trưởng nhánh mới
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
          />
        </label>

        <label className="block text-sm">
          <span className="font-semibold">Chi / nhánh được quyền sửa</span>
          <select
            required
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="gp-input mt-1 w-full"
          >
            {branches.length === 0 ? (
              <option value="">Chưa có chi — tạo ở mục Nhánh trước</option>
            ) : (
              branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))
            )}
          </select>
        </label>

        <button
          type="submit"
          className="gp-btn gp-btn-primary"
          disabled={submitting || branches.length === 0}
        >
          {submitting ? "Đang mời…" : "Mời & giao quyền"}
        </button>

        <p className="text-xs text-[var(--gp-muted)]">
          Gửi họ link <code>/register</code> (nếu chưa có tài khoản) rồi{" "}
          <code>/login</code> → vào dashboard dòng họ này. Hệ thống tự kích hoạt
          quyền khi email khớp lời mời.
        </p>
      </form>

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
            Chưa có trưởng nhánh. Mời người đầu tiên ở form trên.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--gp-scroll-edge)]">
            {managers.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--gp-ink)]">
                    {m.email}
                  </p>
                  <p className="text-xs text-[var(--gp-muted)]">
                    Chi: <strong>{m.branch_name ?? m.branch_id}</strong>
                    {" · "}
                    {m.status === "pending"
                      ? "Chờ đăng nhập"
                      : m.status === "active"
                        ? "Đang hoạt động"
                        : m.status}
                    {m.uid ? ` · uid ${m.uid.slice(0, 8)}…` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--gp-scroll-edge)] px-3 py-1.5 text-xs font-semibold text-[var(--gp-lacquer)] hover:bg-[var(--gp-lacquer-soft)]"
                  onClick={() => void onRevoke(m)}
                >
                  <Trash2 size={14} aria-hidden />
                  Thu hồi
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
