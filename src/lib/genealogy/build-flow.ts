import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";
import type {
  FamilyMember,
  FamilyRelation,
  FamilyTreeData,
} from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";
import type { MemberNodeData } from "@/components/family-tree/nodes/MemberNode";
import type { PlaceholderNodeData } from "@/components/family-tree/nodes/PlaceholderNode";
import type { RelationshipEdgeData } from "@/components/family-tree/edges/RelationshipEdge";

/** Kích thước ước lượng cho dagre (tránh overlap) */
const BASE_NODE_WIDTH = 200;
const BASE_NODE_HEIGHT = 88;
const SPOUSE_ROW_HEIGHT = 44;
const COLLAPSE_ROW_HEIGHT = 32;
const PLACEHOLDER_HEIGHT = 96;

export type FamilyFlowNode = Node<MemberNodeData | PlaceholderNodeData>;
export type FamilyFlowEdge = Edge<RelationshipEdgeData>;

export function memberNodeType(member: FamilyMember): "member" | "placeholder" {
  return member.status.is_placeholder ? "placeholder" : "member";
}

function estimateNodeSize(
  member: FamilyMember,
  childCount: number,
): { width: number; height: number } {
  if (member.status.is_placeholder) {
    return { width: 168, height: PLACEHOLDER_HEIGHT };
  }
  const spouseCount = member.spouses.length;
  const collapseExtra = childCount > 0 ? COLLAPSE_ROW_HEIGHT : 0;
  return {
    width: BASE_NODE_WIDTH,
    height: BASE_NODE_HEIGHT + spouseCount * SPOUSE_ROW_HEIGHT + collapseExtra,
  };
}

/**
 * Dagre TB layout: phân cấp đời từ trên xuống, nodesep/ranksep đều,
 * không overlap. Tọa độ chuyển sang React Flow (top-left).
 */
export function layoutWithDagre(
  nodes: FamilyFlowNode[],
  edges: FamilyFlowEdge[],
  sizeById: Map<string, { width: number; height: number }>,
): FamilyFlowNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    align: "UL",
    nodesep: 72,
    ranksep: 110,
    marginx: 48,
    marginy: 48,
    edgesep: 24,
  });

  for (const node of nodes) {
    const size = sizeById.get(node.id) ?? {
      width: BASE_NODE_WIDTH,
      height: BASE_NODE_HEIGHT,
    };
    g.setNode(node.id, { width: size.width, height: size.height });
  }

  for (const edge of edges) {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const laid = g.node(node.id);
    const size = sizeById.get(node.id) ?? {
      width: BASE_NODE_WIDTH,
      height: BASE_NODE_HEIGHT,
    };
    if (!laid) {
      return node;
    }
    return {
      ...node,
      position: {
        x: laid.x - size.width / 2,
        y: laid.y - size.height / 2,
      },
      // Giúp React Flow đo đúng khi virtualize
      width: size.width,
      height: size.height,
    };
  });
}

/** @deprecated dùng layoutWithDagre qua buildFlowGraph */
export function layoutMembers(
  members: FamilyMember[],
): Map<string, { x: number; y: number }> {
  const graph = buildFlowGraph({
    clan_name: "",
    members,
    relations: members
      .filter((m) => m.tree_logic.parent_id)
      .map((m, i) => ({
        id: `tmp-${i}`,
        family_id: m.family_id,
        branch_id: m.tree_logic.branch_id,
        source: m.tree_logic.parent_id!,
        target: m.id,
        relationship_type: m.tree_logic.relationship_type,
      })),
  });
  return new Map(
    graph.nodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]),
  );
}

