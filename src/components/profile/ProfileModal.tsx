"use client";

import { useMemo, useState } from "react";
import type { FamilyMember } from "@/types/genealogy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { computeAnniversary, toLunarDeathDate } from "@/lib/lunar/death-date";

type ProfileModalProps = {
  member: FamilyMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProfileModal({ member, open, onOpenChange }: ProfileModalProps) {
  const [solarInput, setSolarInput] = useState("");

  const storedLunar = useMemo(() => {
    if (!member) return null;
    if (member.lunar_death_date && !member.death_date) {
      return { display: `Âm lịch ${member.lunar_death_date}`, iso_like: member.lunar_death_date };
    }
    return toLunarDeathDate(member.death_date);
  }, [member]);

  const computed = useMemo(() => {
    if (!solarInput) return null;
    return computeAnniversary(solarInput);
  }, [solarInput]);

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member.full_name || "Khuyết danh"}</DialogTitle>
          <DialogDescription>
            Đời thứ {member.generation}
            {member.is_huong_hoa ? " · Hương hỏa" : ""}
            {" · "}
            {member.life_status === "LIVING" ? "Đang sống" : "Đã mất"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7a1f1f]">
              Các loại tên
            </h3>
            <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-[#6a6258]">Tên húy</dt>
              <dd className="font-medium">{member.names?.huy || "—"}</dd>
              <dt className="text-[#6a6258]">Tên thụy</dt>
              <dd className="font-medium">{member.names?.thuy || "—"}</dd>
              <dt className="text-[#6a6258]">Tên tự</dt>
              <dd className="font-medium">{member.names?.tu || "—"}</dd>
              <dt className="text-[#6a6258]">Họ tên</dt>
              <dd className="font-medium">{member.full_name || "—"}</dd>
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7a1f1f]">
              Tiểu sử
            </h3>
            <p className="leading-relaxed text-[#3d372f]">
              {member.biography || member.notes || "Chưa có tiểu sử."}
            </p>
          </section>

          <section className="rounded-lg border border-[#8a6a3a]/30 bg-[#f7f1e8]/60 p-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7a1f1f]">
              Lịch giỗ
            </h3>
            {member.death_date || storedLunar ? (
              <ul className="mb-3 space-y-1 text-[#3d372f]">
                {member.death_date ? (
                  <li>
                    <span className="text-[#6a6258]">Dương lịch: </span>
                    {member.death_date}
                  </li>
                ) : null}
                {storedLunar ? (
                  <li>
                    <span className="text-[#6a6258]">Âm lịch: </span>
                    {storedLunar.display}
                    {member.lunar_death_date ? (
                      <span className="text-[#6a6258]"> ({member.lunar_death_date})</span>
                    ) : null}
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="mb-3 text-[#6a6258]">Chưa có ngày mất — dùng form bên dưới để tính.</p>
            )}

            <label htmlFor="gio-solar" className="mb-1 block text-xs font-semibold text-[#3d372f]">
              Tính ngày giỗ từ dương lịch
            </label>
            <input
              id="gio-solar"
              type="date"
              value={solarInput}
              onChange={(e) => setSolarInput(e.target.value)}
              className="w-full rounded-md border border-[#8a6a3a]/40 bg-white px-3 py-2 text-sm"
            />
            {computed?.lunar_display ? (
              <p className="mt-2 rounded-md bg-[#7a1f1f]/08 px-3 py-2 text-[#1c1410]">
                <span className="font-semibold text-[#7a1f1f]">lunar_death_date: </span>
                {computed.lunar_death_date}
                <br />
                <span className="text-[#5c564e]">{computed.lunar_display}</span>
              </p>
            ) : null}
          </section>

          {member.spouses.length > 0 ? (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7a1f1f]">
                Phối ngẫu
              </h3>
              <ul className="space-y-1">
                {member.spouses.map((s) => (
                  <li key={s.id}>
                    {s.full_name}{" "}
                    <span className="text-[#6a6258]">
                      ({s.life_status === "LIVING" ? "đang sống" : "đã mất"})
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
