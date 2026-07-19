"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { appToast } from "@/lib/toast";
import { submitFamilyRegistration } from "@/services/registrationService";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [softHints, setSoftHints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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
        password: String(form.get("password") ?? ""),
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

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="gp-panel mx-auto w-full max-w-lg space-y-4 p-7"
    >
      <div>
        <p className="gp-eyebrow">Gia phả</p>
        <h1 className="gp-title mt-2 text-2xl">Đăng ký tạo gia phả</h1>
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
            autoComplete="email"
            className="gp-input mt-1 font-normal"
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

      <p className="text-center text-sm text-[var(--gp-muted)]">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-semibold text-[var(--gp-lacquer)] hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
