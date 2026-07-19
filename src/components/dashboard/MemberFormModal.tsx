"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ParentCascadePicker } from "@/components/dashboard/ParentCascadePicker";
import { MemberPhotoUploader } from "@/components/dashboard/MemberPhotoUploader";
import {
  coParentEmptyHint,
  coParentFieldLabel,
  coParentPickPlaceholder,
  filterCoParentSpouses,
  pickDefaultCoParentId,
  spouseRoleLabel,
  treeParentRoleLabel,
} from "@/lib/genealogy/labels";
import { computeAnniversary } from "@/lib/lunar/death-date";
import { appToast } from "@/lib/toast";
import {
  addMember,
  addPlaceholderNode,
  updateMember,
} from "@/services/memberService";
import type {
  FamilyBranch,
  FamilyMember,
  Gender,
  RelationshipType,
  SpouseInfo,
} from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";

export type MemberFormMode = "create" | "edit";

type MemberFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: MemberFormMode;
  familyId: string;
  members: FamilyMember[];
  /** Catalog chi từ family.settings.branches */
  branches?: FamilyBranch[];
  member?: FamilyMember | null;
  defaultParentId?: string | null;
  lockedBranchIds?: string[] | null;
  lockedBranchId?: string | null;
  onSaved?: () => void;
};

