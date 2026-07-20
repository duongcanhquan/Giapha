"use client";

import { useMemo, useState } from "react";
import { MemberAvatar } from "@/components/ui/MemberAvatar";
import { useDashboardAccessOptional } from "@/components/dashboard/DashboardAccessContext";
import { DashboardPanelSkeleton } from "@/components/ui/skeleton";
import { useFamilyTree } from "@/hooks/useFamilyTree";
import {
  filterMemberList,
  groupMemberRows,
  listGenerations,
} from "@/lib/search/filter-members";
import type { FamilyBranch } from "@/types/genealogy";

type GenealogyBookProps = {
  familyId: string;
};

function branchName(
  branchId: string,
  branches: FamilyBranch[] | undefined,
): string {
  return branches?.find((b) => b.id === branchId)?.name ?? branchId;
}

export function GenealogyBook({ familyId }: GenealogyBookProps) {
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

  const { tree, isLoading, error, mutate } = useFamilyTree(familyId);
  const [branchId, setBranchId] = useState<string | "all">("all");
  const [query, setQuery] = useState("");

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

  const rows = useMemo(
    () =>
      filterMemberList(
        scopedMembers,
        {
          query,
          generation: "all",
          branchId,
          life: "all",
          includePlaceholders: false,
        },
        branches,
      ),
    [scopedMembers, query, branchId, branches],
  );

  const chapters = useMemo(
    () => groupMemberRows(rows, "generation"),
    [rows],
  );

  const generations = useMemo(
    () => listGenerations(rows.map((r) => r.member)),
    [rows],
  );

  if (isLoading && !tree) return <DashboardPanelSkeleton />;

  if (error) {
    return (
      <p className="text-sm text-[var(--gp-lacquer)]">
        {error.message}{" "}
        <button type="button" className="underline" onClick={() => void mutate()}>
          Thử lại
        </button>
      </p>
    );
  }

  const clanName = tree?.clan_name || "Gia phả";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="gp-title text-2xl md:text-3xl">Sách gia phả</h1>
          <p className="gp-lede mt-1 text-sm">
            {clanName} · theo đời thứ, đủ húy / tự / thụy, phối ngẫu và tiểu sử.
          </p>
        </div>
        <button
          type="button"
          className="gp-btn gp-btn-primary"
          onClick={() => window.print()}
        >
          In / lưu PDF
        </button>
      </div>

      <div className="gp-panel grid gap-3 p-4 print:hidden sm:grid-cols-3">
        <label className="gp-label sm:col-span-2">
          Tìm trong sách
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="gp-input mt-1 font-normal"
            placeholder="Tên thành viên…"
          />
        </label>
        <label className="gp-label">
          Chi
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
      </div>

      <article className="gp-book-print mx-auto max-w-3xl rounded-[var(--gp-radius-lg)] border border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)] px-5 py-8 shadow-[var(--gp-shadow-soft)] md:px-10">
        <header className="border-b border-[var(--gp-lacquer)]/30 pb-6 text-center">
          <p className="gp-eyebrow">Gia phả hương hỏa</p>
          <h2 className="font-display mt-2 text-3xl font-semibold text-[var(--gp-lacquer)]">
            {clanName}
          </h2>
          <p className="mt-2 text-sm text-[var(--gp-muted)]">
            {rows.length} thành viên · {generations.length} đời
            {branchId !== "all"
              ? ` · ${branchName(branchId, branches)}`
              : ""}
          </p>
        </header>

        {chapters.map((chapter) => (
          <section key={chapter.key} className="mt-8 break-inside-avoid">
            <h3 className="font-display border-b border-[var(--gp-gold)]/40 pb-2 text-xl font-semibold text-[var(--gp-ink)]">
              {chapter.label}
              <span className="ml-2 text-sm font-normal text-[var(--gp-muted)]">
                ({chapter.rows.length})
              </span>
            </h3>
            <ol className="mt-4 space-y-5">
              {chapter.rows.map((row, index) => {
                const m = row.member;
                return (
                  <li
                    key={m.id}
                    className="flex gap-3 border-b border-[var(--gp-scroll-edge)]/70 pb-4 last:border-0"
                  >
                    <span className="mt-1 w-6 shrink-0 text-sm font-semibold text-[var(--gp-muted)]">
                      {index + 1}.
                    </span>
                    <MemberAvatar
                      name={m.full_name}
                      photoUrl={m.photo_url}
                      size="md"
                      deceased={!m.status.is_alive}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-semibold">
                        {m.full_name}
                        {m.is_huong_hoa ? (
                          <span className="ml-2 text-xs font-semibold text-[var(--gp-lacquer)]">
                            Hương hỏa
                          </span>
                        ) : null}
                      </p>
                      {row.aka ? (
                        <p className="text-sm text-[var(--gp-muted)]">{row.aka}</p>
                      ) : null}
                      <p className="mt-1 text-sm text-[var(--gp-muted)]">
                        Chi {row.branchName}
                        {m.gender === "MALE"
                          ? " · Nam"
                          : m.gender === "FEMALE"
                            ? " · Nữ"
                            : ""}
                        {" · "}
                        {m.status.is_alive ? "Đang sống" : "Đã mất"}
                      </p>
                      {(m.dates.birth ||
                        m.dates.death ||
                        m.dates.lunar_death) && (
                        <p className="mt-1 text-sm text-[var(--gp-muted-soft)]">
                          {m.dates.birth ? `Sinh ${m.dates.birth}` : null}
                          {m.dates.death
                            ? `${m.dates.birth ? " · " : ""}Mất ${m.dates.death}`
                            : null}
                          {m.dates.lunar_death
                            ? `${m.dates.birth || m.dates.death ? " · " : ""}Giỗ âm ${m.dates.lunar_death}`
                            : null}
                        </p>
                      )}
                      {row.spousesLabel ? (
                        <p className="mt-1 text-sm">
                          <span className="text-[var(--gp-muted)]">Phối ngẫu: </span>
                          {row.spousesLabel}
                        </p>
                      ) : null}
                      {m.biography ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--gp-ink)]/85">
                          {m.biography}
                        </p>
                      ) : null}
                      {m.notes ? (
                        <p className="mt-1 text-xs italic text-[var(--gp-muted)]">
                          Ghi chú: {m.notes}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}

        {chapters.length === 0 ? (
          <p className="mt-8 text-center text-sm text-[var(--gp-muted)]">
            Chưa có dữ liệu để lập sách — thêm thành viên hoặc nới bộ lọc.
          </p>
        ) : null}
      </article>
    </div>
  );
}
