import type { ReactNode } from "react";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#1a0a0a] text-[#fffdf8]">{children}</div>
  );
}
