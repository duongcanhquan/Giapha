"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { initialsFromName } from "@/lib/images/prepare-avatar";

type MemberAvatarProps = {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  deceased?: boolean;
};

const sizeClass: Record<NonNullable<MemberAvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-[0.65rem]",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
  xl: "h-24 w-24 text-xl",
};

export function MemberAvatar({
  name,
  photoUrl,
  size = "md",
  className,
  deceased = false,
}: MemberAvatarProps) {
  const initials = initialsFromName(name || "?");

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-[#f3eee4] font-semibold text-[#7a1f1f]",
        deceased
          ? "border-[#9a9188] grayscale-[0.35]"
          : "border-[#7a1f1f]/35",
        sizeClass[size],
        className,
      )}
      aria-hidden={!photoUrl}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : name.trim() ? (
        <span>{initials}</span>
      ) : (
        <User className="h-[45%] w-[45%] opacity-55" aria-hidden />
      )}
    </div>
  );
}
