"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-[#120e0c]/55 data-[state=open]:animate-[fade-in_160ms_ease-out]",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 flex w-[min(520px,calc(100%-2rem))] max-h-[min(90vh,720px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden border border-[var(--gp-scroll-edge)] bg-[var(--gp-scroll)] p-0 shadow-[var(--gp-shadow-lift)] data-[state=open]:animate-[fade-in_160ms_ease-out]",
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-md bg-[var(--gp-scroll)]/90 p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--gp-lacquer)]/40">
          <X className="h-4 w-4" />
          <span className="sr-only">Đóng</span>
        </DialogPrimitive.Close>
        <div className="max-h-[min(90vh,720px)] overflow-y-auto p-6 pt-7">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "font-display text-xl font-semibold leading-none tracking-tight text-[var(--gp-ink)]",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-[var(--gp-muted)]", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
