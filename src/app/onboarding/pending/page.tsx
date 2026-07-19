import Link from "next/link";
import { PendingApprovalPanel } from "@/components/auth/PendingApprovalPanel";

export default function PendingApprovalPage() {
  return (
    <main className="flex min-h-screen flex-col px-4 py-12">
      <div className="mb-8 text-center">
        <Link href="/" className="font-display text-lg font-semibold text-[var(--gp-lacquer)]">
          Gia phả
        </Link>
      </div>
      <PendingApprovalPanel />
    </main>
  );
}
