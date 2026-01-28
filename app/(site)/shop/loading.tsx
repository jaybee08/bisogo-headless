// app/(site)/shop/loading.tsx
import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

function ChipRow() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-16 rounded-full" />
      ))}
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-square w-full rounded-[var(--radius)]" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export default function Loading() {
  return (
    <div className="container py-10">
      {/* Header row */}
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-[420px] max-w-full" />
          <Skeleton className="h-3 w-56" />
        </div>

        {/* Search */}
        <div className="flex w-full max-w-md gap-2">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 w-24" />
        </div>
      </div>

      {/* Main layout */}
      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_280px]">
        {/* Products column */}
        <div>
          {/* Chips + sort row */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <ChipRow />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>

          {/* Products grid */}
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>

          {/* Pagination skeleton */}
          <div className="mt-8 flex justify-center gap-3">
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 w-28" />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-4">
            <Skeleton className="h-4 w-16" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <div className="mt-4">
              <Skeleton className="h-11 w-full" />
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-4">
            <Skeleton className="h-4 w-28" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}