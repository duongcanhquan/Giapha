import type { User } from "firebase/auth";
import { getFamily } from "@/services/familyService";
import { findActiveBranchManager } from "@/services/managerService";
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
  /** @deprecated Dùng branchIds — chi đầu tiên */
  branchId?: string | null;
  branchName?: string | null;
  /** Các chi được quyền sửa (branch_admin) */
  branchIds?: string[];
  branchNames?: string[];
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
 * Super Admin · Owner · Staff (trưởng họ / chi / editor) · Branch Admin (claim hoặc family_managers).
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
        const branchId = staff.branch_id ?? null;
        return {
          allowed: true,
          role: "branch_admin",
          branchId,
          branchIds: branchId ? [branchId] : [],
        };
      }
      if (staff.role === "editor") {
        return { allowed: true, role: "editor" };
      }
    }

    const claimFamilyId = token.claims.family_id;
    const claimBranchId = token.claims.branch_id;
    const claimBranchIds = token.claims.branch_ids;

    if (
      token.claims.role === "branch_admin" &&
      typeof claimFamilyId === "string" &&
      claimFamilyId === familyId
    ) {
      const fromClaim = Array.isArray(claimBranchIds)
        ? claimBranchIds.map(String).filter(Boolean)
        : typeof claimBranchId === "string" && claimBranchId
          ? [claimBranchId]
          : [];
      return {
        allowed: true,
        role: "branch_admin",
        branchIds: fromClaim,
        branchId: fromClaim[0] ?? null,
        branchName: null,
      };
    }

    const listed = await findActiveBranchManager(
      familyId,
      user.uid,
      user.email,
    );
    if (listed) {
      const branchIds = listed.branch_ids?.length
        ? listed.branch_ids
        : listed.branch_id
          ? [listed.branch_id]
          : [];
      const branchNames = listed.branch_names ?? [];
      return {
        allowed: true,
        role: "branch_admin",
        branchIds,
        branchNames,
        branchId: branchIds[0] ?? null,
        branchName: branchNames[0] || listed.branch_name || null,
      };
    }

    return { allowed: false, role: null };
  } catch {
    return { allowed: false, role: null };
  }
}

/** branch_admin có được sửa member thuộc chi này không */
export function canAccessBranch(
  access: FamilyAccess,
  branchId: string | null | undefined,
): boolean {
  if (
    access.role === "owner" ||
    access.role === "super_admin" ||
    access.role === "truong_ho" ||
    access.role === "editor"
  ) {
    return true;
  }
  if (access.role !== "branch_admin") return false;
  if (!branchId) return false;
  const ids = access.branchIds?.length
    ? access.branchIds
    : access.branchId
      ? [access.branchId]
      : [];
  return ids.includes(branchId);
}
