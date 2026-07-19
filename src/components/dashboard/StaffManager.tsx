"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getFamily } from "@/services/familyService";
import {
  listFamilyStaff,
  removeFamilyStaff,
  upsertFamilyStaff,
} from "@/services/staffService";
import { appToast } from "@/lib/toast";
import type { FamilyBranch, FamilyStaffMember, FamilyStaffRole } from "@/types/genealogy";

type StaffManagerProps = {
  familyId: string;
};

const ROLE_LABEL: Record<FamilyStaffRole, string> = {
  truong_ho: "Trưởng họ",
  truong_chi: "Trưởng chi",
  editor: "Người cập nhật",
};

export function StaffManager({ familyId }: StaffManagerProps) {
  const [staff, setStaff] = useState<FamilyStaffMember[]>([]);
  const [branches, setBranches] = useState<FamilyBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listFamilyStaff(familyId), getFamily(familyId)])
      .then(([list, family]) => {
        if (cancelled) return;
        setStaff(list);
        setBranches(family?.settings.branches ?? []);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Không tải được nhân sự.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [familyId, tick]);

  const onAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const role = String(form.get("role") ?? "editor") as FamilyStaffRole;
    const branch_id =
      role === "truong_chi" ? String(form.get("branch_id") ?? "") || null : null;

    try {
      await upsertFamilyStaff({
        familyId,
        uid: String(form.get("uid") ?? ""),
        email: String(form.get("email") ?? ""),
        display_name: String(form.get("display_name") ?? ""),
        role,
        branch_id,
      });
      appToast.success("Đã uỷ quyền", ROLE_LABEL[role]);
      event.currentTarget.reset();
      setTick((t) => t + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lưu thất bại.";
      setError(msg);
      appToast.error("Uỷ quyền thất bại", msg);
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async (uid: string) => {
    if (!confirm("Gỡ quyền nhân sự này?")) return;
    try {
      await removeFamilyStaff(familyId, uid);
      appToast.success("Đã gỡ quyền");
      setTick((t) => t + 1);
    } catch (err) {
      appToast.error(
        "Gỡ quyền thất bại",
        err instanceof Error ? err.message : "Lỗi không xác định",
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gp-title text-2xl">Nhân sự dòng họ</h1>
        <p className="gp-lede mt-1 text-sm">
          Admin gia phả chỉ định trưởng họ, trưởng chi hoặc người cập nhật để
          cùng giữ gia phả nhà mình.
        </p>
      </div>

      <form
        onSubmit={(e) => void onAdd(e)}
        className="gp-panel grid gap-3 p-5 sm:grid-cols-2"
      >
        <label className="gp-label sm:col-span-2">
          Họ tên
          <input name="display_name" required className="gp-input mt-1 font-normal" />
        </label>
        <label className="gp-label">
          Email
          <input name="email" type="email" required className="gp-input mt-1 font-normal" />
        </label>
        <label className="gp-label">
          UID Firebase (tài khoản đã đăng ký)
          <input
            name="uid"
            required
            className="gp-input mt-1 font-mono text-xs font-normal"
            placeholder="uid từ Firebase Auth"
          />
        </label>
        <label className="gp-label">
          Vai trò
          <select name="role" className="gp-input mt-1 font-normal" defaultValue="editor">
            <option value="truong_ho">Trưởng họ</option>
            <option value="truong_chi">Trưởng chi</option>
            <option value="editor">Người cập nhật</option>
          </select>
        </label>
        <label className="gp-label">
          Chi (nếu trưởng chi)
          <select name="branch_id" className="gp-input mt-1 font-normal" defaultValue="">
            <option value="">—</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="gp-btn gp-btn-primary disabled:opacity-60"
          >
            {saving ? "Đang lưu…" : "Thêm / cập nhật quyền"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="rounded-[var(--gp-radius)] bg-[var(--gp-lacquer-soft)] px-3 py-2 text-sm text-[var(--gp-lacquer)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--gp-muted)]">Đang tải…</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--gp-radius-lg)] border border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--gp-scroll-edge)] text-xs uppercase tracking-wider text-[var(--gp-muted)]">
              <tr>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Chi</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-[var(--gp-muted)]">
                    Chưa có nhân sự uỷ quyền (ngoài chủ sở hữu).
                  </td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.uid} className="border-b border-[var(--gp-scroll-edge)] last:border-0">
                    <td className="px-4 py-3 font-semibold">{s.display_name}</td>
                    <td className="px-4 py-3 text-[var(--gp-muted)]">{s.email}</td>
                    <td className="px-4 py-3">{ROLE_LABEL[s.role]}</td>
                    <td className="px-4 py-3 text-[var(--gp-muted)]">
                      {s.branch_id
                        ? (branches.find((b) => b.id === s.branch_id)?.name ?? s.branch_id)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="text-xs font-semibold text-[var(--gp-lacquer)] hover:underline"
                        onClick={() => void onRemove(s.uid)}
                      >
                        Gỡ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
