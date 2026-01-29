"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] will-change-[opacity]",
      // ✅ no plugin: use our own keyframes
      "data-[state=open]:animate-[tbOverlayIn_180ms_ease-out_forwards]",
      "data-[state=closed]:animate-[tbOverlayOut_160ms_ease-in_forwards]",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

type Side = "top" | "bottom" | "left" | "right";

function sideAnim(side: Side) {
  switch (side) {
    case "left":
      return [
        "data-[state=open]:animate-[tbSheetInLeft_260ms_cubic-bezier(.16,1,.3,1)_forwards]",
        "data-[state=closed]:animate-[tbSheetOutLeft_200ms_cubic-bezier(.7,0,.84,0)_forwards]",
      ].join(" ");
    case "right":
      return [
        "data-[state=open]:animate-[tbSheetInRight_260ms_cubic-bezier(.16,1,.3,1)_forwards]",
        "data-[state=closed]:animate-[tbSheetOutRight_200ms_cubic-bezier(.7,0,.84,0)_forwards]",
      ].join(" ");
    case "top":
      return [
        "data-[state=open]:animate-[tbSheetInTop_240ms_cubic-bezier(.16,1,.3,1)_forwards]",
        "data-[state=closed]:animate-[tbSheetOutTop_190ms_cubic-bezier(.7,0,.84,0)_forwards]",
      ].join(" ");
    case "bottom":
      return [
        "data-[state=open]:animate-[tbSheetInBottom_240ms_cubic-bezier(.16,1,.3,1)_forwards]",
        "data-[state=closed]:animate-[tbSheetOutBottom_190ms_cubic-bezier(.7,0,.84,0)_forwards]",
      ].join(" ");
  }
}

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: Side;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => {
  const base =
    "fixed z-50 gap-4 bg-[color:var(--color-card)] p-6 shadow-xl outline-none will-change-[transform,opacity]";

  const position =
    side === "left"
      ? "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm"
      : side === "right"
        ? "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm"
        : side === "top"
          ? "inset-x-0 top-0 border-b"
          : "inset-x-0 bottom-0 border-t";

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(base, position, sideAnim(side), className)}
        {...props}
      >
        {children}

        <SheetClose
          className={cn(
            "absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100",
            "focus:outline-none focus:ring-2 focus:ring-[color:var(--color-ring)] focus:ring-offset-2l",
            "disabled:pointer-events-none"
          )}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </SheetClose>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-[color:var(--color-foreground)]", className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-[color:var(--color-muted-foreground)]", className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
};