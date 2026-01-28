import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-xl rounded-[var(--radius)] border border-[color:var(--color-border)] p-10 text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">The page you’re looking for doesn’t exist.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/blog">Visit blog</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
