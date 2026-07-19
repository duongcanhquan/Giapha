/**
 * Schema helpers for family managers (trưởng nhánh do chủ dòng họ tạo).
 */

export type FamilyManagerStatus = "pending" | "active" | "revoked";

export type FamilyManager = {
  id: string;
  family_id: string;
  /** Firebase Auth uid — null khi chờ kích hoạt (email đã tồn tại khác mật khẩu) */
  uid: string | null;
  email: string;
  display_name?: string | null;
  role: "branch_admin";
  /** Chi được giao (1 hoặc nhiều) */
  branch_ids: string[];
  /** Tên chi tương ứng branch_ids (cùng thứ tự, tùy chọn) */
  branch_names?: string[] | null;
  /**
   * @deprecated Dùng branch_ids — giữ để đọc bản ghi cũ.
   */
  branch_id?: string;
  branch_name?: string | null;
  status: FamilyManagerStatus;
  created_by: string;
  created_at?: string | null;
  updated_at?: string | null;
};

/** Chuẩn hoá danh sách chi từ doc Firestore (hỗ trợ branch_id cũ). */
export function resolveManagerBranchIds(data: {
  branch_ids?: unknown;
  branch_id?: unknown;
}): string[] {
  if (Array.isArray(data.branch_ids)) {
    return data.branch_ids
      .map((x) => String(x ?? "").trim())
      .filter(Boolean);
  }
  const one = String(data.branch_id ?? "").trim();
  return one ? [one] : [];
}

export function resolveManagerBranchNames(
  data: {
    branch_names?: unknown;
    branch_name?: unknown;
  },
  branchIds: string[],
): string[] {
  if (Array.isArray(data.branch_names)) {
    return data.branch_names.map((x) => String(x ?? ""));
  }
  const one = data.branch_name != null ? String(data.branch_name) : "";
  if (one && branchIds.length) {
    return branchIds.map((_, i) => (i === 0 ? one : ""));
  }
  return [];
}

export function managerDocId(familyId: string, uid: string): string {
  return `${familyId}__${uid}`;
}

export function normalizeManagerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function formatManagerBranches(m: FamilyManager): string {
  const ids = m.branch_ids?.length
    ? m.branch_ids
    : m.branch_id
      ? [m.branch_id]
      : [];
  const names = m.branch_names ?? [];
  if (!ids.length) return "—";
  return ids
    .map((id, i) => names[i]?.trim() || m.branch_name || id)
    .join(", ");
}
