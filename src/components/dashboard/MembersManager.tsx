"use client";

import { useState } from "react";
import { DashboardPanelSkeleton } from "@/components/ui/skeleton";
import { useFamilyTree } from "@/hooks/useFamilyTree";
import { appToast } from "@/lib/toast";

type MembersManagerProps = {
  familyId: string;
};

export function MembersManager({ familyId }: MembersManagerProps) {
  const { tree, isLoading, error, mutate } = useFamilyTree(familyId);
  const [message, setMessage] = useState<string | null>(null);

  if (isLoading && !tree) {
    return <DashboardPanelSkeleton />;
  }

  if (error) {
    return (
      <p className="text-sm text-[#7a1f1f]">
        {error.message}{" "}
        <button
          type="button"
          className="font-semibold underline"
          onClick={() => void mutate()}
        >
          Thử lại
        </button>
      </p>
    );
  }

  const members = tree?.members ?? [];

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
            {members.length} người · dữ liệu cache SWR (không reload khi chuyển trang).
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-[#7a1f1f] px-3 py-2 text-sm font-semibold text-[#fffdf8]"
          onClick={() => {
            const text =
              "Dùng addMember / addPlaceholderNode để ghi Firestore. Danh sách dùng cache SWR.";
            setMessage(text);
            appToast.info("Thêm thành viên", text);
          }}
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
