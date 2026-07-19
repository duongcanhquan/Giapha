"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { computeAnniversary } from "@/lib/lunar/death-date";
import { appToast } from "@/lib/toast";
import {
  addMember,
  addPlaceholderNode,
  updateMember,
} from "@/services/memberService";
import type {
  FamilyMember,
  Gender,
  RelationshipType,
} from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";

export type MemberFormMode = "create" | "edit";

type MemberFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: MemberFormMode;
  familyId: string;
  members: FamilyMember[];
  member?: FamilyMember | null;
  defaultParentId?: string | null;
  /** Trưởng nhánh bị khoá chi này */
  lockedBranchId?: string | null;
  onSaved?: () => void;
};

type FormState = {
  full_name: string;
  birth_name: string;
  courtesy_name: string;
  posthumous_name: string;
  parent_id: string;
  relationship_type: RelationshipType;
  branch_id: string;
  gender: Gender;
  is_alive: boolean;
  is_placeholder: boolean;
  is_huong_hoa: boolean;
  birth: string;
  death: string;
  lunar_death: string;
  biography: string;
  notes: string;
};

function emptyForm(parentId = "", branchId = "branch-main"): FormState {
  return {
    full_name: "",
    birth_name: "",
    courtesy_name: "",
    posthumous_name: "",
    parent_id: parentId,
    relationship_type: "BLOOD",
    branch_id: branchId,
    gender: "UNKNOWN",
    is_alive: true,
    is_placeholder: false,
    is_huong_hoa: false,
    birth: "",
    death: "",
    lunar_death: "",
    biography: "",
    notes: "",
  };
}

function fromMember(member: FamilyMember): FormState {
  return {
    full_name: member.full_name,
    birth_name: member.traditional_names.birth ?? "",
    courtesy_name: member.traditional_names.courtesy ?? "",
    posthumous_name: member.traditional_names.posthumous ?? "",
    parent_id: member.tree_logic.parent_id ?? "",
    relationship_type: member.tree_logic.relationship_type,
    branch_id: member.tree_logic.branch_id,
    gender: member.gender ?? "UNKNOWN",
    is_alive: member.status.is_alive,
    is_placeholder: member.status.is_placeholder,
    is_huong_hoa: Boolean(member.is_huong_hoa),
    birth: member.dates.birth ?? "",
    death: member.dates.death ?? "",
    lunar_death: member.dates.lunar_death ?? "",
    biography: member.biography ?? "",
    notes: member.notes ?? "",
  };
}

