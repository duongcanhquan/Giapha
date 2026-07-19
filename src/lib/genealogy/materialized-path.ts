/**
 * Materialized Path: path_con = path_cha + [id_con].
 * Giữ nguyên chuỗi khi nối qua PlaceholderNode (id placeholder vẫn nằm trong path).
 */
export function buildMaterializedPath(
  parentPath: string[],
  newMemberId: string,
): string[] {
  if (!newMemberId) {
    throw new Error("newMemberId là bắt buộc khi tính Materialized Path.");
  }
  return [...parentPath, newMemberId];
}
