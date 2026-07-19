/**
 * Multi-tenant SaaS — một document = một dòng họ trên nền tảng Giapha.
 */
export interface Family {
  id: string;
  name: string;
  description: string;
  /** UID Firebase Auth của người tạo / Admin dòng họ */
  owner_id: string;
  /** ISO hoặc Firestore Timestamp serialised */
  created_at?: string | null;
}

export type CreateFamilyInput = {
  name: string;
  description?: string;
};
