"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SuperAdminBanner } from "@/components/admin/SuperAdminBanner";
import { subscribeAuth, signOutUser } from "@/services/authService";
import { checkFamilyAdminAccess, type FamilyAccess } from "@/services/accessService";
import { getFamily } from "@/services/familyService";
import type { Family } from "@/types/family";

type DashboardShellProps = {
  familyId: string;
  children: ReactNode;
};

const NAV = [
  { href: "", label: "Tổng quan" },
  { href: "/members", label: "Thành viên" },
  { href: "/branches", label: "Nhánh" },
  { href: "/appearance", label: "Giao diện" },
] as const;

export function DashboardShell({ familyId, children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "ready" | "denied">("loading");
  const [access, setAccess] = useState<FamilyAccess | null>(null);
  const [family, setFamily] = useState<Family | null>(null);

  useEffect(() => {
    let cancelled = false;

    const unsub = subscribeAuth((user) => {
      void (async () => {
        if (!user) {
          router.replace("/login");
          return;
        }

        const result = await checkFamilyAdminAccess(familyId, user);
        if (cancelled) return;

        if (!result.allowed) {
          setStatus("denied");
          router.replace("/");
          return;
        }

        setAccess(result);
        try {
          const f = await getFamily(familyId);
          if (!cancelled) {
            setFamily(
              f ?? {
                id: familyId,
                name: "Gia phả",
                owner_id: user.uid,
                settings: {},
              },
            );
          }
        } catch {
          if (!cancelled) {
            setFamily({
              id: familyId,
              name: "Gia phả",
              owner_id: user.uid,
              settings: {},
            });
          }
        }
        setStatus("ready");
      })();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [familyId, router]);

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-[var(--gp-muted)]">
        Đang kiểm tra quyền quản trị…
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-[var(--gp-lacquer)]">
        Bạn không có quyền truy cập khu vực quản trị này.
      </main>
    );
  }

  const base = `/dashboard/${familyId}`;
  const isSuperAdmin = access?.role === "super_admin";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--gp-paper)] text-[var(--gp-ink)]">
      {isSuperAdmin ? <SuperAdminBanner familyName={family?.name} /> : null}

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)] p-5 md:block">
          <Link href="/" className="font-display text-sm font-semibold text-[var(--gp-lacquer)]">
            Giapha
          </Link>
          <p className="gp-eyebrow mt-5">Quản trị dòng họ</p>
          <p className="gp-title mt-1 text-lg">{family?.name ?? "…"}</p>
          <p className="mt-1 text-xs text-[var(--gp-muted)]">
            Vai trò:{" "}
            {isSuperAdmin
              ? "Super Admin"
              : access?.role === "owner"
                ? "Chủ dòng họ"
                : "Trưởng nhánh"}
          </p>

          <nav className="mt-7 flex flex-col gap-1">
            {NAV.map((item) => {
              const href = `${base}${item.href}`;
              const active =
                item.href === "" ? pathname === base : pathname.startsWith(href);
              return (
                <Link
                  key={item.href || "home"}
                  href={href}
                  className={[
                    "rounded-[var(--gp-radius-sm)] px-3 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-[var(--gp-lacquer)] text-[var(--gp-seal-ink)]"
                      : "text-[var(--gp-ink)] hover:bg-[var(--gp-lacquer-soft)]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 space-y-2 border-t border-[var(--gp-scroll-edge)] pt-4">
            {isSuperAdmin ? (
              <Link
                href="/super-admin"
                className="block text-sm font-semibold text-[var(--gp-seal)] hover:underline"
              >
                Cổng Super Admin
              </Link>
            ) : null}
            <Link
              href={`/tree/${familyId}`}
              className="block text-sm font-semibold text-[var(--gp-lacquer)] hover:underline"
            >
              Xem cây công khai
            </Link>
            <button
              type="button"
              className="text-sm text-[var(--gp-muted)] hover:underline"
              onClick={() => void signOutUser().then(() => router.replace("/"))}
            >
              Đăng xuất
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)]/90 px-4 py-3 md:hidden">
            <div>
              <p className="gp-eyebrow">Quản trị</p>
              <p className="font-display font-semibold">{family?.name}</p>
            </div>
            <Link
              href={`/tree/${familyId}`}
              className="text-sm font-semibold text-[var(--gp-lacquer)]"
            >
              Cây công khai
            </Link>
          </header>

          <nav className="flex gap-1 overflow-x-auto border-b border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)] px-2 py-2 md:hidden">
            {NAV.map((item) => {
              const href = `${base}${item.href}`;
              const active =
                item.href === "" ? pathname === base : pathname.startsWith(href);
              return (
                <Link
                  key={item.href || "home-m"}
                  href={href}
                  className={[
                    "whitespace-nowrap rounded-[var(--gp-radius-sm)] px-3 py-1.5 text-xs font-semibold",
                    active
                      ? "bg-[var(--gp-lacquer)] text-[var(--gp-seal-ink)]"
                      : "text-[var(--gp-ink)]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <main className="flex-1 p-4 md:p-7">{children}</main>
        </div>
      </div>
    </div>
  );
}
