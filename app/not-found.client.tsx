"use client";

import { useEffect, useState } from "react";

export default function NotFoundClient() {
  const [from, setFrom] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    setFrom(url.searchParams.get("from"));
  }, []);

  if (!from) return null;

  return (
    <div className="mt-4 rounded-[var(--radius)] border border-[color:var(--color-border)] bg-[color:var(--color-muted)] p-3 text-sm text-[color:var(--color-muted-foreground)]">
      You came from: <span className="font-medium text-foreground">{from}</span>
    </div>
  );
}