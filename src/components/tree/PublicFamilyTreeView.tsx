"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FamilyTree } from "@/components/family-tree";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { CopyShareLinkButton } from "@/components/share/CopyShareLinkButton";
import { TreePageSkeleton } from "@/components/ui/skeleton";
import { useFamilyTree } from "@/hooks/useFamilyTree";
import type { FamilyMember } from "@/types/genealogy";

type PublicFamilyTreeViewProps = {
  familyId: string;
};

export function PublicFamilyTreeView({ familyId }: PublicFamilyTreeViewProps) {
  const { family, tree, error, isLoading } = useFamilyTree(familyId);
  const [profileMember, setProfileMember] = useState<FamilyMember | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return `/tree/${familyId}`;
    return `${window.location.origin}/tree/${familyId}`;
  }, [familyId]);

  const theme = family?.theme;
  const primary = theme?.primary_color ?? "#7a1f1f";
  const surface = theme?.surface_color ?? "#e9eef3";

  if (isLoading && !tree) {
    return <TreePageSkeleton />;
  }

  if (error || !tree) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <p className="text-[#7a1f1f]">
            {error?.message ?? "Không tìm thấy dòng họ."}
          </p>
          <Link href="/" className="mt-3 inline-block text-sm font-semibold underline">
            Về trang chủ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex min-h-screen flex-col"
      style={{ background: surface, ["--ft-lacquer" as string]: primary }}
    >
      {theme?.background_image ? (
        <div
          className="h-28 w-full bg-cover bg-center md:h-36"
          style={{ backgroundImage: `url(${theme.background_image})` }}
          role="img"
          aria-label="Ảnh nền dòng họ"
        />
      ) : null}

      <header className="border-b border-stone-300/50 px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: primary }}
            >
              <Link href="/" className="hover:underline">
                Giapha
              </Link>
              {" · "}Xem công khai
            </p>
            <h1
              className="mt-1 text-2xl font-semibold text-[#1c1410]"
              style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
            >
              Dòng họ {tree.clan_name}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-stone-600">
              {family?.description || "Chế độ chỉ đọc — không thể thêm/sửa/xóa."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <CopyShareLinkButton
              url={shareUrl}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#fffdf8]"
              style={{ background: primary }}
            />
            <Link
              href={`/dashboard/${familyId}`}
              className="inline-flex items-center rounded-lg border border-stone-400/50 bg-white px-3 py-2 text-sm font-semibold text-[#1c1410]"
            >
              Quản trị
            </Link>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 p-3 md:p-4">
        {tree.members.length === 0 ? (
          <div className="grid h-[60vh] place-items-center text-sm text-stone-500">
            Dòng họ chưa có thành viên công khai.
          </div>
        ) : (
          <FamilyTree
            data={tree}
            readOnly
            showToolbar
            className="h-[calc(100vh-12rem)]"
            onMemberDoubleClick={(id) => {
              const m = tree.members.find((x) => x.id === id) ?? null;
              if (!m || m.is_placeholder) return;
              setProfileMember(m);
              setProfileOpen(true);
            }}
          />
        )}
      </div>

      <ProfileModal
        member={profileMember}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </main>
  );
}
