"use client";

import { useSearchParams } from "next/navigation";

export default function NotFoundClient() {
  const sp = useSearchParams();

  // Example: if you were using ?from=... or ?reason=... (optional)
  const from = sp.get("from");

  if (!from) return null;

  return (
    <div className="mt-4 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-muted)] p-3 text-sm text-[color:var(--color-muted-foreground)]">
      You came from: <span className="font-medium text-foreground">{from}</span>
    </div>
  );
}