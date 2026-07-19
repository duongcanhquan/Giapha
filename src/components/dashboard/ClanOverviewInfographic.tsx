"use client";

import { useMemo } from "react";
import type { FamilyTreeData } from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";

type ClanOverviewInfographicProps = {
  tree: FamilyTreeData;
  onFocusMember?: (memberId: string) => void;
  onFilterBranch?: (branchId: string | null) => void;
};

export function ClanOverviewInfographic({
  tree,
  onFocusMember,
  onFilterBranch,
}: ClanOverviewInfographicProps) {
  const stats = useMemo(() => {
    const named = tree.members.filter((m) => !m.status.is_placeholder);
    const living = named.filter((m) => m.status.is_alive);
    const deceased = named.filter((m) => !m.status.is_alive);
    const placeholders = tree.members.filter((m) => m.status.is_placeholder);
    const daughtersInLaw = named.reduce(
      (n, m) =>
        n + m.spouses.filter((s) => s.role === "DAU" || !s.role).length,
      0,
    );
    const sonsInLaw = named.reduce(
      (n, m) => n + m.spouses.filter((s) => s.role === "RE").length,
      0,
    );

    let maxGen = 1;
    for (const m of named) {
      maxGen = Math.max(maxGen, memberGeneration(m));
    }

    const byBranch = new Map<string, number>();
    for (const m of named) {
      const id = m.tree_logic.branch_id;
      byBranch.set(id, (byBranch.get(id) ?? 0) + 1);
    }

    const huongHoa = named
      .filter((m) => m.is_huong_hoa)
      .sort((a, b) => memberGeneration(a) - memberGeneration(b));

    const founder = named.find((m) => !m.tree_logic.parent_id) ?? huongHoa[0];
    const latestHh = huongHoa[huongHoa.length - 1];

    return {
      total: tree.members.length,
      named: named.length,
      living: living.length,
      deceased: deceased.length,
      placeholders: placeholders.length,
      daughtersInLaw,
      sonsInLaw,
      maxGen,
      byBranch,
      huongHoa,
      founder,
      latestHh,
      branchCount: tree.branches?.length ?? byBranch.size,
    };
  }, [tree]);

  const branchRows = (
    tree.branches?.length
      ? tree.branches
      : [...stats.byBranch.keys()].map((id) => ({
          id,
          name: id,
          description: "",
        }))
  ).map((b) => ({
    ...b,
    count: stats.byBranch.get(b.id) ?? 0,
  }));

  return (
    <section
      className="clan-infographic gp-panel"
      aria-label="Infographic tổng quan dòng họ"
    >
      <div className="clan-infographic__head">
        <p className="gp-eyebrow">Infographic · sau đăng nhập</p>
        <h2 className="gp-title mt-1 text-xl md:text-2xl">
          Tổng quan dòng họ {tree.clan_name}
        </h2>
        <p className="gp-lede mt-1 max-w-2xl text-sm">
          Số liệu ổn định — bấm chi để lọc cây, bấm hương hỏa để zoom đúng
          đường huyết thống (không mất khung khi rê chuột).
        </p>
      </div>

      <div className="clan-infographic__stats">
        <StatCard
          label="Thành viên trên cây"
          value={stats.total}
          hint={`${stats.named} có tên`}
        />
        <StatCard
          label="Đang sống"
          value={stats.living}
          hint={`${stats.deceased} đã mất`}
          accent="living"
        />
        <StatCard
          label="Số đời"
          value={stats.maxGen}
          hint={`${stats.branchCount} chi nhánh`}
        />
        <StatCard
          label="Dâu / rể"
          value={stats.daughtersInLaw + stats.sonsInLaw}
          hint={`${stats.daughtersInLaw} dâu · ${stats.sonsInLaw} rể`}
        />
      </div>

      <div className="clan-infographic__body">
        <div>
          <h3 className="clan-infographic__section-title">Phân bố theo chi</h3>
          <ul className="space-y-2">
            {branchRows.map((b) => {
              const pct =
                stats.named > 0 ? Math.round((b.count / stats.named) * 100) : 0;
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    className="clan-infographic__row"
                    onClick={() => onFilterBranch?.(b.id)}
                    title={`Lọc cây theo ${b.name}`}
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-semibold text-[var(--gp-ink)]">
                        {b.name}
                      </span>
                      <span className="text-xs font-bold text-[var(--gp-muted)]">
                        {b.count} · {pct}%
                      </span>
                    </div>
                    <div className="clan-infographic__bar">
                      <div
                        className="clan-infographic__bar-fill"
                        style={{
                          width: `${Math.max(pct, b.count ? 4 : 0)}%`,
                        }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                className="mt-1 text-xs font-semibold text-[var(--gp-lacquer)] underline-offset-2 hover:underline"
                onClick={() => onFilterBranch?.(null)}
              >
                Hiện mọi chi trên cây
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="clan-infographic__section-title">Chuỗi hương hỏa</h3>
          {stats.founder ? (
            <p className="mb-3 text-sm text-[var(--gp-ink-soft)]">
              Thủy tổ{" "}
              <button
                type="button"
                className="font-semibold text-[var(--gp-lacquer)] underline-offset-2 hover:underline"
                onClick={() => onFocusMember?.(stats.founder!.id)}
              >
                {stats.founder.full_name || "Khuyết danh"}
              </button>
              {stats.latestHh && stats.latestHh.id !== stats.founder.id ? (
                <>
                  {" "}
                  → đương kim{" "}
                  <button
                    type="button"
                    className="font-semibold text-[var(--gp-lacquer)] underline-offset-2 hover:underline"
                    onClick={() => onFocusMember?.(stats.latestHh!.id)}
                  >
                    {stats.latestHh.full_name}
                  </button>
                </>
              ) : null}
            </p>
          ) : null}
          <ol className="max-h-48 space-y-1 overflow-auto pr-1 text-sm">
            {stats.huongHoa.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="clan-infographic__row flex items-center gap-2"
                  onClick={() => onFocusMember?.(m.id)}
                >
                  <span className="w-12 shrink-0 text-xs font-bold text-[var(--gp-muted)]">
                    Đời {memberGeneration(m)}
                  </span>
                  <span className="font-medium text-[var(--gp-ink)]">
                    {m.full_name || "Khuyết danh"}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {stats.placeholders > 0 ? (
            <p className="mt-3 text-xs text-[var(--gp-muted)]">
              Có {stats.placeholders} chỗ khuyết danh trên cây.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent?: "living";
}) {
  return (
    <div className="clan-infographic__card">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--gp-muted)]">
        {label}
      </p>
      <p
        className={[
          "gp-title mt-1 text-3xl tabular-nums",
          accent === "living"
            ? "text-[var(--gp-living,#2d6b48)]"
            : "text-[var(--gp-lacquer)]",
        ].join(" ")}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-[var(--gp-muted)]">{hint}</p>
    </div>
  );
}
