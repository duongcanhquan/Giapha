"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardErrorBoundary({ error, reset }: ErrorPageProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h1 className="text-lg font-semibold text-[#7a1f1f]">Lỗi khu vực quản trị</h1>
      <p className="mt-2 text-sm text-stone-700">{error.message}</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-[#7a1f1f] px-3 py-2 text-sm font-semibold text-white"
        >
          Thử lại
        </button>
        <Link href="/" className="rounded-lg border px-3 py-2 text-sm font-semibold">
          Trang chủ
        </Link>
      </div>
    </div>
  );
}
