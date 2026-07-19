"use client";

import { useEffect, useState } from "react";
import { fetchFamilyTree } from "@/services/treeService";
import type { FamilyMember } from "@/types/genealogy";

type MembersManagerProps = {
  familyId: string;
};

export function MembersManager({ familyId }: MembersManagerProps) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchFamilyTree(familyId).then((res) => {
      if (cancelled) return;
      setMembers(res.tree.members);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  if (loading) {
    return <p className="text-sm text-stone-500">Đang tải danh sách thành viên…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
          >
            Quản lý Thành viên
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            {members.length} người · CRUD ghi Firestore qua memberService (cần đăng nhập
            Owner / Branch Admin).
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-[#7a1f1f] px-3 py-2 text-sm font-semibold text-[#fffdf8]"
          onClick={() =>
            setMessage(
              "Dùng addMember / addPlaceholderNode từ dashboard form chi tiết (phase tiếp). Hiện tại xem danh sách & mở cây công khai.",
            )
          }
        >
          + Thêm thành viên
        </button>
      </div>

      {message ? (
        <p className="rounded-lg bg-[#7a1f1f]/08 px-3 py-2 text-sm text-[#7a1f1f]">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-stone-300/60 bg-[#fffdf8]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Tên</th>
              <th className="px-3 py-2 font-semibold">Đời</th>
              <th className="px-3 py-2 font-semibold">Nhánh</th>
              <th className="px-3 py-2 font-semibold">Trạng thái</th>
              <th className="px-3 py-2 font-semibold">Path</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-stone-100 last:border-0">
                <td className="px-3 py-2 font-medium">
                  {m.is_placeholder ? "? Khuyết danh" : m.full_name}
                </td>
                <td className="px-3 py-2">{m.generation}</td>
                <td className="px-3 py-2">{m.branch_id}</td>
                <td className="px-3 py-2">
                  {m.life_status === "LIVING" ? "Đang sống" : "Đã mất"}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-stone-500">
                  {m.path.join(" → ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
