"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { registerWithEmail } from "@/services/authService";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("displayName") ?? "");

    try {
      await registerWithEmail({ email, password, displayName });
      router.replace("/onboarding/create-family");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Đăng ký thất bại. Thử lại.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-[#8a6a3a]/30 bg-[#fffdf8] p-6 shadow-sm"
    >
      <div>
        <h1
          className="text-2xl font-semibold text-[#1c1410]"
          style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
        >
          Đăng ký Giapha
        </h1>
        <p className="mt-1 text-sm text-[#6a6258]">
          Tạo tài khoản để mở gia phả cho dòng họ của bạn.
        </p>
      </div>

      <label className="block text-sm font-semibold">
        Họ tên
        <input
          name="displayName"
          required
          className="mt-1 w-full rounded-lg border border-[#8a6a3a]/40 px-3 py-2 font-normal"
          placeholder="Nguyễn Văn A"
        />
      </label>

      <label className="block text-sm font-semibold">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-[#8a6a3a]/40 px-3 py-2 font-normal"
          placeholder="ban@email.com"
        />
      </label>

      <label className="block text-sm font-semibold">
        Mật khẩu
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-[#8a6a3a]/40 px-3 py-2 font-normal"
          placeholder="Ít nhất 6 ký tự"
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
        {loading ? "Đang tạo tài khoản…" : "Đăng ký & tiếp tục"}
      </button>

      <p className="text-center text-sm text-[#6a6258]">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-semibold text-[#7a1f1f] hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