export function buildFlowGraph(data: FamilyTreeData): {
  nodes: FamilyFlowNode[];
  edges: FamilyFlowEdge[];
} {
  const sizeById = new Map<string, { width: number; height: number }>();
  const childCountById = new Map<string, number>();
  for (const m of data.members) {
    const pid = m.tree_logic.parent_id;
    if (!pid) continue;
    childCountById.set(pid, (childCountById.get(pid) ?? 0) + 1);
  }

  const branchNameById = new Map(
    (data.branches ?? []).map((b) => [b.id, b.name]),
  );

  const rawNodes: FamilyFlowNode[] = data.members.map((member) => {
    const childCount = childCountById.get(member.id) ?? 0;
    const size = estimateNodeSize(member, childCount);
    sizeById.set(member.id, size);
    const type = memberNodeType(member);
    const generation = memberGeneration(member);
    const path = member.tree_logic.path;
    const branchLabel =
      branchNameById.get(member.tree_logic.branch_id) ??
      member.tree_logic.branch_id;

    if (type === "placeholder") {
      return {
        id: member.id,
        type: "placeholder",
        position: { x: 0, y: 0 },
        data: {
          memberId: member.id,
          generation,
          path,
        } satisfies PlaceholderNodeData,
      };
    }

    return {
      id: member.id,
      type: "member",
      position: { x: 0, y: 0 },
      data: {
        memberId: member.id,
        fullName: member.full_name,
        generation,
        lifeStatus: member.status.is_alive ? "LIVING" : "DECEASED",
        isHuongHoa: Boolean(member.is_huong_hoa),
        spouses: member.spouses.map((s) => ({
          id: s.id,
          full_name: s.full_name,
          life_status: s.is_alive === false ? "DECEASED" : "LIVING",
          is_placeholder: s.is_placeholder,
          role: s.role,
        })),
        path,
        branchLabel,
        childCount,
      } satisfies MemberNodeData,
    };
  });

  const edges: FamilyFlowEdge[] = data.relations.map((relation) =>
    relationToEdge(relation),
  );

  // Nếu thiếu relation nhưng có parent_id — bổ sung cạnh tạm để dagre xếp đúng đời
  const edgeKeys = new Set(edges.map((e) => `${e.source}→${e.target}`));
  for (const member of data.members) {
    const parentId = member.tree_logic.parent_id;
    if (!parentId) continue;
    const key = `${parentId}→${member.id}`;
    if (edgeKeys.has(key)) continue;
    if (!sizeById.has(parentId)) continue;
    edges.push(
      relationToEdge({
        id: `auto-${parentId}-${member.id}`,
        family_id: member.family_id,
        branch_id: member.tree_logic.branch_id,
        source: parentId,
        target: member.id,
        relationship_type: member.tree_logic.relationship_type,
      }),
    );
    edgeKeys.add(key);
  }

  const nodes = layoutWithDagre(rawNodes, edges, sizeById);
  return { nodes, edges };
}

export function relationToEdge(relation: FamilyRelation): FamilyFlowEdge {
  const isAdopted = relation.relationship_type === "ADOPTED";

  return {
    id: relation.id,
    source: relation.source,
    target: relation.target,
    type: "relationship",
    animated: isAdopted,
    data: {
      relationshipType: relation.relationship_type,
    } satisfies RelationshipEdgeData,
  };
}

export function extractPathIds(
  members: FamilyMember[],
  targetId: string,
): string[] {
  const member = members.find((m) => m.id === targetId);
  if (!member) return [];
  return [...member.tree_logic.path];
}

export function edgeIdsOnPath(
  relations: FamilyRelation[],
  pathIds: string[],
): Set<string> {
  const pathSet = new Set(pathIds);
  const consecutive = new Set<string>();

  for (let i = 0; i < pathIds.length - 1; i++) {
    consecutive.add(`${pathIds[i]}→${pathIds[i + 1]}`);
  }

  const result = new Set<string>();
  for (const rel of relations) {
    if (!pathSet.has(rel.source) || !pathSet.has(rel.target)) continue;
    if (consecutive.has(`${rel.source}→${rel.target}`)) {
      result.add(rel.id);
    }
  }
  return result;
}
