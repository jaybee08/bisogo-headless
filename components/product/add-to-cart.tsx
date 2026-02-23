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

  // ✅ NEW
  soldIndividually?: boolean; // Woo: sold_individually
  maxPurchaseQty?: number; // Woo: max_purchase_quantity (often 1 if sold individually)

  // ✅ OPTIONAL (if you already pass these from PDP)
  stockQty?: number | null; // Woo: stock_quantity
};

export function AddToCart({ product }: { product: ProductForCart }) {
  const add = useCart((s) => s.addItem);
  const cartItems = useCart((s) => s.items);
  const showToast = useCartUI((s) => s.showToast);

  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});

  const resolved = useMemo(() => {
    if (!product.variations.length) {
      return { price: product.basePrice, variationId: undefined as number | undefined };
    }

    const match = product.variations.find((v) =>
      Object.entries(v.attributes).every(([k, v2]) => selected[k] === v2)
    );

    return { price: match?.price ?? product.basePrice, variationId: match?.id };
  }, [product.variations, product.basePrice, selected]);

  const canAddOptions = useMemo(() => {
    if (!product.attributes.length) return true;
    return product.attributes.every((a) => selected[a.name]);
  }, [product.attributes, selected]);

  // sold individually rules
  const soldIndividually = !!product.soldIndividually;
  const maxQty = soldIndividually ? 1 : Math.max(1, Number(product.maxPurchaseQty ?? 9999));

  // ✅ keep qty valid if product is sold individually or max changes
  useEffect(() => {
    setQty((q) => Math.min(Math.max(1, q), maxQty));
  }, [maxQty]);

  // ✅ detect if this exact item (incl. variation + attrs) is already in cart
  const alreadyInCart = useMemo(() => {
    const attrsKey = Object.keys(selected).length
      ? JSON.stringify(Object.entries(selected).sort())
      : "";
    return cartItems.some((i) => {
      const sameBase =
        i.productId === product.productId && (i.variationId || 0) === (resolved.variationId || 0);

      const sameAttrs = (() => {
        const a = i.attributes ? JSON.stringify(Object.entries(i.attributes).sort()) : "";
        return a === attrsKey;
      })();

      return sameBase && sameAttrs;
    });
  }, [cartItems, product.productId, resolved.variationId, selected]);

  // ✅ if limited to 1 per order, and it’s already in cart, disable ATC
  const limitReached = soldIndividually && alreadyInCart;

  // ✅ also optionally treat “only 1 left” as single-purchase UX (optional)
  const onlyOneLeft = Number.isFinite(Number(product.stockQty)) && Number(product.stockQty) === 1;
  const shouldLockAfterAdd = limitReached || (onlyOneLeft && alreadyInCart);

  const priceLabel = `₱${resolved.price.toFixed(2)}`;

  const canDec = qty > 1;
  const canInc = qty < maxQty;

  const disabledATC = !canAddOptions || shouldLockAfterAdd;

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
      <div className="mt-5 grid gap-3">
        {/* ✅ Mobile layout: Row 1 qty + price, Row 2 badges, Row 3 button */}
        <div className="grid grid-cols-[auto_1fr] items-center gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          {/* Qty */}
          <div className="flex items-center rounded-[calc(var(--radius)-2px)] border border-[color:var(--color-border)]">
            <button
              type="button"
              className="h-10 w-10 hover:bg-[color:var(--color-muted)] disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={!canDec || disabledATC}
              aria-label="Decrease quantity"
            >
              -
            </button>
            <div className="w-14 text-center text-sm">{qty}</div>
            <button
              type="button"
              className="h-10 w-10 hover:bg-[color:var(--color-muted)] disabled:opacity-40 disabled:hover:bg-transparent"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={!canInc || disabledATC}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {/* Price (mobile right, desktop handled below) */}
          <div className="justify-self-end sm:hidden text-sm font-medium text-[color:var(--color-foreground)] tabular-nums">
            {priceLabel}
          </div>

          {/* ✅ Badges (mobile full width; desktop inline) */}
          <div className="col-span-2 flex flex-wrap gap-2 sm:col-auto sm:contents">
            {soldIndividually ? (
              <span
                className={cn(
                  "inline-flex max-w-full items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-3 py-1 text-xs text-[color:var(--color-muted-foreground)]",
                  "whitespace-normal leading-snug"
                )}
              >
                {alreadyInCart
                  ? "Limited to 1 per order — already in your cart."
                  : "Limited to 1 per order."}
              </span>
            ) : null}
          </div>

          {/* Desktop price (right side) */}
          <div className="hidden sm:block text-sm text-[color:var(--color-muted-foreground)] tabular-nums">
            {priceLabel}
          </div>
        </div>

        {/* Button */}
        <Button
          data-atc-primary="1"
          className="h-11 w-full whitespace-nowrap"
          onClick={() => {
            if (disabledATC) return;

            const cartItem = {
              productId: product.productId,
              variationId: resolved.variationId,
              slug: product.slug,
              name: product.name,
              image: product.image,
              price: resolved.price,
              currency: product.currency,
              quantity: Math.min(qty, maxQty),
              attributes: Object.keys(selected).length ? selected : undefined,
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
          disabled={disabledATC}
        >
          {!canAddOptions ? "Select options" : shouldLockAfterAdd ? "Added" : "Add to cart"}
        </Button>
      </div>
    </div>
  );
}