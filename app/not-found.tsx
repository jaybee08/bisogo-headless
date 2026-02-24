import Link from "next/link";
import NotFoundClient from "./not-found.client";

export default function NotFoundPage() {
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-xl rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          The page you’re looking for doesn’t exist.
        </p>

        <NotFoundClient />

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-black px-4 text-sm font-medium text-white"
          >
            Go home
          </Link>
          <Link
            href="/shop"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-[color:var(--color-border)] px-4 text-sm font-medium"
          >
            Browse shop
          </Link>
        </div>
      </div>
    </div>
  );
}