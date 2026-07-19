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
  FamilyTheme,
  UpdateFamilyAppearanceInput,
  UpdateFamilyBranchesInput,
} from "@/types/family";

const FAMILIES = "families";
const FAMILY_MEMBERS = "family_members";
const DEFAULT_BRANCH = "branch-main";

function familiesCol() {
  return collection(getDb(), FAMILIES);
}

function familyRef(id: string): DocumentReference {
  return doc(getDb(), FAMILIES, id);
}

/**
 * Tạo dòng họ mới — người dùng hiện tại trở thành Admin (owner_id).
 * Gọi sau khi đăng ký Auth thành công (onboarding).
 * Đồng thời seed Thủy tổ (generation 1) để cây không rỗng.
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
  const family: Family = {
    id: ref.id,
    name,
    description: (input.description ?? "").trim(),
    owner_id: user.uid,
    created_at: new Date().toISOString(),
  };

  const batch = writeBatch(getDb());
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

  batch.set(ref, {
    name: family.name,
    description: family.description,
    owner_id: family.owner_id,
    created_at: serverTimestamp(),
    default_branch_id: DEFAULT_BRANCH,
    branches: defaultBranches,
    theme: defaultTheme,
  });

  batch.set(founderRef, {
    id: founderRef.id,
    family_id: family.id,
    branch_id: DEFAULT_BRANCH,
    full_name: `Thủy tổ họ ${name}`,
    generation: 1,
    life_status: "DECEASED",
    gender: "UNKNOWN",
    is_huong_hoa: true,
    is_placeholder: false,
    spouses: [],
    parent_ids: [],
    path: [founderRef.id],
    tree_logic: { branch_id: DEFAULT_BRANCH, position: { order: 0 } },
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
  const data = snap.data();
  return {
    id: snap.id,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    owner_id: String(data.owner_id ?? ""),
    created_at: data.created_at?.toDate?.()?.toISOString?.() ?? null,
    default_branch_id: String(data.default_branch_id ?? DEFAULT_BRANCH),
    theme: (data.theme as FamilyTheme) ?? undefined,
    branches: (data.branches as FamilyBranch[]) ?? undefined,
  };
}

export async function updateFamilyAppearance(
  familyId: string,
  input: UpdateFamilyAppearanceInput,
): Promise<void> {
  await updateDoc(familyRef(familyId), {
    theme: input.theme,
    updated_at: serverTimestamp(),
  });
}

export async function updateFamilyBranches(
  familyId: string,
  input: UpdateFamilyBranchesInput,
): Promise<void> {
  await updateDoc(familyRef(familyId), {
    branches: input.branches,
    updated_at: serverTimestamp(),
  });
}

/** Các dòng họ mà user hiện tại là owner (Admin) */
export async function listOwnedFamilies(uid?: string): Promise<Family[]> {
  const ownerId = uid ?? getFirebaseAuth().currentUser?.uid;
  if (!ownerId) return [];

  const q = query(familiesCol(), where("owner_id", "==", ownerId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: String(data.name ?? ""),
      description: String(data.description ?? ""),
      owner_id: String(data.owner_id ?? ""),
      created_at: data.created_at?.toDate?.()?.toISOString?.() ?? null,
    } satisfies Family;
  });
}

export { DEFAULT_BRANCH };
