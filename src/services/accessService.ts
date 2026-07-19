import type { User } from "firebase/auth";
import { getFamily } from "@/services/familyService";
import { isFirebaseConfigured } from "@/lib/firebase/client";

export type FamilyAccessRole = "super_admin" | "owner" | "branch_admin" | null;

export type FamilyAccess = {
  allowed: boolean;
  role: FamilyAccessRole;
  branchId?: string | null;
};

/**
 * Kiểm tra quyền quản trị `familyId`:
 * Super Admin · Family Owner · Branch Admin.
 */
export async function checkFamilyAdminAccess(
  familyId: string,
  user: User | null,
): Promise<FamilyAccess> {
  if (!user) {
    return { allowed: false, role: null };
  }

  if (
    !isFirebaseConfigured() &&
    (familyId === "demo" || familyId === "family-demo-nguyen")
  ) {
    return { allowed: true, role: "owner" };
  }

  try {
    const token = await user.getIdTokenResult(true);
    if (token.claims.role === "super_admin") {
      return { allowed: true, role: "super_admin" };
    }

    const family = await getFamily(familyId);
    if (!family) {
      return { allowed: false, role: null };
    }

    if (family.owner_id === user.uid) {
      return { allowed: true, role: "owner" };
    }

    const claimFamilyId = token.claims.family_id;
    const claimBranchId = token.claims.branch_id;

    if (
      token.claims.role === "branch_admin" &&
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
