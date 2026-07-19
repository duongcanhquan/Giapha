import Fuse from "fuse.js";
import type { FamilyMember } from "@/types/genealogy";
import { stripVietnameseDiacritics } from "./normalize";

export type MemberSearchHit = {
  member: FamilyMember;
  score: number | undefined;
};

type SearchableMember = FamilyMember & {
  _search: string;
};

function toSearchable(member: FamilyMember): SearchableMember {
  const parts = [
    member.full_name,
    member.names?.huy,
    member.names?.thuy,
    member.names?.tu,
    member.notes,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ...member,
    _search: stripVietnameseDiacritics(parts),
  };
}

/**
 * Fuzzy search thành viên — không phân biệt dấu / hoa thường.
 */
export function searchMembers(
  members: FamilyMember[],
  query: string,
  limit = 8,
): MemberSearchHit[] {
  const q = stripVietnameseDiacritics(query);
  if (!q) return [];

  const fuse = new Fuse(members.map(toSearchable), {
    keys: ["_search", "full_name", "id"],
    threshold: 0.35,
    ignoreLocation: true,
    includeScore: true,
  });

  return fuse.search(q, { limit }).map((r) => ({
    member: r.item,
    score: r.score,
  }));
}
