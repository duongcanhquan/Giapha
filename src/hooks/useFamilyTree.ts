"use client";

import useSWR from "swr";
import { fetchFamilyTree } from "@/services/treeService";
import type { Family } from "@/types/family";
import type { FamilyTreeData } from "@/types/genealogy";

export type FamilyTreePayload = {
  family: Family | null;
  tree: FamilyTreeData;
};

export function familyTreeKey(familyId: string): string {
  return `family-tree:${familyId}`;
}

async function fetcher(key: string): Promise<FamilyTreePayload> {
  const familyId = key.replace(/^family-tree:/, "");
  return fetchFamilyTree(familyId);
}

/**
 * SWR hook — cache theo `familyId`, tái sử dụng khi chuyển Public ↔ Dashboard.
 */
export function useFamilyTree(familyId: string | null | undefined) {
  const key = familyId ? familyTreeKey(familyId) : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<FamilyTreePayload>(
    key,
    fetcher,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 15_000,
      keepPreviousData: true,
    },
  );

  return {
    family: data?.family ?? null,
    tree: data?.tree ?? null,
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
    isLoading,
    isValidating,
    mutate,
  };
}
