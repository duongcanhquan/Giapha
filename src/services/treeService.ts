import { collection, getDocs, query, where } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { getFamily } from "@/services/familyService";
import { sampleFamilyTree } from "@/data/sample-family";
import type { Family } from "@/types/family";
import type { FamilyMember, FamilyRelation, FamilyTreeData } from "@/types/genealogy";

const MEMBERS = "family_members";
const RELATIONS = "family_relations";

function mapMember(id: string, data: Record<string, unknown>): FamilyMember {
  const treeLogic = (data.tree_logic as FamilyMember["tree_logic"]) ?? {
    branch_id: String(data.branch_id ?? "branch-main"),
  };
  return {
    id,
    family_id: String(data.family_id ?? ""),
    branch_id: String(data.branch_id ?? treeLogic.branch_id),
    full_name: String(data.full_name ?? ""),
    generation: Number(data.generation ?? 1),
    life_status: (data.life_status as FamilyMember["life_status"]) ?? "LIVING",
    gender: data.gender as FamilyMember["gender"],
    is_huong_hoa: Boolean(data.is_huong_hoa),
    is_placeholder: Boolean(data.is_placeholder),
    spouses: (data.spouses as FamilyMember["spouses"]) ?? [],
    parent_ids: (data.parent_ids as string[]) ?? [],
    path: (data.path as string[]) ?? [id],
    tree_logic: treeLogic,
    names: data.names as FamilyMember["names"],
    biography: (data.biography as string) ?? null,
    birth_year: (data.birth_year as number) ?? null,
    death_year: (data.death_year as number) ?? null,
    death_date: (data.death_date as string) ?? null,
    lunar_death_date: (data.lunar_death_date as string) ?? null,
    notes: data.notes as string | undefined,
  };
}

function mapRelation(id: string, data: Record<string, unknown>): FamilyRelation {
  return {
    id,
    family_id: String(data.family_id ?? ""),
    branch_id: String(data.branch_id ?? "branch-main"),
    source: String(data.source ?? ""),
    target: String(data.target ?? ""),
    relationship_type:
      (data.relationship_type as FamilyRelation["relationship_type"]) ?? "BLOOD",
    tree_logic: data.tree_logic as FamilyRelation["tree_logic"],
  };
}

/**
 * Fetch cây theo `familyId` từ Firestore.
 * Nếu Firebase chưa cấu hình / không có data → fallback demo (cùng family_id mẫu).
 */
export async function fetchFamilyTree(
  familyId: string,
): Promise<{ family: Family | null; tree: FamilyTreeData }> {
  if (!isFirebaseConfigured()) {
    return demoTree(familyId);
  }

  try {
    const family = await getFamily(familyId);
    const db = getDb();

    const membersSnap = await getDocs(
      query(collection(db, MEMBERS), where("family_id", "==", familyId)),
    );
    const relationsSnap = await getDocs(
      query(collection(db, RELATIONS), where("family_id", "==", familyId)),
    );

    const members = membersSnap.docs.map((d) =>
      mapMember(d.id, d.data() as Record<string, unknown>),
    );
    const relations = relationsSnap.docs.map((d) =>
      mapRelation(d.id, d.data() as Record<string, unknown>),
    );

    if (!family && members.length === 0) {
      return demoTree(familyId);
    }

    return {
      family,
      tree: {
        family_id: familyId,
        clan_name: family?.name ?? "Gia tộc",
        members,
        relations,
      },
    };
  } catch (error) {
    console.warn("fetchFamilyTree fallback demo:", error);
    return demoTree(familyId);
  }
}

function demoTree(familyId: string): {
  family: Family | null;
  tree: FamilyTreeData;
} {
  const isDemo = familyId === sampleFamilyTree.family_id || familyId === "demo";
  if (!isDemo) {
    return {
      family: null,
      tree: {
        family_id: familyId,
        clan_name: "Chưa có dữ liệu",
        members: [],
        relations: [],
      },
    };
  }

  return {
    family: {
      id: sampleFamilyTree.family_id!,
      name: sampleFamilyTree.clan_name,
      description: "Bản demo công khai",
      owner_id: "demo-owner",
      theme: {
        primary_color: "#7a1f1f",
        accent_color: "#c9a227",
        surface_color: "#e9eef3",
        background_image:
          "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=2400&q=80",
      },
      branches: [
        { id: "branch-main", name: "Chi chính", description: "Nhánh hương hỏa" },
      ],
    },
    tree: { ...sampleFamilyTree, family_id: sampleFamilyTree.family_id },
  };
}
