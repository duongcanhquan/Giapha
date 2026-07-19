import type { FamilyMember, FamilyRelation } from "@/types/genealogy";
import { edgeIdsOnPath, extractPathIds } from "./build-flow";

export type PathHighlightResult = {
  /** Id thành viên trên đường Thủy tổ → target (từ `tree_logic.path`) */
  pathNodeIds: string[];
  /** Id cạnh thuộc path */
  pathEdgeIds: Set<string>;
  /** true nếu id không thuộc path → cần mờ (opacity 0.2) */
  isNodeDimmed: (id: string) => boolean;
  isEdgeDimmed: (edgeId: string) => boolean;
  isNodeHighlighted: (id: string) => boolean;
  isEdgeHighlighted: (edgeId: string) => boolean;
};

/**
 * Trace Route: path Thủy tổ → target (+ con trực tiếp của target để dễ đọc).
 */
export function traceRoute(
  targetId: string,
  members: FamilyMember[],
  relations: FamilyRelation[],
): PathHighlightResult {
  const pathNodeIds = extractPathIds(members, targetId);
  const pathSet = new Set(pathNodeIds);

  // Thêm con trực tiếp của người được tìm — vẫn “đúng cây”, không lan ra nhánh khác
  for (const m of members) {
    if (m.tree_logic.parent_id === targetId) {
      pathSet.add(m.id);
    }
  }

  const highlightNodes = [...pathSet];
  const pathEdgeIds = edgeIdsOnPath(relations, pathNodeIds);
  // Cạnh cha→con trực tiếp của target
  for (const rel of relations) {
    if (rel.source === targetId && pathSet.has(rel.target)) {
      pathEdgeIds.add(rel.id);
    }
  }

  return {
    pathNodeIds: highlightNodes,
    pathEdgeIds,
    isNodeDimmed: (id) => !pathSet.has(id),
    isEdgeDimmed: (edgeId) => !pathEdgeIds.has(edgeId),
    isNodeHighlighted: (id) => pathSet.has(id),
    isEdgeHighlighted: (edgeId) => pathEdgeIds.has(edgeId),
  };
}

/** @deprecated dùng `traceRoute` */
export const highlightPath = traceRoute;
