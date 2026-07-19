"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RegistrationQueue } from "@/components/admin/RegistrationQueue";
import { SuperAdminBanner } from "@/components/admin/SuperAdminBanner";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { checkSuperAdminAccess } from "@/services/accessService";
import { subscribeAuth, signOutUser } from "@/services/authService";
import { listAllFamilies } from "@/services/familyService";
import type { Family } from "@/types/genealogy";

type Tab = "registrations" | "families";

export function SuperAdminDashboard() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "denied">("loading");
  const [families, setFamilies] = useState<Family[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("registrations");

  useEffect(() => {
    let cancelled = false;

    const unsub = subscribeAuth((user) => {
      void (async () => {
        if (!user) {
          router.replace("/login");
          return;
        }

        if (!isFirebaseConfigured()) {
          if (!cancelled) {
            setError("Firebase chưa cấu hình — không tải được danh sách dòng họ.");
            setFamilies([]);
            setStatus("ready");
          }
          return;
        }

        const allowed = await checkSuperAdminAccess(user);
        if (cancelled) return;
        if (!allowed) {
          setStatus("denied");
          return;
        }

        setEmail(user.email);
        try {
          const all = await listAllFamilies();
          if (!cancelled) {
            setFamilies(all);
            setError(null);
            setStatus("ready");
          }
        } catch (err) {
          if (!cancelled) {
            setError(
              err instanceof Error
                ? err.message
                : "Không tải được danh sách families.",
            );
            setStatus("ready");
          }
        }
      })();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [router]);

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--gp-lacquer-deep)] text-sm text-[var(--gp-seal-ink)]/70">
        Đang xác thực Super Admin…
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--gp-lacquer-deep)] px-4 text-center">
        <div className="max-w-md">
          <h1 className="font-display text-xl font-semibold text-[var(--gp-gold-bright)]">
            Không có quyền Super Admin
          </h1>
          <p className="mt-2 text-sm text-[var(--gp-seal-ink)]/75">
            Chỉ tài khoản <code className="text-[var(--gp-gold-bright)]">duongcanhquan</code>{" "}
            / claim <code className="text-[var(--gp-gold-bright)]">super_admin</code>.
          </p>
          <Link href="/" className="gp-btn gp-btn-outline-light mt-5">
            Về trang chủ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(165deg,#2a1212_0%,#1a0a0a_45%,#120808_100%)] text-[var(--gp-seal-ink)]">
      <SuperAdminBanner />

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gp-gold)]/20 px-4 py-5 md:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gp-gold-bright)]/90">
            Gia phả · Ấn son nền tảng
          </p>
          <h1 className="font-display mt-1 text-2xl font-semibold">
            Super Admin
          </h1>
          <p className="mt-1 text-sm text-[var(--gp-seal-ink)]/65">
            {email ?? "—"} · {families.length} dòng họ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="gp-btn gp-btn-outline-light">
            Trang chủ
          </Link>
          <button
            type="button"
            className="gp-btn border border-[var(--gp-gold)]/30 bg-white/5 hover:bg-white/10"
            onClick={() => void signOutUser().then(() => router.replace("/login"))}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 md:px-8">
        {error ? (
          <p className="mb-4 rounded-[var(--gp-radius)] border border-red-300/40 bg-red-950/40 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("registrations")}
            className={[
              "rounded-[var(--gp-radius-sm)] px-3 py-1.5 text-sm font-semibold",
              tab === "registrations"
                ? "bg-[var(--gp-seal)] text-white"
                : "border border-[var(--gp-gold)]/30 text-[var(--gp-seal-ink)]/80 hover:bg-white/5",
            ].join(" ")}
          >
            Đăng ký chờ duyệt
          </button>
          <button
            type="button"
            onClick={() => setTab("families")}
            className={[
              "rounded-[var(--gp-radius-sm)] px-3 py-1.5 text-sm font-semibold",
              tab === "families"
                ? "bg-[var(--gp-seal)] text-white"
                : "border border-[var(--gp-gold)]/30 text-[var(--gp-seal-ink)]/80 hover:bg-white/5",
            ].join(" ")}
          >
            Dòng họ ({families.length})
          </button>
        </div>

        {tab === "registrations" ? (
          <RegistrationQueue />
        ) : (
          <div className="overflow-x-auto rounded-[var(--gp-radius-lg)] border border-[var(--gp-gold)]/25 bg-[#2a1212]/80 shadow-[var(--gp-shadow-lift)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--gp-gold)]/20 text-xs uppercase tracking-[0.12em] text-[var(--gp-seal-ink)]/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tên dòng họ</th>
                  <th className="px-4 py-3 font-semibold">family_id</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {families.map((family) => (
                  <tr
                    key={family.id}
                    className="border-b border-white/5 last:border-0 transition hover:bg-[var(--gp-gold)]/5"
                  >
                    <td className="px-4 py-3 font-display font-semibold">
                      {family.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--gp-seal-ink)]/55">
                      {family.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--gp-seal-ink)]/55">
                      {family.owner_id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/${encodeURIComponent(family.id)}`}
                          className="rounded-[var(--gp-radius-sm)] bg-[var(--gp-seal)] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[var(--gp-lacquer)]"
                        >
                          Quản lý
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
