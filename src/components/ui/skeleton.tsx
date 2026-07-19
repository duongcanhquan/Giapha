"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

/** Shimmer block — thay spinner nhàm chán */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <motion.div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-[var(--gp-mist)]/90",
        className,
      )}
      initial={{ opacity: 0.7 }}
      animate={{ opacity: [0.55, 0.9, 0.55] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/55 to-transparent"
        animate={{ translateX: ["-100%", "100%"] }}
        transition={{ duration: 1.35, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

export function TreePageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--gp-paper)]" role="status" aria-label="Đang tải">
      <Skeleton className="h-28 w-full rounded-none md:h-36" />
      <div className="space-y-3 px-4 py-4 md:px-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="relative mx-3 mb-4 flex-1 overflow-hidden rounded-2xl border border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)] md:mx-4">
        <div className="absolute inset-0 grid place-items-center gap-6 p-8">
          <div className="flex w-full max-w-3xl flex-col items-center gap-10">
            <Skeleton className="h-16 w-44" />
            <div className="flex w-full justify-center gap-8">
              <Skeleton className="h-16 w-40" />
              <Skeleton className="h-16 w-40" />
            </div>
            <div className="flex w-full justify-center gap-6">
              <Skeleton className="h-14 w-36" />
              <Skeleton className="h-14 w-36" />
              <Skeleton className="h-14 w-36" />
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">Đang tải cây gia phả…</span>
    </div>
  );
}

export function DashboardPanelSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Đang tải bảng quản trị">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-48 w-full" />
      <span className="sr-only">Đang tải…</span>
    </div>
  );
}
