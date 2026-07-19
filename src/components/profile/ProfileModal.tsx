"use client";

import { useEffect, useMemo, useState } from "react";
import type { FamilyMember, MemberContact, SpouseInfo } from "@/types/genealogy";
import { memberGeneration } from "@/types/genealogy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { computeAnniversary, toLunarDeathDate } from "@/lib/lunar/death-date";
import { getMemberContact } from "@/services/memberService";

type ProfileModalProps = {
  member: FamilyMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function spouseRoleLabel(role?: SpouseInfo["role"]) {
  if (role === "DAU") return "Con dâu";
  if (role === "RE") return "Con rể";
  return "Phối ngẫu";
}

export function ProfileModal({ member, open, onOpenChange }: ProfileModalProps) {
  const [solarInput, setSolarInput] = useState("");
  const [contact, setContact] = useState<MemberContact | null>(null);

  useEffect(() => {
    if (!open || !member) {
      setContact(null);
      return;
    }
    let cancelled = false;
    getMemberContact(member.id)
      .then((c) => {
        if (!cancelled) setContact(c);
      })
      .catch(() => {
        if (!cancelled) setContact(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, member]);

  const storedLunar = useMemo(() => {
    if (!member) return null;
    if (member.dates.lunar_death && !member.dates.death) {
      return {
        display: `Âm lịch ${member.dates.lunar_death}`,
        iso_like: member.dates.lunar_death,
      };
    }
    return toLunarDeathDate(member.dates.death);
  }, [member]);

  const computed = useMemo(() => {
    if (!solarInput) return null;
    return computeAnniversary(solarInput);
  }, [solarInput]);

  if (!member) return null;

  const hasContact =
    contact &&
    (contact.phone || contact.address || contact.email || contact.notes);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member.full_name || "Khuyết danh"}</DialogTitle>
          <DialogDescription>
            Đời thứ {memberGeneration(member)}
            {member.is_huong_hoa ? " · Hương hỏa" : ""}
            {" · "}
            {member.status.is_alive ? "Đang sống" : "Đã mất"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7a1f1f]">
              Các loại tên
            </h3>
            <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-[#6a6258]">Tên húy</dt>
              <dd className="font-medium">
                {member.traditional_names.birth || "—"}
              </dd>
              <dt className="text-[#6a6258]">Tên thụy</dt>
              <dd className="font-medium">
                {member.traditional_names.posthumous || "—"}
              </dd>
              <dt className="text-[#6a6258]">Tên tự</dt>
              <dd className="font-medium">
                {member.traditional_names.courtesy || "—"}
              </dd>
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

          {hasContact ? (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7a1f1f]">
                Liên hệ / địa chỉ
              </h3>
              <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5">
                {contact.address ? (
                  <>
                    <dt className="text-[#6a6258]">Địa chỉ</dt>
                    <dd className="font-medium">{contact.address}</dd>
                  </>
                ) : null}
                {contact.phone ? (
                  <>
                    <dt className="text-[#6a6258]">Điện thoại</dt>
                    <dd className="font-medium">{contact.phone}</dd>
                  </>
                ) : null}
                {contact.email ? (
                  <>
                    <dt className="text-[#6a6258]">Email</dt>
                    <dd className="font-medium">{contact.email}</dd>
                  </>
                ) : null}
                {contact.notes ? (
                  <>
                    <dt className="text-[#6a6258]">Ghi chú</dt>
                    <dd className="font-medium">{contact.notes}</dd>
                  </>
                ) : null}
              </dl>
            </section>
          ) : null}

          <section className="rounded-lg border border-[#8a6a3a]/30 bg-[#f7f1e8]/60 p-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7a1f1f]">
              Lịch giỗ
            </h3>
            {member.dates.death || storedLunar ? (
              <ul className="mb-3 space-y-1 text-[#3d372f]">
                {member.dates.death ? (
                  <li>
                    <span className="text-[#6a6258]">Dương lịch: </span>
                    {member.dates.death}
                  </li>
                ) : null}
                {storedLunar ? (
                  <li>
                    <span className="text-[#6a6258]">Âm lịch: </span>
                    {storedLunar.display}
                    {member.dates.lunar_death ? (
                      <span className="text-[#6a6258]">
                        {" "}
                        ({member.dates.lunar_death})
                      </span>
                    ) : null}
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="mb-3 text-[#6a6258]">
                Chưa có ngày mất — dùng form bên dưới để tính.
              </p>
            )}

            <label
              htmlFor="gio-solar"
              className="mb-1 block text-xs font-semibold text-[#3d372f]"
            >
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
                <span className="font-semibold text-[#7a1f1f]">
                  lunar_death:{" "}
                </span>
                {computed.lunar_death_date}
                <br />
                <span className="text-[#5c564e]">{computed.lunar_display}</span>
              </p>
            ) : null}
          </section>

          {member.spouses.length > 0 ? (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#7a1f1f]">
                Hôn nhân · Dâu / rể ({member.spouses.length})
              </h3>
              <p className="mb-2 text-xs text-[#5c564e]">
                Người khác họ lấy vào dòng tộc — hiện cạnh thẻ trên cây với cạnh
                «Cưới» / «Mẹ → con».
              </p>
              <ul className="space-y-3">
                {member.spouses.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-md border border-[#8a6a3a]/20 bg-white/70 px-3 py-2"
                  >
                    <p className="font-medium text-[#1c1410]">
                      <span className="mr-2 text-xs font-bold uppercase tracking-wide text-[#7a1f1f]">
                        {spouseRoleLabel(s.role)}
                      </span>
                      {s.full_name}
                      <span className="ml-2 text-[#6a6258] font-normal">
                        ({s.is_alive === false ? "đã mất" : "đang sống"})
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-[#5c564e]">
                      {s.role === "DAU"
                        ? `Vợ của ${member.full_name}`
                        : s.role === "RE"
                          ? `Chồng của ${member.full_name}`
                          : `Phối ngẫu của ${member.full_name}`}
                    </p>
                    <dl className="mt-1.5 grid grid-cols-[5rem_1fr] gap-x-2 gap-y-0.5 text-xs text-[#3d372f]">
                      {s.maiden_name ? (
                        <>
                          <dt className="text-[#6a6258]">Họ gốc</dt>
                          <dd>{s.maiden_name}</dd>
                        </>
                      ) : null}
                      {s.birth ? (
                        <>
                          <dt className="text-[#6a6258]">Sinh</dt>
                          <dd>{s.birth}</dd>
                        </>
                      ) : null}
                      {s.death ? (
                        <>
                          <dt className="text-[#6a6258]">Mất</dt>
                          <dd>{s.death}</dd>
                        </>
                      ) : null}
                      {s.hometown ? (
                        <>
                          <dt className="text-[#6a6258]">Quê quán</dt>
                          <dd>{s.hometown}</dd>
                        </>
                      ) : null}
                      {s.notes ? (
                        <>
                          <dt className="text-[#6a6258]">Ghi chú</dt>
                          <dd>{s.notes}</dd>
                        </>
                      ) : null}
                    </dl>
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
