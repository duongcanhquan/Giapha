"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SuperAdminErrorBoundary({ error, reset }: ErrorPageProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#1a0a0a] px-4">
      <div className="max-w-md rounded-xl border border-red-400/40 bg-[#3f0f0f] p-6 text-center">
        <h1 className="text-lg font-semibold text-red-200">Lỗi Super Admin</h1>
        <p className="mt-2 text-sm text-white/80">{error.message}</p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-[#b91c1c] px-3 py-2 text-sm font-semibold text-white"
          >
            Thử lại
          </button>
          <Link
            href="/"
            className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold"
          >
            Trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
