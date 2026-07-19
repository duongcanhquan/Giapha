"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function TreeErrorBoundary({ error, reset }: ErrorPageProps) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-[#7a1f1f]">Lỗi tải cây gia phả</h1>
        <p className="mt-2 text-sm text-stone-600">{error.message}</p>
        <div className="mt-4 flex justify-center gap-2">
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
    </main>
  );
}
