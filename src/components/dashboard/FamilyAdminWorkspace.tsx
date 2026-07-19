"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { FamilyTree, type FamilyTreeHandle } from "@/components/family-tree";
import { MemberFormModal } from "@/components/dashboard/MemberFormModal";
import { MembersManager } from "@/components/dashboard/MembersManager";
import { ClanOverviewInfographic } from "@/components/dashboard/ClanOverviewInfographic";
import { ExportTreeButton } from "@/components/export/ExportTreeButton";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { useDashboardAccessOptional } from "@/components/dashboard/DashboardAccessContext";
import { DashboardPanelSkeleton } from "@/components/ui/skeleton";
import { useFamilyTree } from "@/hooks/useFamilyTree";
import type { FamilyMember, PlaceholderUpdatePayload } from "@/types/genealogy";

type FamilyAdminWorkspaceProps = {
  familyId: string;
  tableOnly?: boolean;
};

export function FamilyAdminWorkspace({
  familyId,
  tableOnly = false,
}: FamilyAdminWorkspaceProps) {
  const dash = useDashboardAccessOptional();
  /** null = không khóa; string[] (kể cả []) = trưởng nhánh chỉ thấy các chi đó */
  const lockedBranchIds: string[] | null = dash?.isBranchAdmin
    ? dash.access.branchIds?.length
      ? dash.access.branchIds
      : dash.access.branchId
        ? [dash.access.branchId]
        : []
    : null;
  const lockedBranchId =
    lockedBranchIds?.length === 1 ? lockedBranchIds[0]! : null;
  const branchScopeLocked = lockedBranchIds !== null;

  const { tree, isLoading, error, mutate } = useFamilyTree(familyId);
  const treeRef = useRef<FamilyTreeHandle>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [profileMember, setProfileMember] = useState<FamilyMember | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [treeBranchFilter, setTreeBranchFilter] = useState<string | null>(
    lockedBranchId,
  );
  const [statsOpen, setStatsOpen] = useState(false);

  useEffect(() => {
    if (lockedBranchId) setTreeBranchFilter(lockedBranchId);
    else if (branchScopeLocked && lockedBranchIds && lockedBranchIds.length > 1) {
      setTreeBranchFilter(null);
    } else if (branchScopeLocked && lockedBranchIds?.length === 0) {
      setTreeBranchFilter("__none__");
    }
  }, [lockedBranchId, lockedBranchIds, branchScopeLocked]);

  const openCreate = useCallback((parentId?: string | null) => {
    setFormMode("create");
    setEditing(null);
    setDefaultParentId(parentId ?? null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback(
    (member: FamilyMember) => {
      if (branchScopeLocked) {
        if (
          !lockedBranchIds?.length ||
          !lockedBranchIds.includes(member.tree_logic.branch_id)
        ) {
          return;
        }
      }
      setFormMode("edit");
      setEditing(member);
      setDefaultParentId(null);
      setFormOpen(true);
    },
    [branchScopeLocked, lockedBranchIds],
  );

  const openProfile = useCallback(
    (memberId: string) => {
      if (!tree) return;
      const m = tree.members.find((x) => x.id === memberId) ?? null;
      if (!m || m.status.is_placeholder) return;
      setProfileMember(m);
      setProfileOpen(true);
    },
    [tree],
  );

  const onSaved = useCallback(() => {
    void mutate();
  }, [mutate]);

  const focusOnTree = useCallback((memberId: string) => {
    window.setTimeout(() => treeRef.current?.traceRoute(memberId), 80);
  }, []);

  if (isLoading && !tree) {
    return <DashboardPanelSkeleton />;
  }

  if (error || !tree) {
    return (
      <p className="text-sm text-[#7a1f1f]">
        {error?.message ?? "Không tải được dữ liệu dòng họ."}{" "}
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

  if (tableOnly) {
    return (
      <div className="space-y-6">
        <MembersManager
          familyId={familyId}
          tree={tree}
          onRefresh={onSaved}
          onCreate={() => openCreate()}
          onAddChild={(parent) => openCreate(parent.id)}
          onEdit={openEdit}
          exportSlot={
            <ExportTreeButton
              data={tree}
              label="Xuất Infographic"
              className="gp-btn gp-btn-ghost disabled:opacity-60"
            />
          }
        />
        <MemberFormModal
          open={formOpen}
          onOpenChange={setFormOpen}
          mode={formMode}
          familyId={familyId}
          members={tree.members}
          branches={tree.branches}
          member={editing}
          defaultParentId={defaultParentId}
          lockedBranchIds={lockedBranchIds}
          onSaved={onSaved}
        />
        <ProfileModal
          member={profileMember}
          members={tree.members}
          open={profileOpen}
          onOpenChange={setProfileOpen}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 md:gap-3">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <p className="gp-eyebrow">Quản trị hương hỏa</p>
          <h1 className="gp-title mt-1 text-2xl md:text-3xl">
            Cây dòng họ {tree.clan_name}
          </h1>
          <p className="gp-lede mt-1 max-w-2xl text-sm">
            {lockedBranchIds?.length ? (
              <>
                Bạn đang quản lý{" "}
                <strong>
                  {dash?.access.branchNames?.filter(Boolean).join(", ") ||
                    lockedBranchIds.join(", ")}
                </strong>{" "}
                — chỉ thêm/sửa người thuộc các chi này.{" "}
              </>
            ) : (
              <>
                Cây ưu tiên toàn khung — mặc định gom nhánh để nhìn rõ. Tìm tên →
                mờ phần khác, sáng đường huyết thống.{" "}
              </>
            )}
            Bảng chi tiết:{" "}
            <Link
              href={`/dashboard/${familyId}/members`}
              className="font-semibold text-[var(--gp-lacquer)] underline-offset-2 hover:underline"
            >
              Thành viên
            </Link>
            .
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <button
            type="button"
            className="gp-btn gp-btn-ghost w-full sm:w-auto"
            onClick={() => setStatsOpen((v) => !v)}
            aria-expanded={statsOpen}
          >
            {statsOpen ? (
              <>
                <ChevronUp size={16} aria-hidden /> Thu số liệu
              </>
            ) : (
              <>
                <ChevronDown size={16} aria-hidden /> Infographic
              </>
            )}
          </button>
          <button
            type="button"
            className="gp-btn gp-btn-primary w-full sm:w-auto"
            onClick={() => openCreate()}
          >
            + Thêm thành viên
          </button>
          <ExportTreeButton
            data={tree}
            label="Xuất Infographic"
            className="gp-btn gp-btn-ghost w-full disabled:opacity-60 sm:w-auto"
          />
        </div>
      </header>

      {statsOpen ? (
        <div className="max-h-[40vh] shrink-0 overflow-auto">
          <ClanOverviewInfographic
            tree={tree}
            onFocusMember={(id) => {
              openProfile(id);
              focusOnTree(id);
            }}
            onFilterBranch={(branchId) => {
              if (lockedBranchIds?.length === 1) {
                setTreeBranchFilter(lockedBranchIds[0]!);
                return;
              }
              if (
                lockedBranchIds?.length &&
                branchId &&
                !lockedBranchIds.includes(branchId)
              ) {
                return;
              }
              setTreeBranchFilter(branchId);
            }}
          />
        </div>
      ) : (
        <div className="clan-infographic-mini shrink-0">
          <span>
            <strong>{tree.members.length}</strong> người ·{" "}
            <strong>{tree.branches?.length ?? 1}</strong> chi · mặc định{" "}
            <strong>Gom nhánh</strong>
          </span>
          <button
            type="button"
            className="text-xs font-semibold text-[var(--gp-lacquer)] underline-offset-2 hover:underline"
            onClick={() => setStatsOpen(true)}
          >
            Mở infographic
          </button>
        </div>
      )}

      <section
        id="clan-tree-canvas"
        className="clan-tree-stage"
        aria-label="Cây hương hỏa"
      >
        <FamilyTree
          ref={treeRef}
          data={tree}
          showToolbar
          className="clan-tree-stage__canvas"
          branchFilterControlled={
            treeBranchFilter === "__none__" ? null : treeBranchFilter
          }
          branchFilterLocked={Boolean(lockedBranchId) || treeBranchFilter === "__none__"}
          allowedBranchIds={
            branchScopeLocked
              ? lockedBranchIds && lockedBranchIds.length > 0
                ? lockedBranchIds
                : ["__none__"]
              : null
          }
          onMemberOpen={openProfile}
          onMemberDoubleClick={(id) => {
            const m = tree.members.find((x) => x.id === id);
            if (m) openEdit(m);
          }}
          onPlaceholderUpdate={(payload: PlaceholderUpdatePayload) => {
            const m = tree.members.find((x) => x.id === payload.id);
            if (!m) return;
            // Mở form sửa với dữ liệu đã điền từ popup placeholder trên cây
            setFormMode("edit");
            setEditing({
              ...m,
              full_name: payload.full_name || m.full_name,
              gender: payload.gender ?? m.gender,
              status: {
                ...m.status,
                is_alive: payload.is_alive ?? m.status.is_alive,
                is_placeholder: false,
              },
              dates: {
                ...m.dates,
                birth: payload.birth ?? m.dates.birth,
                death: payload.death ?? m.dates.death,
              },
            });
            setDefaultParentId(null);
            setFormOpen(true);
          }}
        />
      </section>

      <MemberFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        familyId={familyId}
        members={tree.members}
        branches={tree.branches}
        member={editing}
        defaultParentId={defaultParentId}
        lockedBranchIds={lockedBranchIds}
        onSaved={onSaved}
      />

      <ProfileModal
        member={profileMember}
        members={tree.members}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </div>
  );
}
