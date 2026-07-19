"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signInWithEmail } from "@/services/authService";
import { listOwnedFamilies } from "@/services/familyService";

export function LoginForm() {
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

    try {
      await signInWithEmail(email, password);
      const owned = await listOwnedFamilies();
      if (owned.length === 0) {
        router.replace("/onboarding/create-family");
      } else {
        router.replace(`/dashboard/${encodeURIComponent(owned[0].id)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
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
          Đăng nhập
        </h1>
        <p className="mt-1 text-sm text-[#6a6258]">Vào quản trị gia phả của bạn.</p>
      </div>

      <label className="block text-sm font-semibold">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-[#8a6a3a]/40 px-3 py-2 font-normal"
        />
      </label>

      <label className="block text-sm font-semibold">
        Mật khẩu
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-[#8a6a3a]/40 px-3 py-2 font-normal"
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
        className="w-full rounded-lg bg-[#1c1410] px-4 py-2.5 text-sm font-semibold text-[#fffdf8] disabled:opacity-60"
      >
        {loading ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>

      <p className="text-center text-sm text-[#6a6258]">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-semibold text-[#7a1f1f] hover:underline">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}
