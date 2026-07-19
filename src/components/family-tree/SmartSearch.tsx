"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { GitBranch, Search, Users } from "lucide-react";
import type { FamilyBranch, FamilyMember } from "@/types/genealogy";
import { searchMembers, type MemberSearchHit } from "@/lib/search/member-search";

type SmartSearchProps = {
  members: FamilyMember[];
  branches?: FamilyBranch[];
  onSelect: (memberId: string) => void;
};

export function SmartSearch({ members, branches, onSelect }: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const hits = useMemo(
    () => searchMembers(members, query, 14, branches),
    [members, query, branches],
  );

  const selectAt = (index: number) => {
    const hit = hits[index];
    if (!hit) return;
    onSelect(hit.member.id);
    setQuery(hit.member.full_name);
    setOpen(false);
    setActive(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || !query.trim()) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectAt(active);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="ft-smart-search">
      <label className="ft-smart-search__field">
        <Search size={16} className="ft-smart-search__icon" aria-hidden />
        <input
          type="search"
          value={query}
          placeholder="Tìm tên, húy, thụy, dâu/rể, nhánh…"
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
          aria-label="Tra cứu thành viên trên cây"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && query.trim().length > 0}
          aria-controls="ft-smart-search-list"
        />
        <span className="ft-smart-search__hint">↵ mở nhánh</span>
      </label>
      {open && query.trim() && hits.length > 0 ? (
        <ul
          id="ft-smart-search-list"
          className="ft-smart-search__list"
          role="listbox"
        >
          {hits.map((hit, index) => (
            <SearchHitRow
              key={hit.member.id}
              hit={hit}
              active={index === active}
              onHover={() => setActive(index)}
              onPick={() => selectAt(index)}
            />
          ))}
        </ul>
      ) : null}
      {open && query.trim() && hits.length === 0 ? (
        <p className="ft-smart-search__empty">
          Không thấy khớp — thử bỏ dấu, tên húy, hoặc tên dâu/rể
        </p>
      ) : null}
    </div>
  );
}

function SearchHitRow({
  hit,
  active,
  onHover,
  onPick,
}: {
  hit: MemberSearchHit;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  const { member, generation, branchName, lineage, aka, childCount } = hit;
  const status = member.status.is_alive ? "đang sống" : "đã mất";

  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        data-active={active}
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={onHover}
        onClick={onPick}
      >
        <span className="ft-smart-search__name">{member.full_name}</span>
        <span className="ft-smart-search__meta">Đời {generation}</span>
        <span className="ft-smart-search__context">
          <span className="ft-smart-search__chip">
            <GitBranch size={11} aria-hidden />
            {branchName}
          </span>
          <span className="ft-smart-search__chip ft-smart-search__chip--muted">
            {status}
          </span>
          {childCount > 0 ? (
            <span className="ft-smart-search__chip ft-smart-search__chip--muted">
              <Users size={11} aria-hidden />
              {childCount} con
            </span>
          ) : null}
        </span>
        {lineage ? (
          <span className="ft-smart-search__lineage">{lineage}</span>
        ) : null}
        {aka ? <span className="ft-smart-search__aka">{aka}</span> : null}
      </button>
    </li>
  );
}
