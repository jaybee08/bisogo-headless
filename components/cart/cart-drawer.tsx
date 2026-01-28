"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartLine } from "@/components/cart/cart-line";
import { useCart } from "@/lib/cart/store";
import { useCartUI } from "@/lib/cart/ui";
import { CheckoutButton } from "@/components/cart/checkout-button";

function money(n: number) {
  return `₱${n.toFixed(2)}`;
}

export function CartDrawer() {
  const isOpen = useCartUI((s) => s.isOpen);
  const closeCart = useCartUI((s) => s.closeCart);

  const items = useCart((s) => s.items);
  const hasHydrated = useCart((s) => s.hasHydrated);
  const subtotal = useCart((s) => s.subtotal()); 

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeCart();
    }
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeCart]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
        aria-hidden={!isOpen}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-50 h-dvh w-full max-w-[420px] border-l border-[color:var(--color-border)] bg-white transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } flex flex-col`}   // ✅ add flex flex-col
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--color-border)] p-4">
          <div className="text-sm font-semibold">Cart</div>
          <Button
            variant="ghost"
            className="h-9 w-9 p-0"
            onClick={closeCart}
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto">
          {items.length ? (
            <div className="divide-y divide-[color:var(--color-border)]">
              {items.map((it) => (
                <CartLine key={it.key} item={it} />
              ))}
            </div>
          ) : (
            <div className="p-6 text-sm text-[color:var(--color-muted-foreground)]">
              Your cart is empty.
            </div>
          )}
        </div>

        {/* Sticky footer */}
          {/* Sticky footer */}
          <div className="shrink-0 border-t border-[color:var(--color-border)] p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-white">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[color:var(--color-muted-foreground)]">Subtotal</span>
              <span className="font-semibold">{hasHydrated ? money(subtotal) : ""}</span>
            </div>

            <div className="mt-4 grid gap-2">
              <Button asChild onClick={closeCart} disabled={!items.length}>
                <Link href="/cart">View cart</Link>
              </Button>

              <Button asChild onClick={closeCart} disabled={!items.length}>
                <Link href="/cart">Checkout</Link>
              </Button>
            </div>
          </div>
      </aside>
    </>
  );
}