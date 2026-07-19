"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { FamilyTree, type FamilyTreeHandle } from "@/components/family-tree";
import { ExportTreeButton } from "@/components/export/ExportTreeButton";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { sampleFamilyTree } from "@/data/sample-family";
import type { FamilyMember, FamilyTreeData, PlaceholderUpdatePayload } from "@/types/genealogy";

function FamilyTreePageInner() {
  const searchParams = useSearchParams();
  const familyId = searchParams.get("family_id");
  const treeRef = useRef<FamilyTreeHandle>(null);
  const [data, setData] = useState<FamilyTreeData>(sampleFamilyTree);
  const [profileMember, setProfileMember] = useState<FamilyMember | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const handlePlaceholderUpdate = (payload: PlaceholderUpdatePayload) => {
    setData((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === payload.id
          ? {
              ...m,
              full_name: payload.full_name,
              status: {
                ...m.status,
                is_placeholder: false,
                is_alive: payload.is_alive ?? m.status.is_alive,
              },
              gender: payload.gender ?? m.gender,
            }
          : m,
      ),
    }));
  };

  const openProfile = (memberId: string) => {
    const member = data.members.find((m) => m.id === memberId) ?? null;
    if (!member || member.status.is_placeholder) return;
    setProfileMember(member);
    setProfileOpen(true);
  };

  return (
    <main className="flex min-h-screen flex-col bg-[#e9eef3]">
      <header className="border-b border-stone-300/60 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a1f1f]">
              <Link href="/" className="hover:underline">
                Giapha
              </Link>
              {" · "}Cây gia phả
            </p>
            <h1
              className="mt-1 text-2xl font-semibold text-[#1c1410]"
              style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
            >
              Dòng họ {data.clan_name}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-stone-600">
              Double-click một người để xem hồ sơ · Trace route · Xuất PDF khổ A0 để in ấn.
            </p>
            {familyId ? (
              <p className="mt-2 text-xs font-medium text-[#7a1f1f]">
                Tenant <code className="rounded bg-white/80 px-1">{familyId}</code>
                {" · "}đang xem bản demo UI; nối Firestore query theo family_id ở phase tiếp.
              </p>
            ) : (
              <p className="mt-2 text-xs text-stone-500">
                Bản demo công khai.{" "}
                <Link href="/register" className="font-semibold text-[#7a1f1f] hover:underline">
                  Đăng ký
                </Link>{" "}
                để tạo gia phả riêng.
              </p>
            )}
          </div>
          <ExportTreeButton
            data={data}
            className="rounded-lg bg-[#7a1f1f] px-3 py-2 text-sm font-semibold text-[#fffdf8] disabled:opacity-60"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-stone-400/50 bg-white px-3 py-1.5 text-sm font-semibold text-[#1c1410]"
            onClick={() => treeRef.current?.traceRoute("m8")}
          >
            Trace Đức
          </button>
          <button
            type="button"
            className="rounded-lg border border-stone-400/50 bg-white px-3 py-1.5 text-sm font-semibold text-[#1c1410]"
            onClick={() => treeRef.current?.traceRoute("m6")}
          >
            Trace Bình
          </button>
          <button
            type="button"
            className="rounded-lg border border-stone-400/50 bg-white px-3 py-1.5 text-sm font-semibold text-[#1c1410]"
            onClick={() => treeRef.current?.clearHighlight()}
          >
            Xoá highlight
          </button>
          <button
            type="button"
            className="rounded-lg border border-stone-400/50 bg-white px-3 py-1.5 text-sm font-semibold text-[#1c1410]"
            onClick={() => treeRef.current?.fitView()}
          >
            Fit view
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 p-3 md:p-4">
        <FamilyTree
          ref={treeRef}
          data={data}
          onPlaceholderUpdate={handlePlaceholderUpdate}
          onMemberDoubleClick={openProfile}
          className="h-[calc(100vh-11rem)]"
        />
      </div>

      <ProfileModal
        member={profileMember}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </main>
  );
}

export default function FamilyTreePage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center text-sm text-stone-500">
          Đang tải cây gia phả…
        </main>
      }
    >
      <FamilyTreePageInner />
    </Suspense>
  );
}