type FormBodyProps = {
  mode: MemberFormMode;
  familyId: string;
  members: FamilyMember[];
  member: FamilyMember | null;
  initial: FormState;
  initialLunarHint: string | null;
  lockedBranchId?: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

function MemberFormBody({
  mode,
  familyId,
  members,
  member,
  initial,
  initialLunarHint,
  lockedBranchId = null,
  onOpenChange,
  onSaved,
}: FormBodyProps) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [lunarHint, setLunarHint] = useState<string | null>(initialLunarHint);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onDeathChange = (value: string) => {
    setField("death", value);
    if (!value) {
      setField("lunar_death", "");
      setLunarHint(null);
      return;
    }
    const ann = computeAnniversary(value);
    setField("lunar_death", ann.lunar_death_date ?? "");
    setLunarHint(ann.lunar_display);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (mode === "create") {
        if (!form.parent_id && members.length > 0) {
          throw new Error("Chọn cha/mẹ (parent) để nối vào cây.");
        }

        if (form.is_placeholder) {
          if (!form.parent_id) {
            throw new Error("Placeholder cần parent_id.");
          }
          await addPlaceholderNode({
            family_id: familyId,
            parent_id: form.parent_id,
            branch_id: form.branch_id || undefined,
            relationship_type: form.relationship_type,
            notes: form.notes || "Khuyết danh",
          });
        } else {
          if (!form.full_name.trim()) {
            throw new Error("Họ tên không được để trống.");
          }
          if (!form.parent_id) {
            throw new Error("Cần parent_id khi thêm thành viên.");
          }
          await addMember({
            family_id: familyId,
            full_name: form.full_name.trim(),
            parent_id: form.parent_id,
            traditional_names: {
              birth: form.birth_name || null,
              courtesy: form.courtesy_name || null,
              posthumous: form.posthumous_name || null,
            },
            is_alive: form.is_alive,
            gender: form.gender,
            is_huong_hoa: form.is_huong_hoa,
            relationship_type: form.relationship_type,
            branch_id: form.branch_id || undefined,
            dates: {
              birth: form.birth || null,
              death: form.is_alive ? null : form.death || null,
              lunar_death: form.is_alive ? null : form.lunar_death || null,
            },
            biography: form.biography || null,
            notes: form.notes || undefined,
          });
        }
        appToast.success("Đã thêm thành viên");
      } else if (member) {
        await updateMember(member.id, {
          full_name: form.is_placeholder ? "" : form.full_name.trim(),
          traditional_names: {
            birth: form.birth_name || null,
            courtesy: form.courtesy_name || null,
            posthumous: form.posthumous_name || null,
          },
          status: {
            is_alive: form.is_placeholder ? false : form.is_alive,
            is_placeholder: form.is_placeholder,
          },
          gender: form.gender,
          is_huong_hoa: form.is_huong_hoa,
          dates: {
            birth: form.birth || null,
            death: form.is_alive && !form.is_placeholder ? null : form.death || null,
            lunar_death:
              form.is_alive && !form.is_placeholder
                ? null
                : form.lunar_death || null,
          },
          biography: form.biography || null,
          notes: form.notes || undefined,
        });
        appToast.success("Đã cập nhật thành viên");
      }

      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      appToast.error(
        "Lưu thất bại",
        err instanceof Error ? err.message : "Không thể ghi Firestore.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 text-sm">
      <label className="flex items-center gap-2 font-semibold">
        <input
          type="checkbox"
          checked={form.is_placeholder}
          onChange={(e) => setField("is_placeholder", e.target.checked)}
        />
        is_placeholder (khuyết danh)
      </label>

      {!form.is_placeholder ? (
        <>
          <label className="block font-semibold">
            Họ và tên
            <input
              required={!form.is_placeholder}
              value={form.full_name}
              onChange={(e) => setField("full_name", e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block font-semibold">
              Tên húy
              <input
                value={form.birth_name}
                onChange={(e) => setField("birth_name", e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="block font-semibold">
              Tên tự
              <input
                value={form.courtesy_name}
                onChange={(e) => setField("courtesy_name", e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="block font-semibold">
              Tên thụy
              <input
                value={form.posthumous_name}
                onChange={(e) => setField("posthumous_name", e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
              />
            </label>
          </div>
        </>
      ) : null}

      {mode === "create" ? (
        <>
          <label className="block font-semibold">
            Cha/mẹ (parent)
            <select
              required
              value={form.parent_id}
              onChange={(e) => setField("parent_id", e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
            >
              <option value="">— Chọn —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.status.is_placeholder
                    ? `? Khuyết danh (${m.id})`
                    : `${m.full_name} · đời ${memberGeneration(m)}`}
                </option>
              ))}
            </select>
          </label>
          <label className="block font-semibold">
            Quan hệ
            <select
              value={form.relationship_type}
              onChange={(e) =>
                setField("relationship_type", e.target.value as RelationshipType)
              }
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
            >
              <option value="BLOOD">Huyết thống (BLOOD)</option>
              <option value="ADOPTED">Nuôi/con nuôi (ADOPTED)</option>
            </select>
          </label>
        </>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block font-semibold">
          Giới tính
          <select
            value={form.gender}
            onChange={(e) => setField("gender", e.target.value as Gender)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
          >
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="UNKNOWN">Chưa rõ</option>
          </select>
        </label>
        <label className="block font-semibold">
          Chi / nhánh (branch_id)
          <input
            value={form.branch_id}
            onChange={(e) => setField("branch_id", e.target.value)}
            disabled={Boolean(lockedBranchId)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal disabled:bg-stone-100"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={form.is_alive}
            disabled={form.is_placeholder}
            onChange={(e) => setField("is_alive", e.target.checked)}
          />
          Đang sống
        </label>
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            checked={form.is_huong_hoa}
            onChange={(e) => setField("is_huong_hoa", e.target.checked)}
          />
          Hương hỏa
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block font-semibold">
          Ngày sinh (dương)
          <input
            type="date"
            value={form.birth}
            onChange={(e) => setField("birth", e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
          />
        </label>
        <label className="block font-semibold">
          Ngày mất (dương)
          <input
            type="date"
            value={form.death}
            disabled={form.is_alive && !form.is_placeholder}
            onChange={(e) => onDeathChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal disabled:opacity-50"
          />
        </label>
      </div>

      <label className="block font-semibold">
        Ngày giỗ (âm) — tự điền từ lunar-javascript
        <input
          value={form.lunar_death}
          onChange={(e) => setField("lunar_death", e.target.value)}
          placeholder="YYYY-M-D"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
        />
        {lunarHint ? (
          <span className="mt-1 block text-xs font-normal text-[#7a1f1f]">
            {lunarHint}
          </span>
        ) : null}
      </label>

      <label className="block font-semibold">
        Tiểu sử
        <textarea
          value={form.biography}
          onChange={(e) => setField("biography", e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
        />
      </label>

      <label className="block font-semibold">
        Ghi chú
        <input
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 font-normal"
        />
      </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="gp-btn gp-btn-ghost"
              onClick={() => onOpenChange(false)}
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="gp-btn gp-btn-primary disabled:opacity-60"
            >
              {saving ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
    </form>
  );
}

export function MemberFormModal({
  open,
  onOpenChange,
  mode,
  familyId,
  members,
  member = null,
  defaultParentId = null,
  lockedBranchId = null,
  onSaved,
}: MemberFormModalProps) {
  const roots = useMemo(
    () => members.filter((m) => !m.tree_logic.parent_id),
    [members],
  );
  const defaultBranch =
    lockedBranchId ??
    members[0]?.tree_logic.branch_id ??
    roots[0]?.tree_logic.branch_id ??
    "branch-main";

  const initial = useMemo(() => {
    if (mode === "edit" && member) return fromMember(member);
    return emptyForm(defaultParentId ?? roots[0]?.id ?? "", defaultBranch);
  }, [mode, member, defaultParentId, roots, defaultBranch]);

  const initialLunarHint = useMemo(() => {
    if (mode === "edit" && member?.dates.death) {
      return computeAnniversary(member.dates.death).lunar_display;
    }
    return null;
  }, [mode, member]);

  const formKey = `${mode}:${member?.id ?? "new"}:${defaultParentId ?? ""}:${lockedBranchId ?? ""}:${open ? "1" : "0"}`;

  const title =
    mode === "create"
      ? "Thêm thành viên"
      : `Cập nhật · ${member?.full_name || "Khuyết danh"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "edit" && member
              ? `Đời thứ ${memberGeneration(member)} · id ${member.id}`
              : "Nhập đầy đủ thông tin; ngày mất dương lịch sẽ tự điền ngày giỗ âm."}
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <MemberFormBody
            key={formKey}
            mode={mode}
            familyId={familyId}
            members={members}
            member={member}
            initial={initial}
            initialLunarHint={initialLunarHint}
            lockedBranchId={lockedBranchId}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
