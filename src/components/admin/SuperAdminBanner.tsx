"use client";

type SuperAdminBannerProps = {
  familyName?: string | null;
};

/** Banner đỏ — hiện khi Super Admin đang thao tác trên dòng họ / nền tảng */
export function SuperAdminBanner({ familyName }: SuperAdminBannerProps) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 bg-[#b91c1c] px-4 py-2 text-sm font-semibold text-white"
    >
      <span className="tracking-wide">Super Admin Mode</span>
      {familyName ? (
        <span className="font-normal opacity-90">
          Đang quản lý: <strong>{familyName}</strong>
        </span>
      ) : (
        <span className="font-normal opacity-90">Toàn bộ dòng họ trên nền tảng</span>
      )}
    </div>
  );
}
