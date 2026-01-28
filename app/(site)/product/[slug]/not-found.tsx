import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container py-10">
      <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-10 text-center">
        <h2 className="text-lg font-semibold">Product not found</h2>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">The product may have been moved or removed.</p>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href="/shop">Back to shop</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
