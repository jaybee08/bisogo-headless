"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  title,
  children,
  className
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") router.back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/30"
        onClick={() => router.back()}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || "Modal"}
        className={cn(
          "absolute left-1/2 top-1/2 w-[min(720px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2",
          "rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white shadow-lg",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-4">
          <div className="text-sm font-semibold">{title}</div>
          <button
            type="button"
            aria-label="Close"
            className="rounded-md p-2 hover:bg-[color:var(--color-muted)]"
            onClick={() => router.back()}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}