"use client";

import { useMemo, useState, type ReactNode } from "react";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { useDashboardAccessOptional } from "@/components/dashboard/DashboardAccessContext";
import { DashboardPanelSkeleton } from "@/components/ui/skeleton";
import { useFamilyTree } from "@/hooks/useFamilyTree";
import {
  filterMemberList,
  groupMemberRows,
  hasActiveMemberFilters,
  listGenerations,
  type MemberListGroupBy,
  type MemberListRow,
} from "@/lib/search/filter-members";
import { appToast } from "@/lib/toast";
import { deleteMember } from "@/services/memberService";
import type { FamilyMember, FamilyTreeData } from "@/types/genealogy";

type MembersManagerProps = {
  familyId: string;
  tree?: FamilyTreeData | null;
  onRefresh?: () => void;
  onCreate?: () => void;
  onAddChild?: (parent: FamilyMember) => void;
  onEdit?: (member: FamilyMember) => void;
  hideHeaderActions?: boolean;
  exportSlot?: ReactNode;
};

const GROUP_OPTIONS: { id: MemberListGroupBy; label: string }[] = [
  { id: "list", label: "Danh sách" },
  { id: "generation", label: "Theo đời" },
  { id: "branch", label: "Theo chi" },
];

function MemberActions({
  member,
  busy,
  onAddChild,
  onEdit,
  onDelete,
}: {
  member: FamilyMember;
  busy: boolean;
  onAddChild?: (parent: FamilyMember) => void;
  onEdit?: (member: FamilyMember) => void;
  onDelete: (member: FamilyMember) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {onAddChild && !member.status.is_placeholder ? (
        <button
          type="button"
          className="inline-flex min-h-9 items-center rounded-md border border-[var(--gp-scroll-edge)] px-2.5 py-1.5 text-xs font-semibold text-[var(--gp-ink)] hover:bg-[var(--gp-paper)]"
          onClick={() => onAddChild(member)}
        >
          + Con
        </button>
      ) : null}
      <button
        type="button"
        className="inline-flex min-h-9 items-center rounded-md border border-[var(--gp-lacquer)]/30 px-2.5 py-1.5 text-xs font-semibold text-[var(--gp-lacquer)] hover:bg-[var(--gp-lacquer-soft)]"
        onClick={() => onEdit?.(member)}
      >
        Sửa
      </button>
      <button
        type="button"
        disabled={busy}
        className="inline-flex min-h-9 items-center rounded-md border border-[var(--gp-scroll-edge)] px-2.5 py-1.5 text-xs font-semibold text-[var(--gp-muted)] hover:bg-[var(--gp-paper)] disabled:opacity-50"
        onClick={() => onDelete(member)}
      >
        {busy ? "…" : "Xoá"}
      </button>
    </div>
  );
}

