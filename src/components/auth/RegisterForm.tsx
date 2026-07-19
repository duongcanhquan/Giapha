"use client";

import type { User } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";
import { appToast } from "@/lib/toast";
import { subscribeAuth } from "@/services/authService";
import { getMyRegistrations, submitFamilyRegistration } from "@/services/registrationService";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [softHints, setSoftHints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [prefills, setPrefills] = useState<{
    email: string;
    full_name: string;
  }>({ email: "", full_name: "" });

  useEffect(() => {
    let cancelled = false;
    const unsub = subscribeAuth((user) => {
      void (async () => {
        if (!user) {
          if (!cancelled) {
            setSessionUser(null);
            setReady(true);
          }
          return;
        }

        const regs = await getMyRegistrations(user.uid);
        if (cancelled) return;

        if (regs.some((r) => r.status === "pending")) {
          router.replace("/onboarding/pending");
          return;
        }
        if (regs.some((r) => r.status === "approved" && r.family_id)) {
          const path = await resolvePostLoginPath(user);
          if (!cancelled) router.replace(path);
          return;
        }

        setSessionUser(user);
        setPrefills({
          email: user.email ?? "",
          full_name: user.displayName ?? "",
        });
        setReady(true);
      })();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSoftHints([]);
    setLoading(true);

    const form = new FormData(event.currentTarget);

    try {
      const { duplicates } = await submitFamilyRegistration({
        full_name: String(form.get("full_name") ?? ""),
        family_surname: String(form.get("family_surname") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
        address: String(form.get("address") ?? ""),
        family_name: String(form.get("family_name") ?? ""),
        description: String(form.get("description") ?? ""),
        password: sessionUser ? undefined : String(form.get("password") ?? ""),
      });

      const soft = duplicates.filter(
        (h) => h.includes("Trùng họ") || h.includes("Trùng tên gia phả"),
      );
      if (soft.length) setSoftHints(soft);

      appToast.success(
        "Đã gửi đăng ký",
        "Hồ sơ đang chờ Super Admin duyệt trước khi tạo gia phả.",
      );
      router.replace("/onboarding/pending");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Đăng ký thất bại. Thử lại.";
      setError(message);
      appToast.error("Đăng ký thất bại", message);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <p className="text-center text-sm text-[var(--gp-muted)]">
        Đang kiểm tra phiên đăng nhập…
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="gp-panel mx-auto w-full max-w-lg space-y-4 p-7"
    >
      <div>
        <p className="gp-eyebrow">Gia phả</p>
        <h1 className="gp-title mt-2 text-2xl">
          {sessionUser ? "Gửi lại hồ sơ tạo gia phả" : "Đăng ký tạo gia phả"}
        </h1>
        <p className="gp-lede mt-1 text-sm">
          Điền thông tin người tạo. Super Admin duyệt xong bạn mới trở thành
          Admin dòng họ và được mở gia phả.
        </p>
      </div>

      <label className="gp-label">
        Họ và tên người tạo
        <input
          name="full_name"
          required
          defaultValue={prefills.full_name}
          className="gp-input mt-1 font-normal"
          placeholder="Nguyễn Văn A"
          autoComplete="name"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="gp-label">
          Họ dòng họ
          <input
            name="family_surname"
            required
            className="gp-input mt-1 font-normal"
            placeholder="Nguyễn"
          />
        </label>
        <label className="gp-label">
          Tên gia phả đề xuất
          <input
            name="family_name"
            required
            className="gp-input mt-1 font-normal"
            placeholder="Dòng họ Nguyễn làng X"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="gp-label">
          Email
          <input
            name="email"
            type="email"
            required
            defaultValue={prefills.email}
            readOnly={Boolean(sessionUser)}
            autoComplete="email"
            className="gp-input mt-1 font-normal read-only:bg-[var(--gp-paper)]/60"
            placeholder="ban@email.com"
          />
        </label>
        <label className="gp-label">
          Số điện thoại
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            className="gp-input mt-1 font-normal"
            placeholder="09xx xxx xxx"
          />
        </label>
      </div>

      <label className="gp-label">
        Địa chỉ
        <input
          name="address"
          required
          autoComplete="street-address"
          className="gp-input mt-1 font-normal"
          placeholder="Thôn / xã / huyện / tỉnh"
        />
      </label>

      {!sessionUser ? (
        <label className="gp-label">
          Mật khẩu tài khoản
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
      ) : (
        <p className="rounded-[var(--gp-radius)] border border-[var(--gp-scroll-edge)] px-3 py-2 text-sm text-[var(--gp-muted)]">
          Đang đăng nhập: <strong>{sessionUser.email}</strong> — hồ sơ mới sẽ gắn
          vào tài khoản này (không tạo mật khẩu mới).
        </p>
      )}

      <label className="gp-label">
        Ghi chú thêm (tuỳ chọn)
        <textarea
          name="description"
          rows={2}
          className="gp-input mt-1 font-normal"
          placeholder="Nguồn gốc làng xã, năm dựng họ…"
        />
      </label>

      {error ? (
        <p className="rounded-[var(--gp-radius)] bg-[var(--gp-lacquer-soft)] px-3 py-2 text-sm text-[var(--gp-lacquer)]">
          {error}
        </p>
      ) : null}

      {softHints.length > 0 ? (
        <ul className="rounded-[var(--gp-radius)] border border-[var(--gp-gold)]/40 bg-[var(--gp-gold)]/10 px-3 py-2 text-sm text-[var(--gp-ink)]">
          {softHints.map((h) => (
            <li key={h}>⚠ {h} — Super Admin sẽ xem xét khi duyệt.</li>
          ))}
        </ul>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="gp-btn gp-btn-primary w-full disabled:opacity-60"
      >
        {loading ? "Đang gửi hồ sơ…" : "Gửi đăng ký chờ duyệt"}
      </button>

      {!sessionUser ? (
        <p className="text-center text-sm text-[var(--gp-muted)]">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-semibold text-[var(--gp-lacquer)] hover:underline">
            Đăng nhập
          </Link>
        </p>
      ) : null}
    </form>
  );
}
