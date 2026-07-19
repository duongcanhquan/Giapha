"use client";

type SuperAdminBannerProps = {
  familyName?: string | null;
};

/** Ấn son — hiện khi Super Admin đang thao tác */
export function SuperAdminBanner({ familyName }: SuperAdminBannerProps) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--gp-gold)]/35 bg-[var(--gp-seal)] px-4 py-2.5 text-sm font-semibold text-[var(--gp-seal-ink)]"
    >
      <span className="inline-flex items-center gap-2 tracking-[0.12em] uppercase">
        <span className="inline-block h-2 w-2 rounded-full bg-[var(--gp-gold-bright)] shadow-[0_0_0_3px_rgba(212,175,55,0.35)]" />
        Super Admin Mode
      </span>
      {familyName ? (
        <span className="font-normal opacity-95">
          Đang quản lý: <strong className="font-display">{familyName}</strong>
        </span>
      ) : (
        <span className="font-normal opacity-90">Toàn bộ dòng họ trên nền tảng</span>
      )}
    </div>
  );
}
