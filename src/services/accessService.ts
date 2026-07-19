import type { User } from "firebase/auth";
import { getFamily } from "@/services/familyService";
import { isFirebaseConfigured } from "@/lib/firebase/client";

export type FamilyAccessRole = "owner" | "branch_admin" | null;

export type FamilyAccess = {
  allowed: boolean;
  role: FamilyAccessRole;
  branchId?: string | null;
};

/**
 * Kiểm tra user có quyền quản trị `familyId`
 * (Family Owner hoặc Branch Admin của đúng family).
 */
export async function checkFamilyAdminAccess(
  familyId: string,
  user: User | null,
): Promise<FamilyAccess> {
  if (!user) {
    return { allowed: false, role: null };
  }

  // Demo bypass khi chưa cấu hình Firebase
  if (!isFirebaseConfigured() && (familyId === "demo" || familyId === "family-demo-nguyen")) {
    return { allowed: true, role: "owner" };
  }

  try {
    const family = await getFamily(familyId);
    if (!family) {
      return { allowed: false, role: null };
    }

    if (family.owner_id === user.uid) {
      return { allowed: true, role: "owner" };
    }

    const token = await user.getIdTokenResult(true);
    const role = token.claims.role;
    const claimFamilyId = token.claims.family_id;
    const claimBranchId = token.claims.branch_id;

    if (
      role === "branch_admin" &&
      typeof claimFamilyId === "string" &&
      claimFamilyId === familyId
    ) {
      return {
        allowed: true,
        role: "branch_admin",
        branchId: typeof claimBranchId === "string" ? claimBranchId : null,
      };
    }

    return { allowed: false, role: null };
  } catch {
    return { allowed: false, role: null };
  }
}
