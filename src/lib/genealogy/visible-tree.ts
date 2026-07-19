import type { FamilyMember, FamilyRelation } from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";

export type ViewMode = "compact" | "full" | "lineage";

export function buildChildrenIndex(
  members: FamilyMember[],
): Map<string, FamilyMember[]> {
  const map = new Map<string, FamilyMember[]>();
  for (const m of members) {
    const pid = m.tree_logic.parent_id;
    if (!pid) continue;
    const list = map.get(pid);
    if (list) list.push(m);
    else map.set(pid, [m]);
  }
  return map;
}

export function countDescendants(
  memberId: string,
  childrenIndex: Map<string, FamilyMember[]>,
): number {
  const kids = childrenIndex.get(memberId);
  if (!kids?.length) return 0;
  let n = kids.length;
  for (const k of kids) {
    n += countDescendants(k.id, childrenIndex);
  }
  return n;
}

/** Ẩn mọi hậu duệ của các node đang gom (giữ chính node đó). */
export function isHiddenByCollapse(
  member: FamilyMember,
  collapsedIds: Set<string>,
): boolean {
  if (collapsedIds.size === 0) return false;
  const path = member.tree_logic.path;
  for (let i = 0; i < path.length - 1; i++) {
    if (collapsedIds.has(path[i]!)) return true;
  }
  return false;
}

/**
 * Gom mặc định: thu mọi người có con từ đời `fromGen` trở đi
 * (giữ vài đời đầu mở để cây đọc được).
 */
export function computeCompactCollapsedIds(
  members: FamilyMember[],
  childrenIndex: Map<string, FamilyMember[]>,
  fromGen = 3,
): Set<string> {
  const collapsed = new Set<string>();
  for (const m of members) {
    if (m.status.is_placeholder) continue;
    const kids = childrenIndex.get(m.id);
    if (!kids?.length) continue;
    if (memberGeneration(m) >= fromGen) {
      collapsed.add(m.id);
    }
  }
  return collapsed;
}

/** Mở đường từ thủy tổ → target để người đó hiện trên cây đã gom. */
export function expandAncestors(
  collapsedIds: Set<string>,
  path: string[],
): Set<string> {
  if (collapsedIds.size === 0) return collapsedIds;
  const next = new Set(collapsedIds);
  for (let i = 0; i < path.length - 1; i++) {
    next.delete(path[i]!);
  }
  return next;
}

/**
 * Tổ tiên + bản thân + anh chị em + con trực tiếp.
 * Đọc nhanh khi chọn một người trong cây lớn.
 */
export function lineageNeighborhoodIds(
  members: FamilyMember[],
  targetId: string,
  childrenIndex: Map<string, FamilyMember[]>,
): Set<string> {
  const byId = new Map(members.map((m) => [m.id, m]));
  const target = byId.get(targetId);
  if (!target) return new Set();

  const ids = new Set<string>(target.tree_logic.path);

  const parentId = target.tree_logic.parent_id;
  if (parentId) {
    for (const sib of childrenIndex.get(parentId) ?? []) {
      ids.add(sib.id);
    }
  }

  for (const child of childrenIndex.get(targetId) ?? []) {
    ids.add(child.id);
  }

  return ids;
}

export type VisibleTreeOptions = {
  collapsedIds: Set<string>;
  branchId?: string | null;
  includeIds?: Set<string> | null;
};

export function filterVisibleMembers(
  members: FamilyMember[],
  options: VisibleTreeOptions,
): FamilyMember[] {
  const { collapsedIds, branchId = null, includeIds = null } = options;

  return members.filter((m) => {
    if (includeIds && !includeIds.has(m.id)) return false;
    if (branchId && m.tree_logic.branch_id !== branchId) return false;
    if (isHiddenByCollapse(m, collapsedIds)) return false;
    return true;
  });
}

export function filterVisibleRelations(
  relations: FamilyRelation[],
  visibleIds: Set<string>,
): FamilyRelation[] {
  return relations.filter(
    (r) => visibleIds.has(r.source) && visibleIds.has(r.target),
  );
}

export function buildMemberNameMap(
  members: FamilyMember[],
): Map<string, string> {
  return new Map(
    members.map((m) => [
      m.id,
      m.status.is_placeholder
        ? "Khuyết danh"
        : m.full_name || "Không tên",
    ]),
  );
}

/**
 * Chuỗi huyết thống ngắn, dễ đọc:
 * "cha: Dương A · ông: Dương B · cố: Dương C"
 */
export function formatLineageLabel(
  member: FamilyMember,
  nameById: Map<string, string>,
  maxAncestors = 3,
): string | null {
  const path = member.tree_logic.path;
  if (path.length < 2) return "Thủy tổ";

  const ancestors = path.slice(0, -1).reverse().slice(0, maxAncestors);
  const labels = ["cha", "ông", "cố", "kỵ", "tổ"];
  const parts: string[] = [];

  for (let i = 0; i < ancestors.length; i++) {
    const name = nameById.get(ancestors[i]!) ?? "…";
    const role = labels[i] ?? `đời−${i + 1}`;
    parts.push(`${role}: ${name}`);
  }

  return parts.join(" · ");
}
