"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search, UserRound, X } from "lucide-react";
import { searchMembers } from "@/lib/search/member-search";
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
 * Chọn cha theo cascade: Chi → Đời → tìm tên → chọn.
 * Tránh dropdown 500 người trên cây 15 đời.
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
    // Không gõ tìm: liệt kê ngắn theo đời (ưu tiên nam đã có dâu / nhiều con)
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

  if (selected) {
    const gen = memberGeneration(selected);
    const branchLabel =
      branches.find((b) => b.id === selected.tree_logic.branch_id)?.name ??
      selected.tree_logic.branch_id;
    const daus = selected.spouses.filter((s) => s.role === "DAU");
    return (
      <div className="rounded-lg border border-[#7a1f1f]/25 bg-[#7a1f1f]/05 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-[#7a1f1f]">
              Cha đã chọn
            </p>
            <p className="mt-1 font-semibold text-[#1c1410]">
              {selected.full_name || "Khuyết danh"}
            </p>
            <p className="mt-0.5 text-xs text-[#5c564e]">
              Đời {gen} · {branchLabel} · {kids.get(selected.id) ?? 0} con trong
              cây
            </p>
            {daus.length ? (
              <p className="mt-1 text-xs text-[#3d372f]">
                Dâu: {daus.map((d) => d.full_name).join(" · ")}
              </p>
            ) : (
              <p className="mt-1 text-xs text-amber-800">
                Chưa có dâu — thêm vợ trên hồ sơ cha trước nếu cần gắn mẹ.
              </p>
            )}
          </div>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 rounded-md border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-white"
            >
              <X size={14} aria-hidden />
              Đổi cha
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/60 p-3">
      <div className="flex flex-wrap items-center gap-1 text-xs font-semibold text-[#7a1f1f]">
        <span>Chọn cha</span>
        <ChevronRight size={12} aria-hidden />
        <span>Chi</span>
        <ChevronRight size={12} aria-hidden />
        <span>Đời</span>
        <ChevronRight size={12} aria-hidden />
        <span>Tìm tên</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-stone-700">
          Chi / nhánh
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setGeneration("all");
              setQuery("");
            }}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-normal"
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
          Đời của cha
          <select
            value={generation === "all" ? "all" : String(generation)}
            onChange={(e) => {
              const v = e.target.value;
              setGeneration(v === "all" ? "all" : Number(v));
              setQuery("");
            }}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-normal"
          >
            <option value="all">Mọi đời ({pool.length} người)</option>
            {generations.map((g) => {
              const count = pool.filter((m) => memberGeneration(m) === g).length;
              return (
                <option key={g} value={g}>
                  Đời {g} ({count} người) — thêm con = đời {g + 1}
                </option>
              );
            })}
          </select>
        </label>
      </div>

      <label className="relative block text-xs font-semibold text-stone-700">
        Tìm tên cha (hoặc để trống xem danh sách)
        <span className="relative mt-1 block">
          <Search
            size={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="VD: Hữu Đình, Quốc…"
            className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-8 pr-3 text-sm font-normal"
          />
        </span>
      </label>

      <ul className="max-h-56 overflow-y-auto rounded-lg border border-stone-200 bg-white divide-y divide-stone-100">
        {hits.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-stone-500">
            Không có ai khớp — đổi chi / đời / từ khóa.
          </li>
        ) : (
          hits.map((h) => (
            <li key={h.member.id}>
              <button
                type="button"
                onClick={() => onSelect(h.member)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-[#7a1f1f]/06"
              >
                <UserRound
                  size={16}
                  className="mt-0.5 shrink-0 text-[#7a1f1f]"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-[#1c1410]">
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
          ))
        )}
      </ul>
      <p className="text-[11px] text-stone-500">
        Đang xem {hits.length}
        {query.trim() ? " kết quả tìm" : " gợi ý"}
        {generation !== "all" ? ` trong đời ${generation}` : ""} · tổng{" "}
        {filteredByGen.length} người sau lọc chi
        {generation !== "all" ? "/đời" : ""}.
      </p>
    </div>
  );
}
