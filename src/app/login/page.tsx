import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col px-4 py-12">
      <div className="mb-8 text-center">
        <Link href="/" className="font-display text-lg font-semibold text-[var(--gp-lacquer)]">
          Gia phả
        </Link>
      </div>
      <LoginForm />
    </main>
  );
}
