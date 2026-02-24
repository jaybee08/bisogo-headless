import Link from "next/link";
import { Suspense } from "react";
import NotFoundClient from "./not-found.client.tsx";

export default function NotFoundPage() {
  return (
    <div className="container py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
        The page you’re looking for doesn’t exist.
      </p>

      {/* ✅ Any component that uses useSearchParams MUST be under Suspense */}
      <Suspense fallback={null}>
        <NotFoundClient />
      </Suspense>

      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm hover:bg-[color:var(--color-muted)]"
        >
          Go home
        </Link>
        <Link
          href="/shop"
          className="rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm hover:bg-[color:var(--color-muted)]"
        >
          Shop
        </Link>
      </div>
    </div>
  );
}