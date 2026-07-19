import type { User } from "firebase/auth";
import { getFamily } from "@/services/familyService";
import { getFamilyStaffMember } from "@/services/staffService";
import { isFirebaseConfigured } from "@/lib/firebase/client";

export type FamilyAccessRole =
  | "super_admin"
  | "owner"
  | "truong_ho"
  | "branch_admin"
  | "editor"
  | null;

export type FamilyAccess = {
  allowed: boolean;
  role: FamilyAccessRole;
  branchId?: string | null;
};

/**
 * Super Admin: custom claim `role=super_admin`
 * hoặc tài khoản bootstrap `duongcanhquan` (email chứa chuỗi này).
 */
export function isSuperAdminIdentity(user: User | null, claimsRole?: unknown): boolean {
  if (!user) return false;
  if (claimsRole === "super_admin") return true;
  const email = (user.email ?? "").toLowerCase();
  const name = (user.displayName ?? "").toLowerCase();
  return email.includes("duongcanhquan") || name.includes("duongcanhquan");
}

/** Gate route `/super-admin` */
export async function checkSuperAdminAccess(
  user: User | null,
): Promise<boolean> {
  if (!user) return false;
  if (!isFirebaseConfigured()) {
    return true;
  }
  try {
    const token = await user.getIdTokenResult(true);
    return isSuperAdminIdentity(user, token.claims.role);
  } catch {
    return isSuperAdminIdentity(user);
  }
}

/**
 * Kiểm tra quyền quản trị `familyId`:
 * Super Admin · Owner · Trưởng họ · Trưởng chi · Editor.
 */
export async function checkFamilyAdminAccess(
  familyId: string,
  user: User | null,
): Promise<FamilyAccess> {
  if (!user) {
    return { allowed: false, role: null };
  }

  if (!isFirebaseConfigured()) {
    return { allowed: false, role: null };
  }

  try {
    const token = await user.getIdTokenResult(true);
    if (isSuperAdminIdentity(user, token.claims.role)) {
      return { allowed: true, role: "super_admin" };
    }

    const family = await getFamily(familyId);
    if (!family) {
      return { allowed: false, role: null };
    }

    if (family.owner_id === user.uid) {
      return { allowed: true, role: "owner" };
    }

    const staff = await getFamilyStaffMember(familyId, user.uid);
    if (staff) {
      if (staff.role === "truong_ho") {
        return { allowed: true, role: "truong_ho" };
      }
      if (staff.role === "truong_chi") {
        return {
          allowed: true,
          role: "branch_admin",
          branchId: staff.branch_id ?? null,
        };
      }
      if (staff.role === "editor") {
        return { allowed: true, role: "editor" };
      }
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
