"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { subscribeAuth, signOutUser } from "@/services/authService";
import { listOwnedFamilies } from "@/services/familyService";
import { getMyRegistrations } from "@/services/registrationService";
import type { FamilyRegistration } from "@/types/genealogy";

export function PendingApprovalPanel() {
  const router = useRouter();
  const [regs, setRegs] = useState<FamilyRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const unsub = subscribeAuth((user) => {
      void (async () => {
        if (!user) {
          router.replace("/login");
          return;
        }

        const owned = await listOwnedFamilies(user.uid);
        if (!cancelled && owned.length > 0) {
          router.replace(`/dashboard/${encodeURIComponent(owned[0].id)}`);
          return;
        }

        const list = await getMyRegistrations(user.uid);
        if (cancelled) return;

        const approved = list.find((r) => r.status === "approved" && r.family_id);
        if (approved?.family_id) {
          router.replace(`/dashboard/${encodeURIComponent(approved.family_id)}`);
          return;
        }

        setRegs(list);
        setLoading(false);
      })();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [router]);

  if (loading) {
    return (
      <p className="text-center text-sm text-[var(--gp-muted)]">
        Đang tải hồ sơ đăng ký…
      </p>
    );
  }

  const latest = regs[0];

  return (
    <div className="gp-panel mx-auto w-full max-w-lg space-y-4 p-7">
      <div>
        <p className="gp-eyebrow">Onboarding</p>
        <h1 className="gp-title mt-2 text-2xl">Chờ Super Admin duyệt</h1>
        <p className="gp-lede mt-1 text-sm">
          Gia phả chỉ được tạo sau khi Super Admin phê duyệt hồ sơ người tạo.
          Bạn sẽ là Admin dòng họ và có quyền chỉ định trưởng họ, trưởng chi,
          người cập nhật.
        </p>
      </div>

      {!latest ? (
        <div className="space-y-3 text-sm text-[var(--gp-muted)]">
          <p>Chưa có hồ sơ đăng ký tạo gia phả.</p>
          <Link href="/register" className="gp-btn gp-btn-primary inline-flex">
            Đăng ký tạo gia phả
          </Link>
        </div>
      ) : (
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-[var(--gp-scroll-edge)] py-2">
            <dt className="text-[var(--gp-muted)]">Trạng thái</dt>
            <dd className="font-semibold text-[var(--gp-lacquer)]">
              {latest.status === "pending"
                ? "Đang chờ duyệt"
                : latest.status === "rejected"
                  ? "Đã từ chối"
                  : "Đã duyệt"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--gp-scroll-edge)] py-2">
            <dt className="text-[var(--gp-muted)]">Người tạo</dt>
            <dd className="font-medium">{latest.full_name}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--gp-scroll-edge)] py-2">
            <dt className="text-[var(--gp-muted)]">Họ dòng họ</dt>
            <dd className="font-medium">{latest.family_surname}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--gp-scroll-edge)] py-2">
            <dt className="text-[var(--gp-muted)]">Tên gia phả</dt>
            <dd className="font-medium">{latest.family_name}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--gp-scroll-edge)] py-2">
            <dt className="text-[var(--gp-muted)]">Điện thoại</dt>
            <dd className="font-medium">{latest.phone}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--gp-scroll-edge)] py-2">
            <dt className="text-[var(--gp-muted)]">Email</dt>
            <dd className="font-medium">{latest.email}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-[var(--gp-muted)]">Địa chỉ</dt>
            <dd className="max-w-[60%] text-right font-medium">{latest.address}</dd>
          </div>
          {latest.status === "rejected" && latest.reject_reason ? (
            <p className="rounded-[var(--gp-radius)] bg-[var(--gp-lacquer-soft)] px-3 py-2 text-[var(--gp-lacquer)]">
              Lý do từ chối: {latest.reject_reason}
            </p>
          ) : null}
          {latest.duplicate_hints && latest.duplicate_hints.length > 0 ? (
            <ul className="rounded-[var(--gp-radius)] border border-[var(--gp-gold)]/35 bg-[var(--gp-gold)]/10 px-3 py-2 text-xs">
              {latest.duplicate_hints.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          ) : null}
        </dl>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          className="gp-btn gp-btn-primary"
          onClick={() => window.location.reload()}
        >
          Làm mới trạng thái
        </button>
        <button
          type="button"
          className="gp-btn border border-[var(--gp-scroll-edge)]"
          onClick={() => void signOutUser().then(() => router.replace("/login"))}
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
