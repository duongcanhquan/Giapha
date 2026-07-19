/**
 * Schema Gia phả Online — SaaS multi-tenant.
 * Mọi `family_members` BẮT BUỘC có `family_id`.
 */

/** Quan hệ huyết thống / pháp lý cha mẹ → con */
export type RelationshipType = "BLOOD" | "ADOPTED";

export type Gender = "MALE" | "FEMALE" | "UNKNOWN";

/**
 * Custom claims:
 * - super_admin: platform
 * - branch_admin + family_id + branch_id: trưởng nhánh
 * - family owner: `families.owner_id == auth.uid` (không cần claim)
 */
export type AuthRole = "super_admin" | "branch_admin" | "member";

/* ─── families ──────────────────────────────────────────────── */

export interface FamilyTheme {
  background_image?: string | null;
  primary_color?: string;
  accent_color?: string;
  surface_color?: string;
}

export interface FamilyBranch {
  id: string;
  name: string;
  description?: string;
}

/** `families.settings` */
export interface FamilySettings {
  description?: string;
  default_branch_id?: string;
  theme?: FamilyTheme;
  branches?: FamilyBranch[];
}

/** Document collection `families` */
export interface Family {
  id: string;
  name: string;
  owner_id: string;
  created_at?: string | null;
  settings: FamilySettings;
}

export type CreateFamilyInput = {
  name: string;
  description?: string;
};

export type UpdateFamilyAppearanceInput = {
  theme: FamilyTheme;
};

export type UpdateFamilyProfileInput = {
  name?: string;
  description?: string;
};

export type UpdateFamilyBranchesInput = {
  branches: FamilyBranch[];
};

/* ─── family_members ────────────────────────────────────────── */

/** traditional_names: birth (húy), courtesy (tự), posthumous (thụy) */
export interface TraditionalNames {
  birth?: string | null;
  courtesy?: string | null;
  posthumous?: string | null;
}

export interface MemberStatus {
  is_alive: boolean;
  is_placeholder: boolean;
}

/** Dương lịch ISO `YYYY-MM-DD`; lunar_death dạng `YYYY-M-D` */
export interface MemberDates {
  birth?: string | null;
  death?: string | null;
  lunar_death?: string | null;
}

export interface MemberTreeLogic {
  /** null với Thủy tổ */
  parent_id: string | null;
  /** Materialized path Thủy tổ → bản thân */
  path: string[];
  branch_id: string;
  relationship_type: RelationshipType;
  /**
   * Id dâu (SpouseInfo.id trên hồ sơ cha) — mẹ sinh ra người này.
   * Giúp vẽ cạnh «Mẹ → con» đúng vợ nào (khi có nhiều dâu).
   */
  mother_spouse_id?: string | null;
  position?: {
    x?: number;
    y?: number;
    order?: number;
  };
}

/** Dâu vào họ / rể lấy con gái / phối ngẫu chung */
export type SpouseRole = "DAU" | "RE" | "SPOUSE";

export interface SpouseInfo {
  id: string;
  full_name: string;
  is_alive?: boolean;
  is_placeholder?: boolean;
  /** DAU = vợ vào họ; RE = chồng của con gái họ Dương */
  role?: SpouseRole;
  /** Họ gốc trước khi lấy chồng (với dâu) */
  maiden_name?: string | null;
  birth?: string | null;
  death?: string | null;
  hometown?: string | null;
  notes?: string | null;
}

/**
 * Document collection `family_members`.
 * Bắt buộc: `family_id`, `tree_logic.branch_id`, `tree_logic.path`.
 */
export interface FamilyMember {
  id: string;
  family_id: string;
  full_name: string;
  traditional_names: TraditionalNames;
  status: MemberStatus;
  dates: MemberDates;
  tree_logic: MemberTreeLogic;
  spouses: SpouseInfo[];
  gender?: Gender;
  is_huong_hoa?: boolean;
  biography?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

/** Liên hệ nhạy cảm — subcollection `sensitive/contact` */
export interface MemberContact {
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface FamilyMemberWithContact extends FamilyMember {
  contact?: MemberContact | null;
}

/* ─── relations (cạnh render React Flow) ────────────────────── */

export interface FamilyRelation {
  id: string;
  family_id: string;
  branch_id: string;
  source: string;
  target: string;
  relationship_type: RelationshipType;
}

export interface FamilyTreeData {
  family_id?: string;
  clan_name: string;
  members: FamilyMember[];
  relations: FamilyRelation[];
  /** Catalog nhánh từ families.settings.branches */
  branches?: FamilyBranch[];
}

/* ─── service inputs ────────────────────────────────────────── */

export interface PlaceholderUpdatePayload {
  id: string;
  full_name: string;
  is_alive?: boolean;
  gender?: Gender;
  birth?: string | null;
  death?: string | null;
}

export type AddMemberInput = {
  family_id: string;
  full_name: string;
  parent_id: string;
  /** Id dâu/vợ trong cha.spouses — gắn cạnh «Mẹ → con» trên cây */
  mother_spouse_id?: string | null;
  traditional_names?: TraditionalNames;
  is_alive?: boolean;
  gender?: Gender;
  is_huong_hoa?: boolean;
  spouses?: SpouseInfo[];
  relationship_type?: RelationshipType;
  contact?: MemberContact;
  branch_id?: string;
  dates?: MemberDates;
  biography?: string | null;
  notes?: string;
  id?: string;
};

export type AddPlaceholderInput = {
  family_id: string;
  parent_id: string;
  branch_id?: string;
  relationship_type?: RelationshipType;
  notes?: string;
  id?: string;
};

export type UpdateMemberInput = Partial<
  Omit<FamilyMember, "id" | "family_id" | "created_at">
> & {
  contact?: MemberContact | null;
};

/* ─── view helpers (UI / React Flow) ────────────────────────── */

/** Đời thứ N = độ dài materialized path */
export function memberGeneration(member: FamilyMember): number {
  return Math.max(1, member.tree_logic.path.length);
}

export function memberIsPlaceholder(member: FamilyMember): boolean {
  return member.status.is_placeholder;
}

export function memberIsAlive(member: FamilyMember): boolean {
  return member.status.is_alive;
}
