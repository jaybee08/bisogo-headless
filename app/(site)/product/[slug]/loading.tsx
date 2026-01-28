// app/(site)/product/[slug]/loading.tsx
import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export default function Loading() {
  return (
    <div className="container py-10">
      {/* Back link */}
      <div className="mb-6">
        <Skeleton className="h-4 w-28 rounded-full" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left: big image */}
        <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-3">
          <Skeleton className="aspect-[4/3] w-full rounded-[calc(var(--radius)-4px)]" />
        </div>

        {/* Right: product info */}
        <div className="space-y-6">
          {/* Title + price */}
          <div className="space-y-3">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-6 w-28" />
          </div>

          {/* Add to cart box */}
          <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-12 w-36 rounded-[calc(var(--radius)-2px)]" />
              <Skeleton className="h-12 flex-1 rounded-full" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>

          {/* CRO cards (3) */}
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-4"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-5/6" />
              </div>
            ))}
          </div>

          {/* Details section */}
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[92%]" />
            <Skeleton className="h-3 w-[86%]" />
          </div>
        </div>
      </div>
    </div>
  );
}