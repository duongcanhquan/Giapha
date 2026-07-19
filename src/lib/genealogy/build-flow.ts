import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";
import type {
  FamilyMember,
  FamilyRelation,
  FamilyTreeData,
  SpouseInfo,
  SpouseRole,
} from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";
import {
  parentChildEdgeLabel,
  spouseChildEdgeLabel,
} from "@/lib/genealogy/labels";
import type { MemberNodeData } from "@/components/family-tree/nodes/MemberNode";
import type { PlaceholderNodeData } from "@/components/family-tree/nodes/PlaceholderNode";
import type { SpouseNodeData } from "@/components/family-tree/nodes/SpouseNode";
import type { RelationshipEdgeData } from "@/components/family-tree/edges/RelationshipEdge";

/** Kích thước thẻ người trong họ */
const BASE_NODE_WIDTH = 210;
const BASE_NODE_HEIGHT = 118;
const COLLAPSE_ROW_HEIGHT = 32;
const PLACEHOLDER_HEIGHT = 96;

/** Dâu / rể — node riêng cạnh vợ/chồng */
const SPOUSE_NODE_WIDTH = 168;
const SPOUSE_NODE_HEIGHT = 128;
const SPOUSE_GAP = 28;

export type FamilyFlowNode = Node<
  MemberNodeData | PlaceholderNodeData | SpouseNodeData
>;
export type FamilyFlowEdge = Edge<RelationshipEdgeData>;

export function memberNodeType(member: FamilyMember): "member" | "placeholder" {
  return member.status.is_placeholder ? "placeholder" : "member";
}

export function makeSpouseNodeId(partnerId: string, spouseId: string): string {
  return `spouse:${partnerId}:${spouseId}`;
}

export function parseSpouseNodeId(
  id: string,
): { partnerId: string; spouseId: string } | null {
  if (!id.startsWith("spouse:")) return null;
  const rest = id.slice("spouse:".length);
  const idx = rest.indexOf(":");
  if (idx <= 0) return null;
  return {
    partnerId: rest.slice(0, idx),
    spouseId: rest.slice(idx + 1),
  };
}

function estimateMemberCardSize(
  member: FamilyMember,
  childCount: number,
): { width: number; height: number } {
  if (member.status.is_placeholder) {
    return { width: 168, height: PLACEHOLDER_HEIGHT };
  }
  // Include collapse button height in dagre packing (tránh đụng sau layout)
  const collapseExtra = childCount > 0 ? COLLAPSE_ROW_HEIGHT : 0;
  const hintExtra = member.spouses.length > 0 ? 18 : 0;
  return {
    width: BASE_NODE_WIDTH,
    height: BASE_NODE_HEIGHT + collapseExtra + hintExtra,
  };
}

/** Chiều ngang dành chỗ cho dâu/rể đứng cạnh — dagre không đè nhánh kế */
function unitWidth(member: FamilyMember, cardWidth: number): number {
  const n = member.spouses.length;
  if (n === 0) return cardWidth;
  return cardWidth + n * (SPOUSE_GAP + SPOUSE_NODE_WIDTH);
}

