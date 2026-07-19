import Fuse from "fuse.js";
import type { FamilyBranch, FamilyMember } from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";
import { stripVietnameseDiacritics } from "./normalize";
import {
  buildMemberNameMap,
  formatLineageLabel,
} from "@/lib/genealogy/visible-tree";

export type MemberSearchHit = {
  member: FamilyMember;
  score: number | undefined;
  generation: number;
  branchName: string;
  lineage: string | null;
  aka: string | null;
  childCount: number;
  /** VD: "Cưới Nguyễn Thị Lan (dâu)" */
  marriage: string | null;
};

type SearchableMember = FamilyMember & {
  _search: string;
  _branch: string;
};

function marriageLine(member: FamilyMember): string | null {
  if (!member.spouses.length) return null;
  return member.spouses
    .map((s) => {
      const role =
        s.role === "DAU" ? "dâu" : s.role === "RE" ? "rể" : "phối ngẫu";
      return `Cưới ${s.full_name} (${role})`;
    })
    .join(" · ");
}

function akaLine(member: FamilyMember): string | null {
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

function branchNameOf(
  member: FamilyMember,
  branches: FamilyBranch[] | undefined,
): string {
  const id = member.tree_logic.branch_id;
  const found = branches?.find((b) => b.id === id);
  return found?.name ?? id;
}

function toSearchable(
  member: FamilyMember,
  branches: FamilyBranch[] | undefined,
): SearchableMember {
  const branch = branchNameOf(member, branches);
  const parts = [
    member.full_name,
    member.traditional_names.birth,
    member.traditional_names.courtesy,
    member.traditional_names.posthumous,
    member.notes,
    member.biography,
    branch,
    ...member.spouses.map((s) => s.full_name),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ...member,
    _search: stripVietnameseDiacritics(parts),
    _branch: stripVietnameseDiacritics(branch),
  };
}

const fuseCache = new WeakMap<
  FamilyMember[],
  { key: string; fuse: Fuse<SearchableMember>; searchable: SearchableMember[] }
>();

function getFuse(
  members: FamilyMember[],
  branches: FamilyBranch[] | undefined,
): { fuse: Fuse<SearchableMember>; searchable: SearchableMember[] } {
  const key = `${members.length}:${branches?.map((b) => b.id).join(",") ?? ""}`;
  const cached = fuseCache.get(members);
  if (cached && cached.key === key) {
    return { fuse: cached.fuse, searchable: cached.searchable };
  }

  const searchable = members.map((m) => toSearchable(m, branches));
  const fuse = new Fuse(searchable, {
    keys: [
      { name: "_search", weight: 0.55 },
      { name: "full_name", weight: 0.3 },
      { name: "_branch", weight: 0.1 },
      { name: "id", weight: 0.05 },
    ],
    threshold: 0.38,
    ignoreLocation: true,
    includeScore: true,
  });
  fuseCache.set(members, { key, fuse, searchable });
  return { fuse, searchable };
}

export function searchMembers(
  members: FamilyMember[],
  query: string,
  limit = 12,
  branches?: FamilyBranch[],
): MemberSearchHit[] {
  const q = stripVietnameseDiacritics(query);
  if (!q) return [];

  // Cache theo mảng members gốc (ổn định qua SWR), không filter() mỗi lần gõ.
  const { fuse } = getFuse(members, branches);
  const nameById = buildMemberNameMap(members);

  const childCountByParent = new Map<string, number>();
  for (const m of members) {
    const pid = m.tree_logic.parent_id;
    if (!pid) continue;
    childCountByParent.set(pid, (childCountByParent.get(pid) ?? 0) + 1);
  }

  return fuse
    .search(q, { limit: limit * 2 })
    .filter((r) => !r.item.status.is_placeholder)
    .slice(0, limit)
    .map((r) => {
      const member = r.item as FamilyMember;
      return {
        member,
        score: r.score,
        generation: memberGeneration(member),
        branchName: branchNameOf(member, branches),
        lineage: formatLineageLabel(member, nameById, 3),
        aka: akaLine(member),
        marriage: marriageLine(member),
        childCount: childCountByParent.get(member.id) ?? 0,
      };
    });
}
