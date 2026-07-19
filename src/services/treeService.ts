import { collection, getDocs, query, where } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { getFamily } from "@/services/familyService";
import { sampleFamilyTree } from "@/data/sample-family";
import type { Family, FamilyMember, FamilyRelation, FamilyTreeData } from "@/types/genealogy";

const MEMBERS = "family_members";
const RELATIONS = "family_relations";

function mapMember(id: string, data: Record<string, unknown>): FamilyMember {
  const treeLogicRaw = (data.tree_logic as Record<string, unknown> | undefined) ?? {};
  const statusRaw = (data.status as Record<string, unknown> | undefined) ?? {};
  const datesRaw = (data.dates as Record<string, unknown> | undefined) ?? {};
  const namesRaw =
    (data.traditional_names as Record<string, unknown> | undefined) ??
    (data.names as Record<string, unknown> | undefined) ??
    {};

  // Legacy flat fields → schema mới
  const branchId = String(
    treeLogicRaw.branch_id ?? data.branch_id ?? "branch-main",
  );
  const path = (treeLogicRaw.path as string[] | undefined) ??
    (data.path as string[] | undefined) ?? [id];
  const parentId =
    (treeLogicRaw.parent_id as string | null | undefined) ??
    ((data.parent_ids as string[] | undefined)?.[0] ?? null);

  const isPlaceholder = Boolean(
    statusRaw.is_placeholder ?? data.is_placeholder ?? false,
  );
  const legacyLife = data.life_status;
  const isAlive =
    typeof statusRaw.is_alive === "boolean"
      ? statusRaw.is_alive
      : legacyLife === "DECEASED"
        ? false
        : legacyLife === "LIVING"
          ? true
          : !isPlaceholder;

  return {
    id,
    family_id: String(data.family_id ?? ""),
    full_name: String(data.full_name ?? ""),
    traditional_names: {
      birth: (namesRaw.birth as string) ?? (namesRaw.huy as string) ?? null,
      courtesy:
        (namesRaw.courtesy as string) ?? (namesRaw.tu as string) ?? null,
      posthumous:
        (namesRaw.posthumous as string) ?? (namesRaw.thuy as string) ?? null,
    },
    status: {
      is_alive: isAlive,
      is_placeholder: isPlaceholder,
    },
    dates: {
      birth:
        (datesRaw.birth as string) ??
        (data.birth_year ? `${data.birth_year}-01-01` : null),
      death:
        (datesRaw.death as string) ??
        (data.death_date as string) ??
        (data.death_year ? `${data.death_year}-01-01` : null),
      lunar_death:
        (datesRaw.lunar_death as string) ??
        (data.lunar_death_date as string) ??
        null,
    },
    tree_logic: {
      parent_id: parentId,
      path,
      branch_id: branchId,
      relationship_type:
        (treeLogicRaw.relationship_type as FamilyMember["tree_logic"]["relationship_type"]) ??
        "BLOOD",
      position: treeLogicRaw.position as FamilyMember["tree_logic"]["position"],
    },
    spouses: ((data.spouses as FamilyMember["spouses"]) ?? []).map((s) => ({
      id: s.id,
      full_name: s.full_name,
      is_alive:
        "is_alive" in s
          ? Boolean(s.is_alive)
          : (s as { life_status?: string }).life_status !== "DECEASED",
      is_placeholder: s.is_placeholder,
    })),
    gender: data.gender as FamilyMember["gender"],
    is_huong_hoa: Boolean(data.is_huong_hoa),
    biography: (data.biography as string) ?? null,
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
  };
}

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
      owner_id: "demo-owner",
      created_at: null,
      settings: {
        description: "Bản demo công khai",
        default_branch_id: "branch-main",
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
    },
    tree: { ...sampleFamilyTree, family_id: sampleFamilyTree.family_id },
  };
}
