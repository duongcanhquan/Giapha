/**
 * Phase 1 — Cấu trúc dữ liệu gia phả (Vietnamese genealogy).
 * Các type này là nền cho FamilyTree (React Flow) và các phase sau.
 */

/** Trạng thái sinh tồn của thành viên */
export type LifeStatus = "LIVING" | "DECEASED";

/** Quan hệ huyết thống / pháp lý giữa cha mẹ → con */
export type RelationshipType = "BLOOD" | "ADOPTED";

/** Giới tính (tuỳ chọn, phục vụ hiển thị) */
export type Gender = "MALE" | "FEMALE" | "UNKNOWN";

/** Vợ/chồng gắn kèm người chính trên node */
export interface SpouseInfo {
  id: string;
  full_name: string;
  life_status: LifeStatus;
  is_placeholder?: boolean;
}

/**
 * Thành viên trong cây gia phả.
 * `path`: chuỗi id từ Thủy tổ → bản thân (dùng cho Trace Route / highlight).
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
  birth_year?: number | null;
  death_year?: number | null;
  notes?: string;
}

/** Cạnh quan hệ cha mẹ → con trên cây */
export interface FamilyRelation {
  id: string;
  source: string;
  target: string;
  relationship_type: RelationshipType;
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
