"use client";
import * as React from "react";

type Item = { q: string; a: string };

export function PdpFaq({ items }: { items: Item[] }) {
  if (!items?.length) return null;

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold">FAQs</h2>

      <div className="mt-4 space-y-3">
        {items.map((it, idx) => (
          <details
            key={idx}
            className="group rounded-[var(--radius)] border border-[color:var(--color-border)] bg-white p-4"
          >
            <summary className="cursor-pointer list-none font-medium flex items-center justify-between">
              <span>{it.q}</span>
              <span className="ml-3 text-[color:var(--color-muted-foreground)] group-open:rotate-180 transition">
                ▾
              </span>
            </summary>
            <div className="mt-3 text-sm text-[color:var(--color-muted-foreground)] whitespace-pre-line">
              {it.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}