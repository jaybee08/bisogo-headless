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

  // avoid hydration mismatch for persisted cart
  const hasHydrated = useCart((s) => s.hasHydrated);
  const count = useCart((s) => (hasHydrated ? s.count() : 0));

  if (!toasts.length) return null;

  return (
    <div
      className="
        fixed z-[60]
        top-[calc(env(safe-area-inset-top)+16px)]
        left-1/2 -translate-x-1/2

        /* ✅ Mobile: clamp to viewport */
        w-[calc(100vw-24px)]
        max-w-[calc(100vw-24px)]

        /* ✅ Desktop: keep your nice floating stack */
        sm:left-auto sm:right-6 sm:translate-x-0
        sm:w-[min(560px,calc(100vw-48px))]
        sm:max-w-[560px]

        pointer-events-none
      "
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="grid gap-3 overflow-visible">
        {toasts.map((t, idx) => {
          const p = t.product;

          return (
            <div
              key={t.id}
              className="
                tb-toast-in
                pointer-events-auto
                w-full
                rounded-[var(--radius)]
                border border-[color:var(--color-border)]
                bg-white shadow-lg

                /* ✅ Prevent weird overflow on mobile */
                overflow-hidden
              "
              style={{
                marginTop: idx ? idx * 6 : 0, // stacked feel without breaking animation
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
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {t.title ?? "Added to cart"}
                        </div>

                        {count > 0 ? (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-2 py-0.5 text-[11px] text-[color:var(--color-muted-foreground)]">
                            <ShoppingBag className="h-3.5 w-3.5" />
                            {count}
                          </span>
                        ) : null}
                      </div>

                      {t.message ? (
                        <div className="mt-0.5 line-clamp-2 text-xs text-[color:var(--color-muted-foreground)]">
                          {t.message}
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => hideToast(t.id)}
                      className="shrink-0 rounded-md p-1 hover:bg-[color:var(--color-muted)]"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {p ? (
                    <div
                      className="
                        mt-3
                        flex items-center gap-3
                        min-w-0
                        /* ✅ Mobile: allow wrap so button doesn't push overflow */
                        flex-wrap
                        sm:flex-nowrap
                      "
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-muted)]">
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

                      {/* ✅ Mobile: full-width CTA below, Desktop: right aligned */}
                      <Button
                        asChild
                        size="sm"
                        className="shrink-0 w-full sm:w-auto"
                        onClick={() => hideToast(t.id)}
                      >
                        <Link href="/cart">View cart</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <Button
                        asChild
                        size="sm"
                        className="shrink-0 w-full sm:w-auto"
                        onClick={() => hideToast(t.id)}
                      >
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