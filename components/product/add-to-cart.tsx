"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import { cn } from "@/lib/utils";
import { useCartUI } from "@/lib/cart/ui";

type Variation = {
  id: number;
  name: string;
  price: number;
  stockStatus?: string;
  attributes: Record<string, string>;

  // optional if you ever add these later
  stockQty?: number | null;
  maxPurchaseQty?: number | null;
  soldIndividually?: boolean;
};

type ProductForCart = {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  basePrice: number;
  currency: string;
  attributes: { name: string; options: string[] }[];
  variations: Variation[];

  // ✅ from backend (simple product)
  soldIndividually?: boolean; // Woo: sold_individually
  maxPurchaseQty?: number; // Woo: max_purchase_quantity (often 1 if sold individually)
  stockQty?: number | null; // Woo: stock_quantity (if managed)
};

function attrsEqual(a?: Record<string, string>, b?: Record<string, string>) {
  const aKeys = a ? Object.keys(a) : [];
  const bKeys = b ? Object.keys(b) : [];
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if ((a as any)[k] !== (b as any)[k]) return false;
  }
  return true;
}

export function AddToCart({ product }: { product: ProductForCart }) {
  const add = useCart((s) => s.addItem);
  const cartItems = useCart((s) => s.items);
  const showToast = useCartUI((s) => s.showToast);

  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});

  const canChooseAll = useMemo(() => {
    if (!product.attributes.length) return true;
    return product.attributes.every((a) => selected[a.name]);
  }, [product.attributes, selected]);

  const resolved = useMemo(() => {
    // simple product
    if (!product.variations.length) {
      return {
        variationId: undefined as number | undefined,
        price: product.basePrice,
        // caps (simple)
        soldIndividually: !!product.soldIndividually,
        maxPurchaseQty: product.maxPurchaseQty ?? undefined,
        stockQty: product.stockQty ?? undefined,
        attributes: Object.keys(selected).length ? selected : undefined,
      };
    }

    // variable product: only "resolved" when all options selected
    const match = product.variations.find((v) =>
      Object.entries(v.attributes).every(([k, v2]) => selected[k] === v2)
    );

    return {
      variationId: match?.id,
      price: match?.price ?? product.basePrice,
      // caps (variation overrides product if present)
      soldIndividually: !!(match?.soldIndividually ?? product.soldIndividually),
      maxPurchaseQty:
        (match?.maxPurchaseQty ?? product.maxPurchaseQty) ?? undefined,
      stockQty: (match?.stockQty ?? product.stockQty) ?? undefined,
      attributes: Object.keys(selected).length ? selected : undefined,
    };
  }, [product.variations, product.basePrice, product.soldIndividually, product.maxPurchaseQty, product.stockQty, selected]);

  // qty already in cart for this exact selection
  const inCartQty = useMemo(() => {
    const vId = resolved.variationId ?? 0;
    const attrs = resolved.attributes;
    return cartItems
      .filter(
        (i) =>
          i.productId === product.productId &&
          (i.variationId ?? 0) === vId &&
          attrsEqual(i.attributes, attrs)
      )
      .reduce((sum, i) => sum + i.quantity, 0);
  }, [cartItems, product.productId, resolved.variationId, resolved.attributes]);

  // compute max allowed based on sold individually / max purchase / stock
  const maxAllowed = useMemo(() => {
    const soldInd = !!resolved.soldIndividually;
    const maxPurchase =
      soldInd ? 1 : Math.max(1, Number(resolved.maxPurchaseQty ?? 9999));

    const stockQty = Number(resolved.stockQty);
    const stockCap =
      Number.isFinite(stockQty) && stockQty > 0 ? stockQty : 9999;

    return Math.max(1, Math.min(maxPurchase, stockCap));
  }, [resolved.soldIndividually, resolved.maxPurchaseQty, resolved.stockQty]);

  // remaining we can still add (respecting what’s already in cart)
  const remaining = useMemo(() => {
    return Math.max(0, maxAllowed - inCartQty);
  }, [maxAllowed, inCartQty]);

  // Keep qty valid whenever selection/max changes
  useEffect(() => {
    setQty((q) => {
      const next = Math.max(1, q);
      // if remaining is 0, keep qty at 1 but button will be disabled
      return Math.min(next, Math.max(1, remaining || 1));
    });
  }, [remaining]);

  const canDec = qty > 1;
  const canInc = qty + 1 <= Math.max(1, remaining || 1);

  // disable add if:
  // - options not selected OR
  // - selection resolved but remaining is 0
  const canAddNow = canChooseAll && !!(resolved.variationId || !product.variations.length) && remaining > 0;

  const priceLabel = `₱${resolved.price.toFixed(2)}`;

  // nice UX message
  const limitMessage = useMemo(() => {
    if (!canChooseAll) return null;

    if (remaining <= 0) {
      if (resolved.soldIndividually) return "Limited to 1 per order — already in your cart.";
      if (Number.isFinite(Number(resolved.stockQty)) && Number(resolved.stockQty) > 0)
        return "Max available quantity already in your cart.";
      return "You can’t add more of this item right now.";
    }

    if (resolved.soldIndividually) return "Limited to 1 per order.";
    if (Number.isFinite(Number(resolved.stockQty)) && Number(resolved.stockQty) > 0 && Number(resolved.stockQty) <= 5)
      return `Only ${Number(resolved.stockQty)} left.`;
    return null;
  }, [canChooseAll, remaining, resolved.soldIndividually, resolved.stockQty]);

  return (
    <div id="pdp-atc" className="rounded-[var(--radius)] border border-[color:var(--color-border)] p-5">
      {product.attributes.length ? (
        <div className="space-y-4">
          {product.attributes.map((attr) => (
            <div key={attr.name}>
              <div className="text-sm font-semibold">{attr.name}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {attr.options.map((opt) => {
                  const active = selected[attr.name] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelected((s) => ({ ...s, [attr.name]: opt }))}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm",
                        active
                          ? "border-transparent bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]"
                          : "border-[color:var(--color-border)] hover:bg-[color:var(--color-muted)]"
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Controls */}
      <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        {/* Row 1 on mobile: qty + price */}
        <div className="flex items-center justify-between gap-3 sm:contents">
          <div className="flex items-center rounded-[calc(var(--radius)-2px)] border border-[color:var(--color-border)]">
            <button
              type="button"
              className="h-10 w-10 hover:bg-[color:var(--color-muted)] disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={!canDec || !canChooseAll}
              aria-label="Decrease quantity"
            >
              -
            </button>
            <div className="w-14 text-center text-sm">{qty}</div>
            <button
              type="button"
              className="h-10 w-10 hover:bg-[color:var(--color-muted)] disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={() => setQty((q) => Math.min(Math.max(1, remaining || 1), q + 1))}
              disabled={!canInc || !canChooseAll || remaining <= 0}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Message pill */}
          {limitMessage ? (
            <span className="inline-flex items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-3 py-1 text-xs text-[color:var(--color-muted-foreground)]">
              {limitMessage}
            </span>
          ) : null}

          {/* Mobile price */}
          <div className="sm:hidden text-sm font-medium text-[color:var(--color-foreground)]">
            {priceLabel}
          </div>
        </div>

        {/* Button */}
        <Button
          data-atc-primary="1"
          className="h-11 w-full whitespace-nowrap sm:w-auto sm:flex-1"
          onClick={() => {
            if (!canAddNow) return;

            const addQty = Math.min(qty, remaining);

            const cartItem = {
              productId: product.productId,
              variationId: resolved.variationId,
              slug: product.slug,
              name: product.name,
              image: product.image,
              price: resolved.price,
              currency: product.currency,
              quantity: addQty,
              attributes: resolved.attributes,
            };

            add(cartItem);

            showToast({
              title: "Added to cart",
              product: {
                name: cartItem.name,
                image: cartItem.image,
                price: cartItem.price,
                currency: cartItem.currency,
                quantity: cartItem.quantity,
              },
              ttlMs: 4500,
            });
          }}
          disabled={!canAddNow}
        >
          {!canChooseAll ? "Select options" : remaining <= 0 ? "Added" : "Add to cart"}
        </Button>

        {/* Desktop price */}
        <div className="hidden sm:block text-sm text-[color:var(--color-muted-foreground)]">
          {priceLabel}
        </div>
      </div>
    </div>
  );
}