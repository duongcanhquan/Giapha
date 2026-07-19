"use client";

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

/**
 * Cache toàn cục — cây không bị fetch lại từ đầu khi chuyển trang
 * trong cùng session (revalidateOnFocus giữ data tươi khi quay lại tab).
 */
export function SwrProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 5_000,
        keepPreviousData: true,
        errorRetryCount: 2,
        shouldRetryOnError: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
