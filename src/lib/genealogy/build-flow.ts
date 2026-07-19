import type { Edge, Node } from "@xyflow/react";
import type {
  FamilyMember,
  FamilyRelation,
  FamilyTreeData,
} from "@/types/genealogy";
import type { MemberNodeData } from "@/components/family-tree/nodes/MemberNode";
import type { PlaceholderNodeData } from "@/components/family-tree/nodes/PlaceholderNode";
import type { RelationshipEdgeData } from "@/components/family-tree/edges/RelationshipEdge";

const GEN_GAP_Y = 180;
const NODE_GAP_X = 280;
const BASE_X = 80;
const BASE_Y = 40;

export type FamilyFlowNode = Node<MemberNodeData | PlaceholderNodeData>;
export type FamilyFlowEdge = Edge<RelationshipEdgeData>;

export function memberNodeType(member: FamilyMember): "member" | "placeholder" {
  return member.is_placeholder ? "placeholder" : "member";
}

/** Layout theo đời: mỗi generation một hàng, xếp ngang theo thứ tự trong data. */
export function layoutMembers(members: FamilyMember[]): Map<string, { x: number; y: number }> {
  const byGen = new Map<number, FamilyMember[]>();

  for (const m of members) {
    const list = byGen.get(m.generation) ?? [];
    list.push(m);
    byGen.set(m.generation, list);
  }

  const positions = new Map<string, { x: number; y: number }>();

  for (const [generation, list] of byGen) {
    list.forEach((member, index) => {
      const spouseBonus = member.spouses.length > 0 ? 40 : 0;
      positions.set(member.id, {
        x: BASE_X + index * NODE_GAP_X + spouseBonus,
        y: BASE_Y + (generation - 1) * GEN_GAP_Y,
      });
    });
  }

  return positions;
}

export function buildFlowGraph(data: FamilyTreeData): {
  nodes: FamilyFlowNode[];
  edges: FamilyFlowEdge[];
} {
  const positions = layoutMembers(data.members);

  const nodes: FamilyFlowNode[] = data.members.map((member) => {
    const position = positions.get(member.id) ?? { x: 0, y: 0 };
    const type = memberNodeType(member);

    if (type === "placeholder") {
      return {
        id: member.id,
        type: "placeholder",
        position,
        data: {
          memberId: member.id,
          generation: member.generation,
          path: member.path,
        } satisfies PlaceholderNodeData,
      };
    }

    return {
      id: member.id,
      type: "member",
      position,
      data: {
        memberId: member.id,
        fullName: member.full_name,
        generation: member.generation,
        lifeStatus: member.life_status,
        isHuongHoa: Boolean(member.is_huong_hoa),
        spouses: member.spouses,
        path: member.path,
      } satisfies MemberNodeData,
    };
  });

  const edges: FamilyFlowEdge[] = data.relations.map((relation) =>
    relationToEdge(relation),
  );

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

/** Tập node id nằm trên đường dẫn Thủy tổ → target (từ `member.path`). */
export function extractPathIds(
  members: FamilyMember[],
  targetId: string,
): string[] {
  const member = members.find((m) => m.id === targetId);
  if (!member) return [];
  return [...member.path];
}

/** Edge nằm trên path khi cả source và target đều thuộc path và liên tiếp trong path. */
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
