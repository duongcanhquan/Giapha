import type { FamilyMember, FamilyRelation } from "@/types/genealogy";
import { edgeIdsOnPath, extractPathIds } from "./build-flow";

export type PathHighlightResult = {
  /** Id thành viên trên đường Thủy tổ → target (từ `member.path`) */
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
 * Trace Route: nhận `target_id`, trích `path` của thành viên đó,
 * trả về tập node/edge cần highlight (đỏ/vàng) vs làm mờ (0.2).
 */
export function highlightPath(
  targetId: string,
  members: FamilyMember[],
  relations: FamilyRelation[],
): PathHighlightResult {
  const pathNodeIds = extractPathIds(members, targetId);
  const pathSet = new Set(pathNodeIds);
  const pathEdgeIds = edgeIdsOnPath(relations, pathNodeIds);

  return {
    pathNodeIds,
    pathEdgeIds,
    isNodeDimmed: (id) => !pathSet.has(id),
    isEdgeDimmed: (edgeId) => !pathEdgeIds.has(edgeId),
    isNodeHighlighted: (id) => pathSet.has(id),
    isEdgeHighlighted: (edgeId) => pathEdgeIds.has(edgeId),
  };
}
