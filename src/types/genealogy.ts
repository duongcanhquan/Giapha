/**
 * Cấu trúc dữ liệu gia phả — multi-tenant (cách ly theo `family_id`).
 */

/** Trạng thái sinh tồn của thành viên */
export type LifeStatus = "LIVING" | "DECEASED";

/** Quan hệ huyết thống / pháp lý giữa cha mẹ → con */
export type RelationshipType = "BLOOD" | "ADOPTED";

/** Giới tính (tuỳ chọn, phục vụ hiển thị) */
export type Gender = "MALE" | "FEMALE" | "UNKNOWN";

/**
 * Vai trò Auth:
 * - family owner: xác định qua `families.owner_id` (không cần claim)
 * - branch_admin: custom claims `{ role, family_id, branch_id }`
 */
export type AuthRole = "branch_admin" | "member";

/** Vợ/chồng gắn kèm người chính trên node */
export interface SpouseInfo {
  id: string;
  full_name: string;
  life_status: LifeStatus;
  is_placeholder?: boolean;
}

/**
 * Thông tin liên hệ nhạy cảm.
 * Lưu ở `family_members/{id}/sensitive/contact` — khách không đọc được.
 */
export interface MemberContact {
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  notes?: string | null;
}

/** Logic vị trí trên cây / phân nhánh (bổ sung cho UI) */
export interface TreeLogic {
  /** Đồng bộ với `branch_id` top-level */
  branch_id: string;
  position?: {
    x?: number;
    y?: number;
    order?: number;
  };
}

/** Các loại tên trong truyền thống gia phả */
export interface MemberNames {
  huy?: string | null;
  thuy?: string | null;
  tu?: string | null;
}

/**
 * Document trên collection `family_members`.
 * BẮT BUỘC có `family_id` + `branch_id` để cách ly SaaS / phân quyền trưởng nhánh.
 */
export interface FamilyMember {
  id: string;
  /** Tenant — id document trong collection `families` */
  family_id: string;
  /** Nhánh quản trị (top-level, dùng trong Security Rules) */
  branch_id: string;
  full_name: string;
  generation: number;
  life_status: LifeStatus;
  gender?: Gender;
  is_huong_hoa?: boolean;
  is_placeholder: boolean;
  spouses: SpouseInfo[];
  parent_ids: string[];
  path: string[];
  tree_logic: TreeLogic;
  names?: MemberNames;
  biography?: string | null;
  birth_year?: number | null;
  death_year?: number | null;
  death_date?: string | null;
  lunar_death_date?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FamilyMemberWithContact extends FamilyMember {
  contact?: MemberContact | null;
}

/** Cạnh trên collection `family_relations` */
export interface FamilyRelation {
  id: string;
  family_id: string;
  branch_id: string;
  source: string;
  target: string;
  relationship_type: RelationshipType;
  tree_logic?: Pick<TreeLogic, "branch_id">;
}

export interface FamilyTreeData {
  family_id?: string;
  clan_name: string;
  members: FamilyMember[];
  relations: FamilyRelation[];
}

export interface PlaceholderUpdatePayload {
  id: string;
  full_name: string;
  life_status?: LifeStatus;
  gender?: Gender;
  birth_year?: number | null;
  death_year?: number | null;
}

export type AddMemberInput = {
  family_id: string;
  full_name: string;
  parent_id: string;
  life_status?: LifeStatus;
  gender?: Gender;
  is_huong_hoa?: boolean;
  spouses?: SpouseInfo[];
  relationship_type?: RelationshipType;
  contact?: MemberContact;
  branch_id?: string;
  tree_logic?: Partial<TreeLogic>;
  birth_year?: number | null;
  death_year?: number | null;
  notes?: string;
  id?: string;
};

export type AddPlaceholderInput = {
  family_id: string;
  parent_id: string;
  branch_id?: string;
  tree_logic?: Partial<TreeLogic>;
  relationship_type?: RelationshipType;
  generation?: number;
  notes?: string;
  id?: string;
};

export type UpdateMemberInput = Partial<
  Omit<FamilyMember, "id" | "path" | "family_id" | "created_at">
> & {
  contact?: MemberContact | null;
};
