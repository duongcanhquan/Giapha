/**
 * Schema helpers for family managers (trưởng nhánh do chủ dòng họ tạo).
 */

export type FamilyManagerStatus = "pending" | "active" | "revoked";

export type FamilyManager = {
  id: string;
  family_id: string;
  /** Firebase Auth uid — null khi mới mời (chưa đăng nhập) */
  uid: string | null;
  email: string;
  display_name?: string | null;
  role: "branch_admin";
  branch_id: string;
  branch_name?: string | null;
  status: FamilyManagerStatus;
  created_by: string;
  created_at?: string | null;
  updated_at?: string | null;
  /** Mật khẩu tạm (chỉ trả về một lần khi API Admin tạo tài khoản) */
  temp_password?: string | null;
};

export function managerDocId(familyId: string, uid: string): string {
  return `${familyId}__${uid}`;
}

export function normalizeManagerEmail(email: string): string {
  return email.trim().toLowerCase();
}
