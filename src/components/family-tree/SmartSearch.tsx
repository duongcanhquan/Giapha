"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { FamilyMember } from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";
import { searchMembers } from "@/lib/search/member-search";

type SmartSearchProps = {
  members: FamilyMember[];
  onSelect: (memberId: string) => void;
};

export function SmartSearch({ members, onSelect }: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const hits = useMemo(
    () => searchMembers(members.filter((m) => !m.status.is_placeholder), query, 8),
    [members, query],
  );

  return (
    <div className="ft-smart-search">
      <label className="ft-smart-search__field">
        <Search size={15} aria-hidden />
        <input
          type="search"
          value={query}
          placeholder='Tìm "Nguyen van A"…'
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          aria-label="Tìm kiếm thành viên"
        />
      </label>
      {open && query.trim() && hits.length > 0 ? (
        <ul className="ft-smart-search__list" role="listbox">
          {hits.map(({ member }) => (
            <li key={member.id}>
                <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(member.id);
                  setQuery(member.full_name);
                  setOpen(false);
                }}
              >
                <span>{member.full_name}</span>
                <span className="ft-smart-search__meta">
                  Đời {memberGeneration(member)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && query.trim() && hits.length === 0 ? (
        <p className="ft-smart-search__empty">Không tìm thấy</p>
      ) : null}
    </div>
  );
}
