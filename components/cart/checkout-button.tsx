"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import { useCartUI } from "@/lib/cart/ui";
import { useSession } from "next-auth/react";

type CheckoutResponse = { redirectUrl: string };

export function CheckoutButton({ closeDrawer = true }: { closeDrawer?: boolean }) {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const hasHydrated = useCart((s) => s.hasHydrated);

  const closeCart = useCartUI((s) => s.closeCart);
  const { data } = useSession();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ EXACT same payload shape as /cart
  const payload = useMemo(() => {
    return {
      items: items.map((i) => ({
        productId: i.productId,
        variationId: i.variationId,
        slug: i.slug,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        attributes: i.attributes,
      })),
      customer: data?.user ? { name: data.user.name, email: data.user.email } : null,
      source: "drawer",
    };
  }, [items, data?.user]);

  async function onCheckout() {
    if (!hasHydrated || !items.length || loading) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // leave json null, keep raw text for debugging
      }

      if (!res.ok) {
        const msg = json?.error || json?.message || text || `Checkout failed (${res.status})`;
        throw new Error(msg);
      }

      const data = (json || {}) as CheckoutResponse;
      if (!data.redirectUrl) throw new Error("Checkout succeeded but redirectUrl is missing.");

      if (closeDrawer) closeCart?.();

      // ✅ behave same as cart page
      clear();
      window.location.href = data.redirectUrl;
    } catch (e: any) {
      setErr(e?.message || "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {err ? (
        <div className="rounded-[calc(var(--radius)-4px)] border border-red-300 bg-red-50 p-3 text-xs text-red-700">
          {err}
        </div>
      ) : null}

      <Button className="w-full" disabled={!hasHydrated || loading || !items.length} onClick={onCheckout}>
        {loading ? "Creating order…" : "Checkout"}
      </Button>
    </div>
  );
}