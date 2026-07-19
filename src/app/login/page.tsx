import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col bg-[#dfe6ec] px-4 py-10">
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="text-sm font-semibold tracking-wide text-[#7a1f1f]"
          style={{ fontFamily: "var(--font-literata), Literata, Georgia, serif" }}
        >
          Giapha
        </Link>
      </div>
      <LoginForm />
    </main>
  );
}
