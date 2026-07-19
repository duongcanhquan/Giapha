/**
 * Phase 1 — Cấu trúc dữ liệu gia phả (Vietnamese genealogy).
 * Các type này là nền cho FamilyTree (React Flow), Security Rules và Services.
 */

/** Trạng thái sinh tồn của thành viên */
export type LifeStatus = "LIVING" | "DECEASED";

/** Quan hệ huyết thống / pháp lý giữa cha mẹ → con */
export type RelationshipType = "BLOOD" | "ADOPTED";

/** Giới tính (tuỳ chọn, phục vụ hiển thị) */
export type Gender = "MALE" | "FEMALE" | "UNKNOWN";

/** Vai trò trong custom claims Firebase Auth */
export type AuthRole = "super_admin" | "branch_admin" | "member";

/** Vợ/chồng gắn kèm người chính trên node */
export interface SpouseInfo {
  id: string;
  full_name: string;
  life_status: LifeStatus;
  is_placeholder?: boolean;
}

/**
 * Thông tin liên hệ nhạy cảm.
 * Lưu ở subcollection `members/{id}/sensitive/contact` — khách không đọc được.
 */
export interface MemberContact {
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  notes?: string | null;
}

/** Logic vị trí trên cây / phân nhánh quản trị */
export interface TreeLogic {
  /** Id nhánh do branch_admin quản lý */
  branch_id: string;
  /** Tọa độ / thứ tự hiển thị trên cây (công khai cho khách) */
  position?: {
    x?: number;
    y?: number;
    order?: number;
  };
}

/**
 * Thành viên trong cây gia phả (document công khai trên `members/{id}`).
 * KHÔNG chứa `contact` — contact nằm ở subcollection riêng.
 * `path`: chuỗi id từ Thủy tổ → bản thân (Materialized Path).
 */
export interface FamilyMember {
  id: string;
  full_name: string;
  /** Đời thứ mấy (Thủy tổ = 1) */
  generation: number;
  life_status: LifeStatus;
  gender?: Gender;
  /** Người giữ hương hỏa */
  is_huong_hoa?: boolean;
  /** Khuyết danh — render PlaceholderNode */
  is_placeholder: boolean;
  spouses: SpouseInfo[];
  /** Id cha/mẹ trực tiếp (0–2) */
  parent_ids: string[];
  /**
   * Đường dẫn từ Thủy tổ đến người này (gồm cả `id` ở cuối).
   * Ví dụ: ["founder", "gen2-a", "self"]
   */
  path: string[];
  tree_logic: TreeLogic;
  birth_year?: number | null;
  death_year?: number | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

/** Document đầy đủ khi admin đã load thêm contact */
export interface FamilyMemberWithContact extends FamilyMember {
  contact?: MemberContact | null;
}

/** Cạnh quan hệ cha mẹ → con trên cây */
export interface FamilyRelation {
  id: string;
  source: string;
  target: string;
  relationship_type: RelationshipType;
  tree_logic?: Pick<TreeLogic, "branch_id">;
}

/** Toàn bộ dữ liệu một dòng họ để render cây */
export interface FamilyTreeData {
  clan_name: string;
  members: FamilyMember[];
  relations: FamilyRelation[];
}

/** Payload khi cập nhật placeholder (khuyết danh → có tên) */
export interface PlaceholderUpdatePayload {
  id: string;
  full_name: string;
  life_status?: LifeStatus;
  gender?: Gender;
  birth_year?: number | null;
  death_year?: number | null;
}

/** Input tạo thành viên mới (id do service sinh nếu bỏ trống) */
export type AddMemberInput = {
  full_name: string;
  /** Cha/mẹ để nối Materialized Path (có thể là PlaceholderNode) */
  parent_id: string;
  life_status?: LifeStatus;
  gender?: Gender;
  is_huong_hoa?: boolean;
  spouses?: SpouseInfo[];
  relationship_type?: RelationshipType;
  contact?: MemberContact;
  tree_logic?: Partial<TreeLogic>;
  birth_year?: number | null;
  death_year?: number | null;
  notes?: string;
  /** Tuỳ chọn: truyền id cố định; mặc định dùng doc id Firestore */
  id?: string;
};

/** Input tạo PlaceholderNode (khuyết danh) */
export type AddPlaceholderInput = {
  parent_id: string;
  tree_logic?: Partial<TreeLogic>;
  relationship_type?: RelationshipType;
  generation?: number;
  notes?: string;
  id?: string;
};

/** Input cập nhật thành viên (không cho ghi đè `path` / `id` tuỳ tiện từ client thường) */
export type UpdateMemberInput = Partial<
  Omit<FamilyMember, "id" | "path" | "created_at">
> & {
  contact?: MemberContact | null;
};
