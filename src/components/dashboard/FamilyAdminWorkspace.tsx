"use client";

import { useCallback, useState } from "react";
import { FamilyTree } from "@/components/family-tree";
import { MemberFormModal } from "@/components/dashboard/MemberFormModal";
import { MembersManager } from "@/components/dashboard/MembersManager";
import { ExportTreeButton } from "@/components/export/ExportTreeButton";
import { DashboardPanelSkeleton } from "@/components/ui/skeleton";
import { useFamilyTree } from "@/hooks/useFamilyTree";
import type { FamilyMember } from "@/types/genealogy";

type FamilyAdminWorkspaceProps = {
  familyId: string;
  /** Chỉ hiện bảng (trang /members) */
  tableOnly?: boolean;
};

export function FamilyAdminWorkspace({
  familyId,
  tableOnly = false,
}: FamilyAdminWorkspaceProps) {
  const { tree, isLoading, error, mutate } = useFamilyTree(familyId);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);

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

  const onSaved = useCallback(() => {
    void mutate();
  }, [mutate]);

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
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1
                className="text-2xl font-semibold"
                style={{
                  fontFamily: "var(--font-literata), Literata, Georgia, serif",
                }}
              >
                Quản trị dòng họ {tree.clan_name}
              </h1>
              <p className="mt-1 text-sm text-stone-600">
                Double-click một người trên cây để mở form cập nhật. Dùng bảng bên
                dưới để thêm / sửa / xoá.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-[#7a1f1f] px-3 py-2 text-sm font-semibold text-[#fffdf8]"
                onClick={() => openCreate()}
              >
                + Thêm thành viên
              </button>
              <ExportTreeButton
                data={tree}
                label="Xuất Infographic"
                className="rounded-lg border border-stone-400/50 bg-white px-3 py-2 text-sm font-semibold text-[#1c1410] disabled:opacity-60"
              />
            </div>
          </div>

          <FamilyTree
            data={tree}
            showToolbar
            className="h-[min(70vh,640px)]"
            onMemberDoubleClick={(id) => {
              const m = tree.members.find((x) => x.id === id);
              if (m) openEdit(m);
            }}
            onPlaceholderUpdate={(payload) => {
              const m = tree.members.find((x) => x.id === payload.id);
              if (m) openEdit(m);
            }}
          />
        </section>
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
              className="rounded-lg border border-stone-400/50 bg-white px-3 py-2 text-sm font-semibold text-[#1c1410] disabled:opacity-60"
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
    </div>
  );
}