type FormState = {
  full_name: string;
  birth_name: string;
  courtesy_name: string;
  posthumous_name: string;
  parent_id: string;
  mother_spouse_id: string;
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
    mother_spouse_id: "",
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
    mother_spouse_id: member.tree_logic.mother_spouse_id ?? "",
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
  branches: FamilyBranch[];
  member: FamilyMember | null;
  initial: FormState;
  initialLunarHint: string | null;
  lockedBranchId?: string | null;
  lockedBranchIds?: string[] | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

function MemberFormBody({
  mode,
  familyId,
  members,
  branches,
  member,
  initial,
  initialLunarHint,
  lockedBranchId = null,
  lockedBranchIds = null,
  onOpenChange,
  onSaved,
}: FormBodyProps) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [lunarHint, setLunarHint] = useState<string | null>(initialLunarHint);
  const [spousesDraft, setSpousesDraft] = useState(
    () => member?.spouses ?? [],
  );
  const [addedCount, setAddedCount] = useState(0);

  const allowedBranches =
    lockedBranchIds != null
      ? lockedBranchIds
      : lockedBranchId
        ? [lockedBranchId]
        : null;

  const parentIdForCoParent =
    mode === "create" ? form.parent_id : (member?.tree_logic.parent_id ?? "");
  const selectedParent =
    members.find((m) => m.id === parentIdForCoParent) ?? null;
  const coParentChoices = useMemo(
    () => filterCoParentSpouses(selectedParent),
    [selectedParent],
  );
  const parentRole = treeParentRoleLabel(selectedParent);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyParent = (parent: FamilyMember) => {
    setForm((prev) => ({
      ...prev,
      parent_id: parent.id,
      mother_spouse_id: pickDefaultCoParentId(parent),
      branch_id: parent.tree_logic.branch_id,
    }));
  };

  const clearParent = () => {
    setForm((prev) => ({
      ...prev,
      parent_id: "",
      mother_spouse_id: "",
    }));
  };

  const resetChildFields = () => {
    setForm((prev) => ({
      ...prev,
      full_name: "",
      birth_name: "",
      courtesy_name: "",
      posthumous_name: "",
      gender: "UNKNOWN",
      is_alive: true,
      is_placeholder: false,
      is_huong_hoa: false,
      birth: "",
      death: "",
      lunar_death: "",
      biography: "",
      notes: "",
      // giữ parent_id, mother_spouse_id, branch_id, relationship_type
    }));
    setLunarHint(null);
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

  const persistCreate = async () => {
    if (!form.parent_id && members.length > 0) {
      throw new Error("Chọn Cha/Mẹ (nối cây) theo Chi → Đời → tên trước khi lưu.");
    }

    if (form.is_placeholder) {
      if (!form.parent_id) {
        throw new Error("Placeholder cần chọn Cha/Mẹ (nối cây).");
      }
      await addPlaceholderNode({
        family_id: familyId,
        parent_id: form.parent_id,
        branch_id: form.branch_id || undefined,
        relationship_type: form.relationship_type,
        notes: form.notes || "Khuyết danh",
      });
      return;
    }

    if (!form.full_name.trim()) {
      throw new Error("Họ tên không được để trống.");
    }
    if (!form.parent_id) {
      throw new Error("Cần chọn Cha/Mẹ (nối cây) khi thêm thành viên.");
    }
    await addMember({
      family_id: familyId,
      full_name: form.full_name.trim(),
      parent_id: form.parent_id,
      mother_spouse_id: form.mother_spouse_id || null,
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
      notes: form.notes.trim() ? form.notes.trim() : undefined,
    });
  };

  const handleSubmit = async (
    event: FormEvent,
    continueSibling = false,
  ) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (mode === "create") {
        await persistCreate();
        setAddedCount((n) => n + 1);
        onSaved?.();
        if (continueSibling && !form.is_placeholder) {
          appToast.success(
            "Đã thêm — tiếp tục anh/chị/em",
            selectedParent
              ? `Dưới ${parentRole} ${selectedParent.full_name}`
              : undefined,
          );
          resetChildFields();
        } else {
          appToast.success("Đã thêm thành viên");
          onOpenChange(false);
        }
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
            death:
              form.is_alive && !form.is_placeholder ? null : form.death || null,
            lunar_death:
              form.is_alive && !form.is_placeholder
                ? null
                : form.lunar_death || null,
          },
          tree_logic: {
            ...member.tree_logic,
            mother_spouse_id: form.mother_spouse_id || null,
            branch_id: form.branch_id || member.tree_logic.branch_id,
          },
          spouses: spousesDraft,
          biography: form.biography || null,
          notes: form.notes.trim() || "",
        });
        appToast.success("Đã cập nhật thành viên");
        onOpenChange(false);
        onSaved?.();
      }
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
    <form
      onSubmit={(e) => void handleSubmit(e, false)}
      className="space-y-3 text-sm"
    >
      {mode === "create" ? (
        <>
          {addedCount > 0 ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              Đã thêm {addedCount} người dưới cùng {parentRole.toLowerCase()} trong
              phiên này. Tiếp tục điền anh/chị/em hoặc đóng.
            </p>
          ) : null}
          <ParentCascadePicker
            members={members}
            branches={branches}
            allowedBranchIds={allowedBranches}
            selectedParentId={form.parent_id}
            onSelect={applyParent}
            onClear={clearParent}
          />
          {form.parent_id ? (
            <>
              <label className="block font-semibold">
                {coParentFieldLabel(selectedParent)}
                <select
                  value={form.mother_spouse_id}
                  onChange={(e) => setField("mother_spouse_id", e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal sm:text-sm"
                  disabled={coParentChoices.length === 0}
                >
                  <option value="">
                    {coParentChoices.length
                      ? coParentPickPlaceholder(selectedParent)
                      : coParentEmptyHint(selectedParent)}
                  </option>
                  {coParentChoices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                      {s.maiden_name ? ` · họ ${s.maiden_name}` : ""}
                      {s.role === "RE"
                        ? " (rể)"
                        : s.role === "DAU"
                          ? " (dâu)"
                          : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block font-semibold">
                Quan hệ với {parentRole.toLowerCase()}
                <select
                  value={form.relationship_type}
                  onChange={(e) =>
                    setField(
                      "relationship_type",
                      e.target.value as RelationshipType,
                    )
                  }
                  className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal sm:text-sm"
                >
                  <option value="BLOOD">Huyết thống</option>
                  <option value="ADOPTED">Con nuôi</option>
                </select>
              </label>
              {selectedParent ? (
                <p className="text-xs text-stone-500">
                  Con sẽ thuộc{" "}
                  <strong>
                    {branches.find((b) => b.id === form.branch_id)?.name ??
                      form.branch_id}
                  </strong>
                  {" · "}
                  đời{" "}
                  <strong>{memberGeneration(selectedParent) + 1}</strong>
                </p>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {mode === "create" && !form.parent_id ? (
        <p className="rounded-md border border-dashed border-stone-300 px-3 py-4 text-center text-sm text-stone-500">
          Chọn <strong>Cha/Mẹ (nối cây)</strong> theo Chi → Đời → tên ở trên,
          rồi điền thông tin con. Con gái cũng chọn được nếu muốn ghi con theo
          họ chồng.
        </p>
      ) : null}

      {(mode === "edit" || Boolean(form.parent_id)) ? (
        <>
      {mode === "edit" && member && !form.is_placeholder ? (
        <MemberPhotoUploader
          memberId={member.id}
          familyId={familyId}
          fullName={form.full_name || member.full_name}
          photoUrl={member.photo_url}
          deceased={!form.is_alive}
          onChanged={() => onSaved?.()}
        />
      ) : null}

      <label className="flex min-h-11 items-center gap-2.5 font-semibold">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={form.is_placeholder}
          onChange={(e) => setField("is_placeholder", e.target.checked)}
        />
        Khuyết danh (placeholder)
      </label>

      {!form.is_placeholder ? (
        <>
          <label className="block font-semibold">
            Họ và tên
            <input
              required={!form.is_placeholder}
              value={form.full_name}
              onChange={(e) => setField("full_name", e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal sm:text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block font-semibold">
              Tên húy
              <input
                value={form.birth_name}
                onChange={(e) => setField("birth_name", e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal sm:text-sm"
              />
            </label>
            <label className="block font-semibold">
              Tên tự
              <input
                value={form.courtesy_name}
                onChange={(e) => setField("courtesy_name", e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal sm:text-sm"
              />
            </label>
            <label className="block font-semibold">
              Tên thụy
              <input
                value={form.posthumous_name}
                onChange={(e) => setField("posthumous_name", e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal sm:text-sm"
              />
            </label>
          </div>
        </>
      ) : null}

      {mode === "edit" ? (
        <label className="block font-semibold">
          {coParentFieldLabel(
            members.find((m) => m.id === member?.tree_logic.parent_id) ?? null,
          )}
          <select
            value={form.mother_spouse_id}
            onChange={(e) => setField("mother_spouse_id", e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal sm:text-sm"
            disabled={coParentChoices.length === 0}
          >
            <option value="">
              {coParentChoices.length
                ? coParentPickPlaceholder(
                    members.find((m) => m.id === member?.tree_logic.parent_id) ??
                      null,
                  )
                : coParentEmptyHint(
                    members.find((m) => m.id === member?.tree_logic.parent_id) ??
                      null,
                  )}
            </option>
            {coParentChoices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
                {s.maiden_name ? ` · họ ${s.maiden_name}` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block font-semibold">
          Giới tính
          <select
            value={form.gender}
            onChange={(e) => setField("gender", e.target.value as Gender)}
            className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal sm:text-sm"
          >
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="UNKNOWN">Chưa rõ</option>
          </select>
        </label>
        <label className="block font-semibold">
          Chi / nhánh
          {mode === "create" ? (
            <input
              value={
                branches.find((b) => b.id === form.branch_id)?.name ??
                form.branch_id
              }
              disabled
              className="mt-1 min-h-11 w-full rounded-lg border border-stone-200 bg-stone-100 px-3 py-2.5 text-base font-normal text-stone-600 sm:text-sm"
            />
          ) : allowedBranches?.length ? (
            <select
              value={form.branch_id}
              onChange={(e) => setField("branch_id", e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal sm:text-sm"
            >
              {allowedBranches.map((id) => (
                <option key={id} value={id}>
                  {branches.find((b) => b.id === id)?.name ?? id}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={form.branch_id}
              onChange={(e) => setField("branch_id", e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal sm:text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              {!branches.some((b) => b.id === form.branch_id) ? (
                <option value={form.branch_id}>{form.branch_id}</option>
              ) : null}
            </select>
          )}
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex min-h-11 items-center gap-2.5 font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.is_alive}
            disabled={form.is_placeholder}
            onChange={(e) => setField("is_alive", e.target.checked)}
          />
          Đang sống
        </label>
        <label className="flex min-h-11 items-center gap-2.5 font-semibold">
          <input
            type="checkbox"
            className="h-4 w-4"
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
            className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal sm:text-sm"
          />
        </label>
        <label className="block font-semibold">
          Ngày mất (dương)
          <input
            type="date"
            value={form.death}
            disabled={form.is_alive && !form.is_placeholder}
            onChange={(e) => onDeathChange(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal disabled:opacity-50 sm:text-sm"
          />
        </label>
      </div>

      <label className="block font-semibold">
        Ngày giỗ (âm) — tự điền từ lunar-javascript
        <input
          value={form.lunar_death}
          onChange={(e) => setField("lunar_death", e.target.value)}
          placeholder="YYYY-M-D"
          className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal sm:text-sm"
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
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal sm:text-sm"
        />
      </label>

      <label className="block font-semibold">
        Ghi chú
        <input
          value={form.notes}
          onChange={(e) => setField("notes", e.target.value)}
          className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base font-normal sm:text-sm"
        />
      </label>

      {mode === "edit" && !form.is_placeholder ? (
        <section className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/80 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#7a1f1f]">
              Dâu / rể ({spousesDraft.length})
            </h3>
            <button
              type="button"
              className="min-h-9 text-xs font-semibold text-[#7a1f1f] hover:underline"
              onClick={() => {
                const role: SpouseInfo["role"] =
                  form.gender === "FEMALE" ? "RE" : "DAU";
                setSpousesDraft((prev) => [
                  ...prev,
                  {
                    id: `sp-new-${Date.now()}`,
                    full_name: "",
                    role,
                    maiden_name: null,
                    is_alive: true,
                    is_placeholder: false,
                    birth: null,
                    death: null,
                    hometown: null,
                    notes: null,
                  },
                ]);
              }}
            >
              + Thêm
            </button>
          </div>
          {spousesDraft.length === 0 ? (
            <p className="text-xs text-stone-500">
              Chưa có dâu/rể. Thêm để hiện node «Cưới» và gắn phối ngẫu sinh con.
            </p>
          ) : (
            spousesDraft.map((s, idx) => (
              <div
                key={s.id}
                className="grid gap-2 rounded-md border border-stone-200 bg-white p-2 sm:grid-cols-[1fr_7rem_auto]"
              >
                <input
                  required
                  placeholder="Họ tên"
                  value={s.full_name}
                  onChange={(e) => {
                    const full_name = e.target.value;
                    setSpousesDraft((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, full_name } : x,
                      ),
                    );
                  }}
                  className="min-h-11 rounded border border-stone-300 px-2 py-2 text-base font-normal sm:text-sm"
                />
                <select
                  value={s.role ?? "SPOUSE"}
                  onChange={(e) => {
                    const role = e.target.value as SpouseInfo["role"];
                    setSpousesDraft((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, role } : x)),
                    );
                  }}
                  className="min-h-11 rounded border border-stone-300 px-2 py-2 text-base font-normal sm:text-sm"
                >
                  <option value="DAU">{spouseRoleLabel("DAU")}</option>
                  <option value="RE">{spouseRoleLabel("RE")}</option>
                  <option value="SPOUSE">{spouseRoleLabel("SPOUSE")}</option>
                </select>
                <button
                  type="button"
                  className="text-xs font-semibold text-stone-500 hover:text-[#7a1f1f]"
                  onClick={() =>
                    setSpousesDraft((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  Xoá
                </button>
              </div>
            ))
          )}
        </section>
      ) : null}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              className="gp-btn gp-btn-ghost min-h-11 w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Huỷ
            </button>
            {mode === "create" && form.parent_id && !form.is_placeholder ? (
              <button
                type="button"
                disabled={saving || !form.full_name.trim()}
                className="gp-btn gp-btn-ghost min-h-11 w-full disabled:opacity-60 sm:w-auto"
                onClick={(e) => void handleSubmit(e, true)}
              >
                {saving ? "…" : "Lưu & thêm anh/chị/em"}
              </button>
            ) : null}
            <button
              type="submit"
              disabled={
                saving ||
                (mode === "create" && !form.parent_id && members.length > 0)
              }
              className="gp-btn gp-btn-primary min-h-11 w-full disabled:opacity-60 sm:w-auto"
            >
              {saving
                ? "Đang lưu…"
                : mode === "create"
                  ? "Lưu & đóng"
                  : "Lưu"}
            </button>
          </div>
        </>
      ) : null}
    </form>
  );
}

export function MemberFormModal({
  open,
  onOpenChange,
  mode,
  familyId,
  members,
  branches: branchesProp,
  member = null,
  defaultParentId = null,
  lockedBranchId = null,
  lockedBranchIds = null,
  onSaved,
}: MemberFormModalProps) {
  const allowed =
    lockedBranchIds != null
      ? lockedBranchIds
      : lockedBranchId
        ? [lockedBranchId]
        : null;

  const branches = useMemo(() => {
    if (branchesProp?.length) return branchesProp;
    const ids = new Set(members.map((m) => m.tree_logic.branch_id));
    return [...ids].map((id) => ({ id, name: id }));
  }, [branchesProp, members]);

  const roots = useMemo(
    () => members.filter((m) => !m.tree_logic.parent_id),
    [members],
  );
  const defaultBranch =
    (defaultParentId
      ? members.find((m) => m.id === defaultParentId)?.tree_logic.branch_id
      : null) ??
    allowed?.[0] ??
    members[0]?.tree_logic.branch_id ??
    roots[0]?.tree_logic.branch_id ??
    "branch-main";

  const initial = useMemo(() => {
    if (mode === "edit" && member) return fromMember(member);
    const parentId = defaultParentId ?? "";
    const parent = parentId
      ? members.find((m) => m.id === parentId)
      : undefined;
    const form = emptyForm(parentId, parent?.tree_logic.branch_id ?? defaultBranch);
    if (parent) {
      form.mother_spouse_id = pickDefaultCoParentId(parent);
    }
    return form;
  }, [mode, member, defaultParentId, members, defaultBranch]);

  const initialLunarHint = useMemo(() => {
    if (mode === "edit" && member?.dates.death) {
      return computeAnniversary(member.dates.death).lunar_display;
    }
    return null;
  }, [mode, member]);

  const formKey = `${mode}:${member?.id ?? "new"}:${defaultParentId ?? ""}:${(allowed ?? []).join(",")}:${open ? "1" : "0"}`;

  const title =
    mode === "create"
      ? "Thêm thành viên"
      : `Cập nhật · ${member?.full_name || "Khuyết danh"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[min(100vw-1rem,36rem)] max-w-xl overflow-hidden sm:w-[min(520px,calc(100%-2rem))]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "edit" && member
              ? `Đời thứ ${memberGeneration(member)} · id ${member.id}`
              : "Chọn Cha/Mẹ (nối cây): Chi → Đời → tên. Nam = Cha + dâu; nữ = Mẹ + rể. Có thể thêm liên tục anh/chị/em."}
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <MemberFormBody
            key={formKey}
            mode={mode}
            familyId={familyId}
            members={members}
            branches={branches}
            member={member}
            initial={initial}
            initialLunarHint={initialLunarHint}
            lockedBranchId={lockedBranchId}
            lockedBranchIds={allowed}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
