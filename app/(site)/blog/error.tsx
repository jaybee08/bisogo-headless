"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container py-10">
      <div className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-8">
        <h2 className="text-lg font-semibold">Something went wrong loading the blog.</h2>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">{error.message}</p>
        <div className="mt-4">
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
