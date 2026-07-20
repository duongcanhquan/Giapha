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
  /** Thu gọn tiêu đề/infographic để cây chiếm gần hết vùng nội dung */
  const [chromeCollapsed, setChromeCollapsed] = useState(true);

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
    <div className="clan-tree-page flex h-full min-h-0 flex-1 flex-col overflow-hidden overscroll-none">
      <header
        className={[
          "clan-tree-page__chrome shrink-0 border-b border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)]/95",
          chromeCollapsed ? "clan-tree-page__chrome--compact" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 md:px-4">
          <div className="min-w-0">
            <h1 className="gp-title truncate text-lg md:text-xl">
              Cây dòng họ {tree.clan_name}
            </h1>
            {!chromeCollapsed ? (
              <p className="gp-lede mt-0.5 max-w-2xl text-xs md:text-sm">
                {lockedBranchIds?.length ? (
                  <>
                    Quản lý{" "}
                    <strong>
                      {dash?.access.branchNames?.filter(Boolean).join(", ") ||
                        lockedBranchIds.join(", ")}
                    </strong>
                    .{" "}
                  </>
                ) : null}
                Vuốt để kéo · <strong>Toàn màn hình</strong> để xem rộng.{" "}
                <Link
                  href={`/dashboard/${familyId}/members`}
                  className="font-semibold text-[var(--gp-lacquer)] underline-offset-2 hover:underline"
                >
                  Thành viên
                </Link>
              </p>
            ) : (
              <p className="truncate text-[11px] text-[var(--gp-muted)]">
                {tree.members.length} người · {tree.branches?.length ?? 1} chi
                {lockedBranchIds?.length
                  ? ` · ${dash?.access.branchNames?.filter(Boolean).join(", ") || lockedBranchIds.join(", ")}`
                  : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              className="gp-btn gp-btn-ghost !min-h-9 !px-2.5 text-xs"
              onClick={() => setChromeCollapsed((v) => !v)}
              aria-pressed={chromeCollapsed}
              title={
                chromeCollapsed
                  ? "Hiện thêm tiêu đề / số liệu"
                  : "Thu gọn để cây rộng hơn"
              }
            >
              {chromeCollapsed ? (
                <>
                  <ChevronDown size={15} aria-hidden /> Chi tiết
                </>
              ) : (
                <>
                  <ChevronUp size={15} aria-hidden /> Mở rộng cây
                </>
              )}
            </button>
            {!chromeCollapsed ? (
              <button
                type="button"
                className="gp-btn gp-btn-ghost !min-h-9 !px-2.5 text-xs"
                onClick={() => setStatsOpen((v) => !v)}
                aria-expanded={statsOpen}
              >
                {statsOpen ? "Thu số liệu" : "Infographic"}
              </button>
            ) : null}
            <button
              type="button"
              className="gp-btn gp-btn-primary !min-h-9 !px-3 text-xs"
              onClick={() => openCreate()}
            >
              + Thêm
            </button>
            {!chromeCollapsed ? (
              <ExportTreeButton
                data={tree}
                label="Xuất"
                className="gp-btn gp-btn-ghost !min-h-9 !px-2.5 text-xs disabled:opacity-60"
              />
            ) : null}
          </div>
        </div>

        {!chromeCollapsed && statsOpen ? (
          <div className="max-h-[32vh] overflow-auto border-t border-[var(--gp-scroll-edge)] px-3 py-2 md:px-4">
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
        ) : null}
      </header>

      <section
        id="clan-tree-canvas"
        className="clan-tree-stage clan-tree-stage--expanded"
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
