/**
 * Multi-tenant SaaS — một document = một dòng họ trên nền tảng Giapha.
 */

/** Giao diện riêng của dòng họ (dashboard Appearance) */
export interface FamilyTheme {
  /** URL ảnh nền nhà thờ / banner */
  background_image?: string | null;
  /** Màu chủ đạo (viền / CTA) */
  primary_color?: string;
  /** Màu nhấn (vàng đồng, accent) */
  accent_color?: string;
  /** Màu nền bề mặt */
  surface_color?: string;
}

/** Nhánh trong dòng họ */
export interface FamilyBranch {
  id: string;
  name: string;
  description?: string;
}

export interface Family {
  id: string;
  name: string;
  description: string;
  /** UID Firebase Auth của người tạo / Admin dòng họ */
  owner_id: string;
  created_at?: string | null;
  default_branch_id?: string;
  theme?: FamilyTheme;
  branches?: FamilyBranch[];
}

export type CreateFamilyInput = {
  name: string;
  description?: string;
};

export type UpdateFamilyAppearanceInput = {
  theme: FamilyTheme;
};

export type UpdateFamilyBranchesInput = {
  branches: FamilyBranch[];
};
