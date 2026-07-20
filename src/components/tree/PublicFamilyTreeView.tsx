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

  const theme = family?.settings.theme;
  const primary = theme?.primary_color ?? "var(--gp-lacquer)";
  const surface = theme?.surface_color ?? "var(--gp-paper)";

  const openProfile = (id: string) => {
    const m = tree?.members.find((x) => x.id === id) ?? null;
    if (!m || m.status.is_placeholder) return;
    setProfileMember(m);
    setProfileOpen(true);
  };

  if (isLoading && !tree) {
    return <TreePageSkeleton />;
  }

  if (error || !tree) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center">
        <div className="gp-panel max-w-md p-8">
          <p className="gp-eyebrow">Không tìm thấy</p>
          <p className="mt-3 text-[var(--gp-lacquer)]">
            {error?.message ?? "Không tìm thấy dòng họ hoặc chưa có dữ liệu công khai."}
          </p>
          <p className="mt-2 text-sm text-[var(--gp-muted)]">
            Kiểm tra lại link chia sẻ, hoặc yêu cầu chủ dòng họ gửi lại.
          </p>
          <Link href="/" className="gp-btn gp-btn-ghost mt-5">
            Về trang chủ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex h-dvh max-h-dvh flex-col overflow-hidden"
      style={{
        background: surface,
        ["--ft-lacquer" as string]:
          theme?.primary_color ?? "var(--gp-lacquer)",
        ["--gp-lacquer" as string]: theme?.primary_color ?? "var(--gp-lacquer)",
      }}
    >
      {theme?.background_image ? (
        <div
          className="h-16 w-full shrink-0 bg-cover bg-center md:h-20"
          style={{ backgroundImage: `url(${theme.background_image})` }}
          role="img"
          aria-label="Ảnh nền dòng họ"
        />
      ) : (
        <div
          aria-hidden
          className="h-1.5 w-full shrink-0"
          style={{
            background: `linear-gradient(90deg, ${primary}, var(--gp-gold), ${primary})`,
          }}
        />
      )}

      <header className="shrink-0 border-b border-[var(--gp-scroll-edge)] bg-[color-mix(in_srgb,var(--gp-scroll)_92%,transparent)] px-4 py-3 backdrop-blur-sm md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="gp-eyebrow">
              <Link href="/" className="hover:underline">
                Gia phả
              </Link>
              {" · "}Chế độ chỉ xem
            </p>
            <h1 className="gp-title mt-1 text-xl md:text-2xl">
              Dòng họ {tree.clan_name}
            </h1>
            <p className="gp-lede mt-1 max-w-xl text-xs md:text-sm">
              {family?.settings.description ||
                "Click một người để xem hồ sơ · tìm kiếm / gom nhánh / zoom như bản quản trị."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <CopyShareLinkButton
              url={shareUrl}
              className="gp-btn gp-btn-primary"
              style={{ background: primary }}
            />
            <Link href="/login" className="gp-btn gp-btn-ghost">
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {tree.members.length === 0 ? (
          <div className="gp-panel grid flex-1 place-items-center text-sm text-[var(--gp-muted)]">
            Dòng họ chưa có thành viên công khai.
          </div>
        ) : (
          <section
            className="clan-tree-stage clan-tree-stage--expanded min-h-0 flex-1"
            aria-label="Cây hương hỏa công khai"
          >
            <FamilyTree
              data={tree}
              readOnly
              interactive
              showToolbar
              showMiniMap
              showControls
              className="clan-tree-stage__canvas"
              onMemberOpen={openProfile}
              onMemberDoubleClick={openProfile}
            />
          </section>
        )}
      </div>

      <ProfileModal
        member={profileMember}
        members={tree.members}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </main>
  );
}
