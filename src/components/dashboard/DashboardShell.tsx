"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LogOut } from "lucide-react";
import type { User } from "firebase/auth";
import { SuperAdminBanner } from "@/components/admin/SuperAdminBanner";
import { DashboardAccessProvider } from "@/components/dashboard/DashboardAccessContext";
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

function userDisplayName(user: User | null): string {
  if (!user) return "Người dùng";
  const name = user.displayName?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (!email) return "Người dùng";
  return email.split("@")[0] || email;
}

function userInitials(user: User | null): string {
  const label = userDisplayName(user);
  const parts = label.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return ((parts[0]![0] ?? "") + (parts[1]![0] ?? "")).toUpperCase();
  }
  return label.slice(0, 2).toUpperCase() || "?";
}

export function DashboardShell({ familyId, children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "ready" | "denied">(
    "loading",
  );
  const [access, setAccess] = useState<FamilyAccess | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);

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

        setAuthUser(user);
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

  const displayName = userDisplayName(authUser);
  const initials = userInitials(authUser);
  const email = authUser?.email ?? "";

  const handleSignOut = () => {
    void signOutUser().then(() => router.replace("/"));
  };

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

        {/* Thanh trên: tên người dùng + đăng xuất — luôn thấy trên mobile & desktop */}
        <header className="sticky top-0 z-30 border-b border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)]/95 px-3 py-2.5 backdrop-blur-sm md:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Link
                href="/"
                className="font-display text-sm font-semibold text-[var(--gp-lacquer)] hover:underline"
              >
                Gia phả
              </Link>
              <p className="truncate font-display text-base font-semibold leading-tight text-[var(--gp-ink)] md:text-lg">
                {family?.name ?? "…"}
              </p>
              <p className="truncate text-[11px] text-[var(--gp-muted)] md:text-xs">
                {roleLabel}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2.5 rounded-xl border border-[var(--gp-scroll-edge)] bg-[var(--gp-paper)]/80 px-2.5 py-1.5 sm:flex">
                <span
                  className="grid h-9 w-9 place-items-center rounded-full bg-[var(--gp-lacquer)] text-xs font-bold text-[var(--gp-seal-ink)]"
                  aria-hidden
                >
                  {initials}
                </span>
                <div className="min-w-0 max-w-[12rem]">
                  <p className="truncate text-sm font-semibold text-[var(--gp-ink)]">
                    {displayName}
                  </p>
                  {email ? (
                    <p className="truncate text-[11px] text-[var(--gp-muted)]">
                      {email}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Mobile: chỉ hiện avatar + tên rút gọn */}
              <div className="flex max-w-[7.5rem] flex-col items-end sm:hidden">
                <p className="truncate text-xs font-semibold text-[var(--gp-ink)]">
                  {displayName}
                </p>
                <p className="truncate text-[10px] text-[var(--gp-muted)]">
                  {email || roleLabel}
                </p>
              </div>

              <CopyShareLinkButton
                url={shareUrl}
                label="Chia sẻ"
                className="gp-btn gp-btn-ghost !min-h-10 !px-3 text-xs sm:text-sm"
              />

              <button
                type="button"
                onClick={handleSignOut}
                className="gp-btn gp-btn-logout !min-h-10 !px-3 text-xs sm:text-sm"
                aria-label="Đăng xuất"
              >
                <LogOut size={16} aria-hidden />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-60 shrink-0 border-r border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)] p-5 md:block">
            <p className="gp-eyebrow">Menu quản trị</p>
            <nav className="mt-4 flex flex-col gap-1">
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
                      "rounded-[var(--gp-radius-sm)] px-3 py-2.5 text-sm font-semibold transition",
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

            {isSuperAdmin ? (
              <div className="mt-8 border-t border-[var(--gp-scroll-edge)] pt-4">
                <Link
                  href="/super-admin"
                  className="block rounded-[var(--gp-radius-sm)] px-3 py-2.5 text-sm font-semibold text-[var(--gp-seal)] hover:bg-[var(--gp-lacquer-soft)]"
                >
                  Cổng Super Admin
                </Link>
              </div>
            ) : null}
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
                      "min-h-10 whitespace-nowrap rounded-[var(--gp-radius-sm)] px-3 py-2 text-xs font-semibold",
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
