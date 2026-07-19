"use client";

import { useRef, useState } from "react";
import { FamilyTree, type FamilyTreeHandle } from "@/components/family-tree";
import { sampleFamilyTree } from "@/data/sample-family";
import type { FamilyTreeData, PlaceholderUpdatePayload } from "@/types/genealogy";

export default function HomePage() {
  const treeRef = useRef<FamilyTreeHandle>(null);
  const [data, setData] = useState<FamilyTreeData>(sampleFamilyTree);

  const handlePlaceholderUpdate = (payload: PlaceholderUpdatePayload) => {
    setData((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === payload.id
          ? {
              ...m,
              full_name: payload.full_name,
              is_placeholder: false,
              life_status: payload.life_status ?? m.life_status,
              gender: payload.gender ?? m.gender,
            }
          : m,
      ),
    }));
  };

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-stone-300/60 bg-[#e9eef3] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a1f1f]">
          Gia phả · Phase 2
        </p>
        <h1
          className="mt-1 text-2xl font-semibold text-[#1c1410]"
          style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
        >
          Dòng họ {data.clan_name}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          Mini-map, zoom, pan · Trace route từ Thủy tổ · Placeholder khuyết danh ·
          Cạnh con nuôi (ADOPTED) nét đứt animated.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-stone-400/50 bg-white px-3 py-1.5 text-sm font-semibold text-[#1c1410]"
            onClick={() => treeRef.current?.highlightPath("m8")}
          >
            Highlight Đức (m8)
          </button>
          <button
            type="button"
            className="rounded-lg border border-stone-400/50 bg-white px-3 py-1.5 text-sm font-semibold text-[#1c1410]"
            onClick={() => treeRef.current?.highlightPath("m6")}
          >
            Highlight Bình / con nuôi (m6)
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
          className="h-[calc(100vh-11rem)]"
        />
      </div>
    </main>
  );
}
