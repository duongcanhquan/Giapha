"use client";

import { useState, type ReactNode } from "react";
import { useDashboardAccessOptional } from "@/components/dashboard/DashboardAccessContext";
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
  /** Thêm con trực tiếp dưới Cha/Mẹ (nối cây) đã chọn */
  onAddChild?: (parent: FamilyMember) => void;
  onEdit?: (member: FamilyMember) => void;
  hideHeaderActions?: boolean;
  exportSlot?: ReactNode;
};

function MemberActions({
  member,
  busy,
  onAddChild,
  onEdit,
  onDelete,
}: {
  member: FamilyMember;
  busy: boolean;
  onAddChild?: (parent: FamilyMember) => void;
  onEdit?: (member: FamilyMember) => void;
  onDelete: (member: FamilyMember) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {onAddChild && !member.status.is_placeholder ? (
        <button
          type="button"
          className="inline-flex min-h-10 items-center rounded-md border border-[var(--gp-scroll-edge)] px-3 py-2 text-xs font-semibold text-[var(--gp-ink)] hover:bg-[var(--gp-paper)]"
          onClick={() => onAddChild(member)}
        >
          + Con
        </button>
      ) : null}
      <button
        type="button"
        className="inline-flex min-h-10 items-center rounded-md border border-[var(--gp-lacquer)]/30 px-3 py-2 text-xs font-semibold text-[var(--gp-lacquer)] hover:bg-[var(--gp-lacquer-soft)]"
        onClick={() => onEdit?.(member)}
      >
        Sửa
      </button>
      <button
        type="button"
        disabled={busy}
        className="inline-flex min-h-10 items-center rounded-md border border-[var(--gp-scroll-edge)] px-3 py-2 text-xs font-semibold text-[var(--gp-muted)] hover:bg-[var(--gp-paper)] disabled:opacity-50"
        onClick={() => onDelete(member)}
      >
        {busy ? "…" : "Xoá"}
      </button>
    </div>
  );
}

export function MembersManager({
  familyId,
  tree: treeProp,
  onRefresh,
  onCreate,
  onAddChild,
  onEdit,
  hideHeaderActions = false,
  exportSlot,
}: MembersManagerProps) {
  const dash = useDashboardAccessOptional();
  const lockedBranchIds: string[] | null = dash?.isBranchAdmin
    ? dash.access.branchIds?.length
      ? dash.access.branchIds
      : dash.access.branchId
        ? [dash.access.branchId]
        : []
    : null;
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
          className="min-h-10 font-semibold underline"
          onClick={() => void mutate()}
        >
          Thử lại
        </button>
      </p>
    );
  }

  const members = (tree?.members ?? []).filter((m) => {
    if (lockedBranchIds === null) return true;
    if (lockedBranchIds.length === 0) return false;
    return lockedBranchIds.includes(m.tree_logic.branch_id);
  });

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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h2 className="gp-title text-xl md:text-2xl">Quản lý Thành viên</h2>
          <p className="gp-lede mt-1 text-sm">
            {members.length} người · nhấn Sửa hoặc (máy tính) double-click hàng.
          </p>
        </div>
        {!hideHeaderActions ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            {exportSlot}
            {onCreate ? (
              <button
                type="button"
                className="gp-btn gp-btn-primary w-full sm:w-auto"
                onClick={onCreate}
              >
                + Thêm thành viên
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Mobile: card list — dễ chạm hơn bảng rộng */}
      <ul className="space-y-3 md:hidden">
        {members.map((m) => (
          <li
            key={m.id}
            className="rounded-xl border border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)] p-3 shadow-[var(--gp-shadow-soft)]"
          >
            <p className="font-display text-base font-semibold text-[var(--gp-ink)]">
              {m.status.is_placeholder ? "? Khuyết danh" : m.full_name}
            </p>
            <p className="mt-1 text-xs text-[var(--gp-muted)]">
              Đời {memberGeneration(m)} · {m.tree_logic.branch_id} ·{" "}
              {m.status.is_alive ? "Đang sống" : "Đã mất"}
              {m.status.is_placeholder ? " · Placeholder" : ""}
            </p>
            {m.dates.death || m.dates.lunar_death ? (
              <p className="mt-1 text-xs text-[var(--gp-muted-soft)]">
                {m.dates.death ? `Mất: ${m.dates.death}` : null}
                {m.dates.lunar_death
                  ? `${m.dates.death ? " · " : ""}Âm: ${m.dates.lunar_death}`
                  : null}
              </p>
            ) : null}
            <div className="mt-3">
              <MemberActions
                member={m}
                busy={busyId === m.id}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={(member) => void handleDelete(member)}
              />
            </div>
          </li>
        ))}
        {members.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--gp-scroll-edge)] px-4 py-10 text-center text-sm text-[var(--gp-muted)]">
            Chưa có thành viên — nhấn Thêm thành viên để bắt đầu.
          </li>
        ) : null}
      </ul>

      <div className="gp-table-wrap hidden md:block">
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
              <tr
                key={m.id}
                onDoubleClick={() => onEdit?.(m)}
                className="cursor-pointer"
              >
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
                  <MemberActions
                    member={m}
                    busy={busyId === m.id}
                    onAddChild={onAddChild}
                    onEdit={onEdit}
                    onDelete={(member) => void handleDelete(member)}
                  />
                </td>
              </tr>
            ))}
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center text-[var(--gp-muted)]"
                >
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
