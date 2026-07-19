import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase/client";
import type {
  CreateFamilyInput,
  Family,
  FamilyBranch,
  FamilySettings,
  FamilyTheme,
  UpdateFamilyAppearanceInput,
  UpdateFamilyBranchesInput,
} from "@/types/genealogy";

const FAMILIES = "families";
const FAMILY_MEMBERS = "family_members";
const DEFAULT_BRANCH = "branch-main";

function familiesCol() {
  return collection(getDb(), FAMILIES);
}

function familyRef(id: string): DocumentReference {
  return doc(getDb(), FAMILIES, id);
}

function timestampToIso(value: unknown): string | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return null;
}

function mapFamily(id: string, data: Record<string, unknown>): Family {
  const settings = (data.settings as FamilySettings | undefined) ?? {};
  // Hỗ trợ document cũ (theme/branches top-level) nếu còn
  if (!settings.theme && data.theme) {
    settings.theme = data.theme as FamilyTheme;
  }
  if (!settings.branches && data.branches) {
    settings.branches = data.branches as FamilyBranch[];
  }
  if (!settings.description && typeof data.description === "string") {
    settings.description = data.description;
  }
  if (!settings.default_branch_id && typeof data.default_branch_id === "string") {
    settings.default_branch_id = data.default_branch_id;
  }

  return {
    id,
    name: String(data.name ?? ""),
    owner_id: String(data.owner_id ?? ""),
    created_at: timestampToIso(data.created_at),
    settings,
  };
}

/**
 * Tạo dòng họ — owner_id = UID hiện tại (Family Owner).
 * Seed Thủy tổ generation 1.
 */
export async function createFamily(input: CreateFamilyInput): Promise<Family> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Cần đăng nhập trước khi tạo gia phả.");
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error("Tên dòng họ không được để trống.");
  }

  const ref = doc(familiesCol());
  const founderRef = doc(collection(getDb(), FAMILY_MEMBERS));

  const defaultBranches: FamilyBranch[] = [
    {
      id: DEFAULT_BRANCH,
      name: "Chi chính",
      description: "Nhánh hương hỏa mặc định",
    },
  ];
  const defaultTheme: FamilyTheme = {
    primary_color: "#7a1f1f",
    accent_color: "#c9a227",
    surface_color: "#e9eef3",
    background_image: null,
  };

  const settings: FamilySettings = {
    description: (input.description ?? "").trim(),
    default_branch_id: DEFAULT_BRANCH,
    branches: defaultBranches,
    theme: defaultTheme,
  };

  const family: Family = {
    id: ref.id,
    name,
    owner_id: user.uid,
    created_at: new Date().toISOString(),
    settings,
  };

  const batch = writeBatch(getDb());
  batch.set(ref, {
    name: family.name,
    owner_id: family.owner_id,
    created_at: serverTimestamp(),
    settings,
  });

  batch.set(founderRef, {
    id: founderRef.id,
    family_id: family.id,
    full_name: `Thủy tổ họ ${name}`,
    traditional_names: {},
    status: { is_alive: false, is_placeholder: false },
    dates: { birth: null, death: null, lunar_death: null },
    tree_logic: {
      parent_id: null,
      path: [founderRef.id],
      branch_id: DEFAULT_BRANCH,
      relationship_type: "BLOOD",
      position: { order: 0 },
    },
    spouses: [],
    gender: "UNKNOWN",
    is_huong_hoa: true,
    biography: "Người đứng đầu dòng họ — hãy cập nhật tên húy, thụy và tiểu sử.",
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await batch.commit();
  return family;
}

export async function getFamily(familyId: string): Promise<Family | null> {
  const snap = await getDoc(familyRef(familyId));
  if (!snap.exists()) return null;
  return mapFamily(snap.id, snap.data() as Record<string, unknown>);
}

export async function updateFamilyAppearance(
  familyId: string,
  input: UpdateFamilyAppearanceInput,
): Promise<void> {
  const current = await getFamily(familyId);
  const settings: FamilySettings = {
    ...(current?.settings ?? {}),
    theme: input.theme,
  };
  await updateDoc(familyRef(familyId), {
    settings,
    updated_at: serverTimestamp(),
  });
}

export async function updateFamilyBranches(
  familyId: string,
  input: UpdateFamilyBranchesInput,
): Promise<void> {
  const current = await getFamily(familyId);
  const settings: FamilySettings = {
    ...(current?.settings ?? {}),
    branches: input.branches,
  };
  await updateDoc(familyRef(familyId), {
    settings,
    updated_at: serverTimestamp(),
  });
}

export async function listOwnedFamilies(uid?: string): Promise<Family[]> {
  const ownerId = uid ?? getFirebaseAuth().currentUser?.uid;
  if (!ownerId) return [];

  const q = query(familiesCol(), where("owner_id", "==", ownerId));
  const snap = await getDocs(q);
  return snap.docs.map((d) =>
    mapFamily(d.id, d.data() as Record<string, unknown>),
  );
}

/** Super Admin — liệt kê toàn bộ collection `families` */
export async function listAllFamilies(): Promise<Family[]> {
  const snap = await getDocs(familiesCol());
  return snap.docs
    .map((d) => mapFamily(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export { DEFAULT_BRANCH };
