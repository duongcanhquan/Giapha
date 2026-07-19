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

const GEN_GAP_Y = 180;
const NODE_GAP_X = 280;
const BASE_X = 80;
const BASE_Y = 40;

export type FamilyFlowNode = Node<MemberNodeData | PlaceholderNodeData>;
export type FamilyFlowEdge = Edge<RelationshipEdgeData>;

export function memberNodeType(member: FamilyMember): "member" | "placeholder" {
  return member.status.is_placeholder ? "placeholder" : "member";
}

/** Layout theo đời: mỗi generation một hàng */
export function layoutMembers(
  members: FamilyMember[],
): Map<string, { x: number; y: number }> {
  const byGen = new Map<number, FamilyMember[]>();

  for (const m of members) {
    const gen = memberGeneration(m);
    const list = byGen.get(gen) ?? [];
    list.push(m);
    byGen.set(gen, list);
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
    const generation = memberGeneration(member);
    const path = member.tree_logic.path;

    if (type === "placeholder") {
      return {
        id: member.id,
        type: "placeholder",
        position,
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
      position,
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
        })),
        path,
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
