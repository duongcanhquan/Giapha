"use client";

import { useState, type ReactNode } from "react";
import { DashboardPanelSkeleton } from "@/components/ui/skeleton";
import { useFamilyTree } from "@/hooks/useFamilyTree";
import { appToast } from "@/lib/toast";
import { deleteMember } from "@/services/memberService";
import type { FamilyMember, FamilyTreeData } from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";

type MembersManagerProps = {
  familyId: string;
  /** Nếu đã fetch sẵn từ workspace cha */
  tree?: FamilyTreeData | null;
  onRefresh?: () => void;
  onCreate?: () => void;
  onEdit?: (member: FamilyMember) => void;
  hideHeaderActions?: boolean;
  exportSlot?: ReactNode;
};

export function MembersManager({
  familyId,
  tree: treeProp,
  onRefresh,
  onCreate,
  onEdit,
  hideHeaderActions = false,
  exportSlot,
}: MembersManagerProps) {
  const hook = useFamilyTree(treeProp ? null : familyId);
  const tree = treeProp ?? hook.tree;
  const isLoading = treeProp ? false : hook.isLoading;
  const error = treeProp ? null : hook.error;
  const mutate = onRefresh ?? (() => void hook.mutate());
  const [busyId, setBusyId] = useState<string | null>(null);

  if (isLoading && !tree) {
    return <DashboardPanelSkeleton />;
  }

  if (error) {
    return (
      <p className="text-sm text-[#7a1f1f]">
        {error.message}{" "}
        <button
          type="button"
          className="font-semibold underline"
          onClick={() => void mutate()}
        >
          Thử lại
        </button>
      </p>
    );
  }

  const members = tree?.members ?? [];

  const handleDelete = async (member: FamilyMember) => {
    const label = member.status.is_placeholder
      ? "khuyết danh"
      : member.full_name;
    if (!window.confirm(`Xoá «${label}» khỏi cây?`)) return;
    setBusyId(member.id);
    try {
      await deleteMember(member.id);
      appToast.success("Đã xoá thành viên");
      mutate();
    } catch (err) {
      appToast.error(
        "Xoá thất bại",
        err instanceof Error ? err.message : "Không thể xoá.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="gp-title text-xl md:text-2xl">Quản lý Thành viên</h2>
          <p className="gp-lede mt-1 text-sm">
            {members.length} người · double-click hàng để sửa nhanh.
          </p>
        </div>
        {!hideHeaderActions ? (
          <div className="flex flex-wrap gap-2">
            {exportSlot}
            {onCreate ? (
              <button type="button" className="gp-btn gp-btn-primary" onClick={onCreate}>
                + Thêm thành viên
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="gp-table-wrap">
        <table className="gp-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Đời</th>
              <th>Nhánh</th>
              <th>Trạng thái</th>
              <th>Placeholder</th>
              <th>Ngày mất / giỗ</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} onDoubleClick={() => onEdit?.(m)} className="cursor-pointer">
                <td className="font-display font-semibold">
                  {m.status.is_placeholder ? "? Khuyết danh" : m.full_name}
                </td>
                <td>{memberGeneration(m)}</td>
                <td>{m.tree_logic.branch_id}</td>
                <td>{m.status.is_alive ? "Đang sống" : "Đã mất"}</td>
                <td>{m.status.is_placeholder ? "Có" : "—"}</td>
                <td className="text-xs text-[var(--gp-muted)]">
                  {m.dates.death || "—"}
                  {m.dates.lunar_death ? (
                    <span className="block text-[var(--gp-muted-soft)]">
                      Âm: {m.dates.lunar_death}
                    </span>
                  ) : null}
                </td>
                <td onDoubleClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--gp-lacquer)] hover:underline"
                      onClick={() => onEdit?.(m)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      className="text-xs font-semibold text-[var(--gp-muted)] hover:underline disabled:opacity-50"
                      onClick={() => void handleDelete(m)}
                    >
                      {busyId === m.id ? "…" : "Xoá"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--gp-muted)]">
                  Chưa có thành viên — nhấn Thêm thành viên để bắt đầu.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
