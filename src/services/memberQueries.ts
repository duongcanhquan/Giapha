import {
  collection,
  getDocs,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { FamilyMember } from "@/types/genealogy";

const MEMBERS = "family_members";

/**
 * Query kết hợp family_id + tree_logic.branch_id (+ optional path contains).
 * Indexes: xem firestore.indexes.json.
 */
export async function queryMembersByFamilyBranch(
  familyId: string,
  branchId: string,
  options?: { pathContains?: string },
): Promise<FamilyMember[]> {
  const constraints: QueryConstraint[] = [
    where("family_id", "==", familyId),
    where("tree_logic.branch_id", "==", branchId),
  ];

  if (options?.pathContains) {
    constraints.push(
      where("tree_logic.path", "array-contains", options.pathContains),
    );
  }

  const snap = await getDocs(query(collection(getDb(), MEMBERS), ...constraints));
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<FamilyMember, "id">),
  }));
}
