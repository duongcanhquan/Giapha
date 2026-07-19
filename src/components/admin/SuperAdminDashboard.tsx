"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SuperAdminBanner } from "@/components/admin/SuperAdminBanner";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { sampleFamilyTree } from "@/data/sample-family";
import { checkSuperAdminAccess } from "@/services/accessService";
import { subscribeAuth, signOutUser } from "@/services/authService";
import { listAllFamilies } from "@/services/familyService";
import type { Family } from "@/types/genealogy";

export function SuperAdminDashboard() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "denied">("loading");
  const [families, setFamilies] = useState<Family[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const unsub = subscribeAuth((user) => {
      void (async () => {
        if (!user) {
          if (!isFirebaseConfigured()) {
            if (cancelled) return;
            setEmail("demo@super-admin.local");
            setFamilies([
              {
                id: sampleFamilyTree.family_id ?? "family-demo-nguyen",
                name: sampleFamilyTree.clan_name,
                owner_id: "demo",
                created_at: null,
                settings: {
                  description: "Dòng họ demo (Firebase chưa cấu hình)",
                },
              },
            ]);
            setStatus("ready");
            return;
          }
          router.replace("/login");
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
            setFamilies(
              all.length > 0
                ? all
                : [
                    {
                      id: sampleFamilyTree.family_id ?? "family-demo-nguyen",
                      name: sampleFamilyTree.clan_name,
                      owner_id: user.uid,
                      created_at: null,
                      settings: { description: "Fallback demo" },
                    },
                  ],
            );
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
      <main className="grid min-h-screen place-items-center text-sm text-white/70">
        Đang xác thực Super Admin…
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold text-red-300">Không có quyền Super Admin</h1>
          <p className="mt-2 text-sm text-white/70">
            Chỉ tài khoản <code className="text-red-200">duongcanhquan</code> / claim{" "}
            <code className="text-red-200">super_admin</code> được vào đây.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold underline">
            Về trang chủ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SuperAdminBanner />

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 md:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-red-300/90">Giapha Platform</p>
          <h1
            className="mt-1 text-2xl font-semibold"
            style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
          >
            Super Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-white/65">
            {email ?? "—"} · {families.length} dòng họ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Trang chủ
          </Link>
          <button
            type="button"
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
            onClick={() => void signOutUser().then(() => router.replace("/login"))}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 md:px-8">
        {error ? (
          <p className="mb-4 rounded-lg border border-red-400/40 bg-red-950/50 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-white/15 bg-[#2a1010]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/50">
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
                  className="border-b border-white/5 last:border-0 hover:bg-white/5"
                >
                  <td className="px-4 py-3 font-medium">{family.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-white/60">
                    {family.id}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white/60">
                    {family.owner_id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/${encodeURIComponent(family.id)}`}
                        className="rounded-md bg-[#b91c1c] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#dc2626]"
                      >
                        Quản lý
                      </Link>
                      <Link
                        href={`/tree/${encodeURIComponent(family.id)}`}
                        className="rounded-md border border-white/25 px-2.5 py-1 text-xs font-semibold hover:bg-white/10"
                      >
                        Xem công khai
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
