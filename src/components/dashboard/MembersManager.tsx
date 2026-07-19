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
          <h2
            className="text-xl font-semibold md:text-2xl"
            style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
          >
            Quản lý Thành viên
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            {members.length} người · bảng DataGrid thêm / sửa / xoá.
          </p>
        </div>
        {!hideHeaderActions ? (
          <div className="flex flex-wrap gap-2">
            {exportSlot}
            {onCreate ? (
              <button
                type="button"
                className="rounded-lg bg-[#7a1f1f] px-3 py-2 text-sm font-semibold text-[#fffdf8]"
                onClick={onCreate}
              >
                + Thêm thành viên
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-300/60 bg-[#fffdf8]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Tên</th>
              <th className="px-3 py-2 font-semibold">Đời</th>
              <th className="px-3 py-2 font-semibold">Nhánh</th>
              <th className="px-3 py-2 font-semibold">Trạng thái</th>
              <th className="px-3 py-2 font-semibold">Placeholder</th>
              <th className="px-3 py-2 font-semibold">Ngày mất / giỗ</th>
              <th className="px-3 py-2 font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.id}
                className="border-b border-stone-100 last:border-0 hover:bg-stone-50/80"
                onDoubleClick={() => onEdit?.(m)}
              >
                <td className="px-3 py-2 font-medium">
                  {m.status.is_placeholder ? "? Khuyết danh" : m.full_name}
                </td>
                <td className="px-3 py-2">{memberGeneration(m)}</td>
                <td className="px-3 py-2">{m.tree_logic.branch_id}</td>
                <td className="px-3 py-2">
                  {m.status.is_alive ? "Đang sống" : "Đã mất"}
                </td>
                <td className="px-3 py-2">
                  {m.status.is_placeholder ? "Có" : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-stone-600">
                  {m.dates.death || "—"}
                  {m.dates.lunar_death ? (
                    <span className="block text-stone-500">
                      Âm: {m.dates.lunar_death}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#7a1f1f] hover:underline"
                      onClick={() => onEdit?.(m)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      className="text-xs font-semibold text-stone-600 hover:underline disabled:opacity-50"
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
                <td colSpan={7} className="px-3 py-8 text-center text-stone-500">
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
