"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { subscribeAuth, signOutUser } from "@/services/authService";
import { checkFamilyAdminAccess, type FamilyAccess } from "@/services/accessService";
import { getFamily } from "@/services/familyService";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { sampleFamilyTree } from "@/data/sample-family";
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
          // Demo mode: allow viewing dashboard UI without auth
          if (
            !isFirebaseConfigured() &&
            (familyId === "demo" || familyId === sampleFamilyTree.family_id)
          ) {
            if (cancelled) return;
            setAccess({ allowed: true, role: "owner" });
            setFamily({
              id: familyId,
              name: sampleFamilyTree.clan_name,
              description: "Demo dashboard",
              owner_id: "demo",
              theme: {
                primary_color: "#7a1f1f",
                accent_color: "#c9a227",
                surface_color: "#e9eef3",
              },
              branches: [
                { id: "branch-main", name: "Chi chính", description: "Nhánh hương hỏa" },
              ],
            });
            setStatus("ready");
            return;
          }
          router.replace("/");
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
                description: "",
                owner_id: user.uid,
              },
            );
          }
        } catch {
          if (!cancelled) {
            setFamily({
              id: familyId,
              name: "Gia phả",
              description: "",
              owner_id: user.uid,
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
      <main className="grid min-h-screen place-items-center text-sm text-stone-500">
        Đang kiểm tra quyền quản trị…
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-[#7a1f1f]">
        Bạn không có quyền truy cập dashboard này.
      </main>
    );
  }

  const base = `/dashboard/${familyId}`;

  return (
    <div className="flex min-h-screen bg-[#e9eef3] text-[#1c1410]">
      <aside className="hidden w-56 shrink-0 border-r border-stone-300/60 bg-[#fffdf8] p-4 md:block">
        <Link
          href="/"
          className="text-sm font-semibold text-[#7a1f1f]"
          style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
        >
          Giapha
        </Link>
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-stone-500">
          Dashboard
        </p>
        <p
          className="mt-1 text-lg font-semibold"
          style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
        >
          {family?.name ?? "…"}
        </p>
        <p className="mt-1 text-xs text-stone-500">
          Vai trò: {access?.role === "owner" ? "Family Owner" : "Branch Admin"}
        </p>

        <nav className="mt-6 flex flex-col gap-1">
          {NAV.map((item) => {
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
                  "rounded-lg px-3 py-2 text-sm font-semibold",
                  active
                    ? "bg-[#7a1f1f] text-[#fffdf8]"
                    : "text-[#1c1410] hover:bg-stone-200/60",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 space-y-2 border-t border-stone-200 pt-4">
          <Link
            href={`/tree/${familyId}`}
            className="block text-sm font-semibold text-[#7a1f1f] hover:underline"
          >
            Xem cây công khai
          </Link>
          <button
            type="button"
            className="text-sm text-stone-600 hover:underline"
            onClick={() => void signOutUser().then(() => router.replace("/"))}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-stone-300/60 bg-[#fffdf8]/80 px-4 py-3 md:hidden">
          <div>
            <p className="text-xs text-stone-500">Dashboard</p>
            <p className="font-semibold">{family?.name}</p>
          </div>
          <Link href={`/tree/${familyId}`} className="text-sm font-semibold text-[#7a1f1f]">
            Cây công khai
          </Link>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-stone-300/50 bg-[#fffdf8] px-2 py-2 md:hidden">
          {NAV.map((item) => {
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
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold",
                  active
                    ? "bg-[#7a1f1f] text-[#fffdf8]"
                    : "text-[#1c1410]",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
