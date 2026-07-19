"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search, UserRound, X } from "lucide-react";
import { searchMembers } from "@/lib/search/member-search";
import {
  filterCoParentSpouses,
  treeParentRoleLabel,
} from "@/lib/genealogy/labels";
import type { FamilyBranch, FamilyMember } from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";

type ParentCascadePickerProps = {
  members: FamilyMember[];
  branches: FamilyBranch[];
  /** Chi trưởng nhánh được phép (null = mọi chi) */
  allowedBranchIds?: string[] | null;
  selectedParentId: string;
  onSelect: (parent: FamilyMember) => void;
  onClear?: () => void;
};

function childCountMap(members: FamilyMember[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of members) {
    const pid = m.tree_logic.parent_id;
    if (!pid) continue;
    map.set(pid, (map.get(pid) ?? 0) + 1);
  }
  return map;
}

/**
 * Chọn Cha/Mẹ (nối cây) theo cascade: Chi → Đời → tìm tên → chọn.
 */
export function ParentCascadePicker({
  members,
  branches,
  allowedBranchIds = null,
  selectedParentId,
  onSelect,
  onClear,
}: ParentCascadePickerProps) {
  const usableBranches = useMemo(() => {
    if (allowedBranchIds !== null && allowedBranchIds !== undefined) {
      if (allowedBranchIds.length === 0) return [];
      return branches.filter((b) => allowedBranchIds.includes(b.id));
    }
    return branches;
  }, [branches, allowedBranchIds]);

  const [branchId, setBranchId] = useState(
    () => usableBranches[0]?.id ?? "branch-main",
  );
  const [generation, setGeneration] = useState<number | "all">("all");
  const [query, setQuery] = useState("");

  const pool = useMemo(() => {
    return members.filter((m) => {
      if (m.status.is_placeholder) return false;
      if (allowedBranchIds !== null && allowedBranchIds !== undefined) {
        if (!allowedBranchIds.length) return false;
        if (!allowedBranchIds.includes(m.tree_logic.branch_id)) return false;
      }
      if (branchId && m.tree_logic.branch_id !== branchId) return false;
      return true;
    });
  }, [members, branchId, allowedBranchIds]);

  const generations = useMemo(() => {
    const set = new Set<number>();
    for (const m of pool) set.add(memberGeneration(m));
    return [...set].sort((a, b) => a - b);
  }, [pool]);

  const filteredByGen = useMemo(() => {
    if (generation === "all") return pool;
    return pool.filter((m) => memberGeneration(m) === generation);
  }, [pool, generation]);

  const kids = useMemo(() => childCountMap(members), [members]);

  const hits = useMemo(() => {
    if (query.trim()) {
      return searchMembers(filteredByGen, query, 20, branches);
    }
    return filteredByGen
      .slice()
      .sort((a, b) => {
        const ka = kids.get(a.id) ?? 0;
        const kb = kids.get(b.id) ?? 0;
        if (kb !== ka) return kb - ka;
        return a.full_name.localeCompare(b.full_name, "vi");
      })
      .slice(0, 24)
      .map((member) => ({
        member,
        generation: memberGeneration(member),
        branchName:
          branches.find((b) => b.id === member.tree_logic.branch_id)?.name ??
          member.tree_logic.branch_id,
        lineage: null as string | null,
        marriage: member.spouses.length
          ? member.spouses
              .map((s) => s.full_name)
              .filter(Boolean)
              .join(" · ")
          : null,
        childCount: kids.get(member.id) ?? 0,
        aka: null as string | null,
        score: undefined as number | undefined,
      }));
  }, [filteredByGen, query, branches, kids]);

  const selected = members.find((m) => m.id === selectedParentId) ?? null;
  const roleLabel = treeParentRoleLabel(selected);

  if (selected) {
    const gen = memberGeneration(selected);
    const branchLabel =
      branches.find((b) => b.id === selected.tree_logic.branch_id)?.name ??
      selected.tree_logic.branch_id;
    const coParents = filterCoParentSpouses(selected);
    return (
      <div className="rounded-lg border border-[#7a1f1f]/25 bg-[#7a1f1f]/05 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-[#7a1f1f]">
              {roleLabel} (nối cây) đã chọn
            </p>
            <p className="mt-1 font-semibold text-[#1c1410]">
              {selected.full_name || "Khuyết danh"}
            </p>
            <p className="mt-0.5 text-xs text-[#5c564e]">
              Đời {gen} · {branchLabel} · {kids.get(selected.id) ?? 0} con trong
              cây
            </p>
            {coParents.length ? (
              <p className="mt-1 text-xs text-[#3d372f]">
                {selected.gender === "FEMALE" ? "Rể" : "Dâu"}:{" "}
                {coParents.map((d) => d.full_name).join(" · ")}
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-800">
                {selected.gender === "FEMALE"
                  ? "Chưa có rể — có thể thêm chồng trên hồ sơ, hoặc ghi con không gắn cha (rể)."
                  : "Chưa có dâu — có thể thêm vợ trên hồ sơ, hoặc ghi con không gắn mẹ (dâu)."}
              </p>
            )}
          </div>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-md border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-white"
            >
              <X size={14} aria-hidden />
              Đổi
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/60 p-3">
      <div className="flex flex-wrap items-center gap-1 text-xs font-semibold text-[#7a1f1f]">
        <span>Chọn Cha/Mẹ (nối cây)</span>
        <ChevronRight size={12} aria-hidden />
        <span>Chi</span>
        <ChevronRight size={12} aria-hidden />
        <span>Đời</span>
        <ChevronRight size={12} aria-hidden />
        <span>Tìm tên</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-stone-700">
          Chi / nhánh
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setGeneration("all");
              setQuery("");
            }}
            className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base font-normal sm:text-sm"
          >
            {usableBranches.length === 0 ? (
              <option value={branchId}>—</option>
            ) : (
              usableBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="block text-xs font-semibold text-stone-700">
          Đời của Cha/Mẹ
          <select
            value={generation === "all" ? "all" : String(generation)}
            onChange={(e) => {
              const v = e.target.value;
              setGeneration(v === "all" ? "all" : Number(v));
              setQuery("");
            }}
            className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base font-normal sm:text-sm"
          >
            <option value="all">Mọi đời ({pool.length} người)</option>
            {generations.map((g) => {
              const count = pool.filter((m) => memberGeneration(m) === g).length;
              return (
                <option key={g} value={g}>
                  Đời {g} ({count}) — con = đời {g + 1}
                </option>
              );
            })}
          </select>
        </label>
      </div>

      <label className="relative block text-xs font-semibold text-stone-700">
        Tìm tên (hoặc vuốt danh sách bên dưới)
        <span className="relative mt-1 block">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="VD: Hữu Đình, Thị Lan…"
            className="min-h-11 w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-10 pr-3 text-base font-normal sm:text-sm"
            enterKeyHint="search"
          />
        </span>
      </label>

      <ul className="max-h-[min(50vh,20rem)] overflow-y-auto overscroll-contain rounded-lg border border-stone-200 bg-white divide-y divide-stone-100 [-webkit-overflow-scrolling:touch]">
        {hits.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-stone-500">
            Không có ai khớp — đổi chi / đời / từ khóa.
          </li>
        ) : (
          hits.map((h) => {
            const role = treeParentRoleLabel(h.member);
            return (
              <li key={h.member.id}>
                <button
                  type="button"
                  onClick={() => onSelect(h.member)}
                  className="flex min-h-[3.25rem] w-full items-start gap-2.5 px-3 py-3 text-left active:bg-[#7a1f1f]/10 hover:bg-[#7a1f1f]/06"
                >
                  <UserRound
                    size={18}
                    className="mt-0.5 shrink-0 text-[#7a1f1f]"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-[#1c1410]">
                      <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wide text-[#7a1f1f]">
                        {role}
                      </span>
                      {h.member.full_name}
                    </span>
                    <span className="mt-0.5 block text-xs text-stone-500">
                      Đời {h.generation} · {h.branchName} · {h.childCount} con
                      {h.marriage ? ` · ${h.marriage}` : ""}
                    </span>
                    {h.lineage ? (
                      <span className="mt-0.5 block text-xs text-stone-400">
                        {h.lineage}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
      <p className="text-[11px] leading-relaxed text-stone-500">
        Nam → gắn là <strong>Cha</strong>; nữ → gắn là <strong>Mẹ</strong>. Có
        thể ghi con của con gái (họ chồng) nếu admin muốn.
      </p>
    </div>
  );
}
