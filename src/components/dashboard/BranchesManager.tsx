"use client";

import { useEffect, useState, type FormEvent } from "react";
import { mutate as swrMutate } from "swr";
import {
  getFamily,
  updateFamilyBranches,
  DEFAULT_BRANCH,
} from "@/services/familyService";
import { familyTreeKey } from "@/hooks/useFamilyTree";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { appToast } from "@/lib/toast";
import type { FamilyBranch } from "@/types/family";

type BranchesManagerProps = {
  familyId: string;
};

export function BranchesManager({ familyId }: BranchesManagerProps) {
  const [branches, setBranches] = useState<FamilyBranch[]>([
    { id: DEFAULT_BRANCH, name: "Chi chính", description: "Nhánh hương hỏa" },
  ]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getFamily(familyId)
      .then((family) => {
        if (cancelled || !family?.settings.branches?.length) return;
        setBranches(family.settings.branches);
      })
      .catch(() => {
        /* demo / offline */
      });
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  const onAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    if (!name) return;
    const id = `branch-${name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
    setBranches((prev) => [...prev, { id, name, description }]);
    event.currentTarget.reset();
  };

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (!isFirebaseConfigured()) {
        const msg = "Đã lưu cục bộ (demo). Cấu hình Firebase để ghi Firestore.";
        setMessage(msg);
        appToast.success("Đã lưu nhánh (demo)", msg);
        return;
      }
      await updateFamilyBranches(familyId, { branches });
      await swrMutate(familyTreeKey(familyId));
      setMessage("Đã cập nhật danh sách nhánh.");
      appToast.success("Đã lưu nhánh");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lưu thất bại.";
      setMessage(msg);
      appToast.error("Lưu nhánh thất bại", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
        >
          Quản lý Nhánh
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Branch Admin chỉ được ghi `family_members` khi `branch_id` khớp claim của họ.
        </p>
      </div>

      <ul className="space-y-2">
        {branches.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-stone-300/60 bg-[#fffdf8] px-4 py-3"
          >
            <div>
              <p className="font-semibold">{b.name}</p>
              <p className="text-xs text-stone-500 font-mono">{b.id}</p>
              {b.description ? (
                <p className="mt-1 text-sm text-stone-600">{b.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="text-sm font-semibold text-[#7a1f1f]"
              onClick={() =>
                setBranches((prev) => prev.filter((x) => x.id !== b.id))
              }
              disabled={b.id === DEFAULT_BRANCH}
            >
              Xoá
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={onAdd}
        className="grid gap-3 rounded-xl border border-stone-300/60 bg-[#fffdf8] p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <input
          name="name"
          required
          placeholder="Tên nhánh"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          name="description"
          placeholder="Mô tả"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg border border-stone-400 px-3 py-2 text-sm font-semibold"
        >
          Thêm nhánh
        </button>
      </form>

      <button
        type="button"
        disabled={saving}
        onClick={() => void onSave()}
        className="rounded-lg bg-[#7a1f1f] px-4 py-2 text-sm font-semibold text-[#fffdf8] disabled:opacity-60"
      >
        {saving ? "Đang lưu…" : "Lưu nhánh"}
      </button>
      {message ? <p className="text-sm text-[#7a1f1f]">{message}</p> : null}
    </div>
  );
}
