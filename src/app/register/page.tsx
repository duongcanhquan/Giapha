import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col px-4 py-12">
      <div className="mb-8 text-center">
        <Link href="/" className="font-display text-lg font-semibold text-[var(--gp-lacquer)]">
          Giapha
        </Link>
      </div>
      <RegisterForm />
    </main>
  );
}
