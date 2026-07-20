/** Sự kiện dòng họ — collection `family_events` */
export type FamilyEventType =
  | "gio"
  | "cuoi"
  | "sinh"
  | "hop_ho"
  | "ky_niem"
  | "khac";

export interface FamilyEvent {
  id: string;
  family_id: string;
  title: string;
  type: FamilyEventType;
  /** Dương lịch ISO YYYY-MM-DD */
  date?: string | null;
  /** Âm lịch dạng YYYY-M-D hoặc ghi chú */
  lunar_date?: string | null;
  member_id?: string | null;
  branch_id?: string | null;
  description?: string;
  /** true nếu sinh từ ngày mất/giỗ thành viên (không ghi Firestore) */
  derived?: boolean;
  created_at?: string | null;
  created_by?: string | null;
}

export type CreateFamilyEventInput = {
  family_id: string;
  title: string;
  type: FamilyEventType;
  date?: string | null;
  lunar_date?: string | null;
  member_id?: string | null;
  branch_id?: string | null;
  description?: string;
};

export type UpdateFamilyEventInput = Partial<
  Omit<FamilyEvent, "id" | "family_id" | "created_at" | "created_by" | "derived">
>;

export const EVENT_TYPE_LABEL: Record<FamilyEventType, string> = {
  gio: "Giỗ",
  cuoi: "Cưới hỏi",
  sinh: "Sinh nhật / đầy tháng",
  hop_ho: "Họp họ",
  ky_niem: "Kỷ niệm",
  khac: "Khác",
};
