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
      className="gp-panel mx-auto w-full max-w-md space-y-4 p-7"
    >
      <div>
        <p className="gp-eyebrow">Giapha</p>
        <h1 className="gp-title mt-2 text-2xl">Đăng ký</h1>
        <p className="gp-lede mt-1 text-sm">
          Tạo tài khoản để mở gia phả linh thiêng cho dòng họ của bạn.
        </p>
      </div>

      <label className="gp-label">
        Họ tên
        <input
          name="displayName"
          required
          className="gp-input mt-1 font-normal"
          placeholder="Nguyễn Văn A"
        />
      </label>

      <label className="gp-label">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="gp-input mt-1 font-normal"
          placeholder="ban@email.com"
        />
      </label>

      <label className="gp-label">
        Mật khẩu
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="gp-input mt-1 font-normal"
          placeholder="Ít nhất 6 ký tự"
        />
      </label>

      {error ? (
        <p className="rounded-[var(--gp-radius)] bg-[var(--gp-lacquer-soft)] px-3 py-2 text-sm text-[var(--gp-lacquer)]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="gp-btn gp-btn-primary w-full disabled:opacity-60"
      >
        {loading ? "Đang tạo tài khoản…" : "Đăng ký & tiếp tục"}
      </button>

      <p className="text-center text-sm text-[var(--gp-muted)]">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-semibold text-[var(--gp-lacquer)] hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
