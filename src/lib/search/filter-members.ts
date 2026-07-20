import type { FamilyBranch, FamilyMember } from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";
import { searchMembers } from "@/lib/search/member-search";
import { stripVietnameseDiacritics } from "@/lib/search/normalize";

export type MemberListGroupBy = "list" | "generation" | "branch";

export type MemberListFilters = {
  query: string;
  generation: number | "all";
  branchId: string | "all";
  life: "all" | "alive" | "deceased";
  includePlaceholders: boolean;
};

export type MemberListRow = {
  member: FamilyMember;
  generation: number;
  branchName: string;
  aka: string | null;
  spousesLabel: string | null;
};

function branchNameOf(
  member: FamilyMember,
  branches: FamilyBranch[] | undefined,
): string {
  const id = member.tree_logic.branch_id;
  return branches?.find((b) => b.id === id)?.name ?? id;
}

function akaOf(member: FamilyMember): string | null {
  const parts = [
    member.traditional_names.birth
      ? `húy ${member.traditional_names.birth}`
      : null,
    member.traditional_names.courtesy
      ? `tự ${member.traditional_names.courtesy}`
      : null,
    member.traditional_names.posthumous
      ? `thụy ${member.traditional_names.posthumous}`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

function spousesOf(member: FamilyMember): string | null {
  if (!member.spouses.length) return null;
  return member.spouses
    .map((s) => {
      const role =
        s.role === "DAU" ? "dâu" : s.role === "RE" ? "rể" : "phối ngẫu";
      return `${s.full_name} (${role})`;
    })
    .join(", ");
}

export function toMemberListRow(
  member: FamilyMember,
  branches?: FamilyBranch[],
): MemberListRow {
  return {
    member,
    generation: memberGeneration(member),
    branchName: branchNameOf(member, branches),
    aka: akaOf(member),
    spousesLabel: spousesOf(member),
  };
}

/** Lọc + tìm kiếm danh sách thành viên (đời / chi / sống-mất / gõ tên). */
export function filterMemberList(
  members: FamilyMember[],
  filters: MemberListFilters,
  branches?: FamilyBranch[],
): MemberListRow[] {
  let pool = members;

  if (!filters.includePlaceholders) {
    pool = pool.filter((m) => !m.status.is_placeholder);
  }

  if (filters.branchId !== "all") {
    pool = pool.filter((m) => m.tree_logic.branch_id === filters.branchId);
  }

  if (filters.generation !== "all") {
    pool = pool.filter((m) => memberGeneration(m) === filters.generation);
  }

  if (filters.life === "alive") {
    pool = pool.filter((m) => m.status.is_alive);
  } else if (filters.life === "deceased") {
    pool = pool.filter((m) => !m.status.is_alive);
  }

  const q = filters.query.trim();
  if (q) {
    const hits = searchMembers(pool, q, Math.max(pool.length, 50), branches);
    const hitIds = new Set(hits.map((h) => h.member.id));
    // Fallback: nếu Fuse bỏ sót id chính xác
    const norm = stripVietnameseDiacritics(q);
    pool = pool.filter(
      (m) =>
        hitIds.has(m.id) ||
        stripVietnameseDiacritics(m.full_name).includes(norm) ||
        m.id === q,
    );
    // Giữ thứ tự gần đúng với điểm Fuse
    const order = new Map(hits.map((h, i) => [h.member.id, i]));
    pool = [...pool].sort(
      (a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999),
    );
  } else {
    pool = [...pool].sort((a, b) => {
      const ga = memberGeneration(a) - memberGeneration(b);
      if (ga !== 0) return ga;
      return a.full_name.localeCompare(b.full_name, "vi");
    });
  }

  return pool.map((m) => toMemberListRow(m, branches));
}

export function groupMemberRows(
  rows: MemberListRow[],
  groupBy: MemberListGroupBy,
): { key: string; label: string; rows: MemberListRow[] }[] {
  if (groupBy === "list") {
    return [{ key: "all", label: "Tất cả", rows }];
  }

  const map = new Map<string, MemberListRow[]>();
  for (const row of rows) {
    const key =
      groupBy === "generation"
        ? `gen-${row.generation}`
        : `branch-${row.member.tree_logic.branch_id}`;
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }

  const entries = [...map.entries()].map(([key, groupRows]) => {
    if (groupBy === "generation") {
      const gen = groupRows[0]?.generation ?? 0;
      return {
        key,
        label: `Đời thứ ${gen}`,
        rows: groupRows,
        sort: gen,
      };
    }
    return {
      key,
      label: groupRows[0]?.branchName ?? "Chi",
      rows: groupRows,
      sort: groupRows[0]?.branchName ?? "",
    };
  });

  entries.sort((a, b) => {
    if (typeof a.sort === "number" && typeof b.sort === "number") {
      return a.sort - b.sort;
    }
    return String(a.sort).localeCompare(String(b.sort), "vi");
  });

  return entries.map(({ key, label, rows: r }) => ({ key, label, rows: r }));
}

export function listGenerations(members: FamilyMember[]): number[] {
  const set = new Set(members.map(memberGeneration));
  return [...set].sort((a, b) => a - b);
}
