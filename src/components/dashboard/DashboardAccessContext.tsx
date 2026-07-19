"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { FamilyAccess } from "@/services/accessService";
import type { Family } from "@/types/genealogy";

type DashboardAccessValue = {
  familyId: string;
  access: FamilyAccess;
  family: Family | null;
  canManageManagers: boolean;
  isBranchAdmin: boolean;
};

const DashboardAccessContext = createContext<DashboardAccessValue | null>(
  null,
);

export function DashboardAccessProvider({
  value,
  children,
}: {
  value: DashboardAccessValue;
  children: ReactNode;
}) {
  return (
    <DashboardAccessContext.Provider value={value}>
      {children}
    </DashboardAccessContext.Provider>
  );
}

export function useDashboardAccess(): DashboardAccessValue {
  const ctx = useContext(DashboardAccessContext);
  if (!ctx) {
    throw new Error("useDashboardAccess phải dùng trong DashboardShell");
  }
  return ctx;
}

export function useDashboardAccessOptional(): DashboardAccessValue | null {
  return useContext(DashboardAccessContext);
}
