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
 * Query kết hợp family_id + branch_id (+ optional path contains)
 * — cần composite indexes trong firestore.indexes.json.
 */
export async function queryMembersByFamilyBranch(
  familyId: string,
  branchId: string,
  options?: { pathContains?: string },
): Promise<FamilyMember[]> {
  const constraints: QueryConstraint[] = [
    where("family_id", "==", familyId),
    where("branch_id", "==", branchId),
  ];

  if (options?.pathContains) {
    constraints.push(where("path", "array-contains", options.pathContains));
  }

  const snap = await getDocs(query(collection(getDb(), MEMBERS), ...constraints));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...(data as Omit<FamilyMember, "id">),
    };
  });
}
