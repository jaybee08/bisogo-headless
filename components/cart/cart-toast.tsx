"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, X, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartUI } from "@/lib/cart/ui";
import { useCart } from "@/lib/cart/store";

function money(n?: number) {
  if (typeof n !== "number") return "";
  return `₱${n.toFixed(2)}`;
}

export function CartToastStack() {
  const toasts = useCartUI((s) => s.toasts);
  const hideToast = useCartUI((s) => s.hideToast);
  const count = useCart((s) => s.count());

  if (!toasts.length) return null;

  return (
    <div
      className="
        fixed left-1/2 top-4 z-[60] w-[calc(100%-24px)] max-w-[420px] -translate-x-1/2
        sm:left-auto sm:right-6 sm:top-6 sm:translate-x-0
      "
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="grid gap-3">
        {toasts.map((t, idx) => {
          const p = t.product;
          return (
            <div
              key={t.id}
              className="
                rounded-[var(--radius)] border border-[color:var(--color-border)]
                bg-white shadow-lg
                transition-all duration-200
                animate-[tb_toast_in_220ms_ease-out]
              "
              style={{
                // subtle stacked feel
                transform: `translateY(${idx * 6}px) scale(${1 - idx * 0.02})`,
                opacity: 1 - idx * 0.08,
              }}
            >
              <div className="flex items-start gap-3 p-4">
                <div className="mt-0.5 shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">
                          {t.title ?? "Added to cart"}
                        </div>

                        {/* Cart count badge */}
                        {count > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-2 py-0.5 text-[11px] text-[color:var(--color-muted-foreground)]">
                            <ShoppingBag className="h-3.5 w-3.5" />
                            {count}
                          </span>
                        ) : null}
                      </div>

                      {t.message ? (
                        <div className="mt-0.5 text-xs text-[color:var(--color-muted-foreground)]">
                          {t.message}
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => hideToast(t.id)}
                      className="rounded-md p-1 hover:bg-[color:var(--color-muted)]"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {p ? (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-muted)]">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="mt-0.5 text-xs text-[color:var(--color-muted-foreground)]">
                          {p.quantity && p.quantity > 1 ? `${p.quantity} × ` : ""}
                          {money(p.price)}
                        </div>
                      </div>

                      <Button asChild size="sm" onClick={() => hideToast(t.id)}>
                        <Link href="/cart">View cart</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <Button asChild size="sm" onClick={() => hideToast(t.id)}>
                        <Link href="/cart">View cart</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}