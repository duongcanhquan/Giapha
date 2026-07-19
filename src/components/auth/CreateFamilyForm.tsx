"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { subscribeAuth } from "@/services/authService";
import { createFamily } from "@/services/familyService";
import { appToast } from "@/lib/toast";

export function CreateFamilyForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeAuth((user) => {
      if (!user) {
        router.replace("/register");
        return;
      }
      setReady(true);
    });
    return unsub;
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const description = String(form.get("description") ?? "");

    try {
      const family = await createFamily({ name, description });
      appToast.success("Đã tạo gia phả", `Bạn là Admin của dòng họ ${family.name}.`);
      router.replace(`/dashboard/${encodeURIComponent(family.id)}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không tạo được gia phả.";
      setError(message);
      appToast.error("Tạo gia phả thất bại", message);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <p className="text-center text-sm text-[#6a6258]">Đang kiểm tra phiên đăng nhập…</p>
    );
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-[#8a6a3a]/30 bg-[#fffdf8] p-6 shadow-sm"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7a1f1f]">
          Onboarding
        </p>
        <h1
          className="mt-1 text-2xl font-semibold text-[#1c1410]"
          style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
        >
          Tạo Gia phả mới
        </h1>
        <p className="mt-1 text-sm text-[#6a6258]">
          Bạn sẽ trở thành <strong>Admin dòng họ</strong> (owner) và toàn quyền quản lý
          thành viên thuộc gia phả này.
        </p>
      </div>

      <label className="block text-sm font-semibold">
        Tên dòng họ
        <input
          name="name"
          required
          className="mt-1 w-full rounded-lg border border-[#8a6a3a]/40 px-3 py-2 font-normal"
          placeholder="Tên dòng họ nhà bạn"
        />
      </label>

      <label className="block text-sm font-semibold">
        Mô tả ngắn
        <textarea
          name="description"
          rows={3}
          className="mt-1 w-full rounded-lg border border-[#8a6a3a]/40 px-3 py-2 font-normal"
          placeholder="Làng quê, năm dựng họ, ghi chú…"
        />
      </label>

      {error ? (
        <p className="rounded-lg bg-[#7a1f1f]/10 px-3 py-2 text-sm text-[#7a1f1f]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#7a1f1f] px-4 py-2.5 text-sm font-semibold text-[#fffdf8] disabled:opacity-60"
      >
        {loading ? "Đang tạo…" : "Tạo gia phả & vào cây"}
      </button>
    </form>
  );
}
