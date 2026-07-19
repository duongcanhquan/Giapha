import type { FamilyMember, SpouseInfo } from "@/types/genealogy";

/** Nhãn vai trò dâu / rể — thống nhất toàn app */
export function spouseRoleLabel(role?: SpouseInfo["role"] | null): string {
  if (role === "DAU") return "Con dâu";
  if (role === "RE") return "Con rể";
  return "Phối ngẫu";
}

export function spouseRoleShort(role?: SpouseInfo["role"] | null): string {
  if (role === "DAU") return "dâu";
  if (role === "RE") return "rể";
  return "phối ngẫu";
}

/**
 * Người nối trên cây (parent_id): nam → Cha, nữ → Mẹ.
 * Trung tính khi chưa rõ giới.
 */
export function treeParentRoleLabel(
  parent: Pick<FamilyMember, "gender"> | null | undefined,
): "Cha" | "Mẹ" | "Cha/Mẹ" {
  if (!parent) return "Cha/Mẹ";
  if (parent.gender === "MALE") return "Cha";
  if (parent.gender === "FEMALE") return "Mẹ";
  return "Cha/Mẹ";
}

/** Phối ngẫu cùng sinh con: Cha → Con dâu; Mẹ → Con rể */
export function coParentSpouseRoles(
  parent: Pick<FamilyMember, "gender"> | null | undefined,
): SpouseInfo["role"][] {
  if (parent?.gender === "FEMALE") return ["RE"];
  if (parent?.gender === "MALE") return ["DAU"];
  return ["DAU", "RE", "SPOUSE"];
}

export function coParentFieldLabel(
  parent: Pick<FamilyMember, "gender"> | null | undefined,
): string {
  if (parent?.gender === "FEMALE") return "Cha (rể — chồng của mẹ)";
  if (parent?.gender === "MALE") return "Mẹ (dâu — vợ của cha)";
  return "Phối ngẫu cùng sinh con";
}

/** Nhãn ngắn trên hồ sơ / danh sách: Cha (rể) | Mẹ (dâu) */
export function coParentShortLabel(
  spouseRole?: SpouseInfo["role"] | null,
  treeParent?: Pick<FamilyMember, "gender"> | null,
): string {
  if (spouseRole === "RE") return "Cha (rể)";
  if (spouseRole === "DAU") return "Mẹ (dâu)";
  if (treeParent?.gender === "FEMALE") return "Cha (rể)";
  if (treeParent?.gender === "MALE") return "Mẹ (dâu)";
  return "Phối ngẫu";
}

export function coParentEmptyHint(
  parent: Pick<FamilyMember, "gender"> | null | undefined,
): string {
  if (parent?.gender === "FEMALE") {
    return "Mẹ chưa có rể — thêm chồng trên hồ sơ mẹ (tùy chọn gắn cha)";
  }
  if (parent?.gender === "MALE") {
    return "Cha chưa có dâu — thêm vợ trên hồ sơ cha (tùy chọn gắn mẹ)";
  }
  return "Chưa có dâu/rể trên hồ sơ người nối";
}

export function coParentPickPlaceholder(
  parent: Pick<FamilyMember, "gender"> | null | undefined,
): string {
  if (parent?.gender === "FEMALE") return "— Chọn rể (cha của con) —";
  if (parent?.gender === "MALE") return "— Chọn dâu (mẹ của con) —";
  return "— Chọn phối ngẫu —";
}

/** Cạnh cây: parent → con */
export function parentChildEdgeLabel(
  parentGender?: FamilyMember["gender"] | null,
): string {
  if (parentGender === "FEMALE") return "Mẹ → con";
  if (parentGender === "MALE") return "Cha → con";
  return "Cha/Mẹ → con";
}

/** Cạnh từ dâu/rể → con */
export function spouseChildEdgeLabel(role?: SpouseInfo["role"] | null): string {
  if (role === "RE") return "Cha (rể) → con";
  if (role === "DAU") return "Mẹ (dâu) → con";
  return "Phối ngẫu → con";
}

export function filterCoParentSpouses(
  parent: FamilyMember | null | undefined,
): SpouseInfo[] {
  if (!parent) return [];
  const roles = coParentSpouseRoles(parent);
  return parent.spouses.filter(
    (s) => !s.role || roles.includes(s.role) || s.role === "SPOUSE",
  );
}

export function pickDefaultCoParentId(
  parent: FamilyMember | null | undefined,
): string {
  const list = filterCoParentSpouses(parent);
  return list[0]?.id ?? "";
}
