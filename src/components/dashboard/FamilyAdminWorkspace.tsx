"use client";

import { useCallback, useRef, useState } from "react";
import { FamilyTree, type FamilyTreeHandle } from "@/components/family-tree";
import { MemberFormModal } from "@/components/dashboard/MemberFormModal";
import { MembersManager } from "@/components/dashboard/MembersManager";
import { ClanOverviewInfographic } from "@/components/dashboard/ClanOverviewInfographic";
import { ExportTreeButton } from "@/components/export/ExportTreeButton";
import { ProfileModal } from "@/components/profile/ProfileModal";
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
  const { tree, isLoading, error, mutate } = useFamilyTree(familyId);
  const treeRef = useRef<FamilyTreeHandle>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [profileMember, setProfileMember] = useState<FamilyMember | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [treeBranchFilter, setTreeBranchFilter] = useState<string | null>(null);

  const openCreate = useCallback((parentId?: string | null) => {
    setFormMode("create");
    setEditing(null);
    setDefaultParentId(parentId ?? null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((member: FamilyMember) => {
    setFormMode("edit");
    setEditing(member);
    setDefaultParentId(null);
    setFormOpen(true);
  }, []);

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
    document
      .getElementById("clan-tree-canvas")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => treeRef.current?.traceRoute(memberId), 180);
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

  return (
    <div className="space-y-8">
      {!tableOnly ? (
        <>
          <ClanOverviewInfographic
            tree={tree}
            onFocusMember={(id) => {
              openProfile(id);
              focusOnTree(id);
            }}
            onFilterBranch={(branchId) => {
              setTreeBranchFilter(branchId);
              document
                .getElementById("clan-tree-canvas")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />

          <section id="clan-tree-canvas" className="scroll-mt-4 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="gp-eyebrow">Quản trị hương hỏa</p>
                <h1 className="gp-title mt-1 text-2xl md:text-3xl">
                  Dòng họ {tree.clan_name}
                </h1>
                <p className="gp-lede mt-1.5 max-w-xl text-sm">
                  Cây mở thu nhỏ toàn cảnh — zoom dần để đọc. Tìm tên → mờ phần
                  khác, sáng đúng đường huyết thống tới người đó.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="gp-btn gp-btn-primary"
                  onClick={() => openCreate()}
                >
                  + Thêm thành viên
                </button>
                <ExportTreeButton
                  data={tree}
                  label="Xuất Infographic"
                  className="gp-btn gp-btn-ghost disabled:opacity-60"
                />
              </div>
            </div>

            <FamilyTree
              ref={treeRef}
              data={tree}
              showToolbar
              className="h-[min(72vh,680px)]"
              branchFilterControlled={treeBranchFilter}
              onMemberOpen={openProfile}
              onMemberDoubleClick={(id) => {
                const m = tree.members.find((x) => x.id === id);
                if (m) openEdit(m);
              }}
              onPlaceholderUpdate={(payload: PlaceholderUpdatePayload) => {
                const m = tree.members.find((x) => x.id === payload.id);
                if (m) openEdit(m);
              }}
            />
          </section>
        </>
      ) : null}

      <MembersManager
        familyId={familyId}
        tree={tree}
        onRefresh={onSaved}
        onCreate={() => openCreate()}
        onEdit={openEdit}
        hideHeaderActions={!tableOnly}
        exportSlot={
          tableOnly ? (
            <ExportTreeButton
              data={tree}
              label="Xuất Infographic"
              className="gp-btn gp-btn-ghost disabled:opacity-60"
            />
          ) : null
        }
      />

      <MemberFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        familyId={familyId}
        members={tree.members}
        member={editing}
        defaultParentId={defaultParentId}
        onSaved={onSaved}
      />

      <ProfileModal
        member={profileMember}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </div>
  );
}
