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

  if (isLoading && !tree) {
    return <TreePageSkeleton />;
  }

  if (error || !tree) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center">
        <div className="gp-panel max-w-md p-8">
          <p className="gp-eyebrow">Không tìm thấy</p>
          <p className="mt-3 text-[var(--gp-lacquer)]">
            {error?.message ?? "Không tìm thấy dòng họ."}
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
      className="flex min-h-screen flex-col"
      style={{
        background: surface,
        ["--ft-lacquer" as string]:
          theme?.primary_color ?? "var(--gp-lacquer)",
        ["--gp-lacquer" as string]: theme?.primary_color ?? "var(--gp-lacquer)",
      }}
    >
      {theme?.background_image ? (
        <div
          className="h-28 w-full bg-cover bg-center md:h-36"
          style={{ backgroundImage: `url(${theme.background_image})` }}
          role="img"
          aria-label="Ảnh nền dòng họ"
        />
      ) : (
        <div
          aria-hidden
          className="h-2 w-full"
          style={{
            background: `linear-gradient(90deg, ${primary}, var(--gp-gold), ${primary})`,
          }}
        />
      )}

      <header className="border-b border-[var(--gp-scroll-edge)] bg-[color-mix(in_srgb,var(--gp-scroll)_88%,transparent)] px-4 py-5 backdrop-blur-sm md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="gp-eyebrow">
              <Link href="/" className="hover:underline">
                Gia phả
              </Link>
              {" · "}Chế độ chỉ xem
            </p>
            <h1 className="gp-title mt-2 text-2xl md:text-3xl">
              Dòng họ {tree.clan_name}
            </h1>
            <p className="gp-lede mt-1.5 max-w-xl text-sm">
              {family?.settings.description ||
                "Bạn đang xem bản được chia sẻ. Thành viên quản trị hãy đăng nhập để vào đúng gia phả nhà mình."}
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

      <div className="min-h-0 flex-1 p-3 md:p-5">
        {tree.members.length === 0 ? (
          <div className="gp-panel grid h-[60vh] place-items-center text-sm text-[var(--gp-muted)]">
            Dòng họ chưa có thành viên công khai.
          </div>
        ) : (
          <FamilyTree
            data={tree}
            readOnly
            showToolbar
            className="h-[calc(100vh-11rem)]"
            onMemberDoubleClick={(id) => {
              const m = tree.members.find((x) => x.id === id) ?? null;
              if (!m || m.status.is_placeholder) return;
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
