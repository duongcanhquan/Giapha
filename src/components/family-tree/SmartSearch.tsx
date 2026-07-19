"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import type { FamilyMember } from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";
import { searchMembers } from "@/lib/search/member-search";

type SmartSearchProps = {
  members: FamilyMember[];
  onSelect: (memberId: string) => void;
};

function akaLine(member: FamilyMember): string | null {
  const parts = [
    member.traditional_names.birth
      ? `húy ${member.traditional_names.birth}`
      : null,
    member.traditional_names.courtesy
      ? `tự ${member.traditional_names.courtesy}`
      : null,
    member.traditional_names.posthumous
      ? `thụy ${member.traditional_names.posthumous}`
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function SmartSearch({ members, onSelect }: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const hits = useMemo(
    () =>
      searchMembers(
        members.filter((m) => !m.status.is_placeholder),
        query,
        8,
      ),
    [members, query],
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
          placeholder="Tra cứu tên, tên húy, thụy…"
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
        <span className="ft-smart-search__hint">↵ zoom</span>
      </label>
      {open && query.trim() && hits.length > 0 ? (
        <ul id="ft-smart-search-list" className="ft-smart-search__list" role="listbox">
          {hits.map(({ member }, index) => {
            const aka = akaLine(member);
            return (
              <li key={member.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  data-active={index === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => selectAt(index)}
                >
                  <span className="ft-smart-search__name">{member.full_name}</span>
                  <span className="ft-smart-search__meta">
                    Đời {memberGeneration(member)}
                  </span>
                  {aka ? <span className="ft-smart-search__aka">{aka}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {open && query.trim() && hits.length === 0 ? (
        <p className="ft-smart-search__empty">
          Không thấy khớp — thử bỏ dấu hoặc tên húy
        </p>
      ) : null}
    </div>
  );
}
