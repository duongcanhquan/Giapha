"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { checkSuperAdminAccess } from "@/services/accessService";
import { getCurrentUser, signInWithEmail } from "@/services/authService";
import { listOwnedFamilies } from "@/services/familyService";
import { listManagedFamilyIdsForEmail } from "@/services/managerService";

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
      const user = getCurrentUser();
      if (user && (await checkSuperAdminAccess(user))) {
        router.replace("/super-admin");
        return;
      }
      const owned = await listOwnedFamilies();
      if (owned.length > 0) {
        router.replace(`/dashboard/${encodeURIComponent(owned[0]!.id)}`);
        return;
      }
      const managed = await listManagedFamilyIdsForEmail(user?.email ?? email);
      if (managed.length > 0) {
        router.replace(`/dashboard/${encodeURIComponent(managed[0]!)}`);
        return;
      }
      router.replace("/onboarding/create-family");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
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
        <p className="gp-eyebrow">Gia phả</p>
        <h1 className="gp-title mt-2 text-2xl">Đăng nhập</h1>
        <p className="gp-lede mt-1 text-sm">Vào quản trị gia phả của dòng họ bạn.</p>
      </div>

      <label className="gp-label">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="gp-input mt-1 font-normal"
        />
      </label>

      <label className="gp-label">
        Mật khẩu
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="gp-input mt-1 font-normal"
        />
      </label>

      {error ? (
        <p className="rounded-[var(--gp-radius)] bg-[var(--gp-lacquer-soft)] px-3 py-2 text-sm text-[var(--gp-lacquer)]">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={loading} className="gp-btn gp-btn-primary w-full disabled:opacity-60">
        {loading ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>

      <p className="text-center text-sm text-[var(--gp-muted)]">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-semibold text-[var(--gp-lacquer)] hover:underline">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}
