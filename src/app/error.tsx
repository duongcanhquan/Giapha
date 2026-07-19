"use client";

import { useEffect } from "react";
import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorBoundary({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#e9eef3] px-4">
      <div className="max-w-md rounded-2xl border border-stone-300/60 bg-[#fffdf8] p-6 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7a1f1f]">
          Đã xảy ra lỗi
        </p>
        <h1
          className="mt-2 text-2xl font-semibold text-[#1c1410]"
          style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
        >
          Không thể hiển thị trang
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {error.message || "Lỗi không xác định. Thử tải lại."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-[#7a1f1f] px-4 py-2 text-sm font-semibold text-[#fffdf8]"
          >
            Thử lại
          </button>
          <Link
            href="/"
            className="rounded-lg border border-stone-400/50 px-4 py-2 text-sm font-semibold"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