/** Mobile card — đủ thông tin */
function MemberCard({ row }: { row: MemberListRow }) {
  const m = row.member;
  return (
    <div className="flex items-start gap-3">
      <MemberAvatar
        name={m.status.is_placeholder ? "?" : m.full_name}
        photoUrl={m.photo_url}
        size="sm"
        deceased={!m.status.is_alive}
      />
      <div className="min-w-0">
        <p className="font-display text-base font-semibold text-[var(--gp-ink)]">
          {m.status.is_placeholder ? "? Khuyết danh" : m.full_name}
        </p>
        {row.aka ? (
          <p className="mt-0.5 text-xs text-[var(--gp-muted)]">{row.aka}</p>
        ) : null}
        <p className="mt-1 text-xs text-[var(--gp-muted)]">
          Đời {row.generation} · {row.branchName} ·{" "}
          {m.status.is_alive ? "Đang sống" : "Đã mất"}
          {m.gender === "MALE"
            ? " · Nam"
            : m.gender === "FEMALE"
              ? " · Nữ"
              : ""}
          {m.is_huong_hoa ? " · Hương hỏa" : ""}
        </p>
        {row.spousesLabel ? (
          <p className="mt-1 text-xs text-[var(--gp-muted-soft)]">
            Phối ngẫu: {row.spousesLabel}
          </p>
        ) : null}
        {(m.dates.birth || m.dates.death || m.dates.lunar_death) && (
          <p className="mt-1 text-xs text-[var(--gp-muted-soft)]">
            {m.dates.birth ? `Sinh: ${m.dates.birth}` : null}
            {m.dates.death
              ? `${m.dates.birth ? " · " : ""}Mất: ${m.dates.death}`
              : null}
            {m.dates.lunar_death
              ? `${m.dates.birth || m.dates.death ? " · " : ""}Giỗ âm: ${m.dates.lunar_death}`
              : null}
          </p>
        )}
        {m.biography ? (
          <p className="mt-1 line-clamp-2 text-xs text-[var(--gp-ink)]/75">
            {m.biography}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Desktop table — gọn, không lặp cột đời/chi */
function MemberTableCell({ row }: { row: MemberListRow }) {
  const m = row.member;
  return (
    <div className="flex items-start gap-3">
      <MemberAvatar
        name={m.status.is_placeholder ? "?" : m.full_name}
        photoUrl={m.photo_url}
        size="sm"
        deceased={!m.status.is_alive}
      />
      <div className="min-w-0">
        <p className="font-display font-semibold text-[var(--gp-ink)]">
          {m.status.is_placeholder ? "? Khuyết danh" : m.full_name}
          {m.is_huong_hoa ? (
            <span className="ml-1.5 text-[10px] font-semibold text-[var(--gp-lacquer)]">
              HH
            </span>
          ) : null}
        </p>
        {row.aka ? (
          <p className="mt-0.5 text-xs text-[var(--gp-muted)]">{row.aka}</p>
        ) : null}
        <p className="mt-0.5 text-xs text-[var(--gp-muted-soft)]">
          {m.status.is_alive ? "Đang sống" : "Đã mất"}
          {m.gender === "MALE"
            ? " · Nam"
            : m.gender === "FEMALE"
              ? " · Nữ"
              : ""}
        </p>
      </div>
    </div>
  );
}

export function MembersManager({
  familyId,
  tree: treeProp,
  onRefresh,
  onCreate,
  onAddChild,
  onEdit,
  hideHeaderActions = false,
  exportSlot,
}: MembersManagerProps) {
  const dash = useDashboardAccessOptional();
  const lockedKey = dash?.isBranchAdmin
    ? (dash.access.branchIds?.length
        ? dash.access.branchIds.join("|")
        : dash.access.branchId || "__empty__")
    : null;
  const lockedBranchIds = useMemo((): string[] | null => {
    if (lockedKey === null) return null;
    if (lockedKey === "__empty__") return [];
    return lockedKey.split("|");
  }, [lockedKey]);
  const hook = useFamilyTree(treeProp ? null : familyId);
  const tree = treeProp ?? hook.tree;
  const isLoading = treeProp ? false : hook.isLoading;
  const error = treeProp ? null : hook.error;
  const mutate = onRefresh ?? (() => void hook.mutate());
  const [busyId, setBusyId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [generation, setGeneration] = useState<number | "all">("all");
  const [branchId, setBranchId] = useState<string | "all">("all");
  const [life, setLife] = useState<"all" | "alive" | "deceased">("all");
  const [groupBy, setGroupBy] = useState<MemberListGroupBy>("list");
  const [includePlaceholders, setIncludePlaceholders] = useState(false);

  const scopedMembers = useMemo(() => {
    const all = tree?.members ?? [];
    if (lockedBranchIds === null) return all;
    if (lockedBranchIds.length === 0) return [];
    return all.filter((m) => lockedBranchIds.includes(m.tree_logic.branch_id));
  }, [tree?.members, lockedBranchIds]);

  const branches = useMemo(() => {
    const all = tree?.branches ?? [];
    if (lockedBranchIds === null) return all;
    return all.filter((b) => lockedBranchIds.includes(b.id));
  }, [tree?.branches, lockedBranchIds]);

  const generations = useMemo(
    () => listGenerations(scopedMembers),
    [scopedMembers],
  );

  const filters = useMemo(
    () => ({ query, generation, branchId, life, includePlaceholders }),
    [query, generation, branchId, life, includePlaceholders],
  );

  const filteredRows = useMemo(
    () => filterMemberList(scopedMembers, filters, branches),
    [scopedMembers, filters, branches],
  );

  const groups = useMemo(
    () => groupMemberRows(filteredRows, groupBy),
    [filteredRows, groupBy],
  );

  const filtersActive = hasActiveMemberFilters(filters);

  const clearFilters = () => {
    setQuery("");
    setGeneration("all");
    setBranchId("all");
    setLife("all");
    setIncludePlaceholders(false);
  };

  if (isLoading && !tree) {
    return <DashboardPanelSkeleton />;
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--gp-lacquer)]">
        {error.message}{" "}
        <button
          type="button"
          className="min-h-10 font-semibold underline"
          onClick={() => void mutate()}
        >
          Thử lại
        </button>
      </p>
    );
  }

  const handleDelete = async (member: FamilyMember) => {
    const label = member.status.is_placeholder
      ? "khuyết danh"
      : member.full_name;
    if (!window.confirm(`Xoá «${label}» khỏi cây?`)) return;
    setBusyId(member.id);
    try {
      await deleteMember(member.id);
      appToast.success("Đã xoá thành viên");
      mutate();
    } catch (err) {
      appToast.error(
        "Xoá thất bại",
        err instanceof Error ? err.message : "Không thể xoá.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h2 className="gp-title text-xl md:text-2xl">Danh sách thành viên</h2>
          <p className="gp-lede mt-1 text-sm">
            {filteredRows.length}/{scopedMembers.length} người · tìm nhanh, lọc
            đời / chi, nhóm theo nhu cầu.
          </p>
        </div>
        {!hideHeaderActions ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            {exportSlot}
            {onCreate ? (
              <button
                type="button"
                className="gp-btn gp-btn-primary w-full sm:w-auto"
                onClick={onCreate}
              >
                + Thêm thành viên
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="gp-panel space-y-3 p-4">
        <label className="gp-label block">
          Tìm kiếm
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="gp-input mt-1 font-normal"
            placeholder="Tên, húy, tự, thụy, chi, phối ngẫu…"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="gp-label">
            Đời thứ
            <select
              value={generation === "all" ? "all" : String(generation)}
              onChange={(e) =>
                setGeneration(
                  e.target.value === "all" ? "all" : Number(e.target.value),
                )
              }
              className="gp-input mt-1 font-normal"
            >
              <option value="all">Tất cả đời</option>
              {generations.map((g) => (
                <option key={g} value={g}>
                  Đời {g}
                </option>
              ))}
            </select>
          </label>
          <label className="gp-label">
            Chi / nhánh
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="gp-input mt-1 font-normal"
            >
              <option value="all">Tất cả chi</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="gp-label">
            Trạng thái
            <select
              value={life}
              onChange={(e) => setLife(e.target.value as typeof life)}
              className="gp-input mt-1 font-normal"
            >
              <option value="all">Tất cả</option>
              <option value="alive">Đang sống</option>
              <option value="deceased">Đã mất</option>
            </select>
          </label>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex min-h-10 items-center gap-2 text-sm text-[var(--gp-muted)]">
              <input
                type="checkbox"
                checked={includePlaceholders}
                onChange={(e) => setIncludePlaceholders(e.target.checked)}
              />
              Hiện ô khuyết danh
            </label>
            {filtersActive ? (
              <button
                type="button"
                className="text-left text-xs font-semibold text-[var(--gp-lacquer)] hover:underline"
                onClick={clearFilters}
              >
                Xoá bộ lọc
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-[var(--gp-scroll-edge)] pt-3">
          {GROUP_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setGroupBy(opt.id)}
              className={[
                "min-h-9 rounded-full px-3 text-xs font-semibold transition",
                groupBy === opt.id
                  ? "bg-[var(--gp-lacquer)] text-[var(--gp-seal-ink)]"
                  : "border border-[var(--gp-scroll-edge)] text-[var(--gp-ink)] hover:bg-[var(--gp-lacquer-soft)]",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.key} className="space-y-3">
          {groupBy !== "list" ? (
            <h3 className="font-display text-lg font-semibold text-[var(--gp-lacquer)]">
              {group.label}{" "}
              <span className="text-sm font-normal text-[var(--gp-muted)]">
                ({group.rows.length})
              </span>
            </h3>
          ) : null}

          <ul className="space-y-3 md:hidden">
            {group.rows.map((row) => (
              <li
                key={row.member.id}
                className="rounded-xl border border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)] p-3 shadow-[var(--gp-shadow-soft)]"
              >
                <MemberCard row={row} />
                <div className="mt-3">
                  <MemberActions
                    member={row.member}
                    busy={busyId === row.member.id}
                    onAddChild={onAddChild}
                    onEdit={onEdit}
                    onDelete={(member) => void handleDelete(member)}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="gp-table-wrap hidden md:block">
            <table className="gp-table">
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th>Đời</th>
                  <th>Chi</th>
                  <th>Phối ngẫu</th>
                  <th>Ngày tháng</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => {
                  const m = row.member;
                  return (
                    <tr
                      key={m.id}
                      onDoubleClick={() => onEdit?.(m)}
                      className="cursor-pointer align-top"
                    >
                      <td>
                        <MemberTableCell row={row} />
                      </td>
                      <td className="whitespace-nowrap font-semibold">
                        {row.generation}
                      </td>
                      <td>{row.branchName}</td>
                      <td className="max-w-[200px] text-xs text-[var(--gp-muted)]">
                        {row.spousesLabel ?? "—"}
                      </td>
                      <td className="text-xs text-[var(--gp-muted)]">
                        {m.dates.birth ? (
                          <span className="block">Sinh: {m.dates.birth}</span>
                        ) : null}
                        {m.dates.death || m.dates.lunar_death ? (
                          <span className="block">
                            {m.dates.death ? `Mất: ${m.dates.death}` : null}
                            {m.dates.lunar_death
                              ? `${m.dates.death ? " · " : ""}Âm: ${m.dates.lunar_death}`
                              : null}
                          </span>
                        ) : !m.dates.birth ? (
                          "—"
                        ) : null}
                      </td>
                      <td onDoubleClick={(e) => e.stopPropagation()}>
                        <MemberActions
                          member={m}
                          busy={busyId === m.id}
                          onAddChild={onAddChild}
                          onEdit={onEdit}
                          onDelete={(member) => void handleDelete(member)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {filteredRows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--gp-scroll-edge)] px-4 py-10 text-center text-sm text-[var(--gp-muted)]">
          {scopedMembers.length === 0
            ? "Chưa có thành viên — nhấn Thêm thành viên để bắt đầu."
            : "Không có thành viên khớp bộ lọc. Thử xoá tìm kiếm hoặc đổi đời/chi."}
          {filtersActive ? (
            <>
              {" "}
              <button
                type="button"
                className="font-semibold text-[var(--gp-lacquer)] underline"
                onClick={clearFilters}
              >
                Xoá bộ lọc
              </button>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
