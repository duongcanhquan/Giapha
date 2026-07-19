"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SuperAdminBanner } from "@/components/admin/SuperAdminBanner";
import {
  DashboardAccessProvider,
} from "@/components/dashboard/DashboardAccessContext";
import { CopyShareLinkButton } from "@/components/share/CopyShareLinkButton";
import { subscribeAuth, signOutUser } from "@/services/authService";
import {
  checkFamilyAdminAccess,
  type FamilyAccess,
} from "@/services/accessService";
import { getFamily } from "@/services/familyService";
import type { Family } from "@/types/family";

type DashboardShellProps = {
  familyId: string;
  children: ReactNode;
};

const OWNER_NAV = [
  { href: "", label: "Cây hương hỏa" },
  { href: "/members", label: "Thành viên" },
  { href: "/branches", label: "Nhánh" },
  { href: "/managers", label: "Phân quyền" },
  { href: "/appearance", label: "Giao diện" },
] as const;

const BRANCH_NAV = [
  { href: "", label: "Cây hương hỏa" },
  { href: "/members", label: "Thành viên" },
  { href: "/managers", label: "Quyền của tôi" },
] as const;

export function DashboardShell({ familyId, children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "ready" | "denied">("loading");
  const [access, setAccess] = useState<FamilyAccess | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return `/tree/${familyId}`;
    return `${window.location.origin}/tree/${familyId}`;
  }, [familyId]);

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

  // Trưởng nhánh không được vào Nhánh / Giao diện (deep-link)
  useEffect(() => {
    if (status !== "ready" || !access) return;
    if (access.role !== "branch_admin") return;
    const base = `/dashboard/${familyId}`;
    if (
      pathname.startsWith(`${base}/appearance`) ||
      pathname.startsWith(`${base}/branches`)
    ) {
      router.replace(base);
    }
  }, [status, access, pathname, familyId, router]);

  if (status === "loading" || !access) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-[var(--gp-muted)]">
        Đang xác thực quyền quản trị…
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-[var(--gp-lacquer)]">
        Không có quyền truy cập dashboard dòng họ này.
      </main>
    );
  }

  const base = `/dashboard/${familyId}`;
  const isSuperAdmin = access.role === "super_admin";
  const isBranchAdmin = access.role === "branch_admin";
  const canManageManagers =
    access.role === "owner" || access.role === "super_admin";
  const nav = isBranchAdmin ? BRANCH_NAV : OWNER_NAV;

  const roleLabel = isSuperAdmin
    ? "Super Admin"
    : access.role === "owner"
      ? "Chủ dòng họ"
      : `Trưởng nhánh${
          access.branchNames?.filter(Boolean).length
            ? ` · ${access.branchNames.filter(Boolean).join(", ")}`
            : access.branchName
              ? ` · ${access.branchName}`
              : access.branchIds?.length
                ? ` · ${access.branchIds.join(", ")}`
                : ""
        }`;

  return (
    <DashboardAccessProvider
      value={{
        familyId,
        access,
        family,
        canManageManagers,
        isBranchAdmin,
      }}
    >
      <div className="flex min-h-screen flex-col bg-[var(--gp-paper)] text-[var(--gp-ink)]">
        {isSuperAdmin ? <SuperAdminBanner familyName={family?.name} /> : null}

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-60 shrink-0 border-r border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)] p-5 md:block">
            <Link
              href="/"
              className="font-display text-sm font-semibold text-[var(--gp-lacquer)]"
            >
              Gia phả
            </Link>
            <p className="gp-eyebrow mt-5">Quản trị dòng họ</p>
            <p className="gp-title mt-1 text-lg">{family?.name ?? "…"}</p>
            <p className="mt-1 text-xs text-[var(--gp-muted)]">
              Vai trò: {roleLabel}
            </p>

            <nav className="mt-7 flex flex-col gap-1">
              {nav.map((item) => {
                const href = `${base}${item.href}`;
                const active =
                  item.href === ""
                    ? pathname === base
                    : pathname.startsWith(href);
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
              <CopyShareLinkButton
                url={shareUrl}
                label="Copy link gửi họ hàng"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--gp-lacquer)] hover:underline"
              />
              <button
                type="button"
                className="block text-sm text-[var(--gp-muted)] hover:underline"
                onClick={() =>
                  void signOutUser().then(() => router.replace("/"))
                }
              >
                Đăng xuất
              </button>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between gap-2 border-b border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)]/90 px-4 py-3 md:hidden">
              <div>
                <p className="gp-eyebrow">Quản trị</p>
                <p className="font-display font-semibold">{family?.name}</p>
              </div>
              <CopyShareLinkButton
                url={shareUrl}
                label="Copy link"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--gp-lacquer)]"
              />
            </header>

            <nav className="flex gap-1 overflow-x-auto border-b border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)] px-2 py-2 md:hidden">
              {nav.map((item) => {
                const href = `${base}${item.href}`;
                const active =
                  item.href === ""
                    ? pathname === base
                    : pathname.startsWith(href);
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

            <main className="flex min-h-0 flex-1 flex-col p-3 md:p-5">
              {children}
            </main>
          </div>
        </div>
      </div>
    </DashboardAccessProvider>
  );
}
