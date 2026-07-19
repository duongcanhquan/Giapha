import type { User } from "firebase/auth";
import { checkSuperAdminAccess } from "@/services/accessService";
import { listOwnedFamilies } from "@/services/familyService";
import { listManagedFamilyIdsForEmail } from "@/services/managerService";
import { getMyRegistrations } from "@/services/registrationService";

/**
 * Sau đăng nhập / đăng ký: Super Admin → cổng SA;
 * đã có gia phả / được mời quản lý → dashboard;
 * đang chờ duyệt → pending; còn lại → đăng ký tạo gia phả.
 */
export async function resolvePostLoginPath(user: User): Promise<string> {
  if (await checkSuperAdminAccess(user)) {
    return "/super-admin";
  }

  const owned = await listOwnedFamilies(user.uid);
  if (owned.length > 0) {
    return `/dashboard/${encodeURIComponent(owned[0]!.id)}`;
  }

  const managed = await listManagedFamilyIdsForEmail(user.email);
  if (managed.length > 0) {
    return `/dashboard/${encodeURIComponent(managed[0]!)}`;
  }

  const regs = await getMyRegistrations(user.uid);
  const approved = regs.find((r) => r.status === "approved" && r.family_id);
  if (approved?.family_id) {
    return `/dashboard/${encodeURIComponent(approved.family_id)}`;
  }

  const pending = regs.find((r) => r.status === "pending");
  if (pending) {
    return "/onboarding/pending";
  }

  const rejected = regs.find((r) => r.status === "rejected");
  if (rejected) {
    return "/onboarding/pending";
  }

  return "/register";
}