/**
 * Dagre TB layout: phân cấp đời từ trên xuống.
 * Unit width gồm cả chỗ dâu/rể; sau layout gắn spouse node bên phải thẻ chính.
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
    nodesep: 88,
    ranksep: 120,
    marginx: 48,
    marginy: 48,
    edgesep: 28,
  });

  for (const node of nodes) {
    const size = sizeById.get(node.id) ?? {
      width: BASE_NODE_WIDTH,
      height: BASE_NODE_HEIGHT,
    };
    g.setNode(node.id, { width: size.width, height: size.height });
  }

  for (const edge of edges) {
    // Chỉ xếp hạng theo cạnh cha–con (không xếp theo cưới / mẹ)
    if (edge.data?.kind === "MARRIAGE" || edge.data?.kind === "MOTHER") {
      continue;
    }
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

function defaultSpouseRole(
  member: FamilyMember,
  spouse: SpouseInfo,
): SpouseRole {
  if (spouse.role) return spouse.role;
  if (member.gender === "FEMALE") return "RE";
  if (member.gender === "MALE") return "DAU";
  return "SPOUSE";
}

export function buildFlowGraph(
  data: FamilyTreeData,
  options?: { fullChildCountById?: Map<string, number> },
): {
  nodes: FamilyFlowNode[];
  edges: FamilyFlowEdge[];
} {
  const cardSizeById = new Map<string, { width: number; height: number }>();
  const unitSizeById = new Map<string, { width: number; height: number }>();
  const childCountById = new Map<string, number>();
  const childrenByParent = new Map<string, FamilyMember[]>();

  for (const m of data.members) {
    const pid = m.tree_logic.parent_id;
    if (!pid) continue;
    childCountById.set(pid, (childCountById.get(pid) ?? 0) + 1);
    const list = childrenByParent.get(pid);
    if (list) list.push(m);
    else childrenByParent.set(pid, [m]);
  }

  const branchNameById = new Map(
    (data.branches ?? []).map((b) => [b.id, b.name]),
  );

  const memberById = new Map(data.members.map((m) => [m.id, m]));

  const rawMemberNodes: FamilyFlowNode[] = data.members.map((member) => {
    const visibleKids = childCountById.get(member.id) ?? 0;
    const layoutKids =
      options?.fullChildCountById?.get(member.id) ?? visibleKids;
    const card = estimateMemberCardSize(member, layoutKids);
    cardSizeById.set(member.id, card);
    unitSizeById.set(member.id, {
      width: unitWidth(member, card.width),
      height: Math.max(
        card.height,
        member.spouses.length ? SPOUSE_NODE_HEIGHT : card.height,
      ),
    });

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
        spouseCount: member.spouses.length,
        path,
        branchLabel,
        childCount: layoutKids,
        photoUrl: member.photo_url ?? null,
      } satisfies MemberNodeData,
    };
  });

  const edges: FamilyFlowEdge[] = data.relations.map((relation) =>
    relationToEdge(relation, memberById.get(relation.source)?.gender),
  );

  // Nếu thiếu relation nhưng có parent_id — bổ sung cạnh cha/mẹ→con
  const edgeKeys = new Set(edges.map((e) => `${e.source}→${e.target}`));
  for (const member of data.members) {
    const parentId = member.tree_logic.parent_id;
    if (!parentId) continue;
    const key = `${parentId}→${member.id}`;
    if (edgeKeys.has(key)) continue;
    if (!unitSizeById.has(parentId)) continue;
    edges.push(
      relationToEdge(
        {
          id: `auto-${parentId}-${member.id}`,
          family_id: member.family_id,
          branch_id: member.tree_logic.branch_id,
          source: parentId,
          target: member.id,
          relationship_type: member.tree_logic.relationship_type,
        },
        memberById.get(parentId)?.gender,
      ),
    );
    edgeKeys.add(key);
  }

  // Gắn nhãn Cha/Mẹ → con trên cạnh máu
  for (const edge of edges) {
    if (edge.data?.relationshipType === "ADOPTED") {
      edge.data = { ...edge.data, kind: "ADOPTED", label: "Con nuôi" };
    } else {
      const parent = memberById.get(edge.source);
      edge.data = {
        ...edge.data!,
        kind: "BLOOD",
        label: parentChildEdgeLabel(parent?.gender),
      };
    }
  }

  // Layout chỉ với member/placeholder (+ unit width)
  const laidMembers = layoutWithDagre(rawMemberNodes, edges, unitSizeById);

  // Đặt lại width/height = kích thước thẻ thật (không phải unit)
  const positionedMembers = laidMembers.map((node) => {
    const card = cardSizeById.get(node.id);
    if (!card) return node;
    return {
      ...node,
      width: card.width,
      height: card.height,
    };
  });

  const spouseNodes: FamilyFlowNode[] = [];
  const memberPos = new Map(
    positionedMembers.map((n) => [n.id, n.position] as const),
  );

  for (const member of data.members) {
    if (!member.spouses.length) continue;
    const origin = memberPos.get(member.id);
    const card = cardSizeById.get(member.id);
    if (!origin || !card) continue;

    const generation = memberGeneration(member);
    const branchLabel =
      branchNameById.get(member.tree_logic.branch_id) ??
      member.tree_logic.branch_id;

    // Phối ngẫu chính cùng sinh con: nam → dâu; nữ → rể
    const coParentSpouse =
      member.gender === "FEMALE"
        ? (member.spouses.find((s) => defaultSpouseRole(member, s) === "RE") ??
          member.spouses[0])
        : (member.spouses.find((s) => defaultSpouseRole(member, s) === "DAU") ??
          member.spouses[0]);

    member.spouses.forEach((spouse, index) => {
      const sid = makeSpouseNodeId(member.id, spouse.id);
      const role = defaultSpouseRole(member, spouse);
      const x =
        origin.x + card.width + SPOUSE_GAP + index * (SPOUSE_NODE_WIDTH + SPOUSE_GAP);
      const y = origin.y + Math.max(0, (card.height - SPOUSE_NODE_HEIGHT) / 2);

      spouseNodes.push({
        id: sid,
        type: "spouse",
        position: { x, y },
        width: SPOUSE_NODE_WIDTH,
        height: SPOUSE_NODE_HEIGHT,
        data: {
          spouseId: spouse.id,
          fullName: spouse.full_name,
          role,
          lifeStatus: spouse.is_alive === false ? "DECEASED" : "LIVING",
          maidenName: spouse.maiden_name,
          hometown: spouse.hometown,
          notes: spouse.notes,
          birth: spouse.birth,
          death: spouse.death,
          partnerId: member.id,
          partnerName: member.full_name,
          generation,
          branchLabel,
        } satisfies SpouseNodeData,
      });

      edges.push({
        id: `marry-${member.id}-${spouse.id}`,
        source: member.id,
        target: sid,
        sourceHandle: "spouse",
        targetHandle: "marriage",
        type: "relationship",
        data: {
          relationshipType: "BLOOD",
          kind: "MARRIAGE",
          label: "Cưới",
        } satisfies RelationshipEdgeData,
      });

    // Nối dâu/rể → con theo mother_spouse_id (co-parent)
    const kids = childrenByParent.get(member.id) ?? [];
    for (const child of kids) {
      if (!memberById.has(child.id)) continue;
      const coParentId =
        child.tree_logic.mother_spouse_id ??
        (coParentSpouse &&
        spouse.id === coParentSpouse.id &&
        (role === "DAU" || role === "RE")
          ? coParentSpouse.id
          : null);
      if (!coParentId || coParentId !== spouse.id) continue;
      edges.push({
        id: `mother-${spouse.id}-${child.id}`,
        source: sid,
        target: child.id,
        sourceHandle: "child",
        type: "relationship",
        data: {
          relationshipType: child.tree_logic.relationship_type,
          kind: "MOTHER",
          label: spouseChildEdgeLabel(role),
        } satisfies RelationshipEdgeData,
      });
    }
  });
  }

  return {
    nodes: [...positionedMembers, ...spouseNodes],
    edges,
  };
}

export function relationToEdge(
  relation: FamilyRelation,
  parentGender?: FamilyMember["gender"] | null,
): FamilyFlowEdge {
  const isAdopted = relation.relationship_type === "ADOPTED";

  return {
    id: relation.id,
    source: relation.source,
    target: relation.target,
    type: "relationship",
    animated: isAdopted,
    data: {
      relationshipType: relation.relationship_type,
      kind: isAdopted ? "ADOPTED" : "BLOOD",
      label: isAdopted ? "Con nuôi" : parentChildEdgeLabel(parentGender),
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
